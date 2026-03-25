# Guia de Configuração da Equipe (Setup)

Bem-vindos ao projeto **Hospital File Manager**! Este documento foi criado para ajudar você (desenvolvedor 2 e 3) a configurar o projeto na sua máquina do zero sem conflitos.

## 1. Ferramentas Necessárias

Antes de começar, certifique-se de que sua máquina possui:
- **Node.js** (versão 18 ou superior, preferencialmente LTS).
- **Git** instalado.
- **PostgreSQL** (rodando localmente ou via Docker). Recomendado ter uma base vazia chamada `hospital_file_manager`.
- Extensão do **Prettier** instalada no seu editor (VS Code, Cursor) configurada para `Format On Save` (Formatar ao Salvar).

---

## 2. Passo a Passo Inicial

### 1. Clonar o Repositório
Evite trabalhar na branch `main`. Crie uma branch para o seu desenvolvimento.
```bash
git clone https://github.com/sergiohlsafatlejr-jpg/hospital_file_manager.git
cd hospital_file_manager
```

### 2. Configurar o Ambiente Local (.env)
Vocês devem ter o seu próprio arquivo de variáveis de ambiente. A senha do banco do *Dev 1* é diferente da sua, e nunca devemos submeter isso ao GitHub.

- Duplique o arquivo `.env.example` e renomeie-o para `.env`
- Preencha o `DATABASE_URL` no `.env` apontando para o seu banco Postgres local (Ex: `postgres://postgres:senha@localhost:5432/hospital_file_manager`).
*(Nota: O arquivo `.env` já está no `.gitignore` para a sua segurança, portanto, nunca vai para o GitHub).*

### 3. Instalar Dependências
O projeto utiliza o **pnpm** para gerenciamento de pacotes, garantindo versões exatas para todos pela trava no `pnpm-lock.yaml`.

Ative o `pnpm` caso ainda não tenha (que vem junto no Node.js recente):
```bash
corepack enable
pnpm install
```

### 4. Preparar o Banco de Dados Drizzle (Migrate)
Crie as tabelas no seu banco local rodando as migrações:
```bash
pnpm db:push
```

### 5. Rodar o Projeto
Agora, finalmente rode o projeto locally:
```bash
pnpm dev
```
Isso levantará os servidores no seu localhost.

---

## 3. Padrão de Fluxo de Trabalho (Workflow)

Para que 3 desenvolvedores trabalhem simultaneamente no mesmo código de forma saudável:

1. **JAMAIS COMITAR DIRETO NA MAIN.**
2. Ao pegar uma tarefa, certifique-se de atualizar sua máquina com a versão mais recente (`git pull origin main`).
3. Crie sempre uma ramificação (Branch): `git checkout -b feature/nome-da-sua-tarefa` ou `fix/corrige-botao`.
4. Trabalhe nela, e ao terminar:
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade XPTO"
git push origin feature/nome-da-sua-tarefa
```
5. No GitHub, abra um **Pull Request (PR)** da sua `feature` para a `main`.
6. Peça para o Dev 1 ou 2 revisar e aprovar o PR. Estando testado, será fundido à versão mestre da aplicação!

**Bom desenvolvimento a todos!** 🚀
