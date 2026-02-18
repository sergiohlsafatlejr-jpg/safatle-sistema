import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { logger } from "./logger";
import { logAudit } from "./audit";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ============ MIDDLEWARES GLOBAIS ============

/**
 * Middleware de Logging
 * Registra todas as operações (queries e mutations)
 */
const loggingMiddleware = t.middleware(async (opts) => {
  const { path, type, input, ctx, next } = opts;
  const inicio = Date.now();

  try {
    const resultado = await next();
    
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
    const duracao = Date.now() - inicio;
    logger.error({
      tipo: "operacao_erro",
      path,
      tipoOperacao: type,
      duracao,
      usuarioId: ctx.user?.id,
      erro: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

/**
 * Middleware de Auditoria
 * Registra mudanças no banco (apenas mutations)
 */
const auditMiddleware = t.middleware(async (opts) => {
  const { path, type, input, ctx, next } = opts;

  // Só auditar mutations
  if (type !== "mutation") {
    return next();
  }

  try {
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
          tabela: path.split(".")[0],
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
});

/**
 * Middleware de Validação de Permissões
 * Valida se usuário tem acesso
 */
const permissaoMiddleware = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Usuário não autenticado",
    });
  }

  // Estabelecimento é opcional para algumas procedures
  // if (!ctx.estabelecimentoId) {
  //   throw new TRPCError({
  //     code: "FORBIDDEN",
  //     message: "Estabelecimento não configurado",
  //   });
  // }

  return next();
});

// ============ PROCEDURES COM MIDDLEWARES ============

/**
 * Procedure com logging, auditoria e permissões
 */
export const trackedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(auditMiddleware)
  .use(permissaoMiddleware);

/**
 * Procedure protegida com logging, auditoria e permissões
 */
export const trackedProtectedProcedure = t.procedure
  .use(requireUser)
  .use(loggingMiddleware)
  .use(auditMiddleware)
  .use(permissaoMiddleware);
