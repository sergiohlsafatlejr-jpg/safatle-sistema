// Script para testar o novo parser de PDF da Saúde Caixa
import { execSync } from 'child_process';
import fs from 'fs';

// Extrair texto do PDF
const pdfPath = './saude-caixa-valid.pdf';
const text = execSync(`pdftotext "${pdfPath}" -`, { encoding: 'utf-8' });

// Simular o parser corrigido
const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

console.log("=== Testando parser linha-por-linha ===\n");

const datePattern = /^(\d{2}\/\d{2}\/\d{4})$/;
const tablePattern = /^(\d{2})$/;
const codePattern = /^(\d\.\d{2}\.\d{2}\.\d{3})$/;
const valuePattern = /^(\d+[,.]\d{2})$/;
const glosaCodePattern = /^(\d{4})$/;

const procedimentos = [];

let i = 0;
while (i < lines.length) {
  // Look for date line
  const dateMatch = lines[i].match(datePattern);
  if (!dateMatch) {
    i++;
    continue;
  }
  
  const dataStr = dateMatch[1];
  
  // Next should be table number (22)
  if (i + 1 >= lines.length || !tablePattern.test(lines[i + 1])) {
    i++;
    continue;
  }
  const tabela = lines[i + 1];
  
  // Next should be TUSS code
  if (i + 2 >= lines.length || !codePattern.test(lines[i + 2])) {
    i++;
    continue;
  }
  const codigoComPontos = lines[i + 2];
  const codigo = codigoComPontos.replace(/\./g, '');
  
  // Next should be description (text line)
  if (i + 3 >= lines.length) {
    i++;
    continue;
  }
  const descricao = lines[i + 3];
  
  // Collect values from subsequent lines
  const valores = [];
  let codigoGlosa = undefined;
  let j = i + 4;
  
  while (j < lines.length && valores.length < 5) {
    const line = lines[j];
    
    // Check if it's a value
    if (valuePattern.test(line)) {
      const val = parseFloat(line.replace(',', '.'));
      valores.push(val);
      j++;
    }
    // Check if it's a quantity (single digit)
    else if (/^\d$/.test(line)) {
      valores.push(parseInt(line, 10));
      j++;
    }
    // Check if it's a glosa code (4 digits, not a value)
    else if (glosaCodePattern.test(line) && !valuePattern.test(line)) {
      codigoGlosa = line;
      j++;
      break;
    }
    // If it's a new date or code, stop
    else if (datePattern.test(line) || codePattern.test(line)) {
      break;
    }
    else {
      j++;
    }
  }
  
  // We need at least: valorInformado, quantidade, valorProcessado
  if (valores.length >= 3) {
    const valorInformado = valores[0];
    const quantidade = valores.length > 1 && valores[1] < 100 ? valores[1] : 1;
    const valorProcessado = valores.length > 2 ? valores[2] : valores[0];
    const valorLiberado = valores.length > 3 ? valores[3] : 0;
    const valorGlosaCapturado = valores.length > 4 ? valores[4] : 0;
    
    const valorGlosaCalculado = valorInformado - valorLiberado;
    const hasGlosa = codigoGlosa || valorGlosaCalculado > 0.01 || valorLiberado === 0;
    const valorGlosa = hasGlosa ? (valorGlosaCalculado > 0 ? valorGlosaCalculado : valorInformado) : 0;
    
    procedimentos.push({
      data: dataStr,
      codigo,
      descricao: descricao.substring(0, 40),
      valorInformado,
      quantidade,
      valorLiberado,
      valorGlosa,
      codigoGlosa,
      hasGlosa
    });
  }
  
  i = j;
}

console.log(`Total de procedimentos encontrados: ${procedimentos.length}`);
console.log(`Com glosa: ${procedimentos.filter(p => p.hasGlosa).length}`);
console.log(`Com código de glosa: ${procedimentos.filter(p => p.codigoGlosa).length}\n`);

console.log("Primeiros 10 procedimentos:");
for (const proc of procedimentos.slice(0, 10)) {
  console.log(`  ${proc.data} | ${proc.codigo} | ${proc.descricao}`);
  console.log(`    Valor: ${proc.valorInformado} | Liberado: ${proc.valorLiberado} | Glosa: ${proc.valorGlosa} | Código: ${proc.codigoGlosa || 'N/A'}`);
}
