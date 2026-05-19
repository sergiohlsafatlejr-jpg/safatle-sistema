const mysql = require('mysql2/promise');
async function run() {
  try {
    const connection = await mysql.createConnection('mysql://root:safatle2026@localhost:3306/safatle_sistema?timezone=Z');
    await connection.execute(`CREATE TABLE IF NOT EXISTS credenciais_portais (
      id INT AUTO_INCREMENT PRIMARY KEY, 
      convenioId INT NOT NULL, 
      estabelecimentoId INT, 
      login VARCHAR(255) NOT NULL, 
      senha TEXT NOT NULL, 
      urlLogin VARCHAR(255), 
      ativo ENUM('sim', 'nao') DEFAULT 'sim' NOT NULL, 
      ultimoAcesso TIMESTAMP, 
      statusAcesso ENUM('sucesso', 'erro', 'pendente') DEFAULT 'pendente', 
      mensagemErro TEXT, 
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL, 
      FOREIGN KEY (convenioId) REFERENCES convenios(id) ON DELETE CASCADE
    )`);
    console.log('Tabela criada!');
    
    const [rows] = await connection.execute('SELECT * FROM arquivos ORDER BY id DESC LIMIT 2');
    console.log('Ultimos arquivos:');
    console.dir(rows);
    
    await connection.end();
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
