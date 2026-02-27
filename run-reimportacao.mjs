/**
 * Script para RE-executar a importação dos dados de integ_faturado_x_recebido
 * para a tabela recebimento_geral, agora usando os mapeamentos de convênios
 * para preencher o convenioId corretamente.
 * 
 * Uso: node run-reimportacao.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não encontrada no .env');
  process.exit(1);
}

async function main() {
  console.log('🔄 Conectando ao banco de dados...');
  
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('✅ Conectado!');
  
  // 1. Carregar mapeamentos de convênios
  console.log('\n📋 Carregando mapeamentos de convênios...');
  const [mapeamentos] = await connection.execute(
    'SELECT nome_origem, convenioId, estabelecimentoId FROM convenio_mapeamento WHERE ativo = "sim"'
  );
  
  // Criar lookup por estabelecimentoId + nome_origem (case insensitive)
  const mapeamentoMap = {};
  for (const m of mapeamentos) {
    const key = `${m.estabelecimentoId}:${(m.nome_origem || '').toUpperCase().trim()}`;
    mapeamentoMap[key] = m.convenioId;
  }
  console.log(`✅ ${mapeamentos.length} mapeamentos carregados`);
  console.log('   Mapeamentos por estabelecimento:');
  const porEstab = {};
  for (const m of mapeamentos) {
    porEstab[m.estabelecimentoId] = (porEstab[m.estabelecimentoId] || 0) + 1;
  }
  for (const [estab, count] of Object.entries(porEstab)) {
    console.log(`   - Estabelecimento ${estab}: ${count} mapeamentos`);
  }
  
  // 2. Verificar quantos registros existem na origem
  const [countOrigem] = await connection.execute(
    'SELECT COUNT(*) as total FROM integ_faturado_x_recebido'
  );
  const totalOrigem = countOrigem[0].total;
  console.log(`\n📊 Total de registros na integ_faturado_x_recebido: ${totalOrigem}`);
  
  // 3. Limpar tabela destino
  console.log('🗑️  Limpando tabela recebimento_geral...');
  await connection.execute('DELETE FROM recebimento_geral');
  console.log('✅ Tabela limpa!');
  
  // 4. Importar em lotes com mapeamento
  const BATCH_SIZE = 500;
  let offset = 0;
  let totalImportados = 0;
  let totalErros = 0;
  let totalMapeados = 0;
  let totalSemMapeamento = 0;
  const inicio = Date.now();
  
  console.log(`\n🚀 Iniciando re-importação de ${totalOrigem} registros em lotes de ${BATCH_SIZE}...\n`);
  
  while (offset < totalOrigem) {
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM integ_faturado_x_recebido ORDER BY _id ASC LIMIT ${BATCH_SIZE} OFFSET ${offset}`
      );
      
      if (rows.length === 0) break;
      
      const batch = [];
      for (const row of rows) {
        try {
          const estabId = parseInt(row.estabelecimento_id) || 0;
          const nomeConv = (row.nomeconv || '').toUpperCase().trim();
          
          // Tentar encontrar mapeamento
          const lookupKey = `${estabId}:${nomeConv}`;
          let convenioId = mapeamentoMap[lookupKey] || null;
          
          if (convenioId) {
            totalMapeados++;
          } else {
            totalSemMapeamento++;
          }
          
          const record = {
            sincronizado: row._sincronizado_em || null,
            atualizado: row._atualizado_em || null,
            estabelecimentoId: estabId,
            convenioId: convenioId,
            convenio: truncate(row.nomeconv, 255),
            mesProducao: truncate(row.mesprod, 20),
            fatura: truncate(row.numfatura, 100),
            codigoRecurso: truncate(row.codrecur, 100),
            tipoProcedimento: truncate(row.tipoproc, 255),
            protocolo: truncate(row.protocolo, 100),
            numeroConta: truncate(row.numconta, 100),
            guiaCobranca: truncate(row.guiacobra, 100),
            guiaOperadora: truncate(row.aihguia, 100),
            descricaoItem: row.descricao || null,
            carteirinha: truncate(row.matricula, 100),
            dataConta: truncate(row.data, 20),
            dataInternacao: truncate(row.dataint, 20),
            dataSaida: truncate(row.datasai, 20),
            codigoConvenio: truncate(row.codconv, 50),
            codigoSistema: truncate(row.codproprio, 50),
            tipoDescricao: truncate(row.procdisco || row.codgrufi, 255),
            funcaoTiss: truncate(row.funcaotiss, 255),
            receberHospital: toDecimal(row.receber),
            codigoSetor: truncate(row.codcc, 50),
            nomeSetor: truncate(row.nomecc, 255),
            prestadorExecutante: truncate(row.prestexe, 255),
            nomePrestador: truncate(row.nomeprest, 255),
            quantidadeItem: toDecimal(row.quantidade),
            vlUnitario: toDecimal(row.vl_unitario),
            vlFaturado: toDecimal(row.vl_faturado),
            vlRecebido: toDecimal(row.vl_recebido),
            vlRecebAMaior: toDecimal(row.vl_receb_a_maior),
            vlTotalRecebido: toDecimal(row.vl_total_recebido),
            vlAberto: toDecimal(row.vl_aberto),
            vlGlosas: toDecimal(row.vl_glosas),
            vlRecurso: toDecimal(row.gl_recurso),
            glAceita: toDecimal(row.gl_aceita),
            glAnalise: toDecimal(row.gl_analise),
            glRecuperado: toDecimal(row.gl_recuperada),
            codigoTiss: truncate(row.codtiss, 50),
            descricaoMotivo: row.descmotivo || null,
            complementoRecurso: row.complrecur || null,
            tipoAtendimento: truncate(row.tipoatend, 255),
          };
          batch.push(record);
        } catch (err) {
          totalErros++;
        }
      }
      
      // Inserir em sub-lotes de 100
      const SUB_BATCH = 100;
      for (let i = 0; i < batch.length; i += SUB_BATCH) {
        const subBatch = batch.slice(i, i + SUB_BATCH);
        
        const columns = Object.keys(subBatch[0]);
        const placeholders = subBatch.map(
          () => `(${columns.map(() => '?').join(', ')})`
        ).join(', ');
        
        const values = subBatch.flatMap(record => 
          columns.map(col => record[col] === undefined ? null : record[col])
        );
        
        const sql = `INSERT INTO recebimento_geral (${columns.map(c => camelToSnake(c)).join(', ')}) VALUES ${placeholders}`;
        
        await connection.execute(sql, values);
        totalImportados += subBatch.length;
      }
      
    } catch (err) {
      console.error(`\n❌ Erro no lote offset=${offset}: ${err.message}`);
      totalErros += BATCH_SIZE;
    }
    
    offset += BATCH_SIZE;
    
    const percentual = Math.min(100, ((offset / totalOrigem) * 100)).toFixed(1);
    const tempoDecorrido = ((Date.now() - inicio) / 1000).toFixed(1);
    process.stdout.write(`\r⏳ Progresso: ${percentual}% | Importados: ${totalImportados} | Mapeados: ${totalMapeados} | Sem mapeamento: ${totalSemMapeamento} | Tempo: ${tempoDecorrido}s`);
  }
  
  const tempoTotal = ((Date.now() - inicio) / 1000).toFixed(1);
  
  // Verificar resultado final
  const [countFinal] = await connection.execute(
    'SELECT COUNT(*) as total FROM recebimento_geral'
  );
  const totalFinal = countFinal[0].total;
  
  const [countComConvenio] = await connection.execute(
    'SELECT COUNT(*) as total FROM recebimento_geral WHERE convenioId IS NOT NULL'
  );
  const totalComConvenio = countComConvenio[0].total;
  
  const [countSemConvenio] = await connection.execute(
    'SELECT COUNT(*) as total FROM recebimento_geral WHERE convenioId IS NULL'
  );
  const totalSemConvenio = countSemConvenio[0].total;
  
  // Verificar quais convênios ficaram sem mapeamento
  const [semMapeamento] = await connection.execute(
    'SELECT DISTINCT convenio, estabelecimentoId, COUNT(*) as qtd FROM recebimento_geral WHERE convenioId IS NULL GROUP BY convenio, estabelecimentoId ORDER BY qtd DESC'
  );
  
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`✅ RE-IMPORTAÇÃO CONCLUÍDA!`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📊 Registros na origem: ${totalOrigem}`);
  console.log(`📊 Registros importados: ${totalImportados}`);
  console.log(`📊 Registros na recebimento_geral: ${totalFinal}`);
  console.log(`✅ Com convenioId mapeado: ${totalComConvenio} (${((totalComConvenio/totalFinal)*100).toFixed(1)}%)`);
  console.log(`⚠️  Sem convenioId: ${totalSemConvenio} (${((totalSemConvenio/totalFinal)*100).toFixed(1)}%)`);
  console.log(`❌ Erros: ${totalErros}`);
  console.log(`⏱️  Tempo total: ${tempoTotal}s`);
  
  if (semMapeamento.length > 0) {
    console.log(`\n⚠️  Convênios sem mapeamento:`);
    for (const s of semMapeamento) {
      console.log(`   - "${s.convenio}" (estab: ${s.estabelecimentoId}) - ${s.qtd} registros`);
    }
  }
  
  await connection.end();
  console.log('\n🔒 Conexão encerrada.');
}

function truncate(value, maxLen) {
  if (!value) return null;
  const str = String(value);
  return str.length > maxLen ? str.substring(0, maxLen) : str;
}

function toDecimal(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num.toFixed(2);
}

function camelToSnake(str) {
  const map = {
    sincronizado: 'sincronizado',
    atualizado: 'atualizado',
    estabelecimentoId: 'estabelecimentoId',
    convenioId: 'convenioId',
    convenio: 'convenio',
    mesProducao: 'mes_producao',
    fatura: 'fatura',
    codigoRecurso: 'codigo_recurso',
    tipoProcedimento: 'tipo_procedimento',
    protocolo: 'protocolo',
    numeroConta: 'numero_conta',
    guiaCobranca: 'guia_cobranca',
    guiaOperadora: 'guia_operadora',
    descricaoItem: 'descricao_item',
    carteirinha: 'carteirinha',
    dataConta: 'data_conta',
    dataInternacao: 'data_internacao',
    dataSaida: 'data_saida',
    codigoConvenio: 'codigo_convenio',
    codigoSistema: 'codigo_sistema',
    tipoDescricao: 'tipo_descricao',
    funcaoTiss: 'funcao_tiss',
    receberHospital: 'receber_hospital',
    codigoSetor: 'codigo_setor',
    nomeSetor: 'nome_setor',
    prestadorExecutante: 'prestador_executante',
    nomePrestador: 'nome_prestador',
    quantidadeItem: 'quantidade_item',
    vlUnitario: 'vl_unitario',
    vlFaturado: 'vl_faturado',
    vlRecebido: 'vl_recebido',
    vlRecebAMaior: 'vl_receb_a_maior',
    vlTotalRecebido: 'vl_total_recebido',
    vlAberto: 'vl_aberto',
    vlGlosas: 'vl_glosas',
    vlRecurso: 'vl_recurso',
    glAceita: 'gl_aceita',
    glAnalise: 'gl_analise',
    glRecuperado: 'gl_recuperado',
    codigoTiss: 'codigo_tiss',
    descricaoMotivo: 'descricao_motivo',
    complementoRecurso: 'complemento_recurso',
    tipoAtendimento: 'tipo_atendimento',
  };
  return map[str] || str;
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
