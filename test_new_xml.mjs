import { parseXML } from './server/parsers.ts';
import fs from 'fs';

const xmlContent = fs.readFileSync('/home/ubuntu/upload/00000000000130086213_1ec17e35f2dea04f79f8dec13b5cfadf.xml');

const result = await parseXML(xmlContent);

console.log('=== RESULTADO DO PARSER ===');
console.log('Success:', result.success);
console.log('Total procedimentos:', result.procedimentos.length);

// Agrupar por data de execução
const porData = {};
result.procedimentos.forEach(p => {
  const data = p.dataExecucao ? p.dataExecucao.toISOString().split('T')[0] : 'Sem data';
  if (!porData[data]) porData[data] = [];
  porData[data].push(p);
});

console.log('\n=== PROCEDIMENTOS POR DATA ===');
Object.entries(porData).sort().forEach(([data, procs]) => {
  console.log(`\n📅 ${data}: ${procs.length} procedimento(s)`);
  procs.slice(0, 3).forEach((p, i) => {
    console.log(`   ${i+1}. ${p.codigo} - ${p.descricao?.substring(0, 40)}...`);
    console.log(`      Valor: R$ ${p.valorTotal || 0}`);
    console.log(`      Médico: ${p.nomeMedico || 'N/A'} (CRM: ${p.crmMedico || 'N/A'})`);
    console.log(`      Guia: ${p.guiaNumero || 'N/A'}`);
  });
  if (procs.length > 3) console.log(`   ... e mais ${procs.length - 3} procedimento(s)`);
});

// Estatísticas
const comMedico = result.procedimentos.filter(p => p.nomeMedico).length;
const comData = result.procedimentos.filter(p => p.dataExecucao).length;
console.log('\n=== ESTATÍSTICAS ===');
console.log('Com data de execução:', comData);
console.log('Com nome do médico:', comMedico);
console.log('Com CRM:', result.procedimentos.filter(p => p.crmMedico).length);
