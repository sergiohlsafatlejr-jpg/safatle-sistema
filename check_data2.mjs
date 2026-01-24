import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar dadosTasy
const [dadosTasy] = await connection.query('SELECT COUNT(*) as total FROM dadosTasy');
console.log('dadosTasy:', dadosTasy[0].total);

// Verificar contasPagasTasy
const [contasPagas] = await connection.query('SELECT COUNT(*) as total FROM contasPagasTasy');
console.log('contasPagasTasy:', contasPagas[0].total);

// Verificar itensPagosTasy
const [itensPagos] = await connection.query('SELECT COUNT(*) as total FROM itensPagosTasy');
console.log('itensPagosTasy:', itensPagos[0].total);

// Verificar alguns registros de contasPagasTasy
const [contasAmostra] = await connection.query('SELECT nrConta, guia, convenio, pagoConta, glosaConta FROM contasPagasTasy LIMIT 5');
console.log('\nAmostra contasPagasTasy:', contasAmostra);

// Verificar alguns registros de itensPagosTasy
const [itensAmostra] = await connection.query('SELECT conta, guia, procedimento, material, glosaItem, motivoGlosa FROM itensPagosTasy WHERE glosaItem > 0 LIMIT 5');
console.log('\nAmostra itensPagosTasy com glosa:', itensAmostra);

await connection.end();
