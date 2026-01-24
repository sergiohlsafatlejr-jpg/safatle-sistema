import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar contasPagasTasy com nrConta preenchido
const [contasComNr] = await connection.query('SELECT nrConta, guia, convenio, pagoConta, glosaConta FROM contasPagasTasy WHERE nrConta IS NOT NULL AND nrConta != "" LIMIT 10');
console.log('contasPagasTasy com nrConta:', contasComNr);

// Verificar contasPagasTasy com guia preenchido
const [contasComGuia] = await connection.query('SELECT nrConta, guia, convenio, pagoConta, glosaConta FROM contasPagasTasy WHERE guia IS NOT NULL AND guia != "" LIMIT 10');
console.log('\ncontasPagasTasy com guia:', contasComGuia);

// Verificar se existe correspondência entre dadosTasy e itensPagosTasy
const [correspondencia] = await connection.query(`
  SELECT d.nrInternoConta, d.guia, d.codigo, d.valorTotal, i.glosaItem, i.motivoGlosa 
  FROM dadosTasy d 
  JOIN itensPagosTasy i ON d.nrInternoConta = i.conta AND d.guia = i.guia 
  WHERE i.glosaItem > 0 
  LIMIT 10
`);
console.log('\nCorrespondência dadosTasy x itensPagosTasy:', correspondencia);

await connection.end();
