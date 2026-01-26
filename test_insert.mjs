import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function testInsert() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Tentar inserir um item de teste
  try {
    const [result] = await connection.execute(`
      INSERT INTO itensConciliacaoTasy 
      (resultadoConciliacaoId, contaTasyId, nrInternoConta, guia, paciente, valorTasy, valorPago, valorGlosado, valorDiferenca, statusConciliacao, totalProcedimentos, totalMatMed)
      VALUES (1, 1, '12345', '67890', 'Paciente Teste', 100.00, 90.00, 10.00, 10.00, 'glosa', 5, 3)
    `);
    console.log('Insert result:', result);
    
    // Verificar se foi inserido
    const [rows] = await connection.execute('SELECT COUNT(*) as total FROM itensConciliacaoTasy');
    console.log('Total após insert:', rows[0].total);
    
    // Limpar o teste
    await connection.execute('DELETE FROM itensConciliacaoTasy WHERE paciente = "Paciente Teste"');
    console.log('Teste limpo');
  } catch (error) {
    console.error('Erro:', error.message);
  }
  
  await connection.end();
}

testInsert().catch(console.error);
