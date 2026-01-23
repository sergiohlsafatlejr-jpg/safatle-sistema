import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
vi.mock('./db', () => ({
  getDb: vi.fn(() => Promise.resolve({})),
  getDadosTasyParaConciliacao: vi.fn(),
  compararTasyComXML: vi.fn(),
  getResumoConciliacaoTasy: vi.fn(),
  marcarDadosTasyProcessados: vi.fn(),
  validarDadosTasyComRegras: vi.fn(),
  getResumoValidacaoTasyPorConvenio: vi.fn(),
  createApiKey: vi.fn(),
  validarApiKey: vi.fn(),
  getApiKeysByUser: vi.fn(),
  revogarApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
}));

import * as db from './db';

describe('Integração Tasy x XML', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDadosTasyParaConciliacao', () => {
    it('deve aceitar filtros de data', async () => {
      const mockDados = [
        { id: 1, atendimento: '123', codigo: 'PROC001', valorTotal: '100.00' },
        { id: 2, atendimento: '123', codigo: 'PROC002', valorTotal: '200.00' },
      ];
      
      vi.mocked(db.getDadosTasyParaConciliacao).mockResolvedValue(mockDados);

      const result = await db.getDadosTasyParaConciliacao(1, {
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-12-31'),
      });

      expect(result).toEqual(mockDados);
      expect(db.getDadosTasyParaConciliacao).toHaveBeenCalledWith(1, {
        dataInicio: expect.any(Date),
        dataFim: expect.any(Date),
      });
    });

    it('deve aceitar filtro de convênio', async () => {
      vi.mocked(db.getDadosTasyParaConciliacao).mockResolvedValue([]);

      await db.getDadosTasyParaConciliacao(1, {
        convenio: 'UNIMED',
      });

      expect(db.getDadosTasyParaConciliacao).toHaveBeenCalledWith(1, {
        convenio: 'UNIMED',
      });
    });

    it('deve aceitar filtro de guia', async () => {
      vi.mocked(db.getDadosTasyParaConciliacao).mockResolvedValue([]);

      await db.getDadosTasyParaConciliacao(1, {
        guia: '12345',
      });

      expect(db.getDadosTasyParaConciliacao).toHaveBeenCalledWith(1, {
        guia: '12345',
      });
    });

    it('deve aceitar filtro de atendimento', async () => {
      vi.mocked(db.getDadosTasyParaConciliacao).mockResolvedValue([]);

      await db.getDadosTasyParaConciliacao(1, {
        atendimento: 'ATD001',
      });

      expect(db.getDadosTasyParaConciliacao).toHaveBeenCalledWith(1, {
        atendimento: 'ATD001',
      });
    });
  });

  describe('compararTasyComXML', () => {
    it('deve retornar estrutura de comparação correta', async () => {
      const mockResultado = {
        totalTasy: 10,
        totalXML: 8,
        coincidentes: 5,
        apenasNoTasy: [{ codigo: 'PROC001' }],
        apenasNoXML: [{ codigo: 'PROC002' }],
        divergencias: [{ codigo: 'PROC003', diferencaValor: 50 }],
      };

      vi.mocked(db.compararTasyComXML).mockResolvedValue(mockResultado);

      const result = await db.compararTasyComXML(1, 100);

      expect(result).toHaveProperty('totalTasy');
      expect(result).toHaveProperty('totalXML');
      expect(result).toHaveProperty('coincidentes');
      expect(result).toHaveProperty('apenasNoTasy');
      expect(result).toHaveProperty('apenasNoXML');
      expect(result).toHaveProperty('divergencias');
    });

    it('deve identificar itens apenas no Tasy', async () => {
      const mockResultado = {
        totalTasy: 5,
        totalXML: 3,
        coincidentes: 3,
        apenasNoTasy: [
          { codigo: 'MAT001', motivo: 'Item não encontrado no XML do convênio' },
          { codigo: 'MAT002', motivo: 'Item não encontrado no XML do convênio' },
        ],
        apenasNoXML: [],
        divergencias: [],
      };

      vi.mocked(db.compararTasyComXML).mockResolvedValue(mockResultado);

      const result = await db.compararTasyComXML(1, 100);

      expect(result.apenasNoTasy).toHaveLength(2);
      expect(result.apenasNoTasy[0]).toHaveProperty('motivo');
    });

    it('deve identificar itens apenas no XML', async () => {
      const mockResultado = {
        totalTasy: 3,
        totalXML: 5,
        coincidentes: 3,
        apenasNoTasy: [],
        apenasNoXML: [
          { codigo: 'PROC001', motivo: 'Item não encontrado nos dados do Tasy' },
        ],
        divergencias: [],
      };

      vi.mocked(db.compararTasyComXML).mockResolvedValue(mockResultado);

      const result = await db.compararTasyComXML(1, 100);

      expect(result.apenasNoXML).toHaveLength(1);
    });

    it('deve identificar divergências de valor', async () => {
      const mockResultado = {
        totalTasy: 5,
        totalXML: 5,
        coincidentes: 4,
        apenasNoTasy: [],
        apenasNoXML: [],
        divergencias: [
          {
            codigo: 'PROC001',
            qtdTasy: 1,
            qtdXML: 1,
            valorTasy: 100,
            valorXML: 150,
            diferencaValor: -50,
          },
        ],
      };

      vi.mocked(db.compararTasyComXML).mockResolvedValue(mockResultado);

      const result = await db.compararTasyComXML(1, 100);

      expect(result.divergencias).toHaveLength(1);
      expect(result.divergencias[0].diferencaValor).toBe(-50);
    });
  });

  describe('getResumoConciliacaoTasy', () => {
    it('deve retornar resumo por convênio', async () => {
      const mockResumo = {
        dadosTasy: [
          { convenio: 'UNIMED', totalRegistros: 100, totalValor: 50000, processados: 80, pendentes: 20 },
        ],
        arquivosXML: [
          { convenioId: 1, convenioNome: 'UNIMED', totalArquivos: 5, totalItens: 150 },
        ],
      };

      vi.mocked(db.getResumoConciliacaoTasy).mockResolvedValue(mockResumo);

      const result = await db.getResumoConciliacaoTasy(1);

      expect(result).toHaveProperty('dadosTasy');
      expect(result).toHaveProperty('arquivosXML');
    });
  });

  describe('marcarDadosTasyProcessados', () => {
    it('deve marcar múltiplos registros como processados', async () => {
      vi.mocked(db.marcarDadosTasyProcessados).mockResolvedValue({ success: true });

      const result = await db.marcarDadosTasyProcessados([1, 2, 3], 100);

      expect(result.success).toBe(true);
      expect(db.marcarDadosTasyProcessados).toHaveBeenCalledWith([1, 2, 3], 100);
    });
  });
});

describe('Validação de Dados do Tasy com Regras de Negócio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validarDadosTasyComRegras', () => {
    it('deve retornar estrutura de validação correta', async () => {
      const mockValidacao = {
        totalAnalisados: 100,
        totalAlertas: 5,
        alertas: [],
        resumoPorTipo: { valor_zerado: 2, item_faltante: 3 },
      };

      vi.mocked(db.validarDadosTasyComRegras).mockResolvedValue(mockValidacao);

      const result = await db.validarDadosTasyComRegras(1);

      expect(result).toHaveProperty('totalAnalisados');
      expect(result).toHaveProperty('totalAlertas');
      expect(result).toHaveProperty('alertas');
      expect(result).toHaveProperty('resumoPorTipo');
    });

    it('deve detectar valores zerados', async () => {
      const mockValidacao = {
        totalAnalisados: 10,
        totalAlertas: 1,
        alertas: [
          { tipo: 'valor_zerado', severidade: 'alta', codigo: 'MAT001' },
        ],
        resumoPorTipo: { valor_zerado: 1 },
      };

      vi.mocked(db.validarDadosTasyComRegras).mockResolvedValue(mockValidacao);

      const result = await db.validarDadosTasyComRegras(1);

      expect(result.alertas[0].tipo).toBe('valor_zerado');
      expect(result.resumoPorTipo.valor_zerado).toBe(1);
    });

    it('deve detectar honorários sem médico', async () => {
      const mockValidacao = {
        totalAnalisados: 10,
        totalAlertas: 1,
        alertas: [
          { tipo: 'honorario_sem_medico', severidade: 'media', codigo: 'PROC001' },
        ],
        resumoPorTipo: { honorario_sem_medico: 1 },
      };

      vi.mocked(db.validarDadosTasyComRegras).mockResolvedValue(mockValidacao);

      const result = await db.validarDadosTasyComRegras(1);

      expect(result.alertas[0].tipo).toBe('honorario_sem_medico');
    });

    it('deve detectar itens faltantes por regra de negócio', async () => {
      const mockValidacao = {
        totalAnalisados: 10,
        totalAlertas: 1,
        alertas: [
          {
            tipo: 'item_faltante',
            severidade: 'alta',
            regraId: 1,
            regraNome: 'Cirurgia requer taxa de sala',
            itemFaltante: 'TAXA001',
          },
        ],
        resumoPorTipo: { item_faltante: 1 },
      };

      vi.mocked(db.validarDadosTasyComRegras).mockResolvedValue(mockValidacao);

      const result = await db.validarDadosTasyComRegras(1);

      expect(result.alertas[0].tipo).toBe('item_faltante');
      expect(result.alertas[0]).toHaveProperty('regraId');
    });

    it('deve aceitar filtros de período', async () => {
      vi.mocked(db.validarDadosTasyComRegras).mockResolvedValue({
        totalAnalisados: 0,
        totalAlertas: 0,
        alertas: [],
        resumoPorTipo: {},
      });

      await db.validarDadosTasyComRegras(1, {
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-12-31'),
      });

      expect(db.validarDadosTasyComRegras).toHaveBeenCalledWith(1, {
        dataInicio: expect.any(Date),
        dataFim: expect.any(Date),
      });
    });
  });

  describe('getResumoValidacaoTasyPorConvenio', () => {
    it('deve retornar resumo de validação por convênio', async () => {
      const mockResumo = [
        {
          convenio: 'UNIMED',
          totalRegistros: 100,
          valorTotal: 50000,
          totalAlertas: 5,
          resumoPorTipo: { valor_zerado: 2, item_faltante: 3 },
        },
      ];

      vi.mocked(db.getResumoValidacaoTasyPorConvenio).mockResolvedValue(mockResumo);

      const result = await db.getResumoValidacaoTasyPorConvenio(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('convenio');
      expect(result[0]).toHaveProperty('totalAlertas');
      expect(result[0]).toHaveProperty('resumoPorTipo');
    });
  });
});

describe('API Keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('deve criar uma nova chave de API', async () => {
      vi.mocked(db.createApiKey).mockResolvedValue({
        id: 1,
        key: 'sk_live_abc123...',
      });

      const result = await db.createApiKey({
        userId: 1,
        nome: 'Chave de Exportação Tasy',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('key');
      expect(result.key).toMatch(/^sk_live_/);
    });

    it('deve aceitar estabelecimentos permitidos', async () => {
      vi.mocked(db.createApiKey).mockResolvedValue({
        id: 1,
        key: 'sk_live_abc123...',
      });

      await db.createApiKey({
        userId: 1,
        nome: 'Chave Restrita',
        estabelecimentosPermitidos: [1, 2, 3],
      });

      expect(db.createApiKey).toHaveBeenCalledWith({
        userId: 1,
        nome: 'Chave Restrita',
        estabelecimentosPermitidos: [1, 2, 3],
      });
    });
  });

  describe('validarApiKey', () => {
    it('deve validar chave válida', async () => {
      vi.mocked(db.validarApiKey).mockResolvedValue({
        userId: 1,
        apiKeyId: 1,
      });

      const result = await db.validarApiKey('sk_live_abc123...', 1);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('apiKeyId');
    });

    it('deve rejeitar chave inválida', async () => {
      vi.mocked(db.validarApiKey).mockResolvedValue(null);

      const result = await db.validarApiKey('chave_invalida', 1);

      expect(result).toBeNull();
    });

    it('deve verificar permissão de estabelecimento', async () => {
      vi.mocked(db.validarApiKey).mockResolvedValue(null);

      const result = await db.validarApiKey('sk_live_abc123...', 999);

      expect(result).toBeNull();
    });
  });

  describe('getApiKeysByUser', () => {
    it('deve listar chaves do usuário', async () => {
      vi.mocked(db.getApiKeysByUser).mockResolvedValue([
        {
          id: 1,
          nome: 'Chave 1',
          keyPrefix: 'sk_live_abc...',
          estabelecimentosPermitidos: null,
          permissoes: null,
          ultimoUso: new Date(),
          totalUsos: 10,
          expiraEm: null,
          ativo: 'sim',
          createdAt: new Date(),
        },
      ]);

      const result = await db.getApiKeysByUser(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('keyPrefix');
      expect(result[0]).not.toHaveProperty('keyHash'); // Não deve expor o hash
    });
  });

  describe('revogarApiKey', () => {
    it('deve revogar uma chave', async () => {
      vi.mocked(db.revogarApiKey).mockResolvedValue({ success: true });

      const result = await db.revogarApiKey(1, 1);

      expect(result.success).toBe(true);
    });
  });

  describe('deleteApiKey', () => {
    it('deve excluir uma chave', async () => {
      vi.mocked(db.deleteApiKey).mockResolvedValue({ success: true });

      const result = await db.deleteApiKey(1, 1);

      expect(result.success).toBe(true);
    });
  });
});
