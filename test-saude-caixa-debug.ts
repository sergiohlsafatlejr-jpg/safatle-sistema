import { parsePDF } from "./server/parsers";
import * as fs from "fs";

async function test() {
  const buffer = fs.readFileSync("./saude-caixa-valid.pdf");
  const result = await parsePDF(buffer);
  
  console.log("Total procedimentos:", result.procedimentos.length);
  
  // Count items with glosa
  const comGlosa = result.procedimentos.filter(p => p.valorGlosado && p.valorGlosado > 0);
  const comMotivo = result.procedimentos.filter(p => p.motivoGlosa);
  
  console.log("Com valor glosado:", comGlosa.length);
  console.log("Com motivo glosa:", comMotivo.length);
  
  // Show first 5 items with glosa
  console.log("\nPrimeiros 5 itens com glosa:");
  comGlosa.slice(0, 5).forEach(p => {
    console.log(`  ${p.codigo} - ${p.descricao?.substring(0, 40)}`);
    console.log(`    valorTotal: ${p.valorTotal}, valorGlosado: ${p.valorGlosado}, motivo: ${p.motivoGlosa}`);
    console.log(`    dadosExtras:`, JSON.stringify(p.dadosExtras, null, 2).substring(0, 200));
  });
  
  // Show first 5 items without glosa
  const semGlosa = result.procedimentos.filter(p => !p.valorGlosado || p.valorGlosado === 0);
  console.log("\nPrimeiros 5 itens SEM glosa:");
  semGlosa.slice(0, 5).forEach(p => {
    console.log(`  ${p.codigo} - ${p.descricao?.substring(0, 40)}`);
    console.log(`    valorTotal: ${p.valorTotal}, valorGlosado: ${p.valorGlosado}, motivo: ${p.motivoGlosa}`);
    console.log(`    dadosExtras:`, JSON.stringify(p.dadosExtras, null, 2).substring(0, 200));
  });
}

test().catch(console.error);
