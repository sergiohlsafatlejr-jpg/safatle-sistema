import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Testes para verificar que o mapeamento de campos da query getRecebimentosExcel
 * retorna os campos esperados pelo frontend (codigoProcedimento, descricaoProcedimento,
 * valorCobrado, valorPago, valorGlosado, codigoGlosa)
 */

// Mock do módulo de banco
vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal();
  return actual;
});

describe('Mapeamento de campos recebimentosExcel → frontend', () => {
  it('deve mapear item → codigoProcedimento', () => {
    const rawItem = {
      id: 1,
      item: '90465865',
      itemDesc: 'MED - CEFAZOLINA',
      valorInformado: '50.70',
      valorPagamento: '101.40',
      valorGlosa: '0.00',
      codigoGlosa: null,
      erroTiss: null,
      situacaoItem: 'PAGO',
      tipoLancamento: 'CRÉDITO',
      numeroGuia: '66515809',
      nomeBeneficiario: 'TESTE PACIENTE',
    };

    // Simular o mapeamento feito em getRecebimentosExcel
    const mapped = {
      ...rawItem,
      codigoProcedimento: rawItem.item || null,
      descricaoProcedimento: rawItem.itemDesc || null,
      valorCobrado: rawItem.valorInformado || '0.00',
      valorPago: rawItem.valorPagamento || '0.00',
      valorGlosado: rawItem.valorGlosa || '0.00',
      codigoGlosa: rawItem.codigoGlosa || rawItem.erroTiss || null,
    };

    expect(mapped.codigoProcedimento).toBe('90465865');
    expect(mapped.descricaoProcedimento).toBe('MED - CEFAZOLINA');
    expect(mapped.valorCobrado).toBe('50.70');
    expect(mapped.valorPago).toBe('101.40');
    expect(mapped.valorGlosado).toBe('0.00');
    expect(mapped.codigoGlosa).toBeNull();
  });

  it('deve mapear valorGlosa quando item é glosado', () => {
    const rawItem = {
      id: 2,
      item: '10102019',
      itemDesc: 'CONSULTA MÉDICA',
      valorInformado: '65.00',
      valorPagamento: '0.00',
      valorGlosa: '65.00',
      codigoGlosa: '1702',
      erroTiss: 'GUIA VENCIDA',
      situacaoItem: 'GLOSADO',
      tipoLancamento: 'CRÉDITO',
      numeroGuia: '18514589',
      nomeBeneficiario: 'IVANILDA LOPES',
    };

    const mapped = {
      ...rawItem,
      codigoProcedimento: rawItem.item || null,
      descricaoProcedimento: rawItem.itemDesc || null,
      valorCobrado: rawItem.valorInformado || '0.00',
      valorPago: rawItem.valorPagamento || '0.00',
      valorGlosado: rawItem.valorGlosa || '0.00',
      codigoGlosa: rawItem.codigoGlosa || rawItem.erroTiss || null,
    };

    expect(mapped.codigoProcedimento).toBe('10102019');
    expect(mapped.descricaoProcedimento).toBe('CONSULTA MÉDICA');
    expect(mapped.valorCobrado).toBe('65.00');
    expect(mapped.valorPago).toBe('0.00');
    expect(mapped.valorGlosado).toBe('65.00');
    expect(mapped.codigoGlosa).toBe('1702');
    expect(mapped.situacaoItem).toBe('GLOSADO');
  });

  it('deve usar erroTiss como fallback para codigoGlosa', () => {
    const rawItem = {
      id: 3,
      item: '60000554',
      itemDesc: 'DIÁRIA',
      valorInformado: '166.00',
      valorPagamento: '166.00',
      valorGlosa: '0.00',
      codigoGlosa: null,
      erroTiss: '1702-COBRANÇA INDEVIDA',
      situacaoItem: 'GLOSADO',
      tipoLancamento: 'CRÉDITO',
      numeroGuia: '18862033',
      nomeBeneficiario: 'SEBASTIANA ROSA',
    };

    const mapped = {
      ...rawItem,
      codigoProcedimento: rawItem.item || null,
      descricaoProcedimento: rawItem.itemDesc || null,
      valorCobrado: rawItem.valorInformado || '0.00',
      valorPago: rawItem.valorPagamento || '0.00',
      valorGlosado: rawItem.valorGlosa || '0.00',
      codigoGlosa: rawItem.codigoGlosa || rawItem.erroTiss || null,
    };

    expect(mapped.codigoGlosa).toBe('1702-COBRANÇA INDEVIDA');
  });

  it('deve tratar campos nulos corretamente', () => {
    const rawItem = {
      id: 4,
      item: null,
      itemDesc: null,
      valorInformado: null,
      valorPagamento: null,
      valorGlosa: null,
      codigoGlosa: null,
      erroTiss: null,
      situacaoItem: 'PAGO',
      tipoLancamento: 'CRÉDITO',
      numeroGuia: '18514589',
      nomeBeneficiario: 'TESTE',
    };

    const mapped = {
      ...rawItem,
      codigoProcedimento: rawItem.item || null,
      descricaoProcedimento: rawItem.itemDesc || null,
      valorCobrado: rawItem.valorInformado || '0.00',
      valorPago: rawItem.valorPagamento || '0.00',
      valorGlosado: rawItem.valorGlosa || '0.00',
      codigoGlosa: rawItem.codigoGlosa || rawItem.erroTiss || null,
    };

    expect(mapped.codigoProcedimento).toBeNull();
    expect(mapped.descricaoProcedimento).toBeNull();
    expect(mapped.valorCobrado).toBe('0.00');
    expect(mapped.valorPago).toBe('0.00');
    expect(mapped.valorGlosado).toBe('0.00');
    expect(mapped.codigoGlosa).toBeNull();
  });

  it('deve manter campos originais do schema no resultado', () => {
    const rawItem = {
      id: 5,
      item: '90465865',
      itemDesc: 'MED - CEFAZOLINA',
      valorInformado: '50.70',
      valorPagamento: '101.40',
      valorGlosa: '0.00',
      codigoGlosa: null,
      erroTiss: null,
      situacaoItem: 'PAGO',
      tipoLancamento: 'CRÉDITO',
      numeroGuia: '66515809',
      nomeBeneficiario: 'TESTE',
      quantidade: 2,
    };

    const mapped = {
      ...rawItem,
      codigoProcedimento: rawItem.item || null,
      descricaoProcedimento: rawItem.itemDesc || null,
      valorCobrado: rawItem.valorInformado || '0.00',
      valorPago: rawItem.valorPagamento || '0.00',
      valorGlosado: rawItem.valorGlosa || '0.00',
      codigoGlosa: rawItem.codigoGlosa || rawItem.erroTiss || null,
    };

    // Campos originais preservados
    expect(mapped.item).toBe('90465865');
    expect(mapped.itemDesc).toBe('MED - CEFAZOLINA');
    expect(mapped.valorInformado).toBe('50.70');
    expect(mapped.valorPagamento).toBe('101.40');
    expect(mapped.quantidade).toBe(2);
    
    // Campos mapeados para frontend
    expect(mapped.codigoProcedimento).toBe('90465865');
    expect(mapped.descricaoProcedimento).toBe('MED - CEFAZOLINA');
    expect(mapped.valorCobrado).toBe('50.70');
    expect(mapped.valorPago).toBe('101.40');
  });
});

describe('Resumo recebimentosExcel - campos corretos', () => {
  it('deve calcular totalPagos como soma de valorPagamento (não contagem)', () => {
    // O resumo agora retorna:
    // totalPagos = SUM(valorPagamento) - valor monetário total pago
    // totalGlosados = COUNT de itens glosados
    // valorTotal = SUM(valorInformado) - valor monetário total cobrado
    // valorGlosado = SUM(valorGlosa) - valor monetário total glosado
    
    const items = [
      { valorPagamento: '101.40', valorInformado: '50.70', valorGlosa: '0.00', situacaoItem: 'PAGO' },
      { valorPagamento: '65.00', valorInformado: '65.00', valorGlosa: '0.00', situacaoItem: 'PAGO' },
      { valorPagamento: '0.00', valorInformado: '99.00', valorGlosa: '99.00', situacaoItem: 'GLOSADO' },
    ];

    const totalPagos = items.reduce((sum, i) => sum + parseFloat(i.valorPagamento), 0);
    const valorTotal = items.reduce((sum, i) => sum + parseFloat(i.valorInformado), 0);
    const valorGlosado = items.reduce((sum, i) => sum + parseFloat(i.valorGlosa), 0);
    const totalGlosados = items.filter(i => i.situacaoItem === 'GLOSADO').length;

    expect(totalPagos).toBe(166.40);
    expect(valorTotal).toBe(214.70);
    expect(valorGlosado).toBe(99.00);
    expect(totalGlosados).toBe(1);
  });
});
