import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb } from "./db";
import { nfseHospitais, nfseConvenios, nfseNotas } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ============================================================
// Helpers
// ============================================================

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-nfse-user",
    email: "test@nfse.com",
    name: "Test NFS-e User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ============================================================
// Cleanup: remove test data after all tests
// ============================================================
let testHospitalId: number | null = null;
let testConvenioId: number | null = null;
let testNotaId: number | null = null;

afterAll(async () => {
  const db = (await getDb())!;
  if (testNotaId) {
    await db.delete(nfseNotas).where(eq(nfseNotas.id, testNotaId)).catch(() => {});
  }
  if (testConvenioId) {
    await db.delete(nfseConvenios).where(eq(nfseConvenios.id, testConvenioId)).catch(() => {});
  }
  if (testHospitalId) {
    await db.delete(nfseHospitais).where(eq(nfseHospitais.id, testHospitalId)).catch(() => {});
  }
});

// ============================================================
// Tests
// ============================================================

describe("NFS-e Module", () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  // ---- Hospitais ----
  describe("hospitais", () => {
    it("deve criar um hospital NFS-e", async () => {
      const result = await caller.nfse.hospitais.criar({
        nome: "Hospital Teste NFS-e",
        cnpj: "12.345.678/0001-99",
        telefone: "(62) 3333-4444",
      });
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      testHospitalId = result.id;
    });

    it("deve listar hospitais ativos", async () => {
      const hospitais = await caller.nfse.hospitais.listar();
      expect(Array.isArray(hospitais)).toBe(true);
      const found = hospitais.find(h => h.id === testHospitalId);
      expect(found).toBeDefined();
      expect(found?.nome).toBe("Hospital Teste NFS-e");
    });

    it("deve buscar hospital por ID", async () => {
      const hospital = await caller.nfse.hospitais.buscarPorId({ id: testHospitalId! });
      expect(hospital.nome).toBe("Hospital Teste NFS-e");
      expect(hospital.cnpj).toBe("12.345.678/0001-99");
    });

    it("deve atualizar um hospital", async () => {
      const result = await caller.nfse.hospitais.atualizar({
        id: testHospitalId!,
        nome: "Hospital Teste NFS-e Atualizado",
      });
      expect(result.success).toBe(true);

      const hospital = await caller.nfse.hospitais.buscarPorId({ id: testHospitalId! });
      expect(hospital.nome).toBe("Hospital Teste NFS-e Atualizado");
    });
  });

  // ---- Convênios ----
  describe("convenios", () => {
    it("deve criar um convênio NFS-e", async () => {
      const result = await caller.nfse.convenios.criar({
        nome: "Convênio Teste NFS-e",
        codigo: "CONV-001",
      });
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      testConvenioId = result.id;
    });

    it("deve listar convênios ativos", async () => {
      const convenios = await caller.nfse.convenios.listar();
      expect(Array.isArray(convenios)).toBe(true);
      const found = convenios.find(c => c.id === testConvenioId);
      expect(found).toBeDefined();
      expect(found?.nome).toBe("Convênio Teste NFS-e");
    });

    it("deve atualizar um convênio", async () => {
      const result = await caller.nfse.convenios.atualizar({
        id: testConvenioId!,
        nome: "Convênio Teste NFS-e Atualizado",
        codigo: "CONV-002",
      });
      expect(result.success).toBe(true);
    });
  });

  // ---- Notas Fiscais ----
  describe("notas", () => {
    it("deve criar uma nota fiscal", async () => {
      const result = await caller.nfse.notas.criar({
        hospitalId: testHospitalId!,
        convenioId: testConvenioId!,
        numeroNf: "NF-TEST-001",
        dataEmissao: "2026-03-01",
        dataFaturamento: "2026-03-15",
        valorBruto: 15000.50,
        valorLiquido: 14500.00,
        xmlDemonstrativoEmitido: "sim",
        nfEmitida: "nao",
        observacoes: "Nota de teste",
      });
      expect(result).toBeDefined();
      expect(result.id).toBeGreaterThan(0);
      expect(result.success).toBe(true);
      testNotaId = result.id;
    });

    it("deve listar notas fiscais", async () => {
      const result = await caller.nfse.notas.listar({});
      expect(result).toBeDefined();
      expect(result.notas).toBeDefined();
      expect(Array.isArray(result.notas)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it("deve filtrar notas por hospital", async () => {
      const result = await caller.nfse.notas.listar({
        hospitalId: testHospitalId!,
      });
      expect(result.notas.length).toBeGreaterThanOrEqual(1);
      const found = result.notas.find(n => n.numeroNf === "NF-TEST-001");
      expect(found).toBeDefined();
    });

    it("deve filtrar notas por status (pendentes)", async () => {
      const result = await caller.nfse.notas.listar({
        nfEmitida: "nao",
      });
      const found = result.notas.find(n => n.numeroNf === "NF-TEST-001");
      expect(found).toBeDefined();
    });

    it("deve buscar notas por texto", async () => {
      const result = await caller.nfse.notas.listar({
        busca: "NF-TEST",
      });
      expect(result.notas.length).toBeGreaterThanOrEqual(1);
    });

    it("deve toggle XML demonstrativo", async () => {
      const result = await caller.nfse.notas.toggleXml({
        id: testNotaId!,
        valor: "nao",
      });
      expect(result.success).toBe(true);
    });

    it("deve toggle NF emitida", async () => {
      const result = await caller.nfse.notas.toggleNfEmitida({
        id: testNotaId!,
        valor: "sim",
      });
      expect(result.success).toBe(true);
    });

    it("deve atualizar uma nota fiscal", async () => {
      const result = await caller.nfse.notas.atualizar({
        id: testNotaId!,
        hospitalId: testHospitalId!,
        numeroNf: "NF-TEST-001-UPD",
        dataEmissao: "2026-03-02",
        valorBruto: 16000.00,
        valorLiquido: 15500.00,
        xmlDemonstrativoEmitido: "sim",
        nfEmitida: "sim",
      });
      expect(result.success).toBe(true);
    });

    it("deve retornar dashboard com KPIs", async () => {
      const result = await caller.nfse.notas.dashboard({});
      expect(result).toBeDefined();
      expect(result.kpis).toBeDefined();
      expect(typeof result.kpis.totalNotas).toBe("number");
      expect(typeof result.kpis.totalBruto).toBe("number");
      expect(typeof result.kpis.totalEmitidas).toBe("number");
      expect(typeof result.kpis.totalPendentes).toBe("number");
    });

    it("deve retornar lista de pendentes", async () => {
      // Primeiro, colocar a nota como pendente de novo
      await caller.nfse.notas.toggleNfEmitida({ id: testNotaId!, valor: "nao" });

      const result = await caller.nfse.notas.pendentes({});
      expect(result).toBeDefined();
      expect(result.resumo).toBeDefined();
      expect(typeof result.resumo.total).toBe("number");
      expect(typeof result.resumo.urgentes).toBe("number");
      expect(typeof result.resumo.atencao).toBe("number");
      expect(typeof result.resumo.normais).toBe("number");
      expect(Array.isArray(result.pendentes)).toBe(true);
    });

    it("deve retornar acompanhamento de envios", async () => {
      const result = await caller.nfse.notas.acompanhamentoEnvios({
        mes: 3,
        ano: 2026,
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result.envios)).toBe(true);
    });

    it("deve excluir uma nota fiscal", async () => {
      const result = await caller.nfse.notas.excluir({ id: testNotaId! });
      expect(result.success).toBe(true);
      testNotaId = null; // Já foi excluída, não precisa limpar no afterAll
    });
  });

  // ---- Desativação ----
  describe("desativação", () => {
    it("deve desativar um convênio (soft delete)", async () => {
      const result = await caller.nfse.convenios.excluir({ id: testConvenioId! });
      expect(result.success).toBe(true);

      // Não deve aparecer mais na listagem
      const convenios = await caller.nfse.convenios.listar();
      const found = convenios.find(c => c.id === testConvenioId);
      expect(found).toBeUndefined();
      testConvenioId = null; // Soft deleted
    });

    it("deve desativar um hospital (soft delete)", async () => {
      const result = await caller.nfse.hospitais.excluir({ id: testHospitalId! });
      expect(result.success).toBe(true);

      // Não deve aparecer mais na listagem
      const hospitais = await caller.nfse.hospitais.listar();
      const found = hospitais.find(h => h.id === testHospitalId);
      expect(found).toBeUndefined();
      testHospitalId = null; // Soft deleted
    });
  });
}, { timeout: 60_000 });
