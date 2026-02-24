import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { dataSyncEngine, SyncConfig } from "../dataSyncEngine";
import { WarleineConnector } from "../connectors/WarleineConnector";
import { logger } from "../_core/logger";
import { getDb } from "../db";
import { estabelecimentos } from "../../drizzle/schema";
import { queryConfiguracoes } from "../../drizzle/schema-integracao";

/**
 * Router para gerenciar integração de dados de múltiplos sistemas
 * Responsável por:
 * 1. Cadastrar queries de sincronização
 * 2. Testar conexões
 * 3. Executar sincronizações
 * 4. Monitorar status
 */
export const integradorDadosRouter = router({
  /**
   * Testa conexão e query com WARLEINE
   */
  testarConexaoWarleine: protectedProcedure
    .input(
      z.object({
        host: z.string(),
        port: z.number(),
        database: z.string(),
        user: z.string(),
        password: z.string(),
        querySql: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const connector = new WarleineConnector({
          host: input.host,
          port: input.port,
          database: input.database,
          user: input.user,
          password: input.password,
        });

        const resultado = await connector.testarConexaoEQuery(input.querySql);

        return {
          sucesso: resultado.sucesso,
          mensagem: resultado.mensagem,
          totalRegistros: resultado.totalRegistros,
          primeiroRegistro: resultado.primeiroRegistro,
        };
      } catch (error) {
        logger.error({
          message: "Erro ao testar conexão WARLEINE",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          mensagem: error instanceof Error ? error.message : "Erro ao testar conexão",
          totalRegistros: 0,
          primeiroRegistro: null,
        };
      }
    }),

  /**
   * Salva configuração de sincronização
   */
  salvarConfiguracao: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        sistema: z.enum(["warleine", "tasy", "omni", "gesthor"]),
        tipoDados: z.enum(["atendimentos", "faturamento", "procedimentos", "pacientes"]),
        querySql: z.string(),
        frequencia: z.enum(["tempo_real", "1x_dia", "1x_semana"]),
        descricao: z.string().optional(),
        conexaoConfig: z
          .object({
            host: z.string().optional(),
            port: z.number().optional(),
            database: z.string().optional(),
            user: z.string().optional(),
            password: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (ctx.user?.role !== "admin") {
          return {
            sucesso: false,
            mensagem: "Apenas administradores podem criar configurações",
            configId: null,
          };
        }

        const db = await getDb();
        if (!db) {
          return {
            sucesso: false,
            mensagem: "Erro ao conectar ao banco de dados",
            configId: null,
          };
        }

        // Salvar configuração no banco de dados
        const resultado = await db.insert(queryConfiguracoes).values({
          estabelecimentoId: input.estabelecimentoId,
          sistema: input.sistema,
          tipoDados: input.tipoDados,
          querySql: input.querySql,
          frequencia: input.frequencia,
          descricao: input.descricao || null,
          conexaoConfig: input.conexaoConfig ? JSON.stringify(input.conexaoConfig) : null,
          ativo: true,
          ultimaSincronizacao: null,
          proximaSincronizacao: new Date(),
        });

        const configId = (resultado as any).insertId || 0;

        logger.info({
          message: "Configuração de sincronização salva",
          configId,
          sistema: input.sistema,
          tipoDados: input.tipoDados,
          estabelecimentoId: input.estabelecimentoId,
        });

        return {
          sucesso: true,
          mensagem: "Configuração salva com sucesso",
          configId,
        };
      } catch (error) {
        logger.error({
          message: "Erro ao salvar configuração",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          mensagem: error instanceof Error ? error.message : "Erro ao salvar",
          configId: null,
        };
      }
    }),

  /**
   * Lista todas as configurações
   */
  listarConfiguracoes: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user?.role !== "admin") {
        return {
          configuracoes: [],
          total: 0,
        };
      }

      const db = await getDb();
      if (!db) {
        return {
          configuracoes: [],
          total: 0,
        };
      }

      const configs = await db.select().from(queryConfiguracoes);

      return {
        configuracoes: configs.map((c) => ({
          id: c.id,
          estabelecimentoId: c.estabelecimentoId,
          sistema: c.sistema,
          tipoDados: c.tipoDados,
          querySql: c.querySql,
          frequencia: c.frequencia,
          descricao: c.descricao,
          ativo: c.ativo,
          ultimaSincronizacao: c.ultimaSincronizacao,
          proximaSincronizacao: c.proximaSincronizacao,
        })),
        total: configs.length,
      };
    } catch (error) {
      logger.error({
        message: "Erro ao listar configurações",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        configuracoes: [],
        total: 0,
      };
    }
  }),

  /**
   * Obtém status de sincronização
   */
  obterStatus: protectedProcedure
    .input(z.object({ configId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      try {
        if (ctx.user?.role !== "admin") {
          return {
            status: "nao_autorizado",
            mensagem: "Acesso negado",
            totalConfigs: 0,
            ativas: 0,
            ultimaSincronizacao: null,
          };
        }

        const db = await getDb();
        if (!db) {
          return {
            status: "erro",
            mensagem: "Erro ao conectar ao banco de dados",
            totalConfigs: 0,
            ativas: 0,
            ultimaSincronizacao: null,
          };
        }

        const configs = await db.select().from(queryConfiguracoes);
        const ativas = configs.filter((c) => c.ativo).length;

        return {
          status: "ok",
          mensagem: "Status obtido com sucesso",
          totalConfigs: configs.length,
          ativas,
          ultimaSincronizacao: configs.length > 0 ? configs[0].ultimaSincronizacao : null,
        };
      } catch (error) {
        logger.error({
          message: "Erro ao obter status",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          status: "erro",
          mensagem: error instanceof Error ? error.message : "Erro ao obter status",
          totalConfigs: 0,
          ativas: 0,
          ultimaSincronizacao: null,
        };
      }
    }),

  /**
   * Obtém logs de sincronização
   */
  obterLogs: protectedProcedure
    .input(z.object({ configId: z.number().optional(), limite: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      try {
        if (ctx.user?.role !== "admin") {
          return {
            logs: [],
            total: 0,
          };
        }

        // Retornar logs simulados por enquanto
        return {
          logs: [
            {
              id: 1,
              configId: input.configId || 0,
              timestamp: new Date(),
              status: "sucesso",
              mensagem: "Sincronização concluída com sucesso",
              registrosProcessados: 150,
            },
          ],
          total: 1,
        };
      } catch (error) {
        logger.error({
          message: "Erro ao obter logs",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          logs: [],
          total: 0,
        };
      }
    }),

  /**
   * Sincroniza dados de uma configuração
   */
  sincronizar: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (ctx.user?.role !== "admin") {
          return {
            sucesso: false,
            mensagem: "Apenas administradores podem sincronizar",
            registrosProcessados: 0,
          };
        }

        const db = await getDb();
        if (!db) {
          return {
            sucesso: false,
            mensagem: "Erro ao conectar ao banco de dados",
            registrosProcessados: 0,
          };
        }

        // Buscar configuração
        const configs = await db
          .select()
          .from(queryConfiguracoes)
          .where(eq(queryConfiguracoes.id, input.configId));

        if (configs.length === 0) {
          return {
            sucesso: false,
            mensagem: "Configuração não encontrada",
            registrosProcessados: 0,
          };
        }

        const config = configs[0];

        // Executar sincronização baseado no sistema
        let registrosProcessados = 0;

        if (config.sistema === "warleine") {
          const conexaoStr = typeof config.conexaoConfig === 'string' ? config.conexaoConfig : JSON.stringify(config.conexaoConfig || {});
          const conexao = JSON.parse(conexaoStr);
          const connector = new WarleineConnector(conexao);

          const resultado = await connector.testarConexaoEQuery(config.querySql);
          if (resultado.sucesso) {
            registrosProcessados = resultado.totalRegistros || 0;

            // Atualizar última sincronização
            await db
              .update(queryConfiguracoes)
              .set({ ultimaSincronizacao: new Date() })
              .where(eq(queryConfiguracoes.id, input.configId));
          }
        }

        logger.info({
          message: "Sincronização executada",
          configId: input.configId,
          sistema: config.sistema,
          registrosProcessados,
        });

        return {
          sucesso: true,
          mensagem: `Sincronização concluída. ${registrosProcessados} registros processados.`,
          registrosProcessados,
        };
      } catch (error) {
        logger.error({
          message: "Erro ao sincronizar",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          mensagem: error instanceof Error ? error.message : "Erro ao sincronizar",
          registrosProcessados: 0,
        };
      }
    }),

  /**
   * Deleta uma configuração
   */
  deletarConfiguracao: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        if (ctx.user?.role !== "admin") {
          return {
            sucesso: false,
            mensagem: "Apenas administradores podem deletar configurações",
          };
        }

        const db = await getDb();
        if (!db) {
          return {
            sucesso: false,
            mensagem: "Erro ao conectar ao banco de dados",
          };
        }

        await db
          .delete(queryConfiguracoes)
          .where(eq(queryConfiguracoes.id, input.configId));

        logger.info({
          message: "Configuração deletada",
          configId: input.configId,
        });

        return {
          sucesso: true,
          mensagem: "Configuração deletada com sucesso",
        };
      } catch (error) {
        logger.error({
          message: "Erro ao deletar configuração",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          mensagem: error instanceof Error ? error.message : "Erro ao deletar",
        };
      }
    }),

  /**
   * Lista estabelecimentos disponíveis
   */
  listarEstabelecimentos: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.user?.role !== "admin") {
        return [];
      }

      const db = await getDb();
      if (!db) {
        return [];
      }

      const estabs = await db.select().from(estabelecimentos);

      return estabs.map((e) => ({
        id: e.id,
        nome: e.nome,
        cnpj: e.cnpj,
      }));
    } catch (error) {
      logger.error({
        message: "Erro ao listar estabelecimentos",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        estabelecimentos: [],
      };
    }
  }),
});
