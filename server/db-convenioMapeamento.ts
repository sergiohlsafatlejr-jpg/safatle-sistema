import { getDb } from "./db";
import { convenioMapeamento, convenios } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Algoritmo de similaridade de strings (Levenshtein normalizado)
 * Retorna score de 0 a 100 (100 = idêntico)
 */
function similaridade(a: string, b: string): number {
  const s1 = a.trim().toUpperCase().replace(/\s+/g, " ");
  const s2 = b.trim().toUpperCase().replace(/\s+/g, " ");
  
  if (s1 === s2) return 100;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0;
  
  // Verificar se um contém o outro
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(len1, len2);
    const maxLen = Math.max(len1, len2);
    return Math.round((minLen / maxLen) * 100);
  }
  
  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

/**
 * Buscar nomes distintos de convênios vindos do hospital (sem mapeamento)
 */
export async function listarConveniosNaoMapeados(estabelecimentoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Buscar todos os nomes distintos da recebimento_geral para este estabelecimento
  const nomesHospital = await db.execute(
    sql`SELECT DISTINCT convenio as nome, codigo_convenio as codigo 
        FROM recebimento_geral 
        WHERE estabelecimentoId = ${estabelecimentoId} 
        AND convenio IS NOT NULL AND convenio != ''
        ORDER BY convenio`
  );
  
  // Buscar mapeamentos existentes
  const mapeamentosExistentes = await db
    .select()
    .from(convenioMapeamento)
    .where(and(
      eq(convenioMapeamento.estabelecimentoId, estabelecimentoId),
      eq(convenioMapeamento.ativo, "sim")
    ));
  
  const mapeadosSet = new Set(
    mapeamentosExistentes.map((m: any) => (m.nomeOrigem || "").trim().toUpperCase())
  );
  
  // Filtrar apenas os não mapeados
  const rows = (nomesHospital as any)[0] || nomesHospital;
  const naoMapeados = (Array.isArray(rows) ? rows : []).filter(
    (r: any) => !mapeadosSet.has((r.nome || "").trim().toUpperCase())
  );
  
  return naoMapeados.map((r: any) => ({
    nome: (r.nome || "").trim(),
    codigo: r.codigo || null,
  }));
}

/**
 * Buscar todos os convênios cadastrados no Safatle
 */
export async function listarConveniosSafatle() {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select({
      id: convenios.id,
      nome: convenios.nome,
      codigo: convenios.codigo,
      estabelecimentoId: convenios.estabelecimentoId,
    })
    .from(convenios)
    .where(eq(convenios.ativo, "sim"))
    .orderBy(convenios.nome);
}

/**
 * Matching automático: sugere correspondências entre nomes do hospital e convênios do Safatle
 */
export async function sugerirMapeamentos(estabelecimentoId: number) {
  const naoMapeados = await listarConveniosNaoMapeados(estabelecimentoId);
  const conveniosSafatle = await listarConveniosSafatle();
  
  const sugestoes: Array<{
    nomeOrigem: string;
    codigoOrigem: string | null;
    sugestoes: Array<{
      convenioId: number;
      nomeSafatle: string;
      codigoSafatle: string | null;
      confianca: number;
      motivo: string;
    }>;
  }> = [];
  
  for (const item of naoMapeados) {
    const matches: Array<{
      convenioId: number;
      nomeSafatle: string;
      codigoSafatle: string | null;
      confianca: number;
      motivo: string;
    }> = [];
    
    for (const conv of conveniosSafatle) {
      let score = 0;
      let motivo = "";
      
      const nomeHosp = item.nome.trim().toUpperCase().replace(/\s+/g, " ");
      const nomeSaf = conv.nome.trim().toUpperCase().replace(/\s+/g, " ");
      
      if (nomeHosp === nomeSaf) {
        score = 100;
        motivo = "Nome idêntico";
      } else if (nomeHosp.includes(nomeSaf) || nomeSaf.includes(nomeHosp)) {
        const minLen = Math.min(nomeHosp.length, nomeSaf.length);
        const maxLen = Math.max(nomeHosp.length, nomeSaf.length);
        score = Math.round((minLen / maxLen) * 100);
        motivo = "Nome parcialmente contido";
      } else {
        score = similaridade(item.nome, conv.nome);
        motivo = "Similaridade textual";
      }
      
      // Bonus: primeira palavra igual
      const primeiraPalavraHosp = nomeHosp.split(" ")[0];
      const primeiraPalavraSaf = nomeSaf.split(" ")[0];
      if (primeiraPalavraHosp === primeiraPalavraSaf && primeiraPalavraHosp.length > 2) {
        score = Math.max(score, 75);
        if (motivo !== "Nome idêntico") {
          motivo = "Primeira palavra coincide";
        }
      }
      
      if (score >= 40) {
        matches.push({
          convenioId: conv.id,
          nomeSafatle: conv.nome,
          codigoSafatle: conv.codigo,
          confianca: score,
          motivo,
        });
      }
    }
    
    matches.sort((a, b) => b.confianca - a.confianca);
    
    sugestoes.push({
      nomeOrigem: item.nome,
      codigoOrigem: item.codigo,
      sugestoes: matches.slice(0, 5),
    });
  }
  
  return sugestoes;
}

/**
 * Salvar um mapeamento de convênio
 */
export async function salvarMapeamento(data: {
  estabelecimentoId: number;
  nomeOrigem: string;
  codigoOrigem?: string | null;
  convenioId: number;
  fonte?: "tasy" | "integracao" | "xml" | "excel" | "manual";
  criadoPor?: number;
  metodoMatch?: "automatico" | "manual";
  confianca?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");
  
  // Verificar se já existe mapeamento para este nome neste estabelecimento
  const existente = await db
    .select()
    .from(convenioMapeamento)
    .where(and(
      eq(convenioMapeamento.estabelecimentoId, data.estabelecimentoId),
      eq(convenioMapeamento.nomeOrigem, data.nomeOrigem.trim())
    ))
    .limit(1);
  
  if (existente.length > 0) {
    await db
      .update(convenioMapeamento)
      .set({
        convenioId: data.convenioId,
        codigoOrigem: data.codigoOrigem || null,
        fonte: data.fonte || "manual",
        metodoMatch: data.metodoMatch || "manual",
        confianca: data.confianca ? String(data.confianca) as any : null,
        ativo: "sim",
      })
      .where(eq(convenioMapeamento.id, existente[0].id));
    
    return { id: existente[0].id, atualizado: true };
  }
  
  const result = await db.insert(convenioMapeamento).values({
    estabelecimentoId: data.estabelecimentoId,
    nomeOrigem: data.nomeOrigem.trim(),
    codigoOrigem: data.codigoOrigem || null,
    convenioId: data.convenioId,
    fonte: data.fonte || "manual",
    criadoPor: data.criadoPor || null,
    metodoMatch: data.metodoMatch || "manual",
    confianca: data.confianca ? String(data.confianca) as any : null,
  });
  
  return { id: (result as any)[0]?.insertId, atualizado: false };
}

/**
 * Salvar múltiplos mapeamentos de uma vez (batch)
 */
export async function salvarMapeamentosBatch(mapeamentos: Array<{
  estabelecimentoId: number;
  nomeOrigem: string;
  codigoOrigem?: string | null;
  convenioId: number;
  fonte?: "tasy" | "integracao" | "xml" | "excel" | "manual";
  criadoPor?: number;
  metodoMatch?: "automatico" | "manual";
  confianca?: number;
}>) {
  const resultados: Array<{ nomeOrigem: string; sucesso: boolean; id?: number }> = [];
  
  for (const m of mapeamentos) {
    try {
      const result = await salvarMapeamento(m);
      resultados.push({ nomeOrigem: m.nomeOrigem, sucesso: true, id: result.id });
    } catch (err) {
      resultados.push({ nomeOrigem: m.nomeOrigem, sucesso: false });
    }
  }
  
  return resultados;
}

/**
 * Listar todos os mapeamentos de um estabelecimento
 */
export async function listarMapeamentos(estabelecimentoId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const mapeamentos = await db
    .select({
      id: convenioMapeamento.id,
      estabelecimentoId: convenioMapeamento.estabelecimentoId,
      nomeOrigem: convenioMapeamento.nomeOrigem,
      codigoOrigem: convenioMapeamento.codigoOrigem,
      convenioId: convenioMapeamento.convenioId,
      nomeSafatle: convenios.nome,
      codigoSafatle: convenios.codigo,
      fonte: convenioMapeamento.fonte,
      ativo: convenioMapeamento.ativo,
      metodoMatch: convenioMapeamento.metodoMatch,
      confianca: convenioMapeamento.confianca,
      createdAt: convenioMapeamento.createdAt,
    })
    .from(convenioMapeamento)
    .leftJoin(convenios, eq(convenioMapeamento.convenioId, convenios.id))
    .where(eq(convenioMapeamento.estabelecimentoId, estabelecimentoId))
    .orderBy(convenioMapeamento.nomeOrigem);
  
  return mapeamentos;
}

/**
 * Remover (desativar) um mapeamento
 */
export async function removerMapeamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados não disponível");
  
  await db
    .update(convenioMapeamento)
    .set({ ativo: "nao" })
    .where(eq(convenioMapeamento.id, id));
}

/**
 * Aplicar mapeamentos automáticos com alta confiança (>= threshold)
 */
export async function aplicarMapeamentosAutomaticos(
  estabelecimentoId: number, 
  threshold: number = 80,
  criadoPor?: number
) {
  const sugestoes = await sugerirMapeamentos(estabelecimentoId);
  const aplicados: Array<{ nomeOrigem: string; convenioId: number; confianca: number }> = [];
  
  for (const item of sugestoes) {
    if (item.sugestoes.length > 0) {
      const melhor = item.sugestoes[0];
      if (melhor.confianca >= threshold) {
        await salvarMapeamento({
          estabelecimentoId,
          nomeOrigem: item.nomeOrigem,
          codigoOrigem: item.codigoOrigem,
          convenioId: melhor.convenioId,
          fonte: "integracao",
          criadoPor,
          metodoMatch: "automatico",
          confianca: melhor.confianca,
        });
        aplicados.push({
          nomeOrigem: item.nomeOrigem,
          convenioId: melhor.convenioId,
          confianca: melhor.confianca,
        });
      }
    }
  }
  
  return { total: aplicados.length, aplicados };
}

/**
 * Buscar o convenioId do Safatle para um nome de convênio do hospital
 */
export async function resolverConvenioId(
  estabelecimentoId: number, 
  nomeConvenioHospital: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({ convenioId: convenioMapeamento.convenioId })
    .from(convenioMapeamento)
    .where(and(
      eq(convenioMapeamento.estabelecimentoId, estabelecimentoId),
      eq(convenioMapeamento.nomeOrigem, nomeConvenioHospital.trim()),
      eq(convenioMapeamento.ativo, "sim")
    ))
    .limit(1);
  
  return result.length > 0 ? result[0].convenioId : null;
}

/**
 * Estatísticas de mapeamento para um estabelecimento
 */
export async function estatisticasMapeamento(estabelecimentoId: number) {
  const naoMapeados = await listarConveniosNaoMapeados(estabelecimentoId);
  const mapeamentos = await listarMapeamentos(estabelecimentoId);
  const ativos = mapeamentos.filter((m: any) => m.ativo === "sim");
  
  return {
    totalConveniosHospital: naoMapeados.length + ativos.length,
    totalMapeados: ativos.length,
    totalNaoMapeados: naoMapeados.length,
    percentualMapeado: ativos.length + naoMapeados.length > 0
      ? Math.round((ativos.length / (ativos.length + naoMapeados.length)) * 100)
      : 0,
    naoMapeados: naoMapeados.map((n: any) => n.nome),
  };
}
