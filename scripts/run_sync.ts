import "dotenv/config";
import { dataSyncEngine } from "../server/dataSyncEngine";
import mysql from 'mysql2/promise';

async function run() {
  console.log("Iniciando sincronizacao do Pagamentos Bancarios...");
  try {
    const conexaoConfig = {
      host: "192.168.0.241",
      port: 1521,
      database: "tasy",
      user: "SAFATLE",
      password: "Ro2#D7#Syd9",
      tabelaDestinoBi: "tasy_pagamentos_bi"
    };
    
    // We get the query from DB
    const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema?timezone=Z");
    const [rows] = await connection.execute("SELECT descricao, querySql FROM query_configuracoes WHERE descricao LIKE '%Pagamento%' AND tipoDados = 'bi_relatorio'");
    const querySql = (rows as any)[0].querySql;
    await connection.end();

    const result = await dataSyncEngine.sincronizar({
      configId: 5,
      sistema: "tasy",
      tipoDados: "bi_relatorio",
      estabelecimentoId: 6, // Hemolabor
      querySql: querySql,
      frequencia: "manual",
      conexaoConfig
    });
    
    console.log("Resultado:", result);
  } catch (err) {
    console.error("Erro fatal:", err);
  }
  process.exit(0);
}

run();
