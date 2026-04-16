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
      const C = (col: string) => `CAST(NULLIF(TRIM(REPLACE(${col}, ',', '.')), '') AS DECIMAL(15,2))`;
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

      const FATURADO_EXPR = `CASE WHEN STATUS_PROT = '2' THEN ${C('VL_PRODUZIDO')} ELSE 0 END`;
      const PROVISORIO_EXPR = `CASE WHEN STATUS_PROT = '1' THEN ${C('VL_PRODUZIDO')} ELSE 0 END`;

      // ─── KPIs PRINCIPAIS ───────────────────────────────────────────────────
      const [resumoRows] = await db.execute(sql.raw(`
        SELECT 
          SUM(${FATURADO_EXPR}) as totalFaturado,
          SUM(${PROVISORIO_EXPR}) as totalProvisorio,
          SUM(${C('A_RECEBER')}) as totalAReceber,
          SUM(${C('VL_PAGO')} + ${C('VL_AMAIOR')}) as totalRecebido,
          SUM(${C('VL_GLOSA')}) as totalGlosado,
          SUM(${C('VL_MEDICO')}) as totalMedico,
          COUNT(*) as qtdTotal,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtdGlosados
        FROM tasy_faturado_itens_bi
        ${baseWhere}
      `)) as any;
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

      // ─── EVOLUÇÃO MENSAL ───────────────────────────────────────────────────
      const evolMensal = `WHERE estabelecimentoId = ${estabId}
          AND (COMPETENCIA IS NULL OR COMPETENCIA NOT LIKE '3%')
          ${input.ano && input.ano !== 'todos' ? `AND COMPETENCIA LIKE '${input.ano}/%'` : ''}`;
      const [evolucaoRows] = await db.execute(sql.raw(`
        SELECT COMPETENCIA as competencia,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')} + ${C('VL_AMAIOR')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtd_glosados
        FROM tasy_faturado_itens_bi ${evolMensal}
        GROUP BY COMPETENCIA ORDER BY COMPETENCIA ASC LIMIT 60
      `)) as any;

      // ─── POR CONVÊNIO ──────────────────────────────────────────────────────
      const [convenioRows] = await db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(CONVENIO), ''), 'Não informado') as convenio,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')} + ${C('VL_AMAIOR')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtd_glosados,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${baseWhere}
        GROUP BY CONVENIO ORDER BY glosado DESC LIMIT 20
      `)) as any;

      // ─── POR SETOR ─────────────────────────────────────────────────────────
      const [setorRows] = await db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(SETOR), ''), 'Não informado') as setor,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')} + ${C('VL_AMAIOR')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${baseWhere}
        GROUP BY SETOR ORDER BY glosado DESC LIMIT 30
      `)) as any;

      // ─── POR TIPO DE ITEM ──────────────────────────────────────────────────
      const [tipoItemRows] = await db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(TIPO_ITEM), ''), 'Não informado') as tipo_item,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_PAGO')} + ${C('VL_AMAIOR')}) as recebido,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          COUNT(CASE WHEN ${C('VL_GLOSA')} > 0 THEN 1 END) as qtd_glosados,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${baseWhere}
        GROUP BY TIPO_ITEM ORDER BY faturado DESC
      `)) as any;

      // ─── TOP MOTIVOS DE GLOSA ──────────────────────────────────────────────
      const [motivosRows] = await db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(MOTIVO_GLOSA), ''), 'Sem motivo informado') as motivo,
          SUM(${C('VL_GLOSA')}) as vl_glosa,
          COUNT(*) as qtd_glosada
        FROM tasy_faturado_itens_bi ${glosaWhere}
        GROUP BY MOTIVO_GLOSA ORDER BY vl_glosa DESC LIMIT 20
      `)) as any;

      // ─── TOP ITENS GLOSADOS ────────────────────────────────────────────────
      const [glosasRows] = await db.execute(sql.raw(`
        SELECT COALESCE(DESCRICAO, 'Sem descrição') as descricao,
          COALESCE(CD_ITEM, '') as codigo,
          COALESCE(CD_ITEM_TUSS, '') as codigo_tuss,
          COALESCE(CONVENIO, '') as convenio,
          COALESCE(SETOR, '') as setor,
          COALESCE(TIPO_ITEM, '') as tipo_item,
          SUM(${C('VL_GLOSA')}) as vl_glosa,
          SUM(${FATURADO_EXPR}) as vl_faturado,
          COUNT(*) as qtd_glosada
        FROM tasy_faturado_itens_bi ${glosaWhere}
        GROUP BY DESCRICAO, CD_ITEM, CD_ITEM_TUSS, CONVENIO, SETOR, TIPO_ITEM
        ORDER BY vl_glosa DESC LIMIT 100
      `)) as any;

      // ─── TOP PROFISSIONAIS ─────────────────────────────────────────────────
      const [profRows] = await db.execute(sql.raw(`
        SELECT COALESCE(NULLIF(TRIM(PROF_EXEC), ''), 'Não informado') as profissional,
          COALESCE(CRM, '') as crm,
          SUM(${FATURADO_EXPR}) as faturado,
          SUM(${C('VL_GLOSA')}) as glosado,
          COUNT(*) as qtd_itens,
          (SUM(${C('VL_GLOSA')}) / NULLIF(SUM(${FATURADO_EXPR}), 0)) * 100 as pct_glosa
        FROM tasy_faturado_itens_bi ${profWhere}
        GROUP BY PROF_EXEC, CRM ORDER BY glosado DESC LIMIT 20
      `)) as any;

      // ─── FILTROS DISPONÍVEIS ───────────────────────────────────────────────
      const [competenciasRows] = await db.execute(sql.raw(`
        SELECT DISTINCT COMPETENCIA as competencia FROM tasy_faturado_itens_bi
        WHERE estabelecimentoId = ${estabId} AND COMPETENCIA IS NOT NULL AND COMPETENCIA NOT LIKE '3%'
        ORDER BY COMPETENCIA DESC
      `)) as any;
      const [conveniosRows] = await db.execute(sql.raw(`
        SELECT DISTINCT CONVENIO as convenio FROM tasy_faturado_itens_bi
        WHERE estabelecimentoId = ${estabId} AND CONVENIO IS NOT NULL AND TRIM(CONVENIO) != ''
        ORDER BY CONVENIO ASC
      `)) as any;
      const [setoresRows] = await db.execute(sql.raw(`
        SELECT DISTINCT SETOR as setor FROM tasy_faturado_itens_bi
        WHERE estabelecimentoId = ${estabId} AND SETOR IS NOT NULL AND TRIM(SETOR) != ''
        ORDER BY SETOR ASC
      `)) as any;

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
          faturado: n(row.faturado), recebido: n(row.recebido), glosado: n(row.glosado),
          qtd_itens: n(row.qtd_itens), qtd_glosados: n(row.qtd_glosados),
          pct_glosa: n(row.faturado) > 0 ? Number(((n(row.glosado) / n(row.faturado)) * 100).toFixed(2)) : 0
        })),
        porConvenio: (convenioRows || []).map((row: any) => ({
          convenio: row.convenio, faturado: n(row.faturado), recebido: n(row.recebido),
          glosado: n(row.glosado), qtd_itens: n(row.qtd_itens), qtd_glosados: n(row.qtd_glosados),
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
    })
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
