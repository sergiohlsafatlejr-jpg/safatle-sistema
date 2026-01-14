import { parseXML } from './server/parsers.ts';
import * as fs from 'fs';

async function main() {
  const xml1 = fs.readFileSync('/home/ubuntu/upload/222950528.xml', 'utf-8');
  const result1 = await parseXML(xml1);
  console.log('=== 222950528.xml ===');
  console.log('Procedimentos:', result1.procedimentos.length);
  const glosados1 = result1.procedimentos.filter(p => p.motivoGlosa);
  console.log('Com motivo de glosa:', glosados1.length);
  console.log('Exemplos de motivos traduzidos:');
  glosados1.slice(0, 5).forEach(p => {
    console.log('  -', p.motivoGlosa);
  });
  
  console.log('\\n=== demonstrativo_66685495_130087238_6.xml ===');
  const xml2 = fs.readFileSync('/home/ubuntu/upload/demonstrativo_66685495_130087238_6.xml', 'utf-8');
  const result2 = await parseXML(xml2);
  console.log('Procedimentos:', result2.procedimentos.length);
  const glosados2 = result2.procedimentos.filter(p => p.motivoGlosa);
  console.log('Com motivo de glosa:', glosados2.length);
  console.log('Exemplos de motivos traduzidos:');
  glosados2.slice(0, 5).forEach(p => {
    console.log('  -', p.motivoGlosa);
  });
}

main().catch(console.error);
