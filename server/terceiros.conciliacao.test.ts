import { describe, expect, it } from "vitest";

/**
 * Testes unitários para a lógica de classificação de terceiros na conciliação.
 * 
 * A lógica principal:
 * - Se um item de faturamento NÃO encontra match no retorno/demonstrativo,
 *   e o codigoPrestadorExecutante pertence a um prestador terceiro cadastrado,
 *   o item deve ser marcado como 'terceiro' em vez de 'glosado'.
 * - Quando codigoPrestadorExecutante é NULL mas outros itens da mesma guia
 *   têm código próprio, o item também é classificado como terceiro.
 * - Itens de terceiros NÃO devem entrar no XML de recurso de glosa.
 * - Itens de terceiros devem ter valorGlosa = 0 e diferenca = 0.
 */

// Simula a lógica de classificação de terceiros extraída do faturamentoUnificadoService
// Lógica atualizada: 
// 1. Se código preenchido e NÃO está nos próprios → terceiro
// 2. Se código NULL mas outros itens da mesma guia têm código próprio → terceiro
// 3. Caso contrário → glosado
function classificarItemSemMatch(params: {
  codigoPrestadorExecutante: string | null;
  codigosProprios: Set<string>;
  valorFaturado: number;
  itensMesmaGuia?: { codigoPrestadorExecutante: string | null }[];
}): {
  statusConciliacao: string;
  valorGlosa: number;
  diferenca: number;
  codigoGlosa: string | null;
} {
  const { codigoPrestadorExecutante, codigosProprios, valorFaturado, itensMesmaGuia } = params;
  
  let isTerceiro = false;
  if (codigosProprios.size > 0) {
    if (codigoPrestadorExecutante && !codigosProprios.has(codigoPrestadorExecutante)) {
      // Código preenchido e NÃO é próprio → terceiro
      isTerceiro = true;
    } else if (!codigoPrestadorExecutante && itensMesmaGuia) {
      // Código NULL: verificar se outros itens da mesma guia têm código próprio
      const temProprioNaGuia = itensMesmaGuia.some(f => {
        const cod = f.codigoPrestadorExecutante;
        return cod !== null && codigosProprios.has(cod);
      });
      if (temProprioNaGuia) {
        isTerceiro = true;
      }
    }
  }

  if (isTerceiro) {
    return {
      statusConciliacao: 'terceiro',
      valorGlosa: 0,
      diferenca: 0,
      codigoGlosa: null,
    };
  } else {
    return {
      statusConciliacao: 'glosado',
      valorGlosa: valorFaturado,
      diferenca: valorFaturado,
      codigoGlosa: '5007',
    };
  }
}

// Simula a lógica de filtragem de terceiros no XML de recurso
function deveIncluirNoXmlRecurso(statusConciliacao: string): boolean {
  return statusConciliacao !== 'terceiro';
}

// Simula a lógica isTerceiro do frontend
function isTerceiroFrontend(params: {
  statusGuia?: string;
  codigoPrestadorExecutante?: string;
  codigosProprios: string[];
}): boolean {
  if (params.statusGuia === 'terceiro') return true;
  if (!params.codigosProprios.length) return false;
  if (!params.codigoPrestadorExecutante) return false;
  return !params.codigosProprios.includes(params.codigoPrestadorExecutante);
}

describe("Classificação de Terceiros na Conciliação", () => {
  // Códigos próprios do hospital (CNPJ e códigos cadastrados)
  const codigosProprios = new Set(["00418954000119", "3201151"]);

  describe("classificarItemSemMatch - código preenchido", () => {
    it("deve classificar como 'terceiro' quando o prestador NÃO está nos próprios", () => {
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: "05046748622", // CPF do médico terceiro
        codigosProprios,
        valorFaturado: 50.54,
      });

      expect(result.statusConciliacao).toBe("terceiro");
      expect(result.valorGlosa).toBe(0);
      expect(result.diferenca).toBe(0);
      expect(result.codigoGlosa).toBeNull();
    });

    it("deve classificar como 'glosado' quando o prestador é próprio", () => {
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: "00418954000119", // CNPJ do hospital
        codigosProprios,
        valorFaturado: 100.00,
      });

      expect(result.statusConciliacao).toBe("glosado");
      expect(result.valorGlosa).toBe(100.00);
      expect(result.diferenca).toBe(100.00);
      expect(result.codigoGlosa).toBe("5007");
    });

    it("deve classificar como 'glosado' quando não há próprios cadastrados (sem referência)", () => {
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: "05046748622",
        codigosProprios: new Set(),
        valorFaturado: 50.54,
      });

      expect(result.statusConciliacao).toBe("glosado");
      expect(result.valorGlosa).toBe(50.54);
    });
  });

  describe("classificarItemSemMatch - código NULL com contexto da guia", () => {
    it("deve classificar como 'terceiro' quando código é NULL mas outros itens da guia são próprios", () => {
      // Cenário real: guia 17007116
      // Item 20104294 (Terapia Oncológica) tem código NULL
      // Outros itens da mesma guia têm código 00418954000119 (CNPJ do hospital = próprio)
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: null,
        codigosProprios,
        valorFaturado: 50.54,
        itensMesmaGuia: [
          { codigoPrestadorExecutante: "00418954000119" }, // Material - hospital
          { codigoPrestadorExecutante: "00418954000119" }, // Medicamento - hospital
          { codigoPrestadorExecutante: null },              // Este item (procedimento médico)
        ],
      });

      expect(result.statusConciliacao).toBe("terceiro");
      expect(result.valorGlosa).toBe(0);
      expect(result.diferenca).toBe(0);
      expect(result.codigoGlosa).toBeNull();
    });

    it("deve classificar como 'glosado' quando código é NULL e nenhum item da guia é próprio", () => {
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: null,
        codigosProprios,
        valorFaturado: 75.00,
        itensMesmaGuia: [
          { codigoPrestadorExecutante: null },
          { codigoPrestadorExecutante: null },
        ],
      });

      expect(result.statusConciliacao).toBe("glosado");
      expect(result.valorGlosa).toBe(75.00);
    });

    it("deve classificar como 'glosado' quando código é NULL e sem itens na mesma guia", () => {
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: null,
        codigosProprios,
        valorFaturado: 75.00,
      });

      expect(result.statusConciliacao).toBe("glosado");
      expect(result.valorGlosa).toBe(75.00);
    });

    it("deve classificar como 'glosado' quando código é NULL e sem próprios cadastrados", () => {
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: null,
        codigosProprios: new Set(),
        valorFaturado: 75.00,
        itensMesmaGuia: [
          { codigoPrestadorExecutante: "00418954000119" },
        ],
      });

      expect(result.statusConciliacao).toBe("glosado");
      expect(result.valorGlosa).toBe(75.00);
    });
  });

  describe("Filtragem de terceiros no XML de recurso", () => {
    it("deve excluir itens com status 'terceiro' do XML", () => {
      expect(deveIncluirNoXmlRecurso("terceiro")).toBe(false);
    });

    it("deve incluir itens com status 'glosado' no XML", () => {
      expect(deveIncluirNoXmlRecurso("glosado")).toBe(true);
    });

    it("deve incluir itens com status 'conciliado' no XML", () => {
      expect(deveIncluirNoXmlRecurso("conciliado")).toBe(true);
    });

    it("deve incluir itens com status 'divergente' no XML", () => {
      expect(deveIncluirNoXmlRecurso("divergente")).toBe(true);
    });
  });

  describe("isTerceiro (lógica frontend)", () => {
    it("deve retornar true quando statusGuia é 'terceiro'", () => {
      expect(isTerceiroFrontend({
        statusGuia: "terceiro",
        codigosProprios: [],
      })).toBe(true);
    });

    it("deve retornar true quando código NÃO está nos próprios", () => {
      expect(isTerceiroFrontend({
        codigoPrestadorExecutante: "05046748622",
        codigosProprios: ["00418954000119", "3201151"],
      })).toBe(true);
    });

    it("deve retornar false quando código ESTÁ nos próprios", () => {
      expect(isTerceiroFrontend({
        codigoPrestadorExecutante: "00418954000119",
        codigosProprios: ["00418954000119", "3201151"],
      })).toBe(false);
    });

    it("deve retornar false quando não tem código de prestador", () => {
      expect(isTerceiroFrontend({
        codigoPrestadorExecutante: undefined,
        codigosProprios: ["00418954000119"],
      })).toBe(false);
    });

    it("deve retornar false quando lista de próprios está vazia (sem referência)", () => {
      expect(isTerceiroFrontend({
        codigoPrestadorExecutante: "05046748622",
        codigosProprios: [],
      })).toBe(false);
    });
  });

  describe("Cenário da guia 17007812 (Erich Pires Marota - código preenchido)", () => {
    it("deve classificar o item do médico terceiro como 'terceiro' e não 'glosado'", () => {
      const codigoMedicoTerceiro = "05046748622";
      const codigosPropriosHospital = new Set(["00418954000119", "3201151"]);
      
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: codigoMedicoTerceiro,
        codigosProprios: codigosPropriosHospital,
        valorFaturado: 50.54,
      });

      expect(result.statusConciliacao).not.toBe("glosado");
      expect(result.statusConciliacao).toBe("terceiro");
      expect(result.valorGlosa).toBe(0);
      expect(result.diferenca).toBe(0);
      expect(result.codigoGlosa).toBeNull();
    });

    it("o item do terceiro NÃO deve ser incluído no XML de recurso", () => {
      expect(deveIncluirNoXmlRecurso("terceiro")).toBe(false);
    });
  });

  describe("Cenário da guia 17007116 (código NULL com itens próprios)", () => {
    it("deve classificar o item 20104294 como 'terceiro' quando código é NULL mas guia tem itens próprios", () => {
      const codigosPropriosHospital = new Set(["00418954000119", "3201151"]);
      
      // Simula os itens da guia 17007116 reais do banco
      const itensMesmaGuia = [
        { codigoPrestadorExecutante: "00418954000119" }, // DIFENIDRAMINA
        { codigoPrestadorExecutante: null },              // Terapia Oncológica (este item)
        { codigoPrestadorExecutante: "00418954000119" }, // PEMBROLIZUMABE
        { codigoPrestadorExecutante: "00418954000119" }, // SORO FISIOLOGICO
        { codigoPrestadorExecutante: "00418954000119" }, // ABOCATH
        { codigoPrestadorExecutante: "00418954000119" }, // AGULHA
        { codigoPrestadorExecutante: "00418954000119" }, // EQUIPO MACRO
        { codigoPrestadorExecutante: "00418954000119" }, // EQUIPO POLIFIX
        { codigoPrestadorExecutante: "00418954000119" }, // KIT DIARIO
        { codigoPrestadorExecutante: "00418954000119" }, // SERINGA 03ML
        { codigoPrestadorExecutante: "00418954000119" }, // SERINGA 10ML
        { codigoPrestadorExecutante: "00418954000119" }, // TAXA QUIMIOTERAPIA
      ];

      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: null, // Item 20104294 tem código NULL
        codigosProprios: codigosPropriosHospital,
        valorFaturado: 50.54,
        itensMesmaGuia,
      });

      expect(result.statusConciliacao).toBe("terceiro");
      expect(result.valorGlosa).toBe(0);
      expect(result.diferenca).toBe(0);
      expect(result.codigoGlosa).toBeNull();
    });

    it("item próprio do hospital deve ser glosado normalmente", () => {
      const codigosPropriosHospital = new Set(["00418954000119", "3201151"]);
      
      const result = classificarItemSemMatch({
        codigoPrestadorExecutante: "00418954000119",
        codigosProprios: codigosPropriosHospital,
        valorFaturado: 73.51,
      });

      expect(result.statusConciliacao).toBe("glosado");
      expect(result.valorGlosa).toBe(73.51);
    });
  });
});
