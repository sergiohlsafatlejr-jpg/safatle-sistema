import { readFileSync } from 'fs';
const content = readFileSync('server/faturamentoUnificadoService.ts', 'utf-8');
const lines = content.split('\n');
for (let i = 1710; i <= 1720; i++) {
  const line = lines[i] || '';
  const clean = line.replace(/\r/g, '');
  console.log(`${i+1}: [${clean}]`);
}
