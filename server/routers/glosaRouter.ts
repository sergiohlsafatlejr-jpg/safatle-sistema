import { router, publicProcedure, protectedProcedure, trackedProtectedProcedure } from "../_core/trpc";
import { z } from "zod";

/**
 * Router de Análise e gestão de glosas
 * 
 * Este módulo implementa o Strangler Pattern:
 * - Novas procedures aqui
 * - Fallback para monolito se não encontrado
 * - Feature flag para rollout gradual
 */

export const glosaRouter = router({
  // TODO: Adicionar procedures de glosa
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
export async function glosaFallback(
  procedure: string,
  input: any,
  ctx: any
): Promise<any> {
  // TODO: Implementar fallback para monolito
  throw new Error(`Procedure {procedure} não implementada em módulo glosa`);
}
