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
    
    console.log("Investigando os Valores do IPASGO (Mês Março) na tabela TITULO_RECEBER vs. CONTA_PACIENTE");

    const query = `
      SELECT 
        TO_CHAR(CP.DT_ALTA, 'YYYY-MM') as MES,
        CV.DS_CONVENIO,
        SUM(CP.VL_CONTA) as TOTAL_VL_CONTA,
        COUNT(*) as QTD_CONTAS,
        COUNT(CP.NR_SEQ_PROTOCOLO) as QTD_COM_PROTOCOLO
      FROM TASY.CONTA_PACIENTE CP
      INNER JOIN TASY.CONVENIO CV ON CP.CD_CONVENIO = CV.CD_CONVENIO
      WHERE UPPER(CV.DS_CONVENIO) LIKE '%IPASGO%'
        AND CP.DT_ALTA >= TO_DATE('01/01/2025', 'DD/MM/YYYY')
      GROUP BY TO_CHAR(CP.DT_ALTA, 'YYYY-MM'), CV.DS_CONVENIO
      ORDER BY MES DESC
    `;
    
    const result = await connector.executarQuery(query);
    console.log("-> Valores reais por mês do Ipasgo:");
    console.table(result);

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await connector.desconectar();
    process.exit(0);
  }
}

main();
