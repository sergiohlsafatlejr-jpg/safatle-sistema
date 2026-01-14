import { parseXML, toProcedimentoInsert } from './server/parsers.ts';
import fs from 'fs';

const xmlContent = fs.readFileSync('/home/ubuntu/upload/00000000000130086213_1ec17e35f2dea04f79f8dec13b5cfadf.xml');

const result = await parseXML(xmlContent);

console.log('=== TESTE DO PARSER ATUALIZADO ===');
console.log('Total procedimentos:', result.procedimentos.length);

// Estatísticas
const comData = result.procedimentos.filter(p => p.dataExecucao).length;
const comMedico = result.procedimentos.filter(p => p.nomeMedico).length;
const comCRM = result.procedimentos.filter(p => p.crmMedico).length;

console.log('\n=== ESTATÍSTICAS ===');
console.log('Com data de execução:', comData, '/', result.procedimentos.length);
console.log('Com nome do médico:', comMedico, '/', result.procedimentos.length);
console.log('Com CRM:', comCRM, '/', result.procedimentos.length);

// Mostrar alguns exemplos
console.log('\n=== EXEMPLOS DE PROCEDIMENTOS ===');
result.procedimentos.slice(0, 5).forEach((p, i) => {
  console.log(`\n${i+1}. ${p.codigo} - ${p.descricao?.substring(0, 50)}...`);
  console.log(`   Data: ${p.dataExecucao ? p.dataExecucao.toLocaleDateString('pt-BR') : 'N/A'}`);
  console.log(`   Valor: R$ ${p.valorTotal || 0}`);
  console.log(`   Médico: ${p.nomeMedico || 'N/A'}`);
  console.log(`   CRM: ${p.crmMedico || 'N/A'}`);
  console.log(`   Guia: ${p.guiaNumero || 'N/A'}`);
});
