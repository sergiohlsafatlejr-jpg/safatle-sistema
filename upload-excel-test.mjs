import * as fs from 'fs';
import { parseExcel, toProcedimentoInsert } from './server/parsers.ts';

// Read the Excel file
const buffer = fs.readFileSync('demonstrativo-0278119.xlsx');

// Parse it
const result = await parseExcel(buffer);

console.log('=== Resultado do Parser ===');
console.log('Sucesso:', result.success);
console.log('Total de procedimentos:', result.procedimentos.length);
console.log('Erro:', result.error);

if (result.procedimentos.length > 0) {
  console.log('\n=== Amostra de 5 procedimentos ===');
  for (let i = 0; i < Math.min(5, result.procedimentos.length); i++) {
    const p = result.procedimentos[i];
    console.log(`\n[${i + 1}] Código: ${p.codigo}`);
    console.log(`    Descrição: ${p.descricao?.substring(0, 50)}...`);
    console.log(`    Quantidade: ${p.quantidade}`);
    console.log(`    Valor Total: R$ ${p.valorTotal?.toFixed(2)}`);
    console.log(`    Data Execução: ${p.dataExecucao?.toISOString().split('T')[0]}`);
    console.log(`    Paciente: ${p.pacienteNome}`);
    console.log(`    Guia: ${p.guiaNumero}`);
  }
  
  // Estatísticas
  const totalValor = result.procedimentos.reduce((sum, p) => sum + (p.valorTotal || 0), 0);
  const comPaciente = result.procedimentos.filter(p => p.pacienteNome).length;
  const comGuia = result.procedimentos.filter(p => p.guiaNumero).length;
  const comData = result.procedimentos.filter(p => p.dataExecucao).length;
  
  console.log('\n=== Estatísticas ===');
  console.log(`Total de procedimentos: ${result.procedimentos.length}`);
  console.log(`Valor total: R$ ${totalValor.toFixed(2)}`);
  console.log(`Com paciente: ${comPaciente}`);
  console.log(`Com guia: ${comGuia}`);
  console.log(`Com data de execução: ${comData}`);
}
