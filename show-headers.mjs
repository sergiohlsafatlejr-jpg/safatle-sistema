import XLSX from 'xlsx';

const workbook = XLSX.readFile('demo-0278119.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('=== CABEÇALHOS (índice: nome) ===');
const headers = data[0];
headers.forEach((h, i) => {
  console.log(`${i}: ${h}`);
});
