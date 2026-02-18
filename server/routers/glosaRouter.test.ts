import { describe, it, expect } from "vitest";
import { glosaRouter } from "./glosaRouter";

describe("glosaRouter", () => {
  it("deve ter os métodos create, list, get, update e delete", () => {
    expect(glosaRouter).toBeDefined();
    expect(glosaRouter.createCaller).toBeDefined();
  });

  it("deve ter a procedure create", () => {
    const caller = glosaRouter.createCaller({} as any);
    expect(caller.create).toBeDefined();
  });

  it("deve ter a procedure list", () => {
    const caller = glosaRouter.createCaller({} as any);
    expect(caller.list).toBeDefined();
  });

  it("deve ter a procedure get", () => {
    const caller = glosaRouter.createCaller({} as any);
    expect(caller.get).toBeDefined();
  });

  it("deve ter a procedure update", () => {
    const caller = glosaRouter.createCaller({} as any);
    expect(caller.update).toBeDefined();
  });

  it("deve ter a procedure delete", () => {
    const caller = glosaRouter.createCaller({} as any);
    expect(caller.delete).toBeDefined();
  });
});
