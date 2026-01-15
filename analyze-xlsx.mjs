import XLSX from 'xlsx';
import fs from 'fs';

const workbook = XLSX.readFile('demo-0278119.xlsx');

console.log('=== SHEETS ===');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== SHEET: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Mostrar cabeçalhos (primeira linha)
  console.log('\nCABEÇALHOS:');
  console.log(data[0]);
  
  // Mostrar algumas linhas de dados
  console.log('\nPRIMEIRAS 3 LINHAS DE DADOS:');
  for (let i = 1; i <= 3 && i < data.length; i++) {
    console.log(`Linha ${i}:`, data[i]);
  }
  
  // Encontrar linhas com GLOSADO
  console.log('\n=== LINHAS COM GLOSADO ===');
  let glosadoCount = 0;
  for (let i = 1; i < data.length && glosadoCount < 3; i++) {
    const row = data[i];
    const rowStr = JSON.stringify(row).toUpperCase();
    if (rowStr.includes('GLOSADO') || rowStr.includes('GLOSA')) {
      console.log(`Linha ${i}:`, row);
      glosadoCount++;
    }
  }
  
  console.log(`\nTotal de linhas: ${data.length}`);
}
