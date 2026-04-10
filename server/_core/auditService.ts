import { getDb } from "../db";
import { auditLogs, InsertGlobalAuditLog } from "../../drizzle/schema";

export class AuditService {
  /**
   * Registra uma aÃ§Ã£o no log de auditoria global.
   * Feito de forma assÃ­ncrona (fire and forget) para nÃ£o bloquear a requisiÃ§Ã£o atual.
   */
  static logAcao(params: Omit<InsertGlobalAuditLog, "id" | "createdAt">) {
    this._logAcaoAsync(params).catch((err) => {
      console.error("[AuditService] Erro ao registrar log de auditoria:", err);
    });
  }

  private static async _logAcaoAsync(params: Omit<InsertGlobalAuditLog, "id" | "createdAt">) {
    const db = await getDb();
    if (!db) {
      console.warn("[AuditService] Banco indisponÃ­vel, log descartado.");
      return;
    }
    
    await db.insert(auditLogs).values(params);
  }
}
