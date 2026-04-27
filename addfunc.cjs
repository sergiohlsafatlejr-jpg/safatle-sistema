const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

const newFunc = `
export async function verificarPermissaoEstabelecimento(
  userId: number,
  estabelecimentoId: number,
  permissao: 'visualizar' | 'editar' | 'excluir' | 'gerenciar'
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user?.role === 'admin') return true;

  type PermissoesColumns = {
      visualizar: ReturnType<typeof eq>;
      editar: ReturnType<typeof eq>;
      excluir: ReturnType<typeof eq>;
      gerenciar: ReturnType<typeof eq>;
  };
  
  const permCols = {
      visualizar: eq(permissoesEstabelecimento.podeVisualizar, 'sim'),
      editar: eq(permissoesEstabelecimento.podeEditar, 'sim'),
      excluir: eq(permissoesEstabelecimento.podeExcluir, 'sim'),
      gerenciar: eq(permissoesEstabelecimento.podeGerenciar, 'sim')
  };

  const permissoes = await db
    .select()
    .from(permissoesEstabelecimento)
    .where(and(
      eq(permissoesEstabelecimento.userId, userId),
      eq(permissoesEstabelecimento.estabelecimentoId, estabelecimentoId),
      permCols[permissao]
    ));

  return permissoes.length > 0;
}
`;

fs.writeFileSync('server/db.ts', code + '\n\n' + newFunc);
console.log('Added verificarPermissaoEstabelecimento');
