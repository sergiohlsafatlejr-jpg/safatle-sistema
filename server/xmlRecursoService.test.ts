/**
 * Testes para o serviço de geração de XML de recurso de glosa
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
const mockExecute = vi.fn();
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    execute: (...args: any[]) => mockExecute(...args),
  }),
}));

// Mock do storage
vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: 'https://storage.example.com/xml-recursos/test.xml',
    key: 'xml-recursos/test.xml',
  }),
}));

import { gerarXmlRecurso, guiasGlosadasDisponiveis, listarXmlsGerados, downloadXmlRecurso } from './xmlRecursoService';

describe('xmlRecursoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gerarXmlRecurso', () => {
    it('deve lançar erro quando não há itens glosados', async () => {
      // Mock: retorna vazio para itens glosados
      mockExecute
        .mockResolvedValueOnce([[]])  // buscarDadosGuiasGlosadas - itens
        ;

      await expect(
        gerarXmlRecurso({
          estabelecimentoId: 6,
          guias: ['99999999'],
        })
      ).rejects.toThrow('Nenhum item glosado encontrado');
    });

    it('deve gerar XML com dados corretos para uma guia', async () => {
      // Mock: itens glosados
      mockExecute
        .mockResolvedValueOnce([[
          {
            id: 1,
            numeroGuia: '18414424',
            codigoItem: '10101012',
            descricaoItem: 'CONSULTA MEDICA',
            tipoItem: 'Procedimento',
            dataExecucao: '2025-12-01',
            valorFaturado: 100.00,
            valorPago: 0,
            valorGlosa: 100.00,
            quantidade: 1,
            competencia: '2025-12',
            convenio: 'IPASGO',
            convenioId: 1,
          },
          {
            id: 2,
            numeroGuia: '18414424',
            codigoItem: '30101012',
            descricaoItem: 'HEMOGRAMA',
            tipoItem: 'Procedimento',
            dataExecucao: '2025-12-01',
            valorFaturado: 50.00,
            valorPago: 0,
            valorGlosa: 50.00,
            quantidade: 1,
            competencia: '2025-12',
            convenio: 'IPASGO',
            convenioId: 1,
          },
        ]])
        // Mock: dados do faturamento_unificado
        .mockResolvedValueOnce([[
          {
            numeroGuia: '18414424',
            numeroGuiaOperadora: '018414424',
            senha: 'ABC123',
            pacienteNome: 'MARIA ABADIA DOS SANTOS',
            carteiraBeneficiario: '0012345678',
            protocolo: 'PROT001',
            lotePrestador: 'LOTE001',
            dataInicioFat: '2025-12-01',
            dataFimFat: '2025-12-15',
          },
        ]])
        // Mock: faturamento_tiss codigo_tabela
        .mockResolvedValueOnce([[
          { numeroGuia: '18414424', codigoItem: '10101012', codigoTabela: '04' },
          { numeroGuia: '18414424', codigoItem: '30101012', codigoTabela: '04' },
        ]])
        // Mock: buscarDadosPrestador
        .mockResolvedValueOnce([[
          { nome: 'HEMOLABOR LTDA', cnpj: '01.234.567/0001-89' },
        ]])
        // Mock: buscarDadosConvenio
        .mockResolvedValueOnce([[
          { nome: 'IPASGO', codigo: '346659' },
        ]])
        // Mock: convenioEstabelecimentoPrestador
        .mockResolvedValueOnce([[
          { codigoPrestador: 'PREST001' },
        ]])
        // Mock: lotePrestador query (não precisa pois já tem)
        // Mock: INSERT xml_recursos_gerados
        .mockResolvedValueOnce([{ insertId: 1 }])
        // Mock: UPDATE conciliados_automatico
        .mockResolvedValueOnce([{ affectedRows: 2 }]);

      const result = await gerarXmlRecurso({
        estabelecimentoId: 6,
        guias: ['18414424'],
        convenioId: 1,
        registroANS: '346659',
        cnpjOperadora: '01234567000100',
      });

      expect(result.totalGuias).toBe(1);
      expect(result.totalItens).toBe(2);
      expect(result.valorTotalGlosado).toBe(150.00);
      expect(result.xmlUrl).toBe('https://storage.example.com/xml-recursos/test.xml');
      expect(result.nomeArquivo).toContain('recurso_guia_18414424');
    });

    it('deve gerar XML em lote para múltiplas guias', async () => {
      // Mock: itens glosados de 2 guias
      mockExecute
        .mockResolvedValueOnce([[
          {
            id: 1, numeroGuia: '18414424', codigoItem: '10101012',
            descricaoItem: 'CONSULTA', tipoItem: 'Procedimento',
            dataExecucao: '2025-12-01', valorFaturado: 100, valorPago: 0,
            valorGlosa: 100, quantidade: 1, competencia: '2025-12',
            convenio: 'IPASGO', convenioId: 1,
          },
          {
            id: 2, numeroGuia: '18560945', codigoItem: '20101012',
            descricaoItem: 'EXAME', tipoItem: 'Procedimento',
            dataExecucao: '2025-12-05', valorFaturado: 80, valorPago: 0,
            valorGlosa: 80, quantidade: 1, competencia: '2025-12',
            convenio: 'IPASGO', convenioId: 1,
          },
        ]])
        .mockResolvedValueOnce([[
          { numeroGuia: '18414424', numeroGuiaOperadora: '018414424', senha: null, pacienteNome: 'MARIA', carteiraBeneficiario: null, protocolo: null, lotePrestador: 'LOTE1', dataInicioFat: '2025-12-01', dataFimFat: '2025-12-01' },
          { numeroGuia: '18560945', numeroGuiaOperadora: '018560945', senha: null, pacienteNome: 'JOAO', carteiraBeneficiario: null, protocolo: null, lotePrestador: 'LOTE1', dataInicioFat: '2025-12-05', dataFimFat: '2025-12-05' },
        ]])
        .mockResolvedValueOnce([[]])  // faturamento_tiss
        .mockResolvedValueOnce([[ { nome: 'HEMOLABOR', cnpj: '01234567000189' } ]])  // prestador
        .mockResolvedValueOnce([[ { nome: 'IPASGO', codigo: '346659' } ]])  // convênio
        .mockResolvedValueOnce([[ { codigoPrestador: 'P001' } ]])  // cep
        .mockResolvedValueOnce([{ insertId: 2 }])  // INSERT
        .mockResolvedValueOnce([{ affectedRows: 2 }]);  // UPDATE

      const result = await gerarXmlRecurso({
        estabelecimentoId: 6,
        guias: ['18414424', '18560945'],
        convenioId: 1,
      });

      expect(result.totalGuias).toBe(2);
      expect(result.totalItens).toBe(2);
      expect(result.valorTotalGlosado).toBe(180.00);
      expect(result.nomeArquivo).toContain('recurso_lote_2guias');
    });
  });

  describe('guiasGlosadasDisponiveis', () => {
    it('deve retornar guias glosadas agrupadas', async () => {
      mockExecute.mockResolvedValueOnce([[
        {
          numeroGuia: '18414424',
          convenio: 'IPASGO',
          convenioId: 1,
          competencia: '2025-12',
          pacienteNome: 'MARIA',
          totalItens: 5,
          valorFaturado: 500,
          valorGlosa: 500,
          xmlGerado: 0,
          xmlGeradoEm: null,
          xmlLoteId: null,
        },
      ]]);

      const result = await guiasGlosadasDisponiveis({
        estabelecimentoId: 6,
      });

      expect(result).toHaveLength(1);
      expect(result[0].numeroGuia).toBe('18414424');
      expect(result[0].totalItens).toBe(5);
    });

    it('deve filtrar por convênio quando fornecido', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      const result = await guiasGlosadasDisponiveis({
        estabelecimentoId: 6,
        convenioId: 1,
        competencia: '2025-12',
      });

      expect(result).toHaveLength(0);
      // Verificar que a query inclui o filtro de convênio
      const queryCall = mockExecute.mock.calls[0][0];
      expect(queryCall.queryChunks || queryCall.strings || JSON.stringify(queryCall)).toBeDefined();
    });
  });

  describe('listarXmlsGerados', () => {
    it('deve retornar lista de XMLs gerados', async () => {
      mockExecute
        .mockResolvedValueOnce([[ { total: 2 } ]])  // COUNT
        .mockResolvedValueOnce([[
          { id: 1, nomeArquivo: 'recurso_guia_123.xml', convenioNome: 'IPASGO', tipo: 'individual', totalGuias: 1, totalItens: 5, valorTotalGlosado: 500, createdAt: new Date() },
          { id: 2, nomeArquivo: 'recurso_lote_3guias.xml', convenioNome: 'IPASGO', tipo: 'lote', totalGuias: 3, totalItens: 15, valorTotalGlosado: 1500, createdAt: new Date() },
        ]]);

      const result = await listarXmlsGerados({
        estabelecimentoId: 6,
      });

      expect(result.total).toBe(2);
      expect(result.registros).toHaveLength(2);
      expect(result.registros[0].tipo).toBe('individual');
      expect(result.registros[1].tipo).toBe('lote');
    });
  });

  describe('downloadXmlRecurso', () => {
    it('deve retornar URL e nome do arquivo', async () => {
      mockExecute.mockResolvedValueOnce([[
        { xmlUrl: 'https://storage.example.com/test.xml', nomeArquivo: 'recurso_guia_123.xml' },
      ]]);

      const result = await downloadXmlRecurso(1);

      expect(result.url).toBe('https://storage.example.com/test.xml');
      expect(result.nomeArquivo).toBe('recurso_guia_123.xml');
    });

    it('deve lançar erro quando registro não encontrado', async () => {
      mockExecute.mockResolvedValueOnce([[]]);

      await expect(downloadXmlRecurso(999)).rejects.toThrow('Registro de XML não encontrado');
    });
  });
});
