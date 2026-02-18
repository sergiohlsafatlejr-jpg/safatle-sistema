/**
 * Procedures tRPC para faturamento
 * Separadas do monolito routers.ts
 */

import { protectedProcedure, router } from "@/server/_core/trpc";
import { logOperation, logError, logPerformance } from "@/server/_core/logger";
import { faturamentoSchemas } from "@/server/validators";
import * as db from "./db";

export const faturamentoRouter = router({
  list: protectedProcedure
    .input(faturamentoSchemas.filter)
    .query(async ({ ctx, input }) => {
      const inicio = Date.now();

      try {
        const items = await db.listFaturamentos(input);
        const total = await db.countFaturamentos(input);

        logPerformance("faturamento.list", Date.now() - inicio, {
          estabelecimentoId: input.estabelecimentoId,
          total,
        });

        return {
          items,
          total,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + items.length < total,
        };
      } catch (error) {
        logError("faturamento.list", error, { input });
        throw error;
      }
    }),

  getById: protectedProcedure
    .input(faturamentoSchemas.filter.pick({ estabelecimentoId: true }).extend({
      id: faturamentoSchemas.create.shape.valor.int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const faturamento = await db.getFaturamentoById(input.id);

        if (!faturamento) {
          throw new Error("Faturamento não encontrado");
        }

        return faturamento;
      } catch (error) {
        logError("faturamento.getById", error, { input });
        throw error;
      }
    }),

  create: protectedProcedure
    .input(faturamentoSchemas.create)
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await db.createFaturamento(input);

        logOperation(
          "faturamento.create",
          { id: result.id, valor: input.valor },
          ctx.user.id,
          input.estabelecimentoId
        );

        return result;
      } catch (error) {
        logError("faturamento.create", error, { input });
        throw error;
      }
    }),

  update: protectedProcedure
    .input(faturamentoSchemas.update)
    .mutation(async ({ ctx, input }) => {
      try {
        const novo = await db.updateFaturamento(input.id, input);

        logOperation(
          "faturamento.update",
          { id: input.id },
          ctx.user.id
        );

        return novo;
      } catch (error) {
        logError("faturamento.update", error, { input });
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(faturamentoSchemas.update.pick({ id: true }))
    .mutation(async ({ ctx, input }) => {
      try {
        await db.deleteFaturamento(input.id);

        logOperation(
          "faturamento.delete",
          { id: input.id },
          ctx.user.id
        );

        return { success: true };
      } catch (error) {
        logError("faturamento.delete", error, { input });
        throw error;
      }
    }),
});
