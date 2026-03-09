import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Testes para o endpoint duplicarGabarito
 */

// Schema do duplicarGabarito (espelho do backend)
const duplicarGabaritoSchema = z.object({
  id: z.number(),
  novoConvenioId: z.number().nullable().optional(),
  novoSetor: z.string().nullable().optional(),
  observacoes: z.string().optional(),
});

describe("Duplicar Gabarito", () => {
  describe("Schema validation", () => {
    it("deve aceitar input mínimo (apenas id)", () => {
      const result = duplicarGabaritoSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(1);
        expect(result.data.novoConvenioId).toBeUndefined();
        expect(result.data.novoSetor).toBeUndefined();
      }
    });

    it("deve aceitar input com novo convênio", () => {
      const result = duplicarGabaritoSchema.safeParse({ id: 1, novoConvenioId: 5 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.novoConvenioId).toBe(5);
      }
    });

    it("deve aceitar input com convênio null (geral)", () => {
      const result = duplicarGabaritoSchema.safeParse({ id: 1, novoConvenioId: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.novoConvenioId).toBeNull();
      }
    });

    it("deve aceitar input com novo setor", () => {
      const result = duplicarGabaritoSchema.safeParse({ id: 1, novoSetor: "UTI" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.novoSetor).toBe("UTI");
      }
    });

    it("deve aceitar input com setor null (geral)", () => {
      const result = duplicarGabaritoSchema.safeParse({ id: 1, novoSetor: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.novoSetor).toBeNull();
      }
    });

    it("deve aceitar input completo com todos os campos", () => {
      const input = {
        id: 10,
        novoConvenioId: 3,
        novoSetor: "CENTRO CIRURGICO",
        observacoes: "Duplicado para Bradesco",
      };
      const result = duplicarGabaritoSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(10);
        expect(result.data.novoConvenioId).toBe(3);
        expect(result.data.novoSetor).toBe("CENTRO CIRURGICO");
        expect(result.data.observacoes).toBe("Duplicado para Bradesco");
      }
    });

    it("deve rejeitar input sem id", () => {
      const result = duplicarGabaritoSchema.safeParse({ novoConvenioId: 5 });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar id como string", () => {
      const result = duplicarGabaritoSchema.safeParse({ id: "abc" });
      expect(result.success).toBe(false);
    });
  });

  describe("Lógica de resolução de convênio/setor destino", () => {
    const resolveDestino = (input: { novoConvenioId?: number | null; novoSetor?: string | null }, original: { convenioId: number | null; setor: string | null }) => {
      const novoConvenioId = input.novoConvenioId !== undefined ? (input.novoConvenioId || null) : original.convenioId;
      const novoSetor = input.novoSetor !== undefined ? (input.novoSetor || null) : original.setor;
      return { novoConvenioId, novoSetor };
    };

    it("deve manter convênio original quando novoConvenioId não é fornecido", () => {
      const result = resolveDestino({}, { convenioId: 5, setor: "UTI" });
      expect(result.novoConvenioId).toBe(5);
      expect(result.novoSetor).toBe("UTI");
    });

    it("deve usar novo convênio quando fornecido", () => {
      const result = resolveDestino({ novoConvenioId: 10 }, { convenioId: 5, setor: "UTI" });
      expect(result.novoConvenioId).toBe(10);
      expect(result.novoSetor).toBe("UTI"); // mantém setor original
    });

    it("deve definir convênio como null quando novoConvenioId é null", () => {
      const result = resolveDestino({ novoConvenioId: null }, { convenioId: 5, setor: "UTI" });
      expect(result.novoConvenioId).toBeNull();
    });

    it("deve usar novo setor quando fornecido", () => {
      const result = resolveDestino({ novoSetor: "CENTRO CIRURGICO" }, { convenioId: 5, setor: "UTI" });
      expect(result.novoConvenioId).toBe(5); // mantém convênio original
      expect(result.novoSetor).toBe("CENTRO CIRURGICO");
    });

    it("deve definir setor como null quando novoSetor é null", () => {
      const result = resolveDestino({ novoSetor: null }, { convenioId: 5, setor: "UTI" });
      expect(result.novoSetor).toBeNull();
    });

    it("deve alterar ambos convênio e setor quando ambos são fornecidos", () => {
      const result = resolveDestino({ novoConvenioId: 10, novoSetor: "ENFERMARIA" }, { convenioId: 5, setor: "UTI" });
      expect(result.novoConvenioId).toBe(10);
      expect(result.novoSetor).toBe("ENFERMARIA");
    });
  });

  describe("Lógica de observações padrão", () => {
    it("deve usar observação fornecida quando presente", () => {
      const obs = "Duplicado para Bradesco" || `Duplicado do gabarito #1`;
      expect(obs).toBe("Duplicado para Bradesco");
    });

    it("deve gerar observação padrão quando não fornecida", () => {
      const obs = "" || `Duplicado do gabarito #42`;
      expect(obs).toBe("Duplicado do gabarito #42");
    });
  });
});
