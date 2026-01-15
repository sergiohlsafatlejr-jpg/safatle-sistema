import XLSX from 'xlsx';
import fs from 'fs';

const workbook = XLSX.readFile('demo-0278119.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// Normalizar chave
const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

// Mostrar chaves normalizadas da primeira linha
console.log('=== CHAVES NORMALIZADAS ===');
const firstRow = data[0];
for (const key of Object.keys(firstRow)) {
  console.log(`"${key}" -> "${normalizeKey(key)}"`);
}

// Contar itens glosados
let glosados = 0;
let pagos = 0;
for (const row of data) {
  const situacao = (row['Situação Item'] || '').toString().toUpperCase();
  if (situacao.includes('GLOS')) glosados++;
  if (situacao.includes('PAGO')) pagos++;
}
console.log(`\nTotal: ${data.length} | Pagos: ${pagos} | Glosados: ${glosados}`);

// Mostrar um item glosado
console.log('\n=== EXEMPLO DE ITEM GLOSADO ===');
const glosado = data.find(r => (r['Situação Item'] || '').toString().toUpperCase().includes('GLOS'));
if (glosado) {
  console.log('Código (Item):', glosado['Item']);
  console.log('Descrição (Item Desc):', glosado['Item Desc']);
  console.log('Valor Pagamento:', glosado['Valor Pagamento']);
  console.log('Erro TISS:', glosado['Erro TISS']);
  console.log('Situação Item:', glosado['Situação Item']);
  console.log('Nome Beneficiário:', glosado['Nome Beneficiário']);
  console.log('Número Guia:', glosado['Número Guia']);
}
