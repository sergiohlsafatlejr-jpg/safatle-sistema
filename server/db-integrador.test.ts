import { describe, it, expect, vi } from "vitest";

// Mock do getDb
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([[]]),
    run: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("db-integrador module", () => {
  it("should export all required CRUD functions for conexoes", async () => {
    const dbIntegrador = await import("./db-integrador");
    expect(typeof dbIntegrador.criarConexao).toBe("function");
    expect(typeof dbIntegrador.listarConexoes).toBe("function");
    expect(typeof dbIntegrador.obterConexao).toBe("function");
    expect(typeof dbIntegrador.atualizarConexao).toBe("function");
    expect(typeof dbIntegrador.excluirConexao).toBe("function");
    expect(typeof dbIntegrador.atualizarStatusConexao).toBe("function");
  });

  it("should export all required CRUD functions for tabelas", async () => {
    const dbIntegrador = await import("./db-integrador");
    expect(typeof dbIntegrador.criarTabela).toBe("function");
    expect(typeof dbIntegrador.listarTabelas).toBe("function");
    expect(typeof dbIntegrador.obterTabela).toBe("function");
    expect(typeof dbIntegrador.atualizarTabela).toBe("function");
    expect(typeof dbIntegrador.excluirTabela).toBe("function");
  });

  it("should export all required CRUD functions for colunas", async () => {
    const dbIntegrador = await import("./db-integrador");
    expect(typeof dbIntegrador.criarColuna).toBe("function");
    expect(typeof dbIntegrador.listarColunas).toBe("function");
    expect(typeof dbIntegrador.criarColunasEmLote).toBe("function");
    expect(typeof dbIntegrador.atualizarColuna).toBe("function");
    expect(typeof dbIntegrador.excluirColuna).toBe("function");
  });

  it("should export all required CRUD functions for mapeamentos", async () => {
    const dbIntegrador = await import("./db-integrador");
    expect(typeof dbIntegrador.criarMapeamento).toBe("function");
    expect(typeof dbIntegrador.listarMapeamentos).toBe("function");
    expect(typeof dbIntegrador.obterMapeamento).toBe("function");
    expect(typeof dbIntegrador.atualizarMapeamento).toBe("function");
    expect(typeof dbIntegrador.excluirMapeamento).toBe("function");
  });

  it("should export all required functions for campos de mapeamento", async () => {
    const dbIntegrador = await import("./db-integrador");
    expect(typeof dbIntegrador.listarCamposMapeamento).toBe("function");
    expect(typeof dbIntegrador.salvarCamposMapeamento).toBe("function");
  });

  it("should export all required functions for sincronizacoes", async () => {
    const dbIntegrador = await import("./db-integrador");
    expect(typeof dbIntegrador.criarSincronizacao).toBe("function");
    expect(typeof dbIntegrador.listarSincronizacoes).toBe("function");
    expect(typeof dbIntegrador.atualizarSincronizacao).toBe("function");
  });

  it("should export all required DDL/DML functions", async () => {
    const dbIntegrador = await import("./db-integrador");
    expect(typeof dbIntegrador.executarDDLCriarTabela).toBe("function");
    expect(typeof dbIntegrador.executarDDLAdicionarColuna).toBe("function");
    expect(typeof dbIntegrador.executarDDLRemoverTabela).toBe("function");
    expect(typeof dbIntegrador.inserirDadosTabela).toBe("function");
    expect(typeof dbIntegrador.consultarDadosTabela).toBe("function");
    expect(typeof dbIntegrador.contarRegistrosTabela).toBe("function");
  });

  it("should validate table name in executarDDLCriarTabela - reject invalid chars", async () => {
    const dbIntegrador = await import("./db-integrador");
    await expect(
      dbIntegrador.executarDDLCriarTabela("tabela; DROP TABLE users;--", [
        { nome: "col1", tipo: "varchar", tamanho: 255, obrigatorio: "nao", chaveUnica: "nao" },
      ])
    ).rejects.toThrow("caracteres inválidos");
  });

  it("should reject executarDDLRemoverTabela for non-integ_ tables", async () => {
    const dbIntegrador = await import("./db-integrador");
    await expect(
      dbIntegrador.executarDDLRemoverTabela("users")
    ).rejects.toThrow("prefixo integ_");
  });

  it("should handle inserirDadosTabela with empty records", async () => {
    const dbIntegrador = await import("./db-integrador");
    const result = await dbIntegrador.inserirDadosTabela("integ_teste", []);
    expect(result.inseridos).toBe(0);
  });
});
