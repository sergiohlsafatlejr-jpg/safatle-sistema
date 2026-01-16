import { parseFile } from './server/parsers.ts';
import fs from 'fs';

const pdfPath = './saude-caixa-valid.pdf';
if (!fs.existsSync(pdfPath)) {
  console.log('Arquivo PDF não encontrado');
  process.exit(1);
}

const content = fs.readFileSync(pdfPath);
const result = await parseFile(content, 'saude-caixa.pdf');

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
