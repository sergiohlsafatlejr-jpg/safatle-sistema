import { getDb } from './server/db.ts';
import { syncDemonstrativoByArquivo } from './server/syncDemonstrativo.ts';

// Encontrar arquivo Demostrativo 12-2025
const db = await getDb();
const arquivo = await db.query.arquivos.findFirst({
  where: (a, { like }) => like(a.nome, '%Demostrativo 12-2025%'),
});

if (arquivo) {
  console.log('Arquivo encontrado:', arquivo.id, arquivo.nome);
  const result = await syncDemonstrativoByArquivo(arquivo.id, 'excel');
  console.log('Resultado da sincronização:', result);
} else {
  console.log('Arquivo não encontrado');
}
