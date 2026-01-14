import { parseExcel } from './server/parsers.ts';
import * as fs from 'fs';

const buffer = fs.readFileSync('demonstrativo-0278119.xlsx');
const result = await parseExcel(buffer);

console.log('Sucesso:', result.success);
console.log('Procedimentos encontrados:', result.procedimentos.length);
console.log('Erro:', result.error);

if (result.procedimentos.length > 0) {
  console.log('\nPrimeiro procedimento:', JSON.stringify(result.procedimentos[0], null, 2));
} else {
  console.log('\nNenhum procedimento extraído');
}
