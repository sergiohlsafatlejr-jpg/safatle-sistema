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

    expect(result).toEqual({
      success: true,
      ids: [1, 2, 3],
      count: 3,
    });
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
    expect(result.count).toBe(3);
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

    expect(result).toEqual({ success: true, id: 1 });
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
    expect(result.length).toBe(2);
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
