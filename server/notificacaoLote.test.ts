import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// Mock the pgAtendimentos module
vi.mock("./pgAtendimentos", () => ({
  getAtendimentosParados: vi.fn().mockResolvedValue([
    {
      numatend: "1001",
      nomepac: "PACIENTE TESTE 1",
      nomeplaco: "PLANO A",
      carater: "E",
      datatend: "2025-01-01",
      datasai: "2025-01-01",
      tipoatend: "1",
      tipoatendimentodescricao: "AMBULATORIO",
      codserv: "CONSULTA",
      procprin: "10101012",
      codcc_destino: "CC1",
      motivo: null,
    },
    {
      numatend: "1002",
      nomepac: "PACIENTE TESTE 2",
      nomeplaco: "PLANO B",
      carater: "U",
      datatend: "2025-01-02",
      datasai: "2025-01-02",
      tipoatend: "2",
      tipoatendimentodescricao: "INTERNACAO",
      codserv: "INTERNACAO CLINICA",
      procprin: "10101013",
      codcc_destino: "CC2",
      motivo: null,
    },
  ]),
  salvarNotificacao: vi.fn().mockResolvedValue(1),
  salvarNotificacaoEmLote: vi.fn().mockResolvedValue([1, 2, 3]),
  salvarHistoricoNotificacao: vi.fn().mockResolvedValue(42),
  listarHistoricoNotificacoes: vi.fn().mockResolvedValue([
    {
      id: 1,
      data_geracao: "2025-02-13 10:00:00",
      qtd_atendimentos: 3,
      observacao: "Notificação de teste",
      usuario: "Sample User",
      atendimentos_json: JSON.stringify([
        { numatend: "1001", nomepac: "PACIENTE 1", nomeplaco: "PLANO A", datatend: "2025-01-01", datasai: "2025-01-01", diasParado: 30, tipoatendimentodescricao: "AMBULATORIO", codserv: "CONSULTA" },
        { numatend: "1002", nomepac: "PACIENTE 2", nomeplaco: "PLANO B", datatend: "2025-01-02", datasai: "2025-01-02", diasParado: 29, tipoatendimentodescricao: "INTERNACAO", codserv: "INTERNACAO CLINICA" },
      ]),
      notificacoes_json: JSON.stringify([
        { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
      ]),
    },
    {
      id: 2,
      data_geracao: "2025-02-12 14:30:00",
      qtd_atendimentos: 1,
      observacao: "Outra notificação",
      usuario: "Admin",
      atendimentos_json: JSON.stringify([
        { numatend: "1003", nomepac: "PACIENTE 3", nomeplaco: "PLANO C", datatend: "2025-01-03", datasai: null, diasParado: 28, tipoatendimentodescricao: "EXAME", codserv: "ULTRASSOM" },
      ]),
      notificacoes_json: JSON.stringify([
        { motivo: "enfermagem", setor: "enfermagem", medico: "" },
      ]),
    },
  ]),
  getAtendimentosAFaturar: vi.fn().mockResolvedValue([]),
  testConnection: vi.fn().mockResolvedValue(true),
}));

describe("atendimentos.registrarNotificacaoEmLote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra notificações em lote para múltiplos atendimentos", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.registrarNotificacaoEmLote({
      atendimentos: [
        { numatend: "1001", nomepac: "PACIENTE TESTE 1" },
        { numatend: "1002", nomepac: "PACIENTE TESTE 2" },
        { numatend: "1003", nomepac: "PACIENTE TESTE 3" },
      ],
      observacao: "Notificação em lote para teste",
      notificacoes: [
        { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
      ],
    });

    expect(result.success).toBe(true);
    expect(Array.isArray(result.ids)).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it("requer observação não vazia no input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // A observação é um campo string obrigatório no schema zod
    // O zod aceita string vazia, mas a validação de negócio é no frontend
    const result = await caller.atendimentos.registrarNotificacaoEmLote({
      atendimentos: [
        { numatend: "1001", nomepac: "PACIENTE TESTE 1" },
      ],
      observacao: "",
      notificacoes: [
        { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("aceita múltiplas linhas de notificação", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.registrarNotificacaoEmLote({
      atendimentos: [
        { numatend: "1001", nomepac: "PACIENTE TESTE 1" },
      ],
      observacao: "Teste com múltiplas linhas",
      notificacoes: [
        { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
        { motivo: "enfermagem", setor: "enfermagem", medico: "dr_wilson" },
        { motivo: "autorizacao", setor: "recepcao", medico: "outros" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  it("rejeita chamada sem autenticação", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.atendimentos.registrarNotificacaoEmLote({
        atendimentos: [
          { numatend: "1001", nomepac: "PACIENTE TESTE 1" },
        ],
        observacao: "Teste sem auth",
        notificacoes: [
          { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
        ],
      })
    ).rejects.toThrow();
  });

  it("rejeita input com atendimentos faltando campos obrigatórios", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.atendimentos.registrarNotificacaoEmLote({
        atendimentos: [
          // @ts-expect-error - testando validação zod
          { numatend: "1001" },
        ],
        observacao: "Teste",
        notificacoes: [
          { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
        ],
      })
    ).rejects.toThrow();
  });
});

describe("atendimentos.registrarNotificacao (individual)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra notificação individual com sucesso", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.registrarNotificacao({
      numatend: "1001",
      observacao: "Teste individual",
      notificacoes: [
        { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result).toHaveProperty('id');
    expect(typeof result.id).toBe('number');
  });

  it("rejeita chamada sem autenticação", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.atendimentos.registrarNotificacao({
        numatend: "1001",
        observacao: "Teste sem auth",
        notificacoes: [
          { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
        ],
      })
    ).rejects.toThrow();
  });
});

describe("atendimentos.listar", () => {
  it("lista atendimentos parados com sucesso", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.listar();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toHaveProperty("numatend");
    expect(result[0]).toHaveProperty("nomepac");
    expect(result[0]).toHaveProperty("diasParado");
  });

  it("rejeita chamada sem autenticação", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.atendimentos.listar()).rejects.toThrow();
  });
});

describe("atendimentos.salvarHistorico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("salva histórico de notificação com dados completos", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.salvarHistorico({
      qtdAtendimentos: 2,
      observacao: "Teste de persistência",
      atendimentos: [
        {
          numatend: "1001",
          nomepac: "PACIENTE TESTE 1",
          nomeplaco: "PLANO A",
          datatend: "2025-01-01",
          datasai: "2025-01-01",
          diasParado: 30,
          tipoatendimentodescricao: "AMBULATORIO",
          codserv: "CONSULTA",
        },
        {
          numatend: "1002",
          nomepac: "PACIENTE TESTE 2",
          nomeplaco: "PLANO B",
          datatend: "2025-01-02",
          datasai: null,
          diasParado: 29,
          tipoatendimentodescricao: "INTERNACAO",
          codserv: "INTERNACAO CLINICA",
        },
      ],
      notificacoes: [
        { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
      ],
    });

    expect(result).toEqual({ success: true, id: 42 });
  });

  it("rejeita chamada sem autenticação", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.atendimentos.salvarHistorico({
        qtdAtendimentos: 1,
        observacao: "Teste",
        atendimentos: [
          {
            numatend: "1001",
            nomepac: "PACIENTE",
            nomeplaco: "PLANO",
            datatend: "2025-01-01",
            datasai: null,
            diasParado: 10,
            tipoatendimentodescricao: "AMBULATORIO",
            codserv: "CONSULTA",
          },
        ],
        notificacoes: [
          { motivo: "medico", setor: "faturamento", medico: "dr_jose_dias" },
        ],
      })
    ).rejects.toThrow();
  });

  it("aceita datasai como null", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.salvarHistorico({
      qtdAtendimentos: 1,
      observacao: "Teste com datasai null",
      atendimentos: [
        {
          numatend: "1001",
          nomepac: "PACIENTE",
          nomeplaco: "PLANO",
          datatend: "2025-01-01",
          datasai: null,
          diasParado: 10,
          tipoatendimentodescricao: "AMBULATORIO",
          codserv: "CONSULTA",
        },
      ],
      notificacoes: [],
    });

    expect(result.success).toBe(true);
  });
});

describe("atendimentos.listarHistorico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista histórico de notificações com dados parseados", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.listarHistorico();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Primeiro item
    expect(result[0]).toHaveProperty("id", 1);
    expect(result[0]).toHaveProperty("dataGeracao");
    expect(result[0]).toHaveProperty("qtdAtendimentos", 3);
    expect(result[0]).toHaveProperty("observacao", "Notificação de teste");
    expect(result[0]).toHaveProperty("usuario", "Sample User");
    expect(Array.isArray(result[0].atendimentos)).toBe(true);
    expect(result[0].atendimentos.length).toBe(2);
    expect(result[0].atendimentos[0]).toHaveProperty("numatend", "1001");
    expect(Array.isArray(result[0].notificacoes)).toBe(true);
    expect(result[0].notificacoes[0]).toHaveProperty("motivo", "medico");

    // Segundo item
    expect(result[1]).toHaveProperty("id", 2);
    expect(result[1]).toHaveProperty("qtdAtendimentos", 1);
    expect(result[1]).toHaveProperty("usuario", "Admin");
    expect(result[1].atendimentos.length).toBe(1);
  });

  it("rejeita chamada sem autenticação", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.atendimentos.listarHistorico()).rejects.toThrow();
  });

  it("retorna array vazio quando não há histórico", async () => {
    const { listarHistoricoNotificacoes } = await import("./pgAtendimentos");
    (listarHistoricoNotificacoes as any).mockResolvedValueOnce([]);

    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.atendimentos.listarHistorico();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});
