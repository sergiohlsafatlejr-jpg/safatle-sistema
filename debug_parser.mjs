import * as xml2js from 'xml2js';
import fs from 'fs';

const xmlContent = fs.readFileSync('/home/ubuntu/upload/00000000000120086037_e6668ec7eeaf917cbee6950066185f47.xml', 'utf-8');

const parser = new xml2js.Parser({ 
  explicitArray: false, 
  ignoreAttrs: false,
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix]
});

const result = await parser.parseStringPromise(xmlContent);

// Print structure
console.log('Root keys:', Object.keys(result));
console.log('\nmensagemTISS keys:', Object.keys(result.mensagemTISS || {}));

const prestador = result.mensagemTISS?.prestadorParaOperadora;
console.log('\nprestadorParaOperadora keys:', Object.keys(prestador || {}));

const loteGuias = prestador?.loteGuias;
console.log('\nloteGuias keys:', Object.keys(loteGuias || {}));

const guiasTISS = loteGuias?.guiasTISS;
console.log('\nguiasTISS keys:', Object.keys(guiasTISS || {}));

// Check guiaSP-SADT
const guias = guiasTISS?.['guiaSP-SADT'];
console.log('\nguiaSP-SADT is array:', Array.isArray(guias));
console.log('guiaSP-SADT count:', Array.isArray(guias) ? guias.length : (guias ? 1 : 0));

if (guias) {
  const firstGuia = Array.isArray(guias) ? guias[0] : guias;
  console.log('\nFirst guia keys:', Object.keys(firstGuia));
  
  const procExec = firstGuia.procedimentosExecutados;
  console.log('\nprocedimentosExecutados keys:', Object.keys(procExec || {}));
  
  const procItem = procExec?.procedimentoExecutado;
  console.log('\nprocedimentoExecutado:', JSON.stringify(procItem, null, 2).substring(0, 1000));
}
