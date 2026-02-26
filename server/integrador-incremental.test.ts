import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do db-integrador
vi.mock("./db-integrador", () => {
  const mapeamentoBase = {
    id: 1,
    nome: "Test Mapeamento",
    descricao: null,
    conexaoOrigemId: 1,
    tabelaDestinoId: 1,
    queryOrigem: "SELECT * FROM test_table",
    campoChave: "id",
    frequencia: "manual" as const,
    ativo: "sim" as const,
    estabelecimentoId: 1,
    modoImportacao: "incremental" as const,
    colunaControle: "id",
    ultimoValorControle: "100",
    ultimaSincronizacao: new Date(),
    totalRegistrosImportados: 500,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };

  const mapeamentoCompleto = {
    ...mapeamentoBase,
    id: 2,
    nome: "Test Mapeamento Completo",
    modoImportacao: "completa" as const,
    colunaControle: null,
    ultimoValorControle: null,
    totalRegistrosImportados: 0,
  };

  const mapeamentoIncrementalSemValor = {
    ...mapeamentoBase,
    id: 3,
    nome: "Test Mapeamento Incremental Novo",
    ultimoValorControle: null,
    totalRegistrosImportados: 0,
  };

  return {
    listarMapeamentos: vi.fn().mockResolvedValue([mapeamentoBase, mapeamentoCompleto]),
    obterMapeamento: vi.fn().mockImplementation(async (id: number) => {
      if (id === 1) return mapeamentoBase;
      if (id === 2) return mapeamentoCompleto;
      if (id === 3) return mapeamentoIncrementalSemValor;
      return null;
    }),
    criarMapeamento: vi.fn().mockResolvedValue(10),
    atualizarMapeamento: vi.fn().mockResolvedValue(undefined),
    excluirMapeamento: vi.fn().mockResolvedValue(undefined),
    listarCamposMapeamento: vi.fn().mockResolvedValue([]),
    salvarCamposMapeamento: vi.fn().mockResolvedValue(undefined),
    listarConexoes: vi.fn().mockResolvedValue([]),
    obterConexao: vi.fn().mockResolvedValue({
      id: 1,
      nome: "Test Conexao",
      tipo: "postgresql",
      host: "localhost",
      porta: 5432,
      banco: "testdb",
      usuario: "user",
      senhaEncriptada: Buffer.from("pass").toString("base64"),
      statusConexao: "ok",
    }),
    listarTabelas: vi.fn().mockResolvedValue([]),
    obterTabela: vi.fn().mockResolvedValue({
      id: 1,
      nome: "test_tabela",
      nomeExibicao: "Tabela Teste",
      criadaNoBanco: "sim",
      totalRegistros: 100,
    }),
    listarColunas: vi.fn().mockResolvedValue([]),
    criarSincronizacao: vi.fn().mockResolvedValue(1),
    atualizarSincronizacao: vi.fn().mockResolvedValue(undefined),
    listarSincronizacoes: vi.fn().mockResolvedValue([]),
    inserirDadosTabela: vi.fn().mockResolvedValue({ inseridos: 50 }),
    contarRegistrosTabela: vi.fn().mockResolvedValue(150),
    atualizarTabela: vi.fn().mockResolvedValue(undefined),
    limparDadosTabela: vi.fn().mockResolvedValue(undefined),
    executarDDLCriarTabela: vi.fn().mockResolvedValue("integ_test"),
    executarDDLAdicionarColuna: vi.fn().mockResolvedValue(undefined),
    executarDDLRemoverTabela: vi.fn().mockResolvedValue(undefined),
    criarColunasEmLote: vi.fn().mockResolvedValue(undefined),
    criarColuna: vi.fn().mockResolvedValue(1),
    atualizarColuna: vi.fn().mockResolvedValue(undefined),
    excluirColuna: vi.fn().mockResolvedValue(undefined),
    criarConexao: vi.fn().mockResolvedValue(1),
    atualizarConexao: vi.fn().mockResolvedValue(undefined),
    excluirConexao: vi.fn().mockResolvedValue(undefined),
    atualizarStatusConexao: vi.fn().mockResolvedValue(undefined),
    criarTabela: vi.fn().mockResolvedValue(1),
    atualizarTabela2: vi.fn().mockResolvedValue(undefined),
    excluirTabela: vi.fn().mockResolvedValue(undefined),
    consultarDadosTabela: vi.fn().mockResolvedValue([]),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Integrador de Dados - Importação Incremental", () => {
  let dbIntegrador: any;

  beforeEach(async () => {
    dbIntegrador = await import("./db-integrador");
    vi.clearAllMocks();
  });

  describe("mapeamentos.criar", () => {
    it("deve criar mapeamento com modo incremental e coluna de controle", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.mapeamentos.criar({
        nome: "Teste Incremental",
        conexaoOrigemId: 1,
        tabelaDestinoId: 1,
        queryOrigem: "SELECT * FROM atendimentos",
        modoImportacao: "incremental",
        colunaControle: "updated_at",
        frequencia: "manual",
        estabelecimentoId: 1,
      });

      expect(result.sucesso).toBe(true);
      expect(result.id).toBe(10);
      expect(dbIntegrador.criarMapeamento).toHaveBeenCalledWith(
        expect.objectContaining({
          modoImportacao: "incremental",
          colunaControle: "updated_at",
        })
      );
    });

    it("deve criar mapeamento com modo completa por padrão", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.mapeamentos.criar({
        nome: "Teste Completa",
        conexaoOrigemId: 1,
        tabelaDestinoId: 1,
        queryOrigem: "SELECT * FROM atendimentos",
        frequencia: "manual",
        estabelecimentoId: 1,
      });

      expect(result.sucesso).toBe(true);
      expect(dbIntegrador.criarMapeamento).toHaveBeenCalledWith(
        expect.objectContaining({
          modoImportacao: "completa",
          colunaControle: null,
        })
      );
    });
  });

  describe("mapeamentos.atualizar", () => {
    it("deve atualizar modo de importação para incremental", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.mapeamentos.atualizar({
        id: 2,
        modoImportacao: "incremental",
        colunaControle: "id",
      });

      expect(result.sucesso).toBe(true);
      expect(dbIntegrador.atualizarMapeamento).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          modoImportacao: "incremental",
          colunaControle: "id",
        })
      );
    });
  });

  describe("mapeamentos.resetarIncremental", () => {
    it("deve resetar o controle incremental de um mapeamento", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.mapeamentos.resetarIncremental({ id: 1 });

      expect(result.sucesso).toBe(true);
      expect(result.mensagem).toContain("resetado");
      expect(dbIntegrador.atualizarMapeamento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ultimoValorControle: null,
          totalRegistrosImportados: 0,
        })
      );
    });

    it("deve negar acesso a usuários não-admin", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.integradorDados.mapeamentos.resetarIncremental({ id: 1 })
      ).rejects.toThrow("Acesso negado");
    });
  });

  describe("mapeamentos.obter", () => {
    it("deve retornar campos incrementais no mapeamento", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.mapeamentos.obter({ id: 1 });

      expect(result).not.toBeNull();
      expect(result!.modoImportacao).toBe("incremental");
      expect(result!.colunaControle).toBe("id");
      expect(result!.ultimoValorControle).toBe("100");
      expect(result!.totalRegistrosImportados).toBe(500);
    });
  });

  describe("agenteLocal.obterControleIncremental", () => {
    it("deve retornar informações de controle incremental", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.agenteLocal.obterControleIncremental({
        mapeamentoId: 1,
      });

      expect(result.modoImportacao).toBe("incremental");
      expect(result.colunaControle).toBe("id");
      expect(result.ultimoValorControle).toBe("100");
      expect(result.totalRegistrosImportados).toBe(500);
      expect(result.queryOrigem).toBe("SELECT * FROM test_table");
    });

    it("deve retornar modo completa para mapeamento não-incremental", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.agenteLocal.obterControleIncremental({
        mapeamentoId: 2,
      });

      expect(result.modoImportacao).toBe("completa");
      expect(result.colunaControle).toBeNull();
      expect(result.ultimoValorControle).toBeNull();
    });
  });

  describe("agenteLocal.enviarDados com controle incremental", () => {
    it("deve atualizar ultimoValorControle ao enviar dados com valor de controle", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.agenteLocal.enviarDados({
        mapeamentoId: 1,
        registros: [{ id: 101, nome: "teste" }],
        ultimoValorControle: "150",
      });

      expect(result.sucesso).toBe(true);
      expect(dbIntegrador.atualizarMapeamento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ultimoValorControle: "150",
          ultimaSincronizacao: expect.any(Date),
        })
      );
    });

    it("deve atualizar apenas ultimaSincronizacao quando sem valor de controle", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.agenteLocal.enviarDados({
        mapeamentoId: 1,
        registros: [{ id: 101, nome: "teste" }],
      });

      expect(result.sucesso).toBe(true);
      expect(dbIntegrador.atualizarMapeamento).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ultimaSincronizacao: expect.any(Date),
        })
      );
    });
  });

  describe("mapeamentos.listar", () => {
    it("deve listar mapeamentos com campos incrementais", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.integradorDados.mapeamentos.listar({ estabelecimentoId: 1 });

      expect(result).toHaveLength(2);
      expect(result[0].modoImportacao).toBe("incremental");
      expect(result[1].modoImportacao).toBe("completa");
    });
  });

  describe("tabelas.obterMapeamentoVinculado", () => {
    it("deve retornar mapeamento vinculado a uma tabela", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Mock buscarMapeamentoPorTabela
      dbIntegrador.buscarMapeamentoPorTabela = vi.fn().mockResolvedValue({
        id: 1,
        nome: "Sync: Tabela Teste",
        modoImportacao: "incremental",
        colunaControle: "id",
        ultimoValorControle: "100",
        ultimaSincronizacao: new Date(),
      });

      const result = await caller.integradorDados.tabelas.obterMapeamentoVinculado({ tabelaId: 1 });

      expect(result).not.toBeNull();
      expect(result!.nome).toBe("Sync: Tabela Teste");
      expect(result!.modoImportacao).toBe("incremental");
      expect(dbIntegrador.buscarMapeamentoPorTabela).toHaveBeenCalledWith(1);
    });

    it("deve retornar null quando não há mapeamento vinculado", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      dbIntegrador.buscarMapeamentoPorTabela = vi.fn().mockResolvedValue(null);

      const result = await caller.integradorDados.tabelas.obterMapeamentoVinculado({ tabelaId: 999 });

      expect(result).toBeNull();
    });

    it("deve negar acesso a usuários não-admin", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      dbIntegrador.buscarMapeamentoPorTabela = vi.fn().mockResolvedValue({ id: 1 });

      const result = await caller.integradorDados.tabelas.obterMapeamentoVinculado({ tabelaId: 1 });

      expect(result).toBeNull();
    });
  });

  describe("tabelas.sincronizarTabela", () => {
    it("deve rejeitar quando não há mapeamento vinculado", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      dbIntegrador.buscarMapeamentoPorTabela = vi.fn().mockResolvedValue(null);

      await expect(
        caller.integradorDados.tabelas.sincronizarTabela({ tabelaId: 1 })
      ).rejects.toThrow("Nenhum mapeamento de sincronização encontrado");
    });

    it("deve negar acesso a usuários não-admin", async () => {
      const ctx = createUserContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.integradorDados.tabelas.sincronizarTabela({ tabelaId: 1 })
      ).rejects.toThrow("Acesso negado");
    });
  });

  describe("inserirDadosTabela com campoChave (upsert)", () => {
    it("deve aceitar campoChave como parâmetro opcional", async () => {
      // Testa que a função aceita o terceiro parâmetro sem erro
      const result = await dbIntegrador.inserirDadosTabela("test_table", [{ id: 1, nome: "teste" }], "id");
      expect(result).toEqual({ inseridos: 50 });
    });

    it("deve funcionar sem campoChave", async () => {
      const result = await dbIntegrador.inserirDadosTabela("test_table", [{ id: 1, nome: "teste" }]);
      expect(result).toEqual({ inseridos: 50 });
    });
  });
});
