/**
 * Parser para importar dados de Excel e XML para a tabela recebimento_tiss (estrutura unificada)
 * Mapeia as colunas do Excel da Unimed e XML TISS para os campos da tabela
 * Alinhado com o padrão TISS ANS (XSD v3.00.01) - demonstrativoAnaliseConta e demonstrativoPagamento
 */

import * as XLSX from "xlsx";
import * as xml2js from "xml2js";
import { InsertRecebimentoTiss } from "../drizzle/schema";

// Mapeamento de colunas do Excel para campos da tabela recebimento_tiss (estrutura unificada)
const COLUMN_MAPPINGS: Record<keyof Omit<InsertRecebimentoTiss, 'id' | 'dataImportacao'>, string[]> = {
  // Referência ao arquivo de origem (preenchido externamente)
  arquivoId: [],
  
  // ========== CABEÇALHO DO DEMONSTRATIVO ==========
  registroANS: ["registro_ans", "registroans", "ans"],
  numeroDemonstrativo: ["numero_demonstrativo", "demonstrativo"],
  nomeOperadora: ["Nome Prestador", "nome_operadora", "operadora"],
  cnpjOperadora: ["cnpj_operadora", "cnpj"],
  dataEmissao: ["Data Pagto", "data_emissao", "emissao", "data_pagto"],
  
  // ========== DADOS DO PRESTADOR ==========
  cnes: ["cnes", "CNES"],
  codigoPrestadorOperadora: ["codigo_prestador_operadora", "cod_prestador", "Código Prestador Pagamento"],
  nomeContratado: ["nome_contratado", "nomecontratado"],
  
  // ========== DADOS DO PROTOCOLO/LOTE ==========
  numeroLotePrestador: ["Lote Prestador", "lote_prestador", "loteprestador", "lote", "numero_lote"],
  numeroProtocolo: ["Protocolo TISS", "protocolo_tiss", "protocolotiss", "protocolo", "numero_protocolo"],
  dataProtocolo: ["data_protocolo", "dataprotocolo"],
  valorProtocolo: ["valor_protocolo", "valorprotocolo"],
  valorGlosaProtocolo: ["valor_glosa_protocolo"],
  glosaProtocoloCodigo: ["glosa_protocolo_codigo"],
  glosaProtocoloDescricao: ["glosa_protocolo_descricao"],
  situacaoProtocolo: ["situacao_protocolo", "situacaoprotocolo"],
  valorInformadoProtocolo: ["valor_informado_protocolo"],
  valorProcessadoProtocolo: ["valor_processado_protocolo"],
  valorLiberadoProtocolo: ["valor_liberado_protocolo"],
  valorGlosaProtocoloTotal: ["valor_glosa_protocolo_total"],
  
  // ========== DADOS DA GUIA ==========
  numeroGuiaPrestador: ["Número Guia", "Numero Guia", "numero_guia", "numeroguia", "guia", "num_guia"],
  numeroGuiaOperadora: ["guia_operadora", "guiaoperadora"],
  senha: ["senha", "autorizacao"],
  numeroCarteira: ["Beneficiário", "Beneficiario", "beneficiario", "beneficiário", "carteira", "numero_carteira"],
  nomeBeneficiario: ["Nome Beneficiário", "Nome Beneficiario", "nome_beneficiario", "nomebeneficiario", "paciente"],
  dataInicioFat: ["data_inicio_fat", "datainiciofat", "Data Inicio Faturamento Internação"],
  dataFimFat: ["data_fim_fat", "datafimfat", "Data Fim Faturamento Internação"],
  situacaoGuia: ["situacao_guia", "situacaoguia"],
  motivoGlosaGuiaCodigo: ["motivo_glosa_guia_codigo"],
  motivoGlosaGuiaDescricao: ["motivo_glosa_guia_descricao"],
  valorInformadoGuia: ["valor_informado_guia"],
  valorProcessadoGuia: ["valor_processado_guia"],
  valorLiberadoGuia: ["valor_liberado_guia"],
  valorGlosaGuia: ["valor_glosa_guia"],
  
  // ========== DETALHES DO ITEM ==========
  sequencialItem: ["seq", "sequencial", "sequencial_item", "sequencialitem"],
  dataRealizacao: ["Data Execução", "Data Execucao", "data_execucao", "dataexecucao", "data_realizacao"],
  codigoTabela: ["codigo_tabela", "codigotabela", "tabela"],
  codigoItem: ["Item", "item", "codigo", "cod", "codigo_procedimento", "codigo_item"],
  descricaoItem: ["Item Desc", "item_desc", "itemdesc", "descricao", "descrição", "descricao_item"],
  grauParticipacao: ["grau_participacao", "grauparticipacao"],
  
  // ========== VALORES DO ITEM ==========
  quantidadeExecutada: ["Quantidade", "quantidade", "qtd", "qtde", "quant"],
  valorInformado: ["valor_informado", "valorinformado", "vl_informado"],
  valorProcessado: ["processado", "valor_processado", "valorprocessado", "vl_processado"],
  valorLiberado: ["Valor Pagamento", "valor_pagamento", "valorpagamento", "valor_pago", "valor_liberado"],
  // valorGlosado removido - é VIRTUAL GENERATED no banco (= valor_informado - valor_liberado)
  
  // ========== GLOSA DO ITEM ==========
  codigoGlosa: ["Erro TISS", "erro_tiss", "errotiss", "codigo_glosa", "codigoglosa", "cod_glosa"],
  descricaoGlosa: ["descricao_glosa", "descricaoglosa", "motivo_glosa", "motivoglosa"],
  
  // ========== DADOS DE PAGAMENTO ==========
  dataPagamento: ["data_pagamento", "datapagamento"],
  formaPagamento: ["forma_pagamento", "formapagamento"],
  banco: ["banco"],
  agencia: ["agencia"],
  
  // ========== TOTAIS GERAIS ==========
  valorInformadoGeral: ["valor_informado_geral"],
  valorProcessadoGeral: ["valor_processado_geral"],
  valorLiberadoGeral: ["valor_liberado_geral"],
  valorGlosaGeral: ["valor_glosa_geral"],
  valorFinalReceber: ["valor_final_receber"],
  
  // ========== METADADOS ==========
  origemDado: [], // Preenchido programaticamente
  
  // Campos do upload (preenchidos externamente)
  convenioId: [],
  dataReferencia: [],
  estabelecimentoId: [],

  // Colunas legadas (existem no banco, não mapeadas no parser)
  estabelecimento_id_legacy: [],
  codigoPrestadorPagamento: ["Código Prestador Pagamento", "codigo_prestador_pagamento"],
  nomePrestadorPagamento: ["Nome Prestador Pagamento", "nome_prestador_pagamento"],
  codigoPrestadorExecutante: ["Código Prestador Executante", "codigo_prestador_executante"],
  nomePrestadorExecutante: ["Nome Prestador Executante", "nome_prestador_executante"],
  horaExecucao: ["Hora Execução", "hora_execucao"],
  codigoProcedimento: ["Código Procedimento", "codigo_procedimento_receb"],
  descricaoProcedimento: ["Descrição Procedimento", "descricao_procedimento_receb"],
  tipoLancamento: ["Tipo Lançamento", "tipo_lancamento", "tipolancamento"],
  qtdExecutada: ["Qtd Executada", "qtd_executada"],
  situacaoItem: ["Situação Item", "situacao_item", "situacaoitem", "Situação"],
  codigoSolicitante: ["Código Solicitante", "codigo_solicitante"],
  nomeSolicitante: ["Nome Solicitante", "nome_solicitante"],
  acomodacaoInternacao: ["Acomodação Internação", "acomodacao_internacao"],
  dataInicioInternacao: ["Data Início Internação", "data_inicio_internacao"],
  dataFimInternacao: ["Data Fim Internação", "data_fim_internacao"],
};

/**
 * Normaliza uma string para comparação (remove acentos, espaços, caracteres especiais)
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Parse de data (suporta formato brasileiro DD/MM/YYYY e ISO)
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;
  
  // Se já é uma Date
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return value;
  }
  
  // Se é um número (serial do Excel)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    if (isNaN(date.getTime())) return null;
    return date;
  }
  
  const str = String(value).trim();
  if (!str) return null;
  
  // Formato brasileiro DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(date.getTime())) return null;
    return date;
  }
  
  // Formato ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isNaN(date.getTime())) return null;
    return date;
  }
  
  return null;
}

/**
 * Parse de número
 */
function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  
  if (typeof value === 'number') return value;
  
  const str = String(value)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

export interface RecebimentoTissParseResult {
  success: boolean;
  items: Partial<InsertRecebimentoTiss>[];
  totalRows: number;
  error?: string;
}

/**
 * Parse de arquivo Excel para recebimento_tiss (estrutura unificada)
 */
export async function parseExcelRecebimentoTiss(
  content: Buffer,
  arquivoId: number,
  _estabelecimentoId: number,
  convenioId?: number,
  dataReferencia?: Date,
  dataPagamento?: Date
): Promise<RecebimentoTissParseResult> {
  try {
    console.log(`[RecebimentoTiss Excel Parser] Starting parse, buffer size: ${(content.length / 1024).toFixed(1)} KB`);
    
    const workbook = XLSX.read(content, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
    console.log(`[RecebimentoTiss Excel Parser] Found ${rows.length} rows`);
    
    if (rows.length === 0) {
      return { success: true, items: [], totalRows: 0 };
    }
    
    // Mapear colunas do Excel para campos da tabela
    const headers = Object.keys(rows[0]);
    const columnMap = new Map<string, string>();
    
    for (const header of headers) {
      const normalizedHeader = normalizeKey(header);
      
      for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
        if (aliases.length === 0) continue;
        
        for (const alias of aliases) {
          if (normalizeKey(alias) === normalizedHeader || header === alias) {
            columnMap.set(field, header);
            break;
          }
        }
      }
    }
    
    console.log(`[RecebimentoTiss Excel Parser] Column mappings:`, Object.fromEntries(columnMap));
    
    const items: Partial<InsertRecebimentoTiss>[] = [];
    
    for (const row of rows) {
      const findValue = (field: string): unknown => {
        const excelColumn = columnMap.get(field);
        return excelColumn ? row[excelColumn] : undefined;
      };
      
      const codigo = findValue('codigoItem');
      const descricao = findValue('descricaoItem');
      
      // Pular linhas sem código ou descrição
      if (!codigo && !descricao) continue;
      
      const item: Partial<InsertRecebimentoTiss> = {
        arquivoId,
        
        // Cabeçalho do Demonstrativo
        registroANS: findValue('registroANS') as string | undefined,
        numeroDemonstrativo: findValue('numeroDemonstrativo') as string | undefined,
        nomeOperadora: findValue('nomeOperadora') as string | undefined,
        cnpjOperadora: findValue('cnpjOperadora') as string | undefined,
        dataEmissao: parseDate(findValue('dataEmissao')),
        
        // Dados do Prestador
        cnes: findValue('cnes') as string | undefined,
        codigoPrestadorOperadora: findValue('codigoPrestadorOperadora') as string | undefined,
        nomeContratado: findValue('nomeContratado') as string | undefined,
        
        // Dados do Protocolo/Lote
        numeroLotePrestador: findValue('numeroLotePrestador') as string | undefined,
        numeroProtocolo: findValue('numeroProtocolo') as string | undefined,
        situacaoProtocolo: findValue('situacaoProtocolo') as string | undefined,
        
        // Dados da Guia e Beneficiário
        numeroGuiaPrestador: findValue('numeroGuiaPrestador') as string | undefined,
        numeroGuiaOperadora: findValue('numeroGuiaOperadora') as string | undefined,
        senha: findValue('senha') as string | undefined,
        numeroCarteira: findValue('numeroCarteira') as string | undefined,
        nomeBeneficiario: findValue('nomeBeneficiario') as string | undefined,
        dataInicioFat: parseDate(findValue('dataInicioFat')),
        dataFimFat: parseDate(findValue('dataFimFat')),
        situacaoGuia: findValue('situacaoGuia') as string | undefined,
        
        // Detalhes do Item
        sequencialItem: parseNumber(findValue('sequencialItem')) as number | undefined,
        dataRealizacao: parseDate(findValue('dataRealizacao')),
        codigoTabela: findValue('codigoTabela') as string | undefined,
        codigoItem: codigo as string | undefined,
        descricaoItem: descricao as string | undefined,
        
        // Valores de Conciliação
        quantidadeExecutada: parseNumber(findValue('quantidadeExecutada'))?.toString(),
        valorInformado: parseNumber(findValue('valorInformado'))?.toString(),
        valorProcessado: parseNumber(findValue('valorProcessado'))?.toString(),
        valorLiberado: parseNumber(findValue('valorLiberado'))?.toString(),
        // valorGlosado é VIRTUAL GENERATED no banco (= valor_informado - valor_liberado), não inserir
        
        // Motivos de Glosa
        codigoGlosa: findValue('codigoGlosa') as string | undefined,
        descricaoGlosa: findValue('descricaoGlosa') as string | undefined,
        
        // Metadados
        origemDado: 'excel',
        
        // Campos do upload
        convenioId,
        dataReferencia,
        dataPagamento,
        estabelecimentoId: _estabelecimentoId,
      };
      
      items.push(item);
    }
    
    console.log(`[RecebimentoTiss Excel Parser] Parsed ${items.length} items from ${rows.length} rows`);
    
    return {
      success: true,
      items,
      totalRows: rows.length,
    };
  } catch (error) {
    console.error('[RecebimentoTiss Excel Parser] Error:', error);
    return {
      success: false,
      items: [],
      totalRows: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Parse de arquivo XML de demonstrativo TISS para recebimento_tiss (estrutura unificada)
 * Suporta demonstrativoAnaliseConta e demonstrativoPagamento conforme XSD TISS v3.00.01
 */
export async function parseXmlRecebimentoTiss(
  content: Buffer,
  arquivoId: number,
  estabelecimentoId: number,
  convenioId?: number,
  dataReferencia?: Date,
  dataPagamento?: Date
): Promise<RecebimentoTissParseResult> {
  try {
    console.log('[RecebimentoTiss XML Parser] Starting parse with xml2js, buffer size: ' + (content.length / 1024).toFixed(1) + ' KB');
    
    // Configurar o parser do xml2js para remover prefixos 'ans:' e 'tiss:'
    // const xml2js = require("xml2js");
    const parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
      attrNameProcessors: [xml2js.processors.stripPrefix]
    });
    
    const xmlString = content.toString('utf-8');
    const result = await parser.parseStringPromise(xmlString);
    
    const items: Partial<InsertRecebimentoTiss>[] = [];
    
    const mensagemTISS = result.mensagemTISS;
    if (!mensagemTISS) throw new Error("Raiz <mensagemTISS> não encontrada no XML");
    
    const operadoraParaPrestador = mensagemTISS.operadoraParaPrestador;
    if (!operadoraParaPrestador) throw new Error("Elemento <operadoraParaPrestador> não encontrado no XML");
    
    const demonstrativosRetorno = operadoraParaPrestador.demonstrativosRetorno;
    if (!demonstrativosRetorno) throw new Error("Elemento <demonstrativosRetorno> não encontrado");

    const getText = (node: any): string | undefined => {
      if (node === null || node === undefined) return undefined;
      if (typeof node === 'string') return node.trim();
      if (typeof node === 'number') return String(node);
      if (typeof node === 'object') {
        if ('_' in node) return String(node['_']).trim();
      }
      return undefined;
    };

    let demosAnalise = demonstrativosRetorno.demonstrativoAnaliseConta;
    if (demosAnalise) {
      if (!Array.isArray(demosAnalise)) demosAnalise = [demosAnalise];
      
      for (const demo of demosAnalise) {
        const cabecalho = demo.cabecalhoDemonstrativo || {};
        const registroANS = getText(cabecalho.registroANS);
        const numeroDemonstrativo = getText(cabecalho.numeroDemonstrativo);
        const nomeOperadora = getText(cabecalho.nomeOperadora);
        const cnpjOperadora = getText(cabecalho.numeroCNPJ) || getText(cabecalho.CNPJ);
        const dataEmissaoStr = getText(cabecalho.dataEmissao);
        const dataEmissao = dataEmissaoStr ? parseDate(dataEmissaoStr) : null;
        
        const dadosPrestador = demo.dadosPrestador || demo.dadosContratado?.dadosPrestador || {};
        const cnes = getText(dadosPrestador.CNES) || getText(demo.dadosContratado?.CNES);
        const codigoPrestadorOperadora = getText(dadosPrestador.codigoPrestadorNaOperadora);
        const nomeContratado = getText(dadosPrestador.nomeContratado) || getText(demo.dadosContratado?.nomeContratado);

        const dadosPagamentoNode = demo.dadosPagamento || {};
        const dataPagamentoXmlStr = getText(dadosPagamentoNode.dataPagamento);
        const dataPagamentoXml = dataPagamentoXmlStr ? parseDate(dataPagamentoXmlStr) : dataPagamento;
        const formaPagamento = getText(dadosPagamentoNode.formaPagamento);
        const banco = getText(dadosPagamentoNode.banco);
        const agencia = getText(dadosPagamentoNode.agencia);

        const totaisGerais = demo.totaisDemonstrativo || demo.totais || {};
        const valorInformadoGeral = getText(totaisGerais.valorInformadoGeral) || getText(totaisGerais.valorInformadoBruto);
        const valorProcessadoGeral = getText(totaisGerais.valorProcessadoGeral) || getText(totaisGerais.valorProcessadoBruto);
        const valorLiberadoGeral = getText(totaisGerais.valorLiberadoGeral) || getText(totaisGerais.valorLiberadoBruto);
        const valorGlosaGeral = getText(totaisGerais.valorGlosaGeral) || getText(totaisGerais.valorGlosaBruto);
        const valorFinalReceber = getText(totaisGerais.valorFinalReceber);

        const dadosConta = demo.dadosConta || {};
        let protocolos = dadosConta.dadosProtocolo;
        if (protocolos) {
          if (!Array.isArray(protocolos)) protocolos = [protocolos];
          
          for (const protocolo of protocolos) {
            const numeroLotePrestador = getText(protocolo.numeroLotePrestador) || getText(protocolo.numeroLote);
            const numeroProtocolo = getText(protocolo.numeroProtocolo);
            const dataProtocoloStr = getText(protocolo.dataProtocolo);
            const dataProtocolo = dataProtocoloStr ? parseDate(dataProtocoloStr) : null;
            const valorProtocolo = getText(protocolo.valorProtocolo);
            const situacaoProtocolo = getText(protocolo.situacaoProtocolo);
            const valorInformadoProtocolo = getText(protocolo.valorInformadoProtocolo);
            const valorProcessadoProtocolo = getText(protocolo.valorProcessadoProtocolo);
            const valorLiberadoProtocolo = getText(protocolo.valorLiberadoProtocolo);
            const valorGlosaProtocoloTotal = getText(protocolo.valorGlosaProtocoloTotal);
            const valorGlosaProtocolo = getText(protocolo.valorGlosaProtocolo);

            let glosaProtocoloCodigo: string | undefined;
            let glosaProtocoloDescricao: string | undefined;
            const glosaProtNode = protocolo.GlosaProtocolo || protocolo.motivoGlosaProtocolo;
            if (glosaProtNode) {
              const node = Array.isArray(glosaProtNode) ? glosaProtNode[0] : glosaProtNode;
              glosaProtocoloCodigo = getText(node.codigoGlosa) || getText(node.tipoGlosa);
              glosaProtocoloDescricao = getText(node.descricaoGlosa);
            }

            let guias = protocolo.relacaoGuias || protocolo.dadosGuia;
            if (guias) {
              if (!Array.isArray(guias)) guias = [guias];

              for (const guia of guias) {
                const numeroGuiaPrestador = getText(guia.numeroGuiaPrestador);
                const numeroGuiaOperadora = getText(guia.numeroGuiaOperadora);
                const senha = getText(guia.senha);
                const numeroCarteira = getText(guia.numeroCarteira);
                const nomeBeneficiario = getText(guia.nomeBeneficiario);
                const situacaoGuia = getText(guia.situacaoGuia);
                
                const dataInicioFatStr = getText(guia.dataInicioFat);
                const dataInicioFat = dataInicioFatStr ? parseDate(dataInicioFatStr) : null;
                const dataFimFatStr = getText(guia.dataFimFat);
                const dataFimFat = dataFimFatStr ? parseDate(dataFimFatStr) : null;

                const valorInformadoGuia = getText(guia.valorInformadoGuia);
                const valorProcessadoGuia = getText(guia.valorProcessadoGuia);
                const valorLiberadoGuia = getText(guia.valorLiberadoGuia);
                const valorGlosaGuia = getText(guia.valorGlosaGuia);

                let motivoGlosaGuiaCodigo: string | undefined;
                let motivoGlosaGuiaDescricao: string | undefined;
                const glosaGuiaNode = guia.motivoGlosaGuia || guia.relacaoGlosa;
                if (glosaGuiaNode) {
                  const glosaNode = Array.isArray(glosaGuiaNode) ? glosaGuiaNode[0] : glosaGuiaNode;
                  motivoGlosaGuiaCodigo = getText(glosaNode.codigoGlosa) || getText(glosaNode.tipoGlosa);
                  motivoGlosaGuiaDescricao = getText(glosaNode.descricaoGlosa);
                }

                let itensGuia = guia.detalhesGuia || guia.dadosPagamento;
                if (itensGuia) {
                  if (!Array.isArray(itensGuia)) itensGuia = [itensGuia];

                  for (const item of itensGuia) {
                    const sequencialItem = getText(item.sequencialItem);
                    const dataRealizacaoStr = getText(item.dataRealizacao);
                    const dataRealizacao = dataRealizacaoStr ? parseDate(dataRealizacaoStr) : null;
                    
                    const procNode = item.procedimento || item;
                    const codigoTabela = getText(procNode.codigoTabela);
                    const codigoItem = getText(procNode.codigoProcedimento);
                    const descricaoItem = getText(procNode.descricaoProcedimento);
                    
                    const grauParticipacao = getText(item.grauParticipacao);
                    const quantidadeExecutada = getText(item.quantidadeExecutada) || getText(item.qtdExecutada);
                    const valorInformado = getText(item.valorInformado);
                    const valorProcessado = getText(item.valorProcessado);
                    const valorLiberado = getText(item.valorLiberado);

                    let codigoGlosa: string | undefined;
                    let descricaoGlosa: string | undefined;
                    
                    const relacaoGlosa = item.relacaoGlosa || item.glosaItem; 
                    if (relacaoGlosa) {
                      const glosaNode = Array.isArray(relacaoGlosa) ? relacaoGlosa[0] : relacaoGlosa;
                      codigoGlosa = getText(glosaNode.codigoGlosa) || getText(glosaNode.tipoGlosa);
                      descricaoGlosa = getText(glosaNode.descricaoGlosa);
                    }
                    
                    if (!codigoGlosa && motivoGlosaGuiaCodigo && (Number(valorLiberado || 0) === 0 || Number(getText(guia.valorGlosaGuia) || 0) > 0)) {
                      codigoGlosa = motivoGlosaGuiaCodigo;
                      descricaoGlosa = motivoGlosaGuiaDescricao;
                    }

                    items.push({
                      arquivoId,
                      registroANS, numeroDemonstrativo, nomeOperadora, cnpjOperadora, dataEmissao,
                      cnes, codigoPrestadorOperadora, nomeContratado,
                      numeroLotePrestador, numeroProtocolo, dataProtocolo, valorProtocolo, valorGlosaProtocolo,
                      glosaProtocoloCodigo, glosaProtocoloDescricao, situacaoProtocolo,
                      valorInformadoProtocolo, valorProcessadoProtocolo, valorLiberadoProtocolo, valorGlosaProtocoloTotal,
                      numeroGuiaPrestador, numeroGuiaOperadora, senha, numeroCarteira, nomeBeneficiario,
                      dataInicioFat, dataFimFat, situacaoGuia, motivoGlosaGuiaCodigo, motivoGlosaGuiaDescricao,
                      valorInformadoGuia, valorProcessadoGuia, valorLiberadoGuia, valorGlosaGuia,
                      sequencialItem: sequencialItem ? parseInt(sequencialItem) : undefined,
                      dataRealizacao, codigoTabela, codigoItem, descricaoItem, grauParticipacao,
                      quantidadeExecutada, valorInformado, valorProcessado, valorLiberado,
                      codigoGlosa, descricaoGlosa,
                      dataPagamento: dataPagamentoXml, formaPagamento, banco, agencia,
                      valorInformadoGeral, valorProcessadoGeral, valorLiberadoGeral, valorGlosaGeral, valorFinalReceber,
                      origemDado: 'xml', convenioId, dataReferencia, estabelecimentoId,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    let demosPagamento = demonstrativosRetorno.demonstrativoPagamento;
    if (demosPagamento) {
      if (!Array.isArray(demosPagamento)) demosPagamento = [demosPagamento];
      
      for (const demo of demosPagamento) {
        const cabecalho = demo.cabecalhoDemonstrativo || {};
        const registroANS = getText(cabecalho.registroANS);
        const numeroDemonstrativo = getText(cabecalho.numeroDemonstrativo);
        const nomeOperadora = getText(cabecalho.nomeOperadora);
        const cnpjOperadora = getText(cabecalho.numeroCNPJ) || getText(cabecalho.CNPJ);
        const dataEmissaoStr = getText(cabecalho.dataEmissao);
        const dataEmissao = dataEmissaoStr ? parseDate(dataEmissaoStr) : null;
        
        let pagamentos = demo.pagamentos;
        if (pagamentos && pagamentos.pagamentosPorData) {
          let listaPagtos = pagamentos.pagamentosPorData;
          if (!Array.isArray(listaPagtos)) listaPagtos = [listaPagtos];
          
          for (const pagto of listaPagtos) {
            const dadosPagamentoNode = pagto.dadosPagamento || {};
            const dataPagamentoXmlStr = getText(dadosPagamentoNode.dataPagamento);
            const dataPagamentoXml = dataPagamentoXmlStr ? parseDate(dataPagamentoXmlStr) : dataPagamento;
            
            const resumo = pagto.dadosResumo || {};
            let protocolos = resumo.relacaoProtocolos;
            if (protocolos) {
              if (!Array.isArray(protocolos)) protocolos = [protocolos];
              for (const protocolo of protocolos) {
                const numeroProtocolo = getText(protocolo.numeroProtocolo);
                const numeroLote = getText(protocolo.numeroLotePrestador) || getText(protocolo.numeroLote);
                const dataProtocoloStr = getText(protocolo.dataProtocolo);
                const dataProtocolo = dataProtocoloStr ? parseDate(dataProtocoloStr) : null;
                const valorInformadoProtocolo = getText(protocolo.valorInformado);
                const valorProcessadoProtocolo = getText(protocolo.valorProcessado);
                const valorLiberadoProtocolo = getText(protocolo.valorLiberado);
                const valorGlosaProtocoloTotal = getText(protocolo.valorGlosa);

                let guias = protocolo.guiasDoLote;
                if (!guias) {
                    items.push({
                      arquivoId, registroANS, numeroDemonstrativo, nomeOperadora, cnpjOperadora, dataEmissao,
                      numeroLotePrestador: numeroLote, numeroProtocolo, dataProtocolo,
                      valorInformadoProtocolo, valorProcessadoProtocolo, valorLiberadoProtocolo, valorGlosaProtocoloTotal,
                      dataPagamento: dataPagamentoXml, origemDado: 'xml', convenioId, dataReferencia, estabelecimentoId,
                    });
                } else {
                    if (!Array.isArray(guias)) guias = [guias];
                    for (const guia of guias) {
                        const numeroGuiaPrestador = getText(guia.numeroGuiaPrestador);
                        const numeroGuiaOperadora = getText(guia.numeroGuiaOperadora);
                        const tipoPagamento = getText(guia.tipoPagamento);
                        const valorProcessadoGuia = getText(guia.valorProcessadoGuia);
                        const valorLiberadoGuia = getText(guia.valorLiberadoGuia);
                        const valorGlosaGuia = getText(guia.valorGlosaGuia);

                        items.push({
                            arquivoId, registroANS, numeroDemonstrativo, nomeOperadora, cnpjOperadora, dataEmissao,
                            numeroLotePrestador: numeroLote, numeroProtocolo, dataProtocolo,
                            valorInformadoProtocolo, valorProcessadoProtocolo, valorLiberadoProtocolo, valorGlosaProtocoloTotal,
                            numeroGuiaPrestador, numeroGuiaOperadora, valorProcessadoGuia, valorLiberadoGuia, valorGlosaGuia,
                            codigoItem: numeroGuiaOperadora || numeroGuiaPrestador || 'RESUMO', 
                            valorLiberado: valorLiberadoGuia, 
                            dataPagamento: dataPagamentoXml, origemDado: 'xml', convenioId, dataReferencia, estabelecimentoId,
                        });
                    }
                }
              }
            }
          }
        }
      }
    }
    
    console.log('[RecebimentoTiss XML Parser] Parsed ' + items.length + ' items');
    
    return {
      success: true,
      items,
      totalRows: items.length,
    };
  } catch (error) {
    console.error('[RecebimentoTiss XML Parser] Error:', error);
    return {
      success: false,
      items: [],
      totalRows: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
