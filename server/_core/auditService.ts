import { getDb } from "../db";
import { auditLogs, InsertAuditLog } from "../../drizzle/schema";

export class AuditService {
  /**
   * Registra uma ação no log de auditoria global.
   * Feito de forma assíncrona (fire and forget) para não bloquear a requisição atual.
   */
  static logAcao(params: Omit<InsertAuditLog, "id" | "createdAt">) {
    this._logAcaoAsync(params).catch((err) => {
      console.error("[AuditService] Erro ao registrar log de auditoria:", err);
    });
  }

  private static async _logAcaoAsync(params: Omit<InsertAuditLog, "id" | "createdAt">) {
    const db = await getDb();
    if (!db) {
      console.warn("[AuditService] Banco indisponível, log descartado.");
      return;
    }
    
    await db.insert(auditLogs).values(params);
  }
}
