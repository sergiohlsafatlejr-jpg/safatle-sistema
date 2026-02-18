#!/usr/bin/env node
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🔄 Iniciando migração do banco de dados...\n');

try {
  // Executar drizzle-kit generate
  console.log('📝 Gerando migrações...');
  execSync('pnpm drizzle-kit generate', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  console.log('✅ Migrações geradas com sucesso!\n');

  // Executar drizzle-kit migrate
  console.log('🚀 Aplicando migrações ao banco...');
  execSync('pnpm drizzle-kit migrate', {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  console.log('✅ Migrações aplicadas com sucesso!\n');

  console.log('🎉 Migração completa!');
  process.exit(0);
} catch (error) {
  console.error('❌ Erro durante migração:', error.message);
  process.exit(1);
}
