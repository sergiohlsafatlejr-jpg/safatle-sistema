/**
 * Middleware de auditoria automática
 * Registra todas as mudanças no banco de dados
 * 
 * Uso:
 * .use(withAudit('faturamentoTiss', 'INSERT'))
 * .mutation(async ({ ctx, input }) => {
 *   return db.createFaturamento(input);
 * })
 */

import { logAudit } from "./audit";
import { logger } from "./logger";

export function withAudit(
  tabela: string,
  tipoAcao: "INSERT" | "UPDATE" | "DELETE"
) {
  return async (opts: any) => {
    const { ctx, next } = opts;

    try {
      // Executar operação
      const resultado = await next();

      // Registrar auditoria
      if (resultado && typeof resultado === "object" && resultado.id) {
        await logAudit({
          tabela,
          registroId: resultado.id,
          tipoAcao,
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          valoresNovos: resultado,
          estabelecimentoId: ctx.estabelecimentoId,
        });

        logger.info({
          tipo: "auditoria_registrada",
          tabela,
          acao: tipoAcao,
          registroId: resultado.id,
          usuarioId: ctx.user.id,
        });
      }

      return resultado;
    } catch (error) {
      // Registrar erro também
      logger.error({
        tipo: "auditoria_erro",
        tabela,
        acao: tipoAcao,
        usuarioId: ctx.user.id,
        erro: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}
