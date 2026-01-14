import { eq, and, desc, like, sql, gte, lte, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  convenios,
  arquivos,
  procedimentos,
  comparacoes,
  divergencias,
  codigosProcedimentos,
  camposComparacao,
  itensManuals,
  InsertConvenio,
  InsertArquivo,
  InsertProcedimento,
  InsertComparacao,
  InsertDivergencia,
  InsertCodigoProcedimento,
  InsertCampoComparacao,
  InsertItemManual,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER FUNCTIONS ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ CONVENIO FUNCTIONS ============

export async function createConvenio(data: InsertConvenio) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(convenios).values(data);
  return { id: Number(result[0].insertId) };
}

export async function getConvenios(ativo?: "sim" | "nao") {
  const db = await getDb();
  if (!db) return [];

  if (ativo) {
    return db.select().from(convenios).where(eq(convenios.ativo, ativo));
  }
  return db.select().from(convenios).orderBy(desc(convenios.createdAt));
}

export async function getConvenioById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(convenios)
    .where(eq(convenios.id, id))
    .limit(1);
  return result[0] || null;
}

export async function updateConvenio(
  id: number,
  data: Partial<InsertConvenio>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(convenios).set(data).where(eq(convenios.id, id));
}

// ============ ARQUIVO FUNCTIONS ============

export async function createArquivo(data: InsertArquivo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(arquivos).values(data);
  return { id: Number(result[0].insertId) };
}

export async function getArquivos(filters?: {
  convenioId?: number;
  direcao?: "enviado" | "retornado";
  tipoArquivo?: "xml" | "excel" | "pdf";
  status?: "pendente" | "processado" | "erro";
  userId?: number;
  dataInicio?: Date;
  dataFim?: Date;
  busca?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.convenioId) {
    conditions.push(eq(arquivos.convenioId, filters.convenioId));
  }
  if (filters?.direcao) {
    conditions.push(eq(arquivos.direcao, filters.direcao));
  }
  if (filters?.tipoArquivo) {
    conditions.push(eq(arquivos.tipoArquivo, filters.tipoArquivo));
  }
  if (filters?.status) {
    conditions.push(eq(arquivos.status, filters.status));
  }
  if (filters?.userId) {
    conditions.push(eq(arquivos.userId, filters.userId));
  }
  if (filters?.dataInicio) {
    conditions.push(gte(arquivos.createdAt, filters.dataInicio));
  }
  if (filters?.dataFim) {
    conditions.push(lte(arquivos.createdAt, filters.dataFim));
  }
  if (filters?.busca) {
    conditions.push(like(arquivos.nome, `%${filters.busca}%`));
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(arquivos)
      .where(and(...conditions))
      .orderBy(desc(arquivos.createdAt));
  }

  return db.select().from(arquivos).orderBy(desc(arquivos.createdAt));
}

export async function getArquivoById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(arquivos)
    .where(eq(arquivos.id, id))
    .limit(1);
  return result[0] || null;
}

export async function updateArquivoStatus(
  id: number,
  status: "pendente" | "processado" | "erro"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(arquivos).set({ status }).where(eq(arquivos.id, id));
}

export async function getArquivosStats(userId?: number) {
  const db = await getDb();
  if (!db) return null;

  const baseCondition = userId ? eq(arquivos.userId, userId) : undefined;

  const [total, enviados, retornados, pendentes, processados, erros] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(arquivos)
        .where(baseCondition),
      db
        .select({ count: sql<number>`count(*)` })
        .from(arquivos)
        .where(
          baseCondition
            ? and(baseCondition, eq(arquivos.direcao, "enviado"))
            : eq(arquivos.direcao, "enviado")
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(arquivos)
        .where(
          baseCondition
            ? and(baseCondition, eq(arquivos.direcao, "retornado"))
            : eq(arquivos.direcao, "retornado")
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(arquivos)
        .where(
          baseCondition
            ? and(baseCondition, eq(arquivos.status, "pendente"))
            : eq(arquivos.status, "pendente")
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(arquivos)
        .where(
          baseCondition
            ? and(baseCondition, eq(arquivos.status, "processado"))
            : eq(arquivos.status, "processado")
        ),
      db
        .select({ count: sql<number>`count(*)` })
        .from(arquivos)
        .where(
          baseCondition
            ? and(baseCondition, eq(arquivos.status, "erro"))
            : eq(arquivos.status, "erro")
        ),
    ]);

  return {
    total: total[0]?.count || 0,
    enviados: enviados[0]?.count || 0,
    retornados: retornados[0]?.count || 0,
    pendentes: pendentes[0]?.count || 0,
    processados: processados[0]?.count || 0,
    erros: erros[0]?.count || 0,
  };
}

export async function deleteArquivo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(arquivos).where(eq(arquivos.id, id));
  return { success: true };
}

// ============ PROCEDIMENTO FUNCTIONS ============

export async function createProcedimentos(data: InsertProcedimento[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return { count: 0 };

  await db.insert(procedimentos).values(data);
  return { count: data.length };
}

export async function getProcedimentosByArquivoId(arquivoId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(procedimentos)
    .where(eq(procedimentos.arquivoId, arquivoId));
}

export async function deleteProcedimentosByArquivoId(arquivoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(procedimentos).where(eq(procedimentos.arquivoId, arquivoId));
  return { success: true };
}

export async function getProcedimentosPaginated(filters?: {
  arquivoId?: number;
  convenioId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  // Build conditions
  const conditions = [];

  if (filters?.arquivoId) {
    conditions.push(eq(procedimentos.arquivoId, filters.arquivoId));
  }

  if (filters?.search) {
    conditions.push(
      or(
        like(procedimentos.codigo, `%${filters.search}%`),
        like(procedimentos.descricao, `%${filters.search}%`)
      )
    );
  }

  // If convenioId is specified, we need to filter by arquivo's convenioId
  let baseQuery = db
    .select({
      id: procedimentos.id,
      arquivoId: procedimentos.arquivoId,
      codigo: procedimentos.codigo,
      descricao: procedimentos.descricao,
      quantidade: procedimentos.quantidade,
      valorUnitario: procedimentos.valorUnitario,
      valorTotal: procedimentos.valorTotal,
      dataExecucao: procedimentos.dataExecucao,
      pacienteNome: procedimentos.pacienteNome,
      pacienteCarteirinha: procedimentos.pacienteCarteirinha,
      guiaNumero: procedimentos.guiaNumero,
      createdAt: procedimentos.createdAt,
      arquivoNome: arquivos.nome,
      arquivoConvenioId: arquivos.convenioId,
      convenioNome: convenios.nome,
    })
    .from(procedimentos)
    .leftJoin(arquivos, eq(procedimentos.arquivoId, arquivos.id))
    .leftJoin(convenios, eq(arquivos.convenioId, convenios.id));

  // Add convenioId filter
  if (filters?.convenioId) {
    conditions.push(eq(arquivos.convenioId, filters.convenioId));
  }

  // Add userId filter (only show procedures from user's files)
  if (filters?.userId) {
    conditions.push(eq(arquivos.userId, filters.userId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(procedimentos)
    .leftJoin(arquivos, eq(procedimentos.arquivoId, arquivos.id))
    .where(whereClause);

  const total = countResult[0]?.count || 0;

  // Get paginated items
  const items = await baseQuery
    .where(whereClause)
    .orderBy(desc(procedimentos.createdAt))
    .limit(pageSize)
    .offset(offset);

  return { items, total };
}

// ============ COMPARACAO FUNCTIONS ============

export async function createComparacao(data: InsertComparacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(comparacoes).values(data);
  return { id: Number(result[0].insertId) };
}

export async function getComparacoes(filters?: {
  convenioId?: number;
  userId?: number;
  status?: "pendente" | "concluida" | "erro";
  dataInicio?: Date;
  dataFim?: Date;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.convenioId) {
    conditions.push(eq(comparacoes.convenioId, filters.convenioId));
  }
  if (filters?.userId) {
    conditions.push(eq(comparacoes.userId, filters.userId));
  }
  if (filters?.status) {
    conditions.push(eq(comparacoes.status, filters.status));
  }
  if (filters?.dataInicio) {
    conditions.push(gte(comparacoes.createdAt, filters.dataInicio));
  }
  if (filters?.dataFim) {
    conditions.push(lte(comparacoes.createdAt, filters.dataFim));
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(comparacoes)
      .where(and(...conditions))
      .orderBy(desc(comparacoes.createdAt));
  }

  return db.select().from(comparacoes).orderBy(desc(comparacoes.createdAt));
}

export async function getComparacaoById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(comparacoes)
    .where(eq(comparacoes.id, id))
    .limit(1);
  return result[0] || null;
}

export async function updateComparacao(
  id: number,
  data: Partial<InsertComparacao>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(comparacoes).set(data).where(eq(comparacoes.id, id));
}

export async function getComparacoesStats(userId?: number) {
  const db = await getDb();
  if (!db) return null;

  const baseCondition = userId ? eq(comparacoes.userId, userId) : undefined;

  const [total, concluidas, pendentes, comDivergencias] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(comparacoes)
      .where(baseCondition),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comparacoes)
      .where(
        baseCondition
          ? and(baseCondition, eq(comparacoes.status, "concluida"))
          : eq(comparacoes.status, "concluida")
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comparacoes)
      .where(
        baseCondition
          ? and(baseCondition, eq(comparacoes.status, "pendente"))
          : eq(comparacoes.status, "pendente")
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(comparacoes)
      .where(
        baseCondition
          ? and(
              baseCondition,
              eq(comparacoes.status, "concluida"),
              sql`${comparacoes.totalDivergencias} > 0`
            )
          : and(
              eq(comparacoes.status, "concluida"),
              sql`${comparacoes.totalDivergencias} > 0`
            )
      ),
  ]);

  return {
    total: total[0]?.count || 0,
    concluidas: concluidas[0]?.count || 0,
    pendentes: pendentes[0]?.count || 0,
    comDivergencias: comDivergencias[0]?.count || 0,
  };
}

// ============ DIVERGENCIA FUNCTIONS ============

export async function createDivergencias(data: InsertDivergencia[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.length === 0) return { count: 0 };

  await db.insert(divergencias).values(data);
  return { count: data.length };
}

export async function getDivergenciasByComparacaoId(comparacaoId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(divergencias)
    .where(eq(divergencias.comparacaoId, comparacaoId));
}

export async function updateDivergenciaResolvido(
  id: number,
  resolvido: "sim" | "nao"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(divergencias).set({ resolvido }).where(eq(divergencias.id, id));
}

// ============ CODIGO PROCEDIMENTO FUNCTIONS ============

export async function createCodigoProcedimento(data: InsertCodigoProcedimento) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(codigosProcedimentos).values(data);
  return { id: Number(result[0].insertId) };
}

export async function getCodigosProcedimentos(ativo?: "sim" | "nao") {
  const db = await getDb();
  if (!db) return [];

  if (ativo) {
    return db
      .select()
      .from(codigosProcedimentos)
      .where(eq(codigosProcedimentos.ativo, ativo));
  }
  return db.select().from(codigosProcedimentos);
}

export async function updateCodigoProcedimento(
  id: number,
  data: Partial<InsertCodigoProcedimento>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(codigosProcedimentos)
    .set(data)
    .where(eq(codigosProcedimentos.id, id));
}

export async function deleteCodigoProcedimento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(codigosProcedimentos)
    .set({ ativo: "nao" })
    .where(eq(codigosProcedimentos.id, id));
}

// ============ CAMPO COMPARACAO FUNCTIONS ============

export async function createCampoComparacao(data: InsertCampoComparacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(camposComparacao).values(data);
  return { id: Number(result[0].insertId) };
}

export async function getCamposComparacao(ativo?: "sim" | "nao") {
  const db = await getDb();
  if (!db) return [];

  if (ativo) {
    return db
      .select()
      .from(camposComparacao)
      .where(eq(camposComparacao.ativo, ativo));
  }
  return db.select().from(camposComparacao);
}

export async function updateCampoComparacao(
  id: number,
  data: Partial<InsertCampoComparacao>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(camposComparacao)
    .set(data)
    .where(eq(camposComparacao.id, id));
}

// ============ ITEM MANUAL FUNCTIONS ============

export async function createItemManual(data: InsertItemManual) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(itensManuals).values(data);
  return { id: Number(result[0].insertId) };
}

export async function getItensManuals(filters?: {
  arquivoId?: number;
  comparacaoId?: number;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.arquivoId) {
    conditions.push(eq(itensManuals.arquivoId, filters.arquivoId));
  }
  if (filters?.comparacaoId) {
    conditions.push(eq(itensManuals.comparacaoId, filters.comparacaoId));
  }
  if (filters?.userId) {
    conditions.push(eq(itensManuals.userId, filters.userId));
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(itensManuals)
      .where(and(...conditions))
      .orderBy(desc(itensManuals.createdAt));
  }

  return db.select().from(itensManuals).orderBy(desc(itensManuals.createdAt));
}

export async function deleteItemManual(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(itensManuals).where(eq(itensManuals.id, id));
}
