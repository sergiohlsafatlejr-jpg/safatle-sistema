import * as XLSX from 'xlsx';
import { InsertRHFolhaPagamento } from '../drizzle/schema';

function parseNumber(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return String(val.toFixed(2));
  const parsed = parseFloat(String(val).replace(/[^0-9,-.]/g, '').replace(',', '.'));
  return isNaN(parsed) ? null : String(parsed.toFixed(2));
}

function parseDateFromExcel(val: any): Date | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Convert Excel serial date to JS Date (25569 is Jan 1 1970 offset from Dec 30 1899)
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function parseRhFolhaExcel(buffer: Buffer, arquivoId: number, estabelecimentoId: number, competencia: string): InsertRHFolhaPagamento[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('abril')) || workbook.SheetNames[0]; // fallback
  const sheet = workbook.Sheets[sheetName];
  
  const rawData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
  const records: InsertRHFolhaPagamento[] = [];
  
  // Header is usually at row 0 or 1. Let's assume it's index 0 for the exact spreadsheet layout provided.
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    const nome = row[1];
    if (!nome || typeof nome !== 'string' || nome.trim() === '' || nome.toLowerCase() === 'colaboradores') {
      continue;
    }
    
    records.push({
      arquivoId,
      estabelecimentoId,
      competencia,
      colaboradorNome: nome.trim(),
      colaboradorEmail: row[2] ? String(row[2]).trim() : null,
      dataAdmissao: parseDateFromExcel(row[3]),
      sexo: row[4] ? String(row[4]).trim() : null,
      filhos: row[5] ? String(row[5]).trim() : null,
      tipoContrato: row[6] ? String(row[6]).trim() : null,
      empresa: row[7] ? String(row[7]).trim() : null,
      cnpj: row[8] ? String(row[8]).trim() : null,
      unidade: row[9] ? String(row[9]).trim() : null,
      cpf: row[10] ? String(row[10]).trim() : null,
      dataNascimento: parseDateFromExcel(row[11]),
      cargo: row[12] ? String(row[12]).trim() : null,
      salarioBruto: parseNumber(row[13]),
      diasUteis: typeof row[15] === 'number' ? row[15] : parseInt(String(row[15])) || null,
      correcao: parseNumber(row[16]),
      valorPagar: parseNumber(row[17]),
      vt: parseNumber(row[18]),
      combustivel: parseNumber(row[19]),
      alimentacao: parseNumber(row[20]),
      ajudaCusto: parseNumber(row[21]),
      sobreAviso: parseNumber(row[22]),
      academia: parseNumber(row[23]),
      somaBeneficios: parseNumber(row[24]),
      descontoFixo: parseNumber(row[25]),
      descontosVariaveis: parseNumber(row[26]),
      descontoUniforme: parseNumber(row[27]),
      unimed: parseNumber(row[28]),
      coparticipacao: parseNumber(row[29]),
      cargoConfianca: row[30] ? String(row[30]).trim() : null,
      pontualidade: row[31] ? String(row[31]).trim() : null,
    });
  }
  
  return records;
}
