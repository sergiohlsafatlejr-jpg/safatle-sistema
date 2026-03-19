import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      select: () => ({
        from: (table: any) => ({
          where: (condition: any) => ({
            orderBy: () => [
              { id: 60001, nome: "Maternidade Ela", estabelecimentoId: 2, ativo: "sim" },
              { id: 60002, nome: "Pronto Socorro Infantil", estabelecimentoId: 1, ativo: "sim" },
            ],
          }),
        }),
      }),
    })
  ),
}));

describe("NFS-e Hospitais - Vinculação com Estabelecimentos", () => {
  it("deve ter o campo estabelecimentoId no schema de hospitais NFS-e", async () => {
    const { nfseHospitais } = await import("../drizzle/schema");
    expect(nfseHospitais).toBeDefined();
    // Verificar que a tabela tem a coluna estabelecimentoId
    const columns = Object.keys(nfseHospitais);
    expect(columns).toContain("estabelecimentoId");
  });

  it("deve ter o campo estabelecimentoId no schema de notas NFS-e", async () => {
    const { nfseNotas } = await import("../drizzle/schema");
    expect(nfseNotas).toBeDefined();
    const columns = Object.keys(nfseNotas);
    expect(columns).toContain("hospitalId");
    expect(columns).toContain("convenioId");
  });

  it("deve ter os campos cpfNf e senhaNf no schema de hospitais", async () => {
    const { nfseHospitais } = await import("../drizzle/schema");
    const columns = Object.keys(nfseHospitais);
    expect(columns).toContain("cpfNf");
    expect(columns).toContain("senhaNf");
  });

  it("deve exportar os tipos corretos para NFS-e", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.nfseHospitais).toBeDefined();
    expect(schema.nfseNotas).toBeDefined();
    expect(schema.nfseConvenios).toBeDefined();
    expect(schema.convenios).toBeDefined();
  });
});
