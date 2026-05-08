import { router, publicProcedure, protectedProcedure, trackedProtectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { syncRelatorioFinanceiroTasy } from "../services/syncTasyFinanceiro";
import { getDb } from "../db";
import { tasyRelatorioFinanceiroStaging } from "../../drizzle/schema-integracao";
import { desc, eq, and, sql } from "drizzle-orm";

/** Helper para normalizar datas do formato YYYY-MM-DD ou DD-MON-YY para YYYY-MM */
function parseOracleMesAno(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  
  // Formato YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 7);
  }
  
  // Formato DD-MON-YY ou DD-MON-YYYY (ex: 01-JAN-25)
  const monthMap: Record<string, string> = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
  };
  
  const m = s.match(/^\d{2}-([a-zA-Z]{3})-(\d{2,4})/);
  if (m) {
    const mon = m[1].toUpperCase();
    let yy = m[2];
    if (yy.length === 2) {
      yy = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
    }
    const mm = monthMap[mon] || '01';
    return `${yy}-${mm}`;
  }
  
  // Tentar extrair algo que pareça AAAA-MM
  const fallback = s.match(/(\d{4})[-/]?(\d{2})/);
  if (fallback) {
    return `${fallback[1]}-${fallback[2]}`;
  }
  
  return s.substring(0, 7);
}

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
          totalProvisorio,
          totalAReceber,
          totalRecebido,
          totalGlosado,
          totalMedico,
          qtdTotal,
          qtdGlosados,
          taxaGlosa
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
          const mesKey = parseOracleMesAno(vencTitulo) || vencTitulo.substring(0, 7);
          
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
        const dtRef = parseOracleMesAno(r.DT_MESANO_REFERENCIA);
        const dtVenc = parseOracleMesAno(r.VENC_TITULO);

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

  /**
   * Dashboard de BI de Pagamentos
   * Dados da tabela tasy_pagamentos_bi
   */
  getPagamentosBi: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number()
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB offline");
      if (!input.estabelecimentoId || input.estabelecimentoId <= 0) {
        return { resumo: {}, porMes: [], porConvenio: [], pagamentosPorConvenio: [] };
      }
      const estabId = Number(input.estabelecimentoId);

      // Buscar registros segmentando via estabelecimento
      const rows = await db.execute(sql.raw(`SELECT * FROM tasy_pagamentos_bi WHERE estabelecimentoId = ${estabId}`)) as any;
      const dados = (rows[0] || []) as any[];

      const mapMes = new Map<string, { mes: string; recebido: number; vinculado: number; a_vincular: number; qtd: number }>();
      const mapConv = new Map<string, { convenio: string; recebido: number; vinculado: number; a_vincular: number; qtd: number }>();
      // Mapa cruzado mês×convênio×estabelecimento
      const mapMesConvEst = new Map<string, { mes: string; convenio: string; estabelecimento: string; recebido: number; vinculado: number; a_vincular: number; qtd: number; statusCount: Record<string, number> }>();

      let totalRecebido = 0;
      let totalVinculado = 0;
      let totalAVincular = 0;
      let qtdPagamentos = 0;

      for (const r of dados) {
        const dtStr = r.DT_PAGAMENTO || r.dt_pagamento;
        const mesParse = parseOracleMesAno(dtStr) || 'Sem Data';
        
        const rec = parseFloat(String(r.RECEBIDO || r.recebido || 0).replace(',', '.'));
        const vinc = parseFloat(String(r.VINCULADO || r.vinculado || 0).replace(',', '.'));
        const avinc = parseFloat(String(r.A_VINCULAR || r.a_vincular || 0).replace(',', '.'));
        
        const recVal = isNaN(rec) ? 0 : rec;
        const vincVal = isNaN(vinc) ? 0 : vinc;
        const aVincVal = isNaN(avinc) ? 0 : avinc;

        const convenio = r['CONVÊNIO'] || r['CONVENIO'] || r.convenio || 'Desconhecido';
        const strStatus = r.STATUS || r.status || 'Desconhecido';
        const estabelecimento = r.ESTABELECIMENTO || r.estabelecimento || 'Padrão';

        qtdPagamentos++;
        totalRecebido += recVal;
        totalVinculado += vincVal;
        totalAVincular += aVincVal;

        // Agrupar por mes
        if (!mapMes.has(mesParse)) mapMes.set(mesParse, { mes: mesParse, recebido: 0, vinculado: 0, a_vincular: 0, qtd: 0 });
        const m = mapMes.get(mesParse)!;
        m.recebido += recVal;
        m.vinculado += vincVal;
        m.a_vincular += aVincVal;
        m.qtd++;

        // Agrupar por convenio global
        if (!mapConv.has(convenio)) mapConv.set(convenio, { convenio, recebido: 0, vinculado: 0, a_vincular: 0, qtd: 0 });
        const c = mapConv.get(convenio)!;
        c.recebido += recVal;
        c.vinculado += vincVal;
        c.a_vincular += aVincVal;
        c.qtd++;

        // Cruzamento Mes + Convenio + Estabelecimento
        const chave = `${mesParse}|${convenio}|${estabelecimento}`;
        if (!mapMesConvEst.has(chave)) mapMesConvEst.set(chave, { mes: mesParse, convenio, estabelecimento, recebido: 0, vinculado: 0, a_vincular: 0, qtd: 0, statusCount: {} });
        const mc = mapMesConvEst.get(chave)!;
        mc.recebido += recVal;
        mc.vinculado += vincVal;
        mc.a_vincular += aVincVal;
        mc.qtd++;
        mc.statusCount[strStatus] = (mc.statusCount[strStatus] || 0) + 1;
      }

      return {
        resumo: {
          totalRecebido,
          totalVinculado,
          totalAVincular,
          qtdPagamentos
        },
        porMes: Array.from(mapMes.values()).sort((a,b) => a.mes.localeCompare(b.mes)),
        porConvenio: Array.from(mapConv.values()).sort((a,b) => b.recebido - a.recebido),
        pagamentosPorConvenio: Array.from(mapMesConvEst.values()).sort((a,b) => a.mes.localeCompare(b.mes))
      };
    }),

  /**
   * Dashboard BI Faturamento Itens
   */
  getFaturamentoItensBi: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      competencia: z.string().optional(),
      ano: z.string().optional(),
      convenio: z.string().optional(),
      setor: z.string().optional(),
      tipoItem: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB offline");
      if (!input.estabelecimentoId || input.estabelecimentoId <= 0) {
        return { resumo: {}, evolucaoMensal: [], porConvenio: [], porSetor: [], porTipoItem: [], topGlosas: [], topMotivos: [], topProfissionais: [], competencias: [], convenios: [], setores: [] };
      }
      const estabId = Number(input.estabelecimentoId);

      // Build filtros dinâmicos
      // Simplified CAST for massive performance gain
      const C = (col: string) => `CAST(${col} AS DECIMAL(15,2))`;
      let filtros = `AND (COMPETENCIA IS NULL OR COMPETENCIA NOT LIKE '3%')`;
      if (input.competencia && input.competencia !== 'todas') {
        filtros += ` AND COMPETENCIA = '${String(input.competencia).replace(/'/g, "''")}'`;
      } else if (input.ano && input.ano !== 'todos') {
        filtros += ` AND COMPETENCIA LIKE '${input.ano}/%'`;
      }
      if (input.convenio && input.convenio !== 'todos') filtros += ` AND CONVENIO = '${String(input.convenio).replace(/'/g, "''")}'`;
      if (input.setor && input.setor !== 'todos') filtros += ` AND SETOR = '${String(input.setor).replace(/'/g, "''")}'`;
      if (input.tipoItem && input.tipoItem !== 'todos') filtros += ` AND TIPO_ITEM = '${input.tipoItem}'`;

      const baseWhere  = `WHERE estabelecimentoId = ${estabId} ${filtros}`;
      // WHERE com condição extra para queries que filtram apenas itens glosados
      const glosaWhere = `${baseWhere} AND ${C('VL_GLOSA')} > 0`;
      const profWhere  = `${glosaWhere} AND PROF_EXEC IS NOT NULL`;

      const FATURADO_EXPR = `${C('VL_PRODUZIDO')}`;
      const PROVISORIO_EXPR = `CASE WHEN STATUS_PROT = '1' THEN ${C('VL_PRODUZIDO')} ELSE 0 END`;

      // ─── KPIs PRINCIPAIS ───────────────────────────────────────────────────
      const pResumo = db.execute(sql.raw(`
        SELECT 
          SUM(${FATURADO_EXPR}) as totalFaturado,
          SUM(${PROVISORIO_EXPR}) as totalProvisorio,
          SUM(${C('A_RECEBER')}) as totalAReceber,
          SUM(${C('VL_PAGO')}) as totalRecebido,
          SUM(${C('VL_GLOSA')}) as totalGlosado,
          SUM(${C('VL_MEDICO')}) as totalMedico,
          COUNT(*) as qtdTotal,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtdGlosados
        FROM tasy_faturado_itens_bi
        ${baseWhere}
      `));


      // ─── EVOLUÇÃO MENSAL ───────────────────────────────────────────────────
      const evolMensal = `WHERE estabelecimentoId = ${estabId}
          AND (COMPETENCIA IS NULL OR COMPETENCIA NOT LIKE '3%')
          ${input.ano && input.ano !== 'todos' ? `AND COMPETENCIA LIKE '${input.ano}/%'` : ''}`;
      const pEvolucao = db.execute(sql.raw(`
        SELECT COMPETENCIA as competencia,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          SUM(${C('A_RECEBER')}) as a_receber,
          COUNT(*) as qtd_itens,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtd_glosados
        FROM tasy_faturado_itens_bi ${evolMensal}
        GROUP BY COMPETENCIA ORDER BY COMPETENCIA ASC LIMIT 60
      `));

      // ─── POR CONVÊNIO ──────────────────────────────────────────────────────
      const pConvenio = db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(CONVENIO), ''), 'Não informado') as convenio,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          SUM(${C('A_RECEBER')}) as a_receber,
          SUM(${C('VL_AMAIOR')}) as a_maior,
          COUNT(*) as qtd_itens,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtd_glosados,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${baseWhere}
        GROUP BY CONVENIO ORDER BY faturado DESC LIMIT 20
      `));

      // ─── POR SETOR ─────────────────────────────────────────────────────────
      const pSetor = db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(SETOR), ''), 'Não informado') as setor,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${baseWhere}
        GROUP BY SETOR ORDER BY glosado DESC LIMIT 30
      `));

      // ─── POR TIPO DE ITEM ──────────────────────────────────────────────────
      const pTipoItem = db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(TIPO_ITEM), ''), 'Não informado') as tipo_item,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtd_glosados,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${baseWhere}
        GROUP BY TIPO_ITEM ORDER BY faturado DESC
      `));

      // ─── TOP MOTIVOS DE GLOSA ──────────────────────────────────────────────
      const pMotivos = db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(MOTIVO_GLOSA), ''), 'Sem motivo informado') as motivo,
          SUM(${C('VL_GLOSA')}) as vl_glosa,
          COUNT(*) as qtd_glosada
        FROM tasy_faturado_itens_bi ${glosaWhere}
        GROUP BY MOTIVO_GLOSA ORDER BY vl_glosa DESC LIMIT 20
      `));

      // ─── TOP ITENS GLOSADOS ────────────────────────────────────────────────
      const pGlosas = db.execute(sql.raw(`
        SELECT COALESCE(DESCRICAO, 'Sem descrição') as descricao,
          COALESCE(CD_ITEM, '') as codigo,
          COALESCE(CD_ITEM_TUSS, '') as codigo_tuss,
          COALESCE(CONVENIO, '') as convenio,
          COALESCE(SETOR, '') as setor,
          COALESCE(TIPO_ITEM, '') as tipo_item,
          COALESCE(NULLIF(TRIM(MOTIVO_GLOSA), ''), 'Sem motivo') as motivo_glosa,
          SUM(${C('VL_GLOSA')}) as vl_glosa,
          SUM(${FATURADO_EXPR}) as vl_faturado,
          COUNT(*) as qtd_glosada
        FROM tasy_faturado_itens_bi ${glosaWhere}
        GROUP BY DESCRICAO, CD_ITEM, CD_ITEM_TUSS, CONVENIO, SETOR, TIPO_ITEM, MOTIVO_GLOSA
        ORDER BY vl_glosa DESC LIMIT 100
      `));

      // ─── TOP PROFISSIONAIS ─────────────────────────────────────────────────
      const pProf = db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(PROF_EXEC), ''), 'Não informado') as profissional,
          COALESCE(CRM, '') as crm,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${profWhere}
        GROUP BY PROF_EXEC, CRM ORDER BY glosado DESC LIMIT 20
      `));

      // ─── FILTROS DISPONÍVEIS ───────────────────────────────────────────────
      const pComp = db.execute(sql.raw(`
        SELECT DISTINCT COMPETENCIA as competencia FROM tasy_faturado_itens_bi
        WHERE estabelecimentoId = ${estabId} AND COMPETENCIA IS NOT NULL AND COMPETENCIA NOT LIKE '3%'
        ORDER BY COMPETENCIA DESC
      `));
      const pConvOpts = db.execute(sql.raw(`
        SELECT DISTINCT CONVENIO as convenio FROM tasy_faturado_itens_bi
        WHERE estabelecimentoId = ${estabId} AND CONVENIO IS NOT NULL AND TRIM(CONVENIO) != ''
        ORDER BY CONVENIO ASC
      `));
      const pSetorOpts = db.execute(sql.raw(`
        SELECT DISTINCT SETOR as setor FROM tasy_faturado_itens_bi
        WHERE estabelecimentoId = ${estabId} AND SETOR IS NOT NULL AND TRIM(SETOR) != ''
        ORDER BY SETOR ASC
      `));

      const [resResumo, resEvolucao, resConvenio, resSetor, resTipoItem, resMotivos, resGlosas, resProf, resComp, resConvOpts, resSetorOpts] = await Promise.all([
        pResumo, pEvolucao, pConvenio, pSetor, pTipoItem, pMotivos, pGlosas, pProf, pComp, pConvOpts, pSetorOpts
      ]);

      const resumoRows = (resResumo as any)[0];
      const evolucaoRows = (resEvolucao as any)[0];
      const convenioRows = (resConvenio as any)[0];
      const setorRows = (resSetor as any)[0];
      const tipoItemRows = (resTipoItem as any)[0];
      const motivosRows = (resMotivos as any)[0];
      const glosasRows = (resGlosas as any)[0];
      const profRows = (resProf as any)[0];
      const competenciasRows = (resComp as any)[0];
      const conveniosRows = (resConvOpts as any)[0];
      const setoresRows = (resSetorOpts as any)[0];

      const rv = resumoRows[0] || {};
      const totalFaturado = Number(rv.totalFaturado) || 0;
      const totalProvisorio = Number(rv.totalProvisorio) || 0;
      const totalAReceber = Number(rv.totalAReceber) || 0;
      const totalRecebido = Number(rv.totalRecebido) || 0;
      const totalGlosado  = Number(rv.totalGlosado)  || 0;
      const totalMedico   = Number(rv.totalMedico)   || 0;
      const qtdTotal      = Number(rv.qtdTotal)      || 0;
      const qtdGlosados   = Number(rv.qtdGlosados)   || 0;
      const taxaGlosa     = totalFaturado > 0 ? (totalGlosado / totalFaturado) * 100 : 0;

      const n = (v: any) => Number(v) || 0;
      return {
        resumo: {
          totalFaturado, totalRecebido, totalGlosado, totalMedico,
          totalAReceber: totalFaturado - totalRecebido - totalGlosado,
          qtdTotalItens: qtdTotal, qtdGlosados,
          taxaGlosa: Number(taxaGlosa.toFixed(2))
        },
        evolucaoMensal: (evolucaoRows || []).map((row: any) => ({
          competencia: row.competencia,
          faturado: n(row.faturado), recebido: n(row.recebido), glosado: n(row.glosado), aReceber: n(row.a_receber),
          qtd_itens: n(row.qtd_itens), qtd_glosados: n(row.qtd_glosados),
          pct_glosa: n(row.faturado) > 0 ? Number(((n(row.glosado) / n(row.faturado)) * 100).toFixed(2)) : 0
        })),
        porConvenio: (convenioRows || []).map((row: any) => ({
          convenio: row.convenio, faturado: n(row.faturado), recebido: n(row.recebido),
          glosado: n(row.glosado), aReceber: n(row.a_receber), a_maior: n(row.a_maior),
          qtd_itens: n(row.qtd_itens), qtd_glosados: n(row.qtd_glosados),
          pct_glosa: Number(n(row.pct_glosa).toFixed(2))
        })),
        porSetor: (setorRows || []).map((row: any) => ({
          setor: row.setor, faturado: n(row.faturado), recebido: n(row.recebido),
          glosado: n(row.glosado), qtd_itens: n(row.qtd_itens),
          pct_glosa: Number(n(row.pct_glosa).toFixed(2))
        })),
        porTipoItem: (tipoItemRows || []).map((row: any) => ({
          tipo_item: row.tipo_item, faturado: n(row.faturado), recebido: n(row.recebido),
          glosado: n(row.glosado), qtd_itens: n(row.qtd_itens), qtd_glosados: n(row.qtd_glosados),
          pct_glosa: Number(n(row.pct_glosa).toFixed(2))
        })),
        topGlosas: (glosasRows || []).map((row: any) => ({
          descricao: row.descricao, codigo: row.codigo, codigo_tuss: row.codigo_tuss,
          convenio: row.convenio, setor: row.setor, tipo_item: row.tipo_item,
          motivo_glosa: row.motivo_glosa || 'Sem motivo',
          vl_glosa: n(row.vl_glosa), vl_faturado: n(row.vl_faturado), qtd_glosada: n(row.qtd_glosada)
        })),
        topMotivos: (motivosRows || []).map((row: any) => ({
          motivo: row.motivo, vl_glosa: n(row.vl_glosa), qtd_glosada: n(row.qtd_glosada)
        })),
        topProfissionais: (profRows || []).map((row: any) => ({
          profissional: row.profissional, crm: row.crm,
          faturado: n(row.faturado), glosado: n(row.glosado),
          qtd_itens: n(row.qtd_itens), pct_glosa: Number(n(row.pct_glosa).toFixed(2))
        })),
        competencias: (competenciasRows || []).map((row: any) => row.competencia),
        convenios: (conveniosRows || []).map((row: any) => row.convenio),
        setores: (setoresRows || []).map((row: any) => row.setor)
      };
    }),

  /**
   * Geração Automática de Relatórios de Glosas
   * Replica a lógica do script Python analisar_glosas.py
   */
  gerarRelatorioGlosas: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      competencia: z.string().optional(),
      convenio: z.string().optional(),
      setor: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB offline");
      const estabId = Number(input.estabelecimentoId);
      if (!estabId || estabId <= 0) {
        return { resumo: { linhas: 0, conveniosDistintos: 0, vlCobrado: 0, vlPago: 0, vlGlosa: 0, vlAReceber: 0, compIni: '', compFim: '', pctGlosa: 0 },
          porMotivo: [], porConvenio: [], porSetor: [], porItem: [], evolucaoMensal: [], oportunidades: [], competencias: [], convenios: [] };
      }
      const C = (col: string) => `CAST(${col} AS DECIMAL(15,2))`;
      const emptyResult = { resumo: { linhas: 0, conveniosDistintos: 0, vlCobrado: 0, vlPago: 0, vlGlosa: 0, vlAReceber: 0, compIni: '', compFim: '', pctGlosa: 0 },
        porMotivo: [], porConvenio: [], porSetor: [], porItem: [], evolucaoMensal: [], oportunidades: [], competencias: [], convenios: [], fonte: 'nenhuma' as string };

      // AUTO-DETECT: Check if tasy_faturado_itens_bi has data for this establishment
      const [tasyCheck] = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM tasy_faturado_itens_bi WHERE estabelecimentoId = ${estabId} LIMIT 1`));
      const hasTasy = Number((tasyCheck as any)[0]?.cnt) > 0;

      // Check demonstrativo table
      const [demoCheck] = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM demonstrativo WHERE estabelecimentoId = ${estabId} LIMIT 1`));
      const hasDemo = Number((demoCheck as any)[0]?.cnt) > 0;

      if (!hasTasy && !hasDemo) return emptyResult;

      const n = (v: any) => Number(v) || 0;
      const mapRows = (res: any, mapper: (row: any) => any) => ((res as any)[0] || []).map(mapper);
      const esc = (s: string) => String(s).replace(/'/g, "''");

      // ═══ SOURCE: TASY BI ═══
      if (hasTasy) {
        const T = 'tasy_faturado_itens_bi';
        // Expressão para resolver MOTIVO_GLOSA: "0"→Não informado, código curto→JOIN motivosglosa, texto longo→usar direto
        const motivoExpr = `CASE
          WHEN t.MOTIVO_GLOSA IS NULL OR TRIM(t.MOTIVO_GLOSA) = '' OR TRIM(t.MOTIVO_GLOSA) = '0' THEN 'Não informado'
          WHEN t.MOTIVO_GLOSA REGEXP '^[0-9]+$' AND mg.descricao IS NOT NULL THEN CONCAT(t.MOTIVO_GLOSA, ' - ', mg.descricao)
          WHEN t.MOTIVO_GLOSA REGEXP '^[0-9]+$' THEN CONCAT('Código ', t.MOTIVO_GLOSA)
          ELSE SUBSTRING_INDEX(t.MOTIVO_GLOSA, ' / ', 1)
        END`;
        const motivoJoin = `LEFT JOIN motivosglosa mg ON mg.codigo = TRIM(t.MOTIVO_GLOSA)`;

        // WHERE com alias t para queries com JOIN
        let filtrosT = `AND (t.COMPETENCIA IS NULL OR t.COMPETENCIA NOT LIKE '3%')`;
        if (input.competencia && input.competencia !== 'todas') filtrosT += ` AND t.COMPETENCIA = '${esc(input.competencia)}'`;
        if (input.convenio && input.convenio !== 'todos') filtrosT += ` AND t.CONVENIO = '${esc(input.convenio)}'`;
        if (input.setor && input.setor !== 'todos') filtrosT += ` AND t.SETOR = '${esc(input.setor)}'`;
        const bwT = `WHERE t.estabelecimentoId = ${estabId} ${filtrosT}`;
        const gwT = `${bwT} AND CAST(t.VL_GLOSA AS DECIMAL(15,2)) > 0`;

        const [rR, rM, rC, rS, rI, rE, rO, rComp, rConv] = await Promise.all([
          db.execute(sql.raw(`SELECT COUNT(*) as linhas, COUNT(DISTINCT t.CONVENIO) as conv_d, SUM(${C('t.VL_PRODUZIDO')}) as vl_cob, SUM(${C('t.VL_PAGO')}) as vl_pag, SUM(${C('t.VL_GLOSA')}) as vl_gl, SUM(${C('t.A_RECEBER')}) as vl_ar, MIN(t.COMPETENCIA) as ci, MAX(t.COMPETENCIA) as cf FROM ${T} t ${bwT}`)),
          db.execute(sql.raw(`SELECT ${motivoExpr} as motivo, SUM(CAST(t.VL_GLOSA AS DECIMAL(15,2))) as vg, SUM(CAST(t.VL_PRODUZIDO AS DECIMAL(15,2))) as vc, COUNT(*) as q FROM ${T} t ${motivoJoin} ${gwT} GROUP BY motivo ORDER BY vg DESC LIMIT 20`)),
          db.execute(sql.raw(`SELECT COALESCE(NULLIF(TRIM(t.CONVENIO),''),'N/I') as convenio, SUM(${C('t.VL_GLOSA')}) as vg, SUM(${C('t.VL_PRODUZIDO')}) as vc, SUM(${C('t.VL_PAGO')}) as vp, COUNT(*) as q, COUNT(CASE WHEN ${C('t.VL_GLOSA')}>0 THEN 1 END) as qg FROM ${T} t ${bwT} GROUP BY convenio ORDER BY vg DESC LIMIT 20`)),
          db.execute(sql.raw(`SELECT COALESCE(NULLIF(TRIM(t.SETOR),''),'N/I') as setor, SUM(${C('t.VL_GLOSA')}) as vg, SUM(${C('t.VL_PRODUZIDO')}) as vc, COUNT(*) as q FROM ${T} t ${gwT} GROUP BY setor ORDER BY vg DESC LIMIT 20`)),
          db.execute(sql.raw(`SELECT COALESCE(t.DESCRICAO,'S/D') as descricao, COALESCE(t.CD_ITEM,'') as codigo, ${motivoExpr} as motivo, SUM(CAST(t.VL_GLOSA AS DECIMAL(15,2))) as vg, SUM(CAST(t.VL_PRODUZIDO AS DECIMAL(15,2))) as vc, COUNT(*) as q FROM ${T} t ${motivoJoin} ${gwT} GROUP BY descricao, codigo, motivo ORDER BY vg DESC LIMIT 30`)),
          db.execute(sql.raw(`SELECT t.COMPETENCIA as comp, SUM(${C('t.VL_PRODUZIDO')}) as vc, SUM(${C('t.VL_PAGO')}) as vp, SUM(${C('t.VL_GLOSA')}) as vg, COUNT(*) as q FROM ${T} t ${bwT} GROUP BY comp ORDER BY comp ASC LIMIT 60`)),
          db.execute(sql.raw(`SELECT COALESCE(NULLIF(TRIM(t.MOTIVO_GLOSA),''),'Sem motivo') as motivo, COALESCE(NULLIF(TRIM(t.CONVENIO),''),'N/I') as convenio, SUM(${C('t.VL_GLOSA')}) as vg, SUM(${C('t.VL_PRODUZIDO')}) as vc, COUNT(*) as q FROM ${T} t ${gwT} GROUP BY motivo, convenio ORDER BY vg DESC LIMIT 30`)),
          db.execute(sql.raw(`SELECT DISTINCT t.COMPETENCIA as comp FROM ${T} t WHERE t.estabelecimentoId=${estabId} AND t.COMPETENCIA IS NOT NULL AND t.COMPETENCIA NOT LIKE '3%' ORDER BY comp DESC`)),
          db.execute(sql.raw(`SELECT DISTINCT t.CONVENIO as conv FROM ${T} t WHERE t.estabelecimentoId=${estabId} AND t.CONVENIO IS NOT NULL AND TRIM(t.CONVENIO)!='' ORDER BY conv ASC`)),
        ]);
        const r = (rR as any)[0]?.[0] || {};
        const tg = n(r.vl_gl);
        return {
          fonte: 'tasy_bi',
          resumo: { linhas: n(r.linhas), conveniosDistintos: n(r.conv_d), vlCobrado: n(r.vl_cob), vlPago: n(r.vl_pag), vlGlosa: tg, vlAReceber: n(r.vl_ar), compIni: r.ci||'', compFim: r.cf||'', pctGlosa: n(r.vl_cob)>0?(tg/n(r.vl_cob))*100:0 },
          porMotivo: mapRows(rM, (r:any) => ({ motivo:r.motivo, vlGlosa:n(r.vg), vlCobrado:n(r.vc), qtd:n(r.q), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0, participacao:tg>0?(n(r.vg)/tg)*100:0 })),
          porConvenio: mapRows(rC, (r:any) => ({ convenio:r.convenio, vlGlosa:n(r.vg), vlCobrado:n(r.vc), vlPago:n(r.vp), qtd:n(r.q), qtdGlosados:n(r.qg), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0 })),
          porSetor: mapRows(rS, (r:any) => ({ setor:r.setor, vlGlosa:n(r.vg), vlCobrado:n(r.vc), qtd:n(r.q), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0 })),
          porItem: mapRows(rI, (r:any) => ({ descricao:r.descricao, codigo:r.codigo, motivo:r.motivo||'Sem motivo', vlGlosa:n(r.vg), vlCobrado:n(r.vc), qtd:n(r.q) })),
          evolucaoMensal: mapRows(rE, (r:any) => ({ comp:r.comp, vlCobrado:n(r.vc), vlPago:n(r.vp), vlGlosa:n(r.vg), qtd:n(r.q), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0 })),
          oportunidades: mapRows(rO, (r:any) => ({ motivo:r.motivo, convenio:r.convenio, vlGlosa:n(r.vg), vlCobrado:n(r.vc), qtd:n(r.q), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0 })),
          competencias: ((rComp as any)[0]||[]).map((r:any)=>r.comp),
          convenios: ((rConv as any)[0]||[]).map((r:any)=>r.conv),
        };
      }

      // ═══ SOURCE: DEMONSTRATIVO (PSI, Urológico, etc) ═══
      const D = 'demonstrativo';
      const compExpr = `DATE_FORMAT(${D}.data_referencia, '%Y/%m')`;
      let df = `WHERE ${D}.estabelecimentoId = ${estabId}`;
      if (input.competencia && input.competencia !== 'todas') df += ` AND ${compExpr} = '${esc(input.competencia)}'`;
      if (input.convenio && input.convenio !== 'todos') df += ` AND ${D}.convenio_id IN (SELECT id FROM convenios WHERE nome = '${esc(input.convenio)}')`;
      const dg = `${df} AND COALESCE(${D}.valor_glosa, 0) > 0`;

      // Join with convenios to get name
      const convJoin = `LEFT JOIN convenios cv ON ${D}.convenio_id = cv.id`;
      const convName = `COALESCE(cv.nome, 'N/I')`;

      // Cobrado = valor_pago + valor_glosa (com COALESCE para NULLs)
      const vp = `COALESCE(${D}.valor_pago, 0)`;
      const vg = `COALESCE(${D}.valor_glosa, 0)`;
      const vlCob = `(${vp} + ${vg})`;

      const [dR, dM, dC, dI, dE, dComp, dConv] = await Promise.all([
        db.execute(sql.raw(`SELECT COUNT(*) as linhas, COUNT(DISTINCT ${D}.convenio_id) as conv_d, SUM(${vlCob}) as vc, SUM(${vp}) as vp, SUM(${vg}) as vg, MIN(${compExpr}) as ci, MAX(${compExpr}) as cf FROM ${D} ${df}`)),
        db.execute(sql.raw(`SELECT COALESCE(NULLIF(TRIM(${D}.codigo_glosa),''),'Sem motivo') as motivo, COALESCE(NULLIF(TRIM(${D}.situacao_item),''), '') as situacao, SUM(${vg}) as vg, SUM(${vlCob}) as vc, COUNT(*) as q FROM ${D} ${dg} GROUP BY ${D}.codigo_glosa, ${D}.situacao_item ORDER BY vg DESC LIMIT 20`)),
        db.execute(sql.raw(`SELECT ${convName} as convenio, SUM(${vg}) as vg, SUM(${vlCob}) as vc, SUM(${vp}) as vp, COUNT(*) as q, COUNT(CASE WHEN ${vg}>0 THEN 1 END) as qg FROM ${D} ${convJoin} ${df} GROUP BY cv.nome ORDER BY vg DESC LIMIT 20`)),
        db.execute(sql.raw(`SELECT COALESCE(${D}.descricao_item,'S/D') as descricao, COALESCE(${D}.codigo_item,'') as codigo, COALESCE(NULLIF(TRIM(${D}.codigo_glosa),''),'Sem motivo') as motivo, COALESCE(NULLIF(TRIM(${D}.situacao_item),''),'') as situacao, SUM(${vg}) as vg, SUM(${vlCob}) as vc, COUNT(*) as q FROM ${D} ${dg} GROUP BY ${D}.descricao_item, ${D}.codigo_item, ${D}.codigo_glosa, ${D}.situacao_item ORDER BY vg DESC LIMIT 30`)),
        db.execute(sql.raw(`SELECT ${compExpr} as comp, SUM(${vlCob}) as vc, SUM(${vp}) as vp, SUM(${vg}) as vg, COUNT(*) as q FROM ${D} ${df} GROUP BY ${compExpr} ORDER BY comp ASC LIMIT 60`)),
        db.execute(sql.raw(`SELECT DISTINCT ${compExpr} as comp FROM ${D} WHERE ${D}.estabelecimentoId=${estabId} AND ${D}.data_referencia IS NOT NULL ORDER BY comp DESC`)),
        db.execute(sql.raw(`SELECT DISTINCT cv.nome as conv FROM ${D} ${convJoin} WHERE ${D}.estabelecimentoId=${estabId} AND cv.nome IS NOT NULL ORDER BY cv.nome ASC`)),
      ]);

      // Dicionário TISS completo de códigos de glosa
      const tissGlosa: Record<string, string> = {
        '1001':'Lote não identificado','1002':'Procedimento não coberto','1003':'Procedimento não autorizado',
        '1004':'Procedimento não habilitado','1005':'Prestador não credenciado','1006':'Beneficiário não identificado',
        '1007':'Beneficiário inelegível','1008':'Período de carência','1009':'Doença preexistente',
        '1010':'Procedimento não compatível com diagnóstico','1011':'Quantidade excede o permitido',
        '1012':'Procedimento não compatível com sexo','1013':'Quantidade não autorizada',
        '1014':'Quantidade acima do permitido','1015':'Procedimento não compatível com faixa etária',
        '1102':'Procedimento já pago','1103':'Pagamento duplicado','1104':'Conta já paga',
        '1301':'Valor unitário acima do contratado','1302':'Valor total acima do contratado',
        '1303':'Valor unitário diferente do informado','1304':'Valor acima do contratado',
        '1305':'Valor acima da tabela','1306':'Valor informado incorreto',
        '1307':'Valor não negociado','1308':'Desconto contratual','1309':'Coparticipação',
        '1310':'Franquia','1311':'Valor acima do autorizado','1312':'Valor já pago',
        '1313':'Taxa/acomodação não autorizada','1314':'Valor excede limite contratual',
        '1315':'Valor não previsto em contrato',
        '1601':'Guia duplicada','1602':'Sequencial repetido','1603':'Guia cancelada',
        '1604':'Data de execução inválida','1605':'Guia vencida','1606':'Beneficiário não ativo',
        '1607':'Procedimento sem cobertura','1608':'Fora do prazo de entrega',
        '1609':'Guia inválida','1610':'Glosa do prestador','1611':'Senha inválida/expirada',
        '1612':'Guia não autorizada','1613':'Procedimento não confere com autorização',
        '1614':'Procedimento duplicado','1615':'Valor informado divergente','1616':'Guia incompleta',
        '1617':'Erro de cobrança','1618':'Protocolo não encontrado',
        '1619':'Código não encontrado','1620':'Código inválido','1621':'Data fora da vigência',
        '1622':'Ausência de justificativa técnica',
        '1701':'Autorização não encontrada','1702':'Sem autorização prévia',
        '1703':'Autorização vencida','1704':'Autorização cancelada',
        '1705':'Não confere com tipo de guia','1706':'Profissional não habilitado',
        '1707':'Solicitante não autorizado',
        '1801':'Código de tabela inválido','1802':'Tabela não vigente','1803':'Código TUSS inválido',
        '1810':'Pacote incluso','1811':'Item já cobrado em outro procedimento',
        '1812':'Limite de sessões atingido','1813':'Item incluso no pacote/diária',
        '1814':'Material incluso no procedimento','1815':'Medicamento incluso',
        '1816':'Taxa já inclusa','1817':'Procedimento incluso na diária',
        '1818':'Item incluso na taxa de sala','1819':'Componente do porte',
        '1820':'Componente do kit',
        '1901':'Fora da cobertura contratual','1902':'Limite financeiro atingido',
        '1903':'Limite de quantidade atingido','1904':'Período não coberto',
        '1914':'Item cobrado em duplicidade',
        '2001':'Outros','2002':'Pendência de documentação','2003':'Auditoria médica',
      };
      const resolveMotivo = (code: string, situacao?: string) => {
        const c = String(code).trim();
        if (tissGlosa[c]) return `${c} - ${tissGlosa[c]}`;
        if (situacao && situacao !== c) return `${c} - ${situacao}`;
        return c;
      };

      const dr = (dR as any)[0]?.[0] || {};
      const dtg = n(dr.vg);
      const dtc = n(dr.vc);
      return {
        fonte: 'demonstrativo',
        resumo: { linhas: n(dr.linhas), conveniosDistintos: n(dr.conv_d), vlCobrado: dtc, vlPago: n(dr.vp), vlGlosa: dtg, vlAReceber: Math.max(0, dtc-n(dr.vp)), compIni: dr.ci||'', compFim: dr.cf||'', pctGlosa: dtc>0?(dtg/dtc)*100:0 },
        porMotivo: mapRows(dM, (r:any) => ({ motivo: resolveMotivo(r.motivo, r.situacao), vlGlosa:n(r.vg), vlCobrado:n(r.vc), qtd:n(r.q), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0, participacao:dtg>0?(n(r.vg)/dtg)*100:0 })),
        porConvenio: mapRows(dC, (r:any) => ({ convenio:r.convenio, vlGlosa:n(r.vg), vlCobrado:n(r.vc), vlPago:n(r.vp), qtd:n(r.q), qtdGlosados:n(r.qg), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0 })),
        porSetor: [],
        porItem: mapRows(dI, (r:any) => ({ descricao:r.descricao, codigo:r.codigo, motivo: resolveMotivo(r.motivo, r.situacao), vlGlosa:n(r.vg), vlCobrado:n(r.vc), qtd:n(r.q) })),
        evolucaoMensal: mapRows(dE, (r:any) => ({ comp:r.comp, vlCobrado:n(r.vc), vlPago:n(r.vp), vlGlosa:n(r.vg), qtd:n(r.q), pctGlosa:n(r.vc)>0?(n(r.vg)/n(r.vc))*100:0 })),
        oportunidades: [],
        competencias: ((dComp as any)[0]||[]).map((r:any)=>r.comp),
        convenios: ((dConv as any)[0]||[]).map((r:any)=>r.conv),
      };
    }),

  // ═══════════════════════════════════════════
  // Análise IA para Relatórios PDF/PPTX
  // ═══════════════════════════════════════════
  gerarAnaliseIA: publicProcedure
    .input(z.object({
      nomeEstabelecimento: z.string(),
      resumo: z.object({
        vlCobrado: z.number(), vlPago: z.number(), vlGlosa: z.number(),
        pctGlosa: z.number(), linhas: z.number(), conveniosDistintos: z.number(),
        compIni: z.string().optional(), compFim: z.string().optional(),
      }),
      topMotivos: z.array(z.object({
        motivo: z.string(), vlGlosa: z.number(), participacao: z.number(), pctGlosa: z.number(),
      })).optional(),
      topConvenios: z.array(z.object({
        convenio: z.string(), vlGlosa: z.number(), vlCobrado: z.number(), pctGlosa: z.number(),
      })).optional(),
      topItens: z.array(z.object({
        descricao: z.string(), vlGlosa: z.number(), qtd: z.number(),
      })).optional(),
      evolucao: z.array(z.object({
        comp: z.string(), pctGlosa: z.number(), vlGlosa: z.number(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import('../_core/llm');
      const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      const prompt = `Você é um consultor sênior de faturamento hospitalar e auditoria de contas médicas.
Analise os dados financeiros abaixo do hospital "${input.nomeEstabelecimento}" e gere um RELATÓRIO EXECUTIVO completo e profissional.

DADOS DO PERÍODO (${input.resumo.compIni || 'N/D'} a ${input.resumo.compFim || 'N/D'}):
- Valor Cobrado: ${fmtBRL(input.resumo.vlCobrado)}
- Valor Pago: ${fmtBRL(input.resumo.vlPago)}
- Valor Glosado: ${fmtBRL(input.resumo.vlGlosa)}
- Taxa de Glosa: ${input.resumo.pctGlosa.toFixed(2)}%
- Itens analisados: ${input.resumo.linhas}
- Convênios distintos: ${input.resumo.conveniosDistintos}

TOP MOTIVOS DE GLOSA:
${(input.topMotivos || []).slice(0, 10).map((m, i) => `${i+1}. ${m.motivo} — ${fmtBRL(m.vlGlosa)} (${m.participacao.toFixed(1)}% do total, ${m.pctGlosa.toFixed(1)}% do cobrado)`).join('\n')}

TOP CONVÊNIOS COM GLOSA:
${(input.topConvenios || []).slice(0, 8).map((c, i) => `${i+1}. ${c.convenio} — Cobrado: ${fmtBRL(c.vlCobrado)}, Glosado: ${fmtBRL(c.vlGlosa)} (${c.pctGlosa.toFixed(1)}%)`).join('\n')}

TOP ITENS GLOSADOS:
${(input.topItens || []).slice(0, 8).map((it, i) => `${i+1}. ${it.descricao} — ${fmtBRL(it.vlGlosa)} (${it.qtd} ocorrências)`).join('\n')}

EVOLUÇÃO MENSAL:
${(input.evolucao || []).slice(-6).map(e => `${e.comp}: Glosa ${fmtBRL(e.vlGlosa)} (${e.pctGlosa.toFixed(1)}%)`).join('\n')}

GERE O RELATÓRIO no formato JSON com EXATAMENTE estas chaves:
{
  "sumarioExecutivo": "Parágrafo de 4-6 linhas com visão geral do cenário financeiro, destacando pontos críticos e a magnitude do problema de glosas.",
  "analiseMotivos": "Parágrafo de 4-6 linhas analisando os principais motivos de glosa, identificando padrões e causas-raiz. Cite os motivos específicos e seus impactos.",
  "analiseConvenios": "Parágrafo de 3-5 linhas sobre os convênios mais impactados, com recomendações específicas para cada um.",
  "analiseItens": "Parágrafo de 3-5 linhas sobre os itens de alto custo glosados, com análise de por que são recorrentes.",
  "tendencia": "Parágrafo de 2-3 linhas sobre a tendência mensal (está melhorando ou piorando?).",
  "estrategiaReducao": "Parágrafo de 4-6 linhas com estratégia detalhada de redução de glosas, priorizando ações de maior impacto.",
  "acoes": [
    {"area": "Nome da área", "problema": "Problema identificado", "acao": "Ação proposta detalhada", "meta": "Meta mensurável", "prazo": "Prazo sugerido"},
    {"area": "...", "problema": "...", "acao": "...", "meta": "...", "prazo": "..."}
  ],
  "conclusao": "Parágrafo de 3-4 linhas com conclusão e meta de economia projetada."
}

IMPORTANTE: 
- Seja ESPECÍFICO com os dados fornecidos. Cite valores, percentuais e nomes reais.
- Use linguagem profissional e assertiva, como se estivesse apresentando para a diretoria do hospital.
- Nas ações, seja prático e realista (mínimo 4, máximo 8 ações).
- Calcule economia potencial baseada em cenários de redução de 10% e 20%.
- Responda APENAS com o JSON válido, sem markdown, sem backticks, sem explicações.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Você é um consultor de faturamento hospitalar. Responda apenas com JSON válido.' },
            { role: 'user', content: prompt },
          ],
        });

        const raw = response.choices[0]?.message?.content || '{}';
        // Limpa possíveis backticks markdown
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const analise = JSON.parse(cleaned);
        return { success: true, analise };
      } catch (error: any) {
        console.error('[gerarAnaliseIA] Erro:', error?.message);
        // Fallback com textos genéricos baseados nos dados
        const fG = fmtBRL(input.resumo.vlGlosa);
        const fC = fmtBRL(input.resumo.vlCobrado);
        const pct = input.resumo.pctGlosa.toFixed(2);
        const topM = (input.topMotivos || [])[0]?.motivo || 'N/A';
        const topC = (input.topConvenios || [])[0]?.convenio || 'N/A';
        return {
          success: false,
          analise: {
            sumarioExecutivo: `O hospital ${input.nomeEstabelecimento} apresentou uma taxa de glosa de ${pct}% no período analisado, totalizando ${fG} em glosas sobre um faturamento de ${fC}. Este patamar requer atenção da gestão hospitalar para implementação de medidas corretivas e preventivas visando a recuperação de receita.`,
            analiseMotivos: `O principal motivo de glosa identificado foi "${topM}", que concentra a maior parcela do valor glosado. A recorrência deste motivo indica falhas sistêmicas que podem ser corrigidas com revisão de processos internos e treinamento das equipes de faturamento.`,
            analiseConvenios: `O convênio ${topC} apresenta o maior volume de glosas, demandando uma abordagem específica de negociação e adequação de processos. Recomenda-se agendar reunião técnica para alinhamento de regras contratuais.`,
            analiseItens: `Os itens de maior valor glosado concentram-se em procedimentos e materiais de alto custo, exigindo atenção redobrada na documentação e autorização prévia.`,
            tendencia: `A análise da evolução mensal indica a necessidade de monitoramento contínuo para identificação precoce de desvios.`,
            estrategiaReducao: `A estratégia prioritária deve focar na correção dos motivos mais recorrentes, com meta de redução de 10% no próximo trimestre, gerando economia estimada de ${fmtBRL(input.resumo.vlGlosa * 0.10)}.`,
            acoes: [
              { area: 'Faturamento', problema: 'Glosas por itens inclusos em pacote', acao: 'Revisar matriz de pacotes e regras de cobrança', meta: 'Reduzir 15% das glosas por este motivo', prazo: '30 dias' },
              { area: 'Auditoria', problema: 'Itens de alto custo glosados', acao: 'Implementar dupla checagem antes do envio', meta: 'Zero glosas por falta de documentação', prazo: '15 dias' },
              { area: 'Autorização', problema: 'Ausência de autorização prévia', acao: 'Checklist obrigatório na internação', meta: 'Reduzir 20% das glosas por autorização', prazo: '30 dias' },
              { area: 'Gestão de Recurso', problema: 'Baixa taxa de recuperação', acao: 'Padronizar argumentações por motivo e convênio', meta: 'Aumentar taxa de deferimento em 10%', prazo: '45 dias' },
            ],
            conclusao: `Com a implementação das ações propostas, estima-se uma recuperação potencial de ${fmtBRL(input.resumo.vlGlosa * 0.10)} a ${fmtBRL(input.resumo.vlGlosa * 0.20)} no próximo ciclo, representando ganho significativo para a sustentabilidade financeira do hospital.`,
          },
        };
      }
    }),
  // ═══════════════════════════════════════════
  // Análise Comparativa IA entre dois meses
  // ═══════════════════════════════════════════
  gerarAnaliseComparativaIA: publicProcedure
    .input(z.object({
      nomeEstabelecimento: z.string(),
      mesA: z.object({
        competencia: z.string(),
        vlCobrado: z.number(), vlPago: z.number(), vlGlosa: z.number(), pctGlosa: z.number(),
        linhas: z.number(), conveniosDistintos: z.number(),
        topMotivos: z.array(z.object({ motivo: z.string(), vlGlosa: z.number(), participacao: z.number(), pctGlosa: z.number() })).optional(),
        topConvenios: z.array(z.object({ convenio: z.string(), vlGlosa: z.number(), vlCobrado: z.number(), pctGlosa: z.number() })).optional(),
        topItens: z.array(z.object({ descricao: z.string(), vlGlosa: z.number(), qtd: z.number() })).optional(),
      }),
      mesB: z.object({
        competencia: z.string(),
        vlCobrado: z.number(), vlPago: z.number(), vlGlosa: z.number(), pctGlosa: z.number(),
        linhas: z.number(), conveniosDistintos: z.number(),
        topMotivos: z.array(z.object({ motivo: z.string(), vlGlosa: z.number(), participacao: z.number(), pctGlosa: z.number() })).optional(),
        topConvenios: z.array(z.object({ convenio: z.string(), vlGlosa: z.number(), vlCobrado: z.number(), pctGlosa: z.number() })).optional(),
        topItens: z.array(z.object({ descricao: z.string(), vlGlosa: z.number(), qtd: z.number() })).optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { invokeLLM } = await import('../_core/llm');
      const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const { mesA, mesB } = input;

      const deltaGlosa = mesB.vlGlosa - mesA.vlGlosa;
      const deltaPct = mesB.pctGlosa - mesA.pctGlosa;
      const deltaCobrado = mesB.vlCobrado - mesA.vlCobrado;

      const prompt = `Você é um consultor sênior de faturamento hospitalar e auditoria de contas médicas.
Analise a COMPARAÇÃO entre dois meses do hospital "${input.nomeEstabelecimento}" e gere um relatório comparativo completo.

═══ MÊS A: ${mesA.competencia} ═══
- Valor Cobrado: ${fmtBRL(mesA.vlCobrado)}
- Valor Pago: ${fmtBRL(mesA.vlPago)}
- Valor Glosado: ${fmtBRL(mesA.vlGlosa)}
- Taxa de Glosa: ${mesA.pctGlosa.toFixed(2)}%
- Itens: ${mesA.linhas} | Convênios: ${mesA.conveniosDistintos}
Top Motivos: ${(mesA.topMotivos || []).slice(0, 5).map((m, i) => `${i+1}. ${m.motivo} — ${fmtBRL(m.vlGlosa)} (${m.participacao.toFixed(1)}%)`).join('; ')}
Top Convênios: ${(mesA.topConvenios || []).slice(0, 5).map((c, i) => `${i+1}. ${c.convenio} — ${fmtBRL(c.vlGlosa)} (${c.pctGlosa.toFixed(1)}%)`).join('; ')}

═══ MÊS B: ${mesB.competencia} ═══
- Valor Cobrado: ${fmtBRL(mesB.vlCobrado)}
- Valor Pago: ${fmtBRL(mesB.vlPago)}
- Valor Glosado: ${fmtBRL(mesB.vlGlosa)}
- Taxa de Glosa: ${mesB.pctGlosa.toFixed(2)}%
- Itens: ${mesB.linhas} | Convênios: ${mesB.conveniosDistintos}
Top Motivos: ${(mesB.topMotivos || []).slice(0, 5).map((m, i) => `${i+1}. ${m.motivo} — ${fmtBRL(m.vlGlosa)} (${m.participacao.toFixed(1)}%)`).join('; ')}
Top Convênios: ${(mesB.topConvenios || []).slice(0, 5).map((c, i) => `${i+1}. ${c.convenio} — ${fmtBRL(c.vlGlosa)} (${c.pctGlosa.toFixed(1)}%)`).join('; ')}

═══ VARIAÇÕES ═══
- Δ Valor Glosado: ${fmtBRL(deltaGlosa)} (${deltaGlosa >= 0 ? '+' : ''}${mesA.vlGlosa > 0 ? ((deltaGlosa / mesA.vlGlosa) * 100).toFixed(1) : '0'}%)
- Δ Taxa de Glosa: ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(2)} p.p.
- Δ Valor Cobrado: ${fmtBRL(deltaCobrado)}

GERE O RELATÓRIO COMPARATIVO no formato JSON com EXATAMENTE estas chaves:
{
  "visaoGeral": "Parágrafo de 4-6 linhas comparando o desempenho geral entre os dois meses, destacando se houve melhora ou piora e os principais números.",
  "analiseVariacoes": "Parágrafo de 4-6 linhas analisando as variações nos valores cobrados, pagos e glosados. O que causou as mudanças?",
  "comparativoMotivos": "Parágrafo de 4-6 linhas comparando os motivos de glosa entre os dois meses. Quais motivos aumentaram, diminuíram ou surgiram novos?",
  "comparativoConvenios": "Parágrafo de 3-5 linhas comparando os convênios entre os dois meses. Quais melhoraram, quais pioraram?",
  "diagnostico": "Parágrafo de 3-5 linhas com o diagnóstico: o hospital está melhorando ou piorando? Quais são as causas?",
  "recomendacoes": "Parágrafo de 4-6 linhas com recomendações específicas baseadas na comparação. O que precisa ser feito de diferente?",
  "acoesPrioritarias": [
    {"area": "Nome da área", "situacao": "O que mudou de um mês para outro", "acao": "Ação proposta", "impactoEstimado": "Impacto financeiro esperado"},
    {"area": "...", "situacao": "...", "acao": "...", "impactoEstimado": "..."}
  ],
  "conclusao": "Parágrafo de 3-4 linhas com conclusão e projeção para o próximo mês."
}

IMPORTANTE:
- Compare ESPECIFICAMENTE os dados dos dois meses. Cite valores, percentuais e nomes reais de ambos os períodos.
- Use linguagem profissional, indicando claramente melhorias (▲) e pioras (▼).
- Nas ações, seja prático e realista (mínimo 3, máximo 6 ações).
- Responda APENAS com o JSON válido, sem markdown, sem backticks, sem explicações.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Você é um consultor de faturamento hospitalar especializado em análise comparativa. Responda apenas com JSON válido.' },
            { role: 'user', content: prompt },
          ],
        });

        const raw = response.choices[0]?.message?.content || '{}';
        const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const analise = JSON.parse(cleaned);
        return { success: true, analise };
      } catch (error: any) {
        console.error('[gerarAnaliseComparativaIA] Erro:', error?.message);
        const melhorou = deltaGlosa < 0;
        return {
          success: false,
          analise: {
            visaoGeral: `Comparando ${mesA.competencia} com ${mesB.competencia}, o hospital ${input.nomeEstabelecimento} apresentou ${melhorou ? 'melhora' : 'piora'} na taxa de glosa, passando de ${mesA.pctGlosa.toFixed(2)}% para ${mesB.pctGlosa.toFixed(2)}%. O valor glosado ${melhorou ? 'reduziu' : 'aumentou'} de ${fmtBRL(mesA.vlGlosa)} para ${fmtBRL(mesB.vlGlosa)}, uma variação de ${fmtBRL(deltaGlosa)}.`,
            analiseVariacoes: `O faturamento cobrado variou de ${fmtBRL(mesA.vlCobrado)} para ${fmtBRL(mesB.vlCobrado)}. A taxa de glosa teve variação de ${deltaPct.toFixed(2)} pontos percentuais, indicando ${melhorou ? 'progresso nas ações de redução' : 'necessidade de intensificar medidas corretivas'}.`,
            comparativoMotivos: `Os motivos de glosa precisam ser analisados individualmente para identificar padrões de melhoria ou piora entre os períodos.`,
            comparativoConvenios: `A análise por convênio revela variações significativas que devem ser tratadas com estratégias individualizadas.`,
            diagnostico: `O hospital está ${melhorou ? 'em trajetória de melhoria, mas precisa manter e intensificar as ações' : 'em tendência de piora, necessitando intervenção imediata nos processos de faturamento e auditoria'}.`,
            recomendacoes: `Recomenda-se ${melhorou ? 'manter as ações que geraram resultado positivo e expandir para outras áreas' : 'revisar urgentemente os processos de faturamento, autorização prévia e documentação clínica'}. Foco nos motivos e convênios com maior variação negativa.`,
            acoesPrioritarias: [
              { area: 'Faturamento', situacao: `Taxa de glosa ${melhorou ? 'reduziu' : 'aumentou'} ${Math.abs(deltaPct).toFixed(2)} p.p.`, acao: 'Revisar processos de codificação e envio', impactoEstimado: fmtBRL(Math.abs(deltaGlosa) * 0.5) },
              { area: 'Auditoria', situacao: 'Variação nos motivos de glosa', acao: 'Intensificar auditoria pré-faturamento', impactoEstimado: fmtBRL(mesB.vlGlosa * 0.10) },
              { area: 'Negociação', situacao: 'Variação por convênio', acao: 'Renegociar com convênios de maior impacto', impactoEstimado: fmtBRL(mesB.vlGlosa * 0.15) },
            ],
            conclusao: `A análise comparativa revela que o hospital precisa ${melhorou ? 'consolidar os avanços obtidos' : 'implementar ações corretivas urgentes'}. A meta para o próximo período deve ser atingir taxa de glosa inferior a ${Math.max(0, mesB.pctGlosa - 2).toFixed(2)}%.`,
          },
        };
      }
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
  throw new Error(`Procedure ${procedure} não implementada em módulo tasy`);
}
