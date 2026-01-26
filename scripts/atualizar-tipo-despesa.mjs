/**
 * Script para atualizar o campo tipoDespesa dos registros existentes
 * baseado no campo tipoLancamento armazenado no dadosExtras
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL não encontrada no ambiente');
  process.exit(1);
}

// Função para converter tipoLancamento em tipoDespesa
function tipoLancamentoParaTipoDespesa(tipoLancamento) {
  if (!tipoLancamento) return null;
  
  const tipo = tipoLancamento.toLowerCase().trim();
  
  if (tipo.includes('medicamento') || tipo.includes('medic') || tipo === 'med') {
    return 'medicamento';
  }
  if (tipo.includes('material') || tipo.includes('mat') || tipo === 'mat/med') {
    return 'material';
  }
  if (tipo.includes('diária') || tipo.includes('diaria') || tipo === 'diárias') {
    return 'diaria';
  }
  if (tipo.includes('taxa') || tipo.includes('tx')) {
    return 'taxa';
  }
  if (tipo.includes('gás') || tipo.includes('gas') || tipo.includes('oxigênio') || tipo.includes('oxigenio')) {
    return 'gas';
  }
  if (tipo.includes('procedimento') || tipo.includes('proc') || tipo.includes('honorário') || tipo.includes('honorario')) {
    return 'procedimento';
  }
  if (tipo.includes('exame') || tipo.includes('sadt')) {
    return 'procedimento';
  }
  if (tipo.includes('serviço') || tipo.includes('servico')) {
    return 'procedimento';
  }
  
  return 'outros';
}

async function main() {
  console.log('Conectando ao banco de dados...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Buscar registros que têm dadosExtras com tipoLancamento
    console.log('Buscando registros com tipoLancamento no dadosExtras...');
    
    const [rows] = await connection.execute(`
      SELECT id, dadosExtras, tipoDespesa
      FROM procedimentos
      WHERE dadosExtras IS NOT NULL 
        AND dadosExtras != ''
        AND dadosExtras != '{}'
    `);
    
    console.log(`Encontrados ${rows.length} registros com dadosExtras`);
    
    let atualizados = 0;
    let erros = 0;
    let semTipo = 0;
    
    for (const row of rows) {
      try {
        let dadosExtras = row.dadosExtras;
        
        // Se for string, tentar fazer parse
        if (typeof dadosExtras === 'string') {
          try {
            dadosExtras = JSON.parse(dadosExtras);
          } catch {
            // Se não for JSON válido, pular
            semTipo++;
            continue;
          }
        }
        
        // Se for objeto vazio ou não for objeto, pular
        if (!dadosExtras || typeof dadosExtras !== 'object') {
          semTipo++;
          continue;
        }
        
        // Tentar encontrar o tipoLancamento em diferentes formatos
        const tipoLancamento = 
          dadosExtras.tipoLancamento || 
          dadosExtras['Tipo Lançamento'] || 
          dadosExtras['tipo_lancamento'] ||
          dadosExtras['TIPO LANCAMENTO'] ||
          dadosExtras['Tipo Lancamento'];
        
        if (tipoLancamento) {
          const novoTipo = tipoLancamentoParaTipoDespesa(tipoLancamento);
          
          if (novoTipo && novoTipo !== row.tipoDespesa) {
            await connection.execute(
              'UPDATE procedimentos SET tipoDespesa = ? WHERE id = ?',
              [novoTipo, row.id]
            );
            atualizados++;
            
            if (atualizados % 1000 === 0) {
              console.log(`Atualizados ${atualizados} registros...`);
            }
          }
        } else {
          semTipo++;
        }
      } catch (e) {
        erros++;
        if (erros <= 5) {
          console.error(`Erro ao processar registro ${row.id}:`, e.message);
        }
      }
    }
    
    console.log('\n=== Resultado ===');
    console.log(`Total de registros processados: ${rows.length}`);
    console.log(`Registros atualizados: ${atualizados}`);
    console.log(`Registros sem tipoLancamento: ${semTipo}`);
    console.log(`Erros: ${erros}`);
    
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
