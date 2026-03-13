import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  buscarRelatorioFaturamento,
  listarConveniosDisponiveis,
  buscarTabelaPorConvenio,
  buscarDetalheMesConvenio,
  buscarTabelaPorSetor,
  buscarTabelaPorTipoAtendimento,
} from "../relatorioFaturamento";

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

  buscarPorSetor: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        anoAtual: z.number(),
        anoAnterior: z.number(),
        setor: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      return buscarTabelaPorSetor(input);
    }),

  buscarPorTipoAtendimento: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        anoAtual: z.number(),
        anoAnterior: z.number(),
        tipoAtendimento: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      return buscarTabelaPorTipoAtendimento(input);
    }),

  detalheMesConvenio: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        anoAtual: z.number(),
        anoAnterior: z.number(),
        mes: z.string().min(1).max(2),
      })
    )
    .query(async ({ input }) => {
      return buscarDetalheMesConvenio(input);
    }),
});
