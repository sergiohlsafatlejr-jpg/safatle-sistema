import cron from "node-cron";
import { getDb } from "../db";
import { warleineAtendimentosStaging, atendimentos, queryConfiguracoes } from "../../drizzle/schema-integracao";
import { eq } from "drizzle-orm";
import { WarleineConnector } from "../connectors/WarleineConnector";

const activeJobs: Map<number, ReturnType<typeof cron.schedule>> = new Map();

export async function initializeJobScheduler() {
  console.log("[JobScheduler] Inicializando agendador de tarefas...");

  try {
    // Carregar configurações ativas do banco
    const db = await getDb();
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
    scheduled: true,
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
 * Executa sincronização + transformação automaticamente
 */
async function executarSincronizacaoAutomatica(configId: number) {
  console.log(`[JobScheduler] Iniciando sincronização automática para config ${configId}...`);

  try {
    const db = await getDb();

    // 1. Obter configuração
    const config = await db
      .select()
      .from(queryConfiguracoes)
      .where(eq(queryConfiguracoes.id, configId))
      .then((rows) => rows[0]);

    if (!config) {
      console.error(`[JobScheduler] Configuração ${configId} não encontrada`);
      return;
    }

    // 2. SINCRONIZAR: Extrair dados do WARLEINE
    console.log(`[JobScheduler] Sincronizando dados do WARLEINE...`);
    const connector = new WarleineConnector();
    const dados = await connector.executarQuery(config.query);

    if (!dados || dados.length === 0) {
      console.log(`[JobScheduler] Nenhum dado encontrado para sincronizar`);
      return;
    }

    // Limpar staging anterior
    await db.delete(warleineAtendimentosStaging).where(
      eq(warleineAtendimentosStaging.configId, configId)
    );

    // Inserir dados em lotes
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

    console.log(`[JobScheduler] ${registrosSincronizados} registros sincronizados`);

    // 3. TRANSFORMAR: Converter staging para tabela unificada
    console.log(`[JobScheduler] Transformando dados para tabela unificada...`);

    const stagingData = await db
      .select()
      .from(warleineAtendimentosStaging)
      .where(eq(warleineAtendimentosStaging.configId, configId));

    let registrosTransformados = 0;

    for (let i = 0; i < stagingData.length; i += BATCH_SIZE) {
      const batch = stagingData.slice(i, i + BATCH_SIZE);
      const valuesToInsert = batch.map((row: any) => {
        const dados = typeof row.dadosBrutos === "string" 
          ? JSON.parse(row.dadosBrutos) 
          : row.dadosBrutos;

        return {
          estabelecimentoId: row.estabelecimentoId,
          origemSistema: "WARLEINE",
          origemId: dados?.id || null,
          numeroAtendimento: dados?.numeroAtendimento || null,
          paciente: dados?.paciente || null,
          dataAtendimento: dados?.dataAtendimento ? new Date(dados.dataAtendimento) : null,
          tipoAtendimento: dados?.tipoAtendimento || null,
          servico: dados?.servico || null,
          procedimentoPrincipal: dados?.procedimentoPrincipal || null,
          dadosBrutos: row.dadosBrutos,
        };
      });

      await db.insert(atendimentos).values(valuesToInsert);
      registrosTransformados += valuesToInsert.length;
    }

    console.log(`[JobScheduler] ${registrosTransformados} registros transformados`);

    // 4. Atualizar timestamp de última sincronização
    await db
      .update(queryConfiguracoes)
      .set({ ultimaSincronizacao: new Date() })
      .where(eq(queryConfiguracoes.id, configId));

    console.log(`[JobScheduler] Sincronização automática concluída com sucesso!`);
  } catch (error) {
    console.error(`[JobScheduler] Erro ao executar sincronização automática:`, error);
  }
}
