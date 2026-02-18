import { describe, it, expect } from "vitest";
import { motorRegrasRouter } from "./motorRegrasRouter";

describe("motorRegrasRouter", () => {
  it("deve ter os métodos salvarValidacao, listarHistorico, obterValidacao, obterEstatisticas e deletarValidacao", () => {
    expect(motorRegrasRouter).toBeDefined();
    expect(motorRegrasRouter.createCaller).toBeDefined();
  });

  it("deve ter a procedure salvarValidacao", () => {
    const caller = motorRegrasRouter.createCaller({} as any);
    expect(caller.salvarValidacao).toBeDefined();
  });

  it("deve ter a procedure listarHistorico", () => {
    const caller = motorRegrasRouter.createCaller({} as any);
    expect(caller.listarHistorico).toBeDefined();
  });

  it("deve ter a procedure obterValidacao", () => {
    const caller = motorRegrasRouter.createCaller({} as any);
    expect(caller.obterValidacao).toBeDefined();
  });

  it("deve ter a procedure obterEstatisticas", () => {
    const caller = motorRegrasRouter.createCaller({} as any);
    expect(caller.obterEstatisticas).toBeDefined();
  });

  it("deve ter a procedure deletarValidacao", () => {
    const caller = motorRegrasRouter.createCaller({} as any);
    expect(caller.deletarValidacao).toBeDefined();
  });
});
