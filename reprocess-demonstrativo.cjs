/**
 * Script para reprocessar o arquivo demonstrativo-0284932.xlsx
 * e popular a tabela recebimento_tiss
 */

const mysql = require('mysql2/promise');
const https = require('https');
const XLSX = require('xlsx');
require('dotenv').config();

// Função para baixar arquivo da URL
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

function normalizeKey(key) {
  return key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function findValue(row, normalizedRow, mappings) {
  for (const mapping of mappings) {
    const normalized = normalizeKey(mapping);
    if (normalizedRow[normalized] !== undefined && normalizedRow[normalized] !== '') {
      return normalizedRow[normalized];
    }
  }
  return null;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  const str = String(value).trim();
  if (!str) return null;
  
  // Formato brasileiro DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const date = new Date(parseInt(brMatch[3]), parseInt(brMatch[2]) - 1, parseInt(brMatch[1]));
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Formato brasileiro com hora
  const brMatchTime = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (brMatchTime) {
    const date = new Date(parseInt(brMatchTime[3]), parseInt(brMatchTime[2]) - 1, parseInt(brMatchTime[1]));
    return isNaN(date.getTime()) ? null : date;
  }
  
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim().replace(/\./g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function formatDateForMySQL(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const arquivoId = 570011;
  const estabelecimentoId = 1;
  
  console.log('=== Reprocessando demonstrativo-0284932.xlsx ===');
  console.log('Arquivo ID:', arquivoId);
  
  // Limpar dados antigos
  console.log('Limpando dados antigos...');
  await conn.execute('DELETE FROM recebimento_tiss WHERE arquivo_id = ?', [arquivoId]);
  
  // Baixar arquivo
  console.log('Baixando arquivo...');
  const url = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663295218967/98MRdVE9Uf2ZRMz25bPSye/arquivos/1/rg8qGfv7Dksq0mfQkZLxL-demonstrativo-0284932.xlsx.xlsx';
  const buffer = await downloadFile(url);
  console.log('Arquivo baixado:', (buffer.length / 1024 / 1024).toFixed(2), 'MB');
  
  // Parsear Excel
  console.log('Parseando Excel...');
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
  console.log('Total de linhas:', rawData.length);
  
  // Mapeamento de colunas (nomes exatos do Excel Unimed)
  const MAPPINGS = {
    numeroDemonstrativo: ['Demonstrativo', 'demonstrativo'],
    dataPagamento: ['Data Pagto Processado', 'Data Pagto', 'data_pagto'],
    numeroProtocolo: ['Protocolo TISS', 'protocolo_tiss'],
    numeroLotePrestador: ['Lote Prestador', 'lote_prestador'],
    codigoPrestadorPagamento: ['Código Prestador Pagamento', 'codigo_prestador_pagamento'],
    nomePrestadorPagamento: ['Nome Prestador Pagamento', 'nome_prestador_pagamento'],
    numeroGuiaPrestador: ['Número Guia', 'Numero Guia', 'numero_guia'],
    sequencialItem: ['Seq', 'seq', 'sequencial'],
    numeroCarteira: ['Beneficiário', 'Beneficiario', 'beneficiario'],
    nomeBeneficiario: ['Nome Beneficiário', 'Nome Beneficiario', 'nome_beneficiario'],
    dataRealizacao: ['Data Execução', 'Data Execucao', 'data_execucao'],
    horaExecucao: ['Hora Execução', 'Hora Execucao', 'hora_execucao'],
    codigoProcedimento: ['Item', 'item', 'codigo'],
    descricaoProcedimento: ['Item Desc', 'item_desc', 'descricao'],
    qtdExecutada: ['Quantidade', 'quantidade', 'qtd'],
    valorLiberado: ['Valor Pagamento', 'valor_pagamento'],
    tipoLancamento: ['Tipo Lançamento', 'Tipo Lancamento', 'tipo_lancamento'],
    codigoGlosa: ['Erro TISS', 'erro_tiss', 'codigo_glosa'],
    situacaoItem: ['Situação Item', 'Situacao Item', 'situacao_item'],
    codigoSolicitante: ['Código Solicitante', 'Codigo Solicitante', 'codigo_solicitante'],
    nomeSolicitante: ['Nome Solicitante', 'nome_solicitante'],
    acomodacaoInternacao: ['Acomodação da Internação', 'Acomodacao da Internacao', 'acomodacao'],
    dataInicioInternacao: ['Data Inicio Faturamento Internação', 'Data Inicio Faturamento Internacao'],
    dataFimInternacao: ['Data Fim Faturamento Internação', 'Data Fim Faturamento Internacao'],
    codigoPrestadorExecutante: ['Código Prestador', 'Codigo Prestador', 'codigo_prestador'],
    nomePrestadorExecutante: ['Nome Prestador', 'nome_prestador'],
  };
  
  // Processar em lotes
  const BATCH_SIZE = 500;
  let totalImportados = 0;
  let totalErros = 0;
  
  for (let i = 0; i < rawData.length; i += BATCH_SIZE) {
    const batch = rawData.slice(i, i + BATCH_SIZE);
    const items = [];
    
    for (const row of batch) {
      // Normalizar chaves da linha
      const normalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        normalizedRow[normalizeKey(key)] = value;
      }
      
      // Extrair valores
      const codigo = findValue(row, normalizedRow, MAPPINGS.codigoProcedimento);
      const descricao = findValue(row, normalizedRow, MAPPINGS.descricaoProcedimento);
      
      // Pular linhas sem código de procedimento
      if (!codigo && !descricao) continue;
      
      const item = {
        arquivo_id: arquivoId,
        estabelecimento_id: estabelecimentoId,
        numero_demonstrativo: findValue(row, normalizedRow, MAPPINGS.numeroDemonstrativo),
        data_pagamento: formatDateForMySQL(parseDate(findValue(row, normalizedRow, MAPPINGS.dataPagamento))),
        numero_protocolo: findValue(row, normalizedRow, MAPPINGS.numeroProtocolo),
        numero_lote_prestador: findValue(row, normalizedRow, MAPPINGS.numeroLotePrestador),
        codigo_prestador_pagamento: findValue(row, normalizedRow, MAPPINGS.codigoPrestadorPagamento),
        nome_prestador_pagamento: findValue(row, normalizedRow, MAPPINGS.nomePrestadorPagamento),
        numero_guia_prestador: findValue(row, normalizedRow, MAPPINGS.numeroGuiaPrestador),
        sequencial_item: parseNumber(findValue(row, normalizedRow, MAPPINGS.sequencialItem)),
        numero_carteira: findValue(row, normalizedRow, MAPPINGS.numeroCarteira),
        nome_beneficiario: findValue(row, normalizedRow, MAPPINGS.nomeBeneficiario),
        data_realizacao: formatDateForMySQL(parseDate(findValue(row, normalizedRow, MAPPINGS.dataRealizacao))),
        hora_execucao: findValue(row, normalizedRow, MAPPINGS.horaExecucao),
        codigo_procedimento: codigo,
        descricao_procedimento: descricao,
        qtd_executada: parseNumber(findValue(row, normalizedRow, MAPPINGS.qtdExecutada)),
        valor_liberado: parseNumber(findValue(row, normalizedRow, MAPPINGS.valorLiberado)),
        tipo_lancamento: findValue(row, normalizedRow, MAPPINGS.tipoLancamento),
        codigo_glosa: findValue(row, normalizedRow, MAPPINGS.codigoGlosa),
        situacao_item: findValue(row, normalizedRow, MAPPINGS.situacaoItem),
        codigo_solicitante: findValue(row, normalizedRow, MAPPINGS.codigoSolicitante),
        nome_solicitante: findValue(row, normalizedRow, MAPPINGS.nomeSolicitante),
        acomodacao_internacao: findValue(row, normalizedRow, MAPPINGS.acomodacaoInternacao),
        data_inicio_internacao: formatDateForMySQL(parseDate(findValue(row, normalizedRow, MAPPINGS.dataInicioInternacao))),
        data_fim_internacao: formatDateForMySQL(parseDate(findValue(row, normalizedRow, MAPPINGS.dataFimInternacao))),
        codigo_prestador_executante: findValue(row, normalizedRow, MAPPINGS.codigoPrestadorExecutante),
        nome_prestador_executante: findValue(row, normalizedRow, MAPPINGS.nomePrestadorExecutante),
      };
      
      items.push(item);
    }
    
    // Inserir lote
    if (items.length > 0) {
      try {
        const columns = Object.keys(items[0]);
        const placeholders = items.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
        const values = items.flatMap(item => columns.map(col => item[col]));
        
        await conn.execute(
          `INSERT INTO recebimento_tiss (${columns.join(', ')}) VALUES ${placeholders}`,
          values
        );
        
        totalImportados += items.length;
      } catch (error) {
        console.error('Erro ao inserir lote:', error.message);
        totalErros += items.length;
      }
    }
    
    // Atualizar progresso
    const progresso = Math.round(((i + batch.length) / rawData.length) * 100);
    await conn.execute(
      'UPDATE arquivos SET progresso = ? WHERE id = ?',
      [progresso, arquivoId]
    );
    
    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= rawData.length) {
      console.log(`Progresso: ${progresso}% - ${totalImportados} itens importados`);
    }
  }
  
  // Atualizar status final
  await conn.execute(
    'UPDATE arquivos SET status = ?, progresso = 100 WHERE id = ?',
    ['processado', arquivoId]
  );
  
  console.log('=== Processamento concluído ===');
  console.log('Total importados:', totalImportados);
  console.log('Total erros:', totalErros);
  
  // Verificar resultado
  const [result] = await conn.execute(
    'SELECT COUNT(*) as total, SUM(valor_liberado) as valor_total FROM recebimento_tiss WHERE arquivo_id = ?',
    [arquivoId]
  );
  console.log('Verificação:', result[0].total, 'registros, R$', (result[0].valor_total / 100).toFixed(2));
  
  await conn.end();
}

main().catch(console.error);
