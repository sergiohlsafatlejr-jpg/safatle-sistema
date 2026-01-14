import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { storagePut, storageGet } from "./storage";
import { parseFile, toProcedimentoInsert } from "./parsers";
import { compararProcedimentos, toDivergenciaInsert, gerarResumoComparacao } from "./comparador";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ CONVENIOS ============
  convenios: router({
    list: protectedProcedure
      .input(z.object({ ativo: z.enum(["sim", "nao"]).optional() }).optional())
      .query(async ({ input }) => {
        return db.getConvenios(input?.ativo);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getConvenioById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1),
          codigo: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createConvenio({
          nome: input.nome,
          codigo: input.codigo || null,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          codigo: z.string().optional(),
          ativo: z.enum(["sim", "nao"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateConvenio(id, data);
        return { success: true };
      }),
  }),

  // ============ ARQUIVOS ============
  arquivos: router({
    list: protectedProcedure
      .input(
        z
          .object({
            convenioId: z.number().optional(),
            direcao: z.enum(["enviado", "retornado"]).optional(),
            tipoArquivo: z.enum(["xml", "excel", "pdf"]).optional(),
            status: z.enum(["pendente", "processado", "erro"]).optional(),
            dataInicio: z.string().optional(),
            dataFim: z.string().optional(),
            busca: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return db.getArquivos({
          ...input,
          userId: ctx.user.id,
          dataInicio: input?.dataInicio ? new Date(input.dataInicio) : undefined,
          dataFim: input?.dataFim ? new Date(input.dataFim) : undefined,
        });
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getArquivoById(input.id);
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getArquivosStats(ctx.user.id);
    }),

    upload: protectedProcedure
      .input(
        z.object({
          nome: z.string(),
          tipoArquivo: z.enum(["xml", "excel", "pdf"]),
          direcao: z.enum(["enviado", "retornado"]),
          convenioId: z.number(),
          conteudo: z.string(), // Base64 encoded
          dataReferencia: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Decode base64 content
        const buffer = Buffer.from(input.conteudo, "base64");
        
        // Generate unique S3 key
        const ext = input.tipoArquivo === "excel" ? "xlsx" : input.tipoArquivo;
        const s3Key = `arquivos/${ctx.user.id}/${nanoid()}-${input.nome}.${ext}`;
        
        // Upload to S3
        const contentType =
          input.tipoArquivo === "xml"
            ? "application/xml"
            : input.tipoArquivo === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf";
        
        const { url } = await storagePut(s3Key, buffer, contentType);
        
        // Create arquivo record
        const { id: arquivoId } = await db.createArquivo({
          nome: input.nome,
          tipoArquivo: input.tipoArquivo,
          direcao: input.direcao,
          convenioId: input.convenioId,
          userId: ctx.user.id,
          s3Key,
          s3Url: url,
          tamanho: buffer.length,
          status: "pendente",
          dataReferencia: input.dataReferencia ? new Date(input.dataReferencia) : null,
        });
        
        // Parse file and extract procedimentos
        try {
          const parseResult = await parseFile(buffer, input.tipoArquivo);
          
          if (parseResult.success && parseResult.procedimentos.length > 0) {
            const procedimentosToInsert = parseResult.procedimentos.map((p) =>
              toProcedimentoInsert(p, arquivoId)
            );
            await db.createProcedimentos(procedimentosToInsert);
            await db.updateArquivoStatus(arquivoId, "processado");
          } else if (!parseResult.success) {
            await db.updateArquivoStatus(arquivoId, "erro");
          } else {
            await db.updateArquivoStatus(arquivoId, "processado");
          }
        } catch (error) {
          console.error("Error parsing file:", error);
          await db.updateArquivoStatus(arquivoId, "erro");
        }
        
        return { id: arquivoId, s3Url: url };
      }),

    procedimentos: protectedProcedure
      .input(z.object({ arquivoId: z.number() }))
      .query(async ({ input }) => {
        return db.getProcedimentosByArquivoId(input.arquivoId);
      }),
  }),

  // ============ COMPARACOES ============
  comparacoes: router({
    list: protectedProcedure
      .input(
        z
          .object({
            convenioId: z.number().optional(),
            status: z.enum(["pendente", "concluida", "erro"]).optional(),
            dataInicio: z.string().optional(),
            dataFim: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return db.getComparacoes({
          ...input,
          userId: ctx.user.id,
          dataInicio: input?.dataInicio ? new Date(input.dataInicio) : undefined,
          dataFim: input?.dataFim ? new Date(input.dataFim) : undefined,
        });
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const comparacao = await db.getComparacaoById(input.id);
        if (!comparacao) return null;

        const divergencias = await db.getDivergenciasByComparacaoId(input.id);
        return { ...comparacao, divergencias };
      }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getComparacoesStats(ctx.user.id);
    }),

    criar: protectedProcedure
      .input(
        z.object({
          arquivoEnviadoId: z.number(),
          arquivoRetornadoId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Get arquivos
        const [arquivoEnviado, arquivoRetornado] = await Promise.all([
          db.getArquivoById(input.arquivoEnviadoId),
          db.getArquivoById(input.arquivoRetornadoId),
        ]);

        if (!arquivoEnviado || !arquivoRetornado) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Arquivo não encontrado",
          });
        }

        if (arquivoEnviado.convenioId !== arquivoRetornado.convenioId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Os arquivos devem ser do mesmo convênio",
          });
        }

        // Create comparacao record
        const { id: comparacaoId } = await db.createComparacao({
          arquivoEnviadoId: input.arquivoEnviadoId,
          arquivoRetornadoId: input.arquivoRetornadoId,
          convenioId: arquivoEnviado.convenioId,
          userId: ctx.user.id,
          status: "pendente",
        });

        // Get procedimentos
        const [procEnviados, procRetornados] = await Promise.all([
          db.getProcedimentosByArquivoId(input.arquivoEnviadoId),
          db.getProcedimentosByArquivoId(input.arquivoRetornadoId),
        ]);

        // Run comparison
        const resultado = compararProcedimentos(procEnviados, procRetornados);

        // Save divergencias
        if (resultado.divergencias.length > 0) {
          const divergenciasToInsert = resultado.divergencias.map((d) =>
            toDivergenciaInsert(d, comparacaoId)
          );
          await db.createDivergencias(divergenciasToInsert);
        }

        // Update comparacao with results
        await db.updateComparacao(comparacaoId, {
          status: "concluida",
          totalItensEnviados: resultado.totalItensEnviados,
          totalItensRetornados: resultado.totalItensRetornados,
          totalDivergencias: resultado.totalDivergencias,
          valorTotalEnviado: resultado.valorTotalEnviado.toString(),
          valorTotalRetornado: resultado.valorTotalRetornado.toString(),
          diferencaValor: resultado.diferencaValor.toString(),
        });

        return {
          id: comparacaoId,
          ...resultado,
          resumo: gerarResumoComparacao(resultado),
        };
      }),

    divergencias: protectedProcedure
      .input(z.object({ comparacaoId: z.number() }))
      .query(async ({ input }) => {
        return db.getDivergenciasByComparacaoId(input.comparacaoId);
      }),

    resolverDivergencia: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          resolvido: z.enum(["sim", "nao"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateDivergenciaResolvido(input.id, input.resolvido);
        return { success: true };
      }),
  }),

  // ============ CODIGOS PROCEDIMENTOS (ADMIN) ============
  codigosProcedimentos: router({
    list: protectedProcedure
      .input(z.object({ ativo: z.enum(["sim", "nao"]).optional() }).optional())
      .query(async ({ input }) => {
        return db.getCodigosProcedimentos(input?.ativo);
      }),

    create: protectedProcedure
      .input(
        z.object({
          codigo: z.string().min(1),
          descricao: z.string().min(1),
          valorReferencia: z.number().optional(),
          categoria: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createCodigoProcedimento({
          codigo: input.codigo,
          descricao: input.descricao,
          valorReferencia: input.valorReferencia?.toString() || null,
          categoria: input.categoria || null,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          codigo: z.string().optional(),
          descricao: z.string().optional(),
          valorReferencia: z.number().optional(),
          categoria: z.string().optional(),
          ativo: z.enum(["sim", "nao"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, valorReferencia, ...rest } = input;
        await db.updateCodigoProcedimento(id, {
          ...rest,
          valorReferencia: valorReferencia?.toString(),
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCodigoProcedimento(input.id);
        return { success: true };
      }),
  }),

  // ============ CAMPOS COMPARACAO (ADMIN) ============
  camposComparacao: router({
    list: protectedProcedure
      .input(z.object({ ativo: z.enum(["sim", "nao"]).optional() }).optional())
      .query(async ({ input }) => {
        return db.getCamposComparacao(input?.ativo);
      }),

    create: protectedProcedure
      .input(
        z.object({
          nome: z.string().min(1),
          campoOrigem: z.string().min(1),
          obrigatorio: z.enum(["sim", "nao"]).optional(),
          tolerancia: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return db.createCampoComparacao({
          nome: input.nome,
          campoOrigem: input.campoOrigem,
          obrigatorio: input.obrigatorio || "nao",
          tolerancia: input.tolerancia?.toString() || null,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nome: z.string().optional(),
          campoOrigem: z.string().optional(),
          ativo: z.enum(["sim", "nao"]).optional(),
          obrigatorio: z.enum(["sim", "nao"]).optional(),
          tolerancia: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, tolerancia, ...rest } = input;
        await db.updateCampoComparacao(id, {
          ...rest,
          tolerancia: tolerancia?.toString(),
        });
        return { success: true };
      }),
  }),

  // ============ ITENS MANUAIS ============
  itensManuals: router({
    list: protectedProcedure
      .input(
        z
          .object({
            arquivoId: z.number().optional(),
            comparacaoId: z.number().optional(),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        return db.getItensManuals({
          ...input,
          userId: ctx.user.id,
        });
      }),

    create: protectedProcedure
      .input(
        z.object({
          arquivoId: z.number().optional(),
          comparacaoId: z.number().optional(),
          codigo: z.string().min(1),
          descricao: z.string().optional(),
          quantidade: z.number().optional(),
          valorUnitario: z.number().optional(),
          valorTotal: z.number().optional(),
          observacao: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        return db.createItemManual({
          arquivoId: input.arquivoId || null,
          comparacaoId: input.comparacaoId || null,
          userId: ctx.user.id,
          codigo: input.codigo,
          descricao: input.descricao || null,
          quantidade: input.quantidade || 1,
          valorUnitario: input.valorUnitario?.toString() || null,
          valorTotal: input.valorTotal?.toString() || null,
          observacao: input.observacao || null,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteItemManual(input.id);
        return { success: true };
      }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    resumo: protectedProcedure.query(async ({ ctx }) => {
      const [arquivosStats, comparacoesStats] = await Promise.all([
        db.getArquivosStats(ctx.user.id),
        db.getComparacoesStats(ctx.user.id),
      ]);

      return {
        arquivos: arquivosStats,
        comparacoes: comparacoesStats,
      };
    }),

    ultimasComparacoes: protectedProcedure
      .input(z.object({ limit: z.number().default(5) }).optional())
      .query(async ({ input, ctx }) => {
        const comparacoes = await db.getComparacoes({ userId: ctx.user.id });
        return comparacoes.slice(0, input?.limit || 5);
      }),

    ultimosArquivos: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }).optional())
      .query(async ({ input, ctx }) => {
        const arquivos = await db.getArquivos({ userId: ctx.user.id });
        return arquivos.slice(0, input?.limit || 10);
      }),
  }),
});

export type AppRouter = typeof appRouter;
