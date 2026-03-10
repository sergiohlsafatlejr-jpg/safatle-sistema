import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  buscarCustosProdutos,
  buscarOpcoesFiltrosCustos,
  sincronizarCustosProdutos,
  obterStatusSincronizacaoCustos,
  buscarMetricasCustosDashboard,
  buscarComparacaoCustoConvenio,
} from "../relatorioCustos";

export const relatorioCustosRouter = router({
  buscar: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        tipoprod: z.string().optional(),
        codtbmm: z.string().optional(),
        busca: z.string().optional(),
        limit: z.number().min(1).max(500).optional(),
        offset: z.number().min(0).optional(),
      })
    )
    .query(async ({ input }) => {
      const { estabelecimentoId, ...filtros } = input;
      return buscarCustosProdutos(estabelecimentoId, filtros);
    }),

  opcoesFiltro: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return buscarOpcoesFiltrosCustos(input.estabelecimentoId);
    }),

  sincronizar: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return sincronizarCustosProdutos(
        input.estabelecimentoId,
        ctx.user.id,
        ctx.user.name || undefined
      );
    }),

  metricasDashboard: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        tipoprod: z.string().optional(),
        codtbmm: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { estabelecimentoId, ...filtros } = input;
      return buscarMetricasCustosDashboard(estabelecimentoId, filtros);
    }),

  statusSincronizacao: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return obterStatusSincronizacaoCustos(input.estabelecimentoId);
    }),

  comparacaoCustoConvenio: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        tipoprod: z.string().optional(),
        codtbmm: z.string().optional(),
        busca: z.string().optional(),
        apenasComPrejuizo: z.boolean().optional(),
        limit: z.number().min(1).max(500).optional(),
        offset: z.number().min(0).optional(),
      })
    )
    .query(async ({ input }) => {
      const { estabelecimentoId, ...filtros } = input;
      return buscarComparacaoCustoConvenio(estabelecimentoId, filtros);
    }),
});
