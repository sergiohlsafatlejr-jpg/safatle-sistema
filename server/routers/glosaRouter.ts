import { router, protectedProcedure, trackedProtectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  cacheGetOrSet,
  invalidateGlosaCache,
  generateGlosaKey,
  CACHE_TTL,
} from "../_core/cache";
import { getDb } from "../db";
import { logger } from "../_core/logger";

const ENABLE_GLOSA_MODULO = process.env.ENABLE_GLOSA_MODULO === "true";

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
        faturamentoId: z.number().positive(),
        motivo: z.string().min(1),
        valor: z.number().positive(),
        descricao: z.string().optional(),
        estabelecimentoId: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_GLOSA_MODULO) {
        throw new Error("Módulo de glosa não ativado");
      }

      try {
        const db = await getDb();

        // Cria glosa no banco
        const resultado = await db.execute(
          `INSERT INTO glosa 
           (faturamento_id, motivo, valor, descricao, status, usuario_id, data_criacao)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [
            input.faturamentoId,
            input.motivo,
            input.valor,
            input.descricao || null,
            "pendente",
            ctx.user.id,
          ]
        );

        // Invalida cache
        await invalidateGlosaCache(input.estabelecimentoId);

        logger.info("Glosa criada", {
          faturamentoId: input.faturamentoId,
          motivo: input.motivo,
          valor: input.valor,
          usuarioId: ctx.user.id,
        });

        return { id: resultado.insertId, status: "sucesso" };
      } catch (error) {
        logger.error("Erro ao criar glosa", { error, input });
        throw error;
      }
    }),

  /**
   * Listar glosas com cache
   * - Tenta obter do cache primeiro
   * - Se não encontrado, busca do banco e armazena em cache
   */
  list: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        faturamentoId: z.number().positive().optional(),
        status: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = generateGlosaKey(
        input.estabelecimentoId,
        input.faturamentoId,
        input.status
      );

      // Tenta obter do cache
      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();

          let query = `SELECT g.* FROM glosa g 
                       JOIN faturamento_tiss f ON g.faturamento_id = f.id
                       WHERE f.estabelecimento_id = ?`;
          const params: any[] = [input.estabelecimentoId];

          if (input.faturamentoId) {
            query += " AND g.faturamento_id = ?";
            params.push(input.faturamentoId);
          }

          if (input.status) {
            query += " AND g.status = ?";
            params.push(input.status);
          }

          query += " ORDER BY g.data_criacao DESC LIMIT ? OFFSET ?";
          params.push(input.limit, input.offset);

          const resultado = await db.execute(query, params);

          logger.debug("Glosas listadas", {
            estabelecimentoId: input.estabelecimentoId,
            count: resultado.length,
          });

          return resultado;
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
          const resultado = await db.execute("SELECT * FROM glosa WHERE id = ?", [
            input.id,
          ]);
          return resultado[0] || null;
        },
        CACHE_TTL.GLOSA
      );
    }),

  /**
   * Atualizar glosa
   * - Invalida cache após atualização
   */
  update: trackedProtectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        status: z.string().optional(),
        descricao: z.string().optional(),
        estabelecimentoId: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_GLOSA_MODULO) {
        throw new Error("Módulo de glosa não ativado");
      }

      try {
        const db = await getDb();

        // Atualiza glosa
        await db.execute(
          `UPDATE glosa 
           SET status = ?, descricao = ?, data_atualizacao = NOW()
           WHERE id = ?`,
          [input.status, input.descricao, input.id]
        );

        // Invalida cache
        await invalidateGlosaCache(input.estabelecimentoId);

        logger.info("Glosa atualizada", {
          id: input.id,
          status: input.status,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error("Erro ao atualizar glosa", { error, input });
        throw error;
      }
    }),

  /**
   * Deletar glosa
   * - Invalida cache após deleção
   */
  delete: trackedProtectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        estabelecimentoId: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ENABLE_GLOSA_MODULO) {
        throw new Error("Módulo de glosa não ativado");
      }

      try {
        const db = await getDb();

        // Deleta glosa
        await db.execute("DELETE FROM glosa WHERE id = ?", [input.id]);

        // Invalida cache
        await invalidateGlosaCache(input.estabelecimentoId);

        logger.info("Glosa deletada", {
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error("Erro ao deletar glosa", { error, input });
        throw error;
      }
    }),

  /**
   * Obter estatísticas de glosa
   * Com cache de 2 horas
   */
  getEstatisticas: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        mes: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = `glosa:stats:${input.estabelecimentoId}:${input.mes || "all"}`;

      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();

          let query = `SELECT 
                       COUNT(*) as total,
                       SUM(CASE WHEN status = 'pendente' THEN 1 ELSE 0 END) as pendentes,
                       SUM(CASE WHEN status = 'aprovada' THEN 1 ELSE 0 END) as aprovadas,
                       SUM(CASE WHEN status = 'rejeitada' THEN 1 ELSE 0 END) as rejeitadas,
                       SUM(valor) as valor_total,
                       AVG(valor) as valor_medio
                       FROM glosa g
                       JOIN faturamento_tiss f ON g.faturamento_id = f.id
                       WHERE f.estabelecimento_id = ?`;
          const params: any[] = [input.estabelecimentoId];

          if (input.mes) {
            query += " AND f.mes_referencia = ?";
            params.push(input.mes);
          }

          const resultado = await db.execute(query, params);

          logger.debug("Estatísticas de glosa obtidas", {
            estabelecimentoId: input.estabelecimentoId,
          });

          return resultado[0] || {};
        },
        CACHE_TTL.GLOSA * 2 // 2 horas
      );
    }),
});

/**
 * Wrapper para fallback para monolito
 * Se procedure não existir aqui, tenta no monolito
 */
export async function glosaFallback(
  procedure: string,
  input: any,
  ctx: any
): Promise<any> {
  // TODO: Implementar fallback para monolito
  throw new Error(`Procedure ${procedure} não implementada em módulo glosa`);
}
