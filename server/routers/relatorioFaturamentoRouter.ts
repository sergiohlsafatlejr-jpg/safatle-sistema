import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { buscarRelatorioFaturamento, listarConveniosDisponiveis, buscarTabelaPorConvenio } from "../relatorioFaturamento";

export const relatorioFaturamentoRouter = router({
  buscar: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        anoAtual: z.number().optional(),
        anoAnterior: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return buscarRelatorioFaturamento(input);
    }),

  listarConvenios: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return listarConveniosDisponiveis(input.estabelecimentoId);
    }),

  buscarPorConvenio: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        anoAtual: z.number(),
        anoAnterior: z.number(),
        convenio: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      return buscarTabelaPorConvenio(input);
    }),
});
