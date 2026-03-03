import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
const mockExecute = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockValues = vi.fn();
const mockWhere = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      execute: mockExecute,
      insert: mockInsert,
      delete: mockDelete,
    })
  ),
}));

// Mock drizzle schema
vi.mock("../drizzle/schema", () => ({
  motivosGlosa: {
    tipoOrigem: "tipoOrigem",
    id: "id",
  },
}));

// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", field: a, value: b })),
  sql: { raw: vi.fn((q: string) => q) },
}));

import { seedMotivosGlosa } from "./seedMotivosGlosa";
import * as fs from "fs";

describe("seedMotivosGlosa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup chain: delete().where() returns affectedRows
    mockDelete.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue([{ affectedRows: 0 }]);
    // Setup chain: insert().values() 
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockResolvedValue([{ affectedRows: 50 }]);
    // select count
    mockExecute.mockResolvedValue([[{ count: 527 }]]);
  });

  it("deve ler o arquivo TSV e inserir registros", async () => {
    // Verificar que o arquivo TSV existe
    const tsvPath = process.cwd() + "/glosas_tiss_completa.tsv";
    const exists = fs.existsSync(tsvPath);
    expect(exists).toBe(true);

    const result = await seedMotivosGlosa();

    expect(result).toBeDefined();
    expect(result.inseridos).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThan(0);
    // Deve ter chamado delete para limpar registros TISS existentes
    expect(mockDelete).toHaveBeenCalled();
    // Deve ter chamado insert para inserir novos registros
    expect(mockInsert).toHaveBeenCalled();
  });

  it("deve categorizar códigos em grupos corretos", async () => {
    const result = await seedMotivosGlosa();
    expect(result).toBeDefined();
    
    // Verificar que os valores inseridos contêm grupos corretos
    const insertCalls = mockValues.mock.calls;
    expect(insertCalls.length).toBeGreaterThan(0);
    
    // Verificar que pelo menos um batch foi inserido
    const firstBatch = insertCalls[0][0];
    expect(Array.isArray(firstBatch)).toBe(true);
    expect(firstBatch.length).toBeGreaterThan(0);
    
    // Cada item deve ter os campos obrigatórios
    firstBatch.forEach((item: any) => {
      expect(item.codigo).toBeDefined();
      expect(item.grupo).toBeDefined();
      expect(item.descricao).toBeDefined();
      expect(item.descricaoSimplificada).toBeDefined();
      expect(item.tipoOrigem).toBe("tiss");
      expect(item.ativo).toBe("sim");
    });
  });

  it("deve mapear código 1001 para grupo Beneficiário", async () => {
    await seedMotivosGlosa();
    
    const allValues = mockValues.mock.calls.flatMap((call: any) => call[0]);
    const item1001 = allValues.find((v: any) => v.codigo === "1001");
    expect(item1001).toBeDefined();
    expect(item1001.grupo).toBe("Beneficiário");
  });

  it("deve mapear código 2408 para grupo Taxa/Aluguel", async () => {
    await seedMotivosGlosa();
    
    const allValues = mockValues.mock.calls.flatMap((call: any) => call[0]);
    const item2408 = allValues.find((v: any) => v.codigo === "2408");
    expect(item2408).toBeDefined();
    expect(item2408.grupo).toBe("Taxa/Aluguel");
    expect(item2408.descricao).toContain("taxas em quantidade superior");
  });

  it("deve mapear código 2108 para grupo Medicamento", async () => {
    await seedMotivosGlosa();
    
    const allValues = mockValues.mock.calls.flatMap((call: any) => call[0]);
    const item2108 = allValues.find((v: any) => v.codigo === "2108");
    expect(item2108).toBeDefined();
    expect(item2108.grupo).toBe("Medicamento");
  });

  it("deve mapear código 3037 para grupo Odontologia", async () => {
    await seedMotivosGlosa();
    
    const allValues = mockValues.mock.calls.flatMap((call: any) => call[0]);
    const item3037 = allValues.find((v: any) => v.codigo === "3037");
    expect(item3037).toBeDefined();
    expect(item3037.grupo).toBe("Odontologia");
  });

  it("deve truncar descrições longas na descricaoSimplificada", async () => {
    await seedMotivosGlosa();
    
    const allValues = mockValues.mock.calls.flatMap((call: any) => call[0]);
    allValues.forEach((item: any) => {
      expect(item.descricaoSimplificada.length).toBeLessThanOrEqual(200);
    });
  });
});

describe("TSV de glosas TISS", () => {
  it("deve conter pelo menos 500 códigos", () => {
    const tsvPath = process.cwd() + "/glosas_tiss_completa.tsv";
    const content = fs.readFileSync(tsvPath, "utf-8");
    const lines = content.trim().split("\n").slice(1); // Skip header
    expect(lines.length).toBeGreaterThanOrEqual(500);
  });

  it("deve ter formato correto (codigo\\tdescricao)", () => {
    const tsvPath = process.cwd() + "/glosas_tiss_completa.tsv";
    const content = fs.readFileSync(tsvPath, "utf-8");
    const lines = content.trim().split("\n");
    
    // Header
    expect(lines[0]).toBe("codigo\tdescricao");
    
    // Data lines
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const parts = lines[i].split("\t");
      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parts[0]).toMatch(/^\d{4}$/);
      expect(parts[1].length).toBeGreaterThan(0);
    }
  });

  it("deve conter códigos conhecidos", () => {
    const tsvPath = process.cwd() + "/glosas_tiss_completa.tsv";
    const content = fs.readFileSync(tsvPath, "utf-8");
    
    const knownCodes = ["1001", "1319", "2108", "2408", "5046"];
    for (const code of knownCodes) {
      expect(content).toContain(code);
    }
  });

  it("código 1319 deve ter descrição correta", () => {
    const tsvPath = process.cwd() + "/glosas_tiss_completa.tsv";
    const content = fs.readFileSync(tsvPath, "utf-8");
    const lines = content.trim().split("\n").slice(1);
    
    const line1319 = lines.find(l => l.startsWith("1319\t"));
    expect(line1319).toBeDefined();
    expect(line1319).toContain("assinatura do assistido");
  });

  it("código 2408 deve ter descrição correta", () => {
    const tsvPath = process.cwd() + "/glosas_tiss_completa.tsv";
    const content = fs.readFileSync(tsvPath, "utf-8");
    const lines = content.trim().split("\n").slice(1);
    
    const line2408 = lines.find(l => l.startsWith("2408\t"));
    expect(line2408).toBeDefined();
    expect(line2408).toContain("taxas em quantidade superior");
  });
});
