import { describe, expect, it } from "vitest";

/**
 * Testes para o sistema de templates de mapeamento do integrador de dados.
 * 
 * Como os templates são definidos no frontend (client/src/lib/templates-mapeamento.ts),
 * importamos diretamente o módulo para validar a estrutura e consistência dos dados.
 */

// Importar os templates diretamente (o vitest suporta importação de módulos TS do client)
import {
  TEMPLATES_MAPEAMENTO,
  SISTEMAS_DISPONIVEIS,
  getTemplatesBySistema,
  type TemplateMapeamento,
  type TemplateCampo,
} from "../client/src/lib/templates-mapeamento";

describe("Templates de Mapeamento - Estrutura", () => {
  it("deve ter pelo menos 4 templates definidos (um por sistema)", () => {
    expect(TEMPLATES_MAPEAMENTO.length).toBeGreaterThanOrEqual(4);
  });

  it("cada template deve ter todos os campos obrigatórios", () => {
    for (const template of TEMPLATES_MAPEAMENTO) {
      expect(template.id).toBeTruthy();
      expect(template.nome).toBeTruthy();
      expect(template.sistema).toBeTruthy();
      expect(template.descricao).toBeTruthy();
      expect(template.bancoTipo).toBeTruthy();
      expect(template.querySQL).toBeTruthy();
      expect(template.campoChaveSugerido).toBeTruthy();
      expect(Array.isArray(template.campos)).toBe(true);
      expect(template.campos.length).toBeGreaterThan(0);
      expect(Array.isArray(template.observacoes)).toBe(true);
    }
  });

  it("cada campo do template deve ter colunaOrigemNome, colunaDestinoNome e descricao", () => {
    for (const template of TEMPLATES_MAPEAMENTO) {
      for (const campo of template.campos) {
        expect(campo.colunaOrigemNome).toBeTruthy();
        expect(campo.colunaDestinoNome).toBeTruthy();
        expect(campo.descricao).toBeTruthy();
      }
    }
  });

  it("IDs dos templates devem ser únicos", () => {
    const ids = TEMPLATES_MAPEAMENTO.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("nomes dos templates devem ser únicos", () => {
    const nomes = TEMPLATES_MAPEAMENTO.map((t) => t.nome);
    const uniqueNomes = new Set(nomes);
    expect(uniqueNomes.size).toBe(nomes.length);
  });
});

describe("Templates de Mapeamento - Sistemas Disponíveis", () => {
  it("deve ter pelo menos 5 sistemas (4 + personalizado)", () => {
    expect(SISTEMAS_DISPONIVEIS.length).toBeGreaterThanOrEqual(5);
  });

  it("deve incluir os 4 sistemas hospitalares e personalizado", () => {
    const ids = SISTEMAS_DISPONIVEIS.map((s) => s.id);
    expect(ids).toContain("warleine");
    expect(ids).toContain("tasy");
    expect(ids).toContain("mv");
    expect(ids).toContain("easyvision");
    expect(ids).toContain("personalizado");
  });

  it("cada sistema deve ter id, nome e banco", () => {
    for (const sistema of SISTEMAS_DISPONIVEIS) {
      expect(sistema.id).toBeTruthy();
      expect(sistema.nome).toBeTruthy();
      expect(sistema.banco).toBeTruthy();
    }
  });
});

describe("Templates de Mapeamento - Warleine", () => {
  const templates = getTemplatesBySistema("warleine");

  it("deve ter pelo menos 1 template para Warleine", () => {
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it("template Warleine deve usar SQL Server", () => {
    for (const t of templates) {
      expect(t.bancoTipo).toBe("SQL Server");
    }
  });

  it("query SQL deve conter SELECT e FROM", () => {
    for (const t of templates) {
      expect(t.querySQL.toUpperCase()).toContain("SELECT");
      expect(t.querySQL.toUpperCase()).toContain("FROM");
    }
  });

  it("deve mapear campos essenciais de faturamento", () => {
    const camposEssenciais = ["numconta", "nomeconv", "vl_faturado", "vl_pago", "vl_glosa"];
    for (const t of templates) {
      const campoNomes = t.campos.map((c) => c.colunaOrigemNome);
      for (const essencial of camposEssenciais) {
        expect(campoNomes).toContain(essencial);
      }
    }
  });

  it("deve ter campos de recurso de glosa", () => {
    const camposRecurso = ["vl_recurso", "vl_recuperado", "status_recurso"];
    for (const t of templates) {
      const campoNomes = t.campos.map((c) => c.colunaOrigemNome);
      for (const campo of camposRecurso) {
        expect(campoNomes).toContain(campo);
      }
    }
  });
});

describe("Templates de Mapeamento - Tasy", () => {
  const templates = getTemplatesBySistema("tasy");

  it("deve ter pelo menos 1 template para Tasy", () => {
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it("template Tasy deve usar Oracle", () => {
    for (const t of templates) {
      expect(t.bancoTipo).toBe("Oracle");
    }
  });

  it("query SQL deve usar sintaxe Oracle (TO_CHAR, NVL)", () => {
    for (const t of templates) {
      expect(t.querySQL).toContain("TO_CHAR");
      expect(t.querySQL).toContain("NVL");
    }
  });

  it("deve mapear campos essenciais de faturamento", () => {
    const camposEssenciais = ["numconta", "nomeconv", "vl_faturado", "vl_pago", "vl_glosa"];
    for (const t of templates) {
      const campoNomes = t.campos.map((c) => c.colunaOrigemNome);
      for (const essencial of camposEssenciais) {
        expect(campoNomes).toContain(essencial);
      }
    }
  });
});

describe("Templates de Mapeamento - MV", () => {
  const templates = getTemplatesBySistema("mv");

  it("deve ter pelo menos 1 template para MV", () => {
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it("template MV deve usar Oracle/PostgreSQL", () => {
    for (const t of templates) {
      expect(t.bancoTipo).toContain("Oracle");
    }
  });

  it("query SQL deve referenciar schema DBAMV", () => {
    for (const t of templates) {
      expect(t.querySQL).toContain("DBAMV");
    }
  });

  it("deve mapear campos essenciais de faturamento", () => {
    const camposEssenciais = ["numconta", "nomeconv", "vl_faturado", "vl_pago", "vl_glosa"];
    for (const t of templates) {
      const campoNomes = t.campos.map((c) => c.colunaOrigemNome);
      for (const essencial of camposEssenciais) {
        expect(campoNomes).toContain(essencial);
      }
    }
  });
});

describe("Templates de Mapeamento - EasyVision", () => {
  const templates = getTemplatesBySistema("easyvision");

  it("deve ter pelo menos 1 template para EasyVision", () => {
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it("template EasyVision deve usar PostgreSQL", () => {
    for (const t of templates) {
      expect(t.bancoTipo).toBe("PostgreSQL");
    }
  });

  it("query SQL deve usar sintaxe PostgreSQL (COALESCE)", () => {
    for (const t of templates) {
      expect(t.querySQL).toContain("COALESCE");
    }
  });

  it("deve mapear campos essenciais de faturamento", () => {
    const camposEssenciais = ["numconta", "nomeconv", "vl_faturado", "vl_pago", "vl_glosa"];
    for (const t of templates) {
      const campoNomes = t.campos.map((c) => c.colunaOrigemNome);
      for (const essencial of camposEssenciais) {
        expect(campoNomes).toContain(essencial);
      }
    }
  });
});

describe("Templates de Mapeamento - getTemplatesBySistema", () => {
  it("deve retornar templates corretos para cada sistema", () => {
    const warleine = getTemplatesBySistema("warleine");
    expect(warleine.every((t) => t.sistema === "Warleine")).toBe(true);

    const tasy = getTemplatesBySistema("tasy");
    expect(tasy.every((t) => t.sistema === "Tasy")).toBe(true);

    const mv = getTemplatesBySistema("mv");
    expect(mv.every((t) => t.sistema === "MV")).toBe(true);

    const easyvision = getTemplatesBySistema("easyvision");
    expect(easyvision.every((t) => t.sistema === "EasyVision")).toBe(true);
  });

  it("deve retornar array vazio para sistema inexistente", () => {
    const resultado = getTemplatesBySistema("sistema_inexistente");
    expect(resultado).toEqual([]);
  });

  it("deve ser case-insensitive", () => {
    const lower = getTemplatesBySistema("warleine");
    const upper = getTemplatesBySistema("WARLEINE");
    const mixed = getTemplatesBySistema("Warleine");
    expect(lower.length).toBe(upper.length);
    expect(lower.length).toBe(mixed.length);
  });
});

describe("Templates de Mapeamento - Consistência de Campos", () => {
  it("todos os templates devem ter campo numconta como chave sugerida", () => {
    for (const template of TEMPLATES_MAPEAMENTO) {
      expect(template.campoChaveSugerido).toBe("numconta");
    }
  });

  it("todos os templates devem ter campos mínimos padronizados", () => {
    const camposPadrao = [
      "numconta",
      "numatend",
      "nomeconv",
      "mesprod",
      "setor",
      "codproc",
      "descricao",
      "tipo",
      "qtd",
      "vl_faturado",
      "vl_pago",
      "vl_glosa",
      "dt_faturamento",
      "nomepac",
      "codconv",
    ];

    for (const template of TEMPLATES_MAPEAMENTO) {
      const campoNomes = template.campos.map((c) => c.colunaOrigemNome);
      for (const campo of camposPadrao) {
        expect(campoNomes).toContain(campo);
      }
    }
  });

  it("nenhum template deve ter campos duplicados", () => {
    for (const template of TEMPLATES_MAPEAMENTO) {
      const campoNomes = template.campos.map((c) => c.colunaOrigemNome);
      const uniqueNomes = new Set(campoNomes);
      expect(uniqueNomes.size).toBe(campoNomes.length);
    }
  });

  it("todos os templates devem ter pelo menos uma observação", () => {
    for (const template of TEMPLATES_MAPEAMENTO) {
      expect(template.observacoes.length).toBeGreaterThan(0);
    }
  });
});
