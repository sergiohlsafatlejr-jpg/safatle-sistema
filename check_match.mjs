import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar contas pagas com guia preenchida
const [contasComGuia] = await conn.query(`
  SELECT COUNT(*) as total FROM contasPagasTasy WHERE guia IS NOT NULL AND guia != ''
`);
console.log('Contas pagas com guia:', contasComGuia);

// Verificar correspondência usando guia
const [matchGuia] = await conn.query(`
  SELECT COUNT(DISTINCT dt.nrInternoConta) as total
  FROM dadosTasy dt
  INNER JOIN contasPagasTasy cp ON dt.guia = cp.guia
  WHERE dt.estabelecimentoId = 60011 AND cp.guia IS NOT NULL AND cp.guia != ''
`);
console.log('Match por guia:', matchGuia);

// Verificar correspondência usando nrConta
const [matchNrConta] = await conn.query(`
  SELECT COUNT(DISTINCT dt.nrInternoConta) as total
  FROM dadosTasy dt
  INNER JOIN contasPagasTasy cp ON dt.nrInternoConta = cp.nrConta
  WHERE dt.estabelecimentoId = 60011 AND cp.nrConta IS NOT NULL AND cp.nrConta != ''
`);
console.log('Match por nrConta:', matchNrConta);

// Ver exemplos de correspondência com valores
const [exemplosMatch] = await conn.query(`
  SELECT 
    dt.nrInternoConta,
    dt.guia,
    dt.paciente,
    SUM(dt.valorTotal) as valorFaturado,
    cp.pagoConta,
    cp.glosaConta
  FROM dadosTasy dt
  INNER JOIN contasPagasTasy cp ON dt.guia = cp.guia
  WHERE dt.estabelecimentoId = 60011 AND cp.guia IS NOT NULL AND cp.guia != ''
  GROUP BY dt.nrInternoConta, dt.guia, dt.paciente, cp.pagoConta, cp.glosaConta
  LIMIT 5
`);
console.log('Exemplos de correspondência:', exemplosMatch);

// Verificar itens pagos com glosa e correspondência
const [itensGlosaMatch] = await conn.query(`
  SELECT 
    ip.guia,
    ip.conta,
    ip.glosaItem,
    ip.motivoGlosa,
    dt.nrInternoConta,
    dt.codigo,
    dt.descricao
  FROM itensPagosTasy ip
  INNER JOIN dadosTasy dt ON ip.guia = dt.guia
  WHERE ip.glosaItem > 0 AND dt.estabelecimentoId = 60011
  LIMIT 5
`);
console.log('Itens com glosa e correspondência:', itensGlosaMatch);

await conn.end();
