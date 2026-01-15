import 'dotenv/config';
import { readFileSync } from 'fs';
import { parseXML } from './server/parsers.ts';

const content = readFileSync('./geap-sample.xml');
const result = await parseXML(content);

console.log('Parse result:', {
  success: result.success,
  procedimentosCount: result.procedimentos.length,
  error: result.error
});

if (result.procedimentos.length > 0) {
  console.log('\nPrimeiros 5 procedimentos:');
  for (const proc of result.procedimentos.slice(0, 5)) {
    console.log({
      codigo: proc.codigo,
      descricao: proc.descricao,
      paciente: proc.pacienteNome,
      guia: proc.guiaNumero,
      valorTotal: proc.valorTotal,
      valorGlosado: proc.valorGlosado,
      dataExecucao: proc.dataExecucao
    });
  }
  
  // Count glosados
  const glosados = result.procedimentos.filter(p => p.valorGlosado && p.valorGlosado > 0);
  console.log('\nTotal glosados:', glosados.length);
  
  if (glosados.length > 0) {
    console.log('\nPrimeiros glosados:');
    for (const proc of glosados.slice(0, 3)) {
      console.log({
        codigo: proc.codigo,
        descricao: proc.descricao,
        valorGlosado: proc.valorGlosado,
        motivoGlosa: proc.motivoGlosa
      });
    }
  }
}
