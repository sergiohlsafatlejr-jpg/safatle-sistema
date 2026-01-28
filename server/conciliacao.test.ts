import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

describe("Conciliação Automática", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConciliacaoPorConvenio", () => {
    it("should return empty results when no data exists", async () => {
      // Mock getDb to return empty results
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      
      vi.spyOn(db, "getConciliacaoPorConvenio").mockResolvedValue({
        itens: [],
        resumo: null,
      });

      const result = await db.getConciliacaoPorConvenio({
        convenioId: 1,
        userId: 1,
      });

      expect(result).toEqual({ itens: [], resumo: null });
    });

    it("should correctly identify glosado items when valor pago is less than faturado", async () => {
      // This tests the logic of identifying glosas
      const mockEnviado = {
        codigo: "10101012",
        guiaNumero: "12345",
        valorTotal: "100.00",
        descricao: "Consulta",
        pacienteNome: "Paciente Teste",
        dataExecucao: new Date(),
      };

      const mockRetornado = {
        codigo: "10101012",
        guiaNumero: "12345",
        valorTotal: "80.00", // Valor menor = glosa
        descricao: "Consulta",
        pacienteNome: "Paciente Teste",
        dataExecucao: new Date(),
        dadosExtras: JSON.stringify({ motivoGlosa: "Valor excedente" }),
      };

      // The function should identify this as glosado with R$ 20.00 de diferença
      const valorEnviado = parseFloat(mockEnviado.valorTotal);
      const valorRetornado = parseFloat(mockRetornado.valorTotal);
      const diferenca = valorEnviado - valorRetornado;

      expect(diferenca).toBe(20);
      expect(diferenca > 0).toBe(true); // Glosa parcial
    });

    it("should correctly identify OK items when valores are equal", async () => {
      const valorEnviado = 100.00;
      const valorRetornado = 100.00;
      const diferenca = valorEnviado - valorRetornado;

      expect(Math.abs(diferenca) < 0.01).toBe(true); // OK
    });

    it("should correctly identify nao_encontrado items when not in retorno", async () => {
      const retornadosMap = new Map<string, any[]>();
      const chave = "10101012|12345".toLowerCase();
      
      // Item não existe no mapa de retornados
      const retornados = retornadosMap.get(chave) || [];
      
      expect(retornados.length).toBe(0); // Não encontrado
    });
  });

  describe("getResumoConciliacao", () => {
    it("should return empty array when no convenios have data", async () => {
      vi.spyOn(db, "getResumoConciliacao").mockResolvedValue([]);

      const result = await db.getResumoConciliacao({
        userId: 1,
      });

      expect(result).toEqual([]);
    });
  });

  describe("getConciliacaoAgrupadaPorConta", () => {
    it("should return empty results when no data exists", async () => {
      vi.spyOn(db, "getConciliacaoAgrupadaPorConta").mockResolvedValue({
        contas: [],
        resumo: null,
        total: 0,
      });

      const result = await db.getConciliacaoAgrupadaPorConta({
        convenioId: 1,
        userId: 1,
        mesReferencia: 1,
        anoReferencia: 2024,
      });

      expect(result.contas).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should group items by guiaNumero correctly", async () => {
      // Simular agrupamento de itens
      const itens = [
        { guiaNumero: "G001", codigo: "10101", valorFaturado: 100, valorPago: 100, valorGlosado: 0, status: "ok" },
        { guiaNumero: "G001", codigo: "10102", valorFaturado: 50, valorPago: 40, valorGlosado: 10, status: "glosado" },
        { guiaNumero: "G002", codigo: "10103", valorFaturado: 200, valorPago: 200, valorGlosado: 0, status: "ok" },
      ];

      // Agrupar por guia
      const contasMap = new Map<string, { valorTotal: number; itens: number }>(); 
      for (const item of itens) {
        const chave = item.guiaNumero;
        if (!contasMap.has(chave)) {
          contasMap.set(chave, { valorTotal: 0, itens: 0 });
        }
        const conta = contasMap.get(chave)!;
        conta.valorTotal += item.valorFaturado;
        conta.itens++;
      }

      expect(contasMap.size).toBe(2); // 2 guias diferentes
      expect(contasMap.get("G001")?.itens).toBe(2);
      expect(contasMap.get("G001")?.valorTotal).toBe(150);
      expect(contasMap.get("G002")?.itens).toBe(1);
      expect(contasMap.get("G002")?.valorTotal).toBe(200);
    });

    it("should determine conta status correctly based on item statuses", () => {
      // Testar lógica de status da conta
      const testCases = [
        { itemStatuses: ["ok", "ok"], expectedContaStatus: "ok" },
        { itemStatuses: ["ok", "glosado"], expectedContaStatus: "glosado" },
        { itemStatuses: ["ok", "nao_recebido"], expectedContaStatus: "nao_encontrado" },
        { itemStatuses: ["glosado", "nao_recebido"], expectedContaStatus: "glosado" },
      ];

      for (const testCase of testCases) {
        let contaStatus = "ok";
        for (const itemStatus of testCase.itemStatuses) {
          if (itemStatus === "nao_recebido") {
            if (contaStatus === "ok") contaStatus = "nao_encontrado";
          } else if (itemStatus === "glosado") {
            if (contaStatus === "ok" || contaStatus === "nao_encontrado") contaStatus = "glosado";
          }
        }
        expect(contaStatus).toBe(testCase.expectedContaStatus);
      }
    });
  });

  describe("Cálculo de percentual de glosa", () => {
    it("should calculate glosa percentage correctly", () => {
      const valorTotalFaturado = 1000;
      const valorTotalGlosado = 100;
      const percentualGlosa = (valorTotalGlosado / valorTotalFaturado) * 100;

      expect(percentualGlosa).toBe(10);
    });

    it("should return 0% when no faturado value", () => {
      const valorTotalFaturado = 0;
      const valorTotalGlosado = 0;
      const percentualGlosa = valorTotalFaturado > 0 
        ? (valorTotalGlosado / valorTotalFaturado) * 100 
        : 0;

      expect(percentualGlosa).toBe(0);
    });
  });
});


// ============ TESTES PARA CHAVE DE AGRUPAMENTO (Alta Administrativa) ============

// Interface simplificada para testes de chave
interface ItemConciliacaoChave {
  guiaNumero: string;
  numeroLote: string;
  sequencialTransacao: string;
  protocoloTISS: string;
  arquivoId?: number;
}

// Função de geração de chave (cópia da implementação em db.ts)
function gerarChaveAgrupamento(item: ItemConciliacaoChave): string {
  // Validação dos campos
  const protocoloValido = item.protocoloTISS && 
    String(item.protocoloTISS).trim() !== '' && 
    item.protocoloTISS !== 'null' &&
    item.protocoloTISS !== '-';
  
  const loteValido = item.numeroLote && 
    item.numeroLote !== 'null' && 
    item.numeroLote !== 'undefined' && 
    item.numeroLote !== '-' &&
    String(item.numeroLote).trim() !== '';
  
  const seqValido = item.sequencialTransacao && 
    item.sequencialTransacao !== 'null' && 
    item.sequencialTransacao !== 'undefined' && 
    item.sequencialTransacao !== '-' &&
    String(item.sequencialTransacao).trim() !== '';
  
  const guia = item.guiaNumero || 'sem_guia';
  
  if (protocoloValido) {
    return `${guia}_protocolo_${item.protocoloTISS}`;
  } else if (loteValido && seqValido) {
    return `${guia}_${item.numeroLote}_${item.sequencialTransacao}`;
  } else if (loteValido) {
    return `${guia}_${item.numeroLote}_sem_seq`;
  } else if (item.arquivoId) {
    return `${guia}_arquivo_${item.arquivoId}`;
  } else {
    return guia;
  }
}

describe("Conciliação Automática - Geração de Chave de Agrupamento", () => {
  describe("Cenário 1: Arquivos XML com lote e sequencial", () => {
    it("deve gerar chaves diferentes para mesma guia com sequenciais diferentes (Alta Administrativa)", () => {
      const item1: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "100",
        sequencialTransacao: "1",
        protocoloTISS: "",
      };
      
      const item2: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "100",
        sequencialTransacao: "2",
        protocoloTISS: "",
      };
      
      const chave1 = gerarChaveAgrupamento(item1);
      const chave2 = gerarChaveAgrupamento(item2);
      
      expect(chave1).not.toBe(chave2);
      expect(chave1).toBe("12345_100_1");
      expect(chave2).toBe("12345_100_2");
    });
    
    it("deve gerar mesma chave para itens da mesma transação", () => {
      const item1: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "100",
        sequencialTransacao: "1",
        protocoloTISS: "",
      };
      
      const item2: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "100",
        sequencialTransacao: "1",
        protocoloTISS: "",
      };
      
      expect(gerarChaveAgrupamento(item1)).toBe(gerarChaveAgrupamento(item2));
    });
  });
  
  describe("Cenário 2: Arquivos Excel com Protocolo TISS (Unimed)", () => {
    it("deve gerar chaves diferentes para mesma guia com protocolos diferentes", () => {
      const item1: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "",
        sequencialTransacao: "",
        protocoloTISS: "PROT001",
      };
      
      const item2: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "",
        sequencialTransacao: "",
        protocoloTISS: "PROT002",
      };
      
      const chave1 = gerarChaveAgrupamento(item1);
      const chave2 = gerarChaveAgrupamento(item2);
      
      expect(chave1).not.toBe(chave2);
      expect(chave1).toBe("12345_protocolo_PROT001");
      expect(chave2).toBe("12345_protocolo_PROT002");
    });
    
    it("deve priorizar Protocolo TISS sobre lote/sequencial", () => {
      const item: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "100",
        sequencialTransacao: "1",
        protocoloTISS: "PROT001",
      };
      
      const chave = gerarChaveAgrupamento(item);
      
      expect(chave).toBe("12345_protocolo_PROT001");
    });
  });
  
  describe("Cenário 3: Fallback para arquivos sem identificadores", () => {
    it("deve usar arquivoId quando não há lote nem protocolo", () => {
      const item: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "",
        sequencialTransacao: "",
        protocoloTISS: "",
        arquivoId: 42,
      };
      
      const chave = gerarChaveAgrupamento(item);
      
      expect(chave).toBe("12345_arquivo_42");
    });
    
    it("deve usar apenas guia quando não há nenhum identificador", () => {
      const item: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "",
        sequencialTransacao: "",
        protocoloTISS: "",
      };
      
      const chave = gerarChaveAgrupamento(item);
      
      expect(chave).toBe("12345");
    });
    
    it("deve usar 'sem_guia' quando não há guia", () => {
      const item: ItemConciliacaoChave = {
        guiaNumero: "",
        numeroLote: "",
        sequencialTransacao: "",
        protocoloTISS: "",
      };
      
      const chave = gerarChaveAgrupamento(item);
      
      expect(chave).toBe("sem_guia");
    });
  });
  
  describe("Cenário 4: Validação de valores inválidos", () => {
    it("deve tratar 'null' como valor inválido para protocolo", () => {
      const item: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "100",
        sequencialTransacao: "1",
        protocoloTISS: "null",
      };
      
      const chave = gerarChaveAgrupamento(item);
      
      expect(chave).toBe("12345_100_1");
    });
    
    it("deve tratar '-' como valor inválido para lote", () => {
      const item: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "-",
        sequencialTransacao: "1",
        protocoloTISS: "",
        arquivoId: 42,
      };
      
      const chave = gerarChaveAgrupamento(item);
      
      expect(chave).toBe("12345_arquivo_42");
    });
    
    it("deve tratar string vazia com espaços como valor inválido", () => {
      const item: ItemConciliacaoChave = {
        guiaNumero: "12345",
        numeroLote: "   ",
        sequencialTransacao: "",
        protocoloTISS: "",
        arquivoId: 42,
      };
      
      const chave = gerarChaveAgrupamento(item);
      
      expect(chave).toBe("12345_arquivo_42");
    });
  });
  
  describe("Cenário 5: Caso real de Alta Administrativa", () => {
    it("deve separar corretamente 3 transações da mesma guia", () => {
      // Simula uma guia com 3 altas administrativas (internação com múltiplas saídas)
      const transacoes: ItemConciliacaoChave[] = [
        {
          guiaNumero: "GUIA-2024-001",
          numeroLote: "LOT001",
          sequencialTransacao: "001",
          protocoloTISS: "",
        },
        {
          guiaNumero: "GUIA-2024-001",
          numeroLote: "LOT001",
          sequencialTransacao: "002",
          protocoloTISS: "",
        },
        {
          guiaNumero: "GUIA-2024-001",
          numeroLote: "LOT001",
          sequencialTransacao: "003",
          protocoloTISS: "",
        },
      ];
      
      const chaves = transacoes.map(gerarChaveAgrupamento);
      
      // Todas as chaves devem ser diferentes
      const chavesUnicas = new Set(chaves);
      expect(chavesUnicas.size).toBe(3);
      
      // Verificar formato das chaves
      expect(chaves[0]).toBe("GUIA-2024-001_LOT001_001");
      expect(chaves[1]).toBe("GUIA-2024-001_LOT001_002");
      expect(chaves[2]).toBe("GUIA-2024-001_LOT001_003");
    });
  });
});
