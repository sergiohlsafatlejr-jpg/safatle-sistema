import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Auditor Teste",
    loginMethod: "manus",
    role: "admin",
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

describe("Gabarito - Padrões de Cobrança", () => {
  // Passo 1: Revisão de padrões (aprovar/rejeitar)
  describe("Passo 1 - Revisão de Padrões", () => {
    it("deve ter o endpoint validarPadrao disponível", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      // Verificar que o endpoint existe no router
      expect(caller.padroesCobranca.validarPadrao).toBeDefined();
      expect(typeof caller.padroesCobranca.validarPadrao).toBe("function");
    });

    it("deve ter o endpoint listarParaRevisao disponível", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      expect(caller.padroesCobranca.listarParaRevisao).toBeDefined();
      expect(typeof caller.padroesCobranca.listarParaRevisao).toBe("function");
    });
  });

  // Passo 2: Gabarito Manual
  describe("Passo 2 - Gabarito Manual", () => {
    it("deve ter o endpoint criarGabaritoManual disponível", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      expect(caller.padroesCobranca.criarGabaritoManual).toBeDefined();
      expect(typeof caller.padroesCobranca.criarGabaritoManual).toBe("function");
    });
  });

  // Passo 3: Comparação gabarito vs realidade  
  describe("Passo 3 - Comparação com Padrões", () => {
    it("deve ter o endpoint compararComPadroes disponível", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      expect(caller.contasConvenio.compararComPadroes).toBeDefined();
      expect(typeof caller.contasConvenio.compararComPadroes).toBe("function");
    });
  });

  // Passo 4: Feedback Loop
  describe("Passo 4 - Feedback Loop", () => {
    it("deve ter o endpoint registrarFeedback disponível", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      expect(caller.contasConvenio.registrarFeedback).toBeDefined();
      expect(typeof caller.contasConvenio.registrarFeedback).toBe("function");
    });

    it("deve ter o endpoint listarFeedbacks disponível", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      expect(caller.contasConvenio.listarFeedbacks).toBeDefined();
      expect(typeof caller.contasConvenio.listarFeedbacks).toBe("function");
    });

    it("deve ter o endpoint estatisticasFeedback disponível", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      
      expect(caller.contasConvenio.estatisticasFeedback).toBeDefined();
      expect(typeof caller.contasConvenio.estatisticasFeedback).toBe("function");
    });
  });
});

describe("Comparador de Padrões - Lógica", () => {
  it("deve importar o serviço comparadorPadroes", async () => {
    const { compararContaComPadroes } = await import("./services/comparadorPadroes");
    expect(compararContaComPadroes).toBeDefined();
    expect(typeof compararContaComPadroes).toBe("function");
  });

  it("deve retornar conforme quando conta não existe (sem itens)", async () => {
    const { compararContaComPadroes } = await import("./services/comparadorPadroes");
    
    // Usar uma conta que não existe para testar retorno vazio
    const resultado = await compararContaComPadroes(
      "CONTA_INEXISTENTE_TESTE_999",
      99999
    );

    expect(resultado).toBeDefined();
    expect(resultado.statusGeral).toBe("conforme");
    expect(resultado.divergencias).toHaveLength(0);
    expect(resultado.totalItensAnalisados).toBe(0);
  });

  it("deve ter a interface ResultadoComparacao com campos de gabarito", async () => {
    const { compararContaComPadroes } = await import("./services/comparadorPadroes");
    
    const resultado = await compararContaComPadroes(
      "CONTA_INEXISTENTE_TESTE_999",
      99999
    );

    // Verificar que o resultado tem os campos de gabarito
    expect(resultado).toHaveProperty("gabaritosUsados");
    expect(resultado).toHaveProperty("padroesUsados");
    expect(resultado).toHaveProperty("statusGeral");
    expect(resultado).toHaveProperty("divergencias");
    expect(resultado).toHaveProperty("resumoPorTipo");
  });
});
