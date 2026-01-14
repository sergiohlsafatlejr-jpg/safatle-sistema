import * as xml2js from "xml2js";
import * as XLSX from "xlsx";
// pdf-parse will be dynamically imported due to ESM compatibility issues
import { InsertProcedimento } from "../drizzle/schema";

export interface ParsedProcedimento {
  codigo: string;
  descricao?: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal?: number;
  dataExecucao?: Date;
  pacienteNome?: string;
  pacienteCarteirinha?: string;
  guiaNumero?: string;
  dadosExtras?: Record<string, unknown>;
}

export interface ParseResult {
  success: boolean;
  procedimentos: ParsedProcedimento[];
  rawData?: unknown;
  error?: string;
}

/**
 * Remove namespace prefixes from XML keys (e.g., ans:descricao -> descricao)
 */
function removeNamespacePrefix(key: string): string {
  const colonIndex = key.indexOf(":");
  return colonIndex > -1 ? key.substring(colonIndex + 1) : key;
}

/**
 * Recursively normalize object keys by removing namespace prefixes
 */
function normalizeXmlObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeXmlObject(item));
  }
  
  if (typeof obj === "object") {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const normalizedKey = removeNamespacePrefix(key);
      normalized[normalizedKey] = normalizeXmlObject(value);
    }
    return normalized;
  }
  
  return obj;
}

/**
 * Parse XML file content (TISS format commonly used in Brazil)
 */
export async function parseXML(content: Buffer | string): Promise<ParseResult> {
  try {
    // Configure parser to handle namespaces properly
    const parser = new xml2js.Parser({ 
      explicitArray: false, 
      ignoreAttrs: false,
      tagNameProcessors: [xml2js.processors.stripPrefix],
      attrNameProcessors: [xml2js.processors.stripPrefix]
    });
    const xmlString = typeof content === "string" ? content : content.toString("utf-8");
    let result = await parser.parseStringPromise(xmlString);
    
    // Additionally normalize any remaining namespace prefixes
    result = normalizeXmlObject(result) as Record<string, unknown>;
    
    const procedimentos: ParsedProcedimento[] = [];
    
    // Try to extract procedures from common TISS XML structures
    const extractProcedimentos = (obj: unknown, path: string[] = []): void => {
      if (!obj || typeof obj !== "object") return;
      
      const record = obj as Record<string, unknown>;
      
      // Look for procedure-related nodes
      const procedureKeys = [
        "procedimento", "procedimentos", "proc", "item", "itens",
        "guia", "guias", "servico", "servicos", "ans:procedimento",
        "ans:procedimentoExecutado", "procedimentoExecutado"
      ];
      
      for (const key of Object.keys(record)) {
        const value = record[key];
        const lowerKey = key.toLowerCase();
        
        if (procedureKeys.some(pk => lowerKey.includes(pk.toLowerCase()))) {
          if (Array.isArray(value)) {
            for (const item of value) {
              const proc = extractSingleProcedimento(item);
              if (proc) procedimentos.push(proc);
            }
          } else if (typeof value === "object" && value !== null) {
            const proc = extractSingleProcedimento(value);
            if (proc) procedimentos.push(proc);
          }
        }
        
        // Recursively search
        if (typeof value === "object" && value !== null) {
          extractProcedimentos(value, [...path, key]);
        }
      }
    };
    
    extractProcedimentos(result);
    
    return {
      success: true,
      procedimentos,
      rawData: result,
    };
  } catch (error) {
    return {
      success: false,
      procedimentos: [],
      error: error instanceof Error ? error.message : "Erro ao processar XML",
    };
  }
}

function extractSingleProcedimento(obj: unknown): ParsedProcedimento | null {
  if (!obj || typeof obj !== "object") return null;
  
  const record = obj as Record<string, unknown>;
  
  // Try to find codigo - expanded list to handle various TISS formats
  const codigoKeys = [
    "codigo", "codigoProcedimento", "cd", "cod", "codigoTabela", 
    "codigoTermo", "codigoItem", "codigoServico", "codigoPrincipal"
  ];
  let codigo: string | undefined;
  
  for (const key of codigoKeys) {
    const value = findValueByKey(record, key);
    if (value) {
      codigo = String(value);
      break;
    }
  }
  
  if (!codigo) return null;
  
  // Extract other fields - expanded list to handle various TISS formats
  const descricaoKeys = [
    "descricao", "descricaoProcedimento", "descricaoItem", 
    "descricaoServico", "nomeComercial", "descricaoDetalhada"
  ];
  let descricao: unknown;
  for (const key of descricaoKeys) {
    descricao = findValueByKey(record, key);
    if (descricao) break;
  }
  const quantidade = parseNumber(findValueByKey(record, "quantidade") || findValueByKey(record, "qtd"));
  const valorUnitario = parseNumber(findValueByKey(record, "valorUnitario") || findValueByKey(record, "vlUnitario"));
  const valorTotal = parseNumber(findValueByKey(record, "valorTotal") || findValueByKey(record, "vlTotal"));
  const pacienteNome = findValueByKey(record, "nomeBeneficiario") || findValueByKey(record, "paciente");
  const pacienteCarteirinha = findValueByKey(record, "numeroCarteira") || findValueByKey(record, "carteirinha");
  const guiaNumero = findValueByKey(record, "numeroGuia") || findValueByKey(record, "guia");
  
  return {
    codigo,
    descricao: descricao ? String(descricao) : undefined,
    quantidade: quantidade || 1,
    valorUnitario,
    valorTotal,
    pacienteNome: pacienteNome ? String(pacienteNome) : undefined,
    pacienteCarteirinha: pacienteCarteirinha ? String(pacienteCarteirinha) : undefined,
    guiaNumero: guiaNumero ? String(guiaNumero) : undefined,
    dadosExtras: record,
  };
}

function findValueByKey(obj: Record<string, unknown>, targetKey: string): unknown {
  const lowerTarget = targetKey.toLowerCase().replace(/^ans:/, "");
  
  for (const [key, value] of Object.entries(obj)) {
    // Remove namespace prefix from key for comparison
    const normalizedKey = removeNamespacePrefix(key).toLowerCase();
    
    if (normalizedKey.includes(lowerTarget) || normalizedKey === lowerTarget) {
      if (typeof value === "object" && value !== null && "_" in (value as Record<string, unknown>)) {
        return (value as Record<string, unknown>)["_"];
      }
      return value;
    }
  }
  
  // Also try exact match with original key (for nested searches)
  for (const [key, value] of Object.entries(obj)) {
    if (key.toLowerCase() === lowerTarget || key.toLowerCase() === `ans:${lowerTarget}`) {
      if (typeof value === "object" && value !== null && "_" in (value as Record<string, unknown>)) {
        return (value as Record<string, unknown>)["_"];
      }
      return value;
    }
  }
  
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));
  return isNaN(num) ? undefined : num;
}

/**
 * Parse Excel file content
 */
export async function parseExcel(content: Buffer): Promise<ParseResult> {
  try {
    const workbook = XLSX.read(content, { type: "buffer" });
    const procedimentos: ParsedProcedimento[] = [];
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
      
      for (const row of data) {
        const proc = extractProcedimentoFromRow(row);
        if (proc) procedimentos.push(proc);
      }
    }
    
    return {
      success: true,
      procedimentos,
      rawData: workbook.SheetNames.map(name => ({
        name,
        data: XLSX.utils.sheet_to_json(workbook.Sheets[name]),
      })),
    };
  } catch (error) {
    return {
      success: false,
      procedimentos: [],
      error: error instanceof Error ? error.message : "Erro ao processar Excel",
    };
  }
}

function extractProcedimentoFromRow(row: Record<string, unknown>): ParsedProcedimento | null {
  // Map common column names to our fields
  const columnMappings: Record<string, string[]> = {
    codigo: ["codigo", "cod", "código", "cod_proc", "codigo_procedimento", "procedimento"],
    descricao: ["descricao", "descrição", "desc", "nome", "procedimento_nome"],
    quantidade: ["quantidade", "qtd", "qtde", "quant"],
    valorUnitario: ["valor_unitario", "vl_unitario", "vlunitario", "preco", "valor"],
    valorTotal: ["valor_total", "vl_total", "vltotal", "total"],
    pacienteNome: ["paciente", "nome_paciente", "beneficiario", "nome"],
    pacienteCarteirinha: ["carteirinha", "carteira", "numero_carteira", "matricula"],
    guiaNumero: ["guia", "numero_guia", "num_guia", "guia_numero"],
  };
  
  const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedRow: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeKey(key)] = value;
  }
  
  const findValue = (mappings: string[]): unknown => {
    for (const mapping of mappings) {
      const normalized = normalizeKey(mapping);
      if (normalizedRow[normalized] !== undefined) {
        return normalizedRow[normalized];
      }
    }
    return undefined;
  };
  
  const codigo = findValue(columnMappings.codigo);
  if (!codigo) return null;
  
  return {
    codigo: String(codigo),
    descricao: findValue(columnMappings.descricao) as string | undefined,
    quantidade: parseNumber(findValue(columnMappings.quantidade)) || 1,
    valorUnitario: parseNumber(findValue(columnMappings.valorUnitario)),
    valorTotal: parseNumber(findValue(columnMappings.valorTotal)),
    pacienteNome: findValue(columnMappings.pacienteNome) as string | undefined,
    pacienteCarteirinha: findValue(columnMappings.pacienteCarteirinha) as string | undefined,
    guiaNumero: findValue(columnMappings.guiaNumero) as string | undefined,
    dadosExtras: row,
  };
}

/**
 * Parse PDF file content (extracts text and tries to find structured data)
 */
export async function parsePDF(content: Buffer): Promise<ParseResult> {
  try {
    // Use pdfjs-dist for PDF parsing
    const pdfjsLib = await import("pdfjs-dist");
    
    // Load the PDF document
    const uint8Array = new Uint8Array(content);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    
    // Extract text from all pages
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      text += pageText + "\n";
    }
    
    const procedimentos: ParsedProcedimento[] = [];
    
    // Try to extract procedure codes from text using common patterns
    // Pattern: código followed by numbers (e.g., "10101012" or "1.01.01.01-2")
    const codePatterns = [
      /\b(\d{8})\b/g, // 8-digit codes
      /\b(\d{2}\.\d{2}\.\d{2}\.\d{2}-\d)\b/g, // TUSS format
      /\b(\d{2}\.\d{2}\.\d{2}\.\d{2})\b/g, // TUSS without check digit
    ];
    
    const foundCodes = new Set<string>();
    
    for (const pattern of codePatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        foundCodes.add(match[1]);
      }
    }
    
    // Try to extract values near codes
    const lines = text.split("\n");
    for (const line of lines) {
      for (const code of Array.from(foundCodes)) {
        if (line.includes(code)) {
          // Try to find value in the same line
          const valueMatch = line.match(/R?\$?\s*([\d.,]+)/);
          const valor = valueMatch ? parseNumber(valueMatch[1]) : undefined;
          
          procedimentos.push({
            codigo: code,
            valorTotal: valor,
            dadosExtras: { linha: line },
          });
          foundCodes.delete(code); // Avoid duplicates
          break;
        }
      }
    }
    
    // Add remaining codes without values
    for (const code of Array.from(foundCodes)) {
      procedimentos.push({
        codigo: code,
      });
    }
    
    return {
      success: true,
      procedimentos,
      rawData: { text, numpages: pdf.numPages },
    };
  } catch (error) {
    return {
      success: false,
      procedimentos: [],
      error: error instanceof Error ? error.message : "Erro ao processar PDF",
    };
  }
}

/**
 * Parse file based on type
 */
export async function parseFile(
  content: Buffer,
  fileType: "xml" | "excel" | "pdf"
): Promise<ParseResult> {
  switch (fileType) {
    case "xml":
      return parseXML(content);
    case "excel":
      return parseExcel(content);
    case "pdf":
      return parsePDF(content);
    default:
      return {
        success: false,
        procedimentos: [],
        error: `Tipo de arquivo não suportado: ${fileType}`,
      };
  }
}

/**
 * Convert parsed procedimentos to database insert format
 */
export function toProcedimentoInsert(
  parsed: ParsedProcedimento,
  arquivoId: number
): Omit<InsertProcedimento, "id" | "createdAt"> {
  return {
    arquivoId,
    codigo: parsed.codigo,
    descricao: parsed.descricao || null,
    quantidade: parsed.quantidade || 1,
    valorUnitario: parsed.valorUnitario?.toString() || null,
    valorTotal: parsed.valorTotal?.toString() || null,
    dataExecucao: parsed.dataExecucao || null,
    pacienteNome: parsed.pacienteNome || null,
    pacienteCarteirinha: parsed.pacienteCarteirinha || null,
    guiaNumero: parsed.guiaNumero || null,
    dadosExtras: parsed.dadosExtras || null,
  };
}
