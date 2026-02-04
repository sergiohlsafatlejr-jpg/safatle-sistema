/**
 * Parser para importar dados de Excel para a tabela recebimento_tiss
 * Mapeia as colunas do Excel da Unimed para os campos da tabela
 */

import * as XLSX from "xlsx";
import { InsertRecebimentoTiss } from "../drizzle/schema";

// Mapeamento de colunas do Excel para campos da tabela recebimento_tiss
// Mapeamento específico para Excel Unimed (nomes exatos das colunas)
const COLUMN_MAPPINGS: Record<keyof Omit<InsertRecebimentoTiss, 'id' | 'dataImportacao'>, string[]> = {
  // Referência ao arquivo de origem e estabelecimento (preenchidos externamente)
  arquivoId: [],
  estabelecimentoId: [],
  
  // Dados do Demonstrativo/Pagamento
  numeroDemonstrativo: ["numero_demonstrativo", "demonstrativo"],
  nomeOperadora: ["Nome Prestador", "nome_operadora", "operadora"], // Unimed: "Nome Prestador"
  cnpjOperadora: ["cnpj_operadora", "cnpj"],
  dataEmissao: ["Data Pagto", "data_emissao", "emissao"], // Unimed: "Data Pagto"
  dataPagamento: ["Data Pagto", "data_pagto", "datapagto", "data_pagamento", "datapagamento", "dt_pagto", "dtpagto"],
  
  // Dados do Lote e Protocolo
  numeroLotePrestador: ["Lote Prestador", "lote_prestador", "loteprestador", "lote", "numero_lote"], // Unimed: "Lote Prestador"
  numeroProtocolo: ["Protocolo TISS", "protocolo_tiss", "protocolotiss", "protocolo", "numero_protocolo"], // Unimed: "Protocolo TISS"
  situacaoProtocolo: ["situacao_protocolo", "situacaoprotocolo"],
  
  // Dados do Prestador
  codigoPrestadorPagamento: ["codigo_prestador_pagamento", "codigoprestadorpagamento", "cod_prestador_pagamento"],
  nomePrestadorPagamento: ["nome_prestador_pagamento", "nomeprestadorpagamento"],
  codigoPrestadorExecutante: ["codigo_prestador", "codigoprestador", "codigo_prestador_executante", "codigoprestadorexecutante", "prestador_executante"],
  nomePrestadorExecutante: ["nome_prestador", "nomeprestador", "nome_prestador_executante", "nomeprestadorexecutante", "prestador_executante_nome"],
  
  // Dados da Guia
  numeroGuiaPrestador: ["Número Guia", "Numero Guia", "numero_guia", "numeroguia", "guia", "num_guia"], // Unimed: "Número Guia"
  numeroGuiaOperadora: ["guia_operadora", "guiaoperadora"],
  senha: ["senha", "autorizacao"],
  numeroCarteira: ["Beneficiário", "Beneficiario", "beneficiario", "beneficiário", "carteira", "numero_carteira", "carteirinha"], // Unimed: "Beneficiário"
  nomeBeneficiario: ["Nome Beneficiário", "Nome Beneficiario", "nome_beneficiario", "nomebeneficiario", "nome_beneficiário", "paciente"], // Unimed: "Nome Beneficiário"
  situacaoGuia: ["situacao_guia", "situacaoguia"],
  
  // Dados do Item
  sequencialItem: ["seq", "sequencial", "sequencial_item", "sequencialitem"],
  dataRealizacao: ["Data Execução", "Data Execucao", "data_execucao", "dataexecucao", "data_execução", "dt_execucao", "data_realizacao"], // Unimed: "Data Execução"
  horaExecucao: ["hora_execucao", "horaexecucao", "hora_execução", "hr_execucao"],
  codigoTabela: ["codigo_tabela", "codigotabela", "tabela"],
  codigoProcedimento: ["Item", "item", "codigo", "cod", "codigo_procedimento", "codigoprocedimento"], // Unimed: "Item"
  descricaoProcedimento: ["Item Desc", "item_desc", "itemdesc", "descricao", "descrição", "descricao_item"], // Unimed: "Item Desc"
  tipoLancamento: ["tipo_lancamento", "tipolancamento", "tipo_lançamento", "tipo"],
  
  // Valores
  valorInformado: ["valor_informado", "valorinformado", "vl_informado"],
  valorProcessado: ["processado", "valor_processado", "valorprocessado", "vl_processado"],
  valorLiberado: ["Valor Pagamento", "valor_pagamento", "valorpagamento", "valor_pago", "valorpago", "valor_liberado", "valorliberado"], // Unimed: "Valor Pagamento"
  qtdExecutada: ["Quantidade", "quantidade", "qtd", "qtde", "quant"], // Unimed: "Quantidade"
  
  // Dados de Glosa
  codigoGlosa: ["Erro TISS", "erro_tiss", "errotiss", "codigo_glosa", "codigoglosa", "cod_glosa"], // Unimed: "Erro TISS"
  descricaoGlosa: ["descricao_glosa", "descricaoglosa", "motivo_glosa", "motivoglosa"],
  situacaoItem: ["situacao_item", "situacaoitem", "situação_item", "status"],
  
  // Dados do Solicitante
  codigoSolicitante: ["codigo_solicitante", "codigosolicitante", "cod_solicitante"],
  nomeSolicitante: ["nome_solicitante", "nomesolicitante"],
  
  // Dados de Internação
  acomodacaoInternacao: ["acomodacao_da_internacao", "acomodacaodainternacao", "acomodacao_internacao", "acomodacao"],
  dataInicioInternacao: ["data_inicio_faturamento_internacao", "datainiciofaturamentointernacao", "data_inicio_internacao"],
  dataFimInternacao: ["data_fim_faturamento_internacao", "datafimfaturamentointernacao", "data_fim_internacao"],
};

/**
 * Normaliza uma string para comparação (remove acentos, espaços, caracteres especiais)
 */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, ""); // Remove caracteres especiais
}

/**
 * Parse de data (suporta formato brasileiro DD/MM/YYYY e ISO)
 */
function parseDate(value: unknown): Date | null {
  if (!value) return null;
  
  // Se já é uma Date
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  // Se é um número (serial do Excel)
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
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    const year = parseInt(brMatch[3], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Formato brasileiro com hora DD/MM/YYYY HH:MM:SS
  const brMatchTime = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (brMatchTime) {
    const day = parseInt(brMatchTime[1], 10);
    const month = parseInt(brMatchTime[2], 10) - 1;
    const year = parseInt(brMatchTime[3], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Fallback para parsing padrão
  const date = new Date(str);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse de número
 */
function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  // Tratar formato brasileiro (1.234,56)
  const normalized = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

export interface RecebimentoTissParseResult {
  success: boolean;
  items: Partial<InsertRecebimentoTiss>[];
  totalRows: number;
  error?: string;
}

/**
 * Parse de arquivo Excel para recebimento_tiss
 */
export async function parseExcelRecebimentoTiss(
  content: Buffer,
  arquivoId: number,
  estabelecimentoId: number
): Promise<RecebimentoTissParseResult> {
  try {
    console.log(`[RecebimentoTiss Parser] Starting parse, buffer size: ${(content.length / 1024).toFixed(1)} KB`);
    
    const workbook = XLSX.read(content, {
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellStyles: false,
      cellHTML: false,
      dense: false,
    });
    
    const items: Partial<InsertRecebimentoTiss>[] = [];
    let totalRows = 0;
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      
      const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        raw: false,
        defval: '',
        blankrows: false,
      });
      
      totalRows += rawData.length;
      
      for (const row of rawData) {
        const item = extractRecebimentoTissFromRow(row, arquivoId, estabelecimentoId);
        if (item) {
          items.push(item);
        }
      }
    }
    
    console.log(`[RecebimentoTiss Parser] Completed: ${items.length} items from ${totalRows} rows`);
    
    return {
      success: true,
      items,
      totalRows,
    };
  } catch (error) {
    console.error(`[RecebimentoTiss Parser] Error:`, error);
    return {
      success: false,
      items: [],
      totalRows: 0,
      error: error instanceof Error ? error.message : "Erro ao processar arquivo",
    };
  }
}

/**
 * Extrai um item de recebimento_tiss de uma linha do Excel
 */
function extractRecebimentoTissFromRow(
  row: Record<string, unknown>,
  arquivoId: number,
  estabelecimentoId: number
): Partial<InsertRecebimentoTiss> | null {
  // Normalizar chaves da linha
  const normalizedRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeKey(key)] = value;
  }
  
  // Função para encontrar valor baseado nos mapeamentos
  const findValue = (mappings: string[]): unknown => {
    for (const mapping of mappings) {
      const normalized = normalizeKey(mapping);
      if (normalizedRow[normalized] !== undefined && normalizedRow[normalized] !== '') {
        return normalizedRow[normalized];
      }
    }
    return undefined;
  };
  
  // Verificar se a linha tem dados mínimos (código ou descrição do item)
  const codigo = findValue(COLUMN_MAPPINGS.codigoProcedimento);
  const descricao = findValue(COLUMN_MAPPINGS.descricaoProcedimento);
  
  if (!codigo && !descricao) {
    return null;
  }
  
  // Extrair todos os campos
  const item: Partial<InsertRecebimentoTiss> = {
    arquivoId,
    estabelecimentoId,
    
    // Dados do Demonstrativo/Pagamento
    numeroDemonstrativo: findValue(COLUMN_MAPPINGS.numeroDemonstrativo) as string | undefined,
    nomeOperadora: findValue(COLUMN_MAPPINGS.nomeOperadora) as string | undefined,
    cnpjOperadora: findValue(COLUMN_MAPPINGS.cnpjOperadora) as string | undefined,
    dataEmissao: parseDate(findValue(COLUMN_MAPPINGS.dataEmissao)),
    dataPagamento: parseDate(findValue(COLUMN_MAPPINGS.dataPagamento)),
    
    // Dados do Lote e Protocolo
    numeroLotePrestador: findValue(COLUMN_MAPPINGS.numeroLotePrestador) as string | undefined,
    numeroProtocolo: findValue(COLUMN_MAPPINGS.numeroProtocolo) as string | undefined,
    situacaoProtocolo: findValue(COLUMN_MAPPINGS.situacaoProtocolo) as string | undefined,
    
    // Dados do Prestador
    codigoPrestadorPagamento: findValue(COLUMN_MAPPINGS.codigoPrestadorPagamento) as string | undefined,
    nomePrestadorPagamento: findValue(COLUMN_MAPPINGS.nomePrestadorPagamento) as string | undefined,
    codigoPrestadorExecutante: findValue(COLUMN_MAPPINGS.codigoPrestadorExecutante) as string | undefined,
    nomePrestadorExecutante: findValue(COLUMN_MAPPINGS.nomePrestadorExecutante) as string | undefined,
    
    // Dados da Guia
    numeroGuiaPrestador: findValue(COLUMN_MAPPINGS.numeroGuiaPrestador) as string | undefined,
    numeroGuiaOperadora: findValue(COLUMN_MAPPINGS.numeroGuiaOperadora) as string | undefined,
    senha: findValue(COLUMN_MAPPINGS.senha) as string | undefined,
    numeroCarteira: findValue(COLUMN_MAPPINGS.numeroCarteira) as string | undefined,
    nomeBeneficiario: findValue(COLUMN_MAPPINGS.nomeBeneficiario) as string | undefined,
    situacaoGuia: findValue(COLUMN_MAPPINGS.situacaoGuia) as string | undefined,
    
    // Dados do Item
    sequencialItem: parseNumber(findValue(COLUMN_MAPPINGS.sequencialItem)) as number | undefined,
    dataRealizacao: parseDate(findValue(COLUMN_MAPPINGS.dataRealizacao)),
    horaExecucao: findValue(COLUMN_MAPPINGS.horaExecucao) as string | undefined,
    codigoTabela: findValue(COLUMN_MAPPINGS.codigoTabela) as string | undefined,
    codigoProcedimento: codigo as string | undefined,
    descricaoProcedimento: descricao as string | undefined,
    tipoLancamento: findValue(COLUMN_MAPPINGS.tipoLancamento) as string | undefined,
    
    // Valores (convertidos para string pois o schema usa decimal)
    valorInformado: parseNumber(findValue(COLUMN_MAPPINGS.valorInformado))?.toString(),
    valorProcessado: parseNumber(findValue(COLUMN_MAPPINGS.valorProcessado))?.toString(),
    valorLiberado: parseNumber(findValue(COLUMN_MAPPINGS.valorLiberado))?.toString(),
    qtdExecutada: parseNumber(findValue(COLUMN_MAPPINGS.qtdExecutada)) as number | undefined,
    
    // Dados de Glosa
    codigoGlosa: findValue(COLUMN_MAPPINGS.codigoGlosa) as string | undefined,
    descricaoGlosa: findValue(COLUMN_MAPPINGS.descricaoGlosa) as string | undefined,
    situacaoItem: findValue(COLUMN_MAPPINGS.situacaoItem) as string | undefined,
    
    // Dados do Solicitante
    codigoSolicitante: findValue(COLUMN_MAPPINGS.codigoSolicitante) as string | undefined,
    nomeSolicitante: findValue(COLUMN_MAPPINGS.nomeSolicitante) as string | undefined,
    
    // Dados de Internação
    acomodacaoInternacao: findValue(COLUMN_MAPPINGS.acomodacaoInternacao) as string | undefined,
    dataInicioInternacao: parseDate(findValue(COLUMN_MAPPINGS.dataInicioInternacao)),
    dataFimInternacao: parseDate(findValue(COLUMN_MAPPINGS.dataFimInternacao)),
  };
  
  return item;
}

export default parseExcelRecebimentoTiss;
