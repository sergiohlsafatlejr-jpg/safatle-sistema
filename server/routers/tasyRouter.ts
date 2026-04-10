import { router, publicProcedure, protectedProcedure, trackedProtectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { syncRelatorioFinanceiroTasy } from "../services/syncTasyFinanceiro";
import { getDb } from "../db";
import { tasyRelatorioFinanceiroStaging } from "../../drizzle/schema-integracao";
import { desc, eq, and, sql } from "drizzle-orm";

/**
 * Router de Integração com Tasy
 * 
 * Este módulo implementa o Strangler Pattern:
 * - Novas procedures aqui
 * - Fallback para monolito se não encontrado
 * - Feature flag para rollout gradual
 */

export const tasyRouter = router({
  syncRelatorioFinanceiro: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      configId: z.number().nullable().optional(),
      dtInicial: z.string(), // DD/MM/YYYY
      dtFinal: z.string(),   // DD/MM/YYYY
    }))
    .mutation(async ({ input }) => {
      return await syncRelatorioFinanceiroTasy(
        input.estabelecimentoId, 
        input.configId || null, 
        input.dtInicial, 
        input.dtFinal
      );
    }),

  getRelatorioFinanceiro: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      limit: z.number().default(500),
      offset: z.number().default(0),
      competencia: z.string().optional(),
      conta: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if(!db) throw new Error("DB offline");

      let orderConditions = [desc(tasyRelatorioFinanceiroStaging.dtItem)];
      let whereConditions = [eq(tasyRelatorioFinanceiroStaging.estabelecimentoId, input.estabelecimentoId)];

      if(input.competencia) {
        whereConditions.push(eq(tasyRelatorioFinanceiroStaging.competencia, input.competencia));
      }
      if (input.conta) {
        whereConditions.push(eq(tasyRelatorioFinanceiroStaging.conta, input.conta));
      }

      const rows = await db.select()
        .from(tasyRelatorioFinanceiroStaging)
        .where(and(...whereConditions))
        .orderBy(...orderConditions)
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  getDashboardBI: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      anoInicial: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if(!db) throw new Error("DB offline");

      let whereConditions: any[] = [];
      if (input.estabelecimentoId > 0) {
        whereConditions.push(eq(tasyRelatorioFinanceiroStaging.estabelecimentoId, input.estabelecimentoId));
      }

      if (input.anoInicial) {
        whereConditions.push(sql`YEAR(${tasyRelatorioFinanceiroStaging.dtItem}) >= ${input.anoInicial}`);
      }

      const queryBuilder = db.select({
        competencia: tasyRelatorioFinanceiroStaging.competencia,
        convenio: tasyRelatorioFinanceiroStaging.convenio,
        setor: tasyRelatorioFinanceiroStaging.setor,
        vlProduzido: tasyRelatorioFinanceiroStaging.vlProduzido,
        vlPago: tasyRelatorioFinanceiroStaging.vlPago,
        vlGlosa: tasyRelatorioFinanceiroStaging.vlGlosa,
        aReceber: tasyRelatorioFinanceiroStaging.aReceber,
        motivoGlosa: tasyRelatorioFinanceiroStaging.motivoGlosa,
        descricao: tasyRelatorioFinanceiroStaging.descricao,
      })
      .from(tasyRelatorioFinanceiroStaging);

      const rows = whereConditions.length > 0 
        ? await queryBuilder.where(and(...whereConditions))
        : await queryBuilder;

      let totalFaturado = 0;
      let totalRecebido = 0;
      let totalGlosado = 0;
      let totalAReceber = 0;

      const mapMes = new Map<string, any>();
      const mapConvenio = new Map<string, any>();
      const mapSetor = new Map<string, any>();
      const mapMotivoGlosa = new Map<string, any>();
      const mapItensGlosa = new Map<string, any>();

      for (const r of rows) {
        const prod = Number(r.vlProduzido || 0);
        const pago = Number(r.vlPago || 0);
        const glosa = Number(r.vlGlosa || 0);
        const arec = Number(r.aReceber || 0);

        totalFaturado += prod;
        totalRecebido += pago;
        totalGlosado += glosa;
        totalAReceber += arec;

        const comp = r.competencia || 'Sem Data';
        if (!mapMes.has(comp)) {
          mapMes.set(comp, { competencia: comp, faturado: 0, recebido: 0, glosado: 0, a_receber: 0 });
        }
        const mObj = mapMes.get(comp);
        mObj.faturado += prod;
        mObj.recebido += pago;
        mObj.glosado += glosa;
        mObj.a_receber += arec;

        const conv = r.convenio || 'Sem Convênio';
        if (!mapConvenio.has(conv)) {
          mapConvenio.set(conv, { convenio: conv, faturado: 0, recebido: 0, glosado: 0, a_receber: 0 });
        }
        const cObj = mapConvenio.get(conv);
        cObj.faturado += prod;
        cObj.recebido += pago;
        cObj.glosado += glosa;
        cObj.a_receber += arec;

        const set = r.setor || 'Sem Setor';
        if (!mapSetor.has(set)) {
          mapSetor.set(set, { setor: set, faturado: 0, recebido: 0, glosado: 0, a_receber: 0 });
        }
        const sObj = mapSetor.get(set);
        sObj.faturado += prod;
        sObj.recebido += pago;
        sObj.glosado += glosa;
        sObj.a_receber += arec;

        if (glosa > 0) {
          const mGlosa = r.motivoGlosa || 'Sem Motivo Registrado';
          if (!mapMotivoGlosa.has(mGlosa)) {
            mapMotivoGlosa.set(mGlosa, { motivo: mGlosa, glosado: 0 });
          }
          mapMotivoGlosa.get(mGlosa).glosado += glosa;

          const desc = r.descricao || 'Item Desconhecido';
          if (!mapItensGlosa.has(desc)) {
            mapItensGlosa.set(desc, { item: desc, glosado: 0 });
          }
          mapItensGlosa.get(desc).glosado += glosa;
        }
      }

      return {
        kpis: {
          totalFaturado,
          totalRecebido,
          totalGlosado,
          totalAReceber
        },
        historicoMeses: Array.from(mapMes.values()).sort((a,b) => a.competencia.localeCompare(b.competencia)),
        porConvenio: Array.from(mapConvenio.values()).sort((a,b) => b.faturado - a.faturado),
        porSetor: Array.from(mapSetor.values()).sort((a,b) => b.faturado - a.faturado),
        porMotivoGlosa: Array.from(mapMotivoGlosa.values()).sort((a,b) => b.glosado - a.glosado),
        porItemGlosa: Array.from(mapItensGlosa.values()).sort((a,b) => b.glosado - a.glosado),
        contasAbertoPorConvenio: Array.from(mapConvenio.values()).filter(c => c.a_receber > 0).sort((a,b) => b.a_receber - a.a_receber)
      };
    }),
});

/**
 * Wrapper para fallback para monolito
 * Se procedure não existir aqui, tenta no monolito
 */
export async function tasyFallback(
  procedure: string,
  input: any,
  ctx: any
): Promise<any> {
  // TODO: Implementar fallback para monolito
  throw new Error(`Procedure {procedure} não implementada em módulo tasy`);
}
