// Script para testar o parser de PDF da Saúde Caixa
import { execSync } from 'child_process';
import fs from 'fs';

// Extrair texto do PDF
const pdfPath = './saude-caixa-valid.pdf';
const text = execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf-8' });

console.log("=== Texto extraído do PDF ===");
console.log(text.substring(0, 2000));
console.log("\n\n=== Análise do formato ===");

// Pattern atual do parser
const procPattern = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2})\s+(\d\.\d{2}\.\d{2}\.\d{3})\s+([^\d]+?)\s+(\d+[,.]\d{2})\s+(\d+)\s+(\d+[,.]\d{2})\s+(\d+[,.]\d{2})\s+(\d+[,.]\d{2})(?:\s+(\d+))?/g;

const lines = text.split('\n');
const fullText = lines.join(' ');

console.log("\nProcurando procedimentos com o pattern atual...");
let match;
let count = 0;
while ((match = procPattern.exec(fullText)) !== null) {
  count++;
  if (count <= 5) {
    console.log(`\nMatch ${count}:`);
    console.log(`  Data: ${match[1]}`);
    console.log(`  Tabela: ${match[2]}`);
    console.log(`  Código: ${match[3]}`);
    console.log(`  Descrição: ${match[4]}`);
    console.log(`  Valor Informado: ${match[5]}`);
    console.log(`  Quantidade: ${match[6]}`);
    console.log(`  Valor Processado: ${match[7]}`);
    console.log(`  Valor Liberado: ${match[8]}`);
    console.log(`  Valor Glosa: ${match[9]}`);
    console.log(`  Código Glosa: ${match[10] || 'N/A'}`);
  }
}
console.log(`\nTotal de procedimentos encontrados: ${count}`);

// Verificar quantos têm código de glosa
procPattern.lastIndex = 0;
let comGlosa = 0;
while ((match = procPattern.exec(fullText)) !== null) {
  if (match[10]) {
    comGlosa++;
  }
}
console.log(`Procedimentos com código de glosa: ${comGlosa}`);

// Testar pattern alternativo para linhas separadas
console.log("\n\n=== Testando pattern para linhas separadas ===");
const linePattern = /^(\d{2}\/\d{2}\/\d{4})$/;
const codePattern = /^(\d\.\d{2}\.\d{2}\.\d{3})$/;
const valuePattern = /^(\d+[,.]\d{2})$/;
const glosaCodePattern = /^(\d{4})$/;

let currentDate = null;
let currentCode = null;
let procedimentosAlt = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Detectar data
  if (linePattern.test(line)) {
    currentDate = line;
    continue;
  }
  
  // Detectar código TUSS
  if (codePattern.test(line)) {
    currentCode = line;
    // Próxima linha deve ser descrição
    const descricao = lines[i + 1]?.trim() || '';
    // Buscar valores nas próximas linhas
    let valores = [];
    let codigoGlosa = null;
    
    for (let j = i + 2; j < Math.min(i + 10, lines.length); j++) {
      const nextLine = lines[j].trim();
      if (valuePattern.test(nextLine)) {
        valores.push(nextLine);
      } else if (glosaCodePattern.test(nextLine) && !valuePattern.test(nextLine)) {
        codigoGlosa = nextLine;
        break;
      } else if (linePattern.test(nextLine) || codePattern.test(nextLine)) {
        break;
      }
    }
    
    if (valores.length >= 3) {
      procedimentosAlt.push({
        data: currentDate,
        codigo: currentCode,
        descricao,
        valorInformado: valores[0],
        quantidade: valores[1],
        valorProcessado: valores[2],
        valorLiberado: valores[3] || '0,00',
        valorGlosa: valores[4] || '0,00',
        codigoGlosa
      });
    }
  }
}

console.log(`Procedimentos encontrados (pattern alternativo): ${procedimentosAlt.length}`);
if (procedimentosAlt.length > 0) {
  console.log("\nPrimeiros 5 procedimentos:");
  for (const proc of procedimentosAlt.slice(0, 5)) {
    console.log(`  ${proc.data} | ${proc.codigo} | ${proc.descricao.substring(0, 30)} | Glosa: ${proc.codigoGlosa || 'N/A'}`);
  }
  
  const comGlosaAlt = procedimentosAlt.filter(p => p.codigoGlosa).length;
  console.log(`\nCom código de glosa: ${comGlosaAlt}`);
}
