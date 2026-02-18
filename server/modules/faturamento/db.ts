/**
 * Funções de banco para faturamento
 * Separadas do monolito db.ts
 */

import { db } from "@/server/_core/db";
import { faturamentoTiss } from "@/drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function getFaturamentoById(id: number) {
  return db.query.faturamentoTiss.findFirst({
    where: eq(faturamentoTiss.id, id),
  });
}

export async function listFaturamentos(filters: {
  estabelecimentoId: number;
  status?: string;
  dataInicio?: Date;
  dataFim?: Date;
  limit?: number;
  offset?: number;
}) {
  const conditions = [
    eq(faturamentoTiss.estabelecimentoId, filters.estabelecimentoId),
  ];

  if (filters.status) {
    conditions.push(eq(faturamentoTiss.status, filters.status));
  }

  if (filters.dataInicio) {
    conditions.push(gte(faturamentoTiss.dataReferencia, filters.dataInicio));
  }

  if (filters.dataFim) {
    conditions.push(lte(faturamentoTiss.dataReferencia, filters.dataFim));
  }

  return db.query.faturamentoTiss.findMany({
    where: and(...conditions),
    limit: filters.limit || 50,
    offset: filters.offset || 0,
    orderBy: (table, { desc }) => desc(table.createdAt),
  });
}

export async function countFaturamentos(filters: {
  estabelecimentoId: number;
  status?: string;
  dataInicio?: Date;
  dataFim?: Date;
}) {
  const conditions = [
    eq(faturamentoTiss.estabelecimentoId, filters.estabelecimentoId),
  ];

  if (filters.status) {
    conditions.push(eq(faturamentoTiss.status, filters.status));
  }

  if (filters.dataInicio) {
    conditions.push(gte(faturamentoTiss.dataReferencia, filters.dataInicio));
  }

  if (filters.dataFim) {
    conditions.push(lte(faturamentoTiss.dataReferencia, filters.dataFim));
  }

  const result = await db.query.faturamentoTiss.findMany({
    where: and(...conditions),
  });

  return result.length;
}

export async function createFaturamento(data: any) {
  const result = await db.insert(faturamentoTiss).values(data);
  return getFaturamentoById(result[0].insertId);
}

export async function updateFaturamento(id: number, data: any) {
  await db.update(faturamentoTiss).set(data).where(eq(faturamentoTiss.id, id));
  return getFaturamentoById(id);
}

export async function deleteFaturamento(id: number) {
  await db.delete(faturamentoTiss).where(eq(faturamentoTiss.id, id));
}
