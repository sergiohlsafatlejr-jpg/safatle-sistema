import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar itens pagos com glosa
const [itensGlosa] = await conn.query(`
  SELECT COUNT(*) as total, SUM(glosaItem) as totalGlosa
  FROM itensPagosTasy 
  WHERE glosaItem > 0
`);
console.log('Itens com glosa:', itensGlosa);

// Verificar exemplos de itens pagos com glosa
const [exemplos] = await conn.query(`
  SELECT guia, conta, nrSeqConta, glosaItem, motivoGlosa, procedimento, material
  FROM itensPagosTasy 
  WHERE glosaItem > 0
  LIMIT 5
`);
console.log('Exemplos de itens com glosa:', exemplos);

// Verificar contas pagas
const [contasPagas] = await conn.query(`
  SELECT COUNT(*) as total, SUM(pagoConta) as totalPago, SUM(glosaConta) as totalGlosa
  FROM contasPagasTasy 
`);
console.log('Contas pagas:', contasPagas);

// Verificar exemplos de contas pagas
const [exemplosContas] = await conn.query(`
  SELECT guia, nrConta, convenio, pagoConta, glosaConta
  FROM contasPagasTasy 
  LIMIT 5
`);
console.log('Exemplos de contas pagas:', exemplosContas);

// Verificar se há correspondência entre dadosTasy e contasPagasTasy
const [correspondencia] = await conn.query(`
  SELECT 
    dt.guia as guiaFaturado,
    cp.guia as guiaPago,
    dt.nrInternoConta as contaFaturado,
    cp.nrConta as contaPago
  FROM dadosTasy dt
  INNER JOIN contasPagasTasy cp ON dt.guia = cp.guia
  WHERE dt.estabelecimentoId = 60011
  LIMIT 5
`);
console.log('Correspondência dadosTasy x contasPagasTasy:', correspondencia);

// Verificar campos de ligação
const [camposLigacao] = await conn.query(`
  SELECT DISTINCT guia, nrInternoConta, atendimento
  FROM dadosTasy 
  WHERE estabelecimentoId = 60011
  LIMIT 10
`);
console.log('Campos de ligação dadosTasy:', camposLigacao);

const [camposLigacaoContas] = await conn.query(`
  SELECT DISTINCT guia, nrConta, nrSeqConta
  FROM contasPagasTasy 
  LIMIT 10
`);
console.log('Campos de ligação contasPagasTasy:', camposLigacaoContas);

await conn.end();
