import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do módulo de banco de dados
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

vi.mock("./_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Importar após os mocks
import { compararContaComPadroes } from "./services/comparadorPadroes";
import { getDb } from "./db";

const mockGetDb = getDb as unknown as ReturnType<typeof vi.fn>;

describe("Gabarito Composto - Prioridade sobre Padrões Individuais", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
    };

    mockGetDb.mockResolvedValue(mockDb);
  });

  it("deve priorizar gabarito composto sobre padrão aprendido individual", async () => {
    // Conta com 2 procedimentos: 31102360 + 31102050
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "31102360", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "500", valorTotal: "500", setor: "CENTRO CIRURGICO" },
        { codigoItem: "31102050", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "300", valorTotal: "300", setor: "CENTRO CIRURGICO" },
        { codigoItem: "60023155", convenio: "UNIMED", convenioId: null, tipoItem: "T", quantidade: "1", valorUnitario: "50", valorTotal: "50", setor: "CENTRO CIRURGICO" },
      ])
      // Padrões de preço
      .mockResolvedValueOnce([])
      // Padrões de quantidade
      .mockResolvedValueOnce([])
      // Padrões de glosa
      .mockResolvedValueOnce([])
      // Padrões de composição: padrão aprendido individual + gabarito composto
      .mockResolvedValueOnce([
        // Padrão aprendido individual para 31102360
        {
          id: 810201,
          estabelecimentoId: 1260036,
          convenioId: null,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "31102360",
          descricaoProcedimentoPrincipal: "URETERORRENOLITOTRIPSIA",
          isGabarito: 0,
          status: "ativo",
          confianca: 80,
          itensAssociados: [
            { codigo: "60023155", descricao: "TAXA DE SALA", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 1 },
          ],
          totalOcorrencias: 15,
        },
        // Padrão aprendido individual para 31102050
        {
          id: 810202,
          estabelecimentoId: 1260036,
          convenioId: null,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "31102050",
          descricaoProcedimentoPrincipal: "COLOCACAO DUPLO J",
          isGabarito: 0,
          status: "ativo",
          confianca: 80,
          itensAssociados: [
            { codigo: "60023155", descricao: "TAXA DE SALA", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 1 },
          ],
          totalOcorrencias: 12,
        },
        // Gabarito COMPOSTO para 31102360 + 31102050
        {
          id: 840001,
          estabelecimentoId: 1260036,
          convenioId: 30001,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "31102360 + 31102050",
          descricaoProcedimentoPrincipal: "Ureterorrenolitotripsia + Duplo J",
          isGabarito: 1,
          status: "ativo",
          confianca: 100,
          itensAssociados: [
            { codigo: "60023155", descricao: "TAXA DE SALA", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 1 },
            { codigo: "60024755", descricao: "TAXA DE LASER POR USO", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 1 },
            { codigo: "00057410", descricao: "KIT PARA URETERORRENOLITOTRIPSIA A LASER", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 1 },
          ],
          totalOcorrencias: 5,
        },
      ]);

    const resultado = await compararContaComPadroes("143810", 1260036);

    // Deve ter usado o gabarito composto (não os padrões individuais)
    expect(resultado.gabaritosUsados).toBe(1);

    // O gabarito composto deve estar nos detalhes
    const gabDetalhe = resultado.padroesDetalhados.find(p => p.padraoId === 840001);
    expect(gabDetalhe).toBeDefined();
    expect(gabDetalhe!.isGabarito).toBe(true);
    expect(gabDetalhe!.scoreMatch).toBe(200);
    expect(gabDetalhe!.motivoSelecao).toContain("Gabarito composto");

    // Deve detectar TAXA DE LASER e KIT LASER como ITEM_FALTANTE
    const faltantes = resultado.divergencias.filter(d => d.tipo === "ITEM_FALTANTE");
    const taxaLaser = faltantes.find(d => d.codigoItem === "60024755");
    const kitLaser = faltantes.find(d => d.codigoItem === "00057410");

    expect(taxaLaser).toBeDefined();
    expect(taxaLaser!.severidade).toBe("critico");
    expect(taxaLaser!.isGabarito).toBe(true);

    expect(kitLaser).toBeDefined();
    expect(kitLaser!.severidade).toBe("critico");
    expect(kitLaser!.isGabarito).toBe(true);
  });

  it("deve usar padrão individual quando não existe gabarito composto", async () => {
    // Conta com 1 procedimento
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "31102360", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "500", valorTotal: "500", setor: "CENTRO CIRURGICO" },
        { codigoItem: "60023155", convenio: "UNIMED", convenioId: null, tipoItem: "T", quantidade: "1", valorUnitario: "50", valorTotal: "50", setor: "CENTRO CIRURGICO" },
      ])
      // Padrões de preço
      .mockResolvedValueOnce([])
      // Padrões de quantidade
      .mockResolvedValueOnce([])
      // Padrões de glosa
      .mockResolvedValueOnce([])
      // Padrões de composição: apenas padrão aprendido individual
      .mockResolvedValueOnce([
        {
          id: 810201,
          estabelecimentoId: 1260036,
          convenioId: null,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "31102360",
          descricaoProcedimentoPrincipal: "URETERORRENOLITOTRIPSIA",
          isGabarito: 0,
          status: "ativo",
          confianca: 80,
          itensAssociados: [
            { codigo: "60023155", descricao: "TAXA DE SALA", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 1 },
            { codigo: "MAT001", descricao: "MATERIAL TESTE", tipo: "MAT_MED", frequencia: 90, quantidadeMedia: 2, quantidadeMin: 1, quantidadeMax: 3 },
          ],
          totalOcorrencias: 15,
        },
      ]);

    const resultado = await compararContaComPadroes("CONTA_IND", 1260036);

    // Deve usar o padrão individual
    expect(resultado.padroesUsados).toBe(1);
    expect(resultado.gabaritosUsados).toBe(0);

    // Deve detectar MAT001 como faltante
    const faltantes = resultado.divergencias.filter(d => d.tipo === "ITEM_FALTANTE");
    const matFaltante = faltantes.find(d => d.codigoItem === "MAT001");
    expect(matFaltante).toBeDefined();
    expect(matFaltante!.isGabarito).toBe(false);
  });

  it("não deve usar gabarito composto quando nem todos os procedimentos estão na conta", async () => {
    // Conta com apenas 1 dos 3 procedimentos do gabarito
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "31102360", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "500", valorTotal: "500", setor: "CENTRO CIRURGICO" },
      ])
      // Padrões de preço
      .mockResolvedValueOnce([])
      // Padrões de quantidade
      .mockResolvedValueOnce([])
      // Padrões de glosa
      .mockResolvedValueOnce([])
      // Padrões de composição: gabarito composto com 3 procedimentos
      .mockResolvedValueOnce([
        {
          id: 840179,
          estabelecimentoId: 1260036,
          convenioId: 1,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "31102360 + 31102050 + 31103472",
          descricaoProcedimentoPrincipal: "Cirurgia Tripla",
          isGabarito: 1,
          status: "ativo",
          confianca: 100,
          itensAssociados: [
            { codigo: "43990305", descricao: "TAXA DE AUDITORIA INTRA", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1 },
          ],
          totalOcorrencias: 3,
        },
      ]);

    const resultado = await compararContaComPadroes("CONTA_PARCIAL", 1260036);

    // Não deve usar o gabarito composto (faltam procedimentos)
    expect(resultado.gabaritosUsados).toBe(0);

    // Não deve detectar TAXA DE AUDITORIA como faltante
    const faltantes = resultado.divergencias.filter(d => d.tipo === "ITEM_FALTANTE");
    const auditoria = faltantes.find(d => d.codigoItem === "43990305");
    expect(auditoria).toBeUndefined();
  });

  it("deve usar gabarito composto mesmo quando setor é genérico (null)", async () => {
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "PROC_A", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "100", valorTotal: "100", setor: "CENTRO CIRURGICO" },
        { codigoItem: "PROC_B", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "100", valorTotal: "100", setor: "CENTRO CIRURGICO" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 999,
          estabelecimentoId: 1260036,
          convenioId: null,
          setor: null, // genérico
          codigoProcedimentoPrincipal: "PROC_A + PROC_B",
          descricaoProcedimentoPrincipal: "Procedimento Combinado",
          isGabarito: 1,
          status: "ativo",
          confianca: 100,
          itensAssociados: [
            { codigo: "ITEM_X", descricao: "Item Esperado X", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 1 },
          ],
          totalOcorrencias: 5,
        },
      ]);

    const resultado = await compararContaComPadroes("CONTA_GEN", 1260036);

    expect(resultado.gabaritosUsados).toBe(1);
    const faltantes = resultado.divergencias.filter(d => d.tipo === "ITEM_FALTANTE");
    expect(faltantes.find(d => d.codigoItem === "ITEM_X")).toBeDefined();
  });

  it("não deve duplicar análise quando gabarito composto já cobriu os procedimentos", async () => {
    // Conta com 2 procedimentos cobertos pelo gabarito composto
    // Também existem padrões individuais para cada procedimento
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "PROC_A", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "100", valorTotal: "100", setor: "CENTRO CIRURGICO" },
        { codigoItem: "PROC_B", convenio: "UNIMED", convenioId: null, tipoItem: "P", quantidade: "1", valorUnitario: "100", valorTotal: "100", setor: "CENTRO CIRURGICO" },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        // Padrão individual para PROC_A
        {
          id: 100,
          estabelecimentoId: 1260036,
          convenioId: null,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "PROC_A",
          descricaoProcedimentoPrincipal: "Procedimento A",
          isGabarito: 0,
          status: "ativo",
          confianca: 80,
          itensAssociados: [
            { codigo: "ITEM_IND", descricao: "Item Individual", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 1 },
          ],
          totalOcorrencias: 10,
        },
        // Gabarito composto
        {
          id: 200,
          estabelecimentoId: 1260036,
          convenioId: null,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "PROC_A + PROC_B",
          descricaoProcedimentoPrincipal: "Procedimento Combinado",
          isGabarito: 1,
          status: "ativo",
          confianca: 100,
          itensAssociados: [
            { codigo: "ITEM_COMBO", descricao: "Item do Combo", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 1 },
          ],
          totalOcorrencias: 5,
        },
      ]);

    const resultado = await compararContaComPadroes("CONTA_DEDUP", 1260036);

    // Gabarito composto deve ser usado
    expect(resultado.gabaritosUsados).toBe(1);
    // Padrão individual NÃO deve ser usado (procedimento já coberto)
    expect(resultado.padroesUsados).toBe(0);

    // Deve ter ITEM_COMBO como faltante (do gabarito composto)
    const faltantes = resultado.divergencias.filter(d => d.tipo === "ITEM_FALTANTE");
    expect(faltantes.find(d => d.codigoItem === "ITEM_COMBO")).toBeDefined();
    // NÃO deve ter ITEM_IND (do padrão individual que foi suprimido)
    expect(faltantes.find(d => d.codigoItem === "ITEM_IND")).toBeUndefined();
  });
});
