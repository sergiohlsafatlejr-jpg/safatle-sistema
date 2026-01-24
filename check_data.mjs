import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar dadosTasy
const [dadosTasy] = await connection.query('SELECT COUNT(*) as total FROM dados_tasy');
console.log('dadosTasy:', dadosTasy[0].total);

// Verificar contasPagasTasy
const [contasPagas] = await connection.query('SELECT COUNT(*) as total FROM contas_pagas_tasy');
console.log('contasPagasTasy:', contasPagas[0].total);

// Verificar itensPagosTasy
const [itensPagos] = await connection.query('SELECT COUNT(*) as total FROM itens_pagos_tasy');
console.log('itensPagosTasy:', itensPagos[0].total);

// Verificar alguns registros de contasPagasTasy
const [contasAmostra] = await connection.query('SELECT nr_conta, guia, convenio, pago_conta, glosa_conta FROM contas_pagas_tasy LIMIT 5');
console.log('\nAmostra contasPagasTasy:', contasAmostra);

// Verificar alguns registros de itensPagosTasy
const [itensAmostra] = await connection.query('SELECT conta, guia, procedimento, material, glosa_item, motivo_glosa FROM itens_pagos_tasy WHERE glosa_item > 0 LIMIT 5');
console.log('\nAmostra itensPagosTasy com glosa:', itensAmostra);

await connection.end();
