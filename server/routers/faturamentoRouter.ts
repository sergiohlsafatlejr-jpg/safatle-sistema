import { router, trackedProtectedProcedure, protectedProcedure } from "../_core/trpc";
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
import { sql } from "drizzle-orm";

const ENABLE_FATURAMENTO_MODULO = process.env.ENABLE_MODULO_FATURAMENTO === "true";

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
        convenioId: z.number().positive(),
        dataReferencia: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_FATURAMENTO_MODULO) {
        throw new Error("Módulo de faturamento não ativado");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Cria faturamento no banco usando Drizzle ORM
        const resultado = await db.execute(
          sql`INSERT INTO faturamento_tiss (estabelecimentoId, convenioId, data_referencia, data_importacao)
              VALUES (${input.estabelecimentoId}, ${input.convenioId}, ${input.dataReferencia}, NOW())`
        );

        // Invalida cache
        await invalidateFaturamentoCache(input.estabelecimentoId);

        logger.info({
          message: "Faturamento criado",
          estabelecimentoId: input.estabelecimentoId,
          convenioId: input.convenioId,
          usuarioId: ctx.user.id,
        });

        return { id: Number((resultado as any)[0]?.insertId || 0), status: "sucesso" };
      } catch (error) {
        logger.error({
          message: "Erro ao criar faturamento",
          error: String(error),
          input,
        });
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
        convenioId: z.number().positive().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = generateFaturamentoKey(
        input.estabelecimentoId,
        input.convenioId?.toString() || "all",
        "list"
      );

      // Tenta obter do cache
      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          if (!db) return [];

          let query = sql`SELECT * FROM faturamento_tiss WHERE estabelecimentoId = ${input.estabelecimentoId}`;

          if (input.convenioId) {
            query = sql`SELECT * FROM faturamento_tiss WHERE estabelecimentoId = ${input.estabelecimentoId} AND convenioId = ${input.convenioId}`;
          }

          const resultado = await db.execute(
            sql`${query} ORDER BY data_importacao DESC LIMIT ${input.limit} OFFSET ${input.offset}`
          );

          logger.debug({
            message: "Faturamentos listados",
            estabelecimentoId: input.estabelecimentoId,
            count: Array.isArray(resultado) ? resultado.length : 0,
          });

          return Array.isArray(resultado) ? resultado : [];
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
          if (!db) return null;

          const resultado = await db.execute(
            sql`SELECT * FROM faturamento_tiss WHERE id = ${input.id} LIMIT 1`
          );

          return Array.isArray(resultado) && resultado.length > 0 ? resultado[0] : null;
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_FATURAMENTO_MODULO) {
        throw new Error("Módulo de faturamento não ativado");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Obtém faturamento atual para invalidar cache
        const faturamento = await db.execute(
          sql`SELECT estabelecimentoId FROM faturamento_tiss WHERE id = ${input.id} LIMIT 1`
        );

        if (!Array.isArray(faturamento) || !faturamento[0]) {
          throw new Error("Faturamento não encontrado");
        }

        // Atualiza faturamento
        await db.execute(
          sql`UPDATE faturamento_tiss SET data_importacao = NOW() WHERE id = ${input.id}`
        );

        // Invalida cache
        const estabelecimentoId = (faturamento[0] as any).estabelecimentoId;
        if (estabelecimentoId) {
          await invalidateFaturamentoCache(estabelecimentoId);
        }

        logger.info({
          message: "Faturamento atualizado",
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error({
          message: "Erro ao atualizar faturamento",
          error: String(error),
          input,
        });
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
        if (!db) throw new Error("Database not available");

        // Obtém faturamento atual
        const faturamento = await db.execute(
          sql`SELECT estabelecimentoId FROM faturamento_tiss WHERE id = ${input.id} LIMIT 1`
        );

        if (!Array.isArray(faturamento) || !faturamento[0]) {
          throw new Error("Faturamento não encontrado");
        }

        // Deleta faturamento
        await db.execute(
          sql`DELETE FROM faturamento_tiss WHERE id = ${input.id}`
        );

        // Invalida cache
        const estabelecimentoId = (faturamento[0] as any).estabelecimentoId;
        if (estabelecimentoId) {
          await invalidateFaturamentoCache(estabelecimentoId);
        }

        logger.info({
          message: "Faturamento deletado",
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error({
          message: "Erro ao deletar faturamento",
          error: String(error),
          input,
        });
        throw error;
      }
    }),
});
