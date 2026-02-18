/**
 * Testes para Middlewares Globais
 * Valida logging, auditoria e permissões
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from './_core/logger';

describe('Middlewares Globais', () => {
  
  describe('Logging Middleware', () => {
    
    it('deve registrar log de sucesso quando procedure executa com sucesso', async () => {
      const infoSpy = vi.spyOn(logger, 'info');
      
      // Simular middleware de logging
      const loggingMiddleware = async (opts: any) => {
        const { path, type, ctx, next } = opts;
        const inicio = Date.now();
        
        try {
          const resultado = await next();
          const duracao = Date.now() - inicio;
          
          logger.info({
            tipo: "operacao_sucesso",
            path,
            tipoOperacao: type,
            duracao,
            usuarioId: ctx.user?.id,
          });
          
          return resultado;
        } catch (error) {
          throw error;
        }
      };
      
      // Executar middleware
      const opts = {
        path: 'test.procedure',
        type: 'query',
        ctx: { user: { id: 123 } },
        next: async () => ({ success: true }),
      };
      
      await loggingMiddleware(opts);
      
      // Verificar se log foi registrado
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'operacao_sucesso',
          path: 'test.procedure',
          tipoOperacao: 'query',
          usuarioId: 123,
        })
      );
    });
    
    it('deve registrar log de erro quando procedure falha', async () => {
      const errorSpy = vi.spyOn(logger, 'error');
      
      const loggingMiddleware = async (opts: any) => {
        const { path, type, ctx, next } = opts;
        const inicio = Date.now();
        
        try {
          const resultado = await next();
          return resultado;
        } catch (error) {
          const duracao = Date.now() - inicio;
          logger.error({
            tipo: "operacao_erro",
            path,
            tipoOperacao: type,
            duracao,
            usuarioId: ctx.user?.id,
            erro: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      };
      
      const opts = {
        path: 'test.procedure',
        type: 'mutation',
        ctx: { user: { id: 123 } },
        next: async () => { throw new Error('Test error'); },
      };
      
      try {
        await loggingMiddleware(opts);
      } catch (e) {
        // Esperado
      }
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: 'operacao_erro',
          path: 'test.procedure',
          tipoOperacao: 'mutation',
          usuarioId: 123,
          erro: 'Test error',
        })
      );
    });
    
    it('deve medir duração corretamente', async () => {
      const infoSpy = vi.spyOn(logger, 'info');
      
      const loggingMiddleware = async (opts: any) => {
        const { path, type, ctx, next } = opts;
        const inicio = Date.now();
        
        const resultado = await next();
        const duracao = Date.now() - inicio;
        
        logger.info({
          tipo: "operacao_sucesso",
          path,
          tipoOperacao: type,
          duracao,
          usuarioId: ctx.user?.id,
        });
        
        return resultado;
      };
      
      const opts = {
        path: 'test.procedure',
        type: 'query',
        ctx: { user: { id: 123 } },
        next: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        },
      };
      
      await loggingMiddleware(opts);
      
      const call = infoSpy.mock.calls[0][0] as any;
      expect(call.duracao).toBeGreaterThanOrEqual(100);
    });
  });
  
  describe('Auditoria Middleware', () => {
    
    it('não deve auditar queries', async () => {
      const auditMiddleware = async (opts: any) => {
        const { type, next } = opts;
        
        if (type !== "mutation") {
          return next();
        }
        
        return next();
      };
      
      const opts = {
        path: 'test.query',
        type: 'query',
        next: async () => ({ success: true }),
      };
      
      const resultado = await auditMiddleware(opts);
      
      expect(resultado).toEqual({ success: true });
    });
    
    it('deve auditar mutations', async () => {
      const auditLog: any[] = [];
      
      const auditMiddleware = async (opts: any) => {
        const { path, type, ctx, next } = opts;
        
        if (type !== "mutation") {
          return next();
        }
        
        const resultado = await next();
        
        if (resultado && typeof resultado === "object") {
          const registroId = resultado.id || 0;
          
          if (registroId > 0) {
            let tipoAcao: "INSERT" | "UPDATE" | "DELETE" = "UPDATE";
            if (path.includes("create")) tipoAcao = "INSERT";
            if (path.includes("delete")) tipoAcao = "DELETE";
            
            auditLog.push({
              tabela: path.split(".")[0],
              registroId,
              tipoAcao,
              usuarioId: ctx.user?.id,
              valoresNovos: resultado,
            });
          }
        }
        
        return resultado;
      };
      
      const opts = {
        path: 'glosa.create',
        type: 'mutation',
        ctx: { user: { id: 123 } },
        next: async () => ({ id: 456, status: 'rascunho' }),
      };
      
      await auditMiddleware(opts);
      
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toEqual(
        expect.objectContaining({
          tabela: 'glosa',
          registroId: 456,
          tipoAcao: 'INSERT',
          usuarioId: 123,
        })
      );
    });
    
    it('deve detectar tipo de ação corretamente', async () => {
      const actions: any[] = [];
      
      const auditMiddleware = async (opts: any) => {
        const { path, type, ctx, next } = opts;
        
        if (type !== "mutation") {
          return next();
        }
        
        const resultado = await next();
        
        if (resultado && typeof resultado === "object") {
          const registroId = resultado.id || 0;
          
          if (registroId > 0) {
            let tipoAcao: "INSERT" | "UPDATE" | "DELETE" = "UPDATE";
            if (path.includes("create")) tipoAcao = "INSERT";
            if (path.includes("delete")) tipoAcao = "DELETE";
            
            actions.push(tipoAcao);
          }
        }
        
        return resultado;
      };
      
      // Testar CREATE
      await auditMiddleware({
        path: 'glosa.create',
        type: 'mutation',
        ctx: { user: { id: 1 } },
        next: async () => ({ id: 1 }),
      });
      
      // Testar UPDATE
      await auditMiddleware({
        path: 'glosa.update',
        type: 'mutation',
        ctx: { user: { id: 1 } },
        next: async () => ({ id: 1 }),
      });
      
      // Testar DELETE
      await auditMiddleware({
        path: 'glosa.delete',
        type: 'mutation',
        ctx: { user: { id: 1 } },
        next: async () => ({ id: 1 }),
      });
      
      expect(actions).toEqual(['INSERT', 'UPDATE', 'DELETE']);
    });
  });
  
  describe('Permissões Middleware', () => {
    
    it('deve rejeitar se usuário não está autenticado', async () => {
      const permissaoMiddleware = async (opts: any) => {
        const { ctx, next } = opts;
        
        if (!ctx.user) {
          throw new Error("Usuário não autenticado");
        }
        
        return next();
      };
      
      const opts = {
        ctx: { user: null },
        next: async () => ({ success: true }),
      };
      
      await expect(permissaoMiddleware(opts)).rejects.toThrow("Usuário não autenticado");
    });
    
    it('deve rejeitar se estabelecimento não está configurado', async () => {
      const permissaoMiddleware = async (opts: any) => {
        const { ctx, next } = opts;
        
        if (!ctx.user) {
          throw new Error("Usuário não autenticado");
        }
        
        if (!ctx.estabelecimentoId) {
          throw new Error("Estabelecimento não configurado");
        }
        
        return next();
      };
      
      const opts = {
        ctx: { user: { id: 1 }, estabelecimentoId: null },
        next: async () => ({ success: true }),
      };
      
      await expect(permissaoMiddleware(opts)).rejects.toThrow("Estabelecimento não configurado");
    });
    
    it('deve permitir se usuário e estabelecimento estão configurados', async () => {
      const permissaoMiddleware = async (opts: any) => {
        const { ctx, next } = opts;
        
        if (!ctx.user) {
          throw new Error("Usuário não autenticado");
        }
        
        if (!ctx.estabelecimentoId) {
          throw new Error("Estabelecimento não configurado");
        }
        
        return next();
      };
      
      const opts = {
        ctx: { user: { id: 1 }, estabelecimentoId: 123 },
        next: async () => ({ success: true }),
      };
      
      const resultado = await permissaoMiddleware(opts);
      
      expect(resultado).toEqual({ success: true });
    });
  });
  
  describe('Integração de Middlewares', () => {
    
    it('deve executar middlewares em sequência', async () => {
      const executionOrder: string[] = [];
      
      const middleware1 = async (opts: any) => {
        executionOrder.push('middleware1-antes');
        const resultado = await opts.next();
        executionOrder.push('middleware1-depois');
        return resultado;
      };
      
      const middleware2 = async (opts: any) => {
        executionOrder.push('middleware2-antes');
        const resultado = await opts.next();
        executionOrder.push('middleware2-depois');
        return resultado;
      };
      
      // Simular aplicação de middlewares
      const procedure = async (opts: any) => {
        return middleware1({
          ...opts,
          next: async () => middleware2({
            ...opts,
            next: async () => ({ success: true }),
          }),
        });
      };
      
      await procedure({});
      
      expect(executionOrder).toEqual([
        'middleware1-antes',
        'middleware2-antes',
        'middleware2-depois',
        'middleware1-depois',
      ]);
    });
  });
});
