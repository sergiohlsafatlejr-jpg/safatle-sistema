import { router, trackedProtectedProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  cacheGetOrSet,
  invalidateGlosaCache,
  generateGlosaKey,
  CACHE_TTL,
} from "../_core/cache";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import { sql } from "drizzle-orm";

const ENABLE_GLOSA_MODULO = process.env.ENABLE_MODULO_GLOSA === "true";

/**
 * Router de Glosa com Cache Redis
 * Migrado do monolito com feature flags para rollout gradual
 */
export const glosaRouter = router({
  /**
   * Criar glosa
   * - Usa trackedProtectedProcedure para logging e auditoria
   * - Invalida cache após criação
   */
  create: trackedProtectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        faturamentoId: z.number().positive(),
        motivo: z.string().min(1),
        valor: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_GLOSA_MODULO) {
        throw new Error("Módulo de glosa não ativado");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Cria glosa no banco usando Drizzle ORM
        const resultado = await db.execute(
          sql`INSERT INTO glosa (estabelecimentoId, faturamentoId, motivo, valor, data_criacao)
              VALUES (${input.estabelecimentoId}, ${input.faturamentoId}, ${input.motivo}, ${input.valor}, NOW())`
        );

        // Invalida cache
        await invalidateGlosaCache(input.estabelecimentoId);

        logger.info({
          message: "Glosa criada",
          estabelecimentoId: input.estabelecimentoId,
          faturamentoId: input.faturamentoId,
          valor: input.valor,
          usuarioId: ctx.user.id,
        });

        return { id: Number((resultado as any)[0]?.insertId || 0), status: "sucesso" };
      } catch (error) {
        logger.error({
          message: "Erro ao criar glosa",
          error: String(error),
          input,
        });
        throw error;
      }
    }),

  /**
   * Listar glosas com cache
   */
  list: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        faturamentoId: z.number().positive().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = generateGlosaKey(
        input.estabelecimentoId,
        input.faturamentoId,
        "list"
      );

      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          if (!db) return [];

          let query = sql`SELECT * FROM glosa WHERE estabelecimentoId = ${input.estabelecimentoId}`;

          if (input.faturamentoId) {
            query = sql`SELECT * FROM glosa WHERE estabelecimentoId = ${input.estabelecimentoId} AND faturamentoId = ${input.faturamentoId}`;
          }

          const resultado = await db.execute(
            sql`${query} ORDER BY data_criacao DESC LIMIT ${input.limit} OFFSET ${input.offset}`
          );

          logger.debug({
            message: "Glosas listadas",
            estabelecimentoId: input.estabelecimentoId,
            count: Array.isArray(resultado) ? resultado.length : 0,
          });

          return Array.isArray(resultado) ? resultado : [];
        },
        CACHE_TTL.GLOSA
      );
    }),

  /**
   * Obter glosa por ID com cache
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input }) => {
      const cacheKey = `glosa:${input.id}`;

      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          if (!db) return null;

          const resultado = await db.execute(
            sql`SELECT * FROM glosa WHERE id = ${input.id} LIMIT 1`
          );

          return Array.isArray(resultado) && resultado.length > 0 ? resultado[0] : null;
        },
        CACHE_TTL.GLOSA
      );
    }),

  /**
   * Atualizar glosa
   */
  update: trackedProtectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        motivo: z.string().optional(),
        valor: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_GLOSA_MODULO) {
        throw new Error("Módulo de glosa não ativado");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Obtém glosa atual
        const glosa = await db.execute(
          sql`SELECT estabelecimentoId FROM glosa WHERE id = ${input.id} LIMIT 1`
        );

        if (!Array.isArray(glosa) || !glosa[0]) {
          throw new Error("Glosa não encontrada");
        }

        // Atualiza glosa
        if (input.motivo && input.valor) {
          await db.execute(
            sql`UPDATE glosa SET motivo = ${input.motivo}, valor = ${input.valor}, data_atualizacao = NOW() WHERE id = ${input.id}`
          );
        } else if (input.motivo) {
          await db.execute(
            sql`UPDATE glosa SET motivo = ${input.motivo}, data_atualizacao = NOW() WHERE id = ${input.id}`
          );
        } else if (input.valor) {
          await db.execute(
            sql`UPDATE glosa SET valor = ${input.valor}, data_atualizacao = NOW() WHERE id = ${input.id}`
          );
        }

        // Invalida cache
        const estabelecimentoId = (glosa[0] as any).estabelecimentoId;
        if (estabelecimentoId) {
          await invalidateGlosaCache(estabelecimentoId);
        }

        logger.info({
          message: "Glosa atualizada",
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error({
          message: "Erro ao atualizar glosa",
          error: String(error),
          input,
        });
        throw error;
      }
    }),

  /**
   * Deletar glosa
   */
  delete: trackedProtectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_GLOSA_MODULO) {
        throw new Error("Módulo de glosa não ativado");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Obtém glosa atual
        const glosa = await db.execute(
          sql`SELECT estabelecimentoId FROM glosa WHERE id = ${input.id} LIMIT 1`
        );

        if (!Array.isArray(glosa) || !glosa[0]) {
          throw new Error("Glosa não encontrada");
        }

        // Deleta glosa
        await db.execute(sql`DELETE FROM glosa WHERE id = ${input.id}`);

        // Invalida cache
        const estabelecimentoId = (glosa[0] as any).estabelecimentoId;
        if (estabelecimentoId) {
          await invalidateGlosaCache(estabelecimentoId);
        }

        logger.info({
          message: "Glosa deletada",
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error({
          message: "Erro ao deletar glosa",
          error: String(error),
          input,
        });
        throw error;
      }
    }),
});
