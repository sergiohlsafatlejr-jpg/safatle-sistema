import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as db from "./db";

describe("Exclusão de Estabelecimentos", () => {
  let testEstabelecimentoId: number;
  let testEstabelecimentoComArquivosId: number;
  const timestamp = Date.now();

  beforeAll(async () => {
    // Criar estabelecimento de teste para exclusão bem-sucedida
    const est = await db.createEstabelecimento({
      nome: `Estabelecimento Teste Delete - ${timestamp}`,
      cnpj: `99.999.999/0001-${String(timestamp).slice(-2)}`,
      endereco: "Endereço Teste Delete",
    });
    testEstabelecimentoId = est.id;
  });

  afterAll(async () => {
    // Limpar estabelecimentos de teste que possam ter sobrado
    try {
      await db.deleteEstabelecimento(testEstabelecimentoId);
    } catch (e) {
      // Ignorar se já foi excluído
    }
  });

  describe("deleteEstabelecimento", () => {
    it("deve excluir estabelecimento sem dependências com sucesso", async () => {
      // Criar um estabelecimento específico para este teste
      const estParaExcluir = await db.createEstabelecimento({
        nome: `Estabelecimento Para Excluir - ${timestamp}`,
        cnpj: null,
        endereco: null,
      });

      const result = await db.deleteEstabelecimento(estParaExcluir.id);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Estabelecimento excluído com sucesso");

      // Verificar que foi realmente excluído
      const estabelecimentoExcluido = await db.getEstabelecimentoById(estParaExcluir.id);
      expect(estabelecimentoExcluido).toBeNull();
    });

    it("deve retornar a estrutura correta de resposta", async () => {
      // Criar um estabelecimento específico para este teste
      const estParaExcluir = await db.createEstabelecimento({
        nome: `Estabelecimento Estrutura - ${timestamp}`,
        cnpj: null,
        endereco: null,
      });

      const result = await db.deleteEstabelecimento(estParaExcluir.id);

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    });

    it("deve listar estabelecimentos corretamente", async () => {
      const estabelecimentos = await db.getEstabelecimentos();
      
      expect(Array.isArray(estabelecimentos)).toBe(true);
      
      if (estabelecimentos.length > 0) {
        const est = estabelecimentos[0];
        expect(est).toHaveProperty("id");
        expect(est).toHaveProperty("nome");
        expect(est).toHaveProperty("ativo");
      }
    });

    it("deve buscar estabelecimento por ID", async () => {
      const estabelecimento = await db.getEstabelecimentoById(testEstabelecimentoId);
      
      expect(estabelecimento).not.toBeNull();
      if (estabelecimento) {
        expect(estabelecimento.id).toBe(testEstabelecimentoId);
        expect(estabelecimento.nome).toContain("Estabelecimento Teste Delete");
      }
    });

    it("deve retornar null para estabelecimento inexistente", async () => {
      const estabelecimento = await db.getEstabelecimentoById(999999);
      expect(estabelecimento).toBeNull();
    });
  });
});
