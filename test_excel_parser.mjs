import * as XLSX from 'xlsx';
import fs from 'fs';

const buffer = fs.readFileSync('/home/ubuntu/demo_psi.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

console.log('=== SHEETS ===');
console.log(workbook.SheetNames);

const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const rows = XLSX.utils.sheet_to_json(worksheet, {
  defval: null,
  raw: false,
});

console.log('\n=== TOTAL ROWS ===');
console.log(rows.length);

if (rows.length > 0) {
  console.log('\n=== COLUNAS ===');
  const cols = Object.keys(rows[0]);
  cols.forEach(c => console.log(`  "${c}"`));
  
  console.log('\n=== PRIMEIRA LINHA ===');
  console.log(JSON.stringify(rows[0], null, 2));
  
  console.log('\n=== SEGUNDA LINHA ===');
  if (rows.length > 1) console.log(JSON.stringify(rows[1], null, 2));
  
  // Verificar se tem Número Guia, Beneficiário ou Item
  const hasGuia = cols.some(c => c.includes('Guia'));
  const hasBenef = cols.some(c => c.includes('Benefi'));
  const hasItem = cols.some(c => c.includes('Item'));
  console.log('\n=== CAMPOS CHAVE ===');
  console.log('Tem Guia:', hasGuia);
  console.log('Tem Beneficiário:', hasBenef);
  console.log('Tem Item:', hasItem);
  
  // Contar linhas com dados relevantes
  let validRows = 0;
  for (const row of rows) {
    const hasData = row['Número Guia'] || row['Beneficiário'] || row['Item'];
    if (hasData) validRows++;
  }
  console.log('Linhas válidas (com Guia/Beneficiário/Item):', validRows);
}
