import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listarFaturamentoExterno,
  listarConveniosExternos,
  importarFaturamentoExterno,
  excluirFaturamentoExterno,
  buscarTotaisFaturamentoExterno,
  buscarTotaisPorConvenioExterno,
} from "../faturamentoExterno";

export const faturamentoExternoRouter = router({
  listar: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        ano: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return listarFaturamentoExterno(input.estabelecimentoId, input.ano);
    }),

  listarConvenios: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return listarConveniosExternos(input.estabelecimentoId);
    }),

  importar: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        dados: z.array(
          z.object({
            convenio: z.string().min(1),
            mesAno: z.string().min(4), // "YYYY/MM"
            valorFaturado: z.number(),
            valorRecebido: z.number(),
          })
        ),
        arquivoOrigem: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user;
      return importarFaturamentoExterno(
        input.estabelecimentoId,
        input.dados,
        input.arquivoOrigem,
        user?.id || 0,
        user?.name || "Sistema"
      );
    }),

  excluir: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        estabelecimentoId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return excluirFaturamentoExterno(input.id, input.estabelecimentoId);
    }),

  totaisPorMes: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        ano: z.number(),
      })
    )
    .query(async ({ input }) => {
      return buscarTotaisFaturamentoExterno(input.estabelecimentoId, input.ano);
    }),

  totaisPorConvenio: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        ano: z.number(),
      })
    )
    .query(async ({ input }) => {
      return buscarTotaisPorConvenioExterno(input.estabelecimentoId, input.ano);
    }),
});
