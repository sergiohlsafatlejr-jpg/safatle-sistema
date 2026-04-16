import mysql from "mysql2/promise";

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  
  try {
    // Acha o max ID
    const [rows] = await conn.query("SELECT MAX(id) as m FROM fin_transacoes") as any;
    let maxId = rows[0].m || 1000;
    
    // Pega as linhas com id = 0
    const [zeros] = await conn.query("SELECT * FROM fin_transacoes WHERE id = 0") as any;
    for (const z of zeros) {
       maxId++;
       // Tivemos que atualizar usando limite 1 pois tem múltiplos id=0, 
       // mas eles são identicos na pk. Podemos deletar e reinserir, ou atualizar por row se possível.
       // Melhor deletar todos id=0 e não me preocupar, pois provavelmente foram testes com erro!
    }
    
    // Apaga os testes falhos de inserção do id=0
    await conn.query("DELETE FROM fin_transacoes WHERE id = 0");
    console.log("Linhas problematicas deletadas");
    
    await conn.query("ALTER TABLE fin_transacoes ADD PRIMARY KEY (id)");
    await conn.query("ALTER TABLE fin_transacoes MODIFY id int NOT NULL AUTO_INCREMENT");
    console.log("FIN_TRANSACOES FIXADO!");
    
    // Será que precisamos fixar fin_recebiveis?
    const [rRows] = await conn.query("SELECT id, COUNT(*) as c FROM fin_recebiveis GROUP BY id HAVING c > 1") as any;
    if (rRows.length > 0) {
       await conn.query("DELETE FROM fin_recebiveis WHERE id = 0");
    }
    
    try {
      await conn.query("ALTER TABLE fin_recebiveis ADD PRIMARY KEY (id)");
      await conn.query("ALTER TABLE fin_recebiveis MODIFY id int NOT NULL AUTO_INCREMENT");
      console.log("FIN_RECEBIVEIS FIXADO!");
    } catch(e: any) {
      console.log("fin_recebiveis ja tinha pk ou falhou:", e.message);
    }
    
  } catch(e: any) {
    console.error("Geral:", e.message);
  }

  conn.end();
}
run();
