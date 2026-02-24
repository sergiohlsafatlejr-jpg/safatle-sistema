import cron from "node-cron";
import { getDb } from "../db";
import { warleineAtendimentosStaging } from "../../drizzle/schema-integracao";
import { atendimentos } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const activeJobs: Map<number, ReturnType<typeof cron.schedule>> = new Map();

export async function initializeJobScheduler() {
  console.log("[JobScheduler] Inicializando agendador de tarefas...");

  try {
    // Exemplo de job que roda diariamente às 2 da manhã
    scheduleJob(1, "0 2 * * *", async () => {
      console.log("[JobScheduler] Executando sincronização diária...");
      // Sincronização será disparada manualmente via UI por enquanto
    });

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
      console.log(`[JobScheduler] Executando sincronização para config ${configId}...`);
      // Sincronização será disparada manualmente via UI
    });
  } else {
    stopJob(configId);
  }
}
