import { parseXML, toProcedimentoInsert } from './server/parsers.ts';
import fs from 'fs';

const xmlContent = fs.readFileSync('/home/ubuntu/upload/00000000000120086037_e6668ec7eeaf917cbee6950066185f47.xml');

const result = await parseXML(xmlContent);

console.log('=== RESULTADO DO PARSER ===');
console.log('Success:', result.success);
console.log('Total procedimentos:', result.procedimentos.length);

// Mostrar resumo dos dados
const comValor = result.procedimentos.filter(p => p.valorTotal);
const comMedico = result.procedimentos.filter(p => p.nomeMedico);
const comGuia = result.procedimentos.filter(p => p.guiaNumero);

console.log('\n=== ESTATÍSTICAS ===');
console.log('Com valor total:', comValor.length);
console.log('Com nome do médico:', comMedico.length);
console.log('Com número da guia:', comGuia.length);

console.log('\n=== AMOSTRA DE DADOS ===');
result.procedimentos.slice(0, 3).forEach((p, i) => {
  console.log(`\n${i + 1}. ${p.codigo} - ${p.descricao}`);
  console.log(`   Valor: R$ ${p.valorUnitario || 0} x ${p.quantidade || 1} = R$ ${p.valorTotal || 0}`);
  console.log(`   Médico: ${p.nomeMedico || 'N/A'} (CRM: ${p.crmMedico || 'N/A'})`);
  console.log(`   Guia: ${p.guiaNumero || 'N/A'}`);
});

// Calcular valor total
const valorTotal = result.procedimentos.reduce((acc, p) => acc + (p.valorTotal || 0), 0);
console.log(`\n=== VALOR TOTAL: R$ ${valorTotal.toFixed(2)} ===`);
