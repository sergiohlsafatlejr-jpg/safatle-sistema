const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'safatle_sistema'
  });

  // Query based on the exact same logic for the current month or so
  const [rows] = await conn.execute(`SELECT ccr.numeroConta, ft.tipo_item, ft.descricao_item, ft.codigo_item, ft.quantidade, ft.valor_faturado 
      FROM staging_faturamento_xml ft
      JOIN contas_convenio_resumo ccr ON ft.numero_guia_prestador = ccr.numeroConta
      WHERE ccr.convenioId = (SELECT id FROM convenios WHERE nome LIKE '%Ipasgo%' LIMIT 1)
      LIMIT 1000`);
  
  let diarias = 0;
  for(const row of rows) {
    const rawStrT = String(row.tipo_item || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let tItem = rawStrT;
    const descT = String(row.descricao_item || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (descT.includes("diaria") || descT.includes("internacao") || rawStrT === "diaria") {
      tItem = "diaria";
    }
    
    if (tItem === "diaria") {
      diarias += parseFloat(String(row.quantidade || "1"));
    }
  }

  console.log("Diarias found for IPASGO:", diarias);

  await conn.end();
}

test().catch(console.error);
