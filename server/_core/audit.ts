/**
 * Sistema centralizado de auditoria
 * Registra todas as mudanças no banco de dados
 * 
 * Uso:
 * await logAudit({
 *   tabela: 'faturamentoTiss',
 *   registroId: result.id,
 *   tipoAcao: 'INSERT',
 *   usuarioId: ctx.user.id,
 *   usuarioNome: ctx.user.name,
 *   valoresNovos: result,
 * });
 */

import { logger } from "./logger";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface AuditEntry {
  tabela: string;
  registroId: number;
  tipoAcao: AuditAction;
  usuarioId: number;
  usuarioNome?: string;
  valoresAnteriores?: any;
  valoresNovos?: any;
  ipUsuario?: string;
  userAgent?: string;
  estabelecimentoId?: number;
}

/**
 * Registrar mudança no log de auditoria
 * Não quebra a operação se falhar
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    // TODO: Implementar insert na tabela auditLog quando tabela for criada
    // await db.insert(auditLog).values({...})
    
    logger.info({
      tipo: "audit",
      tabela: entry.tabela,
      acao: entry.tipoAcao,
      usuarioId: entry.usuarioId,
      registroId: entry.registroId,
    });
  } catch (error) {
    // Não quebrar a operação se auditoria falhar
    logger.error({
      tipo: "audit_error",
      tabela: entry.tabela,
      erro: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Comparar valores anterior e novo
 * Retorna apenas os campos que mudaram
 */
export function getChanges(
  anterior: Record<string, any> | null,
  novo: Record<string, any> | null
): Record<string, { antes: any; depois: any }> {
  if (!anterior || !novo) {
    return {};
  }

  const changes: Record<string, { antes: any; depois: any }> = {};

  // Verificar campos que mudaram
  for (const key in novo) {
    if (JSON.stringify(anterior[key]) !== JSON.stringify(novo[key])) {
      changes[key] = {
        antes: anterior[key],
        depois: novo[key],
      };
    }
  }

  // Verificar campos que foram removidos
  for (const key in anterior) {
    if (!(key in novo)) {
      changes[key] = {
        antes: anterior[key],
        depois: null,
      };
    }
  }

  return changes;
}
