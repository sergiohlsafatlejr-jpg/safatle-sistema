import XLSX from 'xlsx';
import fs from 'fs';

const workbook = XLSX.readFile('./vivacom-sample.xls');
console.log('Planilhas:', workbook.SheetNames);

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Mostrar primeiras 5 linhas para ver cabeçalhos
console.log('\n=== Primeiras 5 linhas ===');
for (let i = 0; i < Math.min(5, data.length); i++) {
  console.log(`Linha ${i}:`, data[i]);
}

// Encontrar linha de cabeçalho (procurar por "codigo" ou similar)
let headerRowIndex = -1;
for (let i = 0; i < Math.min(20, data.length); i++) {
  const row = data[i];
  if (row && row.some(cell => String(cell).toLowerCase().includes('codigo') || String(cell).toLowerCase().includes('procedimento'))) {
    headerRowIndex = i;
    break;
  }
}

if (headerRowIndex >= 0) {
  console.log('\n=== Cabeçalhos encontrados na linha', headerRowIndex, '===');
  const headers = data[headerRowIndex];
  headers.forEach((h, i) => {
    console.log(`  ${i}: ${h}`);
  });
  
  // Mostrar uma linha de dados
  if (data[headerRowIndex + 1]) {
    console.log('\n=== Primeira linha de dados ===');
    const dataRow = data[headerRowIndex + 1];
    headers.forEach((h, i) => {
      console.log(`  ${h}: ${dataRow[i]}`);
    });
  }
}

// Buscar campos relacionados a glosa
console.log('\n=== Campos relacionados a glosa ===');
const allHeaders = data.slice(0, 20).flat().filter(Boolean);
const glosaCampos = allHeaders.filter(h => 
  String(h).toLowerCase().includes('glosa') || 
  String(h).toLowerCase().includes('erro') ||
  String(h).toLowerCase().includes('motivo')
);
console.log('Campos encontrados:', [...new Set(glosaCampos)]);
