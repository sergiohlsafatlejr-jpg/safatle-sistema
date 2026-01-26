import { describe, it, expect } from 'vitest';

/**
 * Testes para o filtro de prestador vinculado ao estabelecimento no Relatório BI
 */

describe('Filtro de Prestador Vinculado ao Estabelecimento', () => {
  // Simula a lógica de filtragem de procedimentos por prestador
  const filtrarProcedimentoPorPrestador = (
    proc: { codigoPrestadorExecutante?: string },
    prestadoresVinculados: string[]
  ): boolean => {
    // Se há prestadores vinculados e o procedimento tem código de prestador
    if (prestadoresVinculados.length > 0 && proc.codigoPrestadorExecutante) {
      return prestadoresVinculados.includes(proc.codigoPrestadorExecutante);
    }
    // Se não há prestadores vinculados, aceita todos
    return true;
  };

  it('deve aceitar procedimento quando prestador está na lista de vinculados', () => {
    const proc = { codigoPrestadorExecutante: '1100242' };
    const prestadoresVinculados = ['1100242', '1101060'];
    
    expect(filtrarProcedimentoPorPrestador(proc, prestadoresVinculados)).toBe(true);
  });

  it('deve rejeitar procedimento quando prestador não está na lista de vinculados', () => {
    const proc = { codigoPrestadorExecutante: '9999999' };
    const prestadoresVinculados = ['1100242', '1101060'];
    
    expect(filtrarProcedimentoPorPrestador(proc, prestadoresVinculados)).toBe(false);
  });

  it('deve aceitar todos os procedimentos quando não há prestadores vinculados', () => {
    const proc = { codigoPrestadorExecutante: '9999999' };
    const prestadoresVinculados: string[] = [];
    
    expect(filtrarProcedimentoPorPrestador(proc, prestadoresVinculados)).toBe(true);
  });

  it('deve aceitar procedimento sem código de prestador quando há prestadores vinculados', () => {
    const proc = { codigoPrestadorExecutante: undefined };
    const prestadoresVinculados = ['1100242', '1101060'];
    
    expect(filtrarProcedimentoPorPrestador(proc, prestadoresVinculados)).toBe(true);
  });

  it('deve filtrar corretamente múltiplos procedimentos', () => {
    const procedimentos = [
      { codigoPrestadorExecutante: '1100242', descricao: 'Item 1' },
      { codigoPrestadorExecutante: '1101060', descricao: 'Item 2' },
      { codigoPrestadorExecutante: '9999999', descricao: 'Item 3' },
      { codigoPrestadorExecutante: undefined, descricao: 'Item 4' },
    ];
    const prestadoresVinculados = ['1100242', '1101060'];
    
    const filtrados = procedimentos.filter(p => 
      filtrarProcedimentoPorPrestador(p, prestadoresVinculados)
    );
    
    // Deve incluir Item 1, Item 2 e Item 4 (sem código)
    expect(filtrados.length).toBe(3);
    expect(filtrados.map(p => p.descricao)).toEqual(['Item 1', 'Item 2', 'Item 4']);
  });
});

describe('Agrupamento por Descrição do Item', () => {
  // Simula a lógica de agrupamento por descrição (combina enviados e retornados)
  const agruparPorDescricao = (
    procedimentosEnviados: Array<{ descricao?: string; valorTotal?: string; }>,
    procedimentosRetornados: Array<{ descricao?: string; valorTotal?: string; valorGlosado?: string; }>
  ) => {
    const mapa = new Map<string, {
      chave: string;
      valorFaturado: number;
      valorRecebido: number;
      valorGlosado: number;
      registros: number;
    }>();

    // Primeiro, adicionar dados dos enviados (faturados)
    for (const proc of procedimentosEnviados) {
      const chave = proc.descricao || 'Sem Descrição';
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          valorFaturado: 0,
          valorRecebido: 0,
          valorGlosado: 0,
          registros: 0,
        });
      }
      const item = mapa.get(chave)!;
      item.valorFaturado += parseFloat(proc.valorTotal || '0');
      item.registros++;
    }

    // Depois, adicionar dados dos retornados (demonstrativo)
    for (const proc of procedimentosRetornados) {
      const chave = proc.descricao || 'Sem Descrição';
      if (!mapa.has(chave)) {
        // Criar novo item para descrições que só existem no demonstrativo
        mapa.set(chave, {
          chave,
          valorFaturado: 0,
          valorRecebido: 0,
          valorGlosado: 0,
          registros: 0,
        });
      }
      const item = mapa.get(chave)!;
      const valorTotal = parseFloat(proc.valorTotal || '0');
      const valorGlosado = parseFloat(proc.valorGlosado || '0');
      // Se não tem valor faturado, usar o valor total do demonstrativo
      if (item.valorFaturado === 0) {
        item.valorFaturado = valorTotal;
      }
      item.valorRecebido += valorTotal - valorGlosado;
      item.valorGlosado += valorGlosado;
      if (item.registros === 0) {
        item.registros++;
      }
    }

    return Array.from(mapa.values());
  };

  it('deve agrupar procedimentos por descrição corretamente quando há dados enviados e retornados', () => {
    const enviados = [
      { descricao: 'Medicamento A', valorTotal: '100.00' },
      { descricao: 'Medicamento A', valorTotal: '50.00' },
    ];
    const retornados = [
      { descricao: 'Medicamento A', valorTotal: '150.00', valorGlosado: '15.00' },
    ];

    const agrupados = agruparPorDescricao(enviados, retornados);
    
    expect(agrupados.length).toBe(1);
    
    const medA = agrupados.find(a => a.chave === 'Medicamento A');
    expect(medA).toBeDefined();
    expect(medA?.valorFaturado).toBe(150); // Soma dos enviados
    expect(medA?.valorGlosado).toBe(15);
    expect(medA?.valorRecebido).toBe(135); // 150 - 15
    expect(medA?.registros).toBe(2);
  });

  it('deve criar itens para descrições que só existem no demonstrativo', () => {
    const enviados: Array<{ descricao?: string; valorTotal?: string; }> = [];
    const retornados = [
      { descricao: 'Material B', valorTotal: '200.00', valorGlosado: '20.00' },
      { descricao: 'Material C', valorTotal: '100.00', valorGlosado: '0.00' },
    ];

    const agrupados = agruparPorDescricao(enviados, retornados);
    
    expect(agrupados.length).toBe(2);
    
    const matB = agrupados.find(a => a.chave === 'Material B');
    expect(matB).toBeDefined();
    expect(matB?.valorFaturado).toBe(200); // Usa valor do demonstrativo como referência
    expect(matB?.valorGlosado).toBe(20);
    expect(matB?.valorRecebido).toBe(180);
    
    const matC = agrupados.find(a => a.chave === 'Material C');
    expect(matC).toBeDefined();
    expect(matC?.valorFaturado).toBe(100);
    expect(matC?.valorGlosado).toBe(0);
    expect(matC?.valorRecebido).toBe(100);
  });

  it('deve tratar procedimentos sem descrição', () => {
    const enviados = [
      { descricao: undefined, valorTotal: '100.00' },
    ];
    const retornados = [
      { descricao: '', valorTotal: '100.00', valorGlosado: '0.00' },
    ];

    const agrupados = agruparPorDescricao(enviados, retornados);
    
    // Ambos devem ir para "Sem Descrição"
    expect(agrupados.length).toBe(1);
    expect(agrupados[0].chave).toBe('Sem Descrição');
    expect(agrupados[0].valorFaturado).toBe(100);
    expect(agrupados[0].valorRecebido).toBe(100);
  });
});
