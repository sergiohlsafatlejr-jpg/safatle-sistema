import { parseXML } from './server/parsers.ts';
import fs from 'fs';

const xmlContent = fs.readFileSync('/home/ubuntu/upload/00000000000120086037_e6668ec7eeaf917cbee6950066185f47.xml');

const result = await parseXML(xmlContent);

console.log('Success:', result.success);
console.log('Total procedimentos:', result.procedimentos.length);
console.log('\nPrimeiros 5 procedimentos:');
result.procedimentos.slice(0, 5).forEach((p, i) => {
  console.log(`\n${i + 1}. Código: ${p.codigo}`);
  console.log(`   Descrição: ${p.descricao}`);
  console.log(`   Valor Unitário: ${p.valorUnitario}`);
  console.log(`   Valor Total: ${p.valorTotal}`);
  console.log(`   Médico: ${p.nomeMedico}`);
  console.log(`   CRM: ${p.crmMedico}`);
  console.log(`   Guia: ${p.guiaNumero}`);
});
