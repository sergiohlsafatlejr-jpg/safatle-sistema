import { getDb } from './server/_core/db.js';
import { arquivos } from './drizzle/schema.js';
import { like, desc } from 'drizzle-orm';

const db = await getDb();
const result = await db.select({
  id: arquivos.id,
  nome: arquivos.nome,
  s3Key: arquivos.s3Key,
  s3Url: arquivos.s3Url,
  tipoArquivo: arquivos.tipoArquivo,
  convenioId: arquivos.convenioId
}).from(arquivos)
  .where(like(arquivos.nome, '%0278119%'))
  .orderBy(desc(arquivos.createdAt))
  .limit(5);

console.log(JSON.stringify(result, null, 2));
process.exit(0);
