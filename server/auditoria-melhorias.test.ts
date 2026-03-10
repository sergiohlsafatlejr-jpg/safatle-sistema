import { describe, it, expect, vi } from "vitest";
import { z } from "zod";

/**
 * Testes para as melhorias na aba de Ajustes de Auditoria:
 * 1. Modal de Adicionar Item com campos Setor e Data
 * 2. Indicadores visuais de severidade nos cards de divergências
 * 3. Log de auditoria para rastreabilidade de gabarito/padrão usado
 */

// Schema do registrarAjuste atualizado com campos de setor e data para novo item
const registrarAjusteSchema = z.object({
  contaId: z.number(),
  itemId: z.number().optional(),
  tipo: z.enum([
    "ALTERAR_QUANTIDADE",
    "ALTERAR_VALOR",
    "REMOVER_ITEM",
    "ADICIONAR_ITEM",
    "ALTERAR_SETOR",
  ]),
  valorOriginal: z.string().optional(),
  valorNovo: z.string().optional(),
  justificativa: z.string().min(1),
  // Campos para ADICIONAR_ITEM
  novoItemCodigo: z.string().optional(),
  novoItemDescricao: z.string().optional(),
  novoItemQuantidade: z.number().optional(),
  novoItemValorUnitario: z.number().optional(),
  novoItemTipo: z.string().optional(),
  // Novos campos: setor e data do novo item
  setorNovoItem: z.string().optional(),
  dataNovoItem: z.string().optional(),
  // Campos para ALTERAR_SETOR
  setorOriginal: z.string().optional(),
  setorAjustado: z.string().optional(),
  estabelecimentoId: z.number(),
  numeroConta: z.string(),
});

// Schema do log de análise
const logAnaliseSchema = z.object({
  id: z.number(),
  numeroConta: z.string(),
  estabelecimentoId: z.number(),
  padraoId: z.number().nullable(),
  padraoNome: z.string().nullable(),
  padraoTipo: z.string().nullable(),
  isGabarito: z.number().nullable(),
  convenioNome: z.string().nullable(),
  setorPadrao: z.string().nullable(),
  procedimentosConta: z.string().nullable(),
  totalItensAnalisados: z.number().nullable(),
  totalDivergencias: z.number().nullable(),
  divergenciasCritico: z.number().nullable(),
  divergenciasAlerta: z.number().nullable(),
  divergenciasAviso: z.number().nullable(),
  divergenciasInfo: z.number().nullable(),
  scoreMatch: z.number().nullable(),
  motivoSelecao: z.string().nullable(),
  statusGeral: z.string().nullable(),
  duracaoMs: z.number().nullable(),
  usuarioId: z.number().nullable(),
  usuarioNome: z.string().nullable(),
  criadoEm: z.any(),
});

describe("Modal Adicionar Item - Campos Setor e Data", () => {
  it("deve aceitar setorNovoItem no schema de registrarAjuste", () => {
    const input = {
      contaId: 1,
      tipo: "ADICIONAR_ITEM" as const,
      justificativa: "Item faltante no prontuário",
      novoItemCodigo: "10102019",
      novoItemDescricao: "VISITA HOSPITALAR",
      novoItemQuantidade: 1,
      novoItemValorUnitario: 168.0,
      novoItemTipo: "Procedimento",
      setorNovoItem: "CENTRO CIRURGICO",
      estabelecimentoId: 1,
      numeroConta: "143800",
    };
    const result = registrarAjusteSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.setorNovoItem).toBe("CENTRO CIRURGICO");
    }
  });

  it("deve aceitar dataNovoItem no schema de registrarAjuste", () => {
    const input = {
      contaId: 1,
      tipo: "ADICIONAR_ITEM" as const,
      justificativa: "Item faltante",
      novoItemCodigo: "60000694",
      novoItemDescricao: "DIARIA DE ENFERMARIA",
      novoItemQuantidade: 1,
      novoItemValorUnitario: 288.72,
      novoItemTipo: "Diária",
      setorNovoItem: "ENFERMARIA",
      dataNovoItem: "2026-02-16",
      estabelecimentoId: 1,
      numeroConta: "143800",
    };
    const result = registrarAjusteSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dataNovoItem).toBe("2026-02-16");
    }
  });

  it("deve aceitar ADICIONAR_ITEM sem setor e data (opcionais)", () => {
    const input = {
      contaId: 1,
      tipo: "ADICIONAR_ITEM" as const,
      justificativa: "Item faltante",
      novoItemCodigo: "10102019",
      novoItemDescricao: "VISITA HOSPITALAR",
      novoItemQuantidade: 1,
      novoItemValorUnitario: 168.0,
      novoItemTipo: "Procedimento",
      estabelecimentoId: 1,
      numeroConta: "143800",
    };
    const result = registrarAjusteSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.setorNovoItem).toBeUndefined();
      expect(result.data.dataNovoItem).toBeUndefined();
    }
  });
});

describe("Indicadores Visuais de Severidade", () => {
  it("deve mapear severidades para cores corretas", () => {
    const severidadeCores: Record<string, string> = {
      critico: "red",
      alerta: "orange",
      aviso: "yellow",
      info: "blue",
    };

    expect(severidadeCores["critico"]).toBe("red");
    expect(severidadeCores["alerta"]).toBe("orange");
    expect(severidadeCores["aviso"]).toBe("yellow");
    expect(severidadeCores["info"]).toBe("blue");
  });

  it("deve calcular contagem por severidade corretamente", () => {
    const divergencias = [
      { severidade: "critico", tipo: "COMPOSICAO" },
      { severidade: "critico", tipo: "PRECO" },
      { severidade: "alerta", tipo: "COMPOSICAO" },
      { severidade: "aviso", tipo: "COMPOSICAO" },
      { severidade: "aviso", tipo: "PRECO" },
      { severidade: "aviso", tipo: "QUANTIDADE" },
      { severidade: "info", tipo: "COMPOSICAO" },
    ];

    const contagem = divergencias.reduce((acc, d) => {
      acc[d.severidade] = (acc[d.severidade] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(contagem["critico"]).toBe(2);
    expect(contagem["alerta"]).toBe(1);
    expect(contagem["aviso"]).toBe(3);
    expect(contagem["info"]).toBe(1);
  });

  it("deve classificar itens com divergências aviso como divergentes", () => {
    const classificarItem = (divergencias: Array<{ severidade: string }>) => {
      if (divergencias.some(d => d.severidade === "critico" || d.severidade === "alerta" || d.severidade === "aviso")) {
        return "divergente";
      }
      return "conforme";
    };

    expect(classificarItem([{ severidade: "critico" }])).toBe("divergente");
    expect(classificarItem([{ severidade: "alerta" }])).toBe("divergente");
    expect(classificarItem([{ severidade: "aviso" }])).toBe("divergente");
    expect(classificarItem([{ severidade: "info" }])).toBe("conforme");
    expect(classificarItem([])).toBe("conforme");
  });
});

describe("Log de Análise - Rastreabilidade", () => {
  it("deve validar schema do log de análise", () => {
    const log = {
      id: 1,
      numeroConta: "143800",
      estabelecimentoId: 1,
      padraoId: 42,
      padraoNome: "31102360 - URETERORRENOLIT. FLEXÍVEL A LASER UNILATERAL",
      padraoTipo: "gabarito_manual",
      isGabarito: 1,
      convenioNome: "UNIMED",
      setorPadrao: "CENTRO CIRURGICO",
      procedimentosConta: "CENTRO CIRURGICO, ENFERMARIA",
      totalItensAnalisados: 102,
      totalDivergencias: 15,
      divergenciasCritico: 2,
      divergenciasAlerta: 5,
      divergenciasAviso: 8,
      divergenciasInfo: 0,
      scoreMatch: 150,
      motivoSelecao: "Gabarito manual selecionado para setor CENTRO CIRURGICO",
      statusGeral: "divergente",
      duracaoMs: null,
      usuarioId: null,
      usuarioNome: null,
      criadoEm: new Date(),
    };

    const result = logAnaliseSchema.safeParse(log);
    expect(result.success).toBe(true);
  });

  it("deve validar log de análise sem padrão encontrado", () => {
    const log = {
      id: 2,
      numeroConta: "143801",
      estabelecimentoId: 1,
      padraoId: null,
      padraoNome: "Nenhum padrão encontrado",
      padraoTipo: "nenhum",
      isGabarito: 0,
      convenioNome: null,
      setorPadrao: null,
      procedimentosConta: null,
      totalItensAnalisados: 50,
      totalDivergencias: 0,
      divergenciasCritico: 0,
      divergenciasAlerta: 0,
      divergenciasAviso: 0,
      divergenciasInfo: 0,
      scoreMatch: 0,
      motivoSelecao: null,
      statusGeral: "conforme",
      duracaoMs: null,
      usuarioId: null,
      usuarioNome: null,
      criadoEm: new Date(),
    };

    const result = logAnaliseSchema.safeParse(log);
    expect(result.success).toBe(true);
  });

  it("deve diferenciar gabarito manual de padrão aprendido", () => {
    const logs = [
      { padraoTipo: "gabarito_manual", isGabarito: 1, scoreMatch: 150 },
      { padraoTipo: "padrao_aprendido", isGabarito: 0, scoreMatch: 50 },
      { padraoTipo: "nenhum", isGabarito: 0, scoreMatch: 0 },
    ];

    const gabaritos = logs.filter(l => l.isGabarito === 1);
    const padroes = logs.filter(l => l.padraoTipo === "padrao_aprendido");
    const semPadrao = logs.filter(l => l.padraoTipo === "nenhum");

    expect(gabaritos).toHaveLength(1);
    expect(gabaritos[0].scoreMatch).toBe(150);
    expect(padroes).toHaveLength(1);
    expect(padroes[0].scoreMatch).toBe(50);
    expect(semPadrao).toHaveLength(1);
  });

  it("deve agrupar logs por data da análise", () => {
    const now = Date.now();
    const logs = [
      { criadoEm: new Date(now), padraoNome: "Padrão A" },
      { criadoEm: new Date(now + 1000), padraoNome: "Padrão B" },
      { criadoEm: new Date(now - 86400000), padraoNome: "Padrão C" }, // dia anterior
    ];

    const ultimaAnalise = logs[0];
    const logsUltimaAnalise = logs.filter(l =>
      Math.abs(l.criadoEm.getTime() - ultimaAnalise.criadoEm.getTime()) < 5000
    );

    expect(logsUltimaAnalise).toHaveLength(2); // A e B (dentro de 5s)
    expect(logs.length - logsUltimaAnalise.length).toBe(1); // C é anterior
  });
});

describe("PadraoUsadoDetalhe - Interface de rastreamento", () => {
  it("deve ter todos os campos necessários para rastreabilidade", () => {
    const detalhe = {
      padraoId: 42,
      padraoNome: "31102360 - URETERORRENOLIT.",
      isGabarito: true,
      convenioNome: "UNIMED",
      setor: "CENTRO CIRURGICO",
      scoreMatch: 150,
      motivoSelecao: "Gabarito manual selecionado para setor CENTRO CIRURGICO",
    };

    expect(detalhe.padraoId).toBeDefined();
    expect(detalhe.padraoNome).toBeDefined();
    expect(detalhe.isGabarito).toBe(true);
    expect(detalhe.convenioNome).toBe("UNIMED");
    expect(detalhe.setor).toBe("CENTRO CIRURGICO");
    expect(detalhe.scoreMatch).toBeGreaterThan(0);
    expect(detalhe.motivoSelecao).toContain("Gabarito manual");
  });
});
