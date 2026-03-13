import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { buscarRelatorioFaturamento } from "../relatorioFaturamento";

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
});
