import { router, trackedProtectedProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import { sql } from "drizzle-orm";
import {
  cacheGetOrSet,
  invalidateMotorRegrasCache,
  generateMotorRegrasKey,
  CACHE_TTL,
} from "../_core/cache";

const ENABLE_MOTOR_REGRAS = process.env.ENABLE_MODULO_MOTOR_REGRAS === "true";

/**
 * Router do Motor de Regras
 * Gerencia histórico de validações XML e análise de conformidade
 */
export const motorRegrasRouter = router({
  /**
   * Salvar validação XML no histórico
   */
  salvarValidacao: trackedProtectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        nomeArquivo: z.string().min(1),
        totalContas: z.number().min(0),
        contasValidas: z.number().min(0),
        contasInvalidas: z.number().min(0),
        scoreConformidadeMedio: z.number().min(0).max(100),
        resultadoCompleto: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const resultado = await db.execute(
          sql`INSERT INTO historicoValidacaoXml 
              (estabelecimentoId, nomeArquivo, dataProcessamento, totalContas, contasValidas, contasInvalidas, scoreConformidadeMedio, resultadoCompleto, usuarioId)
              VALUES 
              (${input.estabelecimentoId}, ${input.nomeArquivo}, NOW(), ${input.totalContas}, ${input.contasValidas}, ${input.contasInvalidas}, ${input.scoreConformidadeMedio}, ${JSON.stringify(input.resultadoCompleto || {})}, ${ctx.user.id})`
        );

        const estabelecimentoId = input.estabelecimentoId;
        if (estabelecimentoId) {
          await invalidateMotorRegrasCache(estabelecimentoId);
        }

        logger.info({
          message: "Validação XML salva no histórico",
          estabelecimentoId: input.estabelecimentoId,
          nomeArquivo: input.nomeArquivo,
          totalContas: input.totalContas,
          scoreConformidade: input.scoreConformidadeMedio,
          usuarioId: ctx.user.id,
        });

        return {
          id: Number((resultado as any)[0]?.insertId || 0),
          status: "sucesso",
        };
      } catch (error) {
        logger.error({
          message: "Erro ao salvar validação XML",
          error: String(error),
          input,
        });
        throw error;
      }
    }),

  /**
   * Listar histórico de validações com filtros
   */
  listarHistorico: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        usuarioId: z.number().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = generateMotorRegrasKey(
        input.estabelecimentoId,
        "historico"
      );

      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          if (!db) return [];

          let query = sql`SELECT * FROM historicoValidacaoXml WHERE estabelecimentoId = ${input.estabelecimentoId}`;

          if (input.dataInicio) {
            query = sql`${query} AND dataProcessamento >= ${input.dataInicio}`;
          }

          if (input.dataFim) {
            query = sql`${query} AND dataProcessamento <= ${input.dataFim}`;
          }

          if (input.usuarioId) {
            query = sql`${query} AND usuarioId = ${input.usuarioId}`;
          }

          const resultado = await db.execute(
            sql`${query} ORDER BY dataProcessamento DESC LIMIT ${input.limit} OFFSET ${input.offset}`
          );

          return Array.isArray(resultado) ? resultado : [];
        },
        CACHE_TTL.MOTOR_REGRAS
      );
    }),

  /**
   * Obter validação por ID
   */
  obterValidacao: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ input }) => {
      const cacheKey = `validacao-xml:${input.id}`;

      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          if (!db) return null;

          const resultado = await db.execute(
            sql`SELECT * FROM historicoValidacaoXml WHERE id = ${input.id} LIMIT 1`
          );

          return Array.isArray(resultado) && resultado.length > 0
            ? resultado[0]
            : null;
        },
        CACHE_TTL.MOTOR_REGRAS
      );
    }),

  /**
   * Obter estatísticas de conformidade
   */
  obterEstatisticas: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number().positive(),
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const cacheKey = generateMotorRegrasKey(
        input.estabelecimentoId,
        "estatisticas"
      );

      return cacheGetOrSet(
        cacheKey,
        async () => {
          const db = await getDb();
          if (!db)
            return {
              totalValidacoes: 0,
              totalContas: 0,
              contasValidas: 0,
              contasInvalidas: 0,
              scoreConformidadeMedia: 0,
              taxaConformidade: 0,
            };

          let query = sql`SELECT 
            COUNT(*) as totalValidacoes,
            SUM(totalContas) as totalContas,
            SUM(contasValidas) as contasValidas,
            SUM(contasInvalidas) as contasInvalidas,
            AVG(scoreConformidadeMedio) as scoreConformidadeMedia
            FROM historicoValidacaoXml 
            WHERE estabelecimentoId = ${input.estabelecimentoId}`;

          if (input.dataInicio) {
            query = sql`${query} AND dataProcessamento >= ${input.dataInicio}`;
          }

          if (input.dataFim) {
            query = sql`${query} AND dataProcessamento <= ${input.dataFim}`;
          }

          const resultado = await db.execute(query);

          if (!Array.isArray(resultado) || !resultado[0]) {
            return {
              totalValidacoes: 0,
              totalContas: 0,
              contasValidas: 0,
              contasInvalidas: 0,
              scoreConformidadeMedia: 0,
              taxaConformidade: 0,
            };
          }

          const stats = resultado[0] as any;
          const totalContas = Number(stats.totalContas) || 0;
          const contasValidas = Number(stats.contasValidas) || 0;

          return {
            totalValidacoes: Number(stats.totalValidacoes) || 0,
            totalContas,
            contasValidas,
            contasInvalidas: Number(stats.contasInvalidas) || 0,
            scoreConformidadeMedia: Number(stats.scoreConformidadeMedia) || 0,
            taxaConformidade:
              totalContas > 0 ? (contasValidas / totalContas) * 100 : 0,
          };
        },
        CACHE_TTL.MOTOR_REGRAS
      );
    }),

  /**
   * Deletar validação (admin only)
   */
  deletarValidacao: trackedProtectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new Error("Apenas admin pode deletar validações");
      }

      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const validacao = await db.execute(
          sql`SELECT estabelecimentoId FROM historicoValidacaoXml WHERE id = ${input.id} LIMIT 1`
        );

        if (!Array.isArray(validacao) || !validacao[0]) {
          throw new Error("Validação não encontrada");
        }

        await db.execute(
          sql`DELETE FROM historicoValidacaoXml WHERE id = ${input.id}`
        );

        const estabelecimentoId = (validacao[0] as any).estabelecimentoId;
        if (estabelecimentoId) {
          await invalidateMotorRegrasCache(estabelecimentoId);
        }

        logger.info({
          message: "Validação XML deletada",
          id: input.id,
          usuarioId: ctx.user.id,
        });

        return { id: input.id, status: "sucesso" };
      } catch (error) {
        logger.error({
          message: "Erro ao deletar validação",
          error: String(error),
          input,
        });
        throw error;
      }
    }),
});
