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
  // Simula a lógica de agrupamento por descrição
  const agruparPorDescricao = (procedimentos: Array<{
    descricao?: string;
    valorTotal?: string;
    valorGlosado?: string;
  }>) => {
    const mapa = new Map<string, {
      chave: string;
      valorFaturado: number;
      valorRecebido: number;
      valorGlosado: number;
      registros: number;
    }>();

    for (const proc of procedimentos) {
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
      item.valorGlosado += parseFloat(proc.valorGlosado || '0');
      item.valorRecebido += parseFloat(proc.valorTotal || '0') - parseFloat(proc.valorGlosado || '0');
      item.registros++;
    }

    return Array.from(mapa.values());
  };

  it('deve agrupar procedimentos por descrição corretamente', () => {
    const procedimentos = [
      { descricao: 'Medicamento A', valorTotal: '100.00', valorGlosado: '10.00' },
      { descricao: 'Medicamento A', valorTotal: '50.00', valorGlosado: '5.00' },
      { descricao: 'Material B', valorTotal: '200.00', valorGlosado: '0.00' },
    ];

    const agrupados = agruparPorDescricao(procedimentos);
    
    expect(agrupados.length).toBe(2);
    
    const medA = agrupados.find(a => a.chave === 'Medicamento A');
    expect(medA).toBeDefined();
    expect(medA?.valorFaturado).toBe(150);
    expect(medA?.valorGlosado).toBe(15);
    expect(medA?.valorRecebido).toBe(135);
    expect(medA?.registros).toBe(2);
    
    const matB = agrupados.find(a => a.chave === 'Material B');
    expect(matB).toBeDefined();
    expect(matB?.valorFaturado).toBe(200);
    expect(matB?.valorGlosado).toBe(0);
    expect(matB?.valorRecebido).toBe(200);
    expect(matB?.registros).toBe(1);
  });

  it('deve tratar procedimentos sem descrição', () => {
    const procedimentos = [
      { descricao: undefined, valorTotal: '100.00', valorGlosado: '0.00' },
      { descricao: '', valorTotal: '50.00', valorGlosado: '0.00' },
    ];

    const agrupados = agruparPorDescricao(procedimentos);
    
    // Ambos devem ir para "Sem Descrição"
    expect(agrupados.length).toBe(1);
    expect(agrupados[0].chave).toBe('Sem Descrição');
    expect(agrupados[0].valorFaturado).toBe(150);
  });
});
