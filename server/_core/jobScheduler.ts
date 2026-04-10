import cron from "node-cron";
import { getDb } from "../db";
import { warleineAtendimentosStaging, atendimentos, queryConfiguracoes } from "../../drizzle/schema-integracao";
import { eq, and, sql } from "drizzle-orm";
import { WarleineConnector } from "../connectors/WarleineConnector";

const activeJobs: Map<number, ReturnType<typeof cron.schedule>> = new Map();
const runningJobs: Set<number> = new Set();

export async function initializeJobScheduler() {
  console.log("[JobScheduler] Inicializando agendador de tarefas...");

  try {
    // Carregar configurações ativas do banco
    const db = await getDb();
    if (!db) {
      console.error("[JobScheduler] Erro: conexão com banco não disponível");
      return;
    }
    const configs = await db.select().from(queryConfiguracoes).where(eq(queryConfiguracoes.ativo, true));

    for (const config of configs) {
      if (config.frequencia) {
        await updateJobSchedule(config.id, config.frequencia, true);
      }
    }

    console.log("[JobScheduler] Jobs agendados com sucesso!");
  } catch (error) {
    console.error("[JobScheduler] Erro ao inicializar:", error);
  }
}

export function scheduleJob(
  jobId: number,
  cronExpression: string,
  callback: () => Promise<void>
) {
  // Cancelar job anterior se existir
  if (activeJobs.has(jobId)) {
    const existingJob = activeJobs.get(jobId);
    existingJob?.stop();
  }

  // Agendar novo job
  const task = cron.schedule(cronExpression, callback, {
    timezone: "America/Sao_Paulo",
  });

  activeJobs.set(jobId, task);
  console.log(`[JobScheduler] Job ${jobId} agendado com expressão: ${cronExpression}`);
}

export function stopJob(jobId: number) {
  const job = activeJobs.get(jobId);
  if (job) {
    job.stop();
    activeJobs.delete(jobId);
    console.log(`[JobScheduler] Job ${jobId} parado`);
  }
}

export function stopAllJobs() {
  activeJobs.forEach((job) => job.stop());
  activeJobs.clear();
  console.log("[JobScheduler] Todos os jobs foram parados");
}

export async function updateJobSchedule(
  configId: number,
  frequencia: string,
  ativo: boolean
) {
  if (ativo) {
    let cronExpression = "0 2 * * *"; // Default: diariamente às 2 da manhã

    switch (frequencia) {
      case "tempo_real":
        cronExpression = "*/5 * * * *"; // A cada 5 minutos
        break;
      case "1x_dia":
        cronExpression = "0 2 * * *"; // 2 da manhã
        break;
      case "1x_semana":
        cronExpression = "0 2 * * 0"; // Domingo às 2 da manhã
        break;
      case "1x_mes":
        cronExpression = "0 2 1 * *"; // 1º dia do mês às 2 da manhã
        break;
    }

    scheduleJob(configId, cronExpression, async () => {
      await executarSincronizacaoAutomatica(configId);
    });
  } else {
    stopJob(configId);
  }
}

/**
 * Extrai a configuração de conexão do campo conexaoConfig da query_configuracoes
 */
function extrairConexaoConfig(config: any): { host: string; port: number; database: string; user: string; password: string; ssl?: boolean } | null {
  try {
    let conexao = config.conexaoConfig;
    if (!conexao) {
      // Fallback para variáveis de ambiente
      const host = process.env.WARLEINE_DB_HOST;
      const port = process.env.WARLEINE_DB_PORT;
      const database = process.env.WARLEINE_DB_NAME;
      const user = process.env.WARLEINE_DB_USER;
      const password = process.env.WARLEINE_DB_PASSWORD;
      
      if (host && database && user && password) {
        return {
          host,
          port: parseInt(port || "5432", 10),
          database,
          user,
          password,
          ssl: false,
        };
      }
      return null;
    }
    
    if (typeof conexao === "string") {
      conexao = JSON.parse(conexao);
    }
    
    return {
      host: conexao.host,
      port: parseInt(conexao.port || "5432", 10),
      database: conexao.database,
      user: conexao.user,
      password: conexao.password,
      ssl: conexao.ssl || false,
    };
  } catch (error) {
    console.error("[JobScheduler] Erro ao extrair configuração de conexão:", error);
    return null;
  }
}

/**
 * Executa sincronização + transformação automaticamente
 */
async function executarSincronizacaoAutomatica(configId: number) {
  if (runningJobs.has(configId)) {
    console.log(`[JobScheduler] Job ${configId} já está em execução, pulando...`);
    return;
  }
  runningJobs.add(configId);
  console.log(`[JobScheduler] Iniciando sincronização OMNICANEL/MEDALLION automatica para config ${configId}...`);

  try {
    const db = await getDb();
    if (!db) return;

    const config = await db.select().from(queryConfiguracoes).where(eq(queryConfiguracoes.id, configId)).then((rows: any[]) => rows[0]);
    if (!config) return;

    const conexaoConfig = extrairConexaoConfig(config);
    if (!conexaoConfig) {
      await db.update(queryConfiguracoes).set({ ultimoErro: "Configuração de conexão não encontrada", ultimaTentativa: new Date() }).where(eq(queryConfiguracoes.id, configId));
      return;
    }

    // PASSO 1: DISPARAR O MOTOR DE EXTRACAO PARA A STAGING (Bronze)
    const { dataSyncEngine } = await import("../dataSyncEngine");
    const syncConfig = {
      configId: config.id,
      sistema: "warleine", // O scheduler legado usava warleine fixo aqui, adaptaremos se tiver mais
      tipoDados: config.tipoDados,
      estabelecimentoId: config.estabelecimentoId,
      querySql: config.querySql,
      frequencia: config.frequencia,
      conexaoConfig: conexaoConfig
    };

    console.log(`[JobScheduler] EXTRAÇÃO: Baixando fita para a STAGING...`);
    const resultadoSync = await dataSyncEngine.sincronizar(syncConfig as any);
    
    if (!resultadoSync.sucesso) {
      throw new Error(resultadoSync.mensagem);
    }

    let registrosTransformados = resultadoSync.totalRegistrosSincronizados;

    // PASSO 2: INVOCAR OS ORQUESTRADORES PARA A UNIFICADA (Silver)
    console.log(`[JobScheduler] TRANSFORMAÇÃO: Orquestrando Staging -> Unificada...`);
    if (config.tipoDados === "atendimentos") {
      const { popularDeWarleine } = await import("../atendimentoUnificadoService");
      const r = await popularDeWarleine(config.estabelecimentoId);
      registrosTransformados = r.inseridos;
    } else if (config.tipoDados === "faturamento") {
      const { popularDeWarleine } = await import("../faturamentoUnificadoService");
      const r = await popularDeWarleine(config.estabelecimentoId);
      registrosTransformados = r.inseridos;
    }

    // Atualiza o rastreio com sucesso
    await db.update(queryConfiguracoes).set({
        ultimaSincronizacao: new Date(),
        totalRegistrosSincronizados: registrosTransformados,
        ultimoErro: null,
        ultimaTentativa: new Date(),
    }).where(eq(queryConfiguracoes.id, configId));

    console.log(`[JobScheduler] SUCESSO: Background Job Concluído! (${registrosTransformados} registros)`);

  } catch (error: any) {
    console.error(`[JobScheduler] ERRO FATAL: `, error);
    try {
      const db = await getDb();
      if (db) {
        await db.update(queryConfiguracoes).set({
          ultimoErro: error instanceof Error ? error.message : String(error),
          ultimaTentativa: new Date(),
        }).where(eq(queryConfiguracoes.id, configId));
      }
    } catch(e) {}
  } finally {
    runningJobs.delete(configId);
  }
}
