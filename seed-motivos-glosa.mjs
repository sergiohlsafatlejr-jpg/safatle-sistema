#!/usr/bin/env node
/**
 * Script de seed para popular a tabela motivosGlosa com os códigos TISS oficiais.
 * Fonte: Tabela 38 - TabelaDominioANS.pdf (ANS)
 * Total: 527 códigos
 * 
 * Uso: node seed-motivos-glosa.mjs
 */
import fs from 'fs';
import mysql from 'mysql2/promise';

// Ler o arquivo TSV com os códigos
const tsvPath = new URL('./glosas_tiss_completa.tsv', import.meta.url).pathname;
const tsvContent = fs.readFileSync(tsvPath, 'utf-8');
const lines = tsvContent.trim().split('\n').slice(1); // Skip header

// Mapear códigos para grupos
function getGrupo(codigo) {
  const num = parseInt(codigo);
  if (num >= 1001 && num <= 1099) return "Beneficiário";
  if (num >= 1101 && num <= 1199) return "Guia/Autorização";
  if (num >= 1201 && num <= 1299) return "Prestador/Profissional";
  if (num >= 1301 && num <= 1399) return "Guia/Documentação";
  if (num >= 1401 && num <= 1499) return "Honorários";
  if (num >= 1501 && num <= 1599) return "Valores/Pagamento";
  if (num >= 1601 && num <= 1699) return "Procedimento/Diagnóstico";
  if (num >= 1701 && num <= 1799) return "Procedimento/Cobrança";
  if (num >= 1801 && num <= 1899) return "Procedimento/Autorização";
  if (num >= 1901 && num <= 1999) return "Acomodação/Diárias";
  if (num >= 2001 && num <= 2099) return "Material";
  if (num >= 2101 && num <= 2199) return "Medicamento";
  if (num >= 2201 && num <= 2299) return "OPME";
  if (num >= 2301 && num <= 2399) return "Gases Medicinais";
  if (num >= 2401 && num <= 2499) return "Taxa/Aluguel";
  if (num >= 2501 && num <= 2599) return "Pacote";
  if (num >= 2601 && num <= 2699) return "Hemoterapia";
  if (num >= 2701 && num <= 2799) return "Nutrição";
  if (num >= 2801 && num <= 2899) return "Quimioterapia";
  if (num >= 2901 && num <= 2999) return "Radioterapia";
  if (num >= 3001 && num <= 3099) return "Odontologia";
  if (num >= 3101 && num <= 3199) return "Outros";
  if (num >= 5001 && num <= 5099) return "Mensagem Eletrônica/Validação";
  return "Outros";
}

// Gerar descrição simplificada (primeiros 200 chars)
function getDescricaoSimplificada(descricao) {
  if (descricao.length <= 200) return descricao;
  return descricao.substring(0, 197) + "...";
}

// Parse entries
const entries = lines.map(line => {
  const [codigo, ...descParts] = line.split('\t');
  const descricao = descParts.join('\t');
  return {
    codigo: codigo.trim(),
    grupo: getGrupo(codigo.trim()),
    descricao: descricao.trim(),
    descricaoSimplificada: getDescricaoSimplificada(descricao.trim()),
    tipoOrigem: 'tiss',
    ativo: 'sim',
  };
});

console.log(`Total de registros para inserir: ${entries.length}`);

// Connect to database
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL não definida. Defina a variável de ambiente.');
  process.exit(1);
}

const connection = await mysql.createConnection(dbUrl);

try {
  // Check current count
  const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM motivosGlosa');
  console.log(`Registros atuais na tabela: ${countResult[0].total}`);

  // Delete existing TISS records (keep personalized ones)
  const [deleteResult] = await connection.execute("DELETE FROM motivosGlosa WHERE tipoOrigem = 'tiss'");
  console.log(`Registros TISS removidos: ${deleteResult.affectedRows}`);

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const values = batch.flatMap(e => [
      e.codigo, e.grupo, e.descricao, e.descricaoSimplificada, e.tipoOrigem, e.ativo
    ]);

    await connection.execute(
      `INSERT INTO motivosGlosa (codigo, grupo, descricao, descricaoSimplificada, tipoOrigem, ativo) VALUES ${placeholders}`,
      values
    );
    inserted += batch.length;
    if (inserted % 100 === 0 || inserted === entries.length) {
      console.log(`  Inseridos: ${inserted}/${entries.length}`);
    }
  }

  // Verify
  const [finalCount] = await connection.execute('SELECT COUNT(*) as total FROM motivosGlosa');
  console.log(`\nTotal final na tabela: ${finalCount[0].total}`);

  // Sample verification
  const [sample] = await connection.execute(
    "SELECT codigo, grupo, descricao FROM motivosGlosa WHERE codigo IN ('1319', '2408', '1001') ORDER BY codigo"
  );
  console.log('\nAmostra de verificação:');
  for (const row of sample) {
    console.log(`  ${row.codigo} [${row.grupo}]: ${row.descricao.substring(0, 80)}`);
  }

} finally {
  await connection.end();
}

console.log('\nSeed concluído com sucesso!');
