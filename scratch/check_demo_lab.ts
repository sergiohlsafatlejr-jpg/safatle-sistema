import 'dotenv/config';
import mysql from 'mysql2/promise';

// Códigos de laboratório extraídos da imagem do usuário
const codigosLab = [
  '40301630','40302040','40302059','40302067','40302075','40302083',
  '40302091','40302105','40302113','40302121','40302148','40302156',
  '40302164','40302172','40302180','40302199','40302202','40302210',
  '40302229','40302237','40302245','40302253','40302261','40302270',
  '40302288','40302296','40302300','40302318','40302326','40302334',
  '40302342','40302350','40302369','40302377','40302385','40302393',
  '40302407','40302415','40302423','40302431','40302440','40302458',
  '40302466','40302474','40302482','40302490','40302504','40302512',
  '40302520','40302539','40302547','40302555','40302563','40302571',
  '40302580','40302598','40302601','40302610','40302628','40302636',
  '40302644','40302652','40302660','40302679','40302687','40302695',
  '40302709','40302717','40302725','40302733','40302741','40302750',
  '40302768','40302776','40302784','40302792','40302806','40302814',
  '40302822','40302830','40302849','40302857','40302865','40302873',
  '40302881','40302890','40302903'
];

(async () => {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // 1. Data_referencia disponíveis para PS (id=1)
  const [refs] = await conn.execute(
    `SELECT DISTINCT DATE_FORMAT(data_referencia, '%Y-%m') as competencia, COUNT(*) as total 
     FROM demonstrativo WHERE estabelecimentoId = 1 
     GROUP BY DATE_FORMAT(data_referencia, '%Y-%m') ORDER BY competencia DESC LIMIT 12`
  );
  console.log('\n=== COMPETÊNCIAS DISPONÍVEIS (PS) ===');
  console.table(refs);

  // 2. Quantos desses códigos existem no demonstrativo do PS
  const placeholders = codigosLab.map(() => '?').join(',');
  const [matched] = await conn.execute(
    `SELECT codigo_item, descricao_item, situacao_item, 
            COUNT(*) as qtd,
            SUM(CAST(valor_pago AS DECIMAL(12,2))) as total_pago,
            SUM(CAST(valor_glosa AS DECIMAL(12,2))) as total_glosa
     FROM demonstrativo 
     WHERE estabelecimentoId = 1 AND codigo_item IN (${placeholders})
     GROUP BY codigo_item, descricao_item, situacao_item
     ORDER BY total_pago DESC
     LIMIT 30`,
    codigosLab
  );
  console.log('\n=== CÓDIGOS LAB ENCONTRADOS (TOP 30) ===');
  console.table(matched);

  // 3. Resumo geral
  const [resumo] = await conn.execute(
    `SELECT 
       COUNT(*) as total_itens,
       COUNT(DISTINCT codigo_item) as codigos_unicos,
       SUM(CAST(valor_pago AS DECIMAL(12,2))) as total_pago,
       SUM(CAST(valor_glosa AS DECIMAL(12,2))) as total_glosa
     FROM demonstrativo 
     WHERE estabelecimentoId = 1 AND codigo_item IN (${placeholders})`,
    codigosLab
  );
  console.log('\n=== RESUMO GERAL CÓDIGOS LAB ===');
  console.table(resumo);

  // 4. Situações
  const [sits] = await conn.execute(
    `SELECT situacao_item, COUNT(*) as total, 
            SUM(CAST(valor_pago AS DECIMAL(12,2))) as vl_pago,
            SUM(CAST(valor_glosa AS DECIMAL(12,2))) as vl_glosa
     FROM demonstrativo 
     WHERE estabelecimentoId = 1 AND codigo_item IN (${placeholders})
     GROUP BY situacao_item`,
    codigosLab
  );
  console.log('\n=== POR SITUAÇÃO ===');
  console.table(sits);

  await conn.end();
  process.exit(0);
})();
