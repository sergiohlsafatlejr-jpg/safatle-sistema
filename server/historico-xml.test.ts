import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  salvarHistoricoValidacaoXml,
  listarHistoricoValidacoesXml,
  obterDetalhesValidacaoXml,
  obterEstatisticasValidacaoXml,
} from "./db";

describe("Histórico de Validações XML", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  it("deve salvar histórico de validação XML com sucesso", async () => {
    const resultado = await salvarHistoricoValidacaoXml({
      estabelecimentoId: 1,
      nomeArquivo: "teste-validacao.xml",
      dataProcessamento: new Date(),
      totalContas: 100,
      contasValidas: 95,
      contasInvalidas: 5,
      scoreConformidadeMedio: 95.5,
      resultadoCompleto: {
        divergencias: [],
        violacoes: [],
      },
      usuarioId: 1,
    });

    expect(resultado).toBeDefined();
    expect(resultado?.success).toBe(true);
  });

  it("deve listar histórico de validações XML", async () => {
    const historico = await listarHistoricoValidacoesXml({
      estabelecimentoId: 1,
      limit: 10,
    });

    expect(Array.isArray(historico)).toBe(true);
  });

  it("deve obter detalhes de uma validação XML", async () => {
    // Primeiro, salva um histórico
    await salvarHistoricoValidacaoXml({
      estabelecimentoId: 1,
      nomeArquivo: "teste-detalhes.xml",
      dataProcessamento: new Date(),
      totalContas: 50,
      contasValidas: 48,
      contasInvalidas: 2,
      scoreConformidadeMedio: 96.0,
      resultadoCompleto: {
        divergencias: [],
        violacoes: [],
      },
      usuarioId: 1,
    });

    // Depois, lista para obter um ID
    const historico = await listarHistoricoValidacoesXml({
      estabelecimentoId: 1,
      limit: 1,
    });

    if (historico && historico.length > 0) {
      const detalhes = await obterDetalhesValidacaoXml(historico[0].id);
      expect(detalhes).toBeDefined();
      expect(detalhes?.nomeArquivo).toBe("teste-detalhes.xml");
    }
  });

  it("deve obter estatísticas de validações XML", async () => {
    const estatisticas = await obterEstatisticasValidacaoXml(1);

    expect(estatisticas).toBeDefined();
    if (estatisticas) {
      expect(typeof estatisticas.totalValidacoes).toBe("number");
      expect(typeof estatisticas.totalContasProcessadas).toBe("number");
    }
  });

  it("deve listar histórico com filtro de data", async () => {
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 7);

    const historico = await listarHistoricoValidacoesXml({
      estabelecimentoId: 1,
      dataInicio,
      limit: 10,
    });

    expect(Array.isArray(historico)).toBe(true);
  });

  it("deve salvar resultado completo como JSON", async () => {
    const resultadoCompleto = {
      divergencias: [
        {
          id: 1,
          descricao: "Divergência de preço",
          valor: 100.0,
        },
      ],
      violacoes: [
        {
          id: 1,
          descricao: "Violação de regra",
          severidade: "alta",
        },
      ],
    };

    const resultado = await salvarHistoricoValidacaoXml({
      estabelecimentoId: 1,
      nomeArquivo: "teste-json.xml",
      dataProcessamento: new Date(),
      totalContas: 75,
      contasValidas: 70,
      contasInvalidas: 5,
      scoreConformidadeMedio: 93.3,
      resultadoCompleto,
      usuarioId: 1,
    });

    expect(resultado?.success).toBe(true);

    // Verificar se o JSON foi salvo corretamente
    const historico = await listarHistoricoValidacoesXml({
      estabelecimentoId: 1,
      limit: 1,
    });

    if (historico && historico.length > 0) {
      const detalhes = await obterDetalhesValidacaoXml(historico[0].id);
      expect(detalhes?.resultadoCompleto).toBeDefined();
      expect(typeof detalhes?.resultadoCompleto).toBe("object");
    }
  });
});
