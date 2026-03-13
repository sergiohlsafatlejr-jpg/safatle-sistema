import pg from "pg";
import { logger } from "../_core/logger";

const { Pool } = pg;

export interface EasyVisionConnectorConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface EasyVisionAtendimentoSemConta {
  numatend: string;
  nomeplaco: string;
  nomepac: string;
  carater: string;
  datatend: string;
  datasai: string;
  tipoatend: string;
  tipoatendimentodescricao: string;
  codserv: string;
  procprin: string;
  codcc_destino: string;
  motivo: string | null;
}

export interface EasyVisionAtendimentoAFaturar {
  numatend: string;
  nomeplaco: string;
  nomepac: string;
  carater: string;
  datatend: string;
  datasai: string | null;
  tipoatend: string;
  tipoatendimentodescricao: string;
  codserv: string;
  procprin: string;
}

/**
 * Connector para sincronizar dados do EASYVISION (PostgreSQL)
 * Responsável por conectar ao banco de dados do sistema EasyVision
 * e extrair dados das views din_Atend_n_receb e din_Atend_receb_s_faturar
 * 
 * Usa as mesmas credenciais PG_ATENDIMENTOS (147.93.4.135:5432/coletor)
 */
export class EasyVisionConnector {
  private pool: pg.Pool | null = null;
  private config: EasyVisionConnectorConfig;

  constructor(config: EasyVisionConnectorConfig) {
    this.config = config;
  }

  /**
   * Inicializa a conexão com o banco EASYVISION
   */
  async conectar(): Promise<boolean> {
    try {
      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 300000, // 5 minutos de timeout para queries
        query_timeout: 300000, // 5 minutos de timeout para queries
      });

      // Testa a conexão
      const client = await this.pool.connect();
      await client.query("SELECT 1");
      client.release();

      logger.info({
        message: "Conexão EASYVISION estabelecida com sucesso",
        host: this.config.host,
        database: this.config.database,
      });

      return true;
    } catch (error) {
      logger.error({
        message: "Erro ao conectar ao EASYVISION",
        error: error instanceof Error ? error.message : String(error),
        host: this.config.host,
      });
      return false;
    }
  }

  /**
   * Desconecta do banco EASYVISION
   */
  async desconectar(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info({ message: "Conexão EASYVISION fechada" });
    }
  }

  /**
   * Executa uma query customizada no EASYVISION
   */
  async executarQuery<T = any>(query: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error("Conexão EASYVISION não estabelecida. Chame conectar() primeiro.");
    }

    try {
      // Definir statement_timeout na sessão antes de executar a query
      const client = await this.pool.connect();
      try {
        await client.query('SET statement_timeout = 300000'); // 5 minutos
        const resultado = await client.query(query, params);
        client.release();
        return resultado.rows as T[];
      } catch (error) {
        client.release(true); // release with destroy on error
        throw error;
      }
    } catch (error) {
      logger.error({
        message: "Erro ao executar query no EASYVISION",
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 100),
      });
      throw error;
    }
  }

  /**
   * Extrai atendimentos sem conta da view din_Atend_n_receb
   * Esses são atendimentos parados que não tiveram conta aberta no sistema
   */
  async extrairAtendimentosSemConta(): Promise<EasyVisionAtendimentoSemConta[]> {
    try {
      logger.info({ message: "EASYVISION: Iniciando extração de atendimentos sem conta (din_Atend_n_receb)" });

      const resultado = await this.executarQuery<EasyVisionAtendimentoSemConta>(`
        SELECT a.numatend::text,
               a.nomeplaco,
               a.nomepac,
               a.carater,
               a.datatend::text,
               COALESCE(a.datasai, a.datatend)::text AS datasai,
               a.tipoatend,
               a.tipoatendimentodescricao,
               a.codserv,
               a.procprin,
               a.codcc_destino,
               rni.motivo
        FROM c33581562000206.din_Atend_n_receb a
        LEFT JOIN (
          SELECT rn.numatend, MAX(rn.id) AS max_rn_id
          FROM c33581562000206.registro_notificacao rn
          GROUP BY rn.numatend
        ) rn_max ON rn_max.numatend::text = a.numatend
        LEFT JOIN c33581562000206.registro_notificacao_item rni
          ON rni.notificacao_id = rn_max.max_rn_id
      `);

      logger.info({
        message: "EASYVISION: Extração de atendimentos sem conta concluída",
        totalRegistros: resultado.length,
      });

      return resultado;
    } catch (error) {
      logger.error({
        message: "EASYVISION: Erro ao extrair atendimentos sem conta",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Extrai atendimentos a faturar da view din_Atend_receb_s_faturar
   * Esses são atendimentos recebidos mas que ainda não foram faturados
   */
  async extrairAtendimentosAFaturar(): Promise<EasyVisionAtendimentoAFaturar[]> {
    try {
      logger.info({ message: "EASYVISION: Iniciando extração de atendimentos a faturar (din_Atend_receb_s_faturar)" });

      const resultado = await this.executarQuery<EasyVisionAtendimentoAFaturar>(`
        SELECT 
          a.numatend::text,
          a.nomeplaco,
          a.nomepac,
          a.carater,
          a.datatend::text,
          a.datasai::text,
          a.tipoatend,
          a.tipoatendimentodescricao,
          a.codserv,
          a.procprin
        FROM c33581562000206.din_Atend_receb_s_faturar a
      `);

      logger.info({
        message: "EASYVISION: Extração de atendimentos a faturar concluída",
        totalRegistros: resultado.length,
      });

      return resultado;
    } catch (error) {
      logger.error({
        message: "EASYVISION: Erro ao extrair atendimentos a faturar",
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Testa a conexão e a query
   */
  async testarConexaoEQuery(querySql: string): Promise<{
    sucesso: boolean;
    mensagem: string;
    totalRegistros?: number;
    primeiroRegistro?: any;
  }> {
    try {
      const conectado = await this.conectar();
      if (!conectado) {
        return {
          sucesso: false,
          mensagem: "Falha ao conectar ao banco EASYVISION",
        };
      }

      const queryLimpa = querySql.trim().replace(/\s+/g, ' ');
      const queryComLimit = queryLimpa.toUpperCase().includes("LIMIT")
        ? queryLimpa
        : `${queryLimpa} LIMIT 1`;

      const resultado = await this.executarQuery(queryComLimit);

      await this.desconectar();

      return {
        sucesso: true,
        mensagem: `Conexão e query validadas com sucesso. ${resultado.length} registro(s) encontrado(s).`,
        totalRegistros: resultado.length,
        primeiroRegistro: resultado[0],
      };
    } catch (error) {
      return {
        sucesso: false,
        mensagem: `Erro: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
