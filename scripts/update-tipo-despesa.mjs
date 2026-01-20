import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

console.log('Atualizando tipos de despesa baseado em padrões...');

// Regras de classificação baseadas em padrões de código e descrição
const updates = [
  // Diárias - códigos começando com 6000 ou 6001, ou descrição contendo "diária"
  {
    name: 'Diárias',
    codigoDespesa: '05',
    tipoDespesa: 'diaria',
    condition: `(codigo LIKE '6000%' OR codigo LIKE '6001%' OR LOWER(descricao) LIKE '%diária%' OR LOWER(descricao) LIKE '%diaria%')`
  },
  // Taxas - códigos começando com 6002 ou 6003, ou descrição contendo "taxa"
  {
    name: 'Taxas',
    codigoDespesa: '07',
    tipoDespesa: 'taxa',
    condition: `(codigo LIKE '6002%' OR codigo LIKE '6003%' OR LOWER(descricao) LIKE '%taxa %' OR LOWER(descricao) LIKE 'taxa %')`
  },
  // Medicamentos - códigos começando com 90 (TUSS medicamentos) ou descrição com padrões de medicamentos
  {
    name: 'Medicamentos',
    codigoDespesa: '02',
    tipoDespesa: 'medicamento',
    condition: `(
      codigo LIKE '90%' 
      OR LOWER(descricao) LIKE '%mg%' 
      OR LOWER(descricao) LIKE '%ml%'
      OR LOWER(descricao) LIKE '%injetavel%'
      OR LOWER(descricao) LIKE '%injetável%'
      OR LOWER(descricao) LIKE '%comprimido%'
      OR LOWER(descricao) LIKE '%capsula%'
      OR LOWER(descricao) LIKE '%ampola%'
      OR LOWER(descricao) LIKE '%frasco%'
      OR LOWER(descricao) LIKE '%solucao%'
      OR LOWER(descricao) LIKE '%solução%'
      OR LOWER(descricao) LIKE '%xarope%'
      OR LOWER(descricao) LIKE '%pomada%'
      OR LOWER(descricao) LIKE '%creme%'
      OR LOWER(descricao) LIKE '%sodica%'
      OR LOWER(descricao) LIKE '%sodico%'
    ) AND codigoDespesa IS NULL`
  },
  // Materiais - códigos começando com 19, 20, 21, 70 ou descrição com padrões de materiais
  {
    name: 'Materiais',
    codigoDespesa: '03',
    tipoDespesa: 'material',
    condition: `(
      codigo LIKE '19%' 
      OR codigo LIKE '20%'
      OR codigo LIKE '21%'
      OR codigo LIKE '70%'
      OR LOWER(descricao) LIKE '%fio %'
      OR LOWER(descricao) LIKE '%sonda%'
      OR LOWER(descricao) LIKE '%cateter%'
      OR LOWER(descricao) LIKE '%agulha%'
      OR LOWER(descricao) LIKE '%seringa%'
      OR LOWER(descricao) LIKE '%equipo%'
      OR LOWER(descricao) LIKE '%luva%'
      OR LOWER(descricao) LIKE '%gaze%'
      OR LOWER(descricao) LIKE '%atadura%'
      OR LOWER(descricao) LIKE '%esparadrapo%'
      OR LOWER(descricao) LIKE '%alcool%'
      OR LOWER(descricao) LIKE '%álcool%'
    ) AND codigoDespesa IS NULL`
  },
  // Gases - descrição contendo oxigênio, ar comprimido, etc.
  {
    name: 'Gases',
    codigoDespesa: '01',
    tipoDespesa: 'gas',
    condition: `(
      LOWER(descricao) LIKE '%oxigênio%'
      OR LOWER(descricao) LIKE '%oxigenio%'
      OR LOWER(descricao) LIKE '%ar comprimido%'
      OR LOWER(descricao) LIKE '%gas medicinal%'
      OR LOWER(descricao) LIKE '%gás medicinal%'
      OR LOWER(descricao) LIKE '%n2o%'
      OR LOWER(descricao) LIKE '%óxido nitroso%'
    ) AND codigoDespesa IS NULL`
  },
];

// Executar atualizações
for (const update of updates) {
  const query = `
    UPDATE procedimentos 
    SET codigoDespesa = '${update.codigoDespesa}', tipoDespesa = '${update.tipoDespesa}'
    WHERE ${update.condition}
  `;
  
  try {
    const [result] = await conn.execute(query);
    console.log(`${update.name}: ${result.affectedRows} registros atualizados`);
  } catch (error) {
    console.error(`Erro ao atualizar ${update.name}:`, error.message);
  }
}

// Verificar resultado final
const [stats] = await conn.execute(`
  SELECT 
    codigoDespesa,
    tipoDespesa,
    COUNT(*) as quantidade 
  FROM procedimentos 
  GROUP BY codigoDespesa, tipoDespesa 
  ORDER BY quantidade DESC
`);

console.log('\nResultado final:');
console.table(stats);

await conn.end();
console.log('\nAtualização concluída!');
