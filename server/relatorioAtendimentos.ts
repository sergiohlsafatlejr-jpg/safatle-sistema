import pg from "pg";
import { ENV } from "./_core/env";

const { Pool } = pg;

let warleinePool: pg.Pool | null = null;

function getWarleinePool(): pg.Pool {
  if (!warleinePool) {
    warleinePool = new Pool({
      host: ENV.warleineDbHost,
      port: parseInt(ENV.warleineDbPort, 10),
      database: ENV.warleineDbName,
      user: ENV.warleineDbUser,
      password: ENV.warleineDbPassword,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: false,
    });
  }
  return warleinePool;
}

export interface FiltroRelatorioAtendimentos {
  dataInicio: string;
  dataFim: string;
  tipoAtendimento?: string;
  codServ?: string;
  codPlaco?: string;
  codPrest?: string;
  codCc?: string;
  carater?: string;
  limit?: number;
  offset?: number;
}

export interface AtendimentoRelatorio {
  numatend: string;
  tipo_atendimento: string;
  codserv: string;
  servico: string | null;
  codplaco: string;
  plano_convenio: string | null;
  codproven: string | null;
  proveniente: string | null;
  data_atendimento: string;
  data_saida: string | null;
  censo: string | null;
  codcc: string | null;
  centro_custo: string | null;
  codprest: string | null;
  prestador: string | null;
  procprin: string | null;
  procedimento_principal: string | null;
  cidprin: string | null;
  diagnostico_cid: string | null;
  carater_atendimento: string | null;
  codpac: string | null;
  paciente: string | null;
}

export interface RelatorioAtendimentosResult {
  dados: AtendimentoRelatorio[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

export async function buscarAtendimentos(
  filtros: FiltroRelatorioAtendimentos
): Promise<RelatorioAtendimentosResult> {
  const client = await getWarleinePool().connect();
  try {
    const limit = filtros.limit || 100;
    const offset = filtros.offset || 0;

    // Construir WHERE dinâmico
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    conditions.push(`a.datatend >= $${paramIndex}`);
    params.push(filtros.dataInicio);
    paramIndex++;

    conditions.push(`a.datatend <= $${paramIndex}`);
    params.push(filtros.dataFim);
    paramIndex++;

    if (filtros.tipoAtendimento) {
      conditions.push(`a.tipoatend = $${paramIndex}`);
      params.push(filtros.tipoAtendimento);
      paramIndex++;
    }

    if (filtros.codServ) {
      conditions.push(`a.codserv = $${paramIndex}`);
      params.push(filtros.codServ);
      paramIndex++;
    }

    if (filtros.codPlaco) {
      conditions.push(`a.codplaco = $${paramIndex}`);
      params.push(filtros.codPlaco);
      paramIndex++;
    }

    if (filtros.codPrest) {
      conditions.push(`a.codprest = $${paramIndex}`);
      params.push(filtros.codPrest);
      paramIndex++;
    }

    if (filtros.codCc) {
      conditions.push(`a.codcc = $${paramIndex}`);
      params.push(filtros.codCc);
      paramIndex++;
    }

    if (filtros.carater) {
      conditions.push(`a.carater = $${paramIndex}`);
      params.push(filtros.carater);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM "PACIENTE".arqatend a 
      ${whereClause}
    `;
    const countResult = await client.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total, 10);

    // Query principal
    const query = `
      SELECT
        a.numatend,
        CASE a.tipoatend 
          WHEN 'A' THEN 'Ambulatorial'
          WHEN 'I' THEN 'Internação'
          WHEN 'E' THEN 'Emergência'
          WHEN 'U' THEN 'Urgência'
          ELSE a.tipoatend
        END AS tipo_atendimento,
        a.codserv,
        s.nomeserv AS servico,
        a.codplaco,
        p.nomeplaco AS plano_convenio,
        a.codproven,
        pv.nomeproven AS proveniente,
        a.datatend AS data_atendimento,
        a.datasai AS data_saida,
        a.censo,
        a.codcc,
        cc.nomecc AS centro_custo,
        a.codprest,
        pr.nomeprest AS prestador,
        a.procprin,
        COALESCE(a.dsprocprin, fp.descrproc) AS procedimento_principal,
        a.cidprin,
        cid.descrcid AS diagnostico_cid,
        CASE a.carater
          WHEN 'UR' THEN 'Urgência'
          WHEN 'EL' THEN 'Eletivo'
          ELSE a.carater
        END AS carater_atendimento,
        a.codpac,
        pac.nomepac AS paciente
      FROM "PACIENTE".arqatend a
      LEFT JOIN "PACIENTE".cadserv s ON s.codserv = a.codserv
      LEFT JOIN "PACIENTE".cadplaco p ON p.codplaco = a.codplaco
      LEFT JOIN "PACIENTE".cdproven pv ON pv.codproven = a.codproven
      LEFT JOIN "PACIENTE".cadcc cc ON cc.codcc = a.codcc
      LEFT JOIN "PACIENTE".cadprest pr ON pr.codprest = a.codprest
      LEFT JOIN "PACIENTE".filanpro fp ON fp.codproc = a.procprin
      LEFT JOIN "PACIENTE".tabcid cid ON cid.codcid = a.cidprin
      LEFT JOIN "PACIENTE".cadpac pac ON pac.codpac = a.codpac
      ${whereClause}
      ORDER BY a.datatend DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await client.query(query, [...params, limit, offset]);

    return {
      dados: dataResult.rows,
      total,
      pagina: Math.floor(offset / limit) + 1,
      totalPaginas: Math.ceil(total / limit),
    };
  } finally {
    client.release();
  }
}

// Buscar opções de filtro (listas de valores únicos)
export async function buscarOpcoesFiltro(): Promise<{
  servicos: { codserv: string; nomeserv: string }[];
  planos: { codplaco: string; nomeplaco: string }[];
  centrosCusto: { codcc: string; nomecc: string }[];
  prestadores: { codprest: string; nomeprest: string }[];
}> {
  const client = await getWarleinePool().connect();
  try {
    const [servicos, planos, centrosCusto, prestadores] = await Promise.all([
      client.query(`SELECT codserv, nomeserv FROM "PACIENTE".cadserv WHERE inativo IS NULL OR inativo != 'S' ORDER BY nomeserv`),
      client.query(`SELECT codplaco, nomeplaco FROM "PACIENTE".cadplaco WHERE inativo IS NULL OR inativo != 'S' ORDER BY nomeplaco`),
      client.query(`SELECT codcc, nomecc FROM "PACIENTE".cadcc WHERE inativo IS NULL OR inativo != 'S' ORDER BY nomecc`),
      client.query(`SELECT codprest, nomeprest FROM "PACIENTE".cadprest WHERE inativo IS NULL OR inativo != 'S' ORDER BY nomeprest LIMIT 500`),
    ]);

    return {
      servicos: servicos.rows,
      planos: planos.rows,
      centrosCusto: centrosCusto.rows,
      prestadores: prestadores.rows,
    };
  } finally {
    client.release();
  }
}
