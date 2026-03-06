import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { tabelaCbhpm, tabelaPorteConvenio } from "../../drizzle/schema";
import { eq, and, like, sql, desc } from "drizzle-orm";

export const cbhpmRouter = router({
  // ============================================================
  // LISTAR PROCEDIMENTOS CBHPM
  // ============================================================
  listarCbhpm: protectedProcedure
    .input(z.object({
      busca: z.string().optional(),
      porte: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const conditions: any[] = [];
      if (input.busca) {
        conditions.push(sql`(${tabelaCbhpm.codigoProcedimento} LIKE ${`%${input.busca}%`} OR ${tabelaCbhpm.descricaoProcedimento} LIKE ${`%${input.busca}%`})`);
      }
      if (input.porte) {
        conditions.push(eq(tabelaCbhpm.porte, input.porte));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;

      const [items, countResult] = await Promise.all([
        db.select().from(tabelaCbhpm).where(whereClause).orderBy(tabelaCbhpm.codigoProcedimento).limit(input.limit).offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(tabelaCbhpm).where(whereClause),
      ]);

      return {
        items,
        total: Number(countResult[0]?.count || 0),
        page: input.page,
        totalPages: Math.ceil(Number(countResult[0]?.count || 0) / input.limit),
      };
    }),

  // ============================================================
  // IMPORTAR CBHPM (CSV/Excel)
  // ============================================================
  importarCbhpm: protectedProcedure
    .input(z.object({
      dados: z.array(z.object({
        codigoProcedimento: z.string(),
        descricaoProcedimento: z.string().optional(),
        porte: z.string().optional(),
        porteAnestesico: z.string().optional(),
        custoOperacional: z.string().optional(),
        numAuxiliares: z.number().optional(),
        incidencia: z.string().optional(),
        grupo: z.string().optional(),
        subgrupo: z.string().optional(),
      })),
      versao: z.string().default("6a"),
      substituirExistentes: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      let inseridos = 0;
      let atualizados = 0;
      let ignorados = 0;

      for (const item of input.dados) {
        // Verificar se já existe
        const existente = await db.select({ id: tabelaCbhpm.id })
          .from(tabelaCbhpm)
          .where(eq(tabelaCbhpm.codigoProcedimento, item.codigoProcedimento))
          .limit(1);

        if (existente.length > 0) {
          if (input.substituirExistentes) {
            await db.update(tabelaCbhpm)
              .set({
                descricaoProcedimento: item.descricaoProcedimento || null,
                porte: item.porte || null,
                porteAnestesico: item.porteAnestesico || null,
                custoOperacional: item.custoOperacional || null,
                numAuxiliares: item.numAuxiliares || 0,
                incidencia: item.incidencia || null,
                grupo: item.grupo || null,
                subgrupo: item.subgrupo || null,
                versao: input.versao,
              })
              .where(eq(tabelaCbhpm.id, existente[0].id));
            atualizados++;
          } else {
            ignorados++;
          }
        } else {
          await db.insert(tabelaCbhpm).values({
            codigoProcedimento: item.codigoProcedimento,
            descricaoProcedimento: item.descricaoProcedimento || null,
            porte: item.porte || null,
            porteAnestesico: item.porteAnestesico || null,
            custoOperacional: item.custoOperacional || null,
            numAuxiliares: item.numAuxiliares || 0,
            incidencia: item.incidencia || null,
            grupo: item.grupo || null,
            subgrupo: item.subgrupo || null,
            versao: input.versao,
          });
          inseridos++;
        }
      }

      return {
        message: `Importação CBHPM concluída: ${inseridos} inseridos, ${atualizados} atualizados, ${ignorados} ignorados`,
        inseridos,
        atualizados,
        ignorados,
      };
    }),

  // ============================================================
  // BUSCAR PORTE DE UM PROCEDIMENTO (CBHPM + Convênio)
  // ============================================================
  buscarPorte: protectedProcedure
    .input(z.object({
      codigoProcedimento: z.string(),
      convenio: z.string().optional(),
      estabelecimentoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      // 1. Buscar na tabela específica do convênio (prioridade)
      let porteConvenio = null;
      if (input.convenio) {
        const result = await db.select()
          .from(tabelaPorteConvenio)
          .where(and(
            eq(tabelaPorteConvenio.estabelecimentoId, input.estabelecimentoId),
            eq(tabelaPorteConvenio.convenio, input.convenio),
            eq(tabelaPorteConvenio.codigoProcedimento, input.codigoProcedimento),
          ))
          .limit(1);
        if (result.length > 0) {
          porteConvenio = result[0];
        }
      }

      // 2. Buscar na CBHPM (fallback)
      const cbhpm = await db.select()
        .from(tabelaCbhpm)
        .where(eq(tabelaCbhpm.codigoProcedimento, input.codigoProcedimento))
        .limit(1);

      return {
        porteConvenio: porteConvenio || null,
        cbhpm: cbhpm[0] || null,
        fonte: porteConvenio ? "CONVENIO" : (cbhpm[0] ? "CBHPM" : "NAO_ENCONTRADO"),
        porte: porteConvenio?.porte || cbhpm[0]?.porte || null,
        porteAnestesico: porteConvenio?.porteAnestesico || cbhpm[0]?.porteAnestesico || null,
        valorTaxaSala: porteConvenio?.valorTaxaSala || null,
      };
    }),

  // ============================================================
  // LISTAR TABELAS DE PORTE POR CONVÊNIO
  // ============================================================
  listarPorteConvenio: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      convenio: z.string().optional(),
      busca: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const conditions: any[] = [eq(tabelaPorteConvenio.estabelecimentoId, input.estabelecimentoId)];
      if (input.convenio) conditions.push(eq(tabelaPorteConvenio.convenio, input.convenio));
      if (input.busca) {
        conditions.push(sql`(${tabelaPorteConvenio.codigoProcedimento} LIKE ${`%${input.busca}%`} OR ${tabelaPorteConvenio.descricaoProcedimento} LIKE ${`%${input.busca}%`})`);
      }

      const whereClause = and(...conditions);
      const offset = (input.page - 1) * input.limit;

      const [items, countResult] = await Promise.all([
        db.select().from(tabelaPorteConvenio).where(whereClause).orderBy(tabelaPorteConvenio.codigoProcedimento).limit(input.limit).offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(tabelaPorteConvenio).where(whereClause),
      ]);

      // Listar convênios disponíveis
      const convenios = await db.selectDistinct({ convenio: tabelaPorteConvenio.convenio })
        .from(tabelaPorteConvenio)
        .where(eq(tabelaPorteConvenio.estabelecimentoId, input.estabelecimentoId));

      return {
        items,
        total: Number(countResult[0]?.count || 0),
        page: input.page,
        totalPages: Math.ceil(Number(countResult[0]?.count || 0) / input.limit),
        convenios: convenios.map(c => c.convenio),
      };
    }),

  // ============================================================
  // IMPORTAR TABELA DE PORTE POR CONVÊNIO
  // ============================================================
  importarPorteConvenio: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      convenio: z.string(),
      dados: z.array(z.object({
        codigoProcedimento: z.string(),
        descricaoProcedimento: z.string().optional(),
        porte: z.string().optional(),
        porteAnestesico: z.string().optional(),
        valorTaxaSala: z.string().optional(),
        valorHonorarioAnestesico: z.string().optional(),
        custoOperacional: z.string().optional(),
      })),
      substituirExistentes: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      let inseridos = 0;
      let atualizados = 0;
      let ignorados = 0;

      for (const item of input.dados) {
        const existente = await db.select({ id: tabelaPorteConvenio.id })
          .from(tabelaPorteConvenio)
          .where(and(
            eq(tabelaPorteConvenio.estabelecimentoId, input.estabelecimentoId),
            eq(tabelaPorteConvenio.convenio, input.convenio),
            eq(tabelaPorteConvenio.codigoProcedimento, item.codigoProcedimento),
          ))
          .limit(1);

        if (existente.length > 0) {
          if (input.substituirExistentes) {
            await db.update(tabelaPorteConvenio)
              .set({
                descricaoProcedimento: item.descricaoProcedimento || null,
                porte: item.porte || null,
                porteAnestesico: item.porteAnestesico || null,
                valorTaxaSala: item.valorTaxaSala || null,
                valorHonorarioAnestesico: item.valorHonorarioAnestesico || null,
                custoOperacional: item.custoOperacional || null,
              })
              .where(eq(tabelaPorteConvenio.id, existente[0].id));
            atualizados++;
          } else {
            ignorados++;
          }
        } else {
          await db.insert(tabelaPorteConvenio).values({
            estabelecimentoId: input.estabelecimentoId,
            convenio: input.convenio,
            codigoProcedimento: item.codigoProcedimento,
            descricaoProcedimento: item.descricaoProcedimento || null,
            porte: item.porte || null,
            porteAnestesico: item.porteAnestesico || null,
            valorTaxaSala: item.valorTaxaSala || null,
            valorHonorarioAnestesico: item.valorHonorarioAnestesico || null,
            custoOperacional: item.custoOperacional || null,
            origem: "importacao",
          });
          inseridos++;
        }
      }

      return {
        message: `Importação ${input.convenio} concluída: ${inseridos} inseridos, ${atualizados} atualizados, ${ignorados} ignorados`,
        inseridos,
        atualizados,
        ignorados,
      };
    }),

  // ============================================================
  // RESUMO DAS TABELAS DE PORTE
  // ============================================================
  resumo: protectedProcedure
    .input(z.object({ estabelecimentoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const [cbhpmCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(tabelaCbhpm);
      const [convenioCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(tabelaPorteConvenio)
        .where(eq(tabelaPorteConvenio.estabelecimentoId, input.estabelecimentoId));
      
      const convenios = await db.selectDistinct({ convenio: tabelaPorteConvenio.convenio })
        .from(tabelaPorteConvenio)
        .where(eq(tabelaPorteConvenio.estabelecimentoId, input.estabelecimentoId));

      return {
        totalCbhpm: Number(cbhpmCount?.count || 0),
        totalPorteConvenio: Number(convenioCount?.count || 0),
        conveniosComTabela: convenios.map(c => c.convenio),
      };
    }),

  // ============================================================
  // ADICIONAR/EDITAR REGISTRO MANUAL
  // ============================================================
  adicionarPorteConvenio: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      convenio: z.string(),
      codigoProcedimento: z.string(),
      descricaoProcedimento: z.string().optional(),
      porte: z.string().optional(),
      porteAnestesico: z.string().optional(),
      valorTaxaSala: z.string().optional(),
      valorHonorarioAnestesico: z.string().optional(),
      custoOperacional: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      await db.insert(tabelaPorteConvenio).values({
        estabelecimentoId: input.estabelecimentoId,
        convenio: input.convenio,
        codigoProcedimento: input.codigoProcedimento,
        descricaoProcedimento: input.descricaoProcedimento || null,
        porte: input.porte || null,
        porteAnestesico: input.porteAnestesico || null,
        valorTaxaSala: input.valorTaxaSala || null,
        valorHonorarioAnestesico: input.valorHonorarioAnestesico || null,
        custoOperacional: input.custoOperacional || null,
        observacoes: input.observacoes || null,
        origem: "manual",
      });

      return { success: true, message: "Registro adicionado com sucesso" };
    }),

  // ============================================================
  // EXCLUIR REGISTRO
  // ============================================================
  excluirPorteConvenio: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      await db.delete(tabelaPorteConvenio).where(eq(tabelaPorteConvenio.id, input.id));
      return { success: true, message: "Registro excluído" };
    }),
});
