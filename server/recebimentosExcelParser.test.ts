import { describe, it, expect } from 'vitest';
import { extractRecebimentoExcelFromRow } from './recebimentosExcelParser';

describe('recebimentosExcelParser - Detecção de Glosas', () => {
  const defaultArgs = {
    arquivoId: 1,
    convenioId: 1,
    dataReferencia: new Date('2025-12-01'),
    dataPagamento: new Date('2026-01-30'),
    estabelecimentoId: 100,
  };

  describe('Formato Unimed - Glosas via Erro TISS', () => {
    it('deve marcar como GLOSADO quando Erro TISS está preenchido e Situação Item = PAGO', () => {
      const row = {
        'Número Guia': '62185116',
        'Seq': 20,
        'Beneficiário': '0064.8000.408679.67.4',
        'Nome Beneficiário': 'ADAILTON A DOS SANTOS',
        'Item': '60023112',
        'Item Desc': 'Taxa De Sala Cirúrgica, Porte Anestésico 2',
        'Valor Pagamento': '26.86',
        'Situação Item': 'PAGO',
        'Erro TISS': '1813-COBRANÇA DE PROCEDIMENTO SEM JUSTIFICATIVA PARA REALIZAÇÃO OU COM JUSTIFICATIVA INSUFICIENTE.',
        'Tipo Lançamento': 'HOS',
      };

      const record = extractRecebimentoExcelFromRow(
        row,
        defaultArgs.arquivoId,
        defaultArgs.convenioId,
        defaultArgs.dataReferencia,
        defaultArgs.dataPagamento,
        defaultArgs.estabelecimentoId
      );

      expect(record.situacaoItem).toBe('GLOSADO');
      expect(record.codigoGlosa).toBe('1813');
      expect(record.erroTiss).toContain('1813');
      // Valor pagamento mantido (é o valor pago pelo convênio)
      expect(record.valorPagamento).toBe('26.86');
    });

    it('deve marcar como GLOSADO quando Erro TISS preenchido e valor pagamento = 0', () => {
      const row = {
        'Número Guia': '62185117',
        'Item': '90303164',
        'Item Desc': 'Agua Para Injecao Sol. Inj. 10 Ml (Amp)',
        'Valor Pagamento': '0',
        'Situação Item': 'PAGO',
        'Erro TISS': '1713-FATURAMENTO INVÁLIDO',
      };

      const record = extractRecebimentoExcelFromRow(
        row,
        defaultArgs.arquivoId,
        defaultArgs.convenioId,
        defaultArgs.dataReferencia,
        defaultArgs.dataPagamento,
        defaultArgs.estabelecimentoId
      );

      expect(record.situacaoItem).toBe('GLOSADO');
      expect(record.codigoGlosa).toBe('1713');
    });

    it('deve extrair código de glosa de diferentes formatos de Erro TISS', () => {
      const testCases = [
        { erroTiss: '1702-COBRANÇA DE PROCEDIMENTO EM DUPLICIDADE', expected: '1702' },
        { erroTiss: '1812-COBRANÇA DE PROCEDIMENTO NÃO CORRELACIONADO', expected: '1812' },
        { erroTiss: '2008-COBRANÇA DE MATERIAL EM QUANTIDADES INCOMPATÍVEIS', expected: '2008' },
        { erroTiss: '2010-COBRANÇA DE MATERIAIS INCLUSOS NAS TAXAS', expected: '2010' },
        { erroTiss: '2401-TAXA / ALUGUEL INVÁLIDO', expected: '2401' },
      ];

      for (const tc of testCases) {
        const row = {
          'Número Guia': '12345',
          'Item': '99999',
          'Valor Pagamento': '10.00',
          'Situação Item': 'PAGO',
          'Erro TISS': tc.erroTiss,
        };

        const record = extractRecebimentoExcelFromRow(
          row,
          defaultArgs.arquivoId,
          defaultArgs.convenioId,
          defaultArgs.dataReferencia,
          defaultArgs.dataPagamento,
          defaultArgs.estabelecimentoId
        );

        expect(record.codigoGlosa).toBe(tc.expected);
        expect(record.situacaoItem).toBe('GLOSADO');
      }
    });

    it('deve manter PAGO quando não há Erro TISS', () => {
      const row = {
        'Número Guia': '62185118',
        'Item': '41301358',
        'Item Desc': 'Urofluxometria',
        'Valor Pagamento': '60.00',
        'Situação Item': 'PAGO',
      };

      const record = extractRecebimentoExcelFromRow(
        row,
        defaultArgs.arquivoId,
        defaultArgs.convenioId,
        defaultArgs.dataReferencia,
        defaultArgs.dataPagamento,
        defaultArgs.estabelecimentoId
      );

      expect(record.situacaoItem).toBe('PAGO');
      expect(record.codigoGlosa).toBeUndefined();
    });
  });

  describe('Formato Vivacom - Glosas via Valor Glosa', () => {
    it('deve marcar como GLOSADO quando VALOR GLOSA > 0 e situação não preenchida', () => {
      const row = {
        'GUIA': '99999',
        'CODIGO': '12345',
        'PROCEDIMENTO': 'Teste Vivacom',
        'VALOR PAGO': '0',
        'VALOR GLOSA': '50.00',
        'VALOR INFORMADO': '50.00',
      };

      const record = extractRecebimentoExcelFromRow(
        row,
        defaultArgs.arquivoId,
        defaultArgs.convenioId,
        defaultArgs.dataReferencia,
        defaultArgs.dataPagamento,
        defaultArgs.estabelecimentoId
      );

      expect(record.situacaoItem).toBe('GLOSADO');
      expect(record.valorGlosa).toBe('50');
    });
  });

  describe('Formato GEAP - Glosas via Existe Glosa', () => {
    it('deve marcar como GLOSADO quando Existe Glosa = true', () => {
      const row = {
        'Nº Guia': '88888',
        'Nº Serviço': '54321',
        'Serviço': 'Teste GEAP',
        'Valor Calculado Item': '100.00',
        'Existe Glosa': true,
        'Valor Glosado Item': '100.00',
        'Justificativa': '1702',
      };

      const record = extractRecebimentoExcelFromRow(
        row,
        defaultArgs.arquivoId,
        defaultArgs.convenioId,
        defaultArgs.dataReferencia,
        defaultArgs.dataPagamento,
        defaultArgs.estabelecimentoId
      );

      expect(record.situacaoItem).toBe('GLOSADO');
    });
  });
});
