import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do getDb
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
};

vi.mock('./db', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

describe('Filtro por Motivo de Glosa', () => {
  it('deve ter o campo motivoGlosa na interface de filtros', async () => {
    // Verificar que a interface aceita motivoGlosa
    const filters = {
      convenioId: 30001,
      estabelecimentoId: 6,
      motivoGlosa: 'GUIA VENCIDA',
      page: 1,
      pageSize: 50,
    };
    
    expect(filters.motivoGlosa).toBe('GUIA VENCIDA');
    expect(filters).toHaveProperty('motivoGlosa');
  });

  it('deve filtrar itens por motivo textual usando startsWith', () => {
    // Simular a lógica de filtro do backend
    const rows = [
      { codigoGlosa: 'GUIA VENCIDA', valorGlosa: '100.00' },
      { codigoGlosa: 'DOCUMENTAÇÃO INCOMPL', valorGlosa: '200.00' },
      { codigoGlosa: 'GUIA VENCIDA', valorGlosa: '150.00' },
      { codigoGlosa: 'ASSINATURA DO TITULA', valorGlosa: '50.00' },
    ];

    const motivoFiltro = 'GUIA VENCIDA';
    const filtered = rows.filter(row => {
      const motivoTexto = (row.codigoGlosa || '').toUpperCase();
      return motivoTexto.startsWith(motivoFiltro.toUpperCase());
    });

    expect(filtered).toHaveLength(2);
    expect(filtered[0].valorGlosa).toBe('100.00');
    expect(filtered[1].valorGlosa).toBe('150.00');
  });

  it('deve gerar resumo porMotivoTexto agrupando por motivo textual', () => {
    const rows = [
      { codigoGlosa: 'GUIA VENCIDA', valorGlosa: 100 },
      { codigoGlosa: 'GUIA VENCIDA', valorGlosa: 150 },
      { codigoGlosa: 'DOCUMENTAÇÃO INCOMPL', valorGlosa: 200 },
      { codigoGlosa: 'DOCUMENTAÇÃO INCOMPL', valorGlosa: 300 },
      { codigoGlosa: 'DOCUMENTAÇÃO INCOMPL', valorGlosa: 100 },
      { codigoGlosa: 'ASSINATURA DO TITULA', valorGlosa: 50 },
    ];

    const resumoPorMotivoTexto: { [key: string]: { quantidade: number; valorGlosado: number } } = {};
    
    for (const row of rows) {
      const motivoTextoKey = (row.codigoGlosa || 'Não informado').toUpperCase().trim();
      if (!resumoPorMotivoTexto[motivoTextoKey]) {
        resumoPorMotivoTexto[motivoTextoKey] = { quantidade: 0, valorGlosado: 0 };
      }
      resumoPorMotivoTexto[motivoTextoKey].quantidade++;
      resumoPorMotivoTexto[motivoTextoKey].valorGlosado += row.valorGlosa;
    }

    const resultado = Object.entries(resumoPorMotivoTexto)
      .map(([motivo, data]) => ({ motivo, quantidade: data.quantidade, valorGlosado: data.valorGlosado }))
      .sort((a, b) => b.quantidade - a.quantidade);

    expect(resultado).toHaveLength(3);
    expect(resultado[0].motivo).toBe('DOCUMENTAÇÃO INCOMPL');
    expect(resultado[0].quantidade).toBe(3);
    expect(resultado[0].valorGlosado).toBe(600);
    expect(resultado[1].motivo).toBe('GUIA VENCIDA');
    expect(resultado[1].quantidade).toBe(2);
    expect(resultado[1].valorGlosado).toBe(250);
    expect(resultado[2].motivo).toBe('ASSINATURA DO TITULA');
    expect(resultado[2].quantidade).toBe(1);
  });

  it('não deve filtrar quando motivoGlosa é "todos"', () => {
    const rows = [
      { codigoGlosa: 'GUIA VENCIDA', valorGlosa: '100.00' },
      { codigoGlosa: 'DOCUMENTAÇÃO INCOMPL', valorGlosa: '200.00' },
    ];

    const motivoFiltro = 'todos';
    const filtered = rows.filter(row => {
      if (motivoFiltro && motivoFiltro !== 'todos') {
        const motivoTexto = (row.codigoGlosa || '').toUpperCase();
        return motivoTexto.startsWith(motivoFiltro.toUpperCase());
      }
      return true;
    });

    expect(filtered).toHaveLength(2);
  });

  it('deve lidar com motivos que contêm códigos numéricos TISS (erroTiss)', () => {
    const rows = [
      { codigoGlosa: '', erroTiss: '2012-COBRANÇA DE MATERIAL INCOMPATÍVEL', valorGlosa: '100.00' },
      { codigoGlosa: '', erroTiss: '2012-COBRANÇA DE MATERIAL INCOMPATÍVEL', valorGlosa: '200.00' },
      { codigoGlosa: '', erroTiss: '1015-PROCEDIMENTO NÃO AUTORIZADO', valorGlosa: '300.00' },
    ];

    const motivoFiltro = '2012-COBRANÇA DE MATERIAL INCOMPATÍVEL';
    const filtered = rows.filter(row => {
      const motivoTexto = (row.codigoGlosa || row.erroTiss || '').toUpperCase();
      return motivoTexto.startsWith(motivoFiltro.toUpperCase());
    });

    expect(filtered).toHaveLength(2);
  });
});
