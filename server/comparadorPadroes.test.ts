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

describe("comparadorPadroes - Suporte a Setor", () => {
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

  it("deve retornar resultado vazio quando não há itens na conta", async () => {
    // Primeira chamada: buscar itens da conta - retorna vazio
    mockDb.where.mockResolvedValueOnce([]);

    const resultado = await compararContaComPadroes("CONTA001", 1);

    expect(resultado.totalItensAnalisados).toBe(0);
    expect(resultado.divergencias).toHaveLength(0);
    expect(resultado.statusGeral).toBe("conforme");
    expect(resultado.setoresAnalisados).toBeDefined();
  });

  it("deve retornar aviso quando conta não tem convênio", async () => {
    // Itens sem convênio
    mockDb.where.mockResolvedValueOnce([
      { codigoItem: "10101039", convenio: null, tipoItem: "PROCEDIMENTO", quantidade: "1", valorUnitario: "100", valorTotal: "100", setor: "CENTRO CIRURGICO" },
    ]);

    const resultado = await compararContaComPadroes("CONTA002", 1);

    expect(resultado.totalItensAnalisados).toBe(1);
    expect(resultado.divergencias).toHaveLength(1);
    expect(resultado.divergencias[0].tipo).toBe("COMPOSICAO");
    expect(resultado.divergencias[0].mensagem).toContain("Convênio não identificado");
    expect(resultado.setoresAnalisados).toContain("CENTRO CIRURGICO");
  });

  it("deve incluir setoresAnalisados no resultado", async () => {
    // Itens em múltiplos setores
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "10101039", convenio: "UNIMED", convenioId: 1, tipoItem: "PROCEDIMENTO", quantidade: "1", valorUnitario: "100", valorTotal: "100", setor: "CENTRO CIRURGICO" },
        { codigoItem: "20201010", convenio: "UNIMED", convenioId: 1, tipoItem: "MAT_MED", quantidade: "2", valorUnitario: "50", valorTotal: "100", setor: "POSTO I" },
        { codigoItem: "30301010", convenio: "UNIMED", convenioId: 1, tipoItem: "MAT_MED", quantidade: "1", valorUnitario: "30", valorTotal: "30", setor: "CENTRO CIRURGICO" },
      ])
      // Padrões de preço
      .mockResolvedValueOnce([])
      // Padrões de quantidade
      .mockResolvedValueOnce([])
      // Padrões de glosa
      .mockResolvedValueOnce([])
      // Padrões de composição
      .mockResolvedValueOnce([]);

    const resultado = await compararContaComPadroes("CONTA003", 1);

    expect(resultado.setoresAnalisados).toBeDefined();
    expect(resultado.setoresAnalisados).toContain("CENTRO CIRURGICO");
    expect(resultado.setoresAnalisados).toContain("POSTO I");
    expect(resultado.totalItensAnalisados).toBe(3);
  });

  it("deve detectar item faltante com informação de setor", async () => {
    // Itens no Centro Cirúrgico
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "10101039", convenio: "UNIMED", convenioId: 1, tipoItem: "PROCEDIMENTO", quantidade: "1", valorUnitario: "500", valorTotal: "500", setor: "CENTRO CIRURGICO" },
      ])
      // Padrões de preço
      .mockResolvedValueOnce([])
      // Padrões de quantidade
      .mockResolvedValueOnce([])
      // Padrões de glosa
      .mockResolvedValueOnce([])
      // Padrões de composição - gabarito com setor CENTRO CIRURGICO
      .mockResolvedValueOnce([
        {
          id: 1,
          estabelecimentoId: 1,
          convenioId: 1,
          setor: "CENTRO CIRURGICO",
          codigoProcedimentoPrincipal: "10101039",
          descricaoProcedimentoPrincipal: "Cirurgia Teste",
          isGabarito: 1,
          status: "ativo",
          confianca: 100,
          itensAssociados: [
            { codigo: "MAT001", descricao: "Material Cirúrgico A", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 2, quantidadeMin: 1, quantidadeMax: 3 },
            { codigo: "MAT002", descricao: "Material Cirúrgico B", tipo: "MAT_MED", frequencia: 90, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 2 },
          ],
          totalOcorrencias: 10,
        },
      ]);

    const resultado = await compararContaComPadroes("CONTA004", 1);

    // Deve detectar MAT001 e MAT002 como faltantes
    const faltantes = resultado.divergencias.filter(d => d.tipo === "ITEM_FALTANTE");
    expect(faltantes.length).toBeGreaterThanOrEqual(2);
    
    // Verificar que as divergências incluem informação de setor
    for (const div of faltantes) {
      expect(div.setor).toBe("CENTRO CIRURGICO");
      expect(div.mensagem).toContain("Fonte: gabarito");
      expect(div.mensagem).toContain("setor: CENTRO CIRURGICO");
    }

    expect(resultado.gabaritosUsados).toBe(1);
  });

  it("deve priorizar gabarito com setor específico sobre gabarito genérico", async () => {
    // Itens no Centro Cirúrgico
    mockDb.where
      .mockResolvedValueOnce([
        { codigoItem: "10101039", convenio: "UNIMED", convenioId: 1, tipoItem: "PROCEDIMENTO", quantidade: "1", valorUnitario: "500", valorTotal: "500", setor: "CENTRO CIRURGICO" },
        { codigoItem: "MAT_GENERICO", convenio: "UNIMED", convenioId: 1, tipoItem: "MAT_MED", quantidade: "1", valorUnitario: "10", valorTotal: "10", setor: "CENTRO CIRURGICO" },
      ])
      // Padrões de preço
      .mockResolvedValueOnce([])
      // Padrões de quantidade
      .mockResolvedValueOnce([])
      // Padrões de glosa
      .mockResolvedValueOnce([])
      // Padrões de composição - gabarito genérico E gabarito com setor
      .mockResolvedValueOnce([
        {
          id: 1,
          estabelecimentoId: 1,
          convenioId: 1,
          setor: null, // genérico
          codigoProcedimentoPrincipal: "10101039",
          descricaoProcedimentoPrincipal: "Cirurgia Teste",
          isGabarito: 1,
          status: "ativo",
          confianca: 100,
          itensAssociados: [
            { codigo: "MAT_GENERICO", descricao: "Material Genérico", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 5, quantidadeMin: 3, quantidadeMax: 7 },
          ],
          totalOcorrencias: 10,
        },
        {
          id: 2,
          estabelecimentoId: 1,
          convenioId: 1,
          setor: "CENTRO CIRURGICO", // específico
          codigoProcedimentoPrincipal: "10101039",
          descricaoProcedimentoPrincipal: "Cirurgia Teste",
          isGabarito: 1,
          status: "ativo",
          confianca: 100,
          itensAssociados: [
            { codigo: "MAT_GENERICO", descricao: "Material Genérico", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 2, quantidadeMin: 1, quantidadeMax: 3 },
            { codigo: "MAT_ESPECIFICO", descricao: "Material Específico CC", tipo: "MAT_MED", frequencia: 100, quantidadeMedia: 1, quantidadeMin: 1, quantidadeMax: 2 },
          ],
          totalOcorrencias: 5,
        },
      ]);

    const resultado = await compararContaComPadroes("CONTA005", 1);

    // Deve usar o gabarito com setor CENTRO CIRURGICO (id=2) que tem MAT_ESPECIFICO
    const faltantes = resultado.divergencias.filter(d => d.tipo === "ITEM_FALTANTE");
    const matEspecifico = faltantes.find(d => d.codigoItem === "MAT_ESPECIFICO");
    expect(matEspecifico).toBeDefined();
    expect(matEspecifico?.mensagem).toContain("setor: CENTRO CIRURGICO");
    
    // Deve ter usado o gabarito com setor específico (id=2)
    expect(resultado.gabaritosUsados).toBe(1);
  });
});
