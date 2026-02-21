import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { regrasNegocio, itensRegraNegocio } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Router tRPC para gerenciamento de padrões de procedimentos
 * Reutiliza tabelas existentes (regrasNegocio, itensRegraNegocio)
 * com tipoRegra = 'padrao_procedimento'
 */
export const padroesProcedimentosRouter = router({
  /**
   * Listar padrões de procedimentos por convênio
   */
  listar: protectedProcedure
    .input(
      z.object({
        convenioId: z.number().optional(),
        estabelecimentoId: z.number().optional(),
        ativo: z.enum(["sim", "nao"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const filters: any[] = [
        eq(regrasNegocio.tipoRegra, "padrao_procedimento" as any),
      ];

      if (input?.convenioId) {
        filters.push(eq(regrasNegocio.convenioId, input.convenioId));
      }
      if (input?.estabelecimentoId) {
        filters.push(eq(regrasNegocio.estabelecimentoId, input.estabelecimentoId));
      }
      if (input?.ativo) {
        filters.push(eq(regrasNegocio.ativo, input.ativo));
      }

      const padroes = await db
        .select()
        .from(regrasNegocio)
        .where(and(...filters));

      return padroes;
    }),

  /**
   * Obter detalhes de um padrão específico com seus itens
   */
  obter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const padrao = await db
        .select()
        .from(regrasNegocio)
        .where(
          and(
            eq(regrasNegocio.id, input.id),
            eq(regrasNegocio.tipoRegra, "padrao_procedimento" as any)
          )
        )
        .limit(1);

      if (!padrao || padrao.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Padrão não encontrado" });
      }

      const itens = await db
        .select()
        .from(itensRegraNegocio)
        .where(eq(itensRegraNegocio.regraId, input.id));

      return {
        ...padrao[0],
        itens,
      };
    }),

  /**
   * Criar novo padrão de procedimento com itens
   */
  criar: protectedProcedure
    .input(
      z.object({
        convenioId: z.number().optional(),
        estabelecimentoId: z.number().optional(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
        codigoProcedimento: z.string().min(1),
        nomeProcedimento: z.string().min(1),
        tolerancia_percentual: z.number().min(0).max(100),
        tolerancia_absoluta: z.number().min(0),
        diaria_obrigatoria: z.boolean().default(false),
        diaria_esperada_por_dia: z.number().min(0).optional(),
        score_minimo_aceitavel: z.number().min(0).max(100).default(70),
        itens: z.array(
          z.object({
            codigoItem: z.string().min(1),
            descricaoItem: z.string().optional(),
            tipoItem: z.enum(["procedimento", "taxa", "material", "medicamento", "diaria", "outros"]),
            quantidadeMinima: z.number().min(0).optional(),
            quantidadeMaxima: z.number().min(0).optional(),
            obrigatorio: z.boolean().default(true),
            tabelaPrecoCodigo: z.string().optional(),
            tolerancia_percentual: z.number().min(0).max(100).optional(),
            tolerancia_absoluta: z.number().min(0).optional(),
            ordem: z.number().min(0).default(0),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Criar regra
      const result = await db.insert(regrasNegocio).values({
        convenioId: input.convenioId || null,
        estabelecimentoId: input.estabelecimentoId || null,
        nome: input.nome,
        descricao: input.descricao || null,
        codigoProcedimentoPrincipal: input.codigoProcedimento,
        descricaoProcedimentoPrincipal: input.nomeProcedimento,
        tipoRegra: "padrao_procedimento" as any,
        codigoProcedimento: input.codigoProcedimento,
        nomeProcedimento: input.nomeProcedimento,
        tolerancia_percentual: input.tolerancia_percentual.toString(),
        tolerancia_absoluta: input.tolerancia_absoluta.toString(),
        diaria_obrigatoria: input.diaria_obrigatoria ? 1 : 0,
        diaria_esperada_por_dia: input.diaria_esperada_por_dia || null,
        score_minimo_aceitavel: input.score_minimo_aceitavel,
        ativo: "sim" as any,
      });

      const regraId = result[0].insertId;

      // Criar itens
      if (input.itens && input.itens.length > 0) {
        await db.insert(itensRegraNegocio).values(
          input.itens.map((item) => ({
            regraId: Number(regraId),
            codigoItem: item.codigoItem,
            descricaoItem: item.descricaoItem || null,
            tipoItem: item.tipoItem as any,
            quantidadeMinima: item.quantidadeMinima || null,
            quantidadeMaxima: item.quantidadeMaxima || null,
            obrigatorio: item.obrigatorio ? ("sim" as any) : ("nao" as any),
          }))
        );
      }

      return { id: regraId, ...input };
    }),

  /**
   * Atualizar padrão de procedimento
   */
  atualizar: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().optional(),
        descricao: z.string().optional(),
        tolerancia_percentual: z.number().min(0).max(100).optional(),
        tolerancia_absoluta: z.number().min(0).optional(),
        diaria_obrigatoria: z.boolean().optional(),
        diaria_esperada_por_dia: z.number().min(0).optional(),
        score_minimo_aceitavel: z.number().min(0).max(100).optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const { id, ...updateData } = input;

      const updates: any = {};
      if (updateData.nome) updates.nome = updateData.nome;
      if (updateData.descricao) updates.descricao = updateData.descricao;
      if (updateData.tolerancia_percentual !== undefined)
        updates.tolerancia_percentual = updateData.tolerancia_percentual.toString();
      if (updateData.tolerancia_absoluta !== undefined)
        updates.tolerancia_absoluta = updateData.tolerancia_absoluta;
      if (updateData.diaria_obrigatoria !== undefined)
        updates.diaria_obrigatoria = updateData.diaria_obrigatoria ? 1 : 0;
      if (updateData.diaria_esperada_por_dia !== undefined)
        updates.diaria_esperada_por_dia = updateData.diaria_esperada_por_dia;
      if (updateData.score_minimo_aceitavel !== undefined)
        updates.score_minimo_aceitavel = updateData.score_minimo_aceitavel;
      if (updateData.ativo !== undefined) updates.ativo = updateData.ativo ? ("sim" as any) : ("nao" as any);

      await db
        .update(regrasNegocio)
        .set(updates)
        .where(
          and(
            eq(regrasNegocio.id, id),
            eq(regrasNegocio.tipoRegra, "padrao_procedimento" as any)
          )
        );

      return { success: true };
    }),

  /**
   * Adicionar item a um padrão existente
   */
  adicionarItem: protectedProcedure
    .input(
      z.object({
        regraId: z.number(),
        codigoItem: z.string().min(1),
        descricaoItem: z.string().optional(),
        tipoItem: z.enum(["procedimento", "taxa", "material", "medicamento", "diaria", "outros"]),
        quantidadeMinima: z.number().min(0).optional(),
        quantidadeMaxima: z.number().min(0).optional(),
        obrigatorio: z.boolean().default(true),
        tabelaPrecoCodigo: z.string().optional(),
        tolerancia_percentual: z.number().min(0).max(100).optional(),
        tolerancia_absoluta: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const result = await db.insert(itensRegraNegocio).values({
        regraId: input.regraId,
        codigoItem: input.codigoItem,
        descricaoItem: input.descricaoItem || null,
        tipoItem: input.tipoItem as any,
        quantidadeMinima: input.quantidadeMinima || null,
        quantidadeMaxima: input.quantidadeMaxima || null,
        obrigatorio: input.obrigatorio ? ("sim" as any) : ("nao" as any),
      });

      return { id: result[0].insertId, ...input };
    }),

  /**
   * Remover item de um padrão
   */
  removerItem: protectedProcedure
    .input(z.object({ itemId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      await db
        .delete(itensRegraNegocio)
        .where(eq(itensRegraNegocio.id, input.itemId));

      return { success: true };
    }),

  /**
   * Deletar padrão de procedimento
   */
  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Deletar itens primeiro
      await db
        .delete(itensRegraNegocio)
        .where(eq(itensRegraNegocio.regraId, input.id));

      // Deletar regra
      await db
        .delete(regrasNegocio)
        .where(
          and(
            eq(regrasNegocio.id, input.id),
            eq(regrasNegocio.tipoRegra, "padrao_procedimento" as any)
          )
        );

      return { success: true };
    }),
});
