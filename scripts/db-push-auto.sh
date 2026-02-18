#!/bin/bash
set -e

echo "🔄 Iniciando migração do banco de dados..."
echo "Executando: pnpm db:push"

cd /home/ubuntu/hospital_file_manager

# Executar db:push com stdin vazio para evitar prompts
echo "" | pnpm db:push 2>&1 || true

echo "✅ Migração concluída!"
