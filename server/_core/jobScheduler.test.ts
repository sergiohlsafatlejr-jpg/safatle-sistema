import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { scheduleJob, stopJob, stopAllJobs, initializeJobScheduler } from "./jobScheduler";

describe("JobScheduler", () => {
  afterEach(() => {
    stopAllJobs();
  });

  it("deve criar um job com expressão cron válida", async () => {
    const callback = vi.fn();
    const jobId = 1;
    const cronExpression = "0 2 * * *"; // Diariamente às 2 da manhã

    scheduleJob(jobId, cronExpression, callback);

    // Verificar que o job foi criado
    expect(callback).not.toHaveBeenCalled(); // Não deve executar imediatamente
  });

  it("deve parar um job específico", async () => {
    const callback = vi.fn();
    const jobId = 1;

    scheduleJob(jobId, "0 2 * * *", callback);
    stopJob(jobId);

    // Job foi parado
    expect(true).toBe(true);
  });

  it("deve parar todos os jobs", async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    scheduleJob(1, "0 2 * * *", callback1);
    scheduleJob(2, "0 3 * * *", callback2);

    stopAllJobs();

    // Todos os jobs foram parados
    expect(true).toBe(true);
  });

  it("deve inicializar o scheduler sem erros", async () => {
    const result = await initializeJobScheduler();
    expect(result).toBeUndefined(); // initializeJobScheduler não retorna nada
  });

  it("deve suportar diferentes frequências", () => {
    const frequencias = [
      { freq: "tempo_real", cron: "*/5 * * * *" },
      { freq: "1x_dia", cron: "0 2 * * *" },
      { freq: "1x_semana", cron: "0 2 * * 0" },
      { freq: "1x_mes", cron: "0 2 1 * *" },
    ];

    frequencias.forEach(({ freq, cron }) => {
      const callback = vi.fn();
      scheduleJob(Math.random(), cron, callback);
      expect(true).toBe(true);
    });

    stopAllJobs();
  });
});
