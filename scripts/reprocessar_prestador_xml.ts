import "dotenv/config";
import { getDb } from "../server/db";
import { arquivos, faturamentoTiss } from "../drizzle/schema";
import { storageGet } from "../server/storage";
import { sql, isNull, eq } from "drizzle-orm";
import { parseXML } from "../server/parsers";

async function run() {
  console.log("==========================================");
  console.log(" Iniciando reprocessamento de codigos     ");
  console.log("==========================================");

  // Buscar arquivos únicos que tenham itens de faturamentoTiss faltando a coluna nova
  const db = await getDb();
  if (!db) {
    console.error("Não foi possível conectar ao banco de dados");
    process.exit(1);
  }

  const [ rows ] = await db.execute(sql`
    SELECT DISTINCT a.id, a.s3Key AS chaveS3, a.nome AS fileName
    FROM arquivos a
    INNER JOIN staging_faturamento_xml f ON a.id = f.arquivo_id
    WHERE f.codigo_prestador_operadora IS NULL AND a.s3Key IS NOT NULL
  `);

  const arquivosParaProcessar = rows as any[];

  console.log(`\nLocalizamos ${arquivosParaProcessar.length} arquivo(s) enviados que precisam de reprocessamento do cabeçalho TISS.\n`);

  for (const arq of arquivosParaProcessar) {
    if (!arq.chaveS3) {
      console.log(`[AVISO] Arquivo ID ${arq.id} ignorado, pois 'chaveS3' não existe.`);
      continue;
    }

    try {
      console.log(`Baixando e inspecionando arquivo ID ${arq.id} (${arq.fileName}) do Storage...`);
      const buffer = await storageGet(arq.chaveS3);
      if (!buffer) {
        console.log(`[ERRO] Falha ao baixar o arquivo ID ${arq.id} do s3/storage.`);
        continue;
      }

      // Fazemos o parse do XML para extrair com precisão a nova tag
      const parsed = await parseXML(buffer.toString('utf-8'));
      
      // Como todos os itens de um arquivo herdam o cabeçalho, podemos olhar para o 1º 
      const codOperadora = parsed.procedimentos && parsed.procedimentos[0]?.codigoPrestadorOperadora;

      if (codOperadora) {
        console.log(`   \x1b[32m✔ Tag <codigoNaOperadora> encontrada: ${codOperadora}\x1b[0m`);
        console.log(`   Aplicando o código em todas as linhas da tabela 'staging_faturamento_xml' para este arquivo...`);
        
        await db.execute(sql`
          UPDATE staging_faturamento_xml
          SET codigo_prestador_operadora = ${codOperadora}
          WHERE arquivo_id = ${arq.id}
        `);
          
      } else {
        console.log(`   \x1b[33m⚠ O arquivo ID ${arq.id} não possui a tag detalhando o prestador no cabeçalho.\x1b[0m`);
      }

    } catch (e: any) {
      console.error(`[ERRO FATAL] Falha no XML ID ${arq.id}:`, e.message || e);
    }
  }

  console.log("\n==========================================");
  console.log(" REPROCESSAMENTO CONCLUÍDO COM SUCESSO!   ");
  console.log("==========================================");
  process.exit(0);
}

run().catch((e) => {
  console.error("Erro no script:", e);
  process.exit(1);
});
