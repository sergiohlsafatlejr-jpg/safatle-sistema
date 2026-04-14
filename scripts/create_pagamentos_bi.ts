import mysql from 'mysql2/promise';

async function run() {
  console.log("Recriando tabela tasy_pagamentos_bi com esquema correto...");
  try {
    const connection = await mysql.createConnection("mysql://root:@localhost:3306/safatle_sistema?timezone=Z");
    
    await connection.execute(`DROP TABLE IF EXISTS \`tasy_pagamentos_bi\`;`);
    
    await connection.execute(`
      CREATE TABLE \`tasy_pagamentos_bi\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`configId\` int NOT NULL,
        \`estabelecimentoId\` int NOT NULL,
        \`criadoEm\` timestamp DEFAULT CURRENT_TIMESTAMP,
        \`ESTABELECIMENTO\` text,
        \`CONVÊNIO\` text,
        \`DT_PAGAMENTO\` text,
        \`LIB_FINANCEIRO\` text,
        \`RECEBIDO\` text,
        \`VINCULADO\` text,
        \`A_VINCULAR\` text,
        \`STATUS\` text,
        \`NOTA_FISCAL\` text,
        \`NR_SEQUENCIA\` text,
        CONSTRAINT \`tasy_pagamentos_bi_id\` PRIMARY KEY (\`id\`)
      );
    `);
    console.log("Tabela recriada com as exatas colunas do ORACLE TASY!");
    await connection.end();
  } catch (err) {
    console.error("Erro ao criar tabela:", err);
  }
  process.exit(0);
}

run();
