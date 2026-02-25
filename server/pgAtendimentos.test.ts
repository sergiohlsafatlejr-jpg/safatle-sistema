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

import { buscarMotivosNotificacao } from "./pgAtendimentos";

describe("buscarMotivosNotificacao", () => {
  it("deve retornar mapa vazio quando lista de numatends está vazia", async () => {
    const result = await buscarMotivosNotificacao([]);
    expect(result).toEqual({});
  });

  it("deve retornar mapa com motivos para atendimentos com notificação", async () => {
    // Buscar atendimentos que sabemos existir
    const atendimentos = await getAtendimentosParados();
    if (atendimentos.length === 0) return; // Skip se não há dados

    const numatends = atendimentos.slice(0, 10).map(a => a.numatend);
    const result = await buscarMotivosNotificacao(numatends);
    
    expect(typeof result).toBe("object");
    // Verificar que os valores são strings (motivos)
    for (const [key, value] of Object.entries(result)) {
      expect(typeof key).toBe("string");
      expect(typeof value).toBe("string");
    }
  }, 15000);
});
