const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');
require('dotenv').config();

// Função para baixar arquivo
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Função para extrair texto de uma tag XML
function getTagValue(xml, tagName) {
  const regex = new RegExp(`<ans:${tagName}>([^<]*)</ans:${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Função para extrair todas as guias do XML
function extractGuias(xml) {
  const guias = [];
  
  // Extrair dados do cabeçalho
  const sequencialTransacao = getTagValue(xml, 'sequencialTransacao');
  const dataRegistro = getTagValue(xml, 'dataRegistroTransacao');
  const registroAns = getTagValue(xml, 'registroANS');
  const numeroLote = getTagValue(xml, 'numeroLote');
  
  // Encontrar todas as guias (SP-SADT, consulta, internação, etc.)
  const guiaPatterns = [
    /<ans:guiaSP-SADT>([\s\S]*?)<\/ans:guiaSP-SADT>/gi,
    /<ans:guiaConsulta>([\s\S]*?)<\/ans:guiaConsulta>/gi,
    /<ans:guiaInternacao>([\s\S]*?)<\/ans:guiaInternacao>/gi,
    /<ans:guiaHonorarios>([\s\S]*?)<\/ans:guiaHonorarios>/gi
  ];
  
  for (const pattern of guiaPatterns) {
    let match;
    while ((match = pattern.exec(xml)) !== null) {
      const guiaXml = match[1];
      
      // Dados da guia
      const numeroGuiaPrestador = getTagValue(guiaXml, 'numeroGuiaPrestador');
      const numeroGuiaOperadora = getTagValue(guiaXml, 'numeroGuiaOperadora');
      const senha = getTagValue(guiaXml, 'senha');
      const carteiraBeneficiario = getTagValue(guiaXml, 'numeroCarteira');
      
      // Calcular valor total da guia
      let valorTotalGuia = 0;
      
      // Extrair procedimentos executados
      const procPattern = /<ans:procedimentoExecutado>([\s\S]*?)<\/ans:procedimentoExecutado>/gi;
      let procMatch;
      while ((procMatch = procPattern.exec(guiaXml)) !== null) {
        const procXml = procMatch[1];
        
        const sequencialItem = getTagValue(procXml, 'sequencialItem');
        const dataExecucao = getTagValue(procXml, 'dataExecucao');
        const codigoTabela = getTagValue(procXml, 'codigoTabela');
        const codigoProcedimento = getTagValue(procXml, 'codigoProcedimento');
        const descricaoProcedimento = getTagValue(procXml, 'descricaoProcedimento');
        const quantidade = getTagValue(procXml, 'quantidadeExecutada');
        const valorUnitario = getTagValue(procXml, 'valorUnitario');
        const valorTotal = getTagValue(procXml, 'valorTotal');
        
        // Extrair dados do profissional (equipeSadt)
        // Procurar equipeSadt dentro do procedimento ou na guia
        const equipeSadtMatch = procXml.match(/<ans:equipeSadt>([\s\S]*?)<\/ans:equipeSadt>/i);
        let nomeProf = null;
        let numeroConselho = null;
        
        if (equipeSadtMatch) {
          const equipeSadtXml = equipeSadtMatch[1];
          nomeProf = getTagValue(equipeSadtXml, 'nomeProf');
          // conselho = código do conselho (ex: 06 = CRM)
          // numeroConselhoProfissional = número do registro (ex: 11382)
          numeroConselho = getTagValue(equipeSadtXml, 'numeroConselhoProfissional');
        } else {
          // Fallback para buscar diretamente
          nomeProf = getTagValue(procXml, 'nomeProf');
          numeroConselho = getTagValue(procXml, 'numeroConselhoProfissional');
        }
        
        const valorTotalNum = parseFloat(valorTotal) || 0;
        valorTotalGuia += valorTotalNum;
        
        guias.push({
          numeroLote,
          sequencialTransacao,
          dataRegistro,
          registroAns,
          numeroGuiaPrestador,
          numeroGuiaOperadora,
          senha,
          carteiraBeneficiario,
          tipoItem: 'PROCEDIMENTO',
          sequencialItem: parseInt(sequencialItem) || 0,
          dataExecucao,
          codigoTabela,
          codigoItem: codigoProcedimento,
          descricaoItem: descricaoProcedimento,
          quantidade: parseFloat(quantidade) || 1,
          valorUnitario: parseFloat(valorUnitario) || 0,
          valorFaturado: valorTotalNum,
          nomeProf,
          conselhoProf: numeroConselho,
          valorTotalGuia: 0 // Será atualizado depois
        });
      }
      
      // Extrair despesas (medicamentos, materiais, taxas, etc.)
      const despesaPattern = /<ans:despesa>([\s\S]*?)<\/ans:despesa>/gi;
      let despMatch;
      while ((despMatch = despesaPattern.exec(guiaXml)) !== null) {
        const despXml = despMatch[1];
        
        const sequencialItem = getTagValue(despXml, 'sequencialItem');
        const codigoDespesa = getTagValue(despXml, 'codigoDespesa');
        
        // Tentar extrair de servicosExecutados ou identEquipamento
        const dataExecucao = getTagValue(despXml, 'dataExecucao');
        const codigoTabela = getTagValue(despXml, 'codigoTabela');
        const codigoProcedimento = getTagValue(despXml, 'codigoProcedimento') || getTagValue(despXml, 'codigoItem');
        const descricao = getTagValue(despXml, 'descricaoProcedimento') || getTagValue(despXml, 'descricaoItem');
        const quantidade = getTagValue(despXml, 'quantidadeExecutada') || getTagValue(despXml, 'quantidade');
        const valorUnitario = getTagValue(despXml, 'valorUnitario');
        const valorTotal = getTagValue(despXml, 'valorTotal');
        
        // Mapear código de despesa para tipo
        const tipoMap = {
          '01': 'GASES_MEDICINAIS',
          '02': 'MEDICAMENTOS',
          '03': 'MATERIAIS',
          '05': 'DIARIAS',
          '07': 'TAXAS',
          '08': 'ALUGUEIS'
        };
        const tipoItem = tipoMap[codigoDespesa] || 'DESPESA';
        
        const valorTotalNum = parseFloat(valorTotal) || 0;
        valorTotalGuia += valorTotalNum;
        
        guias.push({
          numeroLote,
          sequencialTransacao,
          dataRegistro,
          registroAns,
          numeroGuiaPrestador,
          numeroGuiaOperadora,
          senha,
          carteiraBeneficiario,
          tipoItem,
          sequencialItem: parseInt(sequencialItem) || 0,
          dataExecucao,
          codigoTabela,
          codigoItem: codigoProcedimento,
          descricaoItem: descricao,
          quantidade: parseFloat(quantidade) || 1,
          valorUnitario: parseFloat(valorUnitario) || 0,
          valorFaturado: valorTotalNum,
          nomeProf: null,
          conselhoProf: null,
          valorTotalGuia: 0
        });
      }
      
      // Atualizar valor total da guia em todos os itens desta guia
      const startIdx = guias.length - guias.filter(g => g.numeroGuiaPrestador === numeroGuiaPrestador && g.numeroLote === numeroLote).length;
      for (let i = startIdx; i < guias.length; i++) {
        if (guias[i].numeroGuiaPrestador === numeroGuiaPrestador && guias[i].numeroLote === numeroLote) {
          guias[i].valorTotalGuia = valorTotalGuia;
        }
      }
    }
  }
  
  return guias;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('=== Reprocessamento da Tabela faturamento_tiss ===');
  console.log('');
  
  // Limpar tabela
  console.log('Limpando tabela faturamento_tiss...');
  await conn.query('DELETE FROM faturamento_tiss');
  
  // Buscar todos os arquivos XML enviados
  const [arquivos] = await conn.query(`
    SELECT id, nome, s3Url, estabelecimentoId 
    FROM arquivos 
    WHERE direcao = 'enviado' 
    ORDER BY id
  `);
  
  console.log(`Total de arquivos a processar: ${arquivos.length}`);
  console.log('');
  
  let totalItens = 0;
  let arquivosProcessados = 0;
  let arquivosComErro = 0;
  
  for (const arquivo of arquivos) {
    try {
      // Baixar arquivo
      const xmlContent = await downloadFile(arquivo.s3Url);
      
      // Extrair itens
      const itens = extractGuias(xmlContent);
      
      if (itens.length > 0) {
        // Inserir itens no banco
        for (const item of itens) {
          await conn.query(`
            INSERT INTO faturamento_tiss (
              estabelecimento_id, numero_lote, sequencial_transacao, data_registro, registro_ans,
              numero_guia_prestador, numero_guia_operadora, senha, carteira_beneficiario,
              tipo_item, sequencial_item, data_execucao, codigo_tabela, codigo_item,
              descricao_item, quantidade, valor_unitario, valor_faturado,
              nome_prof, conselho_prof, valor_total_geral_guia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            arquivo.estabelecimentoId,
            item.numeroLote || null,
            item.sequencialTransacao || null,
            item.dataRegistro || null,
            item.registroAns || null,
            item.numeroGuiaPrestador || null,
            item.numeroGuiaOperadora || null,
            item.senha || null,
            item.carteiraBeneficiario || null,
            item.tipoItem || null,
            item.sequencialItem || null,
            item.dataExecucao || null,
            item.codigoTabela || null,
            item.codigoItem || null,
            item.descricaoItem || null,
            item.quantidade || null,
            item.valorUnitario || null,
            item.valorFaturado || null,
            item.nomeProf || null,
            item.conselhoProf || null,
            item.valorTotalGuia || null
          ]);
        }
        
        totalItens += itens.length;
      }
      
      arquivosProcessados++;
      
      if (arquivosProcessados % 50 === 0) {
        console.log(`Processados: ${arquivosProcessados}/${arquivos.length} arquivos | ${totalItens} itens`);
      }
      
    } catch (err) {
      arquivosComErro++;
      console.error(`Erro no arquivo ${arquivo.id} (${arquivo.nome}): ${err.message}`);
    }
  }
  
  console.log('');
  console.log('=== Resultado Final ===');
  console.log(`Arquivos processados: ${arquivosProcessados}`);
  console.log(`Arquivos com erro: ${arquivosComErro}`);
  console.log(`Total de itens inseridos: ${totalItens}`);
  
  // Verificar campos preenchidos
  const [stats] = await conn.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN sequencial_transacao IS NOT NULL AND sequencial_transacao != '' THEN 1 ELSE 0 END) as seq_preenchido,
      SUM(CASE WHEN numero_guia_prestador IS NOT NULL AND numero_guia_prestador != '' THEN 1 ELSE 0 END) as guia_prest_preenchido,
      SUM(CASE WHEN numero_guia_operadora IS NOT NULL AND numero_guia_operadora != '' THEN 1 ELSE 0 END) as guia_oper_preenchido,
      SUM(CASE WHEN senha IS NOT NULL AND senha != '' THEN 1 ELSE 0 END) as senha_preenchido,
      SUM(CASE WHEN nome_prof IS NOT NULL AND nome_prof != '' THEN 1 ELSE 0 END) as nome_prof_preenchido,
      SUM(CASE WHEN conselho_prof IS NOT NULL AND conselho_prof != '' THEN 1 ELSE 0 END) as conselho_preenchido,
      SUM(valor_faturado) as valor_total
    FROM faturamento_tiss
  `);
  
  const s = stats[0];
  console.log('');
  console.log('=== Verificação de Campos ===');
  console.log(`sequencial_transacao: ${s.seq_preenchido}/${s.total} (${((s.seq_preenchido/s.total)*100).toFixed(1)}%)`);
  console.log(`numero_guia_prestador: ${s.guia_prest_preenchido}/${s.total} (${((s.guia_prest_preenchido/s.total)*100).toFixed(1)}%)`);
  console.log(`numero_guia_operadora: ${s.guia_oper_preenchido}/${s.total} (${((s.guia_oper_preenchido/s.total)*100).toFixed(1)}%)`);
  console.log(`senha: ${s.senha_preenchido}/${s.total} (${((s.senha_preenchido/s.total)*100).toFixed(1)}%)`);
  console.log(`nome_prof: ${s.nome_prof_preenchido}/${s.total} (${((s.nome_prof_preenchido/s.total)*100).toFixed(1)}%)`);
  console.log(`conselho_prof: ${s.conselho_preenchido}/${s.total} (${((s.conselho_preenchido/s.total)*100).toFixed(1)}%)`);
  console.log(`Valor total faturado: R$ ${Number(s.valor_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
  
  await conn.end();
  console.log('');
  console.log('Reprocessamento concluído!');
}

main().catch(console.error);
