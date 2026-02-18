import { TRPCError } from "@trpc/server";
import { logger } from "./logger";
import {
  temPermissao,
  type GrupoServico,
  type Modulo,
  type Acao,
} from "./permissionsConsolidated";

/**
 * Middleware de RBAC para tRPC
 * Valida permissões de usuário antes de executar procedures
 */

export interface RBACConfig {
  modulo: Modulo;
  acao: Acao;
  mensagem?: string;
}

/**
 * Cria middleware de RBAC para uma procedure
 */
export function criarMiddlewareRBAC(config: RBACConfig) {
  return async (opts: any) => {
    const { ctx, next, path } = opts;

    try {
      // Verificar se usuário está autenticado
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Usuário não autenticado",
        });
      }

      // Obter grupo de serviço do usuário
      const grupoServico = ctx.user.role as GrupoServico;

      // Verificar permissão
      const temAcesso = temPermissao(grupoServico, config.modulo, config.acao);

      if (!temAcesso) {
        logger.warn({
          tipo: "acesso_negado",
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          grupoServico,
          modulo: config.modulo,
          acao: config.acao,
          procedure: path,
          estabelecimentoId: ctx.estabelecimentoId,
        });

        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            config.mensagem ||
            `Acesso negado. Você não tem permissão para ${config.acao} em ${config.modulo}`,
        });
      }

      logger.info({
        tipo: "acesso_permitido",
        usuarioId: ctx.user.id,
        grupoServico,
        modulo: config.modulo,
        acao: config.acao,
        procedure: path,
      });

      return next();
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      logger.error({
        tipo: "rbac_middleware_erro",
        usuarioId: ctx.user?.id,
        erro: error instanceof Error ? error.message : String(error),
      });

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao validar permissões",
      });
    }
  };
}

/**
 * Factory para criar procedures com RBAC
 * Uso: rbacProcedure(config).input(...).mutation(...)
 */
export function criarProcedureComRBAC(
  t: any,
  config: RBACConfig
) {
  return t.procedure.use(criarMiddlewareRBAC(config));
}

/**
 * Validador de permissão para uso em procedures
 */
export async function validarPermissao(
  ctx: any,
  modulo: Modulo,
  acao: Acao,
  mensagem?: string
): Promise<void> {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Usuário não autenticado",
    });
  }

  const grupoServico = ctx.user.role as GrupoServico;
  const temAcesso = temPermissao(grupoServico, modulo, acao);

  if (!temAcesso) {
    logger.warn({
      tipo: "acesso_negado",
      usuarioId: ctx.user.id,
      grupoServico,
      modulo,
      acao,
    });

    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        mensagem ||
        `Acesso negado. Você não tem permissão para ${acao} em ${modulo}`,
    });
  }
}

/**
 * Mapeamento de procedures para RBAC
 * Define quais permissões cada procedure requer
 */
export const PROCEDURE_RBAC_MAP: Record<string, RBACConfig> = {
  // Faturamento
  "faturamento.create": {
    modulo: "faturamento",
    acao: "editar",
    mensagem: "Você não tem permissão para criar faturamentos",
  },
  "faturamento.update": {
    modulo: "faturamento",
    acao: "editar",
    mensagem: "Você não tem permissão para editar faturamentos",
  },
  "faturamento.delete": {
    modulo: "faturamento",
    acao: "excluir",
    mensagem: "Você não tem permissão para deletar faturamentos",
  },
  "faturamento.list": {
    modulo: "faturamento",
    acao: "visualizar",
  },

  // Glosa
  "glosa.create": {
    modulo: "recursosGlosa",
    acao: "editar",
    mensagem: "Você não tem permissão para criar recursos de glosa",
  },
  "glosa.update": {
    modulo: "recursosGlosa",
    acao: "editar",
    mensagem: "Você não tem permissão para editar recursos de glosa",
  },
  "glosa.delete": {
    modulo: "recursosGlosa",
    acao: "excluir",
    mensagem: "Você não tem permissão para deletar recursos de glosa",
  },
  "glosa.list": {
    modulo: "analiseGlosa",
    acao: "visualizar",
  },

  // Comparações
  "comparacoes.criar": {
    modulo: "comparacoes",
    acao: "editar",
    mensagem: "Você não tem permissão para criar comparações",
  },
  "comparacoes.listar": {
    modulo: "comparacoes",
    acao: "visualizar",
  },

  // Tasy
  "tasy.create": {
    modulo: "importacaoTasy",
    acao: "editar",
    mensagem: "Você não tem permissão para importar dados Tasy",
  },
  "tasy.list": {
    modulo: "contasFaturadas",
    acao: "visualizar",
  },

  // Relatórios
  "relatorios.create": {
    modulo: "relatoriosBi",
    acao: "editar",
    mensagem: "Você não tem permissão para criar relatórios",
  },
  "relatorios.list": {
    modulo: "relatoriosBi",
    acao: "visualizar",
  },

  // Auditoria
  "audit.listLogs": {
    modulo: "auditoria",
    acao: "visualizar",
    mensagem: "Você não tem permissão para acessar logs de auditoria",
  },
  "audit.exportCSV": {
    modulo: "auditoria",
    acao: "visualizar",
    mensagem: "Você não tem permissão para exportar logs de auditoria",
  },
};

/**
 * Obtém configuração de RBAC para uma procedure
 */
export function obterRBACConfig(procedurePath: string): RBACConfig | null {
  return PROCEDURE_RBAC_MAP[procedurePath] || null;
}

/**
 * Log de auditoria para tentativas de acesso negado
 */
export async function registrarAcessoNegado(
  usuarioId: number,
  usuarioNome: string | undefined,
  modulo: Modulo,
  acao: Acao,
  estabelecimentoId: number
): Promise<void> {
  logger.warn({
    tipo: "acesso_negado_auditado",
    usuarioId,
    usuarioNome,
    modulo,
    acao,
    estabelecimentoId,
    timestamp: new Date().toISOString(),
  });
}
