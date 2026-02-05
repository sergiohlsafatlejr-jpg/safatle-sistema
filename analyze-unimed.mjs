import XLSX from 'xlsx';

const workbook = XLSX.readFile('unimed-demo.xlsx');
console.log('Planilhas:', workbook.SheetNames);

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Mostrar cabeçalhos (primeira linha)
console.log('\nCabeçalhos:');
const headers = data[0];
headers.forEach((h, i) => console.log(`  ${i}: ${h}`));

// Procurar colunas relacionadas a glosa
console.log('\n\nColunas que podem conter glosa:');
headers.forEach((h, i) => {
  if (h && (h.toString().toLowerCase().includes('glosa') || 
            h.toString().toLowerCase().includes('glos') ||
            h.toString().toLowerCase().includes('erro') ||
            h.toString().toLowerCase().includes('situacao') ||
            h.toString().toLowerCase().includes('situação'))) {
    console.log(`  ${i}: ${h}`);
    // Mostrar alguns valores dessa coluna
    console.log('    Valores:');
    for (let j = 1; j <= 10 && j < data.length; j++) {
      if (data[j][i] !== undefined && data[j][i] !== null && data[j][i] !== '') {
        console.log(`      ${data[j][i]}`);
      }
    }
  }
});

// Mostrar primeira linha de dados completa
console.log('\nPrimeira linha de dados completa:');
if (data[1]) {
  data[1].forEach((v, j) => {
    if (v !== undefined && v !== null && v !== '') {
      console.log(`  ${headers[j] || j}: ${v}`);
    }
  });
}
