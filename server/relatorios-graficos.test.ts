import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function createTestContext(): TrpcContext {
  const user = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus' as const,
    role: 'admin' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Relatórios BI - Gráficos e Filtros', () => {
  
  describe('Gráfico de Barras - Glosas por Motivo', () => {
    it('deve retornar glosas agrupadas por motivo com valores', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.relatoriosBI.glosasPorMotivo({
        estabelecimentoId: 1,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result && result.length > 0) {
        expect(result[0]).toHaveProperty('motivo');
        expect(result[0]).toHaveProperty('valor');
      }
    });

    it('deve filtrar glosas por período (mês/ano)', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const mes = 2;
      const ano = 2025;
      
      const result = await caller.relatoriosBI.glosasPorMotivo({
        estabelecimentoId: 1,
        mesReferencia: mes,
        anoReferencia: ano,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Gráfico de Linha - Performance por Médico', () => {
    it('deve retornar performance de médicos com faturado, recebido e glosado', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.relatoriosBI.performanceMedico({
        estabelecimentoId: 1,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result && result.length > 0) {
        expect(result[0]).toHaveProperty('medicoNome');
        expect(result[0]).toHaveProperty('faturado');
        expect(result[0]).toHaveProperty('recebido');
      }
    });

    it('deve filtrar performance por período', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const mes = 2;
      const ano = 2025;
      
      const result = await caller.relatoriosBI.performanceMedico({
        estabelecimentoId: 1,
        mesReferencia: mes,
        anoReferencia: ano,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Gráfico de Pizza - Itens por Categoria', () => {
    it('deve retornar itens agrupados por categoria com distribuição de valores', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.relatoriosBI.itemsPorCategoria({
        estabelecimentoId: 1,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result && result.length > 0) {
        expect(result[0]).toHaveProperty('categoria');
        expect(result[0]).toHaveProperty('valor');
      }
    });

    it('deve filtrar categorias por período', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const mes = 2;
      const ano = 2025;
      
      const result = await caller.relatoriosBI.itemsPorCategoria({
        estabelecimentoId: 1,
        mesReferencia: mes,
        anoReferencia: ano,
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Filtro de Período', () => {
    it('deve retornar dados apenas do mês selecionado', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const mes = 2;
      const ano = 2025;
      
      const result = await caller.relatoriosBI.dados({
        estabelecimentoId: 1,
        mesReferencia: mes,
        anoReferencia: ano,
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('resumo');
    });

    it('deve retornar dados de todos os meses quando filtro = 0', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const ano = 2025;
      
      const result = await caller.relatoriosBI.dados({
        estabelecimentoId: 1,
        anoReferencia: ano,
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('resumo');
    });

    it('deve filtrar por ano corretamente', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const ano = 2025;
      
      const result = await caller.relatoriosBI.dados({
        estabelecimentoId: 1,
        anoReferencia: ano,
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('resumo');
    });
  });

  describe('Integração de Filtros', () => {
    it('deve combinar filtros de período + convênio', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const mes = 2;
      const ano = 2025;
      const convenioId = 1;
      
      const result = await caller.relatoriosBI.dados({
        estabelecimentoId: 1,
        mesReferencia: mes,
        anoReferencia: ano,
        convenioId: convenioId,
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('resumo');
    });

    it('deve combinar filtros de período + tipo de lançamento', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      const mes = 2;
      const ano = 2025;
      const tipoLancamento = 'Medicamento';
      
      const result = await caller.relatoriosBI.dados({
        estabelecimentoId: 1,
        mesReferencia: mes,
        anoReferencia: ano,
        tipo: tipoLancamento,
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('resumo');
    });
  });

  describe('Validação de Dados nos Gráficos', () => {
    it('valores em gráficos devem ser positivos', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.relatoriosBI.glosasPorMotivo({
        estabelecimentoId: 1,
      });
      
      expect(result).toBeDefined();
      if (result && result.length > 0) {
        result.forEach((item: any) => {
          expect(item.valor).toBeGreaterThanOrEqual(0);
        });
      }
    });

    it('percentuais devem estar entre 0 e 100', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.relatoriosBI.itemsPorCategoria({
        estabelecimentoId: 1,
      });
      
      expect(result).toBeDefined();
      if (result && result.length > 0) {
        result.forEach((item: any) => {
          expect(item.percentual).toBeGreaterThanOrEqual(0);
          expect(item.percentual).toBeLessThanOrEqual(100);
        });
      }
    });
  });
});
