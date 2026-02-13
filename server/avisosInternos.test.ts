import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock do db para evitar dependência de banco real nos testes
vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal() as any;

  let avisos: any[] = [];
  let nextId = 1;

  return {
    ...original,
    listarAvisosInternos: vi.fn(async () => {
      return [...avisos].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),
    listarAvisosAtivos: vi.fn(async () => {
      const agora = new Date();
      return avisos
        .filter(a => a.ativo === "sim" && (!a.expiraEm || a.expiraEm > agora))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),
    criarAvisoInterno: vi.fn(async (data: any) => {
      const aviso = {
        id: nextId++,
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo,
        ativo: "sim",
        criadoPorId: data.criadoPorId,
        criadoPorNome: data.criadoPorNome,
        expiraEm: data.expiraEm || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      avisos.push(aviso);
      return [{ insertId: aviso.id }];
    }),
    editarAvisoInterno: vi.fn(async (id: number, data: any) => {
      const idx = avisos.findIndex(a => a.id === id);
      if (idx >= 0) {
        avisos[idx] = { ...avisos[idx], ...data, updatedAt: new Date() };
      }
    }),
    excluirAvisoInterno: vi.fn(async (id: number) => {
      avisos = avisos.filter(a => a.id !== id);
    }),
    // Expose reset for tests
    __resetAvisos: () => {
      avisos = [];
      nextId = 1;
    },
    __getAvisos: () => avisos,
  };
});

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@safatle.com",
      name: "Admin Safatle",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as any,
  };
}

function createUserContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "regular-user",
      email: "user@safatle.com",
      name: "User Regular",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as any,
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as any,
  };
}

describe("Avisos Internos", () => {
  beforeEach(async () => {
    const db = await import("./db") as any;
    db.__resetAvisos();
  });

  describe("listarAtivos (publicProcedure)", () => {
    it("retorna lista vazia quando não há avisos", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.avisosInternos.listarAtivos();
      expect(result).toEqual([]);
    });

    it("pode ser acessado sem autenticação", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.avisosInternos.listarAtivos();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("listarTodos (protectedProcedure - admin only)", () => {
    it("admin pode listar todos os avisos", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.listarTodos();
      expect(Array.isArray(result)).toBe(true);
    });

    it("usuário comum NÃO pode listar todos os avisos", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(caller.avisosInternos.listarTodos()).rejects.toThrow("Apenas administradores");
    });

    it("usuário não autenticado NÃO pode listar todos", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      await expect(caller.avisosInternos.listarTodos()).rejects.toThrow();
    });
  });

  describe("criar (protectedProcedure - admin only)", () => {
    it("admin pode criar um aviso do tipo informacao", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.criar({
        titulo: "Manutenção Programada",
        conteudo: "O sistema ficará indisponível das 22h às 23h.",
        tipo: "informacao",
        expiraEm: null,
      });
      expect(result).toEqual({ success: true });
    });

    it("admin pode criar um aviso do tipo urgente com data de expiração", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const result = await caller.avisosInternos.criar({
        titulo: "Urgente: Falha no Sistema",
        conteudo: "Estamos trabalhando para resolver.",
        tipo: "urgente",
        expiraEm: futureDate,
      });
      expect(result).toEqual({ success: true });
    });

    it("admin pode criar um aviso do tipo alerta", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.criar({
        titulo: "Atenção: Prazo de Faturamento",
        conteudo: "O prazo de faturamento encerra dia 20.",
        tipo: "alerta",
      });
      expect(result).toEqual({ success: true });
    });

    it("usuário comum NÃO pode criar avisos", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.avisosInternos.criar({
          titulo: "Teste",
          conteudo: "Teste",
          tipo: "informacao",
        })
      ).rejects.toThrow("Apenas administradores");
    });

    it("rejeita título vazio", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.avisosInternos.criar({
          titulo: "",
          conteudo: "Conteúdo válido",
          tipo: "informacao",
        })
      ).rejects.toThrow();
    });

    it("rejeita conteúdo vazio", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.avisosInternos.criar({
          titulo: "Título válido",
          conteudo: "",
          tipo: "informacao",
        })
      ).rejects.toThrow();
    });

    it("rejeita tipo inválido", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.avisosInternos.criar({
          titulo: "Título",
          conteudo: "Conteúdo",
          tipo: "invalido" as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("editar (protectedProcedure - admin only)", () => {
    it("admin pode editar título de um aviso", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.editar({
        id: 1,
        titulo: "Título Atualizado",
      });
      expect(result).toEqual({ success: true });
    });

    it("admin pode desativar um aviso", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.editar({
        id: 1,
        ativo: "nao",
      });
      expect(result).toEqual({ success: true });
    });

    it("admin pode alterar tipo e expiração", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const result = await caller.avisosInternos.editar({
        id: 1,
        tipo: "urgente",
        expiraEm: futureDate,
      });
      expect(result).toEqual({ success: true });
    });

    it("admin pode remover data de expiração", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.editar({
        id: 1,
        expiraEm: null,
      });
      expect(result).toEqual({ success: true });
    });

    it("usuário comum NÃO pode editar avisos", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.avisosInternos.editar({ id: 1, titulo: "Hack" })
      ).rejects.toThrow("Apenas administradores");
    });
  });

  describe("excluir (protectedProcedure - admin only)", () => {
    it("admin pode excluir um aviso", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.excluir({ id: 1 });
      expect(result).toEqual({ success: true });
    });

    it("usuário comum NÃO pode excluir avisos", async () => {
      const caller = appRouter.createCaller(createUserContext());
      await expect(
        caller.avisosInternos.excluir({ id: 1 })
      ).rejects.toThrow("Apenas administradores");
    });

    it("usuário não autenticado NÃO pode excluir", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      await expect(
        caller.avisosInternos.excluir({ id: 1 })
      ).rejects.toThrow();
    });
  });

  describe("validação de input", () => {
    it("rejeita id não numérico no excluir", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      await expect(
        caller.avisosInternos.excluir({ id: "abc" as any })
      ).rejects.toThrow();
    });

    it("aceita expiraEm como null (sem expiração)", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.criar({
        titulo: "Sem expiração",
        conteudo: "Este aviso não expira.",
        tipo: "informacao",
        expiraEm: null,
      });
      expect(result).toEqual({ success: true });
    });

    it("aceita expiraEm como string ISO date", async () => {
      const caller = appRouter.createCaller(createAdminContext());
      const result = await caller.avisosInternos.criar({
        titulo: "Com expiração",
        conteudo: "Este aviso expira.",
        tipo: "alerta",
        expiraEm: "2026-12-31T23:59:59.000Z",
      });
      expect(result).toEqual({ success: true });
    });
  });
});
