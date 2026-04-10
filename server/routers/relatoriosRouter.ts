import { router, publicProcedure, protectedProcedure, trackedProtectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Mapeamento de campos disponíveis para cada tabela
 */
export const CAMPOS_FATURAMENTO_TISS = {
  dataRegistro: "Data Registro",
  numeroGuiaPrestador: "Guia Prestador",
  numeroGuiaOperadora: "Guia Operadora",
  senha: "Senha",
  carteiraBeneficiario: "Carteira Beneficiário",
  tipoItem: "Tipo Item",
  dataExecucao: "Data Atendimento",
  codigoItem: "Código Item",
  descricaoItem: "Descrição Item",
  quantidade: "Quantidade",
  valorUnitario: "Valor Unitário",
  valorFaturado: "Valor Faturado",
  nomeProf: "Nome Profissional",
  conselhoProf: "Conselho Profissional",
  dataReferencia: "Data Referência",
};

export const CAMPOS_DEMONSTRATIVO = {
  numeroGuia: "Número Guia",
  protocolo: "Protocolo",
  lotePrestador: "Lote Prestador",
  dataPagamento: "Data Pagamento",
  carteiraBeneficiario: "Carteira Beneficiário",
  nomeBeneficiario: "Nome Beneficiário",
  codigoItem: "Código Item",
  descricaoItem: "Descrição Item",
  dataExecucao: "Data Atendimento",
  quantidade: "Quantidade",
  valorInformado: "Valor Informado",
  valorPago: "Valor Pago",
  valorGlosa: "Valor Glosa",
  codigoGlosa: "Código Glosa",
  situacaoItem: "Situação Item",
  tipoLancamento: "Tipo Lançamento",
  dataReferencia: "Data Referência",
};

/**
 * Router de Relatórios e análises
 * 
 * Este módulo implementa o Strangler Pattern:
 * - Novas procedures aqui
 * - Fallback para monolito se não encontrado
 * - Feature flag para rollout gradual
 */

export const relatoriosRouter = router({
  /**
   * Listar campos disponíveis para relatório
   */
  listarCampos: protectedProcedure.query(async () => {
    return {
      faturamentoTiss: Object.entries(CAMPOS_FATURAMENTO_TISS).map(([key, label]) => ({
        id: key,
        label,
        tabela: "staging_faturamento_xml",
      })),
      demonstrativo: Object.entries(CAMPOS_DEMONSTRATIVO).map(([key, label]) => ({
        id: key,
        label,
        tabela: "demonstrativo",
      })),
    };
  }),

  /**
   * Gerar relatório com campos selecionados
   */
  gerarRelatorio: protectedProcedure
    .input(
      z.object({
        camposSelecionados: z.array(
          z.object({
            id: z.string(),
            tabela: z.enum(["staging_faturamento_xml", "demonstrativo"]),
          })
        ),
        estabelecimentoId: z.number(),
        filtros: z.object({
          dataInicio: z.date().optional(),
          dataFim: z.date().optional(),
          convenioId: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Separar campos por tabela
        const camposFaturamento = input.camposSelecionados
          .filter((c) => c.tabela === "staging_faturamento_xml")
          .map((c) => c.id);

        const camposDemonstrativo = input.camposSelecionados
          .filter((c) => c.tabela === "demonstrativo")
          .map((c) => c.id);

        const dados: any[] = [];

        // Buscar dados de staging_faturamento_xml se houver campos selecionados
        if (camposFaturamento.length > 0) {
          const registrosFaturamento = await db.getRelatorioFaturamento(
            input.estabelecimentoId,
            input.filtros
          );

          for (const registro of registrosFaturamento) {
            const linha: any = {};
            for (const campo of camposFaturamento) {
              linha[CAMPOS_FATURAMENTO_TISS[campo as keyof typeof CAMPOS_FATURAMENTO_TISS]] =
                registro[campo as keyof typeof registro] || "";
            }
            dados.push(linha);
          }
        }

        // Buscar dados de demonstrativo se houver campos selecionados
        if (camposDemonstrativo.length > 0) {
          const registrosDemonstrativo = await db.getRelatorioDemonstrativo(
            input.estabelecimentoId,
            input.filtros
          );

          for (const registro of registrosDemonstrativo) {
            const linha: any = {};
            for (const campo of camposDemonstrativo) {
              linha[CAMPOS_DEMONSTRATIVO[campo as keyof typeof CAMPOS_DEMONSTRATIVO]] =
                registro[campo as keyof typeof registro] || "";
            }
            dados.push(linha);
          }
        }

        return {
          success: true,
          totalRegistros: dados.length,
          dados,
        };
      } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar relatório",
        });
      }
    }),
});

/**
 * Wrapper para fallback para monolito
 * Se procedure não existir aqui, tenta no monolito
 */
export async function relatoriosFallback(
  procedure: string,
  input: any,
  ctx: any
): Promise<any> {
  // TODO: Implementar fallback para monolito
  throw new Error(`Procedure ${procedure} não implementada em módulo relatorios`);
}
