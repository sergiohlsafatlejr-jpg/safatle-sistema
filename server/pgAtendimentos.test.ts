import { describe, it, expect } from "vitest";
import { testConnection, getAtendimentosParados } from "./pgAtendimentos";

describe("PostgreSQL Atendimentos - Conexão Externa", () => {
  it("deve conectar ao banco PostgreSQL externo", async () => {
    const connected = await testConnection();
    expect(connected).toBe(true);
  }, 15000);

  it("deve buscar atendimentos parados", async () => {
    const atendimentos = await getAtendimentosParados();
    expect(Array.isArray(atendimentos)).toBe(true);
    expect(atendimentos.length).toBeGreaterThan(0);
    // Verificar campos essenciais
    const primeiro = atendimentos[0];
    expect(primeiro).toHaveProperty("numatend");
    expect(primeiro).toHaveProperty("nomepac");
    expect(primeiro).toHaveProperty("datatend");
    expect(primeiro).toHaveProperty("tipoatendimentodescricao");
  }, 30000);
});
