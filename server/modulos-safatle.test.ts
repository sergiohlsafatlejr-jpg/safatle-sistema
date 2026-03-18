import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { SAFATLE_ESTABELECIMENTO_ID, SAFATLE_CNPJ } from "../shared/const";

// ========== Helper para criar contexto autenticado ==========
function createAuthContext(role: "admin" | "user" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@safatle.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ========== Testes de Constantes ==========
describe("Constantes Safatle", () => {
  it("deve ter o ID do estabelecimento Safatle definido", () => {
    expect(SAFATLE_ESTABELECIMENTO_ID).toBe(2160001);
  });

  it("deve ter o CNPJ do Safatle definido", () => {
    expect(SAFATLE_CNPJ).toBe("24.785.393/0001-54");
  });
});

// ========== Testes do Módulo de Contratos ==========
describe("Módulo Contratos", () => {
  it("deve listar contratos (retorna array)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contratos.listar({});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("deve retornar dashboard de contratos", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.contratos.dashboard();
    expect(result).toBeDefined();
  });

  it("deve criar um contrato com dados mínimos", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const contrato = await caller.contratos.criar({
      contratanteNome: "Hospital Teste",
      contratanteCnpj: "12.345.678/0001-00",
      contratadaNome: "Safatle Sistemas",
      contratadaCnpj: SAFATLE_CNPJ,
      servicos: ["Faturamento", "Auditoria"],
      modelosCobranca: { tipo: "mensal" },
      valorMensal: "5000.00",
      status: "rascunho",
    });
    expect(contrato).toBeDefined();
    expect(contrato.id).toBeGreaterThan(0);

    // Buscar o contrato criado
    const found = await caller.contratos.buscarPorId({ id: contrato.id });
    expect(found).toBeDefined();
    expect(found?.contratanteNome).toBe("Hospital Teste");

    // Limpar - excluir o contrato
    await caller.contratos.excluir({ id: contrato.id });
  });

  it("deve alterar o status de um contrato", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    // Criar contrato
    const contrato = await caller.contratos.criar({
      contratanteNome: "Hospital Status Test",
      contratanteCnpj: "11.111.111/0001-11",
      status: "rascunho",
    });
    
    // Alterar status
    await caller.contratos.alterarStatus({ id: contrato.id, status: "ativo" });
    
    // Verificar
    const found = await caller.contratos.buscarPorId({ id: contrato.id });
    expect(found?.status).toBe("ativo");
    
    // Limpar
    await caller.contratos.excluir({ id: contrato.id });
  });
});

// ========== Testes do Módulo de Propostas ==========
describe("Módulo Propostas", () => {
  it("deve listar propostas (retorna array)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.propostas.listar({});
    expect(result).toBeDefined();
    expect(result).toHaveProperty("items");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("deve retornar dashboard de propostas", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.propostas.dashboard();
    expect(result).toBeDefined();
  });

  it("deve criar uma proposta com dados mínimos", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const proposta = await caller.propostas.criar({
      titulo: "Proposta Teste Vitest",
      cliente: "Hospital ABC",
      tipoCliente: "hospital",
      valorTotal: "100000.00",
      status: "rascunho",
      numero: "PROP-TEST-001",
      responsavel: "Test User",
      validadeDias: 30,
    });
    expect(proposta).toBeDefined();
    expect(proposta.id).toBeGreaterThan(0);

    // Buscar a proposta criada
    const found = await caller.propostas.buscarPorId({ id: proposta.id });
    expect(found).toBeDefined();
    expect(found?.titulo).toBe("Proposta Teste Vitest");

    // Limpar
    await caller.propostas.excluir({ id: proposta.id });
  });

  it("deve alterar o status de uma proposta", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const proposta = await caller.propostas.criar({
      titulo: "Proposta Status Test",
      cliente: "Hospital XYZ",
      tipoCliente: "hospital",
      valorTotal: "50000.00",
      status: "rascunho",
      numero: "PROP-STATUS-001",
    });
    
    await caller.propostas.alterarStatus({ id: proposta.id, status: "aguardando" });
    
    const found = await caller.propostas.buscarPorId({ id: proposta.id });
    expect(found?.status).toBe("aguardando");
    
    await caller.propostas.excluir({ id: proposta.id });
  });
});

// ========== Testes do Módulo Financeiro ==========
describe("Módulo Financeiro", () => {
  it("deve retornar resumo do dashboard financeiro", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financeiro.dashboard.resumo({});
    expect(result).toBeDefined();
    // Deve ter propriedades de resumo financeiro
    expect(result).toHaveProperty("despesasPendente");
    expect(result).toHaveProperty("receitasPendente");
  });

  it("deve listar empresas (cadastros)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financeiro.empresas.listar();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("deve listar categorias", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financeiro.categorias.listar();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("deve listar tipos de pagamento", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.financeiro.tiposPagamento.listar();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ========== Testes do Dashboard Consolidado (Painel Executivo) ==========
describe("Dashboard Consolidado (Painel Executivo)", () => {
  it("deve retornar dados consolidados", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboardConsolidado.dados();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("totais");
    expect(result).toHaveProperty("estabelecimentos");
  });

  it("deve retornar comparativo de glosas", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboardConsolidado.comparativoGlosas();
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  }, 15000);

  it("deve retornar dados de atendimentos consolidados", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboardConsolidado.atendimentosConsolidados();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("kpis");
    expect(result).toHaveProperty("porEstabelecimento");
  }, 30000);

  it("deve retornar dados de recursado consolidado", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboardConsolidado.recursadoConsolidado();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("kpis");
  });
});
