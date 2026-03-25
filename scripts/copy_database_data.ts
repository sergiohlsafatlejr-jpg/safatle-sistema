import mysql from 'mysql2/promise';

const OLD_DB = 'hospital_file_manager';
const NEW_DB = 'safatle_sistema';

async function migrateData() {
  console.log(`🚀 Iniciando migração de dados de '${OLD_DB}' para '${NEW_DB}'...`);
  
  const con = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    multipleStatements: true
  });

  try {
    // 1. Verificar se ambos os bancos existem
    const [dbs] = await con.query<any[]>('SHOW DATABASES');
    const dbNames = dbs.map(d => d.Database);
    
    if (!dbNames.includes(OLD_DB)) throw new Error(`Banco antigo '${OLD_DB}' não encontrado!`);
    if (!dbNames.includes(NEW_DB)) throw new Error(`Banco novo '${NEW_DB}' não encontrado!`);

    // 2. Desabilitar chaves estrangeiras
    await con.query('SET FOREIGN_KEY_CHECKS = 0;');
    console.log('✅ Verificações de chaves estrangeiras desativadas temporariamente.');

    // 3. Pegar todas as tabelas do banco novo
    const [tablesRows] = await con.query<any[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [NEW_DB]);
    const tables = tablesRows.map(t => t.table_name || t.TABLE_NAME);

    for (const table of tables) {
      console.log(`\n⏳ Processando tabela: ${table}`);
      
      // Verificar se a tabela existe no banco antigo
      const [oldTableCheck] = await con.query<any[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`, [OLD_DB, table]);
      if (oldTableCheck.length === 0) {
        console.log(`⚠️ Tabela '${table}' não existe no banco antigo. Pulando...`);
        continue;
      }

      // Pegar colunas em comum
      const [newCols] = await con.query<any[]>(`SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`, [NEW_DB, table]);
      const [oldCols] = await con.query<any[]>(`SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`, [OLD_DB, table]);
      
      const newColNames = newCols.map(c => c.column_name || c.COLUMN_NAME);
      const oldColNames = oldCols.map(c => c.column_name || c.COLUMN_NAME);
      
      const commonCols = newColNames.filter(c => oldColNames.includes(c));
      
      if (commonCols.length === 0) {
        console.log(`❌ Nenhuma coluna em comum para a tabela '${table}'. Pulando...`);
        continue;
      }

      // Limpar tabela nova antes de inserir
      await con.query(`TRUNCATE TABLE \`${NEW_DB}\`.\`${table}\``);
      
      const colsString = commonCols.map(c => `\`${c}\``).join(', ');
      
      // Copiar dados
      const query = `INSERT INTO \`${NEW_DB}\`.\`${table}\` (${colsString}) SELECT ${colsString} FROM \`${OLD_DB}\`.\`${table}\``;
      
      try {
        const [result] = await con.query<any>(query);
        console.log(`✅ ${result.affectedRows} registros copiados com sucesso!`);
      } catch (err: any) {
        console.error(`❌ Erro ao copiar tabela '${table}':`, err.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro crítico na migração:', error);
  } finally {
    // 4. Reabilitar chaves estrangeiras
    await con.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('\n✅ Verificações de chaves estrangeiras reativadas.');
    await con.end();
    console.log('🎉 Migração finalizada!');
  }
}

migrateData();
