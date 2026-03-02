import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
const mockExecute = vi.fn();
vi.mock('./db', () => ({
  getDb: vi.fn(() => Promise.resolve({
    execute: mockExecute,
  })),
}));

// Mock do sql.raw do drizzle-orm
vi.mock('drizzle-orm', () => ({
  sql: {
    raw: vi.fn((query: string) => ({ queryChunks: [{ value: [query] }], _rawQuery: query })),
  },
}));

import {
  executarConciliacao,
  listarConciliacao,
  resumoConciliacaoPorGuia,
  vincularCodigo,
  listarVinculacoes,
  deletarVinculacao,
  atualizarStatusConciliacao,
  itensPendentesVinculacao,
} from './conciliacaoService';

describe('ConciliacaoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([]);
  });

  describe('listarConciliacao', () => {
    it('deve construir query com filtros básicos', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 10 }]) // count query
        .mockResolvedValueOnce([{ id: 1, statusConciliacao: 'conciliado' }]); // data query

      const result = await listarConciliacao({
        estabelecimentoId: 1,
        pagina: 1,
        porPagina: 50,
      });

      expect(result).toHaveProperty('itens');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('pagina');
      expect(result).toHaveProperty('porPagina');
      expect(result).toHaveProperty('totalPaginas');
      expect(result.pagina).toBe(1);
      expect(result.porPagina).toBe(50);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('deve aplicar filtro de status', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 5 }])
        .mockResolvedValueOnce([]);

      await listarConciliacao({
        estabelecimentoId: 1,
        status: 'glosado',
      });

      // Verifica que a query inclui o filtro de status
      const firstCall = mockExecute.mock.calls[0][0];
      expect(firstCall._rawQuery || JSON.stringify(firstCall)).toContain('glosado');
    });

    it('deve aplicar filtro de receberHospital', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 3 }])
        .mockResolvedValueOnce([]);

      await listarConciliacao({
        estabelecimentoId: 1,
        receberHospital: 'S',
      });

      const firstCall = mockExecute.mock.calls[0][0];
      expect(firstCall._rawQuery || JSON.stringify(firstCall)).toContain("receberHospital");
    });

    it('deve calcular totalPaginas corretamente', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 105 }])
        .mockResolvedValueOnce([]);

      const result = await listarConciliacao({
        estabelecimentoId: 1,
        porPagina: 50,
      });

      expect(result.totalPaginas).toBe(3); // ceil(105/50) = 3
    });

    it('deve aplicar filtro de guia em ambos os campos', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 1 }])
        .mockResolvedValueOnce([]);

      await listarConciliacao({
        estabelecimentoId: 1,
        guia: '12345',
      });

      const firstCall = mockExecute.mock.calls[0][0];
      const queryStr = firstCall._rawQuery || JSON.stringify(firstCall);
      expect(queryStr).toContain('guiaTasy');
      expect(queryStr).toContain('guiaDemo');
    });
  });

  describe('resumoConciliacaoPorGuia', () => {
    it('deve agrupar por guia', async () => {
      mockExecute.mockResolvedValueOnce([
        { guia: '001', totalItens: 5, itensConciliados: 3, totalFaturado: 1000 },
        { guia: '002', totalItens: 3, itensConciliados: 2, totalFaturado: 500 },
      ]);

      const result = await resumoConciliacaoPorGuia({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('guia');
      expect(result[0]).toHaveProperty('totalItens');
    });

    it('deve aplicar filtro de receberHospital', async () => {
      mockExecute.mockResolvedValueOnce([]);

      await resumoConciliacaoPorGuia({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
        receberHospital: 'S',
      });

      const call = mockExecute.mock.calls[0][0];
      expect(call._rawQuery || JSON.stringify(call)).toContain("receberHospital");
    });
  });

  describe('vincularCodigo', () => {
    it('deve retornar id existente se vinculação já existe', async () => {
      mockExecute.mockResolvedValueOnce([{ id: 42 }]); // existing check

      const result = await vincularCodigo({
        estabelecimentoId: 1,
        codigoHospital: 'PROC001',
        codigoConvenio: 'COD001',
      });

      expect(result).toEqual({ id: 42, created: false });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('deve criar nova vinculação se não existe', async () => {
      mockExecute
        .mockResolvedValueOnce([]) // existing check - empty
        .mockResolvedValueOnce(undefined) // insert
        .mockResolvedValueOnce([{ insertId: 99 }]); // LAST_INSERT_ID

      const result = await vincularCodigo({
        estabelecimentoId: 1,
        codigoHospital: 'PROC001',
        codigoConvenio: 'COD001',
        descricaoHospital: 'Procedimento 001',
        descricaoConvenio: 'Código 001',
        tipoItem: 'procedimento',
      });

      expect(result.created).toBe(true);
      expect(mockExecute).toHaveBeenCalledTimes(3);
    });

    it('deve incluir convenioId no check se fornecido', async () => {
      mockExecute.mockResolvedValueOnce([{ id: 10 }]);

      await vincularCodigo({
        estabelecimentoId: 1,
        convenioId: 5,
        codigoHospital: 'PROC001',
        codigoConvenio: 'COD001',
      });

      const call = mockExecute.mock.calls[0][0];
      expect(call._rawQuery || JSON.stringify(call)).toContain('convenioId');
    });
  });

  describe('listarVinculacoes', () => {
    it('deve listar vinculações ativas', async () => {
      mockExecute.mockResolvedValueOnce([
        { id: 1, codigoHospital: 'A', codigoConvenio: 'B' },
        { id: 2, codigoHospital: 'C', codigoConvenio: 'D' },
      ]);

      const result = await listarVinculacoes({
        estabelecimentoId: 1,
      });

      expect(result).toHaveLength(2);
      const call = mockExecute.mock.calls[0][0];
      expect(call._rawQuery || JSON.stringify(call)).toContain("ativo = 'sim'");
    });

    it('deve aplicar filtro de busca', async () => {
      mockExecute.mockResolvedValueOnce([]);

      await listarVinculacoes({
        estabelecimentoId: 1,
        busca: 'PROC',
      });

      const call = mockExecute.mock.calls[0][0];
      const queryStr = call._rawQuery || JSON.stringify(call);
      expect(queryStr).toContain('LIKE');
      expect(queryStr).toContain('PROC');
    });
  });

  describe('deletarVinculacao', () => {
    it('deve desativar vinculação (soft delete)', async () => {
      mockExecute.mockResolvedValueOnce(undefined);

      const result = await deletarVinculacao(42);

      expect(result).toEqual({ success: true });
      const call = mockExecute.mock.calls[0][0];
      const queryStr = call._rawQuery || JSON.stringify(call);
      expect(queryStr).toContain("ativo = 'nao'");
      expect(queryStr).toContain('42');
    });
  });

  describe('atualizarStatusConciliacao', () => {
    it('deve atualizar status', async () => {
      mockExecute.mockResolvedValueOnce(undefined);

      const result = await atualizarStatusConciliacao(10, 'conciliado');

      expect(result).toEqual({ success: true });
      const call = mockExecute.mock.calls[0][0];
      const queryStr = call._rawQuery || JSON.stringify(call);
      expect(queryStr).toContain('conciliado');
      expect(queryStr).toContain('10');
    });

    it('deve incluir observação se fornecida', async () => {
      mockExecute.mockResolvedValueOnce(undefined);

      await atualizarStatusConciliacao(10, 'divergencia_valor', 'Valor diferente');

      const call = mockExecute.mock.calls[0][0];
      const queryStr = call._rawQuery || JSON.stringify(call);
      expect(queryStr).toContain('observacao');
      expect(queryStr).toContain('Valor diferente');
    });
  });

  describe('itensPendentesVinculacao', () => {
    it('deve retornar itens faturados e demo sem match', async () => {
      mockExecute
        .mockResolvedValueOnce([{ id: 1, codigo: 'A', descricao: 'Item A' }])
        .mockResolvedValueOnce([{ id: 2, codigo: 'B', descricao: 'Item B' }]);

      const result = await itensPendentesVinculacao({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
        guia: '12345',
      });

      expect(result).toHaveProperty('faturadosSemMatch');
      expect(result).toHaveProperty('demoSemMatch');
      expect(result.faturadosSemMatch).toHaveLength(1);
      expect(result.demoSemMatch).toHaveLength(1);
    });

    it('deve filtrar por guia correta', async () => {
      mockExecute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await itensPendentesVinculacao({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
        guia: '99999',
      });

      const call1 = mockExecute.mock.calls[0][0];
      const call2 = mockExecute.mock.calls[1][0];
      expect(call1._rawQuery || JSON.stringify(call1)).toContain('99999');
      expect(call2._rawQuery || JSON.stringify(call2)).toContain('99999');
    });
  });

  describe('executarConciliacao', () => {
    it('deve processar conciliação com dados vazios', async () => {
      // DELETE
      mockExecute.mockResolvedValueOnce(undefined);
      // SELECT faturados
      mockExecute.mockResolvedValueOnce([]);
      // SELECT demo
      mockExecute.mockResolvedValueOnce([]);
      // SELECT vinculacoes
      mockExecute.mockResolvedValueOnce([]);
      // DELETE resumo
      mockExecute.mockResolvedValueOnce(undefined);
      // INSERT resumo
      mockExecute.mockResolvedValueOnce(undefined);

      const result = await executarConciliacao({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
        mesProducao: '2025/12',
      });

      expect(result).toHaveProperty('totalItensFaturados', 0);
      expect(result).toHaveProperty('totalItensDemo', 0);
      expect(result).toHaveProperty('itensConciliados', 0);
      expect(result).toHaveProperty('valorDiferenca', 0);
    });

    it('deve conciliar itens com match direto', async () => {
      // DELETE
      mockExecute.mockResolvedValueOnce(undefined);
      // SELECT faturados
      mockExecute.mockResolvedValueOnce([
        { guia: '001', codigo: 'PROC01', descricao: 'Proc 1', quantidade: 1, valorFaturado: 100, receberHospital: 'S', setor: 'UTI', prestador: 'Dr. X' },
      ]);
      // SELECT demo
      mockExecute.mockResolvedValueOnce([
        { guia: '001', codigo: 'PROC01', descricao: 'Proc 1', quantidade: 1, valorPago: 100, valorGlosa: 0, situacao: 'PAGO', erroTiss: null },
      ]);
      // SELECT vinculacoes
      mockExecute.mockResolvedValueOnce([]);
      // INSERT batch
      mockExecute.mockResolvedValueOnce(undefined);
      // DELETE resumo
      mockExecute.mockResolvedValueOnce(undefined);
      // INSERT resumo
      mockExecute.mockResolvedValueOnce(undefined);

      const result = await executarConciliacao({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
        mesProducao: '2025/12',
      });

      expect(result.totalItensFaturados).toBe(1);
      expect(result.totalItensDemo).toBe(1);
      expect(result.itensConciliados).toBe(1);
      expect(result.valorTotalPago).toBe(100);
    });

    it('deve separar itens N (terceiros) sem cruzar', async () => {
      // DELETE
      mockExecute.mockResolvedValueOnce(undefined);
      // SELECT faturados - item N
      mockExecute.mockResolvedValueOnce([
        { guia: '001', codigo: 'HON01', descricao: 'Honorário', quantidade: 1, valorFaturado: 500, receberHospital: 'N', setor: 'CC', prestador: 'Dr. Y' },
      ]);
      // SELECT demo
      mockExecute.mockResolvedValueOnce([]);
      // SELECT vinculacoes
      mockExecute.mockResolvedValueOnce([]);
      // INSERT batch
      mockExecute.mockResolvedValueOnce(undefined);
      // DELETE resumo
      mockExecute.mockResolvedValueOnce(undefined);
      // INSERT resumo
      mockExecute.mockResolvedValueOnce(undefined);

      const result = await executarConciliacao({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
        mesProducao: '2025/12',
      });

      expect(result.totalItensFaturados).toBe(1);
      expect(result.valorTotalFaturadoTerceiros).toBe(500);
      expect(result.valorTotalFaturadoHospital).toBe(0);
      // Item N não é conciliado com demo
      expect(result.itensConciliados).toBe(0);
    });

    it('deve identificar itens glosados', async () => {
      // DELETE
      mockExecute.mockResolvedValueOnce(undefined);
      // SELECT faturados
      mockExecute.mockResolvedValueOnce([
        { guia: '001', codigo: 'PROC01', descricao: 'Proc 1', quantidade: 1, valorFaturado: 200, receberHospital: 'S' },
      ]);
      // SELECT demo - item glosado
      mockExecute.mockResolvedValueOnce([
        { guia: '001', codigo: 'PROC01', descricao: 'Proc 1', quantidade: 1, valorPago: 0, valorGlosa: 200, situacao: 'GLOSADO', erroTiss: '488' },
      ]);
      // SELECT vinculacoes
      mockExecute.mockResolvedValueOnce([]);
      // INSERT batch
      mockExecute.mockResolvedValueOnce(undefined);
      // DELETE resumo
      mockExecute.mockResolvedValueOnce(undefined);
      // INSERT resumo
      mockExecute.mockResolvedValueOnce(undefined);

      const result = await executarConciliacao({
        estabelecimentoId: 1,
        arquivoDemoId: 100,
        mesProducao: '2025/12',
      });

      expect(result.itensGlosados).toBe(1);
      expect(result.valorTotalGlosa).toBe(200);
      expect(result.valorTotalPago).toBe(0);
    });
  });
});
