import { logger } from "./_core/logger";
import { WarleineConnector, WarleineAtendimento } from "./connectors/WarleineConnector";
import { OracleConnector } from "./connectors/OracleConnector";
import { getDb } from "./db";
import { warleineAtendimentosStaging, warleineFaturamentoStaging, tasyMaternidadeElaAtendimentosStaging, queryConfiguracoes } from "../drizzle/schema-integracao";
// Para pegar o ID da config:
import { eq, sql } from "drizzle-orm";

export interface SyncConfig {
  sistema: string;
  tipoDados: string;
  estabelecimentoId: number;
  querySql: string;
  frequencia: "tempo_real" | "1x_dia" | "1x_semana";
  conexaoConfig?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    tabelaDestinoBi?: string;
  };
}

export interface SyncResult {
  sucesso: boolean;
  sistema: string;
  tipoDados: string;
  totalRegistrosSincronizados: number;
  totalErros: number;
  mensagem: string;
  duracao: number; // em segundos
  timestamp: Date;
  erros?: string[];
}

/**
 * Data Sync Engine
 * Orquestra a sincronização de dados de múltiplos sistemas
 * Responsável por:
 * 1. Conectar aos sistemas externos
 * 2. Executar queries de extração
 * 3. Armazenar dados em staging
 * 4. Transformar e unificar dados
 * 5. Registrar logs de sincronização
 */
export class DataSyncEngine {
  private syncConfigs: Map<string, SyncConfig> = new Map();
  private isRunning: boolean = false;

  /**
   * Registra uma configuração de sincronização
   */
  registrarConfig(config: SyncConfig): void {
    const chave = `${config.sistema}_${config.tipoDados}_${config.estabelecimentoId}`;
    this.syncConfigs.set(chave, config);

    logger.info({
      message: "Configuração de sincronização registrada",
      sistema: config.sistema,
      tipoDados: config.tipoDados,
      estabelecimentoId: config.estabelecimentoId,
    });
  }

  /**
   * Sincroniza dados do WARLEINE
   */
  async sincronizarWarleine(config: SyncConfig): Promise<SyncResult> {
    const inicioSync = Date.now();

    try {
      logger.info({
        message: "Iniciando sincronização WARLEINE",
        tipoDados: config.tipoDados,
        estabelecimentoId: config.estabelecimentoId,
      });

      // Cria connector
      const connector = new WarleineConnector({
        host: config.conexaoConfig?.host || process.env.WARLEINE_DB_HOST!,
        port: config.conexaoConfig?.port || parseInt(process.env.WARLEINE_DB_PORT!),
        database: config.conexaoConfig?.database || process.env.WARLEINE_DB_NAME!,
        user: config.conexaoConfig?.user || process.env.WARLEINE_DB_USER!,
        password: config.conexaoConfig?.password || process.env.WARLEINE_DB_PASSWORD!,
      });

      // Conecta
      const conectado = await connector.conectar();
      if (!conectado) {
        throw new Error("Falha ao conectar ao banco WARLEINE");
      }

      // Extrai dados
      let registrosBrutos: any[] = [];
      const db = await getDb();
      if (!db) {
        throw new Error("Falha ao conectar ao banco de dados local para staging");
      }

      // Descobrir o configId
      const configRow = await db.select({ id: queryConfiguracoes.id }).from(queryConfiguracoes).where(
        eq(queryConfiguracoes.estabelecimentoId, config.estabelecimentoId)
      ).limit(1);
      
      // O engine real usaria o configId armazenado. 
      // Como a chave pode não mapear um ID único limpo, buscamos o primeiro ou assumimos 0.
      const configId = configRow.length > 0 ? configRow[0].id : 0;

      if (config.tipoDados === "atendimentos") {
        registrosBrutos = await connector.extrairAtendimentos(config.querySql);
        
        // Janela Fixa: Limpa staging antigo antes de inserir os novos (Incremental)
        if (configId > 0) {
          await db.delete(warleineAtendimentosStaging).where(eq(warleineAtendimentosStaging.configId, configId));
          
          if (registrosBrutos.length > 0) {
            // Insere em lotes
            const BATCH_SIZE = 500;
            for (let i = 0; i < registrosBrutos.length; i += BATCH_SIZE) {
               const batch = registrosBrutos.slice(i, i + BATCH_SIZE).map(d => ({
                 estabelecimentoId: config.estabelecimentoId,
                 configId: configId,
                 dadosBrutos: d
               }));
               await db.insert(warleineAtendimentosStaging).values(batch);
            }
          }
        }
      } else if (config.tipoDados === "faturamento") {
        registrosBrutos = await connector.executarQuery(config.querySql);
        
        if (configId > 0) {
          await db.delete(warleineFaturamentoStaging).where(eq(warleineFaturamentoStaging.configId, configId));
          
          if (registrosBrutos.length > 0) {
            const BATCH_SIZE = 500;
            for (let i = 0; i < registrosBrutos.length; i += BATCH_SIZE) {
               const batch = registrosBrutos.slice(i, i + BATCH_SIZE).map(d => ({
                 estabelecimentoId: config.estabelecimentoId,
                 configId: configId,
                 dadosBrutos: d
               }));
               await db.insert(warleineFaturamentoStaging).values(batch);
            }
          }
        }
      } else if (config.tipoDados === "bi_relatorio") {
        registrosBrutos = await connector.executarQuery(config.querySql);
        const tabelaDestino = config.conexaoConfig?.tabelaDestinoBi;
        if (tabelaDestino && registrosBrutos.length > 0) {
          // Identificar as colunas dinamicamente baseado na primeira linha (JSON Keys)
          const firstRow = registrosBrutos[0];
          const colunas = Object.keys(firstRow).filter(k => k !== 'id');
          const definicaoColunas = colunas.map(c => `\`${c}\` TEXT`).join(', ');

          // Cria a tabela caso não exista (id AUTO_INCREMENT é padrão)
          const createTableSql = `CREATE TABLE IF NOT EXISTS \`${tabelaDestino}\` (id INT AUTO_INCREMENT PRIMARY KEY, \`configId\` INT NOT NULL, ${definicaoColunas}, criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
          await db.execute(sql.raw(createTableSql));

          // Limpa a tabela para o config atual (Janela Móvel)
          await db.execute(sql.raw(`DELETE FROM \`${tabelaDestino}\` WHERE \`configId\` = ${configId}`));

          // Insere os dados usando prepared statements para evitar SQL Injection nos valores
          const insertCols = ['`configId`', ...colunas.map(c => `\`${c}\``)].join(', ');

          try {
            for (const row of registrosBrutos) {
              const values = [configId, ...colunas.map(c => row[c] !== undefined && row[c] !== null ? String(row[c]) : null)];
              const sqlValues = values.map(v => sql`${v}`);
              const exeSql = sql`INSERT INTO ${sql.raw('\`' + tabelaDestino + '\`')} (${sql.raw(insertCols)}) VALUES (${sql.join(sqlValues, sql`, `)})`;
              await db.execute(exeSql);
            }
          } catch(insertErr: any) {
             console.error("MYSQL INSERT EXCEPTION: ", insertErr.sqlMessage || insertErr.message || insertErr);
          }
        }
      }

      // Desconecta
      await connector.desconectar();

      // Calcula duração
      const duracao = Math.round((Date.now() - inicioSync) / 1000);

      logger.info({
        message: "Sincronização WARLEINE concluída com sucesso",
        tipoDados: config.tipoDados,
        totalRegistros: registrosBrutos.length,
        duracao,
      });

      return {
        sucesso: true,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        totalRegistrosSincronizados: registrosBrutos.length,
        totalErros: 0,
        mensagem: `${registrosBrutos.length} registros sincronizados e armazenados no Staging`,
        duracao,
        timestamp: new Date(),
      };
    } catch (error) {
      const duracao = Math.round((Date.now() - inicioSync) / 1000);

      logger.error({
        message: "Erro na sincronização WARLEINE",
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        error: error instanceof Error ? error.message : String(error),
        duracao,
      });

      return {
        sucesso: false,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        totalRegistrosSincronizados: 0,
        totalErros: 1,
        mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        duracao,
        timestamp: new Date(),
        erros: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Sincroniza dados do TASY (Oracle)
   */
  async sincronizarTasy(config: SyncConfig): Promise<SyncResult> {
    const inicioSync = Date.now();

    try {
      logger.info({
        message: "Iniciando sincronização TASY",
        tipoDados: config.tipoDados,
        estabelecimentoId: config.estabelecimentoId,
      });

      const connector = new OracleConnector({
        host: config.conexaoConfig?.host || "localhost",
        port: config.conexaoConfig?.port || 1521,
        database: config.conexaoConfig?.database || "XE",
        user: config.conexaoConfig?.user || "system",
        password: config.conexaoConfig?.password || "",
      });

      const conectado = await connector.conectar();
      if (!conectado) {
        throw new Error("Falha ao conectar ao banco TASY (Oracle)");
      }

      let registrosBrutos: any[] = [];
      const db = await getDb();
      if (!db) throw new Error("Falha ao conectar ao banco local");

      const configRow = await db.select({ id: queryConfiguracoes.id }).from(queryConfiguracoes).where(
        eq(queryConfiguracoes.estabelecimentoId, config.estabelecimentoId)
      ).limit(1);
      const configId = configRow.length > 0 ? configRow[0].id : 0;

      // Executa a Query configurada no Oracle
      registrosBrutos = await connector.executarQuery(config.querySql);

      if (config.tipoDados === "atendimentos") {
        if (configId > 0) {
          // Limpa staging antigo
          await db.delete(tasyMaternidadeElaAtendimentosStaging).where(eq(tasyMaternidadeElaAtendimentosStaging.configId, configId));
          
          if (registrosBrutos.length > 0) {
            const BATCH_SIZE = 500;
            for (let i = 0; i < registrosBrutos.length; i += BATCH_SIZE) {
               const batch = registrosBrutos.slice(i, i + BATCH_SIZE).map(d => ({
                 estabelecimentoId: config.estabelecimentoId,
                 configId: configId,
                 dadosBrutos: d
               }));
               // A tabela MaternidadeEla foi usada como alias padrão para atendimentos no TASY em schema-integracao
               await db.insert(tasyMaternidadeElaAtendimentosStaging).values(batch);
            }
          }
        }
      } else if (config.tipoDados === "bi_relatorio") {
        const tabelaDestino = config.conexaoConfig?.tabelaDestinoBi;
        if (tabelaDestino && registrosBrutos.length > 0) {
          const firstRow = registrosBrutos[0];
          const colunas = Object.keys(firstRow).filter(k => k !== 'id');
          const definicaoColunas = colunas.map(c => `\`${c}\` TEXT`).join(', ');

          const createTableSql = `CREATE TABLE IF NOT EXISTS \`${tabelaDestino}\` (id INT AUTO_INCREMENT PRIMARY KEY, \`configId\` INT NOT NULL, ${definicaoColunas}, criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
          await db.execute(sql.raw(createTableSql));

          await db.execute(sql.raw(`DELETE FROM \`${tabelaDestino}\` WHERE \`configId\` = ${configId}`));

          const insertCols = ['`configId`', ...colunas.map(c => `\`${c}\``)].join(', ');

          try {
            for (const row of registrosBrutos) {
              const values = [configId, ...colunas.map(c => row[c] !== undefined && row[c] !== null ? String(row[c]) : null)];
              const sqlValues = values.map(v => sql`${v}`);
              const exeSql = sql`INSERT INTO ${sql.raw('\`' + tabelaDestino + '\`')} (${sql.raw(insertCols)}) VALUES (${sql.join(sqlValues, sql`, `)})`;
              await db.execute(exeSql);
            }
          } catch(insertErr: any) {
             console.error("MYSQL INSERT EXCEPTION: ", insertErr.sqlMessage || insertErr.message || insertErr);
             throw new Error(`Erro ao inserir lote no MySQL: ${insertErr.sqlMessage || insertErr.message}`);
          }
        }
      }

      await connector.desconectar();
      const duracao = Math.round((Date.now() - inicioSync) / 1000);

      logger.info({
        message: "Sincronização TASY concluída com sucesso",
        totalRegistros: registrosBrutos.length,
        duracao,
      });

      return {
        sucesso: true,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        totalRegistrosSincronizados: registrosBrutos.length,
        totalErros: 0,
        mensagem: `${registrosBrutos.length} registros sincronizados (TASY)`,
        duracao,
        timestamp: new Date(),
      };
    } catch (error) {
      const duracao = Math.round((Date.now() - inicioSync) / 1000);
      logger.error({ message: "Erro na sincronização TASY", error: String(error) });

      return {
        sucesso: false,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        totalRegistrosSincronizados: 0,
        totalErros: 1,
        mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        duracao,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Sincroniza dados de um sistema específico
   */
  async sincronizar(config: SyncConfig): Promise<SyncResult> {
    if (this.isRunning) {
      logger.warn({
        message: "Sincronização já em andamento",
        sistema: config.sistema,
      });

      return {
        sucesso: false,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        totalRegistrosSincronizados: 0,
        totalErros: 1,
        mensagem: "Sincronização já em andamento",
        duracao: 0,
        timestamp: new Date(),
      };
    }

    this.isRunning = true;

    try {
      switch (config.sistema) {
        case "warleine":
          return await this.sincronizarWarleine(config);

        case "tasy":
          return await this.sincronizarTasy(config);

        case "omni":
          // TODO: Implementar sincronização OMNI (Firebird + OpenVPN)
          return {
            sucesso: false,
            sistema: config.sistema,
            tipoDados: config.tipoDados,
            totalRegistrosSincronizados: 0,
            totalErros: 1,
            mensagem: "Sincronização OMNI não implementada ainda",
            duracao: 0,
            timestamp: new Date(),
          };

        case "gesthor":
          // TODO: Implementar sincronização GESTHOR (Firebird + OpenVPN)
          return {
            sucesso: false,
            sistema: config.sistema,
            tipoDados: config.tipoDados,
            totalRegistrosSincronizados: 0,
            totalErros: 1,
            mensagem: "Sincronização GESTHOR não implementada ainda",
            duracao: 0,
            timestamp: new Date(),
          };

        default:
          return {
            sucesso: false,
            sistema: config.sistema,
            tipoDados: config.tipoDados,
            totalRegistrosSincronizados: 0,
            totalErros: 1,
            mensagem: `Sistema desconhecido: ${config.sistema}`,
            duracao: 0,
            timestamp: new Date(),
          };
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sincroniza todos os sistemas registrados
   */
  async sincronizarTodos(): Promise<SyncResult[]> {
    const resultados: SyncResult[] = [];

    for (const [, config] of this.syncConfigs) {
      const resultado = await this.sincronizar(config);
      resultados.push(resultado);
    }

    return resultados;
  }

  /**
   * Obtém status da sincronização
   */
  getStatus(): {
    isRunning: boolean;
    totalConfigs: number;
    configs: Array<{
      chave: string;
      sistema: string;
      tipoDados: string;
      estabelecimentoId: number;
    }>;
  } {
    return {
      isRunning: this.isRunning,
      totalConfigs: this.syncConfigs.size,
      configs: Array.from(this.syncConfigs.entries()).map(([chave, config]) => ({
        chave,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        estabelecimentoId: config.estabelecimentoId,
      })),
    };
  }
}

// Instância global do Data Sync Engine
export const dataSyncEngine = new DataSyncEngine();
