import { Pool } from "pg";
import QueryStream from "pg-query-stream";
import { logger } from "../_core/logger";

export interface WarleineAtendimento {
  numatend: string;
  codtipsai?: string;
  nomeplaco?: string;
  nomepac?: string;
  carater?: string;
  datatend?: Date;
  datasai?: Date;
  tipoatend?: string;
  tipoatendimentodescricao?: string;
  codserv?: string;
  procprin?: string;
  codccDestino?: string;
}

export interface WarleineConnectorConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

/**
 * Connector para sincronizar dados do WARLEINE (PostgreSQL)
 * Responsável por conectar ao banco e executar queries de extração
 */
export class WarleineConnector {
  private pool: Pool | null = null;
  private config: WarleineConnectorConfig;

  constructor(config: WarleineConnectorConfig) {
    this.config = config;
  }

  /**
   * Inicializa a conexão com o banco WARLEINE
   * Tenta conectar SEM SSL primeiro, depois COM SSL se falhar
   */
  async conectar(): Promise<boolean> {
    // Tentar conectar SEM SSL primeiro (mais comum em ambientes internos)
    const sslOptions: any[] = [false, { rejectUnauthorized: false }];
    
    for (const sslOption of sslOptions) {
      try {
        this.pool = new Pool({
          host: this.config.host,
          port: this.config.port,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          ssl: sslOption,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });

        // Testa a conexão
        const client = await this.pool.connect();
        await client.query("SELECT 1");
        client.release();

        const sslMsg = sslOption === false ? "sem SSL" : "com SSL";
        logger.info({
          message: `Conexão WARLEINE estabelecida com sucesso (${sslMsg})`,
          host: this.config.host,
          database: this.config.database,
        });

        return true;
      } catch (error) {
        const sslMsg = sslOption === false ? "sem SSL" : "com SSL";
        const msg = error instanceof Error ? error.message : String(error);
        
        // Se for erro de SSL, tentar próxima opção
        if (msg.includes("SSL") || msg.includes("ssl")) {
          logger.warn({
            message: `Falha ao conectar ${sslMsg}, tentando próxima opção...`,
            error: msg.substring(0, 150),
          });
          continue;
        }
        
        // Se não for erro de SSL, parar aqui
        logger.error({
          message: `Erro ao conectar ao WARLEINE (${sslMsg})`,
          error: msg.substring(0, 150),
          host: this.config.host,
        });
        break;
      }
    }
    
    return false;
  }

  /**
   * Desconecta do banco WARLEINE
   */
  async desconectar(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Executa uma query no banco WARLEINE
   */
  async executarQuery(query: string): Promise<any[]> {
    if (!this.pool) {
      throw new Error("Conexão não estabelecida");
    }

    try {
      const result = await this.pool.query(query);
      return result.rows || [];
    } catch (error) {
      logger.error({
        message: "Erro ao executar query no WARLEINE",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Executa uma query no WARLEINE usando Streaming (pg-query-stream)
   * Útil para grandes volumes de dados (100k+ registros)
   */
  async executarQueryStream(query: string, callback: (row: any) => Promise<void>): Promise<number> {
    if (!this.pool) {
      throw new Error("Conexão não estabelecida");
    }

    const client = await this.pool.connect();
    try {
      const queryStream = new QueryStream(query);
      const stream = client.query(queryStream);

      let count = 0;
      for await (const row of stream) {
        await callback(row);
        count++;
        if (count % 1000 === 0) {
          logger.info({ message: "Warleine Stream Progress", count });
        }
      }
      return count;
    } catch (error) {
      logger.error({
        message: "Erro ao executar query stream no WARLEINE",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Extrai atendimentos do banco WARLEINE
   */
  async extrairAtendimentos(query: string): Promise<WarleineAtendimento[]> {
    if (!this.pool) {
      throw new Error("Conexão não estabelecida");
    }
    try {
      const result = await this.pool.query(query);
      return (result.rows || []) as WarleineAtendimento[];
    } catch (error) {
      logger.error({
        message: "Erro ao extrair atendimentos do WARLEINE",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Testa conexão e executa uma query de teste
   */
  async testarConexaoEQuery(query: string): Promise<{
    sucesso: boolean;
    mensagem: string;
    totalRegistros: number;
    primeiroRegistro: any | null;
  }> {
    try {
      const ok = await this.conectar();
      if (!ok) {
        return {
          sucesso: false,
          mensagem: "Falha ao conectar ao banco",
          totalRegistros: 0,
          primeiroRegistro: null,
        };
      }

      const dados = await this.executarQuery(query);
      await this.desconectar();

      return {
        sucesso: true,
        mensagem: `Conexão OK. Query retornou ${dados.length} registros`,
        totalRegistros: dados.length,
        primeiroRegistro: dados[0] || null,
      };
    } catch (error) {
      return {
        sucesso: false,
        mensagem: error instanceof Error ? error.message : "Erro desconhecido",
        totalRegistros: 0,
        primeiroRegistro: null,
      };
    }
  }
}
