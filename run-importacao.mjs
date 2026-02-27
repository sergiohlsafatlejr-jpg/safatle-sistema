/**
 * Script para executar a importação inicial dos dados de integ_faturado_x_recebido
 * para a tabela recebimento_geral.
 * 
 * Uso: node run-importacao.mjs
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
  
  // Verificar quantos registros existem na origem
  const [countOrigem] = await connection.execute(
    'SELECT COUNT(*) as total FROM integ_faturado_x_recebido'
  );
  const totalOrigem = countOrigem[0].total;
  console.log(`📊 Total de registros na integ_faturado_x_recebido: ${totalOrigem}`);
  
  // Verificar quantos registros já existem no destino
  const [countDestino] = await connection.execute(
    'SELECT COUNT(*) as total FROM recebimento_geral'
  );
  const totalDestinoAntes = countDestino[0].total;
  console.log(`📊 Total de registros na recebimento_geral (antes): ${totalDestinoAntes}`);
  
  if (totalDestinoAntes > 0) {
    console.log('⚠️  Tabela recebimento_geral já possui dados. Limpando antes de importar...');
    await connection.execute('DELETE FROM recebimento_geral');
    console.log('🗑️  Tabela limpa!');
  }
  
  // Importar em lotes
  const BATCH_SIZE = 500;
  let offset = 0;
  let totalImportados = 0;
  let totalErros = 0;
  const inicio = Date.now();
  
  console.log(`\n🚀 Iniciando importação de ${totalOrigem} registros em lotes de ${BATCH_SIZE}...\n`);
  
  while (offset < totalOrigem) {
    try {
      // Buscar lote da origem
      const [rows] = await connection.execute(
        `SELECT * FROM integ_faturado_x_recebido ORDER BY _id ASC LIMIT ${BATCH_SIZE} OFFSET ${offset}`
      );
      
      if (rows.length === 0) break;
      
      // Transformar registros
      const batch = [];
      for (const row of rows) {
        try {
          const record = {
            sincronizado: row._sincronizado_em || null,
            atualizado: row._atualizado_em || null,
            estabelecimentoId: parseInt(row.estabelecimento_id) || 0,
            convenioId: parseInt(row.codconv) || null,
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
        
        // Construir INSERT manualmente
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
      console.error(`❌ Erro no lote offset=${offset}: ${err.message}`);
      totalErros += BATCH_SIZE;
    }
    
    offset += BATCH_SIZE;
    
    // Progresso
    const percentual = Math.min(100, ((offset / totalOrigem) * 100)).toFixed(1);
    const tempoDecorrido = ((Date.now() - inicio) / 1000).toFixed(1);
    process.stdout.write(`\r⏳ Progresso: ${percentual}% | Importados: ${totalImportados} | Erros: ${totalErros} | Tempo: ${tempoDecorrido}s`);
  }
  
  const tempoTotal = ((Date.now() - inicio) / 1000).toFixed(1);
  
  // Verificar resultado final
  const [countFinal] = await connection.execute(
    'SELECT COUNT(*) as total FROM recebimento_geral'
  );
  const totalFinal = countFinal[0].total;
  
  console.log(`\n\n✅ Importação concluída!`);
  console.log(`📊 Registros na origem: ${totalOrigem}`);
  console.log(`📊 Registros importados: ${totalImportados}`);
  console.log(`📊 Registros na recebimento_geral: ${totalFinal}`);
  console.log(`❌ Erros: ${totalErros}`);
  console.log(`⏱️  Tempo total: ${tempoTotal}s`);
  
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
  // Mapeamento direto para os campos que precisam
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
