import { getDb } from "./db";
import { sql } from "drizzle-orm";

/**
 * Service para popular e manter a tabela atendimentos_unificados
 * (Variável Drizzle: `atendimentos`) a partir das tabelas Staging
 */

// ============================================================
// POPULAÇÃO A PARTIR DA STAGING WARLEINE
// ============================================================

export async function popularDeWarleine(
  estabelecimentoId: number
): Promise<{ inseridos: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  // PASSO 1: Opcional, deletar atendimentos antigos não faturados se for replace total, 
  // Na maioria dos casos usaremos o ON DUPLICATE KEY UPDATE ou delete/insert para a competência.
  // Como Atendimentos muda de estado, vamos fazer um Delete-Insert completo para o Warleine:
  const deleteQuery = `
    DELETE FROM atendimentos_unificados 
    WHERE origemSistema = 'WARLEINE' 
      AND estabelecimentoId = ${estabelecimentoId}
  `;
  await db.execute(sql.raw(deleteQuery));

  // PASSO 2: Inserir a partir da staging recém populada
  const insertQuery = `
    INSERT INTO atendimentos_unificados (
      origemSistema, 
      origemId, 
      estabelecimentoId,
      numero_atendimento, 
      convenio, 
      paciente,
      data_entrada, 
      data_saida, 
      tipo_atendimento, 
      codigo_procedimento
    )
    SELECT
      'WARLEINE',
      CAST(st.id AS CHAR),
      st.estabelecimentoId,
      st.numeroAtendimento,
      st.convenioNome,
      st.pacienteNome,
      st.dataEntrada,
      st.dataSaida,
      st.tipoAtendimento,
      st.codigoProcedimento
    FROM staging_atendimento_warleine st
    WHERE st.estabelecimentoId = ${estabelecimentoId}
  `;

  await db.execute(sql.raw(insertQuery));

  // Contar registros inseridos
  const countQuery = `
    SELECT COUNT(*) as total FROM atendimentos_unificados 
    WHERE origemSistema = 'WARLEINE' AND estabelecimentoId = ${estabelecimentoId}
  `;
  const [countResult] = await db.execute(sql.raw(countQuery));
  const total = (countResult as any)?.[0]?.total || 0;

  // Marcar como processado
  await db.execute(sql.raw(`
    UPDATE staging_atendimento_warleine 
    SET processado = TRUE 
    WHERE estabelecimentoId = ${estabelecimentoId}
  `));

  return { inseridos: Number(total), total: Number(total) };
}

// ============================================================
// POPULAÇÃO A PARTIR DA STAGING EASYVISION
// ============================================================

export async function popularDeEasyvision(
  estabelecimentoId: number
): Promise<{ inseridos: number; total: number }> {
  // Lógica similar usando a tabela staging_atendimento_easyvision
  console.log('Orquestrador Easyvision ainda não implementado.');
  return { inseridos: 0, total: 0 };
}
