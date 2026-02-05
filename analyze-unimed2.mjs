import XLSX from 'xlsx';

const workbook = XLSX.readFile('unimed-demo.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const headers = data[0];
const situacaoIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('situação item'));
const erroIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('erro tiss'));
const valorIdx = headers.findIndex(h => h && h.toString().toLowerCase().includes('valor pagamento'));

console.log('Índices encontrados:');
console.log(`  Situação Item: ${situacaoIdx}`);
console.log(`  Erro TISS: ${erroIdx}`);
console.log(`  Valor Pagamento: ${valorIdx}`);

// Contar por situação
const situacoes = {};
const erros = {};
let totalPago = 0;
let totalGlosado = 0;

for (let i = 1; i < data.length; i++) {
  const situacao = data[i][situacaoIdx] || 'VAZIO';
  const erro = data[i][erroIdx] || 'VAZIO';
  const valor = parseFloat(data[i][valorIdx]) || 0;
  
  situacoes[situacao] = (situacoes[situacao] || 0) + 1;
  if (erro !== 'VAZIO') {
    erros[erro] = (erros[erro] || 0) + 1;
  }
  
  if (situacao === 'PAGO') {
    totalPago += valor;
  } else if (situacao === 'GLOSADO' || situacao.includes('GLOS')) {
    totalGlosado += valor;
  }
}

console.log('\nDistribuição por Situação:');
Object.entries(situacoes).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log('\nErros TISS encontrados:');
Object.entries(erros).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

console.log(`\nTotal Pago: R$ ${totalPago.toFixed(2)}`);
console.log(`Total Glosado: R$ ${totalGlosado.toFixed(2)}`);
console.log(`Total de linhas: ${data.length - 1}`);
