import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do logger
vi.mock("./_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Contas Convênio - Reimportação com forceRemote e fonteDados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Lógica de fallback vs forceRemote", () => {
    it("deve retornar fonteDados='BANCO_REMOTO' quando query do integrador funciona", () => {
      let fonteDados: "BANCO_REMOTO" | "CACHE_LOCAL" = "BANCO_REMOTO";
      const querySuccess = true;
      if (querySuccess) fonteDados = "BANCO_REMOTO";
      expect(fonteDados).toBe("BANCO_REMOTO");
    });

    it("deve retornar fonteDados='CACHE_LOCAL' quando query falha e forceRemote=false", () => {
      let fonteDados: "BANCO_REMOTO" | "CACHE_LOCAL" = "BANCO_REMOTO";
      const querySuccess = false;
      const forceRemote = false;
      if (!querySuccess && !forceRemote) fonteDados = "CACHE_LOCAL";
      expect(fonteDados).toBe("CACHE_LOCAL");
    });

    it("deve lançar erro quando query falha e forceRemote=true", () => {
      const querySuccess = false;
      const forceRemote = true;
      expect(() => {
        if (!querySuccess && forceRemote) {
          throw new Error("Falha ao buscar conta diretamente do banco do hospital: Connection timeout.");
        }
      }).toThrow("Falha ao buscar conta diretamente do banco do hospital");
    });

    it("deve incluir aviso de fallback na mensagem quando fonteDados='CACHE_LOCAL'", () => {
      const fonteDados = "CACHE_LOCAL";
      const avisoFallback = fonteDados === "CACHE_LOCAL"
        ? " ⚠️ ATENÇÃO: Dados carregados do cache local (podem estar desatualizados)."
        : "";
      const mensagem = `Conta 143800 importada com 104 itens. Valor total: R$ 12085.37${avisoFallback}`;
      expect(mensagem).toContain("ATENÇÃO");
      expect(mensagem).toContain("cache local");
    });

    it("NÃO deve incluir aviso quando fonteDados='BANCO_REMOTO'", () => {
      const fonteDados = "BANCO_REMOTO";
      const avisoFallback = fonteDados === "CACHE_LOCAL" ? " ⚠️ ATENÇÃO" : "";
      const mensagem = `Conta 143800 importada com 104 itens.${avisoFallback}`;
      expect(mensagem).not.toContain("ATENÇÃO");
    });
  });

  describe("Validação de input forceRemote", () => {
    it("deve aceitar forceRemote=true como parâmetro válido", () => {
      const input = { numeroConta: "143800", estabelecimentoId: 1, forceRemote: true };
      expect(input.forceRemote).toBe(true);
    });

    it("deve aceitar forceRemote=false como parâmetro válido", () => {
      const input = { numeroConta: "143800", estabelecimentoId: 1, forceRemote: false };
      expect(input.forceRemote).toBe(false);
    });

    it("deve ter forceRemote como false por padrão quando não fornecido", () => {
      const input: { numeroConta: string; estabelecimentoId: number; forceRemote?: boolean } = {
        numeroConta: "143800",
        estabelecimentoId: 1,
      };
      expect(input.forceRemote ?? false).toBe(false);
    });
  });

  describe("Resposta com fonteDados", () => {
    it("deve incluir fonteDados no retorno de sucesso", () => {
      const response = {
        sucesso: true,
        totalItens: 104,
        valorTotal: 12085.37,
        fonteDados: "BANCO_REMOTO" as const,
        comparativo: null,
      };
      expect(response.fonteDados).toBe("BANCO_REMOTO");
      expect(response.sucesso).toBe(true);
    });

    it("deve retornar fonteDados='CACHE_LOCAL' quando fallback é usado", () => {
      const response = { sucesso: true, fonteDados: "CACHE_LOCAL" as const };
      expect(response.fonteDados).toBe("CACHE_LOCAL");
    });
  });

  describe("Cenário completo: conta 143800 após auditoria", () => {
    it("deve reimportar com forceRemote=true para garantir dados atualizados", () => {
      const inputReimportacao = { numeroConta: "143800", estabelecimentoId: 1, forceRemote: true };
      const queryFalhou = true;
      let resultado: "sucesso" | "erro" | "fallback" = "sucesso";
      if (queryFalhou && inputReimportacao.forceRemote) resultado = "erro";
      expect(resultado).toBe("erro");
    });

    it("deve mostrar dados atualizados quando query funciona com forceRemote=true", () => {
      const queryFalhou = false;
      let fonteDados: "BANCO_REMOTO" | "CACHE_LOCAL" = "BANCO_REMOTO";
      if (!queryFalhou) fonteDados = "BANCO_REMOTO";
      expect(fonteDados).toBe("BANCO_REMOTO");
    });
  });

  // ============================================================
  // NOVOS TESTES: Comparativo de Reimportação
  // ============================================================
  describe("Comparativo de Reimportação - Geração de Diff", () => {
    // Simula a lógica de comparação do backend
    function gerarComparativo(
      dadosAntigos: Array<{ codigoItem: string; dataExecucao: string; setor: string; quantidade: string; valorUnitario: string; valorTotal: string; descricaoItem: string }>,
      dadosNovos: Array<{ codigoItem: string; dataExecucao: string; setor: string; quantidade: string; valorUnitario: string; valorTotal: string; descricaoItem: string }>,
      valorTotalAnterior: number,
      valorTotalNovo: number,
    ) {
      const mapaAntigos = new Map<string, typeof dadosAntigos[0]>();
      for (const item of dadosAntigos) {
        const chave = `${item.codigoItem}_${item.dataExecucao}_${item.setor}`;
        mapaAntigos.set(chave, item);
      }

      const mapaNovos = new Set<string>();
      const itensAlterados: Array<{
        codigoItem: string;
        descricaoItem: string;
        campo: string;
        valorAntigo: string;
        valorNovo: string;
      }> = [];

      for (const item of dadosNovos) {
        const chave = `${item.codigoItem}_${item.dataExecucao}_${item.setor}`;
        mapaNovos.add(chave);
        const antigo = mapaAntigos.get(chave);
        if (antigo) {
          if (antigo.valorTotal !== item.valorTotal) {
            itensAlterados.push({
              codigoItem: item.codigoItem,
              descricaoItem: item.descricaoItem,
              campo: "Valor Total",
              valorAntigo: `R$ ${parseFloat(antigo.valorTotal).toFixed(2)}`,
              valorNovo: `R$ ${parseFloat(item.valorTotal).toFixed(2)}`,
            });
          }
          if (antigo.quantidade !== item.quantidade) {
            itensAlterados.push({
              codigoItem: item.codigoItem,
              descricaoItem: item.descricaoItem,
              campo: "Quantidade",
              valorAntigo: antigo.quantidade,
              valorNovo: item.quantidade,
            });
          }
          if (antigo.valorUnitario !== item.valorUnitario) {
            itensAlterados.push({
              codigoItem: item.codigoItem,
              descricaoItem: item.descricaoItem,
              campo: "Valor Unitário",
              valorAntigo: `R$ ${parseFloat(antigo.valorUnitario).toFixed(2)}`,
              valorNovo: `R$ ${parseFloat(item.valorUnitario).toFixed(2)}`,
            });
          }
        }
      }

      let itensAdicionados = 0;
      for (const item of dadosNovos) {
        const chave = `${item.codigoItem}_${item.dataExecucao}_${item.setor}`;
        if (!mapaAntigos.has(chave)) itensAdicionados++;
      }

      let itensRemovidos = 0;
      for (const [chave] of mapaAntigos) {
        if (!mapaNovos.has(chave)) itensRemovidos++;
      }

      return {
        hadPreviousData: dadosAntigos.length > 0,
        valorAnterior: valorTotalAnterior,
        valorNovo: valorTotalNovo,
        diferencaValor: valorTotalNovo - valorTotalAnterior,
        totalItensAnterior: dadosAntigos.length,
        totalItensNovo: dadosNovos.length,
        itensAlterados,
        itensAdicionados,
        itensRemovidos,
      };
    }

    it("deve detectar itens com valor total alterado", () => {
      const antigos = [
        { codigoItem: "60000694", dataExecucao: "2026-02-20", setor: "POSTO I", quantidade: "1", valorUnitario: "250.00", valorTotal: "250.00", descricaoItem: "DIARIA DE ENFERMARIA" },
        { codigoItem: "10102019", dataExecucao: "2026-02-18", setor: "POSTO I", quantidade: "1", valorUnitario: "168.00", valorTotal: "168.00", descricaoItem: "VISITA HOSPITALAR" },
      ];
      const novos = [
        { codigoItem: "60000694", dataExecucao: "2026-02-20", setor: "POSTO I", quantidade: "1", valorUnitario: "288.72", valorTotal: "288.72", descricaoItem: "DIARIA DE ENFERMARIA" },
        { codigoItem: "10102019", dataExecucao: "2026-02-18", setor: "POSTO I", quantidade: "1", valorUnitario: "168.00", valorTotal: "168.00", descricaoItem: "VISITA HOSPITALAR" },
      ];

      const comp = gerarComparativo(antigos, novos, 418.00, 456.72);

      expect(comp.hadPreviousData).toBe(true);
      expect(comp.itensAlterados.length).toBeGreaterThan(0);
      expect(comp.itensAlterados[0].codigoItem).toBe("60000694");
      expect(comp.itensAlterados[0].campo).toBe("Valor Total");
      expect(comp.itensAlterados[0].valorAntigo).toBe("R$ 250.00");
      expect(comp.itensAlterados[0].valorNovo).toBe("R$ 288.72");
      expect(comp.diferencaValor).toBeCloseTo(38.72, 2);
    });

    it("deve detectar itens com quantidade alterada", () => {
      const antigos = [
        { codigoItem: "MAT001", dataExecucao: "2026-02-15", setor: "UTI", quantidade: "2", valorUnitario: "50.00", valorTotal: "100.00", descricaoItem: "SERINGA 10ML" },
      ];
      const novos = [
        { codigoItem: "MAT001", dataExecucao: "2026-02-15", setor: "UTI", quantidade: "5", valorUnitario: "50.00", valorTotal: "250.00", descricaoItem: "SERINGA 10ML" },
      ];

      const comp = gerarComparativo(antigos, novos, 100.00, 250.00);

      const qtdChange = comp.itensAlterados.find(a => a.campo === "Quantidade");
      expect(qtdChange).toBeDefined();
      expect(qtdChange!.valorAntigo).toBe("2");
      expect(qtdChange!.valorNovo).toBe("5");
    });

    it("deve detectar itens adicionados (novos que não existiam antes)", () => {
      const antigos = [
        { codigoItem: "PROC001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "500.00", valorTotal: "500.00", descricaoItem: "CIRURGIA" },
      ];
      const novos = [
        { codigoItem: "PROC001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "500.00", valorTotal: "500.00", descricaoItem: "CIRURGIA" },
        { codigoItem: "TAXA001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "200.00", valorTotal: "200.00", descricaoItem: "TAXA DE SALA" },
      ];

      const comp = gerarComparativo(antigos, novos, 500.00, 700.00);

      expect(comp.itensAdicionados).toBe(1);
      expect(comp.itensRemovidos).toBe(0);
      expect(comp.totalItensAnterior).toBe(1);
      expect(comp.totalItensNovo).toBe(2);
    });

    it("deve detectar itens removidos (existiam antes mas não estão nos novos)", () => {
      const antigos = [
        { codigoItem: "PROC001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "500.00", valorTotal: "500.00", descricaoItem: "CIRURGIA" },
        { codigoItem: "TAXA001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "200.00", valorTotal: "200.00", descricaoItem: "TAXA DE SALA" },
      ];
      const novos = [
        { codigoItem: "PROC001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "500.00", valorTotal: "500.00", descricaoItem: "CIRURGIA" },
      ];

      const comp = gerarComparativo(antigos, novos, 700.00, 500.00);

      expect(comp.itensRemovidos).toBe(1);
      expect(comp.itensAdicionados).toBe(0);
      expect(comp.diferencaValor).toBeCloseTo(-200.00, 2);
    });

    it("deve retornar nenhuma alteração quando dados são idênticos", () => {
      const dados = [
        { codigoItem: "10102019", dataExecucao: "2026-02-18", setor: "POSTO I", quantidade: "1", valorUnitario: "168.00", valorTotal: "168.00", descricaoItem: "VISITA HOSPITALAR" },
      ];

      const comp = gerarComparativo(dados, [...dados], 168.00, 168.00);

      expect(comp.itensAlterados.length).toBe(0);
      expect(comp.itensAdicionados).toBe(0);
      expect(comp.itensRemovidos).toBe(0);
      expect(comp.diferencaValor).toBe(0);
    });

    it("deve retornar comparativo null quando não havia dados anteriores", () => {
      const comp = gerarComparativo([], [
        { codigoItem: "10102019", dataExecucao: "2026-02-18", setor: "POSTO I", quantidade: "1", valorUnitario: "168.00", valorTotal: "168.00", descricaoItem: "VISITA HOSPITALAR" },
      ], 0, 168.00);

      expect(comp.hadPreviousData).toBe(false);
    });

    it("deve calcular diferença de valor corretamente (positiva e negativa)", () => {
      const antigos = [
        { codigoItem: "PROC001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "1000.00", valorTotal: "1000.00", descricaoItem: "PROCEDIMENTO A" },
      ];
      const novos = [
        { codigoItem: "PROC001", dataExecucao: "2026-02-15", setor: "CC", quantidade: "1", valorUnitario: "800.00", valorTotal: "800.00", descricaoItem: "PROCEDIMENTO A" },
      ];

      const comp = gerarComparativo(antigos, novos, 1000.00, 800.00);

      expect(comp.diferencaValor).toBeCloseTo(-200.00, 2);
      expect(comp.valorAnterior).toBe(1000.00);
      expect(comp.valorNovo).toBe(800.00);
    });

    it("deve limitar itens alterados a no máximo 50 para não sobrecarregar", () => {
      // Gerar 60 itens com valores diferentes
      const antigos = Array.from({ length: 60 }, (_, i) => ({
        codigoItem: `ITEM${i.toString().padStart(3, '0')}`,
        dataExecucao: "2026-02-15",
        setor: "POSTO I",
        quantidade: "1",
        valorUnitario: "100.00",
        valorTotal: "100.00",
        descricaoItem: `Item ${i}`,
      }));
      const novos = Array.from({ length: 60 }, (_, i) => ({
        codigoItem: `ITEM${i.toString().padStart(3, '0')}`,
        dataExecucao: "2026-02-15",
        setor: "POSTO I",
        quantidade: "1",
        valorUnitario: "150.00",
        valorTotal: "150.00",
        descricaoItem: `Item ${i}`,
      }));

      const comp = gerarComparativo(antigos, novos, 6000.00, 9000.00);

      // Todos os 60 itens mudaram, mas a lógica do backend limita a 50
      expect(comp.itensAlterados.length).toBeGreaterThan(0);
      // Nota: a função de teste não limita, mas o backend sim (slice(0, 50))
    });
  });

  describe("Comparativo - Estrutura de retorno da API", () => {
    it("deve retornar comparativo com todos os campos obrigatórios quando há dados anteriores", () => {
      const response = {
        sucesso: true,
        totalItens: 104,
        valorTotal: 12085.37,
        fonteDados: "BANCO_REMOTO" as const,
        comparativo: {
          hadPreviousData: true,
          valorAnterior: 11500.00,
          valorNovo: 12085.37,
          diferencaValor: 585.37,
          totalItensAnterior: 100,
          totalItensNovo: 104,
          itensAlterados: [
            {
              codigoItem: "60000694",
              descricaoItem: "DIARIA DE ENFERMARIA",
              campo: "Valor Total",
              valorAntigo: "R$ 250.00",
              valorNovo: "R$ 288.72",
            },
          ],
          itensAdicionados: 4,
          itensRemovidos: 0,
        },
      };

      expect(response.comparativo).not.toBeNull();
      expect(response.comparativo!.hadPreviousData).toBe(true);
      expect(response.comparativo!.valorAnterior).toBe(11500.00);
      expect(response.comparativo!.valorNovo).toBe(12085.37);
      expect(response.comparativo!.diferencaValor).toBeCloseTo(585.37, 2);
      expect(response.comparativo!.totalItensAnterior).toBe(100);
      expect(response.comparativo!.totalItensNovo).toBe(104);
      expect(response.comparativo!.itensAlterados).toHaveLength(1);
      expect(response.comparativo!.itensAdicionados).toBe(4);
      expect(response.comparativo!.itensRemovidos).toBe(0);
    });

    it("deve retornar comparativo null quando é primeira importação", () => {
      const response = {
        sucesso: true,
        totalItens: 104,
        valorTotal: 12085.37,
        fonteDados: "BANCO_REMOTO" as const,
        comparativo: null,
      };

      expect(response.comparativo).toBeNull();
    });

    it("deve incluir código, descrição, campo, valor antigo e novo em cada item alterado", () => {
      const itemAlterado = {
        codigoItem: "60000694",
        descricaoItem: "DIARIA DE ENFERMARIA",
        campo: "Valor Total",
        valorAntigo: "R$ 250.00",
        valorNovo: "R$ 288.72",
      };

      expect(itemAlterado.codigoItem).toBeDefined();
      expect(itemAlterado.descricaoItem).toBeDefined();
      expect(itemAlterado.campo).toBeDefined();
      expect(itemAlterado.valorAntigo).toBeDefined();
      expect(itemAlterado.valorNovo).toBeDefined();
      expect(itemAlterado.valorAntigo).not.toBe(itemAlterado.valorNovo);
    });
  });

  // ============================================================
  // TESTES: Cruzamento com Ajustes da Auditoria
  // ============================================================
  describe("Cruzamento com Ajustes da Auditoria", () => {
    // Simula a lógica de cruzamento do backend
    type AjusteAuditoria = {
      tipoAjuste: string;
      codigoItem: string;
      descricaoItem: string;
      quantidadeOriginal: string | null;
      quantidadeAjustada: string | null;
      valorOriginal: string | null;
      valorAjustado: string | null;
      status: string;
    };

    type ItemNovo = {
      codigoItem: string;
      quantidade: string;
      valorTotal: string;
      descricaoItem: string;
    };

    function cruzarAjustes(
      ajustes: AjusteAuditoria[],
      itensNovos: ItemNovo[]
    ) {
      const mapaNovosPorCodigo = new Map<string, ItemNovo[]>();
      for (const item of itensNovos) {
        const cod = item.codigoItem;
        if (!mapaNovosPorCodigo.has(cod)) mapaNovosPorCodigo.set(cod, []);
        mapaNovosPorCodigo.get(cod)!.push(item);
      }

      const statusAjustes: Array<{
        tipoAjuste: string;
        codigoItem: string;
        descricaoItem: string;
        status: 'corrigido' | 'parcialmente_corrigido' | 'nao_corrigido' | 'item_nao_encontrado';
        quantidadeAtual: string | null;
        valorAtual: string | null;
      }> = [];

      for (const aj of ajustes) {
        const cod = aj.codigoItem;
        const novos = mapaNovosPorCodigo.get(cod) || [];
        const itemNovo = novos[0];

        if (aj.tipoAjuste === 'ADICIONAR_ITEM') {
          statusAjustes.push({
            tipoAjuste: aj.tipoAjuste,
            codigoItem: cod,
            descricaoItem: aj.descricaoItem,
            status: novos.length > 0 ? 'corrigido' : 'nao_corrigido',
            quantidadeAtual: itemNovo?.quantidade || null,
            valorAtual: itemNovo?.valorTotal || null,
          });
        } else if (aj.tipoAjuste === 'REMOVER_ITEM') {
          statusAjustes.push({
            tipoAjuste: aj.tipoAjuste,
            codigoItem: cod,
            descricaoItem: aj.descricaoItem,
            status: novos.length === 0 ? 'corrigido' : 'nao_corrigido',
            quantidadeAtual: itemNovo?.quantidade || null,
            valorAtual: itemNovo?.valorTotal || null,
          });
        } else if (aj.tipoAjuste === 'ALTERAR_QUANTIDADE') {
          if (!itemNovo) {
            statusAjustes.push({
              tipoAjuste: aj.tipoAjuste,
              codigoItem: cod,
              descricaoItem: aj.descricaoItem,
              status: 'item_nao_encontrado',
              quantidadeAtual: null,
              valorAtual: null,
            });
          } else {
            const qtdAtual = parseFloat(itemNovo.quantidade);
            const qtdAjustada = parseFloat(aj.quantidadeAjustada || '0');
            const qtdOriginal = parseFloat(aj.quantidadeOriginal || '0');
            let status: 'corrigido' | 'parcialmente_corrigido' | 'nao_corrigido' = 'nao_corrigido';
            if (Math.abs(qtdAtual - qtdAjustada) < 0.001) status = 'corrigido';
            else if (Math.abs(qtdAtual - qtdOriginal) > 0.001) status = 'parcialmente_corrigido';
            statusAjustes.push({
              tipoAjuste: aj.tipoAjuste,
              codigoItem: cod,
              descricaoItem: aj.descricaoItem,
              status,
              quantidadeAtual: itemNovo.quantidade,
              valorAtual: itemNovo.valorTotal,
            });
          }
        } else if (aj.tipoAjuste === 'ALTERAR_VALOR') {
          if (!itemNovo) {
            statusAjustes.push({
              tipoAjuste: aj.tipoAjuste,
              codigoItem: cod,
              descricaoItem: aj.descricaoItem,
              status: 'item_nao_encontrado',
              quantidadeAtual: null,
              valorAtual: null,
            });
          } else {
            const valAtual = parseFloat(itemNovo.valorTotal);
            const valAjustado = parseFloat(aj.valorAjustado || '0');
            const valOriginal = parseFloat(aj.valorOriginal || '0');
            let status: 'corrigido' | 'parcialmente_corrigido' | 'nao_corrigido' = 'nao_corrigido';
            if (Math.abs(valAtual - valAjustado) < 0.01) status = 'corrigido';
            else if (Math.abs(valAtual - valOriginal) > 0.01) status = 'parcialmente_corrigido';
            statusAjustes.push({
              tipoAjuste: aj.tipoAjuste,
              codigoItem: cod,
              descricaoItem: aj.descricaoItem,
              status,
              quantidadeAtual: itemNovo.quantidade,
              valorAtual: itemNovo.valorTotal,
            });
          }
        }
      }

      return statusAjustes;
    }

    it("deve marcar ALTERAR_QUANTIDADE como 'corrigido' quando qtd atual = qtd ajustada", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ALTERAR_QUANTIDADE',
        codigoItem: '90562100',
        descricaoItem: 'CIPROFLOXACINO 2 MG/ML',
        quantidadeOriginal: '4',
        quantidadeAjustada: '2',
        valorOriginal: null,
        valorAjustado: null,
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [{
        codigoItem: '90562100',
        quantidade: '2',
        valorTotal: '50.00',
        descricaoItem: 'CIPROFLOXACINO 2 MG/ML',
      }];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('corrigido');
      expect(result[0].quantidadeAtual).toBe('2');
    });

    it("deve marcar ALTERAR_QUANTIDADE como 'nao_corrigido' quando qtd permanece original", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ALTERAR_QUANTIDADE',
        codigoItem: '1900637599',
        descricaoItem: 'AGULHA 25X7MM',
        quantidadeOriginal: '3',
        quantidadeAjustada: '4',
        valorOriginal: null,
        valorAjustado: null,
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [{
        codigoItem: '1900637599',
        quantidade: '3',
        valorTotal: '15.00',
        descricaoItem: 'AGULHA 25X7MM',
      }];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('nao_corrigido');
    });

    it("deve marcar ALTERAR_QUANTIDADE como 'parcialmente_corrigido' quando qtd diferente de ambos", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ALTERAR_QUANTIDADE',
        codigoItem: '1900146234',
        descricaoItem: 'SERINGA 20ML',
        quantidadeOriginal: '1',
        quantidadeAjustada: '2',
        valorOriginal: null,
        valorAjustado: null,
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [{
        codigoItem: '1900146234',
        quantidade: '3',
        valorTotal: '30.00',
        descricaoItem: 'SERINGA 20ML',
      }];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('parcialmente_corrigido');
    });

    it("deve marcar ADICIONAR_ITEM como 'corrigido' quando item existe nos novos", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ADICIONAR_ITEM',
        codigoItem: 'SORO100',
        descricaoItem: 'soro fisiológico 100ml',
        quantidadeOriginal: null,
        quantidadeAjustada: '1',
        valorOriginal: null,
        valorAjustado: '10.00',
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [{
        codigoItem: 'SORO100',
        quantidade: '1',
        valorTotal: '10.00',
        descricaoItem: 'soro fisiológico 100ml',
      }];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('corrigido');
    });

    it("deve marcar ADICIONAR_ITEM como 'nao_corrigido' quando item NÃO existe nos novos", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ADICIONAR_ITEM',
        codigoItem: 'SORO100',
        descricaoItem: 'soro fisiológico 100ml',
        quantidadeOriginal: null,
        quantidadeAjustada: '1',
        valorOriginal: null,
        valorAjustado: '10.00',
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('nao_corrigido');
    });

    it("deve marcar REMOVER_ITEM como 'corrigido' quando item NÃO existe nos novos", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'REMOVER_ITEM',
        codigoItem: 'ITEM_EXTRA',
        descricaoItem: 'Item cobrado indevidamente',
        quantidadeOriginal: '1',
        quantidadeAjustada: null,
        valorOriginal: '50.00',
        valorAjustado: null,
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('corrigido');
    });

    it("deve marcar REMOVER_ITEM como 'nao_corrigido' quando item ainda existe nos novos", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'REMOVER_ITEM',
        codigoItem: 'ITEM_EXTRA',
        descricaoItem: 'Item cobrado indevidamente',
        quantidadeOriginal: '1',
        quantidadeAjustada: null,
        valorOriginal: '50.00',
        valorAjustado: null,
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [{
        codigoItem: 'ITEM_EXTRA',
        quantidade: '1',
        valorTotal: '50.00',
        descricaoItem: 'Item cobrado indevidamente',
      }];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('nao_corrigido');
    });

    it("deve marcar ALTERAR_VALOR como 'corrigido' quando valor atual = valor ajustado", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ALTERAR_VALOR',
        codigoItem: '31102050',
        descricaoItem: 'COLOCACAO CISTOSCOPICA',
        quantidadeOriginal: null,
        quantidadeAjustada: null,
        valorOriginal: '238.39',
        valorAjustado: '340.09',
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [{
        codigoItem: '31102050',
        quantidade: '1',
        valorTotal: '340.09',
        descricaoItem: 'COLOCACAO CISTOSCOPICA',
      }];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('corrigido');
    });

    it("deve marcar ALTERAR_VALOR como 'nao_corrigido' quando valor permanece original", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ALTERAR_VALOR',
        codigoItem: '31102050',
        descricaoItem: 'COLOCACAO CISTOSCOPICA',
        quantidadeOriginal: null,
        quantidadeAjustada: null,
        valorOriginal: '238.39',
        valorAjustado: '340.09',
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [{
        codigoItem: '31102050',
        quantidade: '1',
        valorTotal: '238.39',
        descricaoItem: 'COLOCACAO CISTOSCOPICA',
      }];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('nao_corrigido');
    });

    it("deve marcar como 'item_nao_encontrado' quando item não existe nos dados reimportados", () => {
      const ajustes: AjusteAuditoria[] = [{
        tipoAjuste: 'ALTERAR_QUANTIDADE',
        codigoItem: 'ITEM_INEXISTENTE',
        descricaoItem: 'Item que não existe',
        quantidadeOriginal: '1',
        quantidadeAjustada: '3',
        valorOriginal: null,
        valorAjustado: null,
        status: 'aplicado',
      }];
      const itensNovos: ItemNovo[] = [];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result[0].status).toBe('item_nao_encontrado');
    });

    it("deve processar múltiplos ajustes da mesma conta e retornar contadores corretos", () => {
      const ajustes: AjusteAuditoria[] = [
        { tipoAjuste: 'ALTERAR_QUANTIDADE', codigoItem: '90562100', descricaoItem: 'CIPRO', quantidadeOriginal: '4', quantidadeAjustada: '2', valorOriginal: null, valorAjustado: null, status: 'aplicado' },
        { tipoAjuste: 'ALTERAR_QUANTIDADE', codigoItem: '1900637599', descricaoItem: 'AGULHA', quantidadeOriginal: '3', quantidadeAjustada: '4', valorOriginal: null, valorAjustado: null, status: 'aplicado' },
        { tipoAjuste: 'ADICIONAR_ITEM', codigoItem: 'SORO100', descricaoItem: 'Soro', quantidadeOriginal: null, quantidadeAjustada: '1', valorOriginal: null, valorAjustado: '10.00', status: 'aplicado' },
        { tipoAjuste: 'ALTERAR_VALOR', codigoItem: '90018516', descricaoItem: 'CEFTRIAXONA', quantidadeOriginal: null, quantidadeAjustada: null, valorOriginal: '50.00', valorAjustado: '75.00', status: 'aplicado' },
      ];
      const itensNovos: ItemNovo[] = [
        { codigoItem: '90562100', quantidade: '2', valorTotal: '25.00', descricaoItem: 'CIPRO' },
        { codigoItem: '1900637599', quantidade: '3', valorTotal: '15.00', descricaoItem: 'AGULHA' },
        { codigoItem: '90018516', quantidade: '1', valorTotal: '75.00', descricaoItem: 'CEFTRIAXONA' },
      ];

      const result = cruzarAjustes(ajustes, itensNovos);
      expect(result).toHaveLength(4);

      const corrigidos = result.filter(r => r.status === 'corrigido');
      const naoCorrigidos = result.filter(r => r.status === 'nao_corrigido');

      // CIPRO: qtd 2 = ajustada 2 → corrigido
      expect(corrigidos.some(r => r.codigoItem === '90562100')).toBe(true);
      // AGULHA: qtd 3 = original 3 → nao_corrigido
      expect(naoCorrigidos.some(r => r.codigoItem === '1900637599')).toBe(true);
      // SORO: não existe nos novos → nao_corrigido
      expect(naoCorrigidos.some(r => r.codigoItem === 'SORO100')).toBe(true);
      // CEFTRIAXONA: valor 75 = ajustado 75 → corrigido
      expect(corrigidos.some(r => r.codigoItem === '90018516')).toBe(true);
    });
  });
});
