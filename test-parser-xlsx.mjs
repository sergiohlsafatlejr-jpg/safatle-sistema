import { parseExcel } from './server/parsers.ts';
import fs from 'fs';

const content = fs.readFileSync('./demonstrativo-0278119.xlsx');
const result = await parseExcel(content);

console.log('Sucesso:', result.success);
console.log('Total de procedimentos:', result.procedimentos.length);

// Filtrar itens glosados
const glosados = result.procedimentos.filter(p => {
  const situacao = String(p.dadosExtras?.situacaoItem || '').toUpperCase();
  return situacao.includes('GLOS');
});

console.log('Itens glosados:', glosados.length);

// Mostrar primeiros 5 itens glosados
console.log('\nPrimeiros itens glosados:');
glosados.slice(0, 5).forEach((p, i) => {
  console.log(`\n--- Item ${i+1} ---`);
  console.log('Código:', p.codigo);
  console.log('Descrição:', p.descricao);
  console.log('Valor Total:', p.valorTotal);
  console.log('Valor Glosado:', p.valorGlosado);
  console.log('Motivo Glosa:', p.motivoGlosa);
  console.log('Situação:', p.dadosExtras?.situacaoItem);
  console.log('Paciente:', p.pacienteNome);
  console.log('Guia:', p.guiaNumero);
});

// Estatísticas de motivos de glosa
const motivosUnicos = [...new Set(glosados.filter(p => p.motivoGlosa).map(p => p.motivoGlosa))];
console.log('\nMotivos de glosa únicos encontrados:', motivosUnicos.length);
console.log('Exemplos:', motivosUnicos.slice(0, 10));
