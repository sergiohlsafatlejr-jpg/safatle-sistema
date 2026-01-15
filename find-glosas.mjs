import XLSX from 'xlsx';

const workbook = XLSX.readFile('./demonstrativo-0278119.xlsx');
const sheet = workbook.Sheets['DemonstrativoPagamento'];
const data = XLSX.utils.sheet_to_json(sheet);

// Filtrar itens glosados
const glosados = data.filter(row => {
  const situacao = String(row['Situação Item'] || '').toUpperCase();
  return situacao.includes('GLOS') || situacao.includes('RECUSADO') || situacao.includes('NEGADO');
});

console.log(`Total de linhas: ${data.length}`);
console.log(`Itens glosados encontrados: ${glosados.length}`);

// Mostrar primeiros 5 itens glosados
console.log('\nPrimeiros itens glosados:');
glosados.slice(0, 5).forEach((row, i) => {
  console.log(`\n--- Item ${i+1} ---`);
  console.log('Situação:', row['Situação Item']);
  console.log('Erro TISS:', row['Erro TISS']);
  console.log('Item:', row['Item']);
  console.log('Descrição:', row['Item Desc']);
  console.log('Valor:', row['Valor Pagamento']);
  console.log('Beneficiário:', row['Nome Beneficiário']);
  console.log('Guia:', row['Número Guia']);
});

// Listar todas as situações únicas
const situacoes = [...new Set(data.map(r => r['Situação Item']))];
console.log('\nSituações encontradas:', situacoes);

// Listar erros TISS únicos
const erros = [...new Set(data.filter(r => r['Erro TISS']).map(r => r['Erro TISS']))];
console.log('\nErros TISS encontrados:', erros.slice(0, 20));
