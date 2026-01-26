import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Prestadores por Convênio/Estabelecimento", () => {
  let convenioId: number;
  let estabelecimentoId: number;
  let prestadorId: number;

  beforeAll(async () => {
    // Buscar um convênio e estabelecimento existentes para os testes
    const convenios = await db.getConvenios();
    const estabelecimentos = await db.getEstabelecimentos();
    
    if (convenios.length > 0) {
      convenioId = convenios[0].id;
    }
    if (estabelecimentos.length > 0) {
      estabelecimentoId = estabelecimentos[0].id;
    }
  });

  it("deve criar um novo prestador para convênio/estabelecimento", async () => {
    if (!convenioId || !estabelecimentoId) {
      console.log("Skipping test: no convenio or estabelecimento found");
      return;
    }

    const result = await db.upsertPrestadorConvenioEstabelecimento({
      convenioId,
      estabelecimentoId,
      codigoPrestador: "TEST123456",
      nomePrestador: "Prestador de Teste",
    });

    expect(result).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
    prestadorId = result.id;
  });

  it("deve atualizar um prestador existente (upsert)", async () => {
    if (!convenioId || !estabelecimentoId) {
      console.log("Skipping test: no convenio or estabelecimento found");
      return;
    }

    const result = await db.upsertPrestadorConvenioEstabelecimento({
      convenioId,
      estabelecimentoId,
      codigoPrestador: "TEST789012",
      nomePrestador: "Prestador Atualizado",
    });

    expect(result).toBeDefined();
    expect(result.created).toBe(false); // Deve ser update, não create
    expect(result.id).toBe(prestadorId);
  });

  it("deve buscar prestador por convênio e estabelecimento", async () => {
    if (!convenioId || !estabelecimentoId) {
      console.log("Skipping test: no convenio or estabelecimento found");
      return;
    }

    const prestador = await db.getPrestadorPorConvenioEstabelecimento(convenioId, estabelecimentoId);

    expect(prestador).toBeDefined();
    expect(prestador?.codigoPrestador).toBe("TEST789012");
  });

  it("deve buscar prestador por código", async () => {
    const prestador = await db.getPrestadorPorCodigo("TEST789012");

    expect(prestador).toBeDefined();
    expect(prestador?.codigoPrestador).toBe("TEST789012");
  });

  it("deve listar prestadores por convênio", async () => {
    if (!convenioId) {
      console.log("Skipping test: no convenio found");
      return;
    }

    const prestadores = await db.listarPrestadoresPorConvenio(convenioId);

    expect(Array.isArray(prestadores)).toBe(true);
    expect(prestadores.length).toBeGreaterThan(0);
    expect(prestadores[0].codigoPrestador).toBeDefined();
  });

  it("deve listar prestadores por estabelecimento", async () => {
    if (!estabelecimentoId) {
      console.log("Skipping test: no estabelecimento found");
      return;
    }

    const prestadores = await db.listarPrestadoresPorEstabelecimento(estabelecimentoId);

    expect(Array.isArray(prestadores)).toBe(true);
    expect(prestadores.length).toBeGreaterThan(0);
  });

  it("deve listar todos os prestadores", async () => {
    const prestadores = await db.listarTodosPrestadores();

    expect(Array.isArray(prestadores)).toBe(true);
    expect(prestadores.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (prestadorId) {
      await db.excluirPrestadorConvenioEstabelecimento(prestadorId);
    }
  });
});
