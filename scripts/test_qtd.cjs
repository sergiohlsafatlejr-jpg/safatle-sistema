const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'safatle_sistema'
  });

  const [rows] = await conn.execute(`SELECT tipo_item, codigo_item, descricao_item, quantidade FROM staging_faturamento_xml WHERE lower(descricao_item) LIKE '%di%ria%' OR codigo_item = '60001038' LIMIT 10`);
  
  console.log("Rows:");
  for(const row of rows) {
    const rawTItem = row.tipo_item || '';
    const rawStrT = String(rawTItem).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    let tItem = rawStrT;
    const descT = String(row.descricao_item || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (descT.includes("diaria") || descT.includes("internacao") || rawStrT === "diaria") {
      tItem = "diaria";
    }

    console.log({
      tipo_item: row.tipo_item,
      codigo_item: row.codigo_item,
      desc: row.descricao_item,
      qtd: row.quantidade,
      qtd_typeof: typeof row.quantidade,
      tItemResult: tItem
    });
  }

  await conn.end();
}

test().catch(console.error);
