import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { rhFolhaPagamento } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const rhRouter = router({
  listFolha: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number().optional(),
      competencia: z.string().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let conditions = [];
      if (input.estabelecimentoId) {
        conditions.push(eq(rhFolhaPagamento.estabelecimentoId, input.estabelecimentoId));
      }
      if (input.competencia) {
        conditions.push(eq(rhFolhaPagamento.competencia, input.competencia));
      }
      
      const query = db.select().from(rhFolhaPagamento).orderBy(desc(rhFolhaPagamento.colaboradorNome));
      if (conditions.length > 0) {
        query.where(and(...conditions));
      }
      return await query;
    }),
    
  competencias: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number().optional()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const query = db
        .selectDistinct({ competencia: rhFolhaPagamento.competencia })
        .from(rhFolhaPagamento)
        .where(input.estabelecimentoId ? eq(rhFolhaPagamento.estabelecimentoId, input.estabelecimentoId) : undefined)
        .orderBy(desc(rhFolhaPagamento.competencia));
      return await query;
    }),
});
