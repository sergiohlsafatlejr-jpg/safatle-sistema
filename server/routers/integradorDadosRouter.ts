import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { dataSyncEngine, SyncConfig } from "../dataSyncEngine";
import { WarleineConnector } from "../connectors/WarleineConnector";
import { logger } from "../_core/logger";

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
          mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }),

  /**
   * Cadastra uma configuração de query para sincronização
   */
  cadastrarQueryConfig: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        sistema: z.enum(["warleine", "tasy", "omni", "gesthor"]),
        tipoDados: z.enum(["atendimentos", "faturamento", "procedimentos", "pacientes"]),
        querySql: z.string(),
        descricao: z.string().optional(),
        frequencia: z.enum(["tempo_real", "1x_dia", "1x_semana"]).default("tempo_real"),
        conexaoConfig: z
          .object({
            host: z.string(),
            port: z.number(),
            database: z.string(),
            user: z.string(),
            password: z.string(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // TODO: Salvar no banco de dados

        const config: SyncConfig = {
          sistema: input.sistema,
          tipoDados: input.tipoDados,
          estabelecimentoId: input.estabelecimentoId,
          querySql: input.querySql,
          frequencia: input.frequencia,
          conexaoConfig: input.conexaoConfig,
        };

        dataSyncEngine.registrarConfig(config);

        logger.info({
          message: "Query configurada para sincronização",
          sistema: input.sistema,
          tipoDados: input.tipoDados,
          estabelecimentoId: input.estabelecimentoId,
        });

        return {
          sucesso: true,
          mensagem: "Configuração salva com sucesso",
        };
      } catch (error) {
        logger.error({
          message: "Erro ao cadastrar query",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }),

  /**
   * Executa sincronização de um sistema específico
   */
  sincronizar: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        sistema: z.enum(["warleine", "tasy", "omni", "gesthor"]),
        tipoDados: z.enum(["atendimentos", "faturamento", "procedimentos", "pacientes"]),
        querySql: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const config: SyncConfig = {
          sistema: input.sistema,
          tipoDados: input.tipoDados,
          estabelecimentoId: input.estabelecimentoId,
          querySql: input.querySql || "",
          frequencia: "tempo_real",
        };

        const resultado = await dataSyncEngine.sincronizar(config);

        return {
          sucesso: resultado.sucesso,
          sistema: resultado.sistema,
          tipoDados: resultado.tipoDados,
          totalRegistrosSincronizados: resultado.totalRegistrosSincronizados,
          totalErros: resultado.totalErros,
          mensagem: resultado.mensagem,
          duracao: resultado.duracao,
          timestamp: resultado.timestamp,
          erros: resultado.erros,
        };
      } catch (error) {
        logger.error({
          message: "Erro ao sincronizar",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          sistema: input.sistema,
          tipoDados: input.tipoDados,
          totalRegistrosSincronizados: 0,
          totalErros: 1,
          mensagem: error instanceof Error ? error.message : "Erro desconhecido",
          duracao: 0,
          timestamp: new Date(),
          erros: [error instanceof Error ? error.message : String(error)],
        };
      }
    }),

  /**
   * Obtém status da sincronização
   */
  obterStatus: protectedProcedure.query(async () => {
    try {
      const status = dataSyncEngine.getStatus();

      return {
        sucesso: true,
        isRunning: status.isRunning,
        totalConfigs: status.totalConfigs,
        configs: status.configs,
      };
    } catch (error) {
      logger.error({
        message: "Erro ao obter status",
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        sucesso: false,
        isRunning: false,
        totalConfigs: 0,
        configs: [],
      };
    }
  }),

  /**
   * Lista todas as configurações de query
   */
  listarConfiguracoes: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        sistema: z.enum(["warleine", "tasy", "omni", "gesthor"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        // TODO: Buscar do banco de dados

        const status = dataSyncEngine.getStatus();
        const configs = status.configs.filter(
          (c) =>
            c.estabelecimentoId === input.estabelecimentoId &&
            (!input.sistema || c.sistema === input.sistema)
        );

        return {
          sucesso: true,
          total: configs.length,
          configuracoes: configs,
        };
      } catch (error) {
        logger.error({
          message: "Erro ao listar configurações",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          total: 0,
          configuracoes: [],
        };
      }
    }),

  /**
   * Deleta uma configuração de query
   */
  deletarConfiguracao: protectedProcedure
    .input(
      z.object({
        configId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // TODO: Deletar do banco de dados

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
          mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }),

  /**
   * Obtém logs de sincronização
   */
  obterLogs: protectedProcedure
    .input(
      z.object({
        estabelecimentoId: z.number(),
        sistema: z.enum(["warleine", "tasy", "omni", "gesthor"]).optional(),
        limite: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      try {
        // TODO: Buscar do banco de dados

        return {
          sucesso: true,
          total: 0,
          logs: [],
        };
      } catch (error) {
        logger.error({
          message: "Erro ao obter logs",
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          sucesso: false,
          total: 0,
          logs: [],
        };
      }
    }),
});
