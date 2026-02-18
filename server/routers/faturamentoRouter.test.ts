import { describe, it, expect } from "vitest";
import { faturamentoRouter } from "./faturamentoRouter";

describe("faturamentoRouter", () => {
  it("deve ter os métodos create, list, get, update e delete", () => {
    expect(faturamentoRouter).toBeDefined();
    expect(faturamentoRouter.createCaller).toBeDefined();
  });

  it("deve ter a procedure create", () => {
    const caller = faturamentoRouter.createCaller({} as any);
    expect(caller.create).toBeDefined();
  });

  it("deve ter a procedure list", () => {
    const caller = faturamentoRouter.createCaller({} as any);
    expect(caller.list).toBeDefined();
  });

  it("deve ter a procedure get", () => {
    const caller = faturamentoRouter.createCaller({} as any);
    expect(caller.get).toBeDefined();
  });

  it("deve ter a procedure update", () => {
    const caller = faturamentoRouter.createCaller({} as any);
    expect(caller.update).toBeDefined();
  });

  it("deve ter a procedure delete", () => {
    const caller = faturamentoRouter.createCaller({} as any);
    expect(caller.delete).toBeDefined();
  });
});
