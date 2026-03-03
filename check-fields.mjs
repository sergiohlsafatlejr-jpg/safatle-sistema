import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// Sample recebimentos_excel with nome_beneficiario (paciente)
const [sample] = await conn.query(`SELECT nome_beneficiario, item_desc, tipo_lancamento, tipo_item, codigo_glosa, valor_glosa, item FROM recebimentos_excel WHERE nome_beneficiario IS NOT NULL AND nome_beneficiario != '' LIMIT 5`);
console.log('=== Sample recebimentos_excel ===');
console.log(JSON.stringify(sample, null, 2));

// Sample faturamento_unificado with descricao
const [sample2] = await conn.query(`SELECT descricaoItem, pacienteNome, tipoItem FROM faturamento_unificado WHERE descricaoItem IS NOT NULL AND descricaoItem != '' LIMIT 3`);
console.log('\n=== Sample faturamento_unificado with descricao ===');
console.log(JSON.stringify(sample2, null, 2));

// Check integ_faturado for paciente name
const [sample3] = await conn.query(`SELECT nomepac, descdisco FROM integ_faturado WHERE nomepac IS NOT NULL AND nomepac != '' LIMIT 3`);
console.log('\n=== Sample integ_faturado with nomepac ===');
console.log(JSON.stringify(sample3, null, 2));

// Check conciliados_automatico sample
const [sample4] = await conn.query(`SELECT pacienteNome, descricaoItem, statusConciliacao, valorGlosa FROM conciliados_automatico WHERE descricaoItem IS NOT NULL AND descricaoItem != '' LIMIT 3`);
console.log('\n=== Sample conciliados_automatico with descricao ===');
console.log(JSON.stringify(sample4, null, 2));

// Check how many conciliados have pacienteNome filled
const [counts] = await conn.query(`SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN pacienteNome IS NOT NULL AND pacienteNome != '' THEN 1 ELSE 0 END) as comPaciente,
  SUM(CASE WHEN descricaoItem IS NOT NULL AND descricaoItem != '' THEN 1 ELSE 0 END) as comDescricao
FROM conciliados_automatico`);
console.log('\n=== conciliados_automatico counts ===');
console.log(JSON.stringify(counts, null, 2));

// Check recebimentos_excel for motivo_glosa or similar
const [cols] = await conn.query(`SHOW COLUMNS FROM recebimentos_excel`);
console.log('\n=== recebimentos_excel glosa-related columns ===');
for (const c of cols) {
  if (/glosa|motivo|situacao|erro/i.test(c.Field)) {
    console.log(c.Field, '-', c.Type);
  }
}

// Sample with glosa data
const [sample5] = await conn.query(`SELECT nome_beneficiario, item, item_desc, tipo_lancamento, codigo_glosa, valor_glosa FROM recebimentos_excel WHERE valor_glosa > 0 LIMIT 5`);
console.log('\n=== Sample recebimentos_excel with glosa ===');
console.log(JSON.stringify(sample5, null, 2));

await conn.end();
