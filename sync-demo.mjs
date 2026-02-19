import { getDb } from './server/db.ts';
import { syncDemonstrativoByArquivo } from './server/syncDemonstrativo.ts';

async function main() {
  try {
    // ID do arquivo Demostrativo 12-2025
    const arquivoId = 32; // Ajuste conforme necessário
    
    console.log(`Sincronizando arquivo ${arquivoId}...`);
    const result = await syncDemonstrativoByArquivo(arquivoId, 'excel');
    console.log('Resultado:', result);
  } catch (error) {
    console.error('Erro:', error);
  }
  process.exit(0);
}

main();
