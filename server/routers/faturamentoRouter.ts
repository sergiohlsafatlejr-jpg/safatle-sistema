import { router, protectedProcedure, trackedProtectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheGetOrSet,
  invalidateFaturamentoCache,
  generateFaturamentoKey,
  CACHE_TTL,
} from "../_core/cache";
import { getDb } from "../db";
import { logger } from "../_core/logger";

const ENABLE_FATURAMENTO_MODULO = process.env.ENABLE_FATURAMENTO_MODULO === "true";

/**
 * Router de Faturamento com Cache Redis
 * Migrado do monolito com feature flags para rollout gradual
 */
export const faturamentoRouter = router({
  /**
   * Criar faturamento
   * - Usa trackedProtectedProcedure para logging e auditoria
   * - Invalida cache após criação
   */
  create: trackedProtectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        mes: z.string().regex(/^\d{4}-\d{2}$/),
        ano: z.number().min(2000),
        dados: z.record(z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_FATURAMENTO_MODULO) {
        throw new Error("Módulo de faturamento não ativado");
      }

      try {
        const db = await getDb();
        
        // Cria faturamento no banco
        const resultado = await db.execute(
          `INSERT INTO faturamento_tiss 
           (estabelecimento_id, mes_referencia, ano, dados, usuario_id, data_criacao)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [input.estabelecimentoId, input.mes, input.ano, JSON.stringify(input.dados), ctx.user.id]
        );

        // Invalida cache
        await invalidateFaturamentoCache(input.estabelecimentoId);

        logger.info("Faturamento criado", {
          estabelecimentoId: input.estabelecimentoId,
          mes: input.mes,
          usuarioId: ctx.user.id,
        });

        return { id: resultado.insertId, status: "sucesso" };
      } catch (error) {
        logger.error("Erro ao criar faturamento", { error, input });
        throw error;
      }
    }),

  /**
   * Listar faturamentos com cache
   * - Tenta obter do cache primeiro
   * - Se não encontrado, busca do banco e armazena em cache
   */
  list: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        mes: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = generateFaturamentoKey(
        input.estabelecimentoId,
        input.mes || "all",
        input.status
      );

      // Tenta obter do cache
      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          
          let query = "SELECT * FROM faturamento_tiss WHERE estabelecimento_id = ?";
          const params: any[] = [input.estabelecimentoId];

          if (input.mes) {
            query += " AND mes_referencia = ?";
            params.push(input.mes);
          }

          if (input.status) {
            query += " AND status = ?";
            params.push(input.status);
          }

          query += " ORDER BY data_criacao DESC LIMIT ? OFFSET ?";
          params.push(input.limit, input.offset);

          const resultado = await db.execute(query, params);
          
          logger.debug("Faturamentos listados", {
            estabelecimentoId: input.estabelecimentoId,
            count: resultado.length,
          });

          return resultado;
        },
        CACHE_TTL.FATURAMENTO
      );
    }),

  /**
   * Obter faturamento por ID com cache
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input }) => {
      const cacheKey = `faturamento:${input.id}`;

      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          const resultado = await db.execute(
            "SELECT * FROM faturamento_tiss WHERE id = ?",
            [input.id]
          );
          return resultado[0] || null;
        },
        CACHE_TTL.FATURAMENTO
      );
    }),

  /**
   * Atualizar faturamento
   * - Invalida cache após atualização
   */
  update: trackedProtectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        dados: z.record(z.any()),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_FATURAMENTO_MODULO) {
        throw new Error("Módulo de faturamento não ativado");
      }

      try {
        const db = await getDb();
        
        // Obtém faturamento atual para invalidar cache
        const faturamento = await db.execute(
          "SELECT estabelecimento_id FROM faturamento_tiss WHERE id = ?",
          [input.id]
        );

        if (!faturamento[0]) {
          throw new Error("Faturamento não encontrado");
        }

        // Atualiza faturamento
        await db.execute(
          `UPDATE faturamento_tiss 
           SET dados = ?, status = ?, data_atualizacao = NOW()
           WHERE id = ?`,
          [JSON.stringify(input.dados), input.status, input.id]
        );

        // Invalida cache
        await invalidateFaturamentoCache(faturamento[0].estabelecimento_id);

        logger.info("Faturamento atualizado", {
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error("Erro ao atualizar faturamento", { error, input });
        throw error;
      }
    }),

  /**
   * Deletar faturamento
   * - Invalida cache após deleção
   */
  delete: trackedProtectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_FATURAMENTO_MODULO) {
        throw new Error("Módulo de faturamento não ativado");
      }

      try {
        const db = await getDb();
        
        // Obtém faturamento atual
        const faturamento = await db.execute(
          "SELECT estabelecimento_id FROM faturamento_tiss WHERE id = ?",
          [input.id]
        );

        if (!faturamento[0]) {
          throw new Error("Faturamento não encontrado");
        }

        // Deleta faturamento
        await db.execute("DELETE FROM faturamento_tiss WHERE id = ?", [input.id]);

        // Invalida cache
        await invalidateFaturamentoCache(faturamento[0].estabelecimento_id);

        logger.info("Faturamento deletado", {
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error("Erro ao deletar faturamento", { error, input });
        throw error;
      }
    }),
});
