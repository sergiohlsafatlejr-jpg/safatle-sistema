/**
 * Parser para importar dados de Excel e XML para a tabela recebimento_tiss (estrutura unificada)
 * Mapeia as colunas do Excel da Unimed e XML TISS para os campos da tabela
 */

import * as XLSX from "xlsx";
import { InsertRecebimentoTiss } from "../drizzle/schema";

// Mapeamento de colunas do Excel para campos da tabela recebimento_tiss (estrutura unificada)
const COLUMN_MAPPINGS: Record<keyof Omit<InsertRecebimentoTiss, 'id' | 'dataImportacao'>, string[]> = {
  // Referência ao arquivo de origem (preenchido externamente)
  arquivoId: [],
  
  // Identificação da Operadora/Demonstrativo
  numeroDemonstrativo: ["numero_demonstrativo", "demonstrativo"],
  nomeOperadora: ["Nome Prestador", "nome_operadora", "operadora"],
  cnpjOperadora: ["cnpj_operadora", "cnpj"],
  dataEmissao: ["Data Pagto", "data_emissao", "emissao", "data_pagto"],
  
  // Dados do Protocolo/Lote
  numeroLotePrestador: ["Lote Prestador", "lote_prestador", "loteprestador", "lote", "numero_lote"],
  numeroProtocolo: ["Protocolo TISS", "protocolo_tiss", "protocolotiss", "protocolo", "numero_protocolo"],
  situacaoProtocolo: ["situacao_protocolo", "situacaoprotocolo"],
  
  // Dados da Guia e Beneficiário
  numeroGuiaPrestador: ["Número Guia", "Numero Guia", "numero_guia", "numeroguia", "guia", "num_guia"],
  numeroGuiaOperadora: ["guia_operadora", "guiaoperadora"],
  senha: ["senha", "autorizacao"],
  numeroCarteira: ["Beneficiário", "Beneficiario", "beneficiario", "beneficiário", "carteira", "numero_carteira"],
  nomeBeneficiario: ["Nome Beneficiário", "Nome Beneficiario", "nome_beneficiario", "nomebeneficiario", "paciente"],
  situacaoGuia: ["situacao_guia", "situacaoguia"],
  
  // Detalhes do Item (Procedimento/Insumo)
  sequencialItem: ["seq", "sequencial", "sequencial_item", "sequencialitem"],
  dataRealizacao: ["Data Execução", "Data Execucao", "data_execucao", "dataexecucao", "data_realizacao"],
  codigoTabela: ["codigo_tabela", "codigotabela", "tabela"],
  codigoItem: ["Item", "item", "codigo", "cod", "codigo_procedimento", "codigo_item"],
  descricaoItem: ["Item Desc", "item_desc", "itemdesc", "descricao", "descrição", "descricao_item"],
  
  // Valores de Conciliação
  quantidadeExecutada: ["Quantidade", "quantidade", "qtd", "qtde", "quant"],
  valorInformado: ["valor_informado", "valorinformado", "vl_informado"],
  valorProcessado: ["processado", "valor_processado", "valorprocessado", "vl_processado"],
  valorLiberado: ["Valor Pagamento", "valor_pagamento", "valorpagamento", "valor_pago", "valor_liberado"],
  
  // Motivos de Glosa
  codigoGlosa: ["Erro TISS", "erro_tiss", "errotiss", "codigo_glosa", "codigoglosa", "cod_glosa"],
  descricaoGlosa: ["descricao_glosa", "descricaoglosa", "motivo_glosa", "motivoglosa"],
  
  // Metadados
  origemDado: [], // Preenchido programaticamente
  
  // Campos do upload (preenchidos externamente)
  convenioId: [],
  dataReferencia: [],
  dataPagamento: [],
  estabelecimentoId: [],
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
        
        // Identificação da Operadora/Demonstrativo
        numeroDemonstrativo: findValue('numeroDemonstrativo') as string | undefined,
        nomeOperadora: findValue('nomeOperadora') as string | undefined,
        cnpjOperadora: findValue('cnpjOperadora') as string | undefined,
        dataEmissao: parseDate(findValue('dataEmissao')),
        
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
        
        // Motivos de Glosa
        codigoGlosa: findValue('codigoGlosa') as string | undefined,
        descricaoGlosa: findValue('descricaoGlosa') as string | undefined,
        
        // Metadados
        origemDado: 'excel',
        
        // Campos do upload
        convenioId,
        dataReferencia,
        dataPagamento,
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
    console.log(`[RecebimentoTiss XML Parser] Starting parse, buffer size: ${(content.length / 1024).toFixed(1)} KB`);
    
    const xmlString = content.toString('utf-8');
    const items: Partial<InsertRecebimentoTiss>[] = [];
    
    // Extrair dados do cabeçalho do demonstrativo
    const numeroDemonstrativo = xmlString.match(/<ans:numeroDemonstrativo>([^<]+)<\/ans:numeroDemonstrativo>/)?.[1];
    const nomeOperadora = xmlString.match(/<ans:nomeOperadora>([^<]+)<\/ans:nomeOperadora>/)?.[1];
    // Suporta CNPJ ou numeroCNPJ
    let cnpjOperadora = xmlString.match(/<ans:CNPJ>([^<]+)<\/ans:CNPJ>/)?.[1];
    if (!cnpjOperadora) {
      cnpjOperadora = xmlString.match(/<ans:numeroCNPJ>([^<]+)<\/ans:numeroCNPJ>/)?.[1];
    }
    const dataEmissaoStr = xmlString.match(/<ans:dataEmissao>([^<]+)<\/ans:dataEmissao>/)?.[1];
    const dataEmissao = dataEmissaoStr ? parseDate(dataEmissaoStr) : null;
    
    // Processar cada protocolo
    const protocoloRegex = /<ans:dadosProtocolo>([\s\S]*?)<\/ans:dadosProtocolo>/g;
    let protocoloMatch;
    
    while ((protocoloMatch = protocoloRegex.exec(xmlString)) !== null) {
      const protocoloXml = protocoloMatch[1];
      
      // Suporta numeroLote ou numeroLotePrestador
      let numeroLotePrestador = protocoloXml.match(/<ans:numeroLote>([^<]+)<\/ans:numeroLote>/)?.[1];
      if (!numeroLotePrestador) {
        numeroLotePrestador = protocoloXml.match(/<ans:numeroLotePrestador>([^<]+)<\/ans:numeroLotePrestador>/)?.[1];
      }
      const numeroProtocolo = protocoloXml.match(/<ans:numeroProtocolo>([^<]+)<\/ans:numeroProtocolo>/)?.[1];
      const situacaoProtocolo = protocoloXml.match(/<ans:situacaoProtocolo>([^<]+)<\/ans:situacaoProtocolo>/)?.[1];
      
      // Processar cada guia dentro do protocolo (suporta dadosGuia e relacaoGuias)
      const guiaRegex = /<ans:(?:dadosGuia|relacaoGuias)>([\s\S]*?)<\/ans:(?:dadosGuia|relacaoGuias)>/g;
      let guiaMatch;
      
      while ((guiaMatch = guiaRegex.exec(protocoloXml)) !== null) {
        const guiaXml = guiaMatch[1];
        
        const numeroGuiaPrestador = guiaXml.match(/<ans:numeroGuiaPrestador>([^<]+)<\/ans:numeroGuiaPrestador>/)?.[1];
        const numeroGuiaOperadora = guiaXml.match(/<ans:numeroGuiaOperadora>([^<]+)<\/ans:numeroGuiaOperadora>/)?.[1];
        const senha = guiaXml.match(/<ans:senha>([^<]+)<\/ans:senha>/)?.[1];
        const numeroCarteira = guiaXml.match(/<ans:numeroCarteira>([^<]+)<\/ans:numeroCarteira>/)?.[1];
        const situacaoGuia = guiaXml.match(/<ans:situacaoGuia>([^<]+)<\/ans:situacaoGuia>/)?.[1];
        
        // Processar cada item dentro da guia (suporta dadosPagamento e detalhesGuia)
        const itemRegex = /<ans:(?:dadosPagamento|detalhesGuia)>([\s\S]*?)<\/ans:(?:dadosPagamento|detalhesGuia)>/g;
        let itemMatch;
        
        while ((itemMatch = itemRegex.exec(guiaXml)) !== null) {
          const itemXml = itemMatch[1];
          
          const sequencialItem = itemXml.match(/<ans:sequencialItem>([^<]+)<\/ans:sequencialItem>/)?.[1];
          const dataRealizacaoStr = itemXml.match(/<ans:dataRealizacao>([^<]+)<\/ans:dataRealizacao>/)?.[1];
          const dataRealizacao = dataRealizacaoStr ? parseDate(dataRealizacaoStr) : null;
          const codigoTabela = itemXml.match(/<ans:codigoTabela>([^<]+)<\/ans:codigoTabela>/)?.[1];
          const codigoItem = itemXml.match(/<ans:codigoProcedimento>([^<]+)<\/ans:codigoProcedimento>/)?.[1];
          const descricaoItem = itemXml.match(/<ans:descricaoProcedimento>([^<]+)<\/ans:descricaoProcedimento>/)?.[1];
          
          const quantidadeExecutada = itemXml.match(/<ans:quantidadeExecutada>([^<]+)<\/ans:quantidadeExecutada>/)?.[1];
          const valorInformado = itemXml.match(/<ans:valorInformado>([^<]+)<\/ans:valorInformado>/)?.[1];
          const valorProcessado = itemXml.match(/<ans:valorProcessado>([^<]+)<\/ans:valorProcessado>/)?.[1];
          const valorLiberado = itemXml.match(/<ans:valorLiberado>([^<]+)<\/ans:valorLiberado>/)?.[1];
          
          // Suporta codigoGlosa direto ou tipoGlosa dentro de relacaoGlosa
          let codigoGlosa = itemXml.match(/<ans:codigoGlosa>([^<]+)<\/ans:codigoGlosa>/)?.[1];
          if (!codigoGlosa) {
            codigoGlosa = itemXml.match(/<ans:tipoGlosa>([^<]+)<\/ans:tipoGlosa>/)?.[1];
          }
          const descricaoGlosa = itemXml.match(/<ans:descricaoGlosa>([^<]+)<\/ans:descricaoGlosa>/)?.[1];
          
          items.push({
            arquivoId,
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
            situacaoGuia,
            sequencialItem: sequencialItem ? parseInt(sequencialItem) : undefined,
            dataRealizacao,
            codigoTabela,
            codigoItem,
            descricaoItem,
            quantidadeExecutada,
            valorInformado,
            valorProcessado,
            valorLiberado,
            codigoGlosa,
            descricaoGlosa,
            origemDado: 'xml',
            convenioId,
            dataReferencia,
            dataPagamento,
            estabelecimentoId,
          });
        }
      }
    }
    
    console.log(`[RecebimentoTiss XML Parser] Parsed ${items.length} items`);
    
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
