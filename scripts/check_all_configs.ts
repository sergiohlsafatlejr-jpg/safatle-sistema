import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema");
  const [rows] = await connection.execute("SELECT id, estabelecimentoId, descricao, conexaoConfig FROM query_configuracoes ORDER BY id DESC;");
  
  const parsedRows = (rows as any[]).map(r => {
    let tabela = '';
    try {
        let conf = r.conexaoConfig;
        if(typeof conf === 'string') conf = JSON.parse(conf);
        if(typeof conf === 'string') conf = JSON.parse(conf);
        tabela = conf?.tabelaDestinoBi || '';
    } catch(e) {}
    return { id: r.id, estab: r.estabelecimentoId, desc: r.descricao, tabela };
  });

  console.log(JSON.stringify(parsedRows, null, 2));
  await connection.end();
  process.exit(0);
}

run();
