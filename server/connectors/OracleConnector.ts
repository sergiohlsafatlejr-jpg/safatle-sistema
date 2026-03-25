import oracledb from "oracledb";
import { logger } from "../_core/logger";

export interface OracleConnectorConfig {
  host: string;
  port: number;
  database: string; // Used as Service Name or SID
  user: string;
  password?: string;
}

export class OracleConnector {
  private connection: oracledb.Connection | null = null;
  private config: OracleConnectorConfig;

  constructor(config: OracleConnectorConfig) {
    this.config = config;
    // Opcional: configurar o oracledb para retornar resultados como objetos em vez de arrays puros
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  }

  async conectar(): Promise<boolean> {
    try {
      // Formato Easy Connect: host:port/service_name
      const connectString = `${this.config.host}:${this.config.port}/${this.config.database}`;
      
      this.connection = await oracledb.getConnection({
        user: this.config.user,
        password: this.config.password,
        connectString,
      });

      logger.info({
        message: `Conexão Oracle estabelecida com sucesso`,
        connectString,
      });

      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error({
        message: `Erro ao conectar ao Oracle`,
        error: msg,
        host: this.config.host,
      });
      return false;
    }
  }

  async desconectar(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (e) {
        logger.warn("Erro ao fechar conexão Oracle: " + String(e));
      }
      this.connection = null;
    }
  }

  async executarQuery(query: string): Promise<any[]> {
    if (!this.connection) {
      throw new Error("Conexão não estabelecida");
    }

    try {
      const result = await this.connection.execute(query);
      return (result.rows as any[]) || [];
    } catch (error) {
      logger.error({
        message: "Erro ao executar query no Oracle",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
