import pg from "pg";
import { ENV } from "./_core/env";

const { Pool } = pg;

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: ENV.pgAtendimentosHost,
      port: parseInt(ENV.pgAtendimentosPort, 10),
      database: ENV.pgAtendimentosDatabase,
      user: ENV.pgAtendimentosUser,
      password: ENV.pgAtendimentosPassword,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: false,
    });
  }
  return pool;
}

export interface AtendimentoRow {
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

export async function getAtendimentosParados(): Promise<AtendimentoRow[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<AtendimentoRow>(`
      SELECT a.numatend,
             a.nomeplaco,
             a.nomepac,
             a.carater,
             a.datatend,
             COALESCE(a.datasai, a.datatend) AS datasai,
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
    return result.rows;
  } finally {
    client.release();
  }
}

export async function salvarNotificacao(
  numatend: string,
  observacao: string,
  notificacoes: Array<{ motivo: string; setor: string; medico: string }>
): Promise<number> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const insertResult = await client.query<{ id: number }>(
      `INSERT INTO c33581562000206.registro_notificacao (numatend, observacao)
       VALUES ($1, $2) RETURNING id`,
      [numatend, observacao]
    );

    const notificacaoId = insertResult.rows[0].id;

    for (const item of notificacoes) {
      await client.query(
        `INSERT INTO c33581562000206.registro_notificacao_item
           (notificacao_id, motivo, setor, medico)
         VALUES ($1, $2, $3, $4)`,
        [notificacaoId, item.motivo, item.setor, item.medico]
      );
    }

    await client.query("COMMIT");
    return notificacaoId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function salvarNotificacaoEmLote(
  atendimentos: Array<{ numatend: string; nomepac: string }>,
  observacao: string,
  notificacoes: Array<{ motivo: string; setor: string; medico: string }>
): Promise<number[]> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const ids: number[] = [];

    for (const atend of atendimentos) {
      const insertResult = await client.query<{ id: number }>(
        `INSERT INTO c33581562000206.registro_notificacao (numatend, observacao)
         VALUES ($1, $2) RETURNING id`,
        [atend.numatend, observacao]
      );
      const notificacaoId = insertResult.rows[0].id;
      ids.push(notificacaoId);

      for (const item of notificacoes) {
        await client.query(
          `INSERT INTO c33581562000206.registro_notificacao_item
             (notificacao_id, motivo, setor, medico)
           VALUES ($1, $2, $3, $4)`,
          [notificacaoId, item.motivo, item.setor, item.medico]
        );
      }
    }

    await client.query("COMMIT");
    return ids;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface AtendimentoFaturarRow {
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

export async function getAtendimentosAFaturar(): Promise<AtendimentoFaturarRow[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query<AtendimentoFaturarRow>(`
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
    return result.rows;
  } finally {
    client.release();
  }
}

// ===== HISTÓRICO DE NOTIFICAÇÕES EM LOTE =====

export interface HistoricoNotificacaoRow {
  id: number;
  data_geracao: string;
  qtd_atendimentos: number;
  observacao: string;
  usuario: string;
  atendimentos_json: string;
  notificacoes_json: string;
}

export async function criarTabelaHistoricoNotificacao(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS c33581562000206.historico_notificacao_lote (
        id SERIAL PRIMARY KEY,
        data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        qtd_atendimentos INTEGER NOT NULL,
        observacao TEXT NOT NULL DEFAULT '',
        usuario TEXT NOT NULL DEFAULT '',
        atendimentos_json JSONB NOT NULL DEFAULT '[]',
        notificacoes_json JSONB NOT NULL DEFAULT '[]'
      )
    `);
  } finally {
    client.release();
  }
}

export async function salvarHistoricoNotificacao(
  qtdAtendimentos: number,
  observacao: string,
  usuario: string,
  atendimentos: Array<{ numatend: string; nomepac: string; nomeplaco: string; datatend: string; datasai: string | null; diasParado: number; tipoatendimentodescricao: string; codserv: string }>,
  notificacoes: Array<{ motivo: string; setor: string; medico: string }>
): Promise<number> {
  const client = await getPool().connect();
  try {
    // Garantir que a tabela existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS c33581562000206.historico_notificacao_lote (
        id SERIAL PRIMARY KEY,
        data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        qtd_atendimentos INTEGER NOT NULL,
        observacao TEXT NOT NULL DEFAULT '',
        usuario TEXT NOT NULL DEFAULT '',
        atendimentos_json JSONB NOT NULL DEFAULT '[]',
        notificacoes_json JSONB NOT NULL DEFAULT '[]'
      )
    `);

    const result = await client.query<{ id: number }>(
      `INSERT INTO c33581562000206.historico_notificacao_lote
         (qtd_atendimentos, observacao, usuario, atendimentos_json, notificacoes_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        qtdAtendimentos,
        observacao,
        usuario,
        JSON.stringify(atendimentos),
        JSON.stringify(notificacoes),
      ]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

export async function listarHistoricoNotificacoes(): Promise<HistoricoNotificacaoRow[]> {
  const client = await getPool().connect();
  try {
    // Garantir que a tabela existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS c33581562000206.historico_notificacao_lote (
        id SERIAL PRIMARY KEY,
        data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        qtd_atendimentos INTEGER NOT NULL,
        observacao TEXT NOT NULL DEFAULT '',
        usuario TEXT NOT NULL DEFAULT '',
        atendimentos_json JSONB NOT NULL DEFAULT '[]',
        notificacoes_json JSONB NOT NULL DEFAULT '[]'
      )
    `);

    const result = await client.query<HistoricoNotificacaoRow>(
      `SELECT id, data_geracao::text, qtd_atendimentos, observacao, usuario,
              atendimentos_json::text, notificacoes_json::text
       FROM c33581562000206.historico_notificacao_lote
       ORDER BY data_geracao DESC
       LIMIT 100`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Buscar motivos de notificação mais recentes para uma lista de atendimentos
 * Retorna um mapa { numatend: motivo }
 */
export async function buscarMotivosNotificacao(
  numatends: string[]
): Promise<Record<string, string>> {
  if (numatends.length === 0) return {};
  const client = await getPool().connect();
  try {
    // Buscar a notificação mais recente de cada atendimento com seu motivo
    const result = await client.query<{ numatend: string; motivo: string }>(`
      SELECT DISTINCT ON (rn.numatend::text)
        rn.numatend::text AS numatend,
        rni.motivo
      FROM c33581562000206.registro_notificacao rn
      INNER JOIN c33581562000206.registro_notificacao_item rni
        ON rni.notificacao_id = rn.id
      WHERE rn.numatend::text = ANY($1)
      ORDER BY rn.numatend::text, rn.id DESC
    `, [numatends]);

    const mapa: Record<string, string> = {};
    for (const row of result.rows) {
      mapa[row.numatend] = row.motivo;
    }
    return mapa;
  } catch (err) {
    console.error("[pgAtendimentos] Erro ao buscar motivos de notificação:", err);
    return {};
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    client.release();
  }
}
