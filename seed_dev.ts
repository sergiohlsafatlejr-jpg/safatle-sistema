import { getDb } from "./server/db";
import { estabelecimentos, permissoesEstabelecimento, users } from "./drizzle/schema";
import { eq, and } from "drizzle-orm";

async function main() {
  console.log("Seeding development database...");
  const db = await getDb();
  if (!db) {
    throw new Error("Cannot connect to DB");
  }

  // 1. Verificar se o estabelecimento padrão já existe
  const [estResult] = await db.select().from(estabelecimentos).where(eq(estabelecimentos.nome, "Safatle Gerenciamento")).limit(1);
  let estId = estResult?.id;

  if (!estId) {
    console.log("Criando estabelecimento Safatle Gerenciamento...");
    const [result] = await db.insert(estabelecimentos).values({
      nome: "Safatle Gerenciamento",
      cnpj: "00000000000000",
      endereco: "Sede de Desenvolvimento",
      ativo: "sim"
    });
    estId = result.insertId;
  }

  if (!estId) {
    throw new Error("Falha ao encontrar ou criar estabelecimento.");
  }

  // 2. Encontrar o usuário dev-admin-id
  const [userResult] = await db.select().from(users).where(eq(users.openId, "dev-admin-id")).limit(1);
  let userId = userResult?.id;

  if (!userId) {
    console.log("Criando usuário dev-admin-id manual...");
    const [result] = await db.insert(users).values({
      openId: "dev-admin-id",
      name: "Desenvolvedor Local",
      email: "dev@localhost",
      role: "admin",
      loginMethod: "bypass"
    });
    userId = result.insertId;
  }

  if (!userId) {
    throw new Error("Falha ao encontrar ou criar usuário.");
  }

  // 3. Vincular usuário ao estabelecimento com permissão de administrador
  const [permissao] = await db.select()
    .from(permissoesEstabelecimento)
    .where(and(
      eq(permissoesEstabelecimento.userId, userId),
      eq(permissoesEstabelecimento.estabelecimentoId, estId)
    ))
    .limit(1);

  if (!permissao) {
    console.log("Concedendo permissões de acesso ao mock admin...");
    
    await db.insert(permissoesEstabelecimento).values({
      userId: userId,
      estabelecimentoId: estId,
      grupoServico: "administrador",
      podeVisualizar: "sim",
      podeEditar: "sim",
      podeExcluir: "sim",
      podeGerenciar: "sim",
      acessoDashboard: "sim",
      acessoArquivos: "sim",
      acessoComparacoes: "sim",
      acessoFaturamento: "sim",
      acessoTabelasPreco: "sim",
      acessoAnaliseGlosa: "sim",
      acessoDicionarioGlosas: "sim",
      acessoRecursosGlosa: "sim",
      acessoConvenios: "sim",
      acessoRegrasNegocio: "sim",
      acessoProdutividade: "sim",
      acessoEstabelecimentos: "sim",
      acessoPermissoes: "sim",
      acessoImportacaoTasy: "sim",
      acessoContasFaturadas: "sim",
      acessoRelatoriosTasy: "sim",
      acessoRelatoriosBi: "sim",
      acessoConciliacaoContasPagas: "sim",
      acessoRecebimentosXml: "sim",
      acessoRecebimentosExcel: "sim",
      acessoDemonstrativo: "sim",
      acessoContaConvenio: "sim",
      acessoRecursos: "sim",
      acessoAtendimentos: "sim",
      acessoAtendimentosFaturar: "sim"
    });
  }

  console.log("Seed concluído com sucesso!");
  process.exit(0);
}

main().catch(console.error);
