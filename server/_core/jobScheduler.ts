import cron from "node-cron";
import { getDb } from "../db";
import { warleineAtendimentosStaging, atendimentos, queryConfiguracoes } from "../../drizzle/schema-integracao";
import { eq, and, sql } from "drizzle-orm";
import { WarleineConnector } from "../connectors/WarleineConnector";

const activeJobs: Map<number, ReturnType<typeof cron.schedule>> = new Map();

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
  console.log(`[JobScheduler] Iniciando sincronização automática para config ${configId}...`);

  let connector: WarleineConnector | null = null;

  try {
    const db = await getDb();
    if (!db) {
      console.error("[JobScheduler] Erro: conexão com banco não disponível");
      return;
    }

    // 1. Obter configuração
    const config = await db
      .select()
      .from(queryConfiguracoes)
      .where(eq(queryConfiguracoes.id, configId))
      .then((rows: any[]) => rows[0]);

    if (!config) {
      console.error(`[JobScheduler] Configuração ${configId} não encontrada`);
      return;
    }

    // 2. Extrair configuração de conexão
    const conexaoConfig = extrairConexaoConfig(config);
    if (!conexaoConfig) {
      console.error(`[JobScheduler] Configuração de conexão não encontrada para config ${configId}. Verifique o campo conexaoConfig ou as variáveis de ambiente WARLEINE_DB_*`);
      await db.update(queryConfiguracoes).set({
        ultimoErro: "Configuração de conexão não encontrada",
        ultimaTentativa: new Date(),
      }).where(eq(queryConfiguracoes.id, configId));
      return;
    }

    // 3. SINCRONIZAR: Extrair dados do WARLEINE
    console.log(`[JobScheduler] Conectando ao WARLEINE (${conexaoConfig.host}:${conexaoConfig.port}/${conexaoConfig.database})...`);
    connector = new WarleineConnector(conexaoConfig);
    const conectado = await connector.conectar();
    
    if (!conectado) {
      console.error(`[JobScheduler] Falha ao conectar ao WARLEINE`);
      await db.update(queryConfiguracoes).set({
        ultimoErro: "Falha ao conectar ao banco WARLEINE",
        ultimaTentativa: new Date(),
      }).where(eq(queryConfiguracoes.id, configId));
      return;
    }

    console.log(`[JobScheduler] Conectado! Executando query de sincronização...`);
    const dados = await connector.executarQuery(config.querySql);

    // Desconectar após extrair dados
    await connector.desconectar();
    connector = null;

    if (!dados || dados.length === 0) {
      console.log(`[JobScheduler] Nenhum dado encontrado para sincronizar`);
      await db.update(queryConfiguracoes).set({
        ultimaSincronizacao: new Date(),
        ultimoErro: null,
        ultimaTentativa: new Date(),
      }).where(eq(queryConfiguracoes.id, configId));
      return;
    }

    console.log(`[JobScheduler] ${dados.length} registros extraídos do WARLEINE`);

    // Limpar staging anterior para esta config
    await db.delete(warleineAtendimentosStaging).where(
      eq(warleineAtendimentosStaging.configId, configId)
    );

    // Inserir dados em lotes no staging
    const BATCH_SIZE = 100;
    let registrosSincronizados = 0;

    for (let i = 0; i < dados.length; i += BATCH_SIZE) {
      const batch = dados.slice(i, i + BATCH_SIZE);
      const valuesToInsert = batch.map((row: any) => ({
        estabelecimentoId: config.estabelecimentoId,
        configId: config.id,
        dadosBrutos: row,
      }));

      await db.insert(warleineAtendimentosStaging).values(valuesToInsert);
      registrosSincronizados += valuesToInsert.length;
    }

    console.log(`[JobScheduler] ${registrosSincronizados} registros sincronizados no staging`);

    // 4. TRANSFORMAR: Converter staging para tabela unificada
    console.log(`[JobScheduler] Transformando dados para tabela unificada...`);

    // Primeiro, remover registros WARLEINE antigos deste estabelecimento para evitar duplicatas
    await db.delete(atendimentos).where(
      and(
        eq(atendimentos.estabelecimentoId, config.estabelecimentoId),
        eq(atendimentos.origemSistema, "WARLEINE")
      )
    );

    const stagingData = await db
      .select()
      .from(warleineAtendimentosStaging)
      .where(eq(warleineAtendimentosStaging.configId, configId));

    let registrosTransformados = 0;

    for (let i = 0; i < stagingData.length; i += BATCH_SIZE) {
      const batch = stagingData.slice(i, i + BATCH_SIZE);
      const valuesToInsert = batch.map((row: any) => {
        const d = typeof row.dadosBrutos === "string" 
          ? JSON.parse(row.dadosBrutos) 
          : row.dadosBrutos;

        // Mapeamento correto: campos do Warleine → campos da tabela atendimentos_unificados
        // Warleine retorna: numatend, codtipsai, nomeplaco, nomepac, carater, datatend, datasai,
        //                   tipoatend, tipoatendimentodescricao, codserv, procprin, codcc_destino
        return {
          estabelecimentoId: row.estabelecimentoId,
          origemSistema: "WARLEINE" as const,
          origemId: String(d?.numatend || ""),
          numero_atendimento: d?.numatend ? String(d.numatend) : null,
          codigo_saida: d?.codtipsai || null,
          convenio: d?.nomeplaco || null,
          paciente: d?.nomepac || null,
          caracter_atendimento: d?.carater || null,
          data_entrada: d?.datatend ? new Date(d.datatend) : null,
          data_saida: d?.datasai ? new Date(d.datasai) : null,
          tipo_atendimento: d?.tipoatend || null,
          descricao_atendimento: d?.tipoatendimentodescricao || null,
          codigo_servico: d?.codserv || null,
          codigo_procedimento: d?.procprin || null,
          destino_conta: d?.codcc_destino || null,
        };
      });

      await db.insert(atendimentos).values(valuesToInsert);
      registrosTransformados += valuesToInsert.length;
    }

    console.log(`[JobScheduler] ${registrosTransformados} registros transformados para atendimentos_unificados`);

    // 5. Atualizar timestamp de última sincronização
    await db
      .update(queryConfiguracoes)
      .set({
        ultimaSincronizacao: new Date(),
        totalRegistrosSincronizados: registrosTransformados,
        ultimoErro: null,
        ultimaTentativa: new Date(),
      })
      .where(eq(queryConfiguracoes.id, configId));

    console.log(`[JobScheduler] Sincronização automática concluída com sucesso! (${registrosTransformados} registros)`);
  } catch (error) {
    console.error(`[JobScheduler] Erro ao executar sincronização automática:`, error);
    
    // Registrar erro no banco
    try {
      const db = await getDb();
      if (db) {
        await db.update(queryConfiguracoes).set({
          ultimoErro: error instanceof Error ? error.message : String(error),
          ultimaTentativa: new Date(),
        }).where(eq(queryConfiguracoes.id, configId));
      }
    } catch (dbError) {
      console.error("[JobScheduler] Erro ao registrar erro no banco:", dbError);
    }
  } finally {
    // Garantir que a conexão seja fechada
    if (connector) {
      try {
        await connector.desconectar();
      } catch (e) {
        // Ignorar erro ao desconectar
      }
    }
  }
}
