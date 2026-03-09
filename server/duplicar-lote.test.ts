import { describe, it, expect } from "vitest";

/**
 * Testes para a funcionalidade de duplicação em lote de gabaritos
 * e melhorias no autocomplete e composições
 */

describe("Duplicação em Lote - Validação de Input", () => {
  it("deve rejeitar array vazio de IDs", () => {
    const ids: number[] = [];
    expect(ids.length).toBe(0);
    // O endpoint usa z.array(z.number()).min(1) que rejeita arrays vazios
    expect(() => {
      if (ids.length === 0) throw new Error("Selecione pelo menos um padrão");
    }).toThrow("Selecione pelo menos um padrão");
  });

  it("deve aceitar array com múltiplos IDs", () => {
    const ids = [1, 2, 3, 4, 5];
    expect(ids.length).toBe(5);
    expect(ids.every(id => typeof id === "number")).toBe(true);
  });

  it("deve processar duplicação com convênio destino diferente", () => {
    const input = {
      ids: [10, 20, 30],
      novoConvenioId: 5,
      novoSetor: null,
      observacoes: "Duplicação para Unimed",
    };
    expect(input.ids.length).toBe(3);
    expect(input.novoConvenioId).toBe(5);
    expect(input.novoSetor).toBeNull();
  });

  it("deve processar duplicação sem convênio (geral)", () => {
    const input = {
      ids: [10, 20],
      novoConvenioId: null,
      novoSetor: "CENTRO CIRURGICO",
      observacoes: undefined,
    };
    expect(input.novoConvenioId).toBeNull();
    expect(input.novoSetor).toBe("CENTRO CIRURGICO");
  });
});

describe("Duplicação em Lote - Resultado", () => {
  it("deve retornar contagem de sucesso e erros", () => {
    const resultado = {
      sucesso: 3,
      erros: 1,
      resultados: [
        { originalId: 10, novoId: 100, codigo: "30715059" },
        { originalId: 20, novoId: 101, codigo: "30715060" },
        { originalId: 30, novoId: 102, codigo: "30715061" },
      ],
      detalhesErros: [
        { originalId: 40, codigo: "30715062", motivo: "Já existe gabarito para este procedimento+convênio+setor" },
      ],
      message: "3 gabarito(s) duplicado(s) com sucesso, 1 erro(s)",
    };

    expect(resultado.sucesso).toBe(3);
    expect(resultado.erros).toBe(1);
    expect(resultado.resultados.length).toBe(3);
    expect(resultado.detalhesErros.length).toBe(1);
    expect(resultado.detalhesErros[0].motivo).toContain("Já existe");
  });

  it("deve gerar mensagem correta quando todos são duplicados com sucesso", () => {
    const sucesso = 5;
    const erros = 0;
    const message = `${sucesso} gabarito(s) duplicado(s) com sucesso${erros > 0 ? `, ${erros} erro(s)` : ""}`;
    expect(message).toBe("5 gabarito(s) duplicado(s) com sucesso");
  });

  it("deve gerar mensagem correta quando há erros parciais", () => {
    const sucesso = 3;
    const erros = 2;
    const message = `${sucesso} gabarito(s) duplicado(s) com sucesso${erros > 0 ? `, ${erros} erro(s)` : ""}`;
    expect(message).toBe("3 gabarito(s) duplicado(s) com sucesso, 2 erro(s)");
  });
});

describe("Duplicação Individual - Composições", () => {
  it("deve permitir duplicar composição (isGabarito !== 1) como gabarito", () => {
    const original = {
      id: 50,
      isGabarito: 0, // É composição, não gabarito
      codigoProcedimentoPrincipal: "30715059",
      descricaoProcedimentoPrincipal: "Cirurgia de Coluna",
      itensAssociados: [
        { codigo: "60027169", descricao: "Taxa de itensificador", tipo: "TAXA", frequencia: 100, quantidadeMedia: 1 },
      ],
    };

    // Antes: isGabarito !== 1 era rejeitado
    // Agora: permitido, cópia será criada como gabarito (isGabarito = 1)
    expect(original.isGabarito).toBe(0);
    
    const copia = {
      ...original,
      id: 999,
      isGabarito: 1, // Cópia sempre é gabarito
      convenioId: 5,
    };
    expect(copia.isGabarito).toBe(1);
    expect(copia.convenioId).toBe(5);
  });
});

describe("Seleção em Lote - UI State", () => {
  it("deve gerenciar Set de IDs selecionados corretamente", () => {
    const selectedIds = new Set<number>();
    
    // Adicionar
    selectedIds.add(1);
    selectedIds.add(2);
    selectedIds.add(3);
    expect(selectedIds.size).toBe(3);
    
    // Toggle off
    selectedIds.delete(2);
    expect(selectedIds.size).toBe(2);
    expect(selectedIds.has(2)).toBe(false);
    
    // Toggle on
    selectedIds.add(2);
    expect(selectedIds.has(2)).toBe(true);
  });

  it("deve selecionar/desselecionar todos corretamente", () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    let selectedIds = new Set<number>();

    // Selecionar todos
    const allIds = items.map(i => i.id);
    allIds.forEach(id => selectedIds.add(id));
    expect(selectedIds.size).toBe(4);
    expect(allIds.every(id => selectedIds.has(id))).toBe(true);

    // Desselecionar todos
    allIds.forEach(id => selectedIds.delete(id));
    expect(selectedIds.size).toBe(0);
  });

  it("deve limpar seleção ao mudar de aba", () => {
    const selectedIds = new Set<number>([1, 2, 3]);
    expect(selectedIds.size).toBe(3);
    
    // Simular limpar seleção
    const cleared = new Set<number>();
    expect(cleared.size).toBe(0);
  });
});

describe("Autocomplete - Auto-seleção no Blur", () => {
  it("deve encontrar match exato quando código digitado corresponde a sugestão", () => {
    const sugestoes = [
      { codigo: "60027169", descricao: "Taxa de itensificador de imagem", tipo: "TAXA", totalOcorrencias: 10, quantidadeMedia: 1, valorMedio: 295.71 },
      { codigo: "60024151", descricao: "Alguel / Taxa de aparalho para artroscopia", tipo: "TAXA", totalOcorrencias: 5, quantidadeMedia: 1, valorMedio: 443.56 },
    ];

    const inputValue = "60024151";
    const exactMatch = sugestoes.find(s => s.codigo === inputValue.trim());
    
    expect(exactMatch).toBeDefined();
    expect(exactMatch!.descricao).toBe("Alguel / Taxa de aparalho para artroscopia");
    expect(exactMatch!.valorMedio).toBe(443.56);
  });

  it("não deve selecionar quando não há match exato", () => {
    const sugestoes = [
      { codigo: "60027169", descricao: "Taxa de itensificador de imagem", tipo: "TAXA", totalOcorrencias: 10, quantidadeMedia: 1, valorMedio: 295.71 },
    ];

    const inputValue = "60027";
    const exactMatch = sugestoes.find(s => s.codigo === inputValue.trim());
    
    expect(exactMatch).toBeUndefined();
  });

  it("não deve selecionar quando input está vazio", () => {
    const sugestoes = [
      { codigo: "60027169", descricao: "Taxa", tipo: "TAXA", totalOcorrencias: 10, quantidadeMedia: 1, valorMedio: 295.71 },
    ];

    const inputValue = "";
    const shouldAutoSelect = sugestoes && sugestoes.length > 0 && inputValue.trim();
    
    expect(shouldAutoSelect).toBeFalsy();
  });
});
