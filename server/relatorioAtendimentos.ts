import pg from "pg";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { relatorioAtendimentosCache, relatorioAtendimentosSyncMeta } from "../drizzle/schema-integracao";
import { eq, and, gte, lte, like, sql, count, desc } from "drizzle-orm";

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
  dsprocprin: string | null;
  procedimento_principal: string | null;
  cidprin: string | null;
  diagnostico_cid: string | null;
  carater_atendimento: string | null;
  codpac: string | null;
  paciente: string | null;
  codesp: string | null;
  especialidade: string | null;
  opecad: string | null;
  operador_cadastro: string | null;
  codcbo: string | null;
  descricao_cbo: string | null;
  sexo_paciente: string | null;
  cep_paciente: string | null;
}

export interface RelatorioAtendimentosResult {
  dados: AtendimentoRelatorio[];
  total: number;
  pagina: number;
  totalPaginas: number;
  fonte: "cache_local" | "postgresql_direto";
}

// ============================================================
// BUSCAR ATENDIMENTOS - Tenta cache local, fallback PostgreSQL
// ============================================================

export async function buscarAtendimentos(
  filtros: FiltroRelatorioAtendimentos
): Promise<RelatorioAtendimentosResult> {
  const limit = filtros.limit || 100;
  const offset = filtros.offset || 0;

  // Tentar cache local primeiro
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(relatorioAtendimentosCache);
      
      if (cacheCount[0]?.total > 0) {
        return buscarDoCache(db, filtros, limit, offset);
      }
    }
  } catch (e) {
    console.warn("[RelatorioAtendimentos] Cache local indisponível, usando PostgreSQL:", (e as Error).message);
  }

  // Fallback: PostgreSQL direto
  return buscarDoPostgresql(filtros, limit, offset);
}

// ============================================================
// BUSCAR DO CACHE LOCAL (MySQL/TiDB)
// ============================================================

async function buscarDoCache(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  filtros: FiltroRelatorioAtendimentos,
  limit: number,
  offset: number
): Promise<RelatorioAtendimentosResult> {
  const conditions: any[] = [];

  // Filtro de data
  conditions.push(gte(relatorioAtendimentosCache.dataAtendimento, new Date(filtros.dataInicio)));
  conditions.push(lte(relatorioAtendimentosCache.dataAtendimento, new Date(filtros.dataFim)));

  // Filtros opcionais
  if (filtros.tipoAtendimento) {
    // Mapear código para descrição
    const tipoMap: Record<string, string> = {
      "I": "Internação",
      "A": "Ambulatorial",
      "E": "Emergência",
      "U": "Urgência",
    };
    const tipoDesc = tipoMap[filtros.tipoAtendimento] || filtros.tipoAtendimento;
    conditions.push(eq(relatorioAtendimentosCache.tipoAtendimento, tipoDesc));
  }

  if (filtros.codServ) {
    conditions.push(eq(relatorioAtendimentosCache.codserv, filtros.codServ));
  }

  if (filtros.codPlaco) {
    conditions.push(eq(relatorioAtendimentosCache.codplaco, filtros.codPlaco));
  }

  if (filtros.codPrest) {
    conditions.push(eq(relatorioAtendimentosCache.codprest, filtros.codPrest));
  }

  if (filtros.codCc) {
    conditions.push(eq(relatorioAtendimentosCache.codcc, filtros.codCc));
  }

  if (filtros.carater) {
    const caraterMap: Record<string, string> = {
      "UR": "Urgência",
      "EL": "Eletivo",
    };
    const caraterDesc = caraterMap[filtros.carater] || filtros.carater;
    conditions.push(eq(relatorioAtendimentosCache.caraterAtendimento, caraterDesc));
  }

  const whereClause = and(...conditions);

  // Contagem total
  const countResult = await db
    .select({ total: count() })
    .from(relatorioAtendimentosCache)
    .where(whereClause);
  
  const total = countResult[0]?.total || 0;

  // Buscar dados
  const dados = await db
    .select()
    .from(relatorioAtendimentosCache)
    .where(whereClause)
    .orderBy(desc(relatorioAtendimentosCache.dataAtendimento))
    .limit(limit)
    .offset(offset);

  // Mapear para o formato esperado
  const dadosMapeados: AtendimentoRelatorio[] = dados.map((d) => ({
    numatend: d.numatend,
    tipo_atendimento: d.tipoAtendimento || "",
    codserv: d.codserv || "",
    servico: d.servico,
    codplaco: d.codplaco || "",
    plano_convenio: d.planoConvenio,
    codproven: d.codproven,
    proveniente: d.proveniente,
    data_atendimento: d.dataAtendimento ? d.dataAtendimento.toISOString() : "",
    data_saida: d.dataSaida ? d.dataSaida.toISOString() : null,
    censo: d.censo,
    codcc: d.codcc,
    centro_custo: d.centroCusto,
    codprest: d.codprest,
    prestador: d.prestador,
    procprin: d.procprin,
    procedimento_principal: d.procedimentoPrincipal,
    cidprin: d.cidprin,
    diagnostico_cid: d.diagnosticoCid,
    carater_atendimento: d.caraterAtendimento,
    codpac: d.codpac,
    paciente: d.paciente,
    dsprocprin: null,
    codesp: d.codesp || null,
    especialidade: d.especialidade || null,
    opecad: d.opecad || null,
    operador_cadastro: d.operadorCadastro || null,
    codcbo: d.codcbo || null,
    descricao_cbo: d.descricaoCbo || null,
    sexo_paciente: d.sexoPaciente || null,
    cep_paciente: d.cepPaciente || null,
  }));

  return {
    dados: dadosMapeados,
    total,
    pagina: Math.floor(offset / limit) + 1,
    totalPaginas: Math.ceil(total / limit),
    fonte: "cache_local",
  };
}

// ============================================================
// BUSCAR DO POSTGRESQL DIRETO (Fallback)
// ============================================================

async function buscarDoPostgresql(
  filtros: FiltroRelatorioAtendimentos,
  limit: number,
  offset: number
): Promise<RelatorioAtendimentosResult> {
  const client = await getWarleinePool().connect();
  try {
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
        a.dsprocprin,
        COALESCE(a.dsprocprin, fp.descrproc) AS procedimento_principal,
        a.cidprin,
        cid.descrcid AS diagnostico_cid,
        CASE a.carater
          WHEN 'UR' THEN 'Urgência'
          WHEN 'EL' THEN 'Eletivo'
          ELSE a.carater
        END AS carater_atendimento,
        a.codpac,
        pac.nomepac AS paciente,
        a.codesp,
        ce.nomeesp AS especialidade,
        a.opecad,
        co.nomeope AS operador_cadastro,
        a.codcbo,
        tc.descricbo AS descricao_cbo,
        pac.sexo AS sexo_paciente,
        pac.ceppac AS cep_paciente
      FROM "PACIENTE".arqatend a
      LEFT JOIN "PACIENTE".cadserv s ON s.codserv = a.codserv
      LEFT JOIN "PACIENTE".cadplaco p ON p.codplaco = a.codplaco
      LEFT JOIN "PACIENTE".cdproven pv ON pv.codproven = a.codproven
      LEFT JOIN "PACIENTE".cadcc cc ON cc.codcc = a.codcc
      LEFT JOIN "PACIENTE".cadprest pr ON pr.codprest = a.codprest
      LEFT JOIN "PACIENTE".filanpro fp ON fp.codproc = a.procprin
      LEFT JOIN "PACIENTE".tabcid cid ON cid.codcid = a.cidprin
      LEFT JOIN "PACIENTE".cadpac pac ON pac.codpac = a.codpac
      LEFT JOIN "PACIENTE".cadesp ce ON ce.codesp = a.codesp
      LEFT JOIN "PACIENTE".cadope co ON co.codope = a.opecad
      LEFT JOIN "PACIENTE".tabcbo tc ON tc.codcbo = a.codcbo
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
      fonte: "postgresql_direto",
    };
  } finally {
    client.release();
  }
}

// ============================================================
// BUSCAR OPÇÕES DE FILTRO - Cache local ou PostgreSQL
// ============================================================

export async function buscarOpcoesFiltro(): Promise<{
  servicos: { codserv: string; nomeserv: string }[];
  planos: { codplaco: string; nomeplaco: string }[];
  centrosCusto: { codcc: string; nomecc: string }[];
  prestadores: { codprest: string; nomeprest: string }[];
  fonte: "cache_local" | "postgresql_direto";
}> {
  // Tentar cache local primeiro
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(relatorioAtendimentosCache);
      
      if (cacheCount[0]?.total > 0) {
        return buscarOpcoesFiltroDoCache(db);
      }
    }
  } catch (e) {
    console.warn("[RelatorioAtendimentos] Cache local indisponível para filtros:", (e as Error).message);
  }

  // Fallback: PostgreSQL direto
  return buscarOpcoesFiltroDoPostgresql();
}

async function buscarOpcoesFiltroDoCache(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<{
  servicos: { codserv: string; nomeserv: string }[];
  planos: { codplaco: string; nomeplaco: string }[];
  centrosCusto: { codcc: string; nomecc: string }[];
  prestadores: { codprest: string; nomeprest: string }[];
  fonte: "cache_local" | "postgresql_direto";
}> {
  const [servicos, planos, centrosCusto, prestadores] = await Promise.all([
    db.selectDistinct({
      codserv: relatorioAtendimentosCache.codserv,
      nomeserv: relatorioAtendimentosCache.servico,
    })
    .from(relatorioAtendimentosCache)
    .where(sql`${relatorioAtendimentosCache.codserv} IS NOT NULL`)
    .orderBy(relatorioAtendimentosCache.servico),

    db.selectDistinct({
      codplaco: relatorioAtendimentosCache.codplaco,
      nomeplaco: relatorioAtendimentosCache.planoConvenio,
    })
    .from(relatorioAtendimentosCache)
    .where(sql`${relatorioAtendimentosCache.codplaco} IS NOT NULL`)
    .orderBy(relatorioAtendimentosCache.planoConvenio),

    db.selectDistinct({
      codcc: relatorioAtendimentosCache.codcc,
      nomecc: relatorioAtendimentosCache.centroCusto,
    })
    .from(relatorioAtendimentosCache)
    .where(sql`${relatorioAtendimentosCache.codcc} IS NOT NULL`)
    .orderBy(relatorioAtendimentosCache.centroCusto),

    db.selectDistinct({
      codprest: relatorioAtendimentosCache.codprest,
      nomeprest: relatorioAtendimentosCache.prestador,
    })
    .from(relatorioAtendimentosCache)
    .where(sql`${relatorioAtendimentosCache.codprest} IS NOT NULL`)
    .orderBy(relatorioAtendimentosCache.prestador)
    .limit(500),
  ]);

  return {
    servicos: servicos.filter(s => s.codserv) as { codserv: string; nomeserv: string }[],
    planos: planos.filter(p => p.codplaco) as { codplaco: string; nomeplaco: string }[],
    centrosCusto: centrosCusto.filter(c => c.codcc) as { codcc: string; nomecc: string }[],
    prestadores: prestadores.filter(p => p.codprest) as { codprest: string; nomeprest: string }[],
    fonte: "cache_local",
  };
}

async function buscarOpcoesFiltroDoPostgresql(): Promise<{
  servicos: { codserv: string; nomeserv: string }[];
  planos: { codplaco: string; nomeplaco: string }[];
  centrosCusto: { codcc: string; nomecc: string }[];
  prestadores: { codprest: string; nomeprest: string }[];
  fonte: "cache_local" | "postgresql_direto";
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
      fonte: "postgresql_direto",
    };
  } finally {
    client.release();
  }
}

// ============================================================
// SINCRONIZAÇÃO: Warleine → Cache Local
// ============================================================

export async function sincronizarRelatorioAtendimentos(
  estabelecimentoId: number,
  dataInicio: string,
  dataFim: string,
  executadoPor?: number,
  executadoPorNome?: string
): Promise<{
  sucesso: boolean;
  mensagem: string;
  totalRegistros: number;
  duracaoSegundos: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      sucesso: false,
      mensagem: "Banco de dados local não disponível",
      totalRegistros: 0,
      duracaoSegundos: 0,
    };
  }

  const inicio = Date.now();

  // Atualizar status para em_andamento
  await upsertSyncMeta(db, estabelecimentoId, {
    status: "em_andamento",
    dataInicioSync: dataInicio,
    dataFimSync: dataFim,
    executadoPor: executadoPor || null,
    executadoPorNome: executadoPorNome || null,
  });

  try {
    // Buscar dados do PostgreSQL
    const client = await getWarleinePool().connect();
    let totalRegistros = 0;

    try {
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
          a.dsprocprin,
          COALESCE(a.dsprocprin, fp.descrproc) AS procedimento_principal,
          a.cidprin,
          cid.descrcid AS diagnostico_cid,
          CASE a.carater
            WHEN 'UR' THEN 'Urgência'
            WHEN 'EL' THEN 'Eletivo'
            ELSE a.carater
          END AS carater_atendimento,
          a.codpac,
          pac.nomepac AS paciente,
          a.codesp,
          ce.nomeesp AS especialidade,
          a.opecad,
          co.nomeope AS operador_cadastro,
          a.codcbo,
          tc.descricbo AS descricao_cbo,
          pac.sexo AS sexo_paciente,
          pac.ceppac AS cep_paciente
        FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".cadserv s ON s.codserv = a.codserv
        LEFT JOIN "PACIENTE".cadplaco p ON p.codplaco = a.codplaco
        LEFT JOIN "PACIENTE".cdproven pv ON pv.codproven = a.codproven
        LEFT JOIN "PACIENTE".cadcc cc ON cc.codcc = a.codcc
        LEFT JOIN "PACIENTE".cadprest pr ON pr.codprest = a.codprest
        LEFT JOIN "PACIENTE".filanpro fp ON fp.codproc = a.procprin
        LEFT JOIN "PACIENTE".tabcid cid ON cid.codcid = a.cidprin
        LEFT JOIN "PACIENTE".cadpac pac ON pac.codpac = a.codpac
        LEFT JOIN "PACIENTE".cadesp ce ON ce.codesp = a.codesp
        LEFT JOIN "PACIENTE".cadope co ON co.codope = a.opecad
        LEFT JOIN "PACIENTE".tabcbo tc ON tc.codcbo = a.codcbo
        WHERE a.datatend >= $1 AND a.datatend <= $2
        ORDER BY a.datatend DESC
      `;

      const result = await client.query(query, [dataInicio, dataFim]);
      const rows = result.rows;
      totalRegistros = rows.length;

      if (totalRegistros > 0) {
        // Limpar cache antigo para o período
        await db.delete(relatorioAtendimentosCache)
          .where(
            and(
              eq(relatorioAtendimentosCache.estabelecimentoId, estabelecimentoId),
              gte(relatorioAtendimentosCache.dataAtendimento, new Date(dataInicio)),
              lte(relatorioAtendimentosCache.dataAtendimento, new Date(dataFim))
            )
          );

        // Inserir em lotes de 500
        const batchSize = 500;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          await db.insert(relatorioAtendimentosCache).values(
            batch.map((row: any) => ({
              estabelecimentoId,
              numatend: String(row.numatend || ""),
              tipoAtendimento: row.tipo_atendimento || null,
              codserv: row.codserv ? String(row.codserv) : null,
              servico: row.servico || null,
              codplaco: row.codplaco ? String(row.codplaco) : null,
              planoConvenio: row.plano_convenio || null,
              codproven: row.codproven ? String(row.codproven) : null,
              proveniente: row.proveniente || null,
              dataAtendimento: row.data_atendimento ? new Date(row.data_atendimento) : null,
              dataSaida: row.data_saida ? new Date(row.data_saida) : null,
              censo: row.censo || null,
              codcc: row.codcc ? String(row.codcc) : null,
              centroCusto: row.centro_custo || null,
              codprest: row.codprest ? String(row.codprest) : null,
              prestador: row.prestador || null,
              procprin: row.procprin ? String(row.procprin) : null,
              procedimentoPrincipal: row.procedimento_principal || null,
              cidprin: row.cidprin || null,
              diagnosticoCid: row.diagnostico_cid || null,
              caraterAtendimento: row.carater_atendimento || null,
              codpac: row.codpac ? String(row.codpac) : null,
              paciente: row.paciente || null,
              codesp: row.codesp ? String(row.codesp) : null,
              especialidade: row.especialidade || null,
              opecad: row.opecad ? String(row.opecad) : null,
              operadorCadastro: row.operador_cadastro || null,
              codcbo: row.codcbo ? String(row.codcbo) : null,
              descricaoCbo: row.descricao_cbo || null,
              sexoPaciente: row.sexo_paciente || null,
              cepPaciente: row.cep_paciente || null,
            }))
          );
        }
      }
    } finally {
      client.release();
    }

    const duracaoSegundos = Math.round((Date.now() - inicio) / 1000);

    // Atualizar status para sucesso
    await upsertSyncMeta(db, estabelecimentoId, {
      status: "sucesso",
      ultimaSincronizacao: new Date(),
      totalRegistros,
      duracaoSegundos,
      mensagemErro: null,
    });

    return {
      sucesso: true,
      mensagem: `Sincronizados ${totalRegistros.toLocaleString("pt-BR")} atendimentos em ${duracaoSegundos}s`,
      totalRegistros,
      duracaoSegundos,
    };
  } catch (error) {
    const duracaoSegundos = Math.round((Date.now() - inicio) / 1000);
    const mensagemErro = (error as Error).message;

    // Atualizar status para erro
    await upsertSyncMeta(db, estabelecimentoId, {
      status: "erro",
      duracaoSegundos,
      mensagemErro,
    });

    return {
      sucesso: false,
      mensagem: mensagemErro,
      totalRegistros: 0,
      duracaoSegundos,
    };
  }
}

// ============================================================
// STATUS DE SINCRONIZAÇÃO
// ============================================================

export async function obterStatusSincronizacao(estabelecimentoId: number): Promise<{
  status: string;
  ultimaSincronizacao: Date | null;
  totalRegistrosCache: number;
  duracaoSegundos: number;
  mensagemErro: string | null;
  dataInicioSync: string | null;
  dataFimSync: string | null;
} | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Buscar metadados de sync
    const meta = await db
      .select()
      .from(relatorioAtendimentosSyncMeta)
      .where(eq(relatorioAtendimentosSyncMeta.estabelecimentoId, estabelecimentoId))
      .limit(1);

    // Contar registros no cache
    const cacheCount = await db
      .select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(eq(relatorioAtendimentosCache.estabelecimentoId, estabelecimentoId));

    const totalRegistrosCache = cacheCount[0]?.total || 0;

    if (meta.length === 0) {
      return {
        status: "nunca",
        ultimaSincronizacao: null,
        totalRegistrosCache,
        duracaoSegundos: 0,
        mensagemErro: null,
        dataInicioSync: null,
        dataFimSync: null,
      };
    }

    const m = meta[0];
    return {
      status: m.status,
      ultimaSincronizacao: m.ultimaSincronizacao,
      totalRegistrosCache,
      duracaoSegundos: m.duracaoSegundos || 0,
      mensagemErro: m.mensagemErro,
      dataInicioSync: m.dataInicioSync,
      dataFimSync: m.dataFimSync,
    };
  } catch (e) {
    console.warn("[RelatorioAtendimentos] Erro ao obter status:", (e as Error).message);
    return null;
  }
}

// ============================================================
// HELPER: Upsert sync metadata
// ============================================================

async function upsertSyncMeta(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  estabelecimentoId: number,
  data: Partial<{
    status: string;
    ultimaSincronizacao: Date | null;
    dataInicioSync: string | null;
    dataFimSync: string | null;
    totalRegistros: number;
    duracaoSegundos: number;
    mensagemErro: string | null;
    executadoPor: number | null;
    executadoPorNome: string | null;
  }>
) {
  const existing = await db
    .select()
    .from(relatorioAtendimentosSyncMeta)
    .where(eq(relatorioAtendimentosSyncMeta.estabelecimentoId, estabelecimentoId))
    .limit(1);

  const updateData: any = { ...data, atualizadoEm: new Date() };

  if (existing.length === 0) {
    await db.insert(relatorioAtendimentosSyncMeta).values({
      estabelecimentoId,
      ...updateData,
    });
  } else {
    await db
      .update(relatorioAtendimentosSyncMeta)
      .set(updateData)
      .where(eq(relatorioAtendimentosSyncMeta.estabelecimentoId, estabelecimentoId));
  }
}


// ============================================================
// MÉTRICAS AGREGADAS PARA DASHBOARD
// ============================================================

export interface MetricaAgrupada {
  nome: string;
  codigo: string | null;
  total: number;
}

export interface MetricaMesAno {
  mesAno: string; // "2025-01"
  total: number;
}

export interface MetricasDashboard {
  totalAtendimentos: number;
  totalMedicos: number;
  totalConvenios: number;
  totalProcedimentos: number;
  porMedico: MetricaAgrupada[];
  porTipo: MetricaAgrupada[];
  porPlano: MetricaAgrupada[];
  porServico: MetricaAgrupada[];
  porMesAno: MetricaMesAno[];
  porCid: MetricaAgrupada[];
  porProcedimento: MetricaAgrupada[];
  fonte: "cache_local" | "postgresql_direto";
}

export interface FiltrosDashboard {
  dataInicio: string;
  dataFim: string;
  tipoAtendimento?: string;
  codPlaco?: string;
  codPrest?: string;
  codServ?: string;
}

export async function buscarMetricasDashboard(
  filtros: FiltrosDashboard
): Promise<MetricasDashboard> {
  // Tentar cache local primeiro
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(relatorioAtendimentosCache);

      if (cacheCount[0]?.total > 0) {
        return buscarMetricasDoCache(db, filtros as FiltrosDashboard);
      }
    }
  } catch (e) {
    console.warn("[Dashboard] Cache local indisponível, usando PostgreSQL:", (e as Error).message);
  }

  // Fallback: PostgreSQL direto
  return buscarMetricasDoPostgresql(filtros);
}

async function buscarMetricasDoCache(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  filtros: FiltrosDashboard
): Promise<MetricasDashboard> {
  const baseConditions: any[] = [
    gte(relatorioAtendimentosCache.dataAtendimento, new Date(filtros.dataInicio)),
    lte(relatorioAtendimentosCache.dataAtendimento, new Date(filtros.dataFim)),
  ];

  // Filtros opcionais
  if (filtros.tipoAtendimento) {
    const tipoMap: Record<string, string> = {
      "I": "Internação", "A": "Ambulatorial", "E": "Emergência", "U": "Urgência",
    };
    const tipoDesc = tipoMap[filtros.tipoAtendimento] || filtros.tipoAtendimento;
    baseConditions.push(eq(relatorioAtendimentosCache.tipoAtendimento, tipoDesc));
  }
  if (filtros.codPlaco) {
    baseConditions.push(eq(relatorioAtendimentosCache.codplaco, filtros.codPlaco));
  }
  if (filtros.codPrest) {
    baseConditions.push(eq(relatorioAtendimentosCache.codprest, filtros.codPrest));
  }
  if (filtros.codServ) {
    baseConditions.push(eq(relatorioAtendimentosCache.codserv, filtros.codServ));
  }

  const dateCondition = and(...baseConditions);

  const [
    totalResult,
    porMedico,
    porTipo,
    porPlano,
    porServico,
    porMesAno,
    porCid,
    porProcedimento,
  ] = await Promise.all([
    // Total geral
    db.select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(dateCondition),

    // Por médico (top 20)
    db.select({
      nome: relatorioAtendimentosCache.prestador,
      codigo: relatorioAtendimentosCache.codprest,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(dateCondition, sql`${relatorioAtendimentosCache.codprest} IS NOT NULL`))
      .groupBy(relatorioAtendimentosCache.prestador, relatorioAtendimentosCache.codprest)
      .orderBy(desc(count()))
      .limit(20),

    // Por tipo
    db.select({
      nome: relatorioAtendimentosCache.tipoAtendimento,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(dateCondition, sql`${relatorioAtendimentosCache.tipoAtendimento} IS NOT NULL`))
      .groupBy(relatorioAtendimentosCache.tipoAtendimento)
      .orderBy(desc(count())),

    // Por plano/convênio (top 20)
    db.select({
      nome: relatorioAtendimentosCache.planoConvenio,
      codigo: relatorioAtendimentosCache.codplaco,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(dateCondition, sql`${relatorioAtendimentosCache.codplaco} IS NOT NULL`))
      .groupBy(relatorioAtendimentosCache.planoConvenio, relatorioAtendimentosCache.codplaco)
      .orderBy(desc(count()))
      .limit(20),

    // Por serviço
    db.select({
      nome: relatorioAtendimentosCache.servico,
      codigo: relatorioAtendimentosCache.codserv,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(dateCondition, sql`${relatorioAtendimentosCache.codserv} IS NOT NULL`))
      .groupBy(relatorioAtendimentosCache.servico, relatorioAtendimentosCache.codserv)
      .orderBy(desc(count())),

    // Por mês/ano
    db.select({
      mesAno: sql<string>`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(dateCondition)
      .groupBy(sql`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`),

    // Por CID (top 20)
    db.select({
      nome: relatorioAtendimentosCache.diagnosticoCid,
      codigo: relatorioAtendimentosCache.cidprin,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(dateCondition, sql`${relatorioAtendimentosCache.cidprin} IS NOT NULL`))
      .groupBy(relatorioAtendimentosCache.diagnosticoCid, relatorioAtendimentosCache.cidprin)
      .orderBy(desc(count()))
      .limit(20),

    // Por procedimento (top 20)
    db.select({
      nome: relatorioAtendimentosCache.procedimentoPrincipal,
      codigo: relatorioAtendimentosCache.procprin,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(dateCondition, sql`${relatorioAtendimentosCache.procprin} IS NOT NULL`))
      .groupBy(relatorioAtendimentosCache.procedimentoPrincipal, relatorioAtendimentosCache.procprin)
      .orderBy(desc(count()))
      .limit(20),
  ]);

  const totalAtendimentos = totalResult[0]?.total || 0;
  const medicosUnicos = new Set(porMedico.map(m => m.codigo)).size;
  const conveniosUnicos = new Set(porPlano.map(p => p.codigo)).size;
  const procedimentosUnicos = new Set(porProcedimento.map(p => p.codigo)).size;

  return {
    totalAtendimentos,
    totalMedicos: medicosUnicos,
    totalConvenios: conveniosUnicos,
    totalProcedimentos: procedimentosUnicos,
    porMedico: porMedico.map(m => ({ nome: m.nome || "Sem nome", codigo: m.codigo, total: m.total })),
    porTipo: porTipo.map(t => ({ nome: t.nome || "Outros", codigo: null, total: t.total })),
    porPlano: porPlano.map(p => ({ nome: p.nome || "Sem plano", codigo: p.codigo, total: p.total })),
    porServico: porServico.map(s => ({ nome: s.nome || "Sem serviço", codigo: s.codigo, total: s.total })),
    porMesAno: porMesAno.map(m => ({ mesAno: m.mesAno, total: m.total })),
    porCid: porCid.map(c => ({ nome: c.nome || c.codigo || "Sem CID", codigo: c.codigo, total: c.total })),
    porProcedimento: porProcedimento.map(p => ({ nome: p.nome || p.codigo || "Sem procedimento", codigo: p.codigo, total: p.total })),
    fonte: "cache_local",
  };
}

async function buscarMetricasDoPostgresql(
  filtros: FiltrosDashboard
): Promise<MetricasDashboard> {
  const client = await getWarleinePool().connect();
  try {
    const params: any[] = [filtros.dataInicio, filtros.dataFim];
    let paramIndex = 3;
    const extraConditions: string[] = [];

    if (filtros.tipoAtendimento) {
      extraConditions.push(`a.tipoatend = $${paramIndex}`);
      params.push(filtros.tipoAtendimento);
      paramIndex++;
    }
    if (filtros.codPlaco) {
      extraConditions.push(`a.codplaco = $${paramIndex}`);
      params.push(filtros.codPlaco);
      paramIndex++;
    }
    if (filtros.codPrest) {
      extraConditions.push(`a.codprest = $${paramIndex}`);
      params.push(filtros.codPrest);
      paramIndex++;
    }
    if (filtros.codServ) {
      extraConditions.push(`a.codserv = $${paramIndex}`);
      params.push(filtros.codServ);
      paramIndex++;
    }

    const extraWhere = extraConditions.length > 0 ? ` AND ${extraConditions.join(" AND ")}` : "";
    const dateWhere = `WHERE a.datatend >= $1 AND a.datatend <= $2${extraWhere}`;

    const [
      totalResult,
      porMedicoResult,
      porTipoResult,
      porPlanoResult,
      porServicoResult,
      porMesAnoResult,
      porCidResult,
      porProcedimentoResult,
    ] = await Promise.all([
      // Total
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhere}`, params),

      // Por médico (top 20)
      client.query(`
        SELECT pr.nomeprest AS nome, a.codprest AS codigo, COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".cadprest pr ON pr.codprest = a.codprest
        ${dateWhere} AND a.codprest IS NOT NULL
        GROUP BY pr.nomeprest, a.codprest
        ORDER BY total DESC LIMIT 20
      `, params),

      // Por tipo
      client.query(`
        SELECT 
          CASE a.tipoatend 
            WHEN 'A' THEN 'Ambulatorial'
            WHEN 'I' THEN 'Internação'
            WHEN 'E' THEN 'Emergência'
            WHEN 'U' THEN 'Urgência'
            ELSE a.tipoatend
          END AS nome,
          COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        ${dateWhere} AND a.tipoatend IS NOT NULL
        GROUP BY a.tipoatend
        ORDER BY total DESC
      `, params),

      // Por plano (top 20)
      client.query(`
        SELECT p.nomeplaco AS nome, a.codplaco AS codigo, COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".cadplaco p ON p.codplaco = a.codplaco
        ${dateWhere} AND a.codplaco IS NOT NULL
        GROUP BY p.nomeplaco, a.codplaco
        ORDER BY total DESC LIMIT 20
      `, params),

      // Por serviço
      client.query(`
        SELECT s.nomeserv AS nome, a.codserv AS codigo, COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".cadserv s ON s.codserv = a.codserv
        ${dateWhere} AND a.codserv IS NOT NULL
        GROUP BY s.nomeserv, a.codserv
        ORDER BY total DESC
      `, params),

      // Por mês/ano
      client.query(`
        SELECT TO_CHAR(a.datatend, 'YYYY-MM') AS mes_ano, COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        ${dateWhere}
        GROUP BY TO_CHAR(a.datatend, 'YYYY-MM')
        ORDER BY mes_ano
      `, params),

      // Por CID (top 20)
      client.query(`
        SELECT cid.descrcid AS nome, a.cidprin AS codigo, COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".tabcid cid ON cid.codcid = a.cidprin
        ${dateWhere} AND a.cidprin IS NOT NULL
        GROUP BY cid.descrcid, a.cidprin
        ORDER BY total DESC LIMIT 20
      `, params),

      // Por procedimento (top 20)
      client.query(`
        SELECT COALESCE(a.dsprocprin, fp.descrproc) AS nome, a.procprin AS codigo, COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".filanpro fp ON fp.codproc = a.procprin
        ${dateWhere} AND a.procprin IS NOT NULL
        GROUP BY COALESCE(a.dsprocprin, fp.descrproc), a.procprin
        ORDER BY total DESC LIMIT 20
      `, params),
    ]);

    const totalAtendimentos = parseInt(totalResult.rows[0]?.total || "0", 10);

    return {
      totalAtendimentos,
      totalMedicos: porMedicoResult.rows.length,
      totalConvenios: porPlanoResult.rows.length,
      totalProcedimentos: porProcedimentoResult.rows.length,
      porMedico: porMedicoResult.rows.map((r: any) => ({ nome: r.nome || "Sem nome", codigo: r.codigo, total: parseInt(r.total, 10) })),
      porTipo: porTipoResult.rows.map((r: any) => ({ nome: r.nome || "Outros", codigo: null, total: parseInt(r.total, 10) })),
      porPlano: porPlanoResult.rows.map((r: any) => ({ nome: r.nome || "Sem plano", codigo: r.codigo, total: parseInt(r.total, 10) })),
      porServico: porServicoResult.rows.map((r: any) => ({ nome: r.nome || "Sem serviço", codigo: r.codigo, total: parseInt(r.total, 10) })),
      porMesAno: porMesAnoResult.rows.map((r: any) => ({ mesAno: r.mes_ano, total: parseInt(r.total, 10) })),
      porCid: porCidResult.rows.map((r: any) => ({ nome: r.nome || r.codigo || "Sem CID", codigo: r.codigo, total: parseInt(r.total, 10) })),
      porProcedimento: porProcedimentoResult.rows.map((r: any) => ({ nome: r.nome || r.codigo || "Sem procedimento", codigo: r.codigo, total: parseInt(r.total, 10) })),
      fonte: "postgresql_direto",
    };
  } finally {
    client.release();
  }
}


// ============================================================
// COMPARAÇÃO DE PERÍODOS (período atual vs anterior)
// ============================================================

export interface ComparacaoPeriodos {
  periodoAtual: {
    label: string;
    totalAtendimentos: number;
    totalMedicos: number;
    totalConvenios: number;
    totalProcedimentos: number;
  };
  periodoAnterior: {
    label: string;
    totalAtendimentos: number;
    totalMedicos: number;
    totalConvenios: number;
    totalProcedimentos: number;
  };
  fonte: "cache_local" | "postgresql_direto";
}

export async function buscarComparacaoPeriodos(
  dataInicio: string,
  dataFim: string
): Promise<ComparacaoPeriodos> {
  // Calcular período anterior com mesma duração
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const duracaoMs = fim.getTime() - inicio.getTime();
  const inicioAnterior = new Date(inicio.getTime() - duracaoMs);
  const fimAnterior = new Date(inicio.getTime() - 1); // 1ms antes do início atual

  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatLabel = (d1: Date, d2: Date) => {
    const m1 = d1.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    const m2 = d2.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
    return m1 === m2 ? m1 : `${m1} - ${m2}`;
  };

  // Buscar métricas de ambos os períodos
  const [metricasAtual, metricasAnterior] = await Promise.all([
    buscarMetricasDashboard({ dataInicio, dataFim }),
    buscarMetricasDashboard({
      dataInicio: formatDate(inicioAnterior),
      dataFim: formatDate(fimAnterior),
    }),
  ]);

  return {
    periodoAtual: {
      label: formatLabel(inicio, fim),
      totalAtendimentos: metricasAtual.totalAtendimentos,
      totalMedicos: metricasAtual.totalMedicos,
      totalConvenios: metricasAtual.totalConvenios,
      totalProcedimentos: metricasAtual.totalProcedimentos,
    },
    periodoAnterior: {
      label: formatLabel(inicioAnterior, fimAnterior),
      totalAtendimentos: metricasAnterior.totalAtendimentos,
      totalMedicos: metricasAnterior.totalMedicos,
      totalConvenios: metricasAnterior.totalConvenios,
      totalProcedimentos: metricasAnterior.totalProcedimentos,
    },
    fonte: metricasAtual.fonte,
  };
}


// ============================================================
// MÉTRICAS AVANÇADAS - Permanência, Turno, Conversão, Caráter
// ============================================================

export interface MetricasAvancadas {
  // Média de permanência (dias) para internações
  mediaPermanenciaDias: number;
  totalInternacoes: number;
  
  // Volume por turno
  porTurno: {
    manha: number;   // 06:00-11:59
    tarde: number;    // 12:00-17:59
    noite: number;    // 18:00-23:59
    madrugada: number; // 00:00-05:59
    total: number;
  };
  
  // Taxa de conversão Emergência → Internação
  taxaConversao: {
    totalEmergencias: number;
    totalConvertidos: number; // internações com proveniente = emergência
    taxa: number; // percentual
    evolucaoMensal: Array<{
      mesAno: string;
      emergencias: number;
      convertidos: number;
      taxa: number;
    }>;
  };
  
  // Comparativo detalhado por tipo
  comparativoDetalhado: {
    periodoAtual: {
      label: string;
      internacoes: number;
      ambulatoriais: number;
      emergencias: number;
      urgencias: number;
      procedimentos: number;
    };
    periodoAnterior: {
      label: string;
      internacoes: number;
      ambulatoriais: number;
      emergencias: number;
      urgencias: number;
      procedimentos: number;
    };
  };
  
  // Caráter: Eletivo vs Urgência
  porCarater: Array<{ nome: string; total: number }>;
  
  fonte: "cache_local" | "postgresql_direto";
}

export async function buscarMetricasAvancadas(
  filtros: FiltrosDashboard
): Promise<MetricasAvancadas> {
  // Tentar cache local primeiro
  try {
    const db = await getDb();
    if (db) {
      const cacheCount = await db
        .select({ total: count() })
        .from(relatorioAtendimentosCache);

      if (cacheCount[0]?.total > 0) {
        return buscarMetricasAvancadasDoCache(db, filtros);
      }
    }
  } catch (e) {
    console.warn("[MetricasAvancadas] Cache local indisponível, usando PostgreSQL:", (e as Error).message);
  }

  // Fallback: PostgreSQL direto
  return buscarMetricasAvancadasDoPostgresql(filtros);
}

async function buscarMetricasAvancadasDoCache(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  filtros: FiltrosDashboard
): Promise<MetricasAvancadas> {
  const inicio = new Date(filtros.dataInicio);
  const fim = new Date(filtros.dataFim);
  
  const baseConditions: any[] = [
    gte(relatorioAtendimentosCache.dataAtendimento, inicio),
    lte(relatorioAtendimentosCache.dataAtendimento, fim),
  ];

  if (filtros.tipoAtendimento) {
    const tipoMap: Record<string, string> = {
      "I": "Internação", "A": "Ambulatorial", "E": "Emergência", "U": "Urgência",
    };
    baseConditions.push(eq(relatorioAtendimentosCache.tipoAtendimento, tipoMap[filtros.tipoAtendimento] || filtros.tipoAtendimento));
  }
  if (filtros.codPlaco) baseConditions.push(eq(relatorioAtendimentosCache.codplaco, filtros.codPlaco));
  if (filtros.codPrest) baseConditions.push(eq(relatorioAtendimentosCache.codprest, filtros.codPrest));
  if (filtros.codServ) baseConditions.push(eq(relatorioAtendimentosCache.codserv, filtros.codServ));

  const whereClause = and(...baseConditions);

  // Calcular período anterior
  const duracaoMs = fim.getTime() - inicio.getTime();
  const inicioAnterior = new Date(inicio.getTime() - duracaoMs);
  const fimAnterior = new Date(inicio.getTime() - 1);
  const formatDate = (d: Date) => d.toISOString().split("T")[0];
  const formatLabel = (d1: Date, d2: Date) => {
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
    const m1 = d1.toLocaleDateString("pt-BR", opts);
    const m2 = d2.toLocaleDateString("pt-BR", opts);
    return m1 === m2 ? m1 : `${m1} - ${m2}`;
  };

  const whereAnterior = and(
    gte(relatorioAtendimentosCache.dataAtendimento, inicioAnterior),
    lte(relatorioAtendimentosCache.dataAtendimento, fimAnterior),
  );

  const [
    // Média de permanência
    internacoes,
    // Volume por turno
    turnoManha,
    turnoTarde,
    turnoNoite,
    turnoMadrugada,
    // Emergências e conversões
    totalEmergencias,
    totalConvertidos,
    // Conversão mensal
    emergenciasMensal,
    convertidosMensal,
    // Caráter
    porCarater,
    // Comparativo detalhado - período atual
    internacoesAtual,
    ambulatoriaisAtual,
    emergenciasAtual,
    urgenciasAtual,
    procedimentosAtual,
    // Comparativo detalhado - período anterior
    internacoesAnterior,
    ambulatoriaisAnterior,
    emergenciasAnterior,
    urgenciasAnterior,
    procedimentosAnterior,
  ] = await Promise.all([
    // 1. Internações com data_saida para média de permanência
    db.select({
      dataAtendimento: relatorioAtendimentosCache.dataAtendimento,
      dataSaida: relatorioAtendimentosCache.dataSaida,
    })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, 
        eq(relatorioAtendimentosCache.tipoAtendimento, "Internação"),
        sql`${relatorioAtendimentosCache.dataSaida} IS NOT NULL`
      )),

    // 2. Turno - Manhã (06-11)
    db.select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, sql`HOUR(${relatorioAtendimentosCache.dataAtendimento}) >= 6 AND HOUR(${relatorioAtendimentosCache.dataAtendimento}) < 12`)),

    // 3. Turno - Tarde (12-17)
    db.select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, sql`HOUR(${relatorioAtendimentosCache.dataAtendimento}) >= 12 AND HOUR(${relatorioAtendimentosCache.dataAtendimento}) < 18`)),

    // 4. Turno - Noite (18-23)
    db.select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, sql`HOUR(${relatorioAtendimentosCache.dataAtendimento}) >= 18 AND HOUR(${relatorioAtendimentosCache.dataAtendimento}) < 24`)),

    // 5. Turno - Madrugada (00-05)
    db.select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, sql`HOUR(${relatorioAtendimentosCache.dataAtendimento}) >= 0 AND HOUR(${relatorioAtendimentosCache.dataAtendimento}) < 6`)),

    // 6. Total emergências
    db.select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, eq(relatorioAtendimentosCache.tipoAtendimento, "Emergência"))),

    // 7. Internações com proveniente contendo "emerg"
    db.select({ total: count() })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, 
        eq(relatorioAtendimentosCache.tipoAtendimento, "Internação"),
        like(relatorioAtendimentosCache.proveniente, "%merg%")
      )),

    // 8. Emergências por mês
    db.select({
      mesAno: sql<string>`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, eq(relatorioAtendimentosCache.tipoAtendimento, "Emergência")))
      .groupBy(sql`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`),

    // 9. Convertidos por mês
    db.select({
      mesAno: sql<string>`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, 
        eq(relatorioAtendimentosCache.tipoAtendimento, "Internação"),
        like(relatorioAtendimentosCache.proveniente, "%merg%")
      ))
      .groupBy(sql`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${relatorioAtendimentosCache.dataAtendimento}, '%Y-%m')`),

    // 10. Por caráter
    db.select({
      nome: relatorioAtendimentosCache.caraterAtendimento,
      total: count(),
    })
      .from(relatorioAtendimentosCache)
      .where(and(whereClause, sql`${relatorioAtendimentosCache.caraterAtendimento} IS NOT NULL AND ${relatorioAtendimentosCache.caraterAtendimento} != ''`))
      .groupBy(relatorioAtendimentosCache.caraterAtendimento)
      .orderBy(desc(count())),

    // 11-15. Comparativo período atual
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereClause, eq(relatorioAtendimentosCache.tipoAtendimento, "Internação"))),
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereClause, eq(relatorioAtendimentosCache.tipoAtendimento, "Ambulatorial"))),
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereClause, eq(relatorioAtendimentosCache.tipoAtendimento, "Emergência"))),
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereClause, eq(relatorioAtendimentosCache.tipoAtendimento, "Urgência"))),
    db.select({ total: sql<number>`COUNT(DISTINCT ${relatorioAtendimentosCache.procprin})` }).from(relatorioAtendimentosCache)
      .where(and(whereClause, sql`${relatorioAtendimentosCache.procprin} IS NOT NULL`)),

    // 16-20. Comparativo período anterior
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereAnterior, eq(relatorioAtendimentosCache.tipoAtendimento, "Internação"))),
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereAnterior, eq(relatorioAtendimentosCache.tipoAtendimento, "Ambulatorial"))),
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereAnterior, eq(relatorioAtendimentosCache.tipoAtendimento, "Emergência"))),
    db.select({ total: count() }).from(relatorioAtendimentosCache)
      .where(and(whereAnterior, eq(relatorioAtendimentosCache.tipoAtendimento, "Urgência"))),
    db.select({ total: sql<number>`COUNT(DISTINCT ${relatorioAtendimentosCache.procprin})` }).from(relatorioAtendimentosCache)
      .where(and(whereAnterior, sql`${relatorioAtendimentosCache.procprin} IS NOT NULL`)),
  ]);

  // Calcular média de permanência
  let mediaPermanenciaDias = 0;
  if (internacoes.length > 0) {
    const totalDias = internacoes.reduce((acc, curr) => {
      if (!curr.dataAtendimento || !curr.dataSaida) return acc;
      const entrada = new Date(curr.dataAtendimento).getTime();
      const saida = new Date(curr.dataSaida).getTime();
      return acc + (saida - entrada);
    }, 0);
    const mediaMs = totalDias / internacoes.length;
    mediaPermanenciaDias = parseFloat((mediaMs / (1000 * 60 * 60 * 24)).toFixed(1));
  }

  // Volume por turno
  const manhaTotal = turnoManha[0]?.total || 0;
  const tardeTotal = turnoTarde[0]?.total || 0;
  const noiteTotal = turnoNoite[0]?.total || 0;
  const madrugadaTotal = turnoMadrugada[0]?.total || 0;
  const turnoTotal = manhaTotal + tardeTotal + noiteTotal + madrugadaTotal;

  // Taxa de conversão
  const emergenciasTotal = totalEmergencias[0]?.total || 0;
  const convertidosTotal = totalConvertidos[0]?.total || 0;
  const taxaConversaoPerc = emergenciasTotal > 0 
    ? parseFloat(((convertidosTotal / emergenciasTotal) * 100).toFixed(1)) 
    : 0;

  // Evolução mensal da conversão
  const mesesEmergencia = new Map(emergenciasMensal.map(e => [e.mesAno, e.total]));
  const mesesConvertidos = new Map(convertidosMensal.map(c => [c.mesAno, c.total]));
  const todosMeses = new Set([...mesesEmergencia.keys(), ...mesesConvertidos.keys()]);
  const evolucaoMensal = Array.from(todosMeses).sort().map(mesAno => {
    const emerg = mesesEmergencia.get(mesAno) || 0;
    const conv = mesesConvertidos.get(mesAno) || 0;
    return {
      mesAno,
      emergencias: emerg,
      convertidos: conv,
      taxa: emerg > 0 ? parseFloat(((conv / emerg) * 100).toFixed(1)) : 0,
    };
  });

  return {
    mediaPermanenciaDias,
    totalInternacoes: internacoes.length,
    porTurno: {
      manha: manhaTotal,
      tarde: tardeTotal,
      noite: noiteTotal,
      madrugada: madrugadaTotal,
      total: turnoTotal,
    },
    taxaConversao: {
      totalEmergencias: emergenciasTotal,
      totalConvertidos: convertidosTotal,
      taxa: taxaConversaoPerc,
      evolucaoMensal,
    },
    comparativoDetalhado: {
      periodoAtual: {
        label: formatLabel(inicio, fim),
        internacoes: internacoesAtual[0]?.total || 0,
        ambulatoriais: ambulatoriaisAtual[0]?.total || 0,
        emergencias: emergenciasAtual[0]?.total || 0,
        urgencias: urgenciasAtual[0]?.total || 0,
        procedimentos: procedimentosAtual[0]?.total || 0,
      },
      periodoAnterior: {
        label: formatLabel(inicioAnterior, fimAnterior),
        internacoes: internacoesAnterior[0]?.total || 0,
        ambulatoriais: ambulatoriaisAnterior[0]?.total || 0,
        emergencias: emergenciasAnterior[0]?.total || 0,
        urgencias: urgenciasAnterior[0]?.total || 0,
        procedimentos: procedimentosAnterior[0]?.total || 0,
      },
    },
    porCarater: porCarater.map(c => ({ nome: c.nome || "Não informado", total: c.total })),
    fonte: "cache_local",
  };
}

async function buscarMetricasAvancadasDoPostgresql(
  filtros: FiltrosDashboard
): Promise<MetricasAvancadas> {
  const client = await getWarleinePool().connect();
  try {
    const inicio = new Date(filtros.dataInicio);
    const fim = new Date(filtros.dataFim);
    const duracaoMs = fim.getTime() - inicio.getTime();
    const inicioAnterior = new Date(inicio.getTime() - duracaoMs);
    const fimAnterior = new Date(inicio.getTime() - 1);
    const formatDate = (d: Date) => d.toISOString().split("T")[0];
    const formatLabel = (d1: Date, d2: Date) => {
      const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric" };
      const m1 = d1.toLocaleDateString("pt-BR", opts);
      const m2 = d2.toLocaleDateString("pt-BR", opts);
      return m1 === m2 ? m1 : `${m1} - ${m2}`;
    };

    const params: any[] = [filtros.dataInicio, filtros.dataFim];
    let paramIndex = 3;
    const extraConditions: string[] = [];

    if (filtros.tipoAtendimento) {
      extraConditions.push(`a.tipoatend = $${paramIndex}`);
      params.push(filtros.tipoAtendimento);
      paramIndex++;
    }
    if (filtros.codPlaco) {
      extraConditions.push(`a.codplaco = $${paramIndex}`);
      params.push(filtros.codPlaco);
      paramIndex++;
    }
    if (filtros.codPrest) {
      extraConditions.push(`a.codprest = $${paramIndex}`);
      params.push(filtros.codPrest);
      paramIndex++;
    }
    if (filtros.codServ) {
      extraConditions.push(`a.codserv = $${paramIndex}`);
      params.push(filtros.codServ);
      paramIndex++;
    }

    const extraWhere = extraConditions.length > 0 ? ` AND ${extraConditions.join(" AND ")}` : "";
    const dateWhere = `WHERE a.datatend >= $1 AND a.datatend <= $2${extraWhere}`;

    const paramsAnterior = [formatDate(inicioAnterior), formatDate(fimAnterior), ...params.slice(2)];
    const dateWhereAnterior = `WHERE a.datatend >= $1 AND a.datatend <= $2${extraWhere}`;

    const [
      // Média de permanência
      permanenciaResult,
      // Turnos
      turnoResult,
      // Emergências
      emergResult,
      convertResult,
      // Conversão mensal
      emergMensalResult,
      convertMensalResult,
      // Caráter
      caraterResult,
      // Comparativo atual
      intAtualResult,
      ambAtualResult,
      emAtualResult,
      urgAtualResult,
      procAtualResult,
      // Comparativo anterior
      intAntResult,
      ambAntResult,
      emAntResult,
      urgAntResult,
      procAntResult,
    ] = await Promise.all([
      // 1. Permanência
      client.query(`
        SELECT a.datatend, a.datasai FROM "PACIENTE".arqatend a
        ${dateWhere} AND a.tipoatend = 'I' AND a.datasai IS NOT NULL
      `, params),

      // 2. Turnos
      client.query(`
        SELECT
          SUM(CASE WHEN EXTRACT(HOUR FROM a.datatend) >= 6 AND EXTRACT(HOUR FROM a.datatend) < 12 THEN 1 ELSE 0 END) AS manha,
          SUM(CASE WHEN EXTRACT(HOUR FROM a.datatend) >= 12 AND EXTRACT(HOUR FROM a.datatend) < 18 THEN 1 ELSE 0 END) AS tarde,
          SUM(CASE WHEN EXTRACT(HOUR FROM a.datatend) >= 18 AND EXTRACT(HOUR FROM a.datatend) < 24 THEN 1 ELSE 0 END) AS noite,
          SUM(CASE WHEN EXTRACT(HOUR FROM a.datatend) >= 0 AND EXTRACT(HOUR FROM a.datatend) < 6 THEN 1 ELSE 0 END) AS madrugada
        FROM "PACIENTE".arqatend a ${dateWhere}
      `, params),

      // 3. Emergências
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhere} AND a.tipoatend = 'E'`, params),

      // 4. Convertidos (internações com proveniente = emergência)
      client.query(`
        SELECT COUNT(*) as total FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".cdproven pv ON pv.codproven = a.codproven
        ${dateWhere} AND a.tipoatend = 'I' AND LOWER(pv.nomeproven) LIKE '%merg%'
      `, params),

      // 5. Emergências mensal
      client.query(`
        SELECT TO_CHAR(a.datatend, 'YYYY-MM') AS mes_ano, COUNT(*) AS total
        FROM "PACIENTE".arqatend a ${dateWhere} AND a.tipoatend = 'E'
        GROUP BY TO_CHAR(a.datatend, 'YYYY-MM') ORDER BY mes_ano
      `, params),

      // 6. Convertidos mensal
      client.query(`
        SELECT TO_CHAR(a.datatend, 'YYYY-MM') AS mes_ano, COUNT(*) AS total
        FROM "PACIENTE".arqatend a
        LEFT JOIN "PACIENTE".cdproven pv ON pv.codproven = a.codproven
        ${dateWhere} AND a.tipoatend = 'I' AND LOWER(pv.nomeproven) LIKE '%merg%'
        GROUP BY TO_CHAR(a.datatend, 'YYYY-MM') ORDER BY mes_ano
      `, params),

      // 7. Caráter
      client.query(`
        SELECT CASE a.carater WHEN 'UR' THEN 'Urgência' WHEN 'EL' THEN 'Eletivo' ELSE a.carater END AS nome,
        COUNT(*) AS total FROM "PACIENTE".arqatend a
        ${dateWhere} AND a.carater IS NOT NULL AND a.carater != ''
        GROUP BY a.carater ORDER BY total DESC
      `, params),

      // 8-12. Comparativo atual
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhere} AND a.tipoatend = 'I'`, params),
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhere} AND a.tipoatend = 'A'`, params),
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhere} AND a.tipoatend = 'E'`, params),
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhere} AND a.tipoatend = 'U'`, params),
      client.query(`SELECT COUNT(DISTINCT a.procprin) as total FROM "PACIENTE".arqatend a ${dateWhere} AND a.procprin IS NOT NULL`, params),

      // 13-17. Comparativo anterior
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhereAnterior} AND a.tipoatend = 'I'`, paramsAnterior),
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhereAnterior} AND a.tipoatend = 'A'`, paramsAnterior),
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhereAnterior} AND a.tipoatend = 'E'`, paramsAnterior),
      client.query(`SELECT COUNT(*) as total FROM "PACIENTE".arqatend a ${dateWhereAnterior} AND a.tipoatend = 'U'`, paramsAnterior),
      client.query(`SELECT COUNT(DISTINCT a.procprin) as total FROM "PACIENTE".arqatend a ${dateWhereAnterior} AND a.procprin IS NOT NULL`, paramsAnterior),
    ]);

    // Calcular média de permanência
    let mediaPermanenciaDias = 0;
    const internacoesRows = permanenciaResult.rows;
    if (internacoesRows.length > 0) {
      const totalDias = internacoesRows.reduce((acc: number, curr: any) => {
        const entrada = new Date(curr.datatend).getTime();
        const saida = new Date(curr.datasai).getTime();
        return acc + (saida - entrada);
      }, 0);
      const mediaMs = totalDias / internacoesRows.length;
      mediaPermanenciaDias = parseFloat((mediaMs / (1000 * 60 * 60 * 24)).toFixed(1));
    }

    // Turnos
    const turnoRow = turnoResult.rows[0] || {};
    const manhaTotal = parseInt(turnoRow.manha || "0", 10);
    const tardeTotal = parseInt(turnoRow.tarde || "0", 10);
    const noiteTotal = parseInt(turnoRow.noite || "0", 10);
    const madrugadaTotal = parseInt(turnoRow.madrugada || "0", 10);
    const turnoTotal = manhaTotal + tardeTotal + noiteTotal + madrugadaTotal;

    // Conversão
    const emergenciasTotal = parseInt(emergResult.rows[0]?.total || "0", 10);
    const convertidosTotal = parseInt(convertResult.rows[0]?.total || "0", 10);
    const taxaConversaoPerc = emergenciasTotal > 0
      ? parseFloat(((convertidosTotal / emergenciasTotal) * 100).toFixed(1))
      : 0;

    // Evolução mensal
    const mesesEmergencia = new Map(emergMensalResult.rows.map((r: any) => [r.mes_ano, parseInt(r.total, 10)]));
    const mesesConvertidos = new Map(convertMensalResult.rows.map((r: any) => [r.mes_ano, parseInt(r.total, 10)]));
    const todosMeses = new Set([...mesesEmergencia.keys(), ...mesesConvertidos.keys()]);
    const evolucaoMensal = Array.from(todosMeses).sort().map(mesAno => {
      const emerg = mesesEmergencia.get(mesAno) || 0;
      const conv = mesesConvertidos.get(mesAno) || 0;
      return {
        mesAno,
        emergencias: emerg,
        convertidos: conv,
        taxa: emerg > 0 ? parseFloat(((conv / emerg) * 100).toFixed(1)) : 0,
      };
    });

    return {
      mediaPermanenciaDias,
      totalInternacoes: internacoesRows.length,
      porTurno: {
        manha: manhaTotal,
        tarde: tardeTotal,
        noite: noiteTotal,
        madrugada: madrugadaTotal,
        total: turnoTotal,
      },
      taxaConversao: {
        totalEmergencias: emergenciasTotal,
        totalConvertidos: convertidosTotal,
        taxa: taxaConversaoPerc,
        evolucaoMensal,
      },
      comparativoDetalhado: {
        periodoAtual: {
          label: formatLabel(inicio, fim),
          internacoes: parseInt(intAtualResult.rows[0]?.total || "0", 10),
          ambulatoriais: parseInt(ambAtualResult.rows[0]?.total || "0", 10),
          emergencias: parseInt(emAtualResult.rows[0]?.total || "0", 10),
          urgencias: parseInt(urgAtualResult.rows[0]?.total || "0", 10),
          procedimentos: parseInt(procAtualResult.rows[0]?.total || "0", 10),
        },
        periodoAnterior: {
          label: formatLabel(inicioAnterior, fimAnterior),
          internacoes: parseInt(intAntResult.rows[0]?.total || "0", 10),
          ambulatoriais: parseInt(ambAntResult.rows[0]?.total || "0", 10),
          emergencias: parseInt(emAntResult.rows[0]?.total || "0", 10),
          urgencias: parseInt(urgAntResult.rows[0]?.total || "0", 10),
          procedimentos: parseInt(procAntResult.rows[0]?.total || "0", 10),
        },
      },
      porCarater: caraterResult.rows.map((r: any) => ({ nome: r.nome || "Não informado", total: parseInt(r.total, 10) })),
      fonte: "postgresql_direto",
    };
  } finally {
    client.release();
  }
}
