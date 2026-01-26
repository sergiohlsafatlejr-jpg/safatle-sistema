import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function checkItens() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Verificar total de itens
  const [rows1] = await connection.execute('SELECT COUNT(*) as total FROM itensConciliacaoTasy');
  console.log('Total de itens:', rows1[0].total);
  
  // Verificar resultados
  const [rows2] = await connection.execute('SELECT id, totalContas, contasOk, contasComGlosa FROM resultadosConciliacaoTasy LIMIT 5');
  console.log('Resultados:', rows2);
  
  await connection.end();
}

checkItens().catch(console.error);
