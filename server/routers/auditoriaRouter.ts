import { router, publicProcedure, protectedProcedure, trackedProtectedProcedure } from "../_core/trpc";
import { z } from "zod";

/**
 * Router de Logs e auditoria de operações
 * 
 * Este módulo implementa o Strangler Pattern:
 * - Novas procedures aqui
 * - Fallback para monolito se não encontrado
 * - Feature flag para rollout gradual
 */

export const auditoriaRouter = router({
  // TODO: Adicionar procedures de auditoria
  // Exemplo:
  // create: trackedProtectedProcedure
  //   .input(z.object({ /* campos */ }))
  //   .mutation(async ({ input, ctx }) => {
  //     // Implementação
  //   }),
});

/**
 * Wrapper para fallback para monolito
 * Se procedure não existir aqui, tenta no monolito
 */
export async function auditoriaFallback(
  procedure: string,
  input: any,
  ctx: any
): Promise<any> {
  // TODO: Implementar fallback para monolito
  throw new Error(`Procedure {procedure} não implementada em módulo auditoria`);
}
