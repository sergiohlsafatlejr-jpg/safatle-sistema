import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: ''
  });
  
  // Apply fix globally
  await connection.query("SET GLOBAL sql_mode = 'NO_ENGINE_SUBSTITUTION'");
  console.log('sql_mode updated globally.');

  // Drop and recreate DB for a fresh clean state
  await connection.query("DROP DATABASE IF EXISTS hospital_file_manager");
  await connection.query("CREATE DATABASE hospital_file_manager");
  console.log('Database dropped and recreated for a pristine run.');
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
