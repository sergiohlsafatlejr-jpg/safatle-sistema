#!/bin/bash
# Script para implementar Semana 1 automaticamente
# Logging, Auditoria e Validação

set -e

echo "🚀 Implementando Semana 1 (Logging, Auditoria, Validação)..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Passo 1: Verificar se arquivos já existem
echo -e "${BLUE}[1/5] Verificando arquivos...${NC}"
if [ ! -f "server/_core/logger.ts" ]; then
  echo "❌ Arquivo logger.ts não encontrado!"
  exit 1
fi
echo -e "${GREEN}✅ Arquivos de infraestrutura encontrados${NC}"
echo ""

# Passo 2: Criar tabela auditLog
echo -e "${BLUE}[2/5] Criando tabela auditLog...${NC}"
cat >> drizzle/schema.ts << 'EOF'

// Tabela de auditoria
export const auditLog = mysqlTable('auditLog', {
  id: int('id').primaryKey().autoincrement(),
  tabela: varchar('tabela', { length: 100 }).notNull(),
  registroId: int('registroId').notNull(),
  tipoAcao: varchar('tipoAcao', { length: 20 }).notNull(),
  usuarioId: int('usuarioId').notNull(),
  usuarioNome: varchar('usuarioNome', { length: 255 }),
  valoresAnteriores: json('valoresAnteriores'),
  valoresNovos: json('valoresNovos'),
  estabelecimentoId: int('estabelecimentoId'),
  criadoEm: timestamp('criadoEm').defaultNow(),
});
EOF
echo -e "${GREEN}✅ Tabela auditLog adicionada ao schema${NC}"
echo ""

# Passo 3: Executar db:push
echo -e "${BLUE}[3/5] Executando pnpm db:push...${NC}"
pnpm db:push --force
echo -e "${GREEN}✅ Banco de dados atualizado${NC}"
echo ""

# Passo 4: Criar middleware de auditoria
echo -e "${BLUE}[4/5] Criando middleware de auditoria...${NC}"
cat > server/_core/auditMiddleware.ts << 'EOF'
/**
 * Middleware de auditoria automática
 * Registra todas as mudanças no banco de dados
 */

import { logAudit } from "./audit";

export function withAudit(tabela: string, tipoAcao: "INSERT" | "UPDATE" | "DELETE") {
  return async (opts: any) => {
    const { ctx, next } = opts;
    
    try {
      // Executar operação
      const resultado = await next();
      
      // Registrar auditoria
      if (resultado && resultado.id) {
        await logAudit({
          tabela,
          registroId: resultado.id,
          tipoAcao,
          usuarioId: ctx.user.id,
          usuarioNome: ctx.user.name,
          valoresNovos: resultado,
          estabelecimentoId: ctx.estabelecimentoId,
        });
      }
      
      return resultado;
    } catch (error) {
      // Registrar erro também
      await logAudit({
        tabela,
        registroId: 0,
        tipoAcao,
        usuarioId: ctx.user.id,
        usuarioNome: ctx.user.name,
        valoresNovos: { erro: error instanceof Error ? error.message : String(error) },
        estabelecimentoId: ctx.estabelecimentoId,
      });
      
      throw error;
    }
  };
}
EOF
echo -e "${GREEN}✅ Middleware de auditoria criado${NC}"
echo ""

# Passo 5: Adicionar variáveis de ambiente
echo -e "${BLUE}[5/5] Adicionando variáveis de ambiente...${NC}"
if ! grep -q "USE_AUDIT_LOG" .env; then
  echo "USE_AUDIT_LOG=true" >> .env
  echo -e "${GREEN}✅ Variável USE_AUDIT_LOG adicionada${NC}"
else
  echo -e "${GREEN}✅ Variável USE_AUDIT_LOG já existe${NC}"
fi

if ! grep -q "USE_STRUCTURED_LOGGING" .env; then
  echo "USE_STRUCTURED_LOGGING=true" >> .env
  echo -e "${GREEN}✅ Variável USE_STRUCTURED_LOGGING adicionada${NC}"
else
  echo -e "${GREEN}✅ Variável USE_STRUCTURED_LOGGING já existe${NC}"
fi

if ! grep -q "USE_VALIDATION" .env; then
  echo "USE_VALIDATION=true" >> .env
  echo -e "${GREEN}✅ Variável USE_VALIDATION adicionada${NC}"
else
  echo -e "${GREEN}✅ Variável USE_VALIDATION já existe${NC}"
fi

echo ""
echo -e "${GREEN}✅ SEMANA 1 IMPLEMENTADA COM SUCESSO!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Revisar os arquivos criados:"
echo "   - server/_core/logger.ts"
echo "   - server/_core/audit.ts"
echo "   - server/_core/auditMiddleware.ts"
echo "   - server/validators/index.ts"
echo ""
echo "2. Adicionar logging em procedures críticas"
echo "3. Testar: npm run dev"
echo ""
echo "Para mais informações, veja: /home/ubuntu/PLANO-ACAO-EXECUTAVEL.md"
