import "dotenv/config";
import { getDb } from "./server/db.js";
import { createReadStream } from "fs";
import { createInterface } from "readline";

const CSV_PATH = "C:\\Users\\sergi\\Downloads\\Hemolabor 2025 - 2026.csv";
const ESTAB_ID = 6;
const CONFIG_ID = 0; // placeholder
const BATCH_SIZE = 5000;

// Colunas do CSV (na ordem do header)
const CSV_COLUMNS = [
  "ESTABELECIMENTO","SEQUENCIA","CONVENIO","PROD","COMPETENCIA","DT_REFERENCIA",
  "ENTREGA","PROTOCOLO","NR_PROTOCOLO","NR_TITULO","NM_USUARIO","DT_ATUALIZACAO",
  "STATUS_PROT","TIPO_PROT","DOC_CONVENIO","ATEND","ENTRADA","ST_ENTRADA","CONTA",
  "AUTORIZACAO","SENHA","DT_INICIO","DT_FIM","ENCERRAMENTO","MATRICULA","PACIENTE",
  "CD_MOTIVO_EXC_CONTA","DS_COMPL_MOTIVO_EXCON","TIPO","GRUPO_RECEITA","TIPO_ITEM",
  "SETOR","PROF_EXEC","CRM","CD_ITEM","CD_ITEM_TUSS","DT_ITEM","DESCRICAO","CREDITO",
  "QTD","VL_PRODUZIDO","VL_MEDICO","A_RECEBER","VL_PAGO","VL_GLOSA","VL_AMAIOR",
  "T_RECEB","MOTIVO_GLOSA","RETORNO","PGTO","DT_PGTO"
];

// Colunas que existem na tabela (excluir GRUPO_RECEITA)
const DB_COLUMNS = [
  "ESTABELECIMENTO","SEQUENCIA","CONVENIO","PROD","COMPETENCIA","DT_REFERENCIA",
  "ENTREGA","PROTOCOLO","NR_PROTOCOLO","NR_TITULO","NM_USUARIO","DT_ATUALIZACAO",
  "STATUS_PROT","TIPO_PROT","DOC_CONVENIO","ATEND","ENTRADA","ST_ENTRADA","CONTA",
  "AUTORIZACAO","SENHA","DT_INICIO","DT_FIM","ENCERRAMENTO","MATRICULA","PACIENTE",
  "CD_MOTIVO_EXC_CONTA","DS_COMPL_MOTIVO_EXCON","TIPO","TIPO_ITEM",
  "SETOR","PROF_EXEC","CRM","CD_ITEM","CD_ITEM_TUSS","DT_ITEM","DESCRICAO","CREDITO",
  "QTD","VL_PRODUZIDO","VL_MEDICO","A_RECEBER","VL_PAGO","VL_GLOSA","VL_AMAIOR",
  "T_RECEB","MOTIVO_GLOSA","RETORNO","PGTO","DT_PGTO"
];

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function escapeMySQL(val: string | null | undefined): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `'${escaped}'`;
}

async function run() {
  const db = await getDb();
  if (!db) { console.error('DB not available'); return; }

  console.log(`Importando ${CSV_PATH}...`);
  console.log(`Estabelecimento: ${ESTAB_ID} (Hemolabor)`);

  const rl = createInterface({
    input: createReadStream(CSV_PATH, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let lineNum = 0;
  let batch: string[][] = [];
  let totalInserted = 0;
  let skipped = 0;

  const insertColumns = ['configId', 'estabelecimentoId', ...DB_COLUMNS];
  const insertHeader = insertColumns.map(c => `\`${c}\``).join(',');

  for await (const line of rl) {
    lineNum++;
    
    // Skip header
    if (lineNum === 1) {
      console.log('Header detectado, pulando...');
      continue;
    }

    const fields = parseCSVLine(line);
    if (fields.length < CSV_COLUMNS.length - 5) {
      skipped++;
      continue;
    }

    // Map CSV fields to a keyed object
    const row: Record<string, string> = {};
    for (let i = 0; i < CSV_COLUMNS.length && i < fields.length; i++) {
      row[CSV_COLUMNS[i]] = fields[i];
    }

    // Build values array (exclude GRUPO_RECEITA)
    const values: string[] = [
      String(CONFIG_ID),
      String(ESTAB_ID),
    ];
    for (const col of DB_COLUMNS) {
      values.push(escapeMySQL(row[col]));
    }

    batch.push(values);

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(db, insertHeader, batch);
      totalInserted += batch.length;
      batch = [];
      if (totalInserted % 50000 === 0) {
        console.log(`  ${totalInserted.toLocaleString()} registros inseridos...`);
      }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    await flushBatch(db, insertHeader, batch);
    totalInserted += batch.length;
  }

  console.log(`\nImportação concluída!`);
  console.log(`  Total inseridos: ${totalInserted.toLocaleString()}`);
  console.log(`  Linhas puladas: ${skipped}`);

  // Verify
  const [check] = await db.execute(`SELECT COUNT(*) as total FROM tasy_faturado_itens_bi WHERE estabelecimentoId = ${ESTAB_ID}`);
  console.log(`  Total na tabela: ${JSON.stringify(check)}`);

  process.exit(0);
}

async function flushBatch(db: any, header: string, batch: string[][]) {
  const valueRows = batch.map(vals => `(${vals.join(',')})`).join(',\n');
  const query = `INSERT INTO tasy_faturado_itens_bi (${header}) VALUES ${valueRows}`;
  try {
    await db.execute(query);
  } catch (err: any) {
    console.error(`Erro no batch (${batch.length} rows):`, err.message?.substring(0, 200));
    // Try row-by-row as fallback
    let saved = 0;
    for (const vals of batch) {
      try {
        await db.execute(`INSERT INTO tasy_faturado_itens_bi (${header}) VALUES (${vals.join(',')})`);
        saved++;
      } catch (e: any) {
        // skip individual error
      }
    }
    console.log(`  Fallback: ${saved}/${batch.length} salvos`);
  }
}

run();
