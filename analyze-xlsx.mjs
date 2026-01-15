import XLSX from 'xlsx';

const workbook = XLSX.readFile('./demonstrativo-0278119.xlsx');
console.log('Planilhas:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Mostrar cabeçalhos (primeira linha)
  if (data.length > 0) {
    console.log('Cabeçalhos:', data[0]);
    
    // Mostrar primeiras 3 linhas de dados
    console.log('\nPrimeiras linhas:');
    for (let i = 1; i < Math.min(4, data.length); i++) {
      console.log(`Linha ${i}:`, data[i]);
    }
    
    // Buscar colunas que contenham "situação", "ERRO", "TISS", "glosa"
    const headers = data[0] || [];
    const relevantCols = headers.map((h, idx) => ({ idx, header: String(h || '').toLowerCase() }))
      .filter(c => c.header.includes('situa') || c.header.includes('erro') || c.header.includes('tiss') || c.header.includes('glosa') || c.header.includes('pago') || c.header.includes('motivo'));
    
    console.log('\nColunas relevantes encontradas:', relevantCols.map(c => `${c.idx}: ${headers[c.idx]}`));
  }
}
