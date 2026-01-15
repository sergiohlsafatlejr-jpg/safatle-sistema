import fs from 'fs';
import { parseExcel } from './server/parsers.ts';

const content = fs.readFileSync('demo-0278119.xlsx');
const result = await parseExcel(content);

console.log('Success:', result.success);
console.log('Total procedimentos:', result.procedimentos.length);

// Contar glosados
const glosados = result.procedimentos.filter(p => p.valorGlosado && p.valorGlosado > 0);
console.log('Com valor glosado:', glosados.length);

// Contar com motivo de glosa
const comMotivo = result.procedimentos.filter(p => p.motivoGlosa);
console.log('Com motivo de glosa:', comMotivo.length);

// Mostrar exemplo de glosado
if (glosados.length > 0) {
  console.log('\n=== EXEMPLO DE ITEM GLOSADO ===');
  const exemplo = glosados.find(g => g.motivoGlosa) || glosados[0];
  console.log('Código:', exemplo.codigo);
  console.log('Descrição:', exemplo.descricao);
  console.log('Valor Total:', exemplo.valorTotal);
  console.log('Valor Glosado:', exemplo.valorGlosado);
  console.log('Motivo Glosa:', exemplo.motivoGlosa);
  console.log('Paciente:', exemplo.pacienteNome);
  console.log('Guia:', exemplo.guiaNumero);
  console.log('Data Execução:', exemplo.dataExecucao);
}

// Mostrar totais de valores
const totalValor = result.procedimentos.reduce((sum, p) => sum + (p.valorTotal || 0), 0);
const totalGlosado = result.procedimentos.reduce((sum, p) => sum + (p.valorGlosado || 0), 0);
console.log('\n=== TOTAIS ===');
console.log('Valor Total:', totalValor.toFixed(2));
console.log('Valor Glosado:', totalGlosado.toFixed(2));
