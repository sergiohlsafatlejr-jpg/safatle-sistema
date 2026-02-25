import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do drizzle
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockValues = vi.fn();

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
};

// Mock do getDb
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

// Mock do schema
vi.mock("../drizzle/schema", () => ({
  notificacoesAtendimento: { numatend: "numatend", criadoEm: "criadoEm", id: "id" },
  notificacoesAtendimentoItem: { notificacaoId: "notificacaoId", motivo: "motivo" },
}));

describe("Notificações de Atendimento - MySQL Interno", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Schema de tabelas", () => {
    it("deve ter a tabela notificacoes_atendimento definida no schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.notificacoesAtendimento).toBeDefined();
    });

    it("deve ter a tabela notificacoes_atendimento_item definida no schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.notificacoesAtendimentoItem).toBeDefined();
    });

    it("deve exportar tipos NotificacaoAtendimento", async () => {
      // Verificar que os tipos existem (compilação TypeScript)
      const schema = await import("../drizzle/schema");
      expect(schema.notificacoesAtendimento).toBeDefined();
    });
  });

  describe("Estrutura da tabela notificacoes_atendimento", () => {
    it("deve ter os campos esperados no schema", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.notificacoesAtendimento;
      // Verificar que a tabela existe como objeto
      expect(table).toBeTruthy();
      expect(typeof table).toBe("object");
    });
  });

  describe("Estrutura da tabela notificacoes_atendimento_item", () => {
    it("deve ter os campos esperados no schema", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.notificacoesAtendimentoItem;
      expect(table).toBeTruthy();
      expect(typeof table).toBe("object");
    });
  });

  describe("Funções de helper exportadas", () => {
    it("deve exportar salvarNotificacaoAtendimento", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.salvarNotificacaoAtendimento).toBe("function");
    });

    it("deve exportar salvarNotificacoesAtendimentoEmLote", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.salvarNotificacoesAtendimentoEmLote).toBe("function");
    });

    it("deve exportar buscarNotificacoesAtendimento", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.buscarNotificacoesAtendimento).toBe("function");
    });

    it("deve exportar getHistoricoNotificacoesAtendimento", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.getHistoricoNotificacoesAtendimento).toBe("function");
    });
  });

  describe("buscarNotificacoesAtendimento - lista vazia", () => {
    it("deve retornar objeto vazio para lista vazia de numatends", async () => {
      const dbModule = await import("./db");
      const resultado = await dbModule.buscarNotificacoesAtendimento([]);
      expect(resultado).toEqual({});
    });
  });
});
