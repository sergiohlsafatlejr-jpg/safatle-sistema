/**
 * Script para reimportar arquivos XML TISS existentes e preencher os campos
 * numeroLote e sequencialTransacao nos procedimentos.
 * 
 * Este script:
 * 1. Busca todos os arquivos XML no banco de dados
 * 2. Para cada arquivo, baixa o conteúdo do S3
 * 3. Faz o parse do XML para extrair numeroLote e sequencialTransacao
 * 4. Atualiza os procedimentos existentes com esses valores
 * 
 * Uso: node scripts/reimport-xml-lote.mjs
 */

import mysql from 'mysql2/promise';
import * as xml2js from 'xml2js';

// Configuração do banco de dados
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

// Funções auxiliares do parser
function getTextValue(node) {
  if (node === null || node === undefined) return undefined;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "_" in node) {
    return String(node["_"]);
  }
  return undefined;
}

/**
 * Extrai o número do lote do cabeçalho TISS
 */
function extractNumeroLote(obj) {
  if (!obj || typeof obj !== "object") return undefined;
  
  function search(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 10) return undefined;
    
    for (const [key, value] of Object.entries(node)) {
      const lowerKey = key.toLowerCase();
      
      if (key === '$') continue;
      
      if (lowerKey === 'numerolote') {
        const lote = getTextValue(value);
        if (lote) return lote;
      }
      
      if (typeof value === 'object' && value !== null) {
        const found = search(value, depth + 1);
        if (found) return found;
      }
    }
    
    return undefined;
  }
  
  return search(obj);
}

/**
 * Encontra todas as guias com seus sequenciais de transação
 * Busca em vários níveis da estrutura XML
 */
function findGuiasComSequencial(obj) {
  const result = [];
  let currentSequencial = null;
  
  function searchGuiasTISS(node, depth = 0, parentSequencial = null) {
    if (!node || typeof node !== "object" || depth > 20) return;
    
    for (const [key, value] of Object.entries(node)) {
      const lowerKey = key.toLowerCase();
      
      if (key === '$' || typeof value !== 'object' || value === null) continue;
      
      // Capturar sequencialTransacao em qualquer nível
      if (lowerKey === 'sequencialtransacao') {
        const seq = getTextValue(value);
        if (seq) currentSequencial = seq;
        continue;
      }
      
      if (lowerKey === 'guiastiss') {
        const guiasTISSItems = Array.isArray(value) ? value : [value];
        
        for (const guiasTISSItem of guiasTISSItems) {
          if (!guiasTISSItem || typeof guiasTISSItem !== 'object') continue;
          
          // Buscar sequencial dentro do guiasTISS
          let sequencialTransacao = getTextValue(guiasTISSItem['sequencialTransacao']);
          if (!sequencialTransacao) {
            sequencialTransacao = currentSequencial;
          }
          
          // Encontrar a guia dentro do guiasTISS
          for (const [guiaKey, guiaValue] of Object.entries(guiasTISSItem)) {
            const guiaKeyLower = guiaKey.toLowerCase();
            
            if (guiaKeyLower.startsWith('guia') && 
                guiaKeyLower !== 'guiastiss' && 
                !guiaKeyLower.includes('numero') &&
                typeof guiaValue === 'object' && 
                guiaValue !== null) {
              
              const guiaItems = Array.isArray(guiaValue) ? guiaValue : [guiaValue];
              for (const guiaItem of guiaItems) {
                const guiaNumero = extractGuiaNumero(guiaItem);
                // Também buscar sequencial dentro da própria guia
                let seqFinal = sequencialTransacao;
                if (!seqFinal && guiaItem.sequencialTransacao) {
                  seqFinal = getTextValue(guiaItem.sequencialTransacao);
                }
                result.push({
                  guiaNumero,
                  sequencialTransacao: seqFinal,
                });
              }
            }
          }
        }
      } else {
        searchGuiasTISS(value, depth + 1, currentSequencial);
      }
    }
  }
  
  searchGuiasTISS(obj);
  return result;
}

/**
 * Busca sequencialTransacao de forma mais abrangente no XML
 */
function findAllSequenciais(obj) {
  const sequenciais = [];
  
  function search(node, depth = 0) {
    if (!node || typeof node !== "object" || depth > 20) return;
    
    for (const [key, value] of Object.entries(node)) {
      const lowerKey = key.toLowerCase();
      
      if (key === '$') continue;
      
      if (lowerKey === 'sequencialtransacao') {
        const seq = getTextValue(value);
        if (seq && !sequenciais.includes(seq)) {
          sequenciais.push(seq);
        }
      }
      
      if (typeof value === 'object' && value !== null) {
        search(value, depth + 1);
      }
    }
  }
  
  search(obj);
  return sequenciais;
}

/**
 * Extrai o número da guia
 */
function extractGuiaNumero(guia) {
  if (!guia || typeof guia !== "object") return undefined;
  
  // Try cabecalhoGuia first
  const cabecalho = guia["cabecalhoGuia"];
  if (cabecalho) {
    const numero = getTextValue(cabecalho["numeroGuiaPrestador"]) || 
                   getTextValue(cabecalho["guiaPrincipal"]);
    if (numero) return numero;
  }
  
  // Try dadosAutorizacao
  const autorizacao = guia["dadosAutorizacao"];
  if (autorizacao) {
    const numero = getTextValue(autorizacao["numeroGuiaOperadora"]);
    if (numero) return numero;
  }
  
  return undefined;
}

/**
 * Faz o parse do XML e extrai informações de lote e sequencial
 */
async function parseXMLForLoteInfo(xmlContent) {
  try {
    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      ignoreAttrs: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
      attrNameProcessors: [xml2js.processors.stripPrefix]
    });
    
    const result = await parser.parseStringPromise(xmlContent);
    
    const numeroLote = extractNumeroLote(result);
    const guiasInfo = findGuiasComSequencial(result);
    const allSequenciais = findAllSequenciais(result);
    
    return {
      success: true,
      numeroLote,
      guiasInfo,
      allSequenciais, // Todos os sequenciais encontrados no XML
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Baixa o conteúdo do arquivo do S3
 */
async function downloadFromS3(s3Url) {
  try {
    const response = await fetch(s3Url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`  ❌ Erro ao baixar arquivo: ${error.message}`);
    return null;
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Iniciando reimportação de arquivos XML TISS...\n');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // 1. Buscar todos os arquivos XML
    console.log('📋 Buscando arquivos XML no banco de dados...');
    const [arquivos] = await connection.execute(`
      SELECT id, nome, s3Url, s3Key
      FROM arquivos 
      WHERE tipoArquivo = 'xml' 
      AND status = 'processado'
      ORDER BY id
    `);
    
    console.log(`   Encontrados ${arquivos.length} arquivos XML\n`);
    
    if (arquivos.length === 0) {
      console.log('ℹ️  Nenhum arquivo XML encontrado para processar.');
      return;
    }
    
    let processados = 0;
    let atualizados = 0;
    let erros = 0;
    
    // 2. Processar cada arquivo
    for (const arquivo of arquivos) {
      console.log(`\n📄 Processando: ${arquivo.nome} (ID: ${arquivo.id})`);
      
      // Baixar conteúdo do S3
      const xmlContent = await downloadFromS3(arquivo.s3Url);
      if (!xmlContent) {
        erros++;
        continue;
      }
      
      // Parse do XML
      const parseResult = await parseXMLForLoteInfo(xmlContent);
      if (!parseResult.success) {
        console.log(`  ⚠️  Erro no parse: ${parseResult.error}`);
        erros++;
        continue;
      }
      
      const { numeroLote, guiasInfo, allSequenciais } = parseResult;
      console.log(`  📦 Lote: ${numeroLote || 'N/A'}`);
      console.log(`  📋 Guias encontradas: ${guiasInfo.length}`);
      console.log(`  🔢 Sequenciais encontrados: ${allSequenciais?.length || 0}`);
      
      if (!numeroLote && guiasInfo.length === 0 && (!allSequenciais || allSequenciais.length === 0)) {
        console.log(`  ⚠️  Nenhuma informação de lote/sequencial encontrada`);
        processados++;
        continue;
      }
      
      // 3. Atualizar procedimentos
      // Primeiro, atualizar o numeroLote em todos os procedimentos do arquivo
      if (numeroLote) {
        const [updateLote] = await connection.execute(`
          UPDATE procedimentos 
          SET numeroLote = ?
          WHERE arquivoId = ? AND (numeroLote IS NULL OR numeroLote = '')
        `, [numeroLote, arquivo.id]);
        
        console.log(`  ✅ Atualizado numeroLote em ${updateLote.affectedRows} procedimentos`);
        atualizados += updateLote.affectedRows;
      }
      
      // Atualizar o sequencialTransacao por guia
      let seqAtualizados = 0;
      for (const guiaInfo of guiasInfo) {
        if (guiaInfo.guiaNumero && guiaInfo.sequencialTransacao) {
          const [updateSeq] = await connection.execute(`
            UPDATE procedimentos 
            SET sequencialTransacao = ?
            WHERE arquivoId = ? 
            AND guiaNumero = ?
            AND (sequencialTransacao IS NULL OR sequencialTransacao = '')
          `, [guiaInfo.sequencialTransacao, arquivo.id, guiaInfo.guiaNumero]);
          
          if (updateSeq.affectedRows > 0) {
            console.log(`  ✅ Guia ${guiaInfo.guiaNumero}: sequencial ${guiaInfo.sequencialTransacao} (${updateSeq.affectedRows} itens)`);
            seqAtualizados += updateSeq.affectedRows;
          }
        }
      }
      
      // Se não conseguiu atualizar por guia, usar o primeiro sequencial encontrado para todos
      if (seqAtualizados === 0 && allSequenciais && allSequenciais.length > 0) {
        // Se só tem um sequencial, aplicar a todos os procedimentos do arquivo
        if (allSequenciais.length === 1) {
          const [updateSeqAll] = await connection.execute(`
            UPDATE procedimentos 
            SET sequencialTransacao = ?
            WHERE arquivoId = ? 
            AND (sequencialTransacao IS NULL OR sequencialTransacao = '')
          `, [allSequenciais[0], arquivo.id]);
          
          if (updateSeqAll.affectedRows > 0) {
            console.log(`  ✅ Aplicado sequencial ${allSequenciais[0]} a ${updateSeqAll.affectedRows} procedimentos`);
            seqAtualizados += updateSeqAll.affectedRows;
          }
        } else {
          console.log(`  ℹ️  Múltiplos sequenciais encontrados: ${allSequenciais.join(', ')}`);
        }
      }
      
      processados++;
    }
    
    // 4. Resumo final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DA REIMPORTAÇÃO');
    console.log('='.repeat(60));
    console.log(`   Total de arquivos: ${arquivos.length}`);
    console.log(`   Processados com sucesso: ${processados}`);
    console.log(`   Procedimentos atualizados: ${atualizados}`);
    console.log(`   Erros: ${erros}`);
    
    // 5. Verificar estatísticas finais
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN numeroLote IS NOT NULL AND numeroLote != '' THEN 1 ELSE 0 END) as comLote,
        SUM(CASE WHEN sequencialTransacao IS NOT NULL AND sequencialTransacao != '' THEN 1 ELSE 0 END) as comSequencial
      FROM procedimentos
    `);
    
    console.log('\n📈 ESTATÍSTICAS DOS PROCEDIMENTOS');
    console.log('='.repeat(60));
    console.log(`   Total de procedimentos: ${stats[0].total}`);
    console.log(`   Com numeroLote: ${stats[0].comLote} (${((stats[0].comLote / stats[0].total) * 100).toFixed(1)}%)`);
    console.log(`   Com sequencialTransacao: ${stats[0].comSequencial} (${((stats[0].comSequencial / stats[0].total) * 100).toFixed(1)}%)`);
    
  } catch (error) {
    console.error('\n❌ Erro durante a execução:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
  
  console.log('\n✅ Reimportação concluída!');
}

// Executar
main().catch(console.error);
