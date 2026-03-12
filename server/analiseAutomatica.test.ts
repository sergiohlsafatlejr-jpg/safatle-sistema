import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { contasConvenioItens, contasConvenioResumo } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

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

describe("Análise Automática Pós-Importação", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const { ctx } = createAuthContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("compararContaComPadroes - import e execução", () => {
    it("deve importar o serviço compararContaComPadroes corretamente", async () => {
      const { compararContaComPadroes } = await import("./services/comparadorPadroes");
      expect(compararContaComPadroes).toBeDefined();
      expect(typeof compararContaComPadroes).toBe("function");
    });

    it("deve retornar resultado conforme para conta inexistente", async () => {
      const { compararContaComPadroes } = await import("./services/comparadorPadroes");
      const resultado = await compararContaComPadroes("CONTA_TESTE_INEXISTENTE_999", 999999);

      expect(resultado).toBeDefined();
      expect(resultado.statusGeral).toBe("conforme");
      expect(resultado.totalItensAnalisados).toBe(0);
      expect(resultado.divergencias).toHaveLength(0);
      expect(resultado.scoreRisco).toBeDefined();
      expect(resultado.scoreRisco.score).toBe(0);
    });
  });

  describe("listarItens - campos statusAnalise e divergencias", () => {
    it("deve retornar campos de análise nos itens", async () => {
      const result = await caller.contasConvenio.listarItens({
        numeroConta: "CONTA_TESTE_ANALISE_999",
        estabelecimentoId: 999,
      });

      expect(result).toBeDefined();
      expect(result.resumoGeral).toBeDefined();
      // Deve ter campos de contagem de conformes e divergentes
      expect(result.resumoGeral).toHaveProperty("totalConformes");
      expect(result.resumoGeral).toHaveProperty("totalDivergentes");
      expect(result.resumoGeral).toHaveProperty("totalPendentes");
    });
  });

  describe("listarContas - resumo com conformes e divergentes", () => {
    it("deve retornar resumo com totalConformes e totalDivergentes", async () => {
      const result = await caller.contasConvenio.listarContas({
        estabelecimentoId: 999,
        page: 1,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.resumo).toBeDefined();
      expect(result.resumo).toHaveProperty("totalConformes");
      expect(result.resumo).toHaveProperty("totalDivergentes");
      expect(result.resumo).toHaveProperty("totalPendentes");
    });
  });

  describe("Integração: inserir itens e executar análise", () => {
    const TESTE_CONTA = "TESTE_ANALISE_AUTO_" + Date.now();
    const TESTE_ESTAB = 999888;

    it("deve inserir itens de teste, executar análise e atualizar status", async () => {
      const db = await getDb();
      if (!db) {
        console.warn("DB não disponível, pulando teste de integração");
        return;
      }

      try {
        // 1. Inserir itens de teste
        await db.insert(contasConvenioItens).values([
          {
            origem: "BANCO_CLIENTE" as const,
            numeroConta: TESTE_CONTA,
            estabelecimentoId: TESTE_ESTAB,
            tipoItem: "M",
            codigoItem: "ITEM_TESTE_001",
            descricaoItem: "Item de teste para análise automática",
            quantidade: "1",
            valorUnitario: "100.00",
            valorTotal: "100.00",
            statusAnalise: "pendente" as const,
          },
          {
            origem: "BANCO_CLIENTE" as const,
            numeroConta: TESTE_CONTA,
            estabelecimentoId: TESTE_ESTAB,
            tipoItem: "T",
            codigoItem: "ITEM_TESTE_002",
            descricaoItem: "Segundo item de teste",
            quantidade: "2",
            valorUnitario: "50.00",
            valorTotal: "100.00",
            statusAnalise: "pendente" as const,
          },
        ]);

        // 2. Inserir resumo de teste
        await db.insert(contasConvenioResumo).values({
          numeroConta: TESTE_CONTA,
          estabelecimentoId: TESTE_ESTAB,
          origem: "BANCO_CLIENTE" as const,
          totalItens: 2,
          valorTotal: "200.00",
          statusAnalise: "pendente" as const,
        });

        // 3. Executar análise
        const { compararContaComPadroes } = await import("./services/comparadorPadroes");
        const resultado = await compararContaComPadroes(TESTE_CONTA, TESTE_ESTAB);

        expect(resultado).toBeDefined();
        expect(resultado.totalItensAnalisados).toBe(2);
        expect(resultado.scoreRisco).toBeDefined();

        // 4. Simular a lógica de atualização de statusAnalise (como no router)
        const divergenciasPorItem = new Map<string, any[]>();
        const divergenciasGerais: any[] = [];

        for (const div of resultado.divergencias) {
          if (div.codigoItem) {
            if (!divergenciasPorItem.has(div.codigoItem)) {
              divergenciasPorItem.set(div.codigoItem, []);
            }
            divergenciasPorItem.get(div.codigoItem)!.push(div);
          } else {
            divergenciasGerais.push(div);
          }
        }

        // Buscar itens inseridos
        const itensInseridos = await db.select({
          id: contasConvenioItens.id,
          codigoItem: contasConvenioItens.codigoItem,
        }).from(contasConvenioItens).where(
          and(
            eq(contasConvenioItens.numeroConta, TESTE_CONTA),
            eq(contasConvenioItens.estabelecimentoId, TESTE_ESTAB),
          )
        );

        expect(itensInseridos.length).toBe(2);

        let totalConformes = 0;
        let totalDivergentes = 0;

        for (const item of itensInseridos) {
          const divs = item.codigoItem ? divergenciasPorItem.get(item.codigoItem) : null;
          if (divs && divs.length > 0) {
            totalDivergentes++;
            await db.update(contasConvenioItens)
              .set({ statusAnalise: "divergente", divergencias: divs })
              .where(eq(contasConvenioItens.id, item.id));
          } else {
            totalConformes++;
            await db.update(contasConvenioItens)
              .set({ statusAnalise: "conforme", divergencias: null })
              .where(eq(contasConvenioItens.id, item.id));
          }
        }

        // Atualizar resumo
        const statusGeral = resultado.statusGeral === "divergente" ? "divergente" : "conforme";
        await db.update(contasConvenioResumo)
          .set({
            statusAnalise: statusGeral,
            scoreRisco: resultado.scoreRisco.score,
            detalhesRisco: resultado.scoreRisco,
            divergenciasGerais: divergenciasGerais.length > 0 ? divergenciasGerais : null,
          })
          .where(
            and(
              eq(contasConvenioResumo.numeroConta, TESTE_CONTA),
              eq(contasConvenioResumo.estabelecimentoId, TESTE_ESTAB),
            )
          );

        // 5. Verificar que os itens foram atualizados
        const itensAtualizados = await caller.contasConvenio.listarItens({
          numeroConta: TESTE_CONTA,
          estabelecimentoId: TESTE_ESTAB,
        });

        expect(itensAtualizados.items.length).toBe(2);
        
        // Todos os itens devem ter statusAnalise != "pendente"
        for (const item of itensAtualizados.items) {
          expect(item.statusAnalise).not.toBe("pendente");
          expect(["conforme", "divergente"]).toContain(item.statusAnalise);
        }

        // Verificar que o resumo geral reflete os totais (SQL retorna números como string)
        const totalConformesResult = Number(itensAtualizados.resumoGeral.totalConformes);
        const totalDivergentesResult = Number(itensAtualizados.resumoGeral.totalDivergentes);
        const totalPendentesResult = Number(itensAtualizados.resumoGeral.totalPendentes);
        expect(totalConformesResult + totalDivergentesResult).toBe(2);
        expect(totalPendentesResult).toBe(0);

        // Verificar resumo da conta
        const contasResult = await caller.contasConvenio.listarContas({
          estabelecimentoId: TESTE_ESTAB,
          page: 1,
          pageSize: 10,
        });

        const contaTeste = contasResult.contas.find(c => c.numeroConta === TESTE_CONTA);
        expect(contaTeste).toBeDefined();
        if (contaTeste) {
          expect(contaTeste.statusAnaliseResumo).not.toBe("pendente");
        }

      } finally {
        // Cleanup: remover dados de teste
        const db2 = await getDb();
        if (db2) {
          await db2.delete(contasConvenioItens).where(
            and(
              eq(contasConvenioItens.numeroConta, TESTE_CONTA),
              eq(contasConvenioItens.estabelecimentoId, TESTE_ESTAB),
            )
          );
          await db2.delete(contasConvenioResumo).where(
            and(
              eq(contasConvenioResumo.numeroConta, TESTE_CONTA),
              eq(contasConvenioResumo.estabelecimentoId, TESTE_ESTAB),
            )
          );
        }
      }
    }, { timeout: 30000 });
  });
});
