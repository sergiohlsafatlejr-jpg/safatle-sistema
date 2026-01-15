import { parsePDF } from "./server/parsers.ts";
import * as fs from "fs";

async function main() {
  const pdfBuffer = fs.readFileSync('saude-caixa-valid.pdf');
  console.log('PDF size:', pdfBuffer.length, 'bytes');
  
  console.log('Parsing PDF...');
  const result = await parsePDF(pdfBuffer);
  
  console.log('\nParse result:');
  console.log('- Success:', result.success);
  console.log('- Error:', result.error || 'none');
  console.log('- Procedimentos count:', result.procedimentos.length);
  
  if (result.procedimentos.length > 0) {
    console.log('\nPrimeiros 5 procedimentos:');
    for (const p of result.procedimentos.slice(0, 5)) {
      console.log(`\n- Código: ${p.codigo}`);
      console.log(`  Descrição: ${p.descricao || 'N/A'}`);
      console.log(`  Valor Total: ${p.valorTotal || 'N/A'}`);
      console.log(`  Valor Glosado: ${p.valorGlosado || 'N/A'}`);
      console.log(`  Motivo Glosa: ${p.motivoGlosa || 'N/A'}`);
      console.log(`  Paciente: ${p.pacienteNome || 'N/A'}`);
      console.log(`  Guia: ${p.guiaNumero || 'N/A'}`);
      console.log(`  Data: ${p.dataExecucao || 'N/A'}`);
    }
    
    // Count unique codes
    const uniqueCodes = new Set(result.procedimentos.map(p => p.codigo));
    console.log('\n\nCódigos únicos:', uniqueCodes.size);
    
    // Count with glosa
    const comGlosa = result.procedimentos.filter(p => p.valorGlosado && p.valorGlosado > 0);
    console.log('Com glosa:', comGlosa.length);
    
    // Total values
    const totalInformado = result.procedimentos.reduce((sum, p) => sum + (p.valorTotal || 0), 0);
    const totalGlosa = result.procedimentos.reduce((sum, p) => sum + (p.valorGlosado || 0), 0);
    console.log('Total Informado: R$', totalInformado.toFixed(2));
    console.log('Total Glosa: R$', totalGlosa.toFixed(2));
  }
}

main().catch(console.error);
