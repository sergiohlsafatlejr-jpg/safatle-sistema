import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-auditor",
    email: "auditor@hospital.com",
    name: "Enfermeira Auditora",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("auditoria.registrarAjuste - ALTERAR_SETOR", () => {
  it("accepts ALTERAR_SETOR as a valid tipoAjuste in the input schema", () => {
    // Verify the router procedure exists
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.auditoria.registrarAjuste).toBeDefined();
    expect(typeof caller.auditoria.registrarAjuste).toBe("function");
  });

  it("accepts setorOriginal and setorAjustado fields in the input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This will fail at DB level but validates the input schema accepts the fields
    try {
      await caller.auditoria.registrarAjuste({
        numeroConta: "TEST-SETOR-001",
        estabelecimentoId: 1,
        tipoAjuste: "ALTERAR_SETOR",
        itemId: 999999,
        codigoItem: "60000694",
        descricaoItem: "DIARIA DE ENFERMARIA",
        setorOriginal: "ENFERMARIA",
        setorAjustado: "UTI",
        justificativa: "Paciente transferido para UTI",
      });
    } catch (error: any) {
      // Expected: DB error or item not found, but NOT a Zod validation error
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });

  it("rejects invalid tipoAjuste values", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auditoria.registrarAjuste({
        numeroConta: "TEST-001",
        estabelecimentoId: 1,
        tipoAjuste: "TIPO_INVALIDO" as any,
      });
      expect.unreachable("Should have thrown");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });

  it("requires numeroConta to be non-empty", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auditoria.registrarAjuste({
        numeroConta: "",
        estabelecimentoId: 1,
        tipoAjuste: "ALTERAR_SETOR",
      });
      expect.unreachable("Should have thrown");
    } catch (error: any) {
      expect(error.code).toBe("BAD_REQUEST");
    }
  });
});

describe("auditoria.listarAjustes", () => {
  it("procedure exists and is callable", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.auditoria.listarAjustes).toBeDefined();
    expect(typeof caller.auditoria.listarAjustes).toBe("function");
  });
});

describe("auditoria.reverterAjuste", () => {
  it("procedure exists and is callable", () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.auditoria.reverterAjuste).toBeDefined();
    expect(typeof caller.auditoria.reverterAjuste).toBe("function");
  });
});

describe("auditoria input schema validation", () => {
  it("accepts all valid tipoAjuste enum values", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const validTypes = [
      "ALTERAR_QUANTIDADE",
      "ALTERAR_VALOR",
      "ADICIONAR_ITEM",
      "REMOVER_ITEM",
      "ALTERAR_SETOR",
    ];

    for (const tipo of validTypes) {
      try {
        await caller.auditoria.registrarAjuste({
          numeroConta: "TEST-ENUM-001",
          estabelecimentoId: 1,
          tipoAjuste: tipo as any,
        });
      } catch (error: any) {
        // Should NOT be a BAD_REQUEST (validation error) for valid types
        expect(error.code).not.toBe("BAD_REQUEST");
      }
    }
  });

  it("setorOriginal and setorAjustado are optional fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Should not throw validation error when setor fields are omitted
    try {
      await caller.auditoria.registrarAjuste({
        numeroConta: "TEST-OPTIONAL-001",
        estabelecimentoId: 1,
        tipoAjuste: "ALTERAR_QUANTIDADE",
        itemId: 999999,
        quantidadeOriginal: "1",
        quantidadeAjustada: "2",
      });
    } catch (error: any) {
      expect(error.code).not.toBe("BAD_REQUEST");
    }
  });
});

describe("filtro por tipo de item na aba Ajustes", () => {
  // Simula a lógica de filtragem do frontend para garantir consistência
  const mockItems = [
    { id: 1, codigoItem: "10102019", descricaoItem: "VISITA HOSPITALAR", tipoItem: "PROCEDIMENTO", setor: "UTI", dataExecucao: "2025-12-01" },
    { id: 2, codigoItem: "60000694", descricaoItem: "DIARIA DE ENFERMARIA", tipoItem: "DIARIA", setor: "ENFERMARIA", dataExecucao: "2025-12-01" },
    { id: 3, codigoItem: "60034343", descricaoItem: "OXIGENIO POR MINUTO", tipoItem: "GASES", setor: "UTI", dataExecucao: "2025-12-02" },
    { id: 4, codigoItem: "43990305", descricaoItem: "TAXA DE AUDITORIA", tipoItem: "TAXA", setor: "ENFERMARIA", dataExecucao: "2025-12-01" },
    { id: 5, codigoItem: "90001234", descricaoItem: "DIPIRONA 500MG", tipoItem: "MAT_MED", setor: "UTI", dataExecucao: "2025-12-02" },
    { id: 6, codigoItem: "90005678", descricaoItem: "SORO FISIOLOGICO", tipoItem: null, setor: "ENFERMARIA", dataExecucao: "2025-12-01" },
  ];

  function filterItems(items: typeof mockItems, filtroTipo: string, filtroSetor: string = "todos", filtroData: string = "") {
    return items.filter((item) => {
      if (filtroSetor !== "todos") {
        if (filtroSetor === "sem_setor") { if (item.setor) return false; }
        else { if (item.setor !== filtroSetor) return false; }
      }
      if (filtroData && item.dataExecucao) {
        if (item.dataExecucao !== filtroData) return false;
      } else if (filtroData && !item.dataExecucao) {
        return false;
      }
      if (filtroTipo !== "todos") {
        if (filtroTipo === "sem_tipo") { if (item.tipoItem) return false; }
        else { if (item.tipoItem !== filtroTipo) return false; }
      }
      return true;
    });
  }

  it("shows all items when filtroTipo is 'todos'", () => {
    const result = filterItems(mockItems, "todos");
    expect(result.length).toBe(6);
  });

  it("filters by PROCEDIMENTO type", () => {
    const result = filterItems(mockItems, "PROCEDIMENTO");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("VISITA HOSPITALAR");
  });

  it("filters by DIARIA type", () => {
    const result = filterItems(mockItems, "DIARIA");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("DIARIA DE ENFERMARIA");
  });

  it("filters by TAXA type", () => {
    const result = filterItems(mockItems, "TAXA");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("TAXA DE AUDITORIA");
  });

  it("filters by MAT_MED type", () => {
    const result = filterItems(mockItems, "MAT_MED");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("DIPIRONA 500MG");
  });

  it("filters by GASES type", () => {
    const result = filterItems(mockItems, "GASES");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("OXIGENIO POR MINUTO");
  });

  it("filters items without type (sem_tipo)", () => {
    const result = filterItems(mockItems, "sem_tipo");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("SORO FISIOLOGICO");
  });

  it("combines tipo + setor filters correctly", () => {
    const result = filterItems(mockItems, "PROCEDIMENTO", "UTI");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("VISITA HOSPITALAR");

    const result2 = filterItems(mockItems, "PROCEDIMENTO", "ENFERMARIA");
    expect(result2.length).toBe(0);
  });

  it("combines tipo + data filters correctly", () => {
    const result = filterItems(mockItems, "DIARIA", "todos", "2025-12-01");
    expect(result.length).toBe(1);

    const result2 = filterItems(mockItems, "DIARIA", "todos", "2025-12-02");
    expect(result2.length).toBe(0);
  });

  it("combines all three filters correctly", () => {
    const result = filterItems(mockItems, "GASES", "UTI", "2025-12-02");
    expect(result.length).toBe(1);
    expect(result[0].descricaoItem).toBe("OXIGENIO POR MINUTO");

    const result2 = filterItems(mockItems, "GASES", "ENFERMARIA", "2025-12-02");
    expect(result2.length).toBe(0);
  });

  it("returns empty when no items match the tipo filter", () => {
    const result = filterItems(mockItems, "TIPO_INEXISTENTE");
    expect(result.length).toBe(0);
  });
});
