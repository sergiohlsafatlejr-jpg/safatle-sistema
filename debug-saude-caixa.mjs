import { parseFile } from './server/parsers.ts';
import fs from 'fs';

const content = fs.readFileSync('./saude-caixa-valid.pdf');
const result = await parseFile(content, 'saude-caixa.pdf');

// Mostrar detalhes dos primeiros 10 procedimentos
console.log('Detalhes dos procedimentos:');
result.procedimentos.slice(0, 10).forEach((p, i) => {
  const extras = p.dadosExtras || {};
  console.log(`\n${i+1}. ${p.codigo} - ${p.descricao?.substring(0, 40)}`);
  console.log(`   Valor Informado: ${extras.valorInformado}`);
  console.log(`   Valor Processado: ${extras.valorProcessado}`);
  console.log(`   Valor Liberado: ${extras.valorLiberado}`);
  console.log(`   Valor Glosa Calculado: ${extras.valorGlosaCalculado}`);
  console.log(`   Código Glosa: ${extras.codigoGlosa || 'N/A'}`);
  console.log(`   Motivo: ${p.motivoGlosa || 'N/A'}`);
  console.log(`   Valor Glosado Final: ${p.valorGlosado || 0}`);
});
