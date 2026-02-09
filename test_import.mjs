import { readFileSync } from 'fs';
import { parseXmlRecebimentoTiss } from './server/recebimentoTissParser.ts';

const files = [
  '/home/ubuntu/upload/223689903.xml',
  '/home/ubuntu/upload/223722682.xml',
  '/home/ubuntu/upload/223742387.xml',
  '/home/ubuntu/upload/223750296.xml',
  '/home/ubuntu/upload/223750408.xml',
  '/home/ubuntu/upload/223805266.xml',
];

for (const file of files) {
  const name = file.split('/').pop();
  try {
    const buffer = readFileSync(file);
    const result = await parseXmlRecebimentoTiss(
      buffer,
      999, // fake arquivoId
      1,   // estabelecimentoId
      60004, // convenioId (Cassi)
      undefined,
      undefined
    );
    
    if (result && result.success) {
      console.log(`${name}: SUCCESS - ${result.items.length} itens, ${result.totalRows} linhas`);
      if (result.items.length > 0) {
        const totalInf = result.items.reduce((s, i) => s + parseFloat(i.valorInformado || '0'), 0);
        const totalLib = result.items.reduce((s, i) => s + parseFloat(i.valorLiberado || '0'), 0);
        const totalGlosa = result.items.reduce((s, i) => s + parseFloat(i.valorGlosa || '0'), 0);
        console.log(`  Informado: R$ ${totalInf.toFixed(2)}, Liberado: R$ ${totalLib.toFixed(2)}, Glosa: R$ ${totalGlosa.toFixed(2)}`);
      }
    } else {
      console.log(`${name}: FAILED - ${result?.error || 'unknown error'}`);
    }
  } catch (e) {
    console.log(`${name}: ERROR - ${e.message}`);
  }
}
