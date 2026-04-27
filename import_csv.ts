import "dotenv/config";
import fs from "fs";
import { parse } from "csv-parse";
import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";
import { faturamentoTiss } from "./drizzle/schema.js";

async function run() {
  const filePath = "C:/Users/sergi/Downloads/faturamento_tiss_20260417_113844.csv";
  if (!fs.existsSync(filePath)) {
    console.error("Arquivo não encontrado!");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("Sem conexão DB");
    process.exit(1);
  }

  console.log("Apagando dados atuais da staging_faturamento_xml...");
  await db.execute(sql`TRUNCATE TABLE staging_faturamento_xml`);
  console.log("Tabela limpa.");

  let buffer: any[] = [];
  const BATCH_SIZE = 1000;
  let total = 0;

  const parser = fs.createReadStream(filePath).pipe(parse({
    columns: true,
    skip_empty_lines: true,
    cast: (value, context) => {
      if (value === "") return null;
      return value;
    }
  }));

  const processBatch = async () => {
    if (buffer.length === 0) return;
    
    const batchToInsert = buffer.map(row => ({
      id: parseInt(row.id),
      numeroLote: row.numero_lote,
      sequencialTransacao: row.sequencial_transacao,
      dataRegistro: row.data_registro ? new Date(row.data_registro) : null,
      registroAns: row.registro_ans,
      codigoPrestadorOperadora: row.codigo_prestador_operadora || null,
      numeroGuiaPrestador: row.numero_guia_prestador,
      numeroGuiaOperadora: row.numero_guia_operadora,
      senha: row.senha,
      carteiraBeneficiario: row.carteira_beneficiario,
      tipoItem: row.tipo_item,
      sequencialItem: row.sequencial_item ? parseInt(row.sequencial_item) : null,
      dataExecucao: row.data_execucao ? new Date(row.data_execucao) : null,
      codigoTabela: row.codigo_tabela,
      codigoItem: row.codigo_item,
      descricaoItem: row.descricao_item,
      quantidade: row.quantidade,
      valorUnitario: row.valor_unitario,
      valorFaturado: row.valor_faturado,
      nomeProf: row.nome_prof,
      conselhoProf: row.conselho_prof,
      valorTotalGeralGuia: row.valor_total_geral_guia,
      estabelecimentoId: row.estabelecimentoId ? parseInt(row.estabelecimentoId) : null,
      arquivoId: row.arquivo_id ? parseInt(row.arquivo_id) : null,
      dataImportacao: row.data_importacao ? new Date(row.data_importacao) : new Date(),
      dataReferencia: row.data_referencia ? new Date(row.data_referencia) : null,
      convenioId: row.convenioId ? parseInt(row.convenioId) : null,
      valorTotalItem: row.valor_total_item,
      codigoPrestadorExecutante: row.codigo_prestador_executante,
      competencia: row.competencia
    }));

    // Inserir via batch com chunk
    await db.insert(faturamentoTiss).values(batchToInsert);
    total += batchToInsert.length;
    console.log(`Inserido ${total} registros na staging...`);
    buffer = [];
  };

  for await (const row of parser) {
    buffer.push(row);
    if (buffer.length >= BATCH_SIZE) {
      await processBatch();
    }
  }

  // Insert remanescente
  await processBatch();

  console.log(`Concluído! Total inserido: ${total}`);
  process.exit(0);
}

run().catch(e => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
