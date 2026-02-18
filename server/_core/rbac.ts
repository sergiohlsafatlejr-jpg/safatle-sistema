/**
 * Role-Based Access Control (RBAC)
 * Sistema único e consistente de permissões
 * 
 * Uso:
 * const hasAccess = await hasPermission(userId, estabelecimentoId, 'faturamento.edit');
 */

import { logger } from "./logger";

export type Permission =
  | "dashboard.view"
  | "arquivos.upload"
  | "arquivos.download"
  | "faturamento.view"
  | "faturamento.edit"
  | "faturamento.delete"
  | "comparacoes.view"
  | "comparacoes.create"
  | "glosas.view"
  | "glosas.create"
  | "glosas.edit"
  | "regras.view"
  | "regras.edit"
  | "permissoes.manage"
  | "auditoria.view";

export type Role =
  | "admin"
  | "faturista"
  | "gestor"
  | "recurso_glosa"
  | "visualizador"
  | "usuario_tasy";

// Mapeamento de roles para permissões
const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    "dashboard.view",
    "arquivos.upload",
    "arquivos.download",
    "faturamento.view",
    "faturamento.edit",
    "faturamento.delete",
    "comparacoes.view",
    "comparacoes.create",
    "glosas.view",
    "glosas.create",
    "glosas.edit",
    "regras.view",
    "regras.edit",
    "permissoes.manage",
    "auditoria.view",
  ],
  faturista: [
    "dashboard.view",
    "arquivos.upload",
    "arquivos.download",
    "faturamento.view",
    "faturamento.edit",
    "comparacoes.view",
    "comparacoes.create",
  ],
  gestor: [
    "dashboard.view",
    "faturamento.view",
    "comparacoes.view",
    "auditoria.view",
  ],
  recurso_glosa: [
    "dashboard.view",
    "glosas.view",
    "glosas.create",
    "glosas.edit",
  ],
  visualizador: [
    "dashboard.view",
  ],
  usuario_tasy: [
    "dashboard.view",
    "faturamento.view",
    "comparacoes.view",
  ],
};

// Cache de permissões (TTL: 5 minutos)
const permissionCache = new Map<
  string,
  {
    permissions: Permission[];
    expiresAt: number;
  }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obter permissões do usuário
 */
export async function getUserPermissions(
  userId: number,
  estabelecimentoId: number,
  grupoServico?: string
): Promise<Permission[]> {
  const cacheKey = `${userId}:${estabelecimentoId}`;

  // Verificar cache
  const cached = permissionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  try {
    // Se grupoServico for passado, usar direto
    // Senão, seria necessário buscar do banco
    const role = (grupoServico as Role) || "visualizador";
    const permissions = rolePermissions[role] || [];

    // Cachear
    permissionCache.set(cacheKey, {
      permissions,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return permissions;
  } catch (error) {
    logger.error({
      tipo: "rbac_error",
      userId,
      estabelecimentoId,
      erro: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Verificar se usuário tem permissão
 */
export async function hasPermission(
  userId: number,
  estabelecimentoId: number,
  permission: Permission,
  grupoServico?: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, estabelecimentoId, grupoServico);
  return permissions.includes(permission);
}

/**
 * Invalidar cache de permissões
 * Chamar quando permissões são alteradas
 */
export function invalidatePermissionCache(
  userId: number,
  estabelecimentoId: number
): void {
  const cacheKey = `${userId}:${estabelecimentoId}`;
  permissionCache.delete(cacheKey);
  logger.info({
    tipo: "cache_invalidated",
    userId,
    estabelecimentoId,
  });
}

/**
 * Limpar todo o cache
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
  logger.info({ tipo: "cache_cleared" });
}
