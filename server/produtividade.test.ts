import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import { TRPCError } from '@trpc/server';

// Mock do contexto
const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin' as const,
  openId: 'test-open-id',
  avatarUrl: null,
  createdAt: new Date(),
};

const mockContext = {
  user: mockUser,
  req: {} as any,
  res: {} as any,
};

describe('Produtividade Router', () => {
  describe('metricas', () => {
    it('should return metrics structure', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      const result = await caller.produtividade.metricas({});
      
      // Verificar estrutura básica
      expect(result).toHaveProperty('porDia');
      expect(result).toHaveProperty('porUsuario');
      expect(result).toHaveProperty('totais');
      
      // Verificar estrutura de totais
      expect(result.totais).toHaveProperty('totalClassificados');
      expect(result.totais).toHaveProperty('totalAceitas');
      expect(result.totais).toHaveProperty('totalRecursadas');
      expect(result.totais).toHaveProperty('totalPendentes');
      expect(result.totais).toHaveProperty('valorTotalAceito');
      expect(result.totais).toHaveProperty('valorTotalRecursado');
      expect(result.totais).toHaveProperty('taxaClassificacao');
      
      // Verificar tipos
      expect(Array.isArray(result.porDia)).toBe(true);
      expect(Array.isArray(result.porUsuario)).toBe(true);
      expect(typeof result.totais.totalClassificados).toBe('number');
      expect(typeof result.totais.taxaClassificacao).toBe('number');
    });

    it('should accept date filters', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      const result = await caller.produtividade.metricas({
        dataInicio: '2024-01-01',
        dataFim: '2024-12-31',
      });
      
      // Verificar que a query foi executada com sucesso
      expect(result).toHaveProperty('totais');
      expect(result.totais.totalClassificados).toBeGreaterThanOrEqual(0);
    });

    it('should return empty arrays when no data', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      // Filtrar por período sem dados
      const result = await caller.produtividade.metricas({
        dataInicio: '2099-01-01',
        dataFim: '2099-12-31',
      });
      
      expect(result.porDia).toEqual([]);
      expect(result.porUsuario).toEqual([]);
      expect(result.totais.totalClassificados).toBe(0);
    });

    it('should calculate taxaClassificacao correctly', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      const result = await caller.produtividade.metricas({});
      
      // Taxa deve estar entre 0 e 100
      expect(result.totais.taxaClassificacao).toBeGreaterThanOrEqual(0);
      expect(result.totais.taxaClassificacao).toBeLessThanOrEqual(100);
    });
  });
});

describe('Glosa Router - Filtro de Classificação', () => {
  describe('itensGlosados', () => {
    it('should accept classificacao filter', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      // Testar filtro "pendente"
      const resultPendente = await caller.glosa.itensGlosados({
        classificacao: 'pendente',
        page: 1,
        pageSize: 10,
      });
      
      expect(resultPendente).toHaveProperty('items');
      expect(resultPendente).toHaveProperty('total');
      expect(resultPendente).toHaveProperty('resumo');
    });

    it('should accept classificacao aceitar filter', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      const result = await caller.glosa.itensGlosados({
        classificacao: 'aceitar',
        page: 1,
        pageSize: 10,
      });
      
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should accept classificacao recursar filter', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      const result = await caller.glosa.itensGlosados({
        classificacao: 'recursar',
        page: 1,
        pageSize: 10,
      });
      
      expect(result).toHaveProperty('items');
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should work without classificacao filter', async () => {
      const caller = appRouter.createCaller(mockContext);
      
      const result = await caller.glosa.itensGlosados({
        page: 1,
        pageSize: 10,
      });
      
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
    });
  });
});
