import { readFileSync, writeFileSync } from 'fs';

const FILE = 'server/faturamentoUnificadoService.ts';
const content = readFileSync(FILE);
const text = content.toString('utf-8');

// Check if function definition already exists
if (text.includes('async function atualizarFatoGuia')) {
  console.log('Function already exists, skipping.');
  process.exit(0);
}

// Find the GLOSAR section marker  
const marker = 'GLOSAR ITENS';
const markerIdx = text.indexOf(marker);
if (markerIdx === -1) {
  console.error('Marker not found!');
  process.exit(1);
}

// Find the "// ====" line before "// GLOSAR ITENS"
let pos = markerIdx;
while (pos > 0 && text[pos - 1] !== '\n') pos--;
// pos is now at start of "// GLOSAR ITENS..." line
// Go back past empty line
let insertPos = pos;
if (text[insertPos - 1] === '\n') insertPos--;
if (text[insertPos - 1] === '\r') insertPos--;
// Go back past previous "// ====" line  
if (text[insertPos - 1] === '\n') insertPos--;
if (text[insertPos - 1] === '\r') insertPos--;
while (insertPos > 0 && text[insertPos - 1] !== '\n') insertPos--;

console.log('Insert position:', insertPos);
console.log('Context around insert:', JSON.stringify(text.slice(Math.max(0, insertPos - 20), insertPos + 20)));

const funcLines = [
  '// ============================================================',
  '// REFRESH PARCIAL DA FATO_CONCILIACAO_GUIAS', 
  '// ============================================================',
  '',
  '/**',
  ' * Atualiza a fato_conciliacao_guias para uma ou mais guias especificas.',
  ' * Chamada apos operacoes manuais (glosar, reverter, vincular) para manter',
  ' * os KPIs do header sincronizados com os dados reais.',
  ' */',
  'async function atualizarFatoGuia(estabelecimentoId: number, guias: string[]): Promise<void> {',
  '  if (guias.length === 0) return;',
  '  const db = await getDb();',
  '  if (!db) return;',
  '',
  '  try {',
  '    const guiasEsc = guias.map(g => `\'${g.replace(/\'/g, "\'\'")}\' `).join(\',\');',
  '',
  '    await db.execute(sql.raw(',
  '      `DELETE FROM fato_conciliacao_guias WHERE estabelecimentoId = ${estabelecimentoId} AND guia IN (${guiasEsc})`',
  '    ));',
  '',
  '    await db.execute(sql.raw(`',
  '      INSERT INTO fato_conciliacao_guias (',
  '        estabelecimentoId, competencia, convenioId, convenio, guia, pacienteNome,',
  '        valorFaturado, valorPago, valorGlosa, diferenca, statusGuia,',
  '        totalItens, itensConciliados, itensDivergentes, itensGlosados, itensNaoRecebidos, itensTerceiros',
  '      )',
  '      SELECT',
  '        estabelecimentoId, MAX(competencia), MAX(convenioId), MAX(convenio),',
  '        COALESCE(numeroGuia, contaNumero) as guia, MAX(pacienteNome),',
  '        COALESCE(SUM(valorFaturado), 0), COALESCE(SUM(valorPago), 0), COALESCE(SUM(valorGlosa), 0), COALESCE(SUM(diferenca), 0),',
  '        CASE',
  '          WHEN SUM(CASE WHEN statusConciliacao IN (\'nao_recebido\', \'divergente\') THEN 1 ELSE 0 END) = 0 THEN \'conciliado\'',
  '          WHEN SUM(CASE WHEN statusConciliacao = \'divergente\' THEN 1 ELSE 0 END) > 0 THEN \'divergente\'',
  '          WHEN SUM(CASE WHEN statusConciliacao = \'nao_recebido\' THEN 1 ELSE 0 END) > 0 THEN \'nao_recebido\'',
  '          WHEN SUM(CASE WHEN statusConciliacao = \'terceiro\' THEN 1 ELSE 0 END) > 0 AND SUM(CASE WHEN statusConciliacao != \'terceiro\' THEN 1 ELSE 0 END) = 0 THEN \'terceiro\'',
  '          ELSE \'glosado\'',
  '        END as statusGuia,',
  '        COUNT(*),',
  '        SUM(CASE WHEN statusConciliacao = \'conciliado\' THEN 1 ELSE 0 END),',
  '        SUM(CASE WHEN statusConciliacao = \'divergente\' THEN 1 ELSE 0 END),',
  '        SUM(CASE WHEN statusConciliacao = \'glosado\' THEN 1 ELSE 0 END),',
  '        SUM(CASE WHEN statusConciliacao = \'nao_recebido\' THEN 1 ELSE 0 END),',
  '        SUM(CASE WHEN statusConciliacao = \'terceiro\' THEN 1 ELSE 0 END)',
  '      FROM conciliados_automatico',
  '      WHERE estabelecimentoId = ${estabelecimentoId}',
  '        AND COALESCE(numeroGuia, contaNumero) IN (${guiasEsc})',
  '      GROUP BY COALESCE(numeroGuia, contaNumero), numeroGuia, contaNumero, estabelecimentoId',
  '    `));',
  '  } catch (err: any) {',
  '    console.error(\'[atualizarFatoGuia] Erro:\', err.message);',
  '  }',
  '}',
  '',
];

const funcText = funcLines.join('\r\n') + '\r\n';

const newText = text.slice(0, insertPos) + funcText + text.slice(insertPos);
writeFileSync(FILE, newText, 'utf-8');

// Verify
const check = readFileSync(FILE, 'utf-8');
const hasFn = check.includes('async function atualizarFatoGuia');
const hasGlosar = check.includes('GLOSAR ITENS');
console.log('Function definition inserted:', hasFn);
console.log('GLOSAR section preserved:', hasGlosar);
if (!hasFn) {
  console.error('FAILED - function not found after write!');
  process.exit(1);
}
console.log('SUCCESS!');
