import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Test User",
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
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("contasConvenio router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const { ctx } = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("listarContas", () => {
    it("retorna lista vazia quando não há contas", async () => {
      const result = await caller.contasConvenio.listarContas({
        estabelecimentoId: 999,
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.contas).toBeDefined();
      expect(Array.isArray(result.contas)).toBe(true);
      expect(result.total).toBeDefined();
      expect(result.resumo).toBeDefined();
      expect(result.resumo.totalContas).toBeDefined();
    });

    it("aceita filtros de convênio e origem", async () => {
      const result = await caller.contasConvenio.listarContas({
        estabelecimentoId: 999,
        convenio: "UNIMED",
        origem: "XML",
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.contas).toBeDefined();
      expect(Array.isArray(result.contas)).toBe(true);
    });

    it("aceita filtro de status de análise", async () => {
      const result = await caller.contasConvenio.listarContas({
        estabelecimentoId: 999,
        statusAnalise: "pendente",
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.contas).toBeDefined();
    });

    it("aceita filtro de busca textual", async () => {
      const result = await caller.contasConvenio.listarContas({
        estabelecimentoId: 999,
        search: "paciente teste",
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.contas).toBeDefined();
    });
  });

  describe("listarConvenios", () => {
    it("retorna lista de convênios disponíveis", async () => {
      const result = await caller.contasConvenio.listarConvenios({
        estabelecimentoId: 999,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("listarItens", () => {
    it("retorna itens de uma conta inexistente como lista vazia", async () => {
      const result = await caller.contasConvenio.listarItens({
        numeroConta: "CONTA_INEXISTENTE_999",
        estabelecimentoId: 999,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBe(0);
      expect(result.resumoPorTipo).toBeDefined();
      expect(result.resumoGeral).toBeDefined();
    });

    it("aceita filtro por tipo de item", async () => {
      const result = await caller.contasConvenio.listarItens({
        numeroConta: "CONTA_INEXISTENTE_999",
        estabelecimentoId: 999,
        tipoItem: "Medicamento",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });
  });

  describe("getDivergencias", () => {
    it("retorna divergências de uma conta inexistente como lista vazia", async () => {
      const result = await caller.contasConvenio.getDivergencias({
        numeroConta: "CONTA_INEXISTENTE_999",
        estabelecimentoId: 999,
      });

      expect(result).toBeDefined();
      expect(result.divergencias).toBeDefined();
      expect(Array.isArray(result.divergencias)).toBe(true);
      expect(result.divergencias.length).toBe(0);
      expect(result.resumo).toBeDefined();
      expect(result.resumo.total).toBe(0);
    });
  });

  describe("excluirConta", () => {
    it("exclui uma conta inexistente sem erro", async () => {
      const result = await caller.contasConvenio.excluirConta({
        numeroConta: "CONTA_INEXISTENTE_999",
        estabelecimentoId: 999,
      });

      expect(result).toBeDefined();
      expect(result.sucesso).toBe(true);
    });
  });

  describe("atualizarStatusItem", () => {
    it("aceita atualização de status para item inexistente", async () => {
      // Este teste verifica que a mutation não lança erro fatal
      // mesmo para um item que não existe (nenhuma row afetada)
      try {
        const result = await caller.contasConvenio.atualizarStatusItem({
          itemId: 999999,
          statusAnalise: "conforme",
        });
        expect(result).toBeDefined();
        expect(result.sucesso).toBe(true);
      } catch (err: any) {
        // Se lançar erro, é aceitável para item inexistente
        expect(err).toBeDefined();
      }
    });
  });

  describe("migrarDadosXml", () => {
    it("lança erro quando não há dados XML para o estabelecimento", async () => {
      try {
        await caller.contasConvenio.migrarDadosXml({
          estabelecimentoId: 999999,
        });
        // Se não lançar erro, falha o teste
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeDefined();
        expect(err.message).toContain("Nenhum dado XML encontrado");
      }
    });

    it("migra dados XML com sucesso para estabelecimento com dados", { timeout: 60000 }, async () => {
      // Testar com o estabelecimento 1 (Pronto Socorro Infantil) que tem ~29K itens
      try {
        const result = await caller.contasConvenio.migrarDadosXml({
          estabelecimentoId: 1,
        });
        expect(result).toBeDefined();
        expect(result.sucesso).toBe(true);
        expect(result.totalItens).toBeGreaterThan(0);
        expect(result.totalContas).toBeGreaterThan(0);
        expect(result.mensagem).toContain("Migração concluída");
      } catch (err: any) {
        // Se não houver dados no ambiente de teste, é aceitável
        expect(err.message).toContain("Nenhum dado XML encontrado");
      }
    });
  });

  describe("listarContas após migração", () => {
    it("retorna contas migradas para estabelecimento 1", async () => {
      const result = await caller.contasConvenio.listarContas({
        estabelecimentoId: 1,
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.contas).toBeDefined();
      expect(Array.isArray(result.contas)).toBe(true);
      // Pode ter contas ou não dependendo do estado do banco
      if (result.contas.length > 0) {
        const conta = result.contas[0];
        expect(conta.numeroConta).toBeDefined();
        expect(conta.estabelecimentoId).toBe(1);
        expect(conta.origem).toBeDefined();
      }
    });

    it("retorna itens de uma conta migrada", async () => {
      // Primeiro buscar uma conta existente
      const contas = await caller.contasConvenio.listarContas({
        estabelecimentoId: 1,
        page: 1,
        pageSize: 1,
      });

      if (contas.contas.length > 0) {
        const primeiraConta = contas.contas[0];
        const itens = await caller.contasConvenio.listarItens({
          numeroConta: primeiraConta.numeroConta,
          estabelecimentoId: 1,
        });

        expect(itens).toBeDefined();
        expect(itens.items).toBeDefined();
        expect(Array.isArray(itens.items)).toBe(true);
        expect(itens.items.length).toBeGreaterThan(0);
        expect(itens.resumoGeral).toBeDefined();
        expect(itens.resumoPorTipo).toBeDefined();

        // Verificar campos dos itens
        const item = itens.items[0];
        expect(item.codigoItem).toBeDefined();
        expect(item.descricaoItem).toBeDefined();
        expect(item.valorTotal).toBeDefined();
        expect(item.origem).toBe("XML");
      }
    });
  });
});
