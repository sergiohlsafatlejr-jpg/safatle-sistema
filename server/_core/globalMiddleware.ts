/**
 * Middlewares Globais
 * Aplicados automaticamente a TODAS as procedures
 * Sem necessidade de editar routers.ts
 */

import { logger } from "./logger";
import { logAudit } from "./audit";

/**
 * Middleware de Logging Global
 * Registra todas as operações (queries e mutations)
 */
export function loggingMiddleware() {
  return async (opts: any) => {
    const { path, type, input, ctx, next } = opts;
    const inicio = Date.now();

    try {
      // Executar operação
      const resultado = await next();

      // Log de sucesso
      const duracao = Date.now() - inicio;
      logger.info({
        tipo: "operacao_sucesso",
        path,
        tipoOperacao: type,
        duracao,
        usuarioId: ctx.user?.id,
        estabelecimentoId: ctx.estabelecimentoId,
      });

      return resultado;
    } catch (error) {
      // Log de erro
      const duracao = Date.now() - inicio;
      logger.error({
        tipo: "operacao_erro",
        path,
        tipoOperacao: type,
        duracao,
        usuarioId: ctx.user?.id,
        estabelecimentoId: ctx.estabelecimentoId,
        erro: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}

/**
 * Middleware de Auditoria Global
 * Registra todas as mutations (CREATE, UPDATE, DELETE)
 */
export function auditMiddleware() {
  return async (opts: any) => {
    const { path, type, input, ctx, next } = opts;

    // Só auditar mutations
    if (type !== "mutation") {
      return next();
    }

    try {
      // Executar operação
      const resultado = await next();

      // Determinar tipo de ação baseado no nome da procedure
      let tipoAcao: "INSERT" | "UPDATE" | "DELETE" = "UPDATE";
      if (path.includes("create") || path.includes("criar")) tipoAcao = "INSERT";
      if (path.includes("delete") || path.includes("deletar")) tipoAcao = "DELETE";

      // Registrar auditoria
      if (resultado && typeof resultado === "object") {
        const registroId = resultado.id || resultado.comparacaoId || 0;

        if (registroId > 0) {
          await logAudit({
            tabela: path.split(".")[0], // Ex: "comparacoes", "glosa"
            registroId,
            tipoAcao,
            usuarioId: ctx.user?.id || 0,
            usuarioNome: ctx.user?.name,
            valoresNovos: resultado,
            estabelecimentoId: ctx.estabelecimentoId,
          });

          logger.info({
            tipo: "auditoria_registrada",
            tabela: path.split(".")[0],
            acao: tipoAcao,
            registroId,
            usuarioId: ctx.user?.id,
          });
        }
      }

      return resultado;
    } catch (error) {
      logger.error({
        tipo: "auditoria_erro",
        path,
        usuarioId: ctx.user?.id,
        erro: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  };
}

/**
 * Middleware de Validação de Permissões
 * Valida se usuário tem permissão para a operação
 */
export function permissaoMiddleware() {
  return async (opts: any) => {
    const { path, ctx, next } = opts;

    // Verificar se usuário está autenticado
    if (!ctx.user) {
      throw new Error("Usuário não autenticado");
    }

    // Verificar se tem estabelecimento
    if (!ctx.estabelecimentoId) {
      throw new Error("Estabelecimento não configurado");
    }

    return next();
  };
}
