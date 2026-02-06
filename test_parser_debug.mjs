import * as fs from 'fs';
import * as xml2js from 'xml2js';

// Simulate the parser logic to debug outrasDespesas extraction

function getTextValue(node) {
  if (node === null || node === undefined) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "_" in node) {
    return String(node["_"]);
  }
  return undefined;
}

function parseNumber(value) {
  if (value === undefined || value === null) return undefined;
  const str = getTextValue(value);
  if (!str) return undefined;
  const num = parseFloat(str.replace(",", "."));
  return isNaN(num) ? undefined : num;
}

async function debugParse(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const parser = new xml2js.Parser({ 
    explicitArray: false, 
    ignoreAttrs: false,
    tagNameProcessors: [xml2js.processors.stripPrefix],
    attrNameProcessors: [xml2js.processors.stripPrefix]
  });
  
  const result = await parser.parseStringPromise(content);
  
  console.log('=== PARSED XML STRUCTURE ===');
  console.log(JSON.stringify(result, null, 2).substring(0, 500));
  
  // Navigate to guiaSP-SADT
  const mensagem = result.mensagemTISS || result['mensagemTISS'];
  console.log('\n=== Top-level keys ===');
  console.log(Object.keys(mensagem));
  
  const prestador = mensagem.prestadorParaOperadora;
  console.log('\n=== prestadorParaOperadora keys ===');
  console.log(Object.keys(prestador));
  
  const loteGuias = prestador.loteGuias;
  console.log('\n=== loteGuias keys ===');
  console.log(Object.keys(loteGuias));
  
  const guiasTISS = loteGuias.guiasTISS;
  console.log('\n=== guiasTISS keys ===');
  console.log(Object.keys(guiasTISS));
  
  const guia = guiasTISS['guiaSP-SADT'];
  console.log('\n=== guiaSP-SADT keys ===');
  console.log(Object.keys(guia));
  
  // Check outrasDespesas
  const outrasDespesas = guia.outrasDespesas;
  console.log('\n=== outrasDespesas ===');
  console.log('Type:', typeof outrasDespesas);
  console.log('Keys:', outrasDespesas ? Object.keys(outrasDespesas) : 'NULL');
  
  if (outrasDespesas) {
    const despesa = outrasDespesas.despesa;
    console.log('\n=== despesa ===');
    console.log('Type:', typeof despesa);
    console.log('Is Array:', Array.isArray(despesa));
    
    if (Array.isArray(despesa)) {
      console.log('Count:', despesa.length);
      
      for (let i = 0; i < despesa.length; i++) {
        const d = despesa[i];
        console.log(`\n--- Despesa ${i} ---`);
        console.log('Keys:', Object.keys(d));
        console.log('codigoDespesa:', d.codigoDespesa);
        console.log('codigoDespesa value:', getTextValue(d.codigoDespesa));
        
        const servicos = d.servicosExecutados;
        console.log('servicosExecutados type:', typeof servicos);
        console.log('servicosExecutados keys:', servicos ? Object.keys(servicos) : 'NULL');
        
        if (servicos) {
          // Check if procedimento is nested
          console.log('procedimento:', servicos.procedimento);
          console.log('codigoProcedimento (direct):', servicos.codigoProcedimento);
          
          if (servicos.procedimento) {
            console.log('procedimento keys:', Object.keys(servicos.procedimento));
            console.log('codigoProcedimento:', servicos.procedimento.codigoProcedimento);
            console.log('descricaoProcedimento:', servicos.procedimento.descricaoProcedimento);
          }
          
          console.log('quantidadeExecutada:', servicos.quantidadeExecutada);
          console.log('valorUnitario:', servicos.valorUnitario);
          console.log('valorTotal:', servicos.valorTotal);
          console.log('unidadeMedida:', servicos.unidadeMedida);
          console.log('reducaoAcrescimo:', servicos.reducaoAcrescimo);
        }
      }
    } else if (despesa) {
      console.log('Single despesa keys:', Object.keys(despesa));
    }
  }
  
  // Now test what the CURRENT parser extractServicoFromNode would do
  console.log('\n\n=== SIMULATING CURRENT PARSER extractServicoFromNode ===');
  if (outrasDespesas && outrasDespesas.despesa) {
    const despesas = Array.isArray(outrasDespesas.despesa) ? outrasDespesas.despesa : [outrasDespesas.despesa];
    
    for (const d of despesas) {
      const codigoDespesa = getTextValue(d.codigoDespesa);
      const servicos = d.servicosExecutados;
      
      console.log(`\nDespesa código: ${codigoDespesa}`);
      
      if (servicos) {
        // Current parser tries to get codigoProcedimento directly from servicosExecutados
        const codigoDirect = getTextValue(servicos.codigoProcedimento);
        console.log('  codigoProcedimento (direct from servicos):', codigoDirect || 'NOT FOUND');
        
        // But the real structure has it nested in procedimento
        const procedimentoNode = servicos.procedimento;
        if (procedimentoNode) {
          const codigoNested = getTextValue(procedimentoNode.codigoProcedimento);
          console.log('  codigoProcedimento (from servicos.procedimento):', codigoNested || 'NOT FOUND');
          console.log('  descricaoProcedimento (from servicos.procedimento):', getTextValue(procedimentoNode.descricaoProcedimento) || 'NOT FOUND');
        } else {
          console.log('  procedimento node: NOT FOUND');
        }
        
        console.log('  quantidadeExecutada:', getTextValue(servicos.quantidadeExecutada));
        console.log('  valorUnitario:', getTextValue(servicos.valorUnitario));
        console.log('  valorTotal:', getTextValue(servicos.valorTotal));
      }
    }
  }
}

const testFile = process.argv[2] || './test_files/teste_outras_despesas.xml';
debugParse(testFile).catch(console.error);
