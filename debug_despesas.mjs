import { parseXML } from './server/parsers.ts';
import https from 'https';
import http from 'http';

const url = process.argv[2] || 'https://d2xsxph8kpxj0f.cloudfront.net/310519663295218967/98MRdVE9Uf2ZRMz25bPSye/arquivos/1/FJ8Y5zTLfypq8jvijOhC7-00000000000000086037_b59442f24d53d4831d1e5d260a28d753.xml';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Baixando XML...');
  const xmlContent = await fetchUrl(url);
  console.log('XML tamanho:', xmlContent.length, 'bytes');
  
  // Mostrar trecho com outrasDespesas
  const idx = xmlContent.indexOf('outrasDespesas');
  if (idx > -1) {
    console.log('\n=== Trecho outrasDespesas no XML (primeiros 800 chars) ===');
    console.log(xmlContent.substring(idx - 50, idx + 800));
  } else {
    console.log('\nNão encontrou outrasDespesas no XML');
  }
  
  // Parsear
  console.log('\n=== Resultado do Parser ===');
  const result = await parseXML(xmlContent);
  
  if (!result.success) {
    console.log('ERRO:', result.error);
    return;
  }
  
  console.log('Total procedimentos:', result.procedimentos.length);
  
  // Agrupar por tipoDespesa
  const tipos = {};
  for (const p of result.procedimentos) {
    const tipo = p.tipoDespesa || 'undefined';
    tipos[tipo] = (tipos[tipo] || 0) + 1;
  }
  console.log('\nAgrupamento por tipoDespesa:');
  for (const [tipo, count] of Object.entries(tipos)) {
    console.log(`  ${tipo}: ${count}`);
  }
  
  // Mostrar amostra de despesas
  const despesas = result.procedimentos.filter(p => p.tipoDespesa && p.tipoDespesa !== 'procedimento');
  console.log('\nAmostra de despesas (primeiros 5):');
  for (const d of despesas.slice(0, 5)) {
    console.log(`  tipo=${d.tipoDespesa} | codigo=${d.codigo} | desc=${d.descricao} | codigoDespesa=${d.codigoDespesa}`);
  }
  
  // Mostrar amostra de procedimentos sem tipoDespesa
  const semTipo = result.procedimentos.filter(p => !p.tipoDespesa);
  console.log('\nProcedimentos sem tipoDespesa:', semTipo.length);
  for (const d of semTipo.slice(0, 3)) {
    console.log(`  codigo=${d.codigo} | desc=${d.descricao}`);
  }
}

main().catch(console.error);
