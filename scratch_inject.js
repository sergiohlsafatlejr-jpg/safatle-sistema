import fs from 'fs';
let c = fs.readFileSync('server/faturamentoUnificadoService.ts', 'utf8');

c = c.replace('import { sql } from "drizzle-orm";', 'import { sql, eq } from "drizzle-orm";\\nimport { warleineFaturamentoStaging } from "../drizzle/schema-integracao";');

const insertContent = `
// ============================================================
// POPULAÇÃO A PARTIR DO WARLEINE (JSON STAGING)
// ============================================================

export async function popularDeWarleine(
  estabelecimentoId: number,
  competencia?: string
): Promise<{ inseridos: number; total: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const compFilter = competencia ? \\\`AND competencia LIKE '\\\${competencia.replace(/'/g, "''")}%'\\\` : '';

  // Fetch staging data
  const stagingData = await db
    .select()
    .from(warleineFaturamentoStaging)
    .where(eq(warleineFaturamentoStaging.estabelecimentoId, estabelecimentoId));

  if (stagingData.length === 0) return { inseridos: 0, total: 0 };

  const deleteQuery = \\\`
    DELETE FROM faturamento_unificado 
    WHERE origemSistema = 'WARLEINE' 
      AND estabelecimentoId = \\\${estabelecimentoId}
      AND statusConciliacao = 'pendente'
      \\\${compFilter}
  \\\`;
  await db.execute(sql.raw(deleteQuery));

  let registrosTransformados = 0;
  const BATCH_SIZE = 1000;

  for (let i = 0; i < stagingData.length; i += BATCH_SIZE) {
    const batch = stagingData.slice(i, i + BATCH_SIZE);
    
    const valuesPart = batch.map(row => {
      const dados = typeof row.dadosBrutos === 'string' ? JSON.parse(row.dadosBrutos) : (row.dadosBrutos as any);

      // Filtering for competencia if passed
      const r_mesprod = String(dados?.mesprod || '');
      const compVal = r_mesprod.replace('/', '-'); // ex: 2025/01 -> 2025-01
      if (competencia && !compVal.startsWith(competencia)) return null;

      const uuid = String(dados?._id || dados?.id || row.id || '');
      const escape = (str: string | number | null | undefined) => str || str === 0 ? \\\`'\\\${String(str).replace(/'/g, "''")}'\\\` : 'NULL';
      
      const dtStr = dados?.data || null;
      const dtSQL = dtStr ? \\\`'\\\${new Date(dtStr).toISOString().slice(0, 19).replace('T', ' ')}'\\\` : 'NULL';

      return \\\`(
        'WARLEINE',
        \\\${escape(uuid)},
        \\\${estabelecimentoId},
        \\\${escape(dados?.numconta)},
        \\\${escape(dados?.guiacobra)},
        \\\${escape(dados?.aihguia)},
        \\\${escape(dados?.protocolo)},
        \\\${escape(dados?.numfatura)},
        \\\${escape(dados?.matricula)},
        \\\${escape(String(dados?.nomeconv || '').trim())},
        \\\${escape(compVal)},
        \\\${escape(dados?.nomeprest)},
        \\\${escape(dados?.nomecc)},
        \\\${escape(dados?.tipoproc)},
        \\\${escape(dados?.procdisco)},
        \\\${escape(dados?.codproprio)},
        \\\${escape(dados?.descricao)},
        \\\${dtSQL},
        \\\${escape(dados?.quantidade)},
        \\\${escape(dados?.vl_unitario)},
        \\\${escape(dados?.vl_faturado)},
        NOW()
      )\\\`;
    }).filter(v => v !== null).join(',');

    if (!valuesPart) continue;

    const insertQuery = \\\`
      INSERT INTO faturamento_unificado (
        origemSistema, origemId, estabelecimentoId,
        contaNumero, numeroGuia, numeroGuiaOperadora,
        protocolo, lotePrestador, carteiraBeneficiario,
        convenio, competencia,
        profissionalExecutante, setor,
        tipoItem, codigoItem, codigoItemTuss,
        descricaoItem, dataExecucao, quantidade,
        valorUnitario, valorFaturado,
        dataSincronizacao
      ) VALUES \\\${valuesPart}
      ON DUPLICATE KEY UPDATE 
        carteiraBeneficiario = VALUES(carteiraBeneficiario),
        profissionalExecutante = VALUES(profissionalExecutante),
        valorFaturado = VALUES(valorFaturado)
    \\\`;

    await db.execute(sql.raw(insertQuery));
    registrosTransformados += batch.filter(x => {
      const dados = typeof x.dadosBrutos === 'string' ? JSON.parse(x.dadosBrutos) : (x.dadosBrutos as any);
      const r_mesprod = String(dados?.mesprod || '');
      const compVal = r_mesprod.replace('/', '-');
      if (competencia && !compVal.startsWith(competencia)) return false;
      return true;
    }).length;
  }

  return { inseridos: registrosTransformados, total: registrosTransformados };
}

// ============================================================
// POPULAÇÃO A PARTIR DO WARLEINE (integ_faturado)
// ============================================================`;

c = c.replace('// ============================================================\\r\\n// POPULAÇÃO A PARTIR DO WARLEINE (integ_faturado)\\r\\n// ============================================================', insertContent);
c = c.replace('// ============================================================\\n// POPULAÇÃO A PARTIR DO WARLEINE (integ_faturado)\\n// ============================================================', insertContent);

fs.writeFileSync('server/faturamentoUnificadoService.ts', c);
console.log('Modified faturamentoUnificadoService.ts');
