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

  /**
   * Dashboard de Protocolos TASY
   * Dados da tabela tasy_protocolo_bi (staging BI)
   * 4 Abas: Por Convênio, Previsão Recebimentos, Por Tipo, Sem Título
   */
  /** Lista períodos disponíveis na tabela tasy_protocolo_bi */
  getProtocoloPeriodos: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB offline");
      if (!input.estabelecimentoId || input.estabelecimentoId <= 0) {
        return [];
      }
      const estabId = Number(input.estabelecimentoId);
      const rows = await db.execute(sql.raw(`
        SELECT SUBSTRING(DT_MESANO_REFERENCIA, 1, 7) as periodo_mes, COUNT(*) as qtd,
               SUM(CAST(VL_PROTOCOLO AS DECIMAL(25,2))) as valor_total
        FROM tasy_protocolo_bi
        WHERE estabelecimentoId = ${estabId}
        GROUP BY SUBSTRING(DT_MESANO_REFERENCIA, 1, 7)
        ORDER BY periodo_mes DESC
      `)) as any;
      return ((rows[0] || []) as any[]).map((r: any) => ({
        periodo: r.periodo_mes as string,
        qtd: Number(r.qtd),
        valorTotal: Number(r.valor_total || 0),
      }));
    }),

  getDashboardProtocolos: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      periodos: z.array(z.string()).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB offline");
      if (!input.estabelecimentoId || input.estabelecimentoId <= 0) {
        return { porConvenio: [], previsaoRecebimentos: [], porTipo: [], semTitulo: [], totalGeral: 0, totalProtocolos: 0 };
      }
      const estabId = Number(input.estabelecimentoId);

      // Buscar registros segmentando via estabelecimento
      let queryStr = `SELECT * FROM tasy_protocolo_bi WHERE estabelecimentoId = ${estabId}`;
      if (input.periodos && input.periodos.length > 0) {
        const conditions = input.periodos.map(p => `DT_MESANO_REFERENCIA LIKE '${p.replace(/'/g, "''")}%'`);
        queryStr += ` AND (${conditions.join(' OR ')})`;
      }
      const rows = await db.execute(sql.raw(queryStr)) as any;
      const dados = (rows[0] || []) as any[];

      // ============ ABA 1: POR CONVÊNIO ============
      const mapConvenio = new Map<string, { convenio: string; faturado: number; qtdProtocolos: number; definitivo: number; provisorio: number; perda: number; outros: number }>();
      
      // ============ ABA 2: PREVISÃO DE RECEBIMENTOS ============
      const mapVencimento = new Map<string, { mes: string; valor: number; qtd: number }>();
      
      // ============ ABA 3: POR TIPO ============
      const mapTipo = new Map<string, { tipo: string; valor: number; qtd: number }>();
      
      // ============ ABA 4: SEM TÍTULO ============
      const semTitulo: any[] = [];
      
      let totalGeral = 0;
      let totalProtocolos = dados.length;

      for (const r of dados) {
        const valor = parseFloat(r.VL_PROTOCOLO || '0');
        const convenio = r.DS_CONVENIO || 'Sem Convênio';
        const status = r.STATUS_PROTOCOLO || 'OUTROS';
        const tipo = r.TIPO || 'OUTROS';
        const vencTitulo = r.VENC_TITULO || null;
        const nrTitulo = r.NR_TITULO;
        const docConv = r.DOC_CONV;

        totalGeral += valor;

        // Aba 1: Agrupar por convênio
        if (!mapConvenio.has(convenio)) {
          mapConvenio.set(convenio, { convenio, faturado: 0, qtdProtocolos: 0, definitivo: 0, provisorio: 0, perda: 0, outros: 0 });
        }
        const convObj = mapConvenio.get(convenio)!;
        convObj.faturado += valor;
        convObj.qtdProtocolos += 1;
        if (status === 'DEFINITIVO') convObj.definitivo += 1;
        else if (status === 'PROVISORIO') convObj.provisorio += 1;
        else if (status === 'PERDA') convObj.perda += 1;
        else convObj.outros += 1;

        // Aba 2: Agrupar por mês de vencimento do título
        if (vencTitulo) {
          // Formato Oracle: "29-JUL-26" ou "30-MAY-26"
          const mesLabel = vencTitulo; // Manter original para agrupar
          const parts = vencTitulo.split('-');
          const mesKey = parts.length >= 2 ? `${parts[1]}-${parts[2]}` : vencTitulo;
          
          if (!mapVencimento.has(mesKey)) {
            mapVencimento.set(mesKey, { mes: mesKey, valor: 0, qtd: 0 });
          }
          const vObj = mapVencimento.get(mesKey)!;
          vObj.valor += valor;
          vObj.qtd += 1;
        }

        // Aba 3: Agrupar por tipo (INTERNADOS, EXAMES EXTERNOS, etc)
        if (!mapTipo.has(tipo)) {
          mapTipo.set(tipo, { tipo, valor: 0, qtd: 0 });
        }
        const tObj = mapTipo.get(tipo)!;
        tObj.valor += valor;
        tObj.qtd += 1;

        // Aba 4: Protocolos sem título ou sem doc convênio
        if (!nrTitulo || nrTitulo === '' || nrTitulo === 'null' || !docConv || docConv === '' || docConv === 'null') {
          semTitulo.push({
            convenio,
            tipo,
            status,
            protocolo: r.NR_PROTOCOLO || '',
            seqProtocolo: r.NR_SEQ_PROTOCOLO || '',
            valor,
            dtEmissao: r.DT_EMISSAO || '',
            dtDefinitivo: r.DT_DEFINITIVO || '',
            dtEnvio: r.DT_ENVIO || '',
            vencProt: r.VENC_PROT || '',
            nrTitulo: nrTitulo || null,
            docConv: docConv || null,
          });
        }
      }

      return {
        kpis: {
          totalGeral,
          totalProtocolos,
          totalSemTitulo: semTitulo.length,
          totalDefinitivo: dados.filter(d => d.STATUS_PROTOCOLO === 'DEFINITIVO').length,
          totalProvisorio: dados.filter(d => d.STATUS_PROTOCOLO === 'PROVISORIO').length,
        },
        porConvenio: Array.from(mapConvenio.values()).sort((a, b) => b.faturado - a.faturado),
        previsaoRecebimentos: Array.from(mapVencimento.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
        porTipo: Array.from(mapTipo.values()).sort((a, b) => b.valor - a.valor),
        semTitulo: semTitulo.sort((a, b) => b.valor - a.valor),
      };
    }),

  /** BI - Previsão de Recebimentos */
  getPrevisaoRecebimentos: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB offline");
      if (!input.estabelecimentoId || input.estabelecimentoId <= 0) {
        return { porMesReferencia: [], porMesVencimento: [], porConvenio: [], resumo: {} };
      }
      const estabId = Number(input.estabelecimentoId);

      const rows = await db.execute(sql.raw(
        `SELECT DS_CONVENIO, DT_MESANO_REFERENCIA, VL_PROTOCOLO, VENC_TITULO, STATUS_PROTOCOLO, NR_SEQ_PROTOCOLO
         FROM tasy_protocolo_bi WHERE estabelecimentoId = ${estabId}`
      )) as any;
      const dados = (rows[0] || []) as any[];

      // Mapa por mês de referência (competência)
      const mapRef = new Map<string, { mes: string; valor: number; qtd: number }>();
      // Mapa por mês de vencimento (projeção)
      const mapVenc = new Map<string, { mes: string; valor: number; qtd: number }>();
      // Mapa por convênio
      const mapConv = new Map<string, { convenio: string; valorRef: number; valorProj: number; qtd: number }>();
      // Mapa cruzado mês×convênio (para filtros dinâmicos)
      const mapVencConv = new Map<string, { mes: string; convenio: string; valor: number; qtd: number }>();

      let totalFaturado = 0;
      let totalProjetado = 0;
      let totalSemVencimento = 0;
      let qtdProtocolos = 0;

      for (const r of dados) {
        const valor = parseFloat(r.VL_PROTOCOLO || '0');
        const convenio = r.DS_CONVENIO || 'Sem Convênio';
        const dtRef = r.DT_MESANO_REFERENCIA ? String(r.DT_MESANO_REFERENCIA).substring(0, 7) : null;
        const dtVenc = r.VENC_TITULO ? String(r.VENC_TITULO).substring(0, 7) : null;

        qtdProtocolos++;
        totalFaturado += valor;

        // Agrupar por mês de referência
        if (dtRef) {
          if (!mapRef.has(dtRef)) mapRef.set(dtRef, { mes: dtRef, valor: 0, qtd: 0 });
          const ref = mapRef.get(dtRef)!;
          ref.valor += valor;
          ref.qtd++;
        }

        // Agrupar por mês de vencimento
        if (dtVenc) {
          if (!mapVenc.has(dtVenc)) mapVenc.set(dtVenc, { mes: dtVenc, valor: 0, qtd: 0 });
          const venc = mapVenc.get(dtVenc)!;
          venc.valor += valor;
          venc.qtd++;
          totalProjetado += valor;
          // Cruzamento mês×convênio
          const chave = `${dtVenc}|${convenio}`;
          if (!mapVencConv.has(chave)) mapVencConv.set(chave, { mes: dtVenc, convenio, valor: 0, qtd: 0 });
          const vc = mapVencConv.get(chave)!;
          vc.valor += valor;
          vc.qtd++;
        } else {
          totalSemVencimento += valor;
        }

        // Agrupar por convênio
        if (!mapConv.has(convenio)) mapConv.set(convenio, { convenio, valorRef: 0, valorProj: 0, qtd: 0 });
        const conv = mapConv.get(convenio)!;
        conv.valorRef += valor;
        conv.qtd++;
        if (dtVenc) conv.valorProj += valor;
      }

      return {
        porMesReferencia: Array.from(mapRef.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
        porMesVencimento: Array.from(mapVenc.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
        porConvenio: Array.from(mapConv.values()).sort((a, b) => b.valorRef - a.valorRef),
        vencimentoPorConvenio: Array.from(mapVencConv.values()).sort((a, b) => a.mes.localeCompare(b.mes)),
        resumo: {
          totalFaturado,
          totalProjetado,
          totalSemVencimento,
          qtdProtocolos,
        },
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
