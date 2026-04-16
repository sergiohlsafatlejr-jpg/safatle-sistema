import { logger } from "./_core/logger";
import mysql from "mysql2";
import { WarleineConnector, WarleineAtendimento } from "./connectors/WarleineConnector";
import { OracleConnector } from "./connectors/OracleConnector";
import { getDb } from "./db";
import { 
  warleineFaturamentoStaging, 
  tasyMaternidadeElaAtendimentosStaging, 
  queryConfiguracoes,
  staging_atendimento_warleine 
} from "../drizzle/schema-integracao";
// Para pegar o ID da config:
import { eq, sql } from "drizzle-orm";

export interface SyncConfig {
  configId?: number;
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

  private async prepararQueryDelta(configId: number, querySql: string, sistema?: string): Promise<{ query: string, lastSyncDate: Date | null }> {
    const db = await getDb();
    if (!db) return { query: querySql, lastSyncDate: null };

    const config = await db.select({
      ultimaSincronizacao: queryConfiguracoes.ultimaSincronizacao,
      totalRegistros: queryConfiguracoes.totalRegistrosSincronizados
    })
    .from(queryConfiguracoes)
    .where(eq(queryConfiguracoes.id, configId))
    .limit(1);

    // Valor padrão caso nunca tenha sincronizado
    let dateStr = "1900-01-01 00:00:00";
    let lastSyncDate: Date | null = null;

    if (config.length > 0 && config[0].ultimaSincronizacao) {
      lastSyncDate = config[0].ultimaSincronizacao;
      dateStr = lastSyncDate.toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS
    }

    // Para Oracle, o ideal é usar Bind Variables (tratado no OracleConnector)
    // Para MySQL/Postgres, o literal TIMESTAMP funciona muito bem.
    const isOracle = sistema?.toLowerCase() === "tasy" || sistema?.toLowerCase() === "oracle";
    const replacement = `TIMESTAMP '${dateStr}'`;
    
    // Se for Oracle, NÃO forçamos a substituição por string aqui se o placeholder for usado para Bind
    // mas por compatibilidade, vamos deixar o replace (o OracleConnector dará preferência ao Bind se encontrar o nome)
    let preparedQuery = querySql.replace(/:last_sync_date/gi, replacement);
    
    logger.info({ message: "Delta Sync Query Preparada", configId, sistema, lastSync: dateStr });
    return { query: preparedQuery, lastSyncDate };
  }

  /**
   * Sincroniza dados do WARLEINE usando Streaming
   */
  async sincronizarWarleine(config: SyncConfig): Promise<SyncResult> {
    const inicioSync = Date.now();
    let totalSincronizados = 0;

    try {
      logger.info({
        message: "Iniciando sincronização WARLEINE (Stream)",
        tipoDados: config.tipoDados,
        estabelecimentoId: config.estabelecimentoId,
      });

      const connector = new WarleineConnector({
        host: config.conexaoConfig?.host || process.env.WARLEINE_DB_HOST!,
        port: config.conexaoConfig?.port || parseInt(process.env.WARLEINE_DB_PORT!),
        database: config.conexaoConfig?.database || process.env.WARLEINE_DB_NAME!,
        user: config.conexaoConfig?.user || process.env.WARLEINE_DB_USER!,
        password: config.conexaoConfig?.password || process.env.WARLEINE_DB_PASSWORD!,
      });

      const conectado = await connector.conectar();
      if (!conectado) throw new Error("Falha ao conectar ao banco WARLEINE");

      const db = await getDb();
      if (!db) throw new Error("Falha ao conectar ao banco local");

      const configRow = await db.select({ id: queryConfiguracoes.id }).from(queryConfiguracoes).where(
        eq(queryConfiguracoes.estabelecimentoId, config.estabelecimentoId)
      ).limit(1);
      const configId = config.configId || (configRow.length > 0 ? configRow[0].id : 0);

      const isFaturamento = config.tipoDados?.toLowerCase().includes('faturamento');
      const stagingTable = isFaturamento ? warleineFaturamentoStaging : staging_atendimento_warleine;
      
      // Delta Sync detection: Se a query usa :last_sync_date, não deletamos tudo da staging
      const isDelta = /:last_sync_date/i.test(config.querySql);
      const prep = isDelta ? await this.prepararQueryDelta(configId, config.querySql, "warleine") : { query: config.querySql, lastSyncDate: null };
      const queryPronta = prep.query;
      const syncParams = { last_sync_date: prep.lastSyncDate };

      if (configId > 0 && !isDelta) {
        await db.delete(stagingTable).where(
          isFaturamento ? eq(warleineFaturamentoStaging.configId, configId) : eq(staging_atendimento_warleine.estabelecimentoId, config.estabelecimentoId)
        );
      }

      const BATCH_SIZE = 2000;
      let buffer: any[] = [];

      const flushBuffer = async () => {
        if (buffer.length === 0) return;
        const batch = buffer.map(d => {
          if (isFaturamento) {
            return { estabelecimentoId: config.estabelecimentoId, configId, dadosBrutos: d };
          } else {
            return {
              estabelecimentoId: config.estabelecimentoId,
              importacaoId: configId,
              rawData: d,
              numeroAtendimento: d.numatend || d.numconta ? String(d.numatend || d.numconta) : null,
              pacienteNome: d.nomepac ? String(d.nomepac).substring(0, 255) : null,
              convenioNome: (d.nomeplaco || d.nomeconv) ? String(d.nomeplaco || d.nomeconv).substring(0, 255) : null,
              tipoAtendimento: d.tipoatend ? String(d.tipoatend).substring(0, 50) : null,
              processado: false
            };
          }
        });
        await db.insert(stagingTable).values(batch as any);
        totalSincronizados += buffer.length;
        buffer = [];
      };

      await connector.executarQueryStream(queryPronta, async (row) => {
        buffer.push(row);
        if (buffer.length >= BATCH_SIZE) {
          await flushBuffer();
        }
      }, syncParams);

      await flushBuffer();
      await connector.desconectar();

      const duracao = Math.round((Date.now() - inicioSync) / 1000);
      return {
        sucesso: true,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        totalRegistrosSincronizados: totalSincronizados,
        totalErros: 0,
        mensagem: `${totalSincronizados} registros sincronizados via Stream`,
        duracao,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({ message: "ERRO FATAL sincronizarTasy", error: String(error) });
      const duracao = Math.round((Date.now() - inicioSync) / 1000);
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
      const configId = config.configId || (configRow.length > 0 ? configRow[0].id : 0);

      // Extração via Stream para economia de memória
      const BATCH_SIZE = config.tipoDados === "bi_relatorio" ? 250 : 2000;
      let buffer: any[] = [];
      let totalSincronizados = 0;

      const flushBuffer = async () => {
        if (buffer.length === 0) return;
        
        if (config.tipoDados === "atendimentos") {
          const batch = buffer.map(d => ({
            estabelecimentoId: config.estabelecimentoId,
            configId: configId,
            dadosBrutos: d
          }));
          await db.insert(tasyMaternidadeElaAtendimentosStaging).values(batch);
        } else if (config.tipoDados === "bi_relatorio") {
          const tabelaDestino = config.conexaoConfig?.tabelaDestinoBi;
          if (tabelaDestino) {
            const colunas = Object.keys(buffer[0]);
            const insertCols = ['`configId`', '`estabelecimentoId`', ...colunas.map(c => `\`${c}\``)].join(', ');
            
            const valoresLote = buffer.map(row => {
              const vals = [configId, config.estabelecimentoId, ...colunas.map(c => {
                const v = row[c];
                if (v === null || v === undefined) return "NULL";
                return mysql.escape(String(v));
              })];
              return `(${vals.join(", ")})`;
            }).join(",\n");

            const sqlInsert = `REPLACE INTO \`${tabelaDestino}\` (${insertCols}) VALUES ${valoresLote}`;
            await db.execute(sql.raw(sqlInsert));
          }
        }
        
        totalSincronizados += buffer.length;
        buffer = [];
      };

      // Delta Sync detection for Tasy
      const isDelta = /:last_sync_date/i.test(config.querySql);
      const prep = isDelta ? await this.prepararQueryDelta(configId, config.querySql, "tasy") : { query: config.querySql, lastSyncDate: null };
      const queryPronta = prep.query;
      const syncParams = { last_sync_date: prep.lastSyncDate };

      if (config.tipoDados === "atendimentos") {
        if (configId > 0 && !isDelta) {
          await db.delete(tasyMaternidadeElaAtendimentosStaging).where(eq(tasyMaternidadeElaAtendimentosStaging.configId, configId));
        }
      } else if (config.tipoDados === "bi_relatorio") {
        const tabelaDestino = config.conexaoConfig?.tabelaDestinoBi;
        if (tabelaDestino) {
           // Pré-criação da tabela (apenas na primeira linha)
           let tabelaCriada = false;
           
           await connector.executarQueryStream(queryPronta, async (row) => {
             if (!tabelaCriada) {
                const colunas = Object.keys(row);
                const definicaoColunas = colunas.map(c => `\`${c}\` TEXT`).join(', ');
                const createTableSql = `CREATE TABLE IF NOT EXISTS \`${tabelaDestino}\` (id INT AUTO_INCREMENT PRIMARY KEY, \`configId\` INT NOT NULL, ${definicaoColunas}, criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
                await db.execute(sql.raw(createTableSql));
                
                if (!isDelta) {
                  await db.execute(sql.raw(`DELETE FROM \`${tabelaDestino}\` WHERE \`configId\` = ${configId}`));
                }
                tabelaCriada = true;
             }
             
             buffer.push(row);
             totalSincronizados++;
             if (buffer.length >= BATCH_SIZE) {
               try {
                 await flushBuffer();
                 logger.info({ message: "Flush sucess do lote bi_relatorio!" });
               } catch(e) {
                 logger.error({ message: "Erro no flushBuffer do lote", error: String(e) });
                 throw e;
               }
             }
           });
           try {
             await flushBuffer();
           } catch(e) {
             logger.error({ message: "Erro no flushBuffer final", error: String(e) });
             throw e;
           }
        }
      }

      if (config.tipoDados === "atendimentos") {
        await connector.executarQueryStream(queryPronta, async (row) => {
          buffer.push(row);
          if (buffer.length >= BATCH_SIZE) {
            await flushBuffer();
          }
        }, syncParams);
        await flushBuffer();
      }

      await connector.desconectar();
      const duracao = Math.round((Date.now() - inicioSync) / 1000);

      logger.info({
        message: "Sincronização TASY concluída",
        totalRegistros: totalSincronizados,
        duracao,
      });

      return {
        sucesso: true,
        sistema: config.sistema,
        tipoDados: config.tipoDados,
        totalRegistrosSincronizados: totalSincronizados,
        totalErros: 0,
        mensagem: `${totalSincronizados} registros sincronizados via Stream (TASY)`,
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
