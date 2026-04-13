import "dotenv/config";
import mysql from "mysql2/promise";
import { OracleConnector } from "../server/connectors/OracleConnector";

async function main() {
  console.log("Iniciando Correção da Sincronização de Protocolos TASY...");
  const connMysql = await mysql.createConnection(process.env.DATABASE_URL!);
  
  const [r] = await connMysql.query('SELECT host, porta, banco, usuario, senhaEncriptada, nome, estabelecimentoId, id FROM integracao_conexoes') as any;
  const tConn = (r as any[]).find(c => c.nome.toLowerCase().includes('hemolabor'));

  if (!tConn) { throw new Error("Conexão Tasy (Hemolabor) não encontrada!"); }

  const connector = new OracleConnector({
    host: tConn.host,
    port: tConn.porta,
    database: tConn.banco,
    user: tConn.usuario,
    password: Buffer.from(tConn.senhaEncriptada, "base64").toString("utf-8")
  });

  try {
    const start = Date.now();
    await connector.conectar();
    
    console.log("Limpando a tabela tasy_protocolo_bi no MySQL...");
    await connMysql.execute("TRUNCATE TABLE tasy_protocolo_bi");
    
    console.log("Executando a Ultra-Query para somar itens reais dos Protocolos desde Jan/2025...");
    const oracleQuery = `
      SELECT 
          CV.DS_CONVENIO AS DS_CONVENIO,
          TO_CHAR(PC.DT_MESANO_REFERENCIA, 'YYYY-MM-DD HH24:MI:SS') AS DT_MESANO_REFERENCIA,
          PC.NR_SEQ_PROTOCOLO AS NR_SEQ_PROTOCOLO,
          PC.NR_SEQ_DOC_CONVENIO AS DOC_CONV,
          T.NR_TITULO AS NR_TITULO,
          PC.IE_TIPO_PROTOCOLO AS TIPO,
          PC.IE_STATUS_PROTOCOLO AS STATUS_PROTOCOLO,
          PC.NR_PROTOCOLO AS NR_PROTOCOLO,
          (
            NVL((
              SELECT SUM(PP.VL_PROCEDIMENTO) 
              FROM TASY.PROCEDIMENTO_PACIENTE_V PP 
              INNER JOIN TASY.CONTA_PACIENTE C_IN ON PP.NR_INTERNO_CONTA = C_IN.NR_INTERNO_CONTA 
              WHERE C_IN.NR_SEQ_PROTOCOLO = PC.NR_SEQ_PROTOCOLO
            ), 0)
            + 
            NVL((
              SELECT SUM(MP.VL_MATERIAL) 
              FROM TASY.MATERIAL_ATEND_PACIENTE MP
              INNER JOIN TASY.CONTA_PACIENTE C_IN ON MP.NR_INTERNO_CONTA = C_IN.NR_INTERNO_CONTA 
              WHERE C_IN.NR_SEQ_PROTOCOLO = PC.NR_SEQ_PROTOCOLO
            ), 0)
          ) AS VL_PROTOCOLO,
          TO_CHAR(T.DT_EMISSAO, 'YYYY-MM-DD HH24:MI:SS') AS DT_EMISSAO,
          TO_CHAR(PC.DT_DEFINITIVO, 'YYYY-MM-DD HH24:MI:SS') AS DT_DEFINITIVO,
          TO_CHAR(PC.DT_ENVIO, 'YYYY-MM-DD HH24:MI:SS') AS DT_ENVIO,
          TO_CHAR(PC.DT_ENTREGA_CONVENIO, 'YYYY-MM-DD HH24:MI:SS') AS DT_ENTREGA_CONVENIO,
          TO_CHAR(PC.DT_VENCIMENTO, 'YYYY-MM-DD HH24:MI:SS') AS VENC_PROT,
          TO_CHAR(T.DT_VENCIMENTO, 'YYYY-MM-DD HH24:MI:SS') AS VENC_TITULO
      FROM TASY.PROTOCOLO_CONVENIO PC
      LEFT JOIN TASY.CONVENIO CV ON PC.CD_CONVENIO = CV.CD_CONVENIO
      LEFT JOIN TASY.TITULO_RECEBER T ON T.NR_SEQ_PROTOCOLO = PC.NR_SEQ_PROTOCOLO
      WHERE PC.DT_MESANO_REFERENCIA >= TO_DATE('01/01/2024', 'DD/MM/YYYY')
    `;

    const oracleData = await connector.executarQuery(oracleQuery);
    console.log(`Extraiu ${oracleData.length} protocolos físicos. Inserindo no MySQL...`);

    if (oracleData.length > 0) {
      const BATCH_SIZE = 500;
      for (let i = 0; i < oracleData.length; i += BATCH_SIZE) {
        const batch = oracleData.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
        const values = batch.flatMap(row => [
          tConn.id, // usando o connect id da origin
          row.DS_CONVENIO,
          row.DT_MESANO_REFERENCIA,
          row.NR_SEQ_PROTOCOLO,
          row.DOC_CONV,
          row.NR_TITULO,
          row.TIPO,
          row.STATUS_PROTOCOLO,
          row.NR_PROTOCOLO,
          row.VL_PROTOCOLO,
          row.DT_EMISSAO,
          row.DT_DEFINITIVO,
          row.DT_ENVIO,
          row.DT_ENTREGA_CONVENIO,
          row.VENC_PROT,
          row.VENC_TITULO
        ]);

        const insertQuery = `
          INSERT INTO tasy_protocolo_bi (
            configId, DS_CONVENIO, DT_MESANO_REFERENCIA, NR_SEQ_PROTOCOLO, DOC_CONV,
            NR_TITULO, TIPO, STATUS_PROTOCOLO, NR_PROTOCOLO, VL_PROTOCOLO,
            DT_EMISSAO, DT_DEFINITIVO, DT_ENVIO, DT_ENTREGA_CONVENIO, VENC_PROT, VENC_TITULO
          ) VALUES ${placeholders}
        `;
        await connMysql.execute(insertQuery, values);
      }
      console.log(`Sucesso! Tabelas Sincronizadas em ${Math.round((Date.now() - start)/1000)}s.`);
    }

  } catch (err) {
    console.error("Erro Fatal:", err);
  } finally {
    await connector.desconectar();
    await connMysql.end();
    process.exit(0);
  }
}

main();
