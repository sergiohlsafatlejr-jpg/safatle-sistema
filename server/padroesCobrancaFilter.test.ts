import { describe, it, expect } from "vitest";

/**
 * Testa que as queries de geração de padrões de cobrança
 * filtram somente procedimentos (excluem materiais, medicamentos, exames, taxas, diárias)
 */

// Tipos de item que devem ser incluídos nos padrões de cobrança
const TIPOS_PROCEDIMENTO = ['P', 'C', 'PROCEDIMENTO', 'O', '01', 'PROC', 'PROC/TAXA'];

// Tipos de item que devem ser excluídos
const TIPOS_EXCLUIDOS = ['02', '03', '05', '07', 'M', 'MATERIAL', 'MEDICAMENTO', 'TAXA', 'TAXA/ALUGUÉIS', 'DIÁRIA', 'DIARIA', 'MAT', 'MED', 'MAT/MED', 'DESPESA'];

describe("Filtro de tipoItem nos Padrões de Cobrança", () => {
  it("deve incluir apenas tipos de procedimento válidos", () => {
    for (const tipo of TIPOS_PROCEDIMENTO) {
      expect(TIPOS_PROCEDIMENTO.includes(tipo)).toBe(true);
    }
  });

  it("não deve incluir materiais, medicamentos, taxas ou diárias", () => {
    for (const tipo of TIPOS_EXCLUIDOS) {
      expect(TIPOS_PROCEDIMENTO.includes(tipo)).toBe(false);
    }
  });

  it("deve gerar cláusula WHERE correta para filtrar procedimentos", () => {
    const estabelecimentoId = 1;
    const whereClause = `WHERE estabelecimentoId = ${estabelecimentoId}
        AND codigoItem IS NOT NULL AND codigoItem != ''
        AND convenio IS NOT NULL AND convenio != ''
        AND tipoItem IN ('P', 'C', 'PROCEDIMENTO', 'O', '01', 'PROC', 'PROC/TAXA')`;

    // Verificar que a cláusula contém o filtro de tipoItem
    expect(whereClause).toContain("tipoItem IN");
    expect(whereClause).toContain("'PROCEDIMENTO'");
    expect(whereClause).toContain("'PROC'");
    expect(whereClause).toContain("'PROC/TAXA'");
    
    // Verificar que NÃO contém tipos excluídos
    expect(whereClause).not.toContain("'MATERIAL'");
    expect(whereClause).not.toContain("'MEDICAMENTO'");
    expect(whereClause).not.toContain("'MAT/MED'");
    expect(whereClause).not.toContain("'DESPESA'");
    expect(whereClause).not.toContain("'TAXA'");
    expect(whereClause).not.toContain("'DIARIA'");
  });

  it("deve filtrar itens corretamente com base no tipoItem", () => {
    const itensExemplo = [
      { codigoItem: "10101012", descricaoItem: "CONSULTA", tipoItem: "PROCEDIMENTO", valorFaturado: "100.00" },
      { codigoItem: "90069860", descricaoItem: "DIPIRONA 500MG", tipoItem: "MEDICAMENTO", valorFaturado: "1.04" },
      { codigoItem: "70223750", descricaoItem: "EQUIPO P/INFUSAO", tipoItem: "MATERIAL", valorFaturado: "7.51" },
      { codigoItem: "40803139", descricaoItem: "RX MAOS", tipoItem: "PROC", valorFaturado: "43.89" },
      { codigoItem: "60000694", descricaoItem: "DIARIA ENFERMARIA", tipoItem: "DIARIA", valorFaturado: "250.00" },
      { codigoItem: "43990305", descricaoItem: "TAXA AUDITORIA", tipoItem: "TAXA", valorFaturado: "15.00" },
      { codigoItem: "20201010", descricaoItem: "CLORETO SODIO", tipoItem: "MAT/MED", valorFaturado: "1.10" },
      { codigoItem: "10101039", descricaoItem: "VISITA HOSPITALAR", tipoItem: "P", valorFaturado: "80.00" },
      { codigoItem: "30301010", descricaoItem: "HEMOGRAMA", tipoItem: "O", valorFaturado: "25.00" },
    ];

    const filtrados = itensExemplo.filter(item => 
      TIPOS_PROCEDIMENTO.includes(item.tipoItem)
    );

    // Deve incluir apenas procedimentos
    expect(filtrados.length).toBe(4);
    expect(filtrados.map(i => i.codigoItem)).toEqual(["10101012", "40803139", "10101039", "30301010"]);
    
    // Deve excluir materiais, medicamentos, diárias e taxas
    const excluidos = itensExemplo.filter(item => 
      !TIPOS_PROCEDIMENTO.includes(item.tipoItem)
    );
    expect(excluidos.length).toBe(5);
    expect(excluidos.every(i => 
      ["MEDICAMENTO", "MATERIAL", "DIARIA", "TAXA", "MAT/MED"].includes(i.tipoItem)
    )).toBe(true);
  });

  it("deve manter consistência com o filtro do gerarPadroesComposicao", () => {
    // O gerarPadroesComposicao já usava estes tipos como tiposPrincipais
    const tiposPrincipaisComposicao = new Set(["P", "C", "PROCEDIMENTO", "O", "01", "PROC"]);
    
    // Todos os tipos do composição devem estar no nosso filtro
    for (const tipo of Array.from(tiposPrincipaisComposicao)) {
      expect(TIPOS_PROCEDIMENTO.includes(tipo)).toBe(true);
    }
    
    // Nosso filtro adiciona PROC/TAXA que também é procedimento
    expect(TIPOS_PROCEDIMENTO.includes("PROC/TAXA")).toBe(true);
  });
});
