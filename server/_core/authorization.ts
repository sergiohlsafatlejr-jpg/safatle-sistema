/**
 * Middleware de autorização para procedures tRPC
 * 
 * Uso:
 * .use(requirePermission('faturamento.edit'))
 */

import { TRPCError } from "@trpc/server";
import { hasPermission, Permission } from "./rbac";
import { logger } from "./logger";

/**
 * Middleware que requer permissão específica
 */
export function requirePermission(permission: Permission) {
  return async (opts: any) => {
    const { ctx } = opts;

    // Obter estabelecimento do contexto
    const estabelecimentoId = ctx.estabelecimentoId || ctx.user?.estabelecimentoId;

    if (!estabelecimentoId) {
      logger.warn({
        tipo: "authorization_error",
        usuarioId: ctx.user?.id,
        motivo: "estabelecimento_nao_selecionado",
      });

      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Estabelecimento não selecionado",
      });
    }

    // Obter grupoServico do contexto ou user
    const grupoServico = ctx.user?.grupoServico || "visualizador";

    const hasAccess = await hasPermission(
      ctx.user.id,
      estabelecimentoId,
      permission,
      grupoServico
    );

    if (!hasAccess) {
      logger.warn({
        tipo: "authorization_denied",
        usuarioId: ctx.user.id,
        estabelecimentoId,
        permissao: permission,
      });

      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Permissão necessária: ${permission}`,
      });
    }

    return opts.next();
  };
}
