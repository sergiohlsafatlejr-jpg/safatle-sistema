import { getDb } from '../server/db'; 

async function run() { 
  const db = await getDb(); 
  await db.execute(`CREATE TABLE IF NOT EXISTS credenciais_portais (
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
  console.log('Tabela criada com sucesso!'); 
  process.exit(0); 
} 
run();
