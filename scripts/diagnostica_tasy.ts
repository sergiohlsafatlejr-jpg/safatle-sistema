import "dotenv/config";
import mysql from "mysql2/promise";
import { OracleConnector } from "../server/connectors/OracleConnector";

async function main() {
  const connMysql = await mysql.createConnection(process.env.DATABASE_URL!);
  const [r] = await connMysql.query('SELECT host, porta, banco, usuario, senhaEncriptada, nome FROM integracao_conexoes') as any;
  const tConn = (r as any[]).find(c => c.nome.toLowerCase().includes('tasy') || c.nome.toLowerCase().includes('maternidade'));

  if (!tConn) { throw new Error("Conexão Tasy não encontrada!"); }

  const connector = new OracleConnector({
    host: tConn.host,
    port: tConn.porta,
    database: tConn.banco,
    user: tConn.usuario,
    password: Buffer.from(tConn.senhaEncriptada, "base64").toString("utf-8")
  });

  try {
    await connector.conectar();
    
    console.log("Checando protocolos sem DT_MESANO_REFERENCIA ou com datas antigas:");
    const result1 = await connector.executarQuery(`
      SELECT 
        CASE 
          WHEN DT_MESANO_REFERENCIA IS NULL THEN 'NULO'
          ELSE TO_CHAR(DT_MESANO_REFERENCIA, 'YYYY')
        END as REFERENCIA,
        COUNT(*) as QTD
      FROM TASY.PROTOCOLO_CONVENIO
      GROUP BY 
        CASE 
          WHEN DT_MESANO_REFERENCIA IS NULL THEN 'NULO'
          ELSE TO_CHAR(DT_MESANO_REFERENCIA, 'YYYY')
        END
      ORDER BY REFERENCIA DESC
    `);
    console.log("-> Volumes por YYYY:", result1);

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await connector.desconectar();
    process.exit(0);
  }
}

main();
