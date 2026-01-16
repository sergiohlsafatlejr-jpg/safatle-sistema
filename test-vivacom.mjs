import fs from 'fs';
import { parseFile } from './server/parsers.ts';

const content = fs.readFileSync('./vivacom-sample.xls');
const result = await parseFile(content, 'vivacom.xls');

console.log('Total procedimentos:', result.procedimentos.length);

// Contar itens com glosa
const comGlosa = result.procedimentos.filter(p => p.valorGlosado && p.valorGlosado > 0);
console.log('Com valor glosado:', comGlosa.length);

// Mostrar alguns exemplos
console.log('\nExemplos de itens com glosa:');
comGlosa.slice(0, 5).forEach(p => {
  console.log(`  ${p.codigo} - ${p.descricao?.substring(0, 30)} - Glosa: ${p.valorGlosado} - Motivo: ${p.motivoGlosa}`);
});

// Mostrar alguns itens sem glosa
const semGlosa = result.procedimentos.filter(p => !p.valorGlosado || p.valorGlosado === 0);
console.log('\nExemplos de itens sem glosa:');
semGlosa.slice(0, 5).forEach(p => {
  console.log(`  ${p.codigo} - ${p.descricao?.substring(0, 30)} - Valor: ${p.valorTotal}`);
});

// Verificar campos extras
console.log('\n=== Campos extras do primeiro item ===');
const first = result.procedimentos[0];
if (first) {
  console.log('Código:', first.codigo);
  console.log('Descrição:', first.descricao);
  console.log('Paciente:', first.pacienteNome);
  console.log('Guia:', first.guiaNumero);
  console.log('Valor Total:', first.valorTotal);
  console.log('Valor Glosado:', first.valorGlosado);
  console.log('Motivo Glosa:', first.motivoGlosa);
  console.log('Dados Extras:', JSON.stringify(first.dadosExtras, null, 2));
}
