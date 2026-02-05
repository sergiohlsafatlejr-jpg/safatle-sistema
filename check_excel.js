const fs = require('fs');
const XLSX = require('xlsx');

console.log('Verificando campos longos...');
const buffer = fs.readFileSync('/tmp/test_excel2.xlsx');
const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

// Verificar o tamanho máximo de cada campo
const maxLengths = {};
for (const row of rows) {
  for (const [key, value] of Object.entries(row)) {
    if (value) {
      const len = String(value).length;
      if (!maxLengths[key] || len > maxLengths[key]) {
        maxLengths[key] = len;
      }
    }
  }
}

// Ordenar por tamanho e mostrar os maiores
const sorted = Object.entries(maxLengths).sort((a, b) => b[1] - a[1]);
console.log('\nCampos com valores mais longos:');
for (const [key, len] of sorted.slice(0, 15)) {
  console.log(`  ${key}: ${len} caracteres`);
}
