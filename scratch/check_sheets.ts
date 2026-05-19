import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'C:/Users/sergi/Downloads/safatle - folha pagamento 2026.xlsx';
try {
  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: 'buffer' });
  console.log('Sheet Names:', workbook.SheetNames);
} catch (e) {
  console.log('Error reading file:', e);
}
