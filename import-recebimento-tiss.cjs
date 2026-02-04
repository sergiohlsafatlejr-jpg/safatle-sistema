/**
 * Script para importar dados de arquivos de retorno (XML e Excel) para a tabela recebimento_tiss
 * Processa todos os arquivos com direcao = 'retornado' que ainda não foram importados
 */

const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
require('dotenv').config();

// Mapeamento de colunas do Excel para campos do banco
const COLUMN_MAPPINGS = {
  dataPagamento: ['Data Pagto', 'Data Pagamento', 'DT_PAGAMENTO', 'DATA_PAGTO'],
  valorProcessado: ['Processado', 'Valor Processado', 'VL_PROCESSADO'],
  numeroProtocolo: ['Protocolo TISS', 'Protocolo', 'NR_PROTOCOLO', 'PROTOCOLO'],
  numeroLotePrestador: ['Lote Prestador', 'Lote', 'NR_LOTE', 'LOTE_PRESTADOR'],
  codigoPrestadorPagamento: ['Código Prestador Pagamento', 'Codigo Prestador Pagamento', 'CD_PRESTADOR_PAGTO'],
  nomePrestadorPagamento: ['Nome Prestador Pagamento', 'Prestador Pagamento', 'NM_PRESTADOR_PAGTO'],
  numeroGuiaPrestador: ['Número Guia', 'Numero Guia', 'NR_GUIA', 'GUIA'],
  sequencialItem: ['Seq', 'Sequencial', 'SEQ_ITEM'],
  numeroCarteira: ['Beneficiário', 'Beneficiario', 'NR_CARTEIRA', 'CARTEIRA'],
  nomeBeneficiario: ['Nome Beneficiário', 'Nome Beneficiario', 'NM_BENEFICIARIO'],
  dataRealizacao: ['Data Execução', 'Data Execucao', 'DT_EXECUCAO', 'DATA_REALIZACAO'],
  horaExecucao: ['Hora Execução', 'Hora Execucao', 'HR_EXECUCAO'],
  codigoProcedimento: ['Item', 'Código Item', 'CD_ITEM', 'CODIGO_PROCEDIMENTO'],
  descricaoProcedimento: ['Item Desc', 'Descrição Item', 'DS_ITEM', 'DESCRICAO'],
  qtdExecutada: ['Quantidade', 'Qtd', 'QTD_EXECUTADA'],
  valorLiberado: ['Valor Pagamento', 'Valor Pago', 'VL_PAGAMENTO', 'VL_LIBERADO'],
  tipoLancamento: ['Tipo Lançamento', 'Tipo Lancamento', 'TP_LANCAMENTO'],
  codigoGlosa: ['Erro TISS', 'Código Glosa', 'CD_GLOSA', 'ERRO_TISS'],
  situacaoItem: ['Situação Item', 'Situacao Item', 'ST_ITEM', 'SITUACAO'],
  codigoSolicitante: ['Código Solicitante', 'Codigo Solicitante', 'CD_SOLICITANTE'],
  nomeSolicitante: ['Nome Solicitante', 'NM_SOLICITANTE'],
  acomodacaoInternacao: ['Acomodação da Internação', 'Acomodacao Internacao', 'ACOMODACAO'],
  dataInicioFaturamentoInternacao: ['Data Inicio Faturamento Internação', 'DT_INICIO_FAT'],
  dataFimFaturamentoInternacao: ['Data Fim Faturamento Internação', 'DT_FIM_FAT'],
  codigoPrestadorExecutante: ['Código Prestador', 'Codigo Prestador Executante', 'CD_PRESTADOR_EXEC'],
  nomePrestadorExecutante: ['Nome Prestador Prestador Executante', 'Nome Prestador Executante', 'NM_PRESTADOR_EXEC'],
};

// Função para baixar arquivo de URL
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Função para extrair texto de tag XML
function extractXmlValue(xml, tagName) {
  const regex = new RegExp(`<ans:${tagName}>([^<]*)</ans:${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Função para parsear data
function parseDate(value) {
  if (!value) return null;
  
  // Se já é uma data válida
  if (value instanceof Date && !isNaN(value)) {
    return value;
  }
  
  // String no formato YYYY-MM-DD
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value.substring(0, 10));
  }
  
  // String no formato DD/MM/YYYY
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(value)) {
    const [d, m, y] = value.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  
  // Número (Excel serial date)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }
  
  return null;
}

// Função para parsear número
function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  
  // Remover formatação brasileira
  const cleaned = String(value)
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Parser de XML de retorno TISS
async function parseXmlRetorno(xmlContent, arquivoId, estabelecimentoId) {
  const items = [];
  
  // Extrair dados do cabeçalho
  const numeroDemonstrativo = extractXmlValue(xmlContent, 'numeroDemonstrativo');
  const nomeOperadora = extractXmlValue(xmlContent, 'nomeOperadora');
  const cnpjOperadora = extractXmlValue(xmlContent, 'numeroCNPJ') || extractXmlValue(xmlContent, 'cnpjOperadora');
  const dataEmissao = parseDate(extractXmlValue(xmlContent, 'dataEmissao'));
  
  // Extrair dados do protocolo
  const numeroLotePrestador = extractXmlValue(xmlContent, 'numeroLotePrestador');
  const numeroProtocolo = extractXmlValue(xmlContent, 'numeroProtocolo');
  const situacaoProtocolo = extractXmlValue(xmlContent, 'situacaoProtocolo');
  
  // Processar cada guia
  const guiasRegex = /<ans:relacaoGuias>([\s\S]*?)<\/ans:relacaoGuias>/g;
  let guiaMatch;
  
  while ((guiaMatch = guiasRegex.exec(xmlContent)) !== null) {
    const guiaXml = guiaMatch[1];
    
    const numeroGuiaPrestador = extractXmlValue(guiaXml, 'numeroGuiaPrestador');
    const numeroGuiaOperadora = extractXmlValue(guiaXml, 'numeroGuiaOperadora');
    const senha = extractXmlValue(guiaXml, 'senha');
    const nomeBeneficiario = extractXmlValue(guiaXml, 'nomeBeneficiario');
    const numeroCarteira = extractXmlValue(guiaXml, 'numeroCarteira');
    const situacaoGuia = extractXmlValue(guiaXml, 'situacaoGuia');
    const dataInicioFat = parseDate(extractXmlValue(guiaXml, 'dataInicioFat'));
    const dataFimFat = parseDate(extractXmlValue(guiaXml, 'dataFimFat'));
    
    // Processar cada detalhe da guia (procedimento)
    const detalhesRegex = /<ans:detalhesGuia>([\s\S]*?)<\/ans:detalhesGuia>/g;
    let detalheMatch;
    let sequencial = 0;
    
    while ((detalheMatch = detalhesRegex.exec(guiaXml)) !== null) {
      const detalheXml = detalheMatch[1];
      sequencial++;
      
      const dataRealizacao = parseDate(extractXmlValue(detalheXml, 'dataRealizacao'));
      const codigoTabela = extractXmlValue(detalheXml, 'codigoTabela');
      const codigoProcedimento = extractXmlValue(detalheXml, 'codigoProcedimento');
      const descricaoProcedimento = extractXmlValue(detalheXml, 'descricaoProcedimento');
      const valorInformado = parseNumber(extractXmlValue(detalheXml, 'valorInformado'));
      const valorProcessado = parseNumber(extractXmlValue(detalheXml, 'valorProcessado'));
      const valorLiberado = parseNumber(extractXmlValue(detalheXml, 'valorLiberado'));
      const qtdExecutada = parseNumber(extractXmlValue(detalheXml, 'qtdExecutada')) || 1;
      const codigoGlosa = extractXmlValue(detalheXml, 'codigoGlosa');
      const descricaoGlosa = extractXmlValue(detalheXml, 'descricaoGlosa');
      
      items.push({
        arquivoId,
        estabelecimentoId,
        numeroDemonstrativo,
        nomeOperadora,
        cnpjOperadora,
        dataEmissao,
        numeroLotePrestador,
        numeroProtocolo,
        situacaoProtocolo,
        numeroGuiaPrestador,
        numeroGuiaOperadora,
        senha,
        numeroCarteira,
        nomeBeneficiario,
        situacaoGuia,
        sequencialItem: sequencial,
        dataRealizacao,
        codigoTabela,
        codigoProcedimento,
        descricaoProcedimento,
        valorInformado: valorInformado?.toString(),
        valorProcessado: valorProcessado?.toString(),
        valorLiberado: valorLiberado?.toString(),
        qtdExecutada,
        codigoGlosa,
        descricaoGlosa,
        dataInicioFaturamentoInternacao: dataInicioFat,
        dataFimFaturamentoInternacao: dataFimFat,
        situacaoItem: codigoGlosa ? 'GLOSADO' : (valorLiberado > 0 ? 'PAGO' : 'PENDENTE'),
      });
    }
  }
  
  return items;
}

// Parser de Excel de retorno
async function parseExcelRetorno(buffer, arquivoId, estabelecimentoId) {
  const items = [];
  
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length < 2) return items;
  
  // Primeira linha são os cabeçalhos
  const headers = data[0].map(h => String(h || '').trim());
  
  // Função para encontrar índice de coluna
  const findColumnIndex = (possibleNames) => {
    for (const name of possibleNames) {
      const idx = headers.findIndex(h => 
        h.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(h.toLowerCase())
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };
  
  // Mapear índices das colunas
  const columnIndices = {};
  for (const [field, names] of Object.entries(COLUMN_MAPPINGS)) {
    columnIndices[field] = findColumnIndex(names);
  }
  
  // Processar cada linha de dados
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const getValue = (field) => {
      const idx = columnIndices[field];
      return idx >= 0 ? row[idx] : null;
    };
    
    const dataPagamento = parseDate(getValue('dataPagamento'));
    const valorProcessado = parseNumber(getValue('valorProcessado'));
    const valorLiberado = parseNumber(getValue('valorLiberado'));
    
    // Pular linhas sem dados relevantes
    if (!getValue('numeroGuiaPrestador') && !getValue('codigoProcedimento')) continue;
    
    items.push({
      arquivoId,
      estabelecimentoId,
      dataPagamento,
      valorProcessado: valorProcessado?.toString(),
      numeroProtocolo: getValue('numeroProtocolo')?.toString(),
      numeroLotePrestador: getValue('numeroLotePrestador')?.toString(),
      codigoPrestadorPagamento: getValue('codigoPrestadorPagamento')?.toString(),
      nomePrestadorPagamento: getValue('nomePrestadorPagamento')?.toString(),
      numeroGuiaPrestador: getValue('numeroGuiaPrestador')?.toString(),
      sequencialItem: parseNumber(getValue('sequencialItem')),
      numeroCarteira: getValue('numeroCarteira')?.toString(),
      nomeBeneficiario: getValue('nomeBeneficiario')?.toString(),
      dataRealizacao: parseDate(getValue('dataRealizacao')),
      horaExecucao: getValue('horaExecucao')?.toString(),
      codigoProcedimento: getValue('codigoProcedimento')?.toString(),
      descricaoProcedimento: getValue('descricaoProcedimento')?.toString(),
      qtdExecutada: parseNumber(getValue('qtdExecutada')) || 1,
      valorLiberado: valorLiberado?.toString(),
      tipoLancamento: getValue('tipoLancamento')?.toString(),
      codigoGlosa: getValue('codigoGlosa')?.toString(),
      situacaoItem: getValue('situacaoItem')?.toString(),
      codigoSolicitante: getValue('codigoSolicitante')?.toString(),
      nomeSolicitante: getValue('nomeSolicitante')?.toString(),
      acomodacaoInternacao: getValue('acomodacaoInternacao')?.toString(),
      dataInicioFaturamentoInternacao: parseDate(getValue('dataInicioFaturamentoInternacao')),
      dataFimFaturamentoInternacao: parseDate(getValue('dataFimFaturamentoInternacao')),
      codigoPrestadorExecutante: getValue('codigoPrestadorExecutante')?.toString(),
      nomePrestadorExecutante: getValue('nomePrestadorExecutante')?.toString(),
    });
  }
  
  return items;
}

// Função principal
async function main() {
  console.log('=== Importação de Arquivos de Retorno para recebimento_tiss ===\n');
  
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Buscar arquivos de retorno
    const [arquivos] = await conn.query(`
      SELECT id, nome, tipoArquivo, s3Url, estabelecimentoId, convenioId
      FROM arquivos 
      WHERE direcao = 'retornado'
      ORDER BY id
    `);
    
    console.log(`Total de arquivos de retorno: ${arquivos.length}\n`);
    
    // Verificar quantos itens já existem na tabela
    const [countResult] = await conn.query('SELECT COUNT(*) as total FROM recebimento_tiss');
    const existingCount = countResult[0].total;
    console.log(`Itens já existentes na tabela: ${existingCount}\n`);
    
    // Limpar tabela se houver dados antigos (opcional)
    if (existingCount > 0) {
      console.log('Limpando dados antigos...');
      await conn.query('DELETE FROM recebimento_tiss');
      console.log('Tabela limpa.\n');
    }
    
    let totalImportados = 0;
    let arquivosProcessados = 0;
    let arquivosComErro = 0;
    
    for (const arquivo of arquivos) {
      console.log(`\n[${arquivosProcessados + 1}/${arquivos.length}] Processando: ${arquivo.nome}`);
      
      try {
        // Baixar arquivo
        const buffer = await downloadFile(arquivo.s3Url);
        console.log(`  Tamanho: ${(buffer.length / 1024).toFixed(1)} KB`);
        
        let items = [];
        
        if (arquivo.tipoArquivo === 'xml') {
          const xmlContent = buffer.toString('utf-8');
          items = await parseXmlRetorno(xmlContent, arquivo.id, arquivo.estabelecimentoId);
        } else if (arquivo.tipoArquivo === 'excel') {
          items = await parseExcelRetorno(buffer, arquivo.id, arquivo.estabelecimentoId);
        }
        
        console.log(`  Itens extraídos: ${items.length}`);
        
        if (items.length > 0) {
          // Inserir em lotes
          const BATCH_SIZE = 500;
          for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            
            // Preparar valores para inserção
            const columns = [
              'arquivo_id', 'estabelecimento_id', 'numero_demonstrativo', 'nome_operadora',
              'cnpj_operadora', 'data_emissao', 'data_pagamento', 'numero_lote_prestador',
              'numero_protocolo', 'situacao_protocolo', 'codigo_prestador_pagamento',
              'nome_prestador_pagamento', 'codigo_prestador_executante', 'nome_prestador_executante',
              'numero_guia_prestador', 'numero_guia_operadora', 'senha', 'numero_carteira',
              'nome_beneficiario', 'situacao_guia', 'sequencial_item', 'data_realizacao',
              'hora_execucao', 'codigo_tabela', 'codigo_procedimento', 'descricao_procedimento',
              'tipo_lancamento', 'valor_informado', 'valor_processado', 'valor_liberado',
              'qtd_executada', 'codigo_glosa', 'descricao_glosa', 'situacao_item',
              'codigo_solicitante', 'nome_solicitante', 'acomodacao_internacao',
              'data_inicio_internacao', 'data_fim_internacao'
            ];
            
            const placeholders = batch.map(() => 
              `(${columns.map(() => '?').join(', ')})`
            ).join(', ');
            
            const values = batch.flatMap(item => [
              item.arquivoId,
              item.estabelecimentoId,
              item.numeroDemonstrativo || null,
              item.nomeOperadora || null,
              item.cnpjOperadora || null,
              item.dataEmissao || null,
              item.dataPagamento || null,
              item.numeroLotePrestador || null,
              item.numeroProtocolo || null,
              item.situacaoProtocolo || null,
              item.codigoPrestadorPagamento || null,
              item.nomePrestadorPagamento || null,
              item.codigoPrestadorExecutante || null,
              item.nomePrestadorExecutante || null,
              item.numeroGuiaPrestador || null,
              item.numeroGuiaOperadora || null,
              item.senha || null,
              item.numeroCarteira || null,
              item.nomeBeneficiario || null,
              item.situacaoGuia || null,
              item.sequencialItem || null,
              item.dataRealizacao || null,
              item.horaExecucao || null,
              item.codigoTabela || null,
              item.codigoProcedimento || null,
              item.descricaoProcedimento || null,
              item.tipoLancamento || null,
              item.valorInformado || null,
              item.valorProcessado || null,
              item.valorLiberado || null,
              item.qtdExecutada || null,
              item.codigoGlosa || null,
              item.descricaoGlosa || null,
              item.situacaoItem || null,
              item.codigoSolicitante || null,
              item.nomeSolicitante || null,
              item.acomodacaoInternacao || null,
              item.dataInicioFaturamentoInternacao || null,
              item.dataFimFaturamentoInternacao || null,
            ]);
            
            await conn.query(
              `INSERT INTO recebimento_tiss (${columns.join(', ')}) VALUES ${placeholders}`,
              values
            );
          }
          
          totalImportados += items.length;
          console.log(`  ✓ Importados: ${items.length} itens`);
        }
        
        arquivosProcessados++;
      } catch (error) {
        console.error(`  ✗ Erro: ${error.message}`);
        arquivosComErro++;
      }
    }
    
    // Estatísticas finais
    console.log('\n=== Resumo da Importação ===');
    console.log(`Arquivos processados: ${arquivosProcessados}`);
    console.log(`Arquivos com erro: ${arquivosComErro}`);
    console.log(`Total de itens importados: ${totalImportados}`);
    
    // Verificar totais por tipo
    const [stats] = await conn.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT arquivo_id) as arquivos,
        SUM(CAST(valor_liberado AS DECIMAL(15,2))) as valorTotal,
        SUM(CASE WHEN situacao_item = 'PAGO' THEN 1 ELSE 0 END) as pagos,
        SUM(CASE WHEN situacao_item = 'GLOSADO' OR codigo_glosa IS NOT NULL THEN 1 ELSE 0 END) as glosados
      FROM recebimento_tiss
    `);
    
    console.log('\n=== Estatísticas da Tabela ===');
    console.log(`Total de itens: ${stats[0].total}`);
    console.log(`Arquivos distintos: ${stats[0].arquivos}`);
    console.log(`Valor total liberado: R$ ${(stats[0].valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
    console.log(`Itens pagos: ${stats[0].pagos}`);
    console.log(`Itens glosados: ${stats[0].glosados}`);
    
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
