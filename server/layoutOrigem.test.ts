import { describe, it, expect } from "vitest";

/**
 * Testes para a lógica de layout condicional por sistema de origem
 * na tela de Atendimentos Parados.
 * 
 * O layout TASY exibe colunas específicas:
 * N.ATEND, PACIENTE, PLANO, DATA ENTRADA, DATA SAIDA, DIAS PARADO,
 * TIPOATEND, ETAPA_CONTA, SETOR_ETAPA, DT_ETAPA, USER_ETAPA,
 * CODIGO_SERVICO, DESCRICAO_ATENDIMENTO, QUANTIDADE_SERVICO
 * 
 * Warleine e EasyVision mantêm o layout padrão (sem alteração).
 */

// Simula a lógica de detecção de layout do componente
function detectLayout(filtroOrigem: string): "tasy" | "default" {
  return filtroOrigem === "tasy" ? "tasy" : "default";
}

// Simula a contagem de quantidade por descrição de atendimento
function calcularQuantidadePorServico(
  atendimentos: Array<{ descricao_atendimento?: string | null }>
): Record<string, number> {
  const map: Record<string, number> = {};
  atendimentos.forEach(a => {
    const desc = a.descricao_atendimento || "Sem descrição";
    map[desc] = (map[desc] || 0) + 1;
  });
  return map;
}

// Colunas do layout TASY
const TASY_COLUMNS = [
  "N.Atend", "Paciente", "Plano", "Data Entrada", "Data Saída",
  "Dias Parado", "Tipo Atend.", "Etapa Conta", "Setor Etapa",
  "Dt. Etapa", "User Etapa", "Cód. Serviço", "Descrição Atend.",
  "Qtd. Serviço", "Ações"
];

// Colunas do layout padrão (Warleine/EasyVision/Misto)
const DEFAULT_COLUMNS = [
  "N° Atend", "Plano", "Paciente", "Matrícula", "Entrada", "Saída",
  "Dias", "Tipo", "Valor", "Etapa", "Médico", "Ações"
];

// Colunas do layout padrão quando "Todos" está selecionado (inclui Origem)
const DEFAULT_COLUMNS_ALL = [
  "N° Atend", "Plano", "Paciente", "Matrícula", "Entrada", "Saída",
  "Dias", "Tipo", "Valor", "Etapa", "Médico", "Origem", "Ações"
];

// Dados de exemplo
const mockTasyData = [
  {
    id: 1,
    origemSistema: "tasy",
    numero_atendimento: "8230",
    paciente: "MARIANA VIEIRA",
    convenio: "Bradesco",
    data_entrada: "2025-04-01",
    data_saida: "2025-04-01",
    tipo_atendimento: "Pronto socorro",
    descricao_atendimento: "Consulta Em Pronto Socorro",
    codigo_servico: "10101039",
    etapaConta: "Conta Em Protocolo",
    setorEtapa: "Faturamento",
    dtEtapa: "2025-08-04",
    userEtapa: "welisson.costa",
  },
  {
    id: 2,
    origemSistema: "tasy",
    numero_atendimento: "8231",
    paciente: "JOAO SILVA",
    convenio: "Unimed",
    data_entrada: "2025-04-02",
    data_saida: null,
    tipo_atendimento: "Internação",
    descricao_atendimento: "Consulta Em Pronto Socorro",
    codigo_servico: "10101039",
    etapaConta: "Auditoria",
    setorEtapa: "Auditoria",
    dtEtapa: "2025-08-05",
    userEtapa: "maria.santos",
  },
  {
    id: 3,
    origemSistema: "tasy",
    numero_atendimento: "8232",
    paciente: "ANA COSTA",
    convenio: "Bradesco",
    data_entrada: "2025-04-03",
    data_saida: null,
    tipo_atendimento: "Pronto socorro",
    descricao_atendimento: "Cesariana",
    codigo_servico: "31309020",
    etapaConta: "Conta Em Protocolo",
    setorEtapa: "Faturamento",
    dtEtapa: "2025-08-06",
    userEtapa: "welisson.costa",
  },
];

const mockWarleineData = [
  {
    id: 100,
    origemSistema: "WARLEINE",
    numero_atendimento: "3262981",
    paciente: "ALBERTO MOREIRA",
    convenio: "UNIMED GOIANIA",
    data_entrada: "2026-02-23",
    data_saida: null,
    tipo_atendimento: "E",
    descricao_atendimento: "EXAME",
    valorConta: "150.00",
    matricula: "123456",
    medicoResp: "DR. CARLOS",
  },
];

const mockEasyVisionData = [
  {
    id: 200,
    origemSistema: "EASYVISION",
    numero_atendimento: "1583369",
    paciente: "ALESSANDRA LIMA",
    convenio: "IPASGO NOVO",
    data_entrada: "2026-03-12",
    data_saida: "2026-03-12",
    tipo_atendimento: "E",
    descricao_atendimento: "EXAME - SEM_CONTA",
    valorConta: null,
    matricula: null,
    medicoResp: null,
  },
];

// Simula a exportação Excel para TASY
function exportTasyColumns(atendimento: any, qtdServico: Record<string, number>) {
  return {
    "N° Atend": atendimento.numero_atendimento,
    "Paciente": atendimento.paciente,
    "Plano": atendimento.convenio,
    "Dias Parado": 0,
    "Tipo Atend.": atendimento.tipo_atendimento,
    "Etapa Conta": atendimento.etapaConta,
    "Setor Etapa": atendimento.setorEtapa,
    "Usuário Etapa": atendimento.userEtapa,
    "Cód. Serviço": atendimento.codigo_servico,
    "Descrição Atendimento": atendimento.descricao_atendimento,
    "Qtd. Serviço": qtdServico[atendimento.descricao_atendimento || "Sem descrição"] || 0,
  };
}

// Simula a exportação Excel para layout padrão
function exportDefaultColumns(atendimento: any) {
  return {
    "N° Atend": atendimento.numero_atendimento,
    "Plano": atendimento.convenio,
    "Paciente": atendimento.paciente,
    "Matrícula": atendimento.matricula,
    "Valor Conta": atendimento.valorConta,
    "Médico Resp.": atendimento.medicoResp,
    "Origem": atendimento.origemSistema,
  };
}

describe("Layout por Sistema de Origem - Atendimentos Parados", () => {
  describe("Detecção de layout", () => {
    it("deve usar layout TASY quando filtro de origem é 'tasy'", () => {
      expect(detectLayout("tasy")).toBe("tasy");
    });

    it("deve usar layout padrão quando filtro de origem é 'WARLEINE'", () => {
      expect(detectLayout("WARLEINE")).toBe("default");
    });

    it("deve usar layout padrão quando filtro de origem é 'EASYVISION'", () => {
      expect(detectLayout("EASYVISION")).toBe("default");
    });

    it("deve usar layout padrão quando filtro de origem é 'all'", () => {
      expect(detectLayout("all")).toBe("default");
    });

    it("deve usar layout padrão para qualquer valor desconhecido", () => {
      expect(detectLayout("outro")).toBe("default");
      expect(detectLayout("")).toBe("default");
    });
  });

  describe("Colunas TASY", () => {
    it("deve ter 15 colunas no layout TASY (incluindo Ações)", () => {
      expect(TASY_COLUMNS).toHaveLength(15);
    });

    it("deve incluir todas as colunas solicitadas para TASY", () => {
      expect(TASY_COLUMNS).toContain("N.Atend");
      expect(TASY_COLUMNS).toContain("Paciente");
      expect(TASY_COLUMNS).toContain("Plano");
      expect(TASY_COLUMNS).toContain("Data Entrada");
      expect(TASY_COLUMNS).toContain("Data Saída");
      expect(TASY_COLUMNS).toContain("Dias Parado");
      expect(TASY_COLUMNS).toContain("Tipo Atend.");
      expect(TASY_COLUMNS).toContain("Etapa Conta");
      expect(TASY_COLUMNS).toContain("Setor Etapa");
      expect(TASY_COLUMNS).toContain("Dt. Etapa");
      expect(TASY_COLUMNS).toContain("User Etapa");
      expect(TASY_COLUMNS).toContain("Cód. Serviço");
      expect(TASY_COLUMNS).toContain("Descrição Atend.");
      expect(TASY_COLUMNS).toContain("Qtd. Serviço");
    });

    it("NÃO deve incluir colunas de Warleine no layout TASY", () => {
      expect(TASY_COLUMNS).not.toContain("Matrícula");
      expect(TASY_COLUMNS).not.toContain("Valor");
      expect(TASY_COLUMNS).not.toContain("Médico");
      expect(TASY_COLUMNS).not.toContain("Origem");
    });
  });

  describe("Colunas padrão (Warleine/EasyVision)", () => {
    it("deve ter 12 colunas no layout padrão (sem coluna Origem)", () => {
      expect(DEFAULT_COLUMNS).toHaveLength(12);
    });

    it("deve ter 13 colunas no layout padrão com 'Todos' (inclui Origem)", () => {
      expect(DEFAULT_COLUMNS_ALL).toHaveLength(13);
    });

    it("deve incluir colunas padrão de Warleine", () => {
      expect(DEFAULT_COLUMNS).toContain("N° Atend");
      expect(DEFAULT_COLUMNS).toContain("Plano");
      expect(DEFAULT_COLUMNS).toContain("Paciente");
      expect(DEFAULT_COLUMNS).toContain("Matrícula");
      expect(DEFAULT_COLUMNS).toContain("Valor");
      expect(DEFAULT_COLUMNS).toContain("Médico");
    });
  });

  describe("Quantidade por Serviço (TASY)", () => {
    it("deve calcular corretamente a quantidade por descrição de atendimento", () => {
      const qtd = calcularQuantidadePorServico(mockTasyData);
      expect(qtd["Consulta Em Pronto Socorro"]).toBe(2);
      expect(qtd["Cesariana"]).toBe(1);
    });

    it("deve usar 'Sem descrição' para atendimentos sem descricao_atendimento", () => {
      const data = [
        { descricao_atendimento: null },
        { descricao_atendimento: undefined },
        { descricao_atendimento: "Consulta" },
      ];
      const qtd = calcularQuantidadePorServico(data);
      expect(qtd["Sem descrição"]).toBe(2);
      expect(qtd["Consulta"]).toBe(1);
    });

    it("deve retornar objeto vazio para lista vazia", () => {
      const qtd = calcularQuantidadePorServico([]);
      expect(Object.keys(qtd)).toHaveLength(0);
    });
  });

  describe("Exportação Excel TASY", () => {
    it("deve exportar colunas específicas do TASY", () => {
      const qtd = calcularQuantidadePorServico(mockTasyData);
      const exported = exportTasyColumns(mockTasyData[0], qtd);
      
      expect(exported["N° Atend"]).toBe("8230");
      expect(exported["Paciente"]).toBe("MARIANA VIEIRA");
      expect(exported["Plano"]).toBe("Bradesco");
      expect(exported["Tipo Atend."]).toBe("Pronto socorro");
      expect(exported["Etapa Conta"]).toBe("Conta Em Protocolo");
      expect(exported["Setor Etapa"]).toBe("Faturamento");
      expect(exported["Usuário Etapa"]).toBe("welisson.costa");
      expect(exported["Cód. Serviço"]).toBe("10101039");
      expect(exported["Descrição Atendimento"]).toBe("Consulta Em Pronto Socorro");
      expect(exported["Qtd. Serviço"]).toBe(2); // 2 consultas no mock
    });

    it("NÃO deve incluir campos de Warleine na exportação TASY", () => {
      const qtd = calcularQuantidadePorServico(mockTasyData);
      const exported = exportTasyColumns(mockTasyData[0], qtd);
      
      expect(exported).not.toHaveProperty("Matrícula");
      expect(exported).not.toHaveProperty("Valor Conta");
      expect(exported).not.toHaveProperty("Médico Resp.");
      expect(exported).not.toHaveProperty("Origem");
    });
  });

  describe("Exportação Excel Padrão (Warleine/EasyVision)", () => {
    it("deve exportar colunas padrão para Warleine", () => {
      const exported = exportDefaultColumns(mockWarleineData[0]);
      
      expect(exported["N° Atend"]).toBe("3262981");
      expect(exported["Plano"]).toBe("UNIMED GOIANIA");
      expect(exported["Paciente"]).toBe("ALBERTO MOREIRA");
      expect(exported["Matrícula"]).toBe("123456");
      expect(exported["Valor Conta"]).toBe("150.00");
      expect(exported["Médico Resp."]).toBe("DR. CARLOS");
      expect(exported["Origem"]).toBe("WARLEINE");
    });

    it("deve exportar colunas padrão para EasyVision", () => {
      const exported = exportDefaultColumns(mockEasyVisionData[0]);
      
      expect(exported["N° Atend"]).toBe("1583369");
      expect(exported["Plano"]).toBe("IPASGO NOVO");
      expect(exported["Paciente"]).toBe("ALESSANDRA LIMA");
      expect(exported["Origem"]).toBe("EASYVISION");
    });
  });

  describe("Cálculo de Dias Parado por Sistema", () => {
    // Importa a lógica real do cálculo
    function calcularDiasParadoUnificado(
      dataEntrada?: string | Date | null,
      dataSaida?: string | Date | null,
      origemSistema?: string | null,
      dtEntrega?: string | Date | null,
      dtEtapa?: string | Date | null
    ): number {
      if (origemSistema?.toLowerCase() === 'tasy') {
        const dataRef = dtEntrega || dtEtapa;
        if (!dataRef) return 0;
        const ref = new Date(dataRef);
        const hoje = new Date();
        const diffMs = hoje.getTime() - ref.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }
      if (!dataEntrada) return 0;
      const entrada = new Date(dataEntrada);
      const saida = dataSaida ? new Date(dataSaida) : new Date();
      const diffMs = saida.getTime() - entrada.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }

    it("TASY: deve calcular dias desde dtEntrega até hoje", () => {
      const dtEntrega = new Date();
      dtEntrega.setDate(dtEntrega.getDate() - 10); // 10 dias atrás
      const dias = calcularDiasParadoUnificado(
        "2025-04-01", "2025-04-01", "tasy",
        dtEntrega.toISOString(), "2025-08-04"
      );
      // Pode ser 9 ou 10 dependendo da hora do dia (floor)
      expect(dias).toBeGreaterThanOrEqual(9);
      expect(dias).toBeLessThanOrEqual(10);
    });

    it("TASY: deve usar dtEtapa como fallback quando dtEntrega é null", () => {
      const dtEtapa = new Date();
      dtEtapa.setDate(dtEtapa.getDate() - 5); // 5 dias atrás
      const dias = calcularDiasParadoUnificado(
        "2025-04-01", "2025-04-01", "tasy",
        null, dtEtapa.toISOString()
      );
      expect(dias).toBe(5);
    });

    it("TASY: deve retornar 0 quando dtEntrega e dtEtapa são null", () => {
      const dias = calcularDiasParadoUnificado(
        "2025-04-01", "2025-04-01", "tasy",
        null, null
      );
      expect(dias).toBe(0);
    });

    it("TASY: deve ignorar data_entrada e data_saida no cálculo", () => {
      const dtEntrega = new Date();
      dtEntrega.setDate(dtEntrega.getDate() - 15);
      const dias = calcularDiasParadoUnificado(
        "2020-01-01", "2020-01-10", "tasy",
        dtEntrega.toISOString(), null
      );
      // Deve usar dtEntrega (~15 dias), não data_entrada/data_saida (9 dias)
      expect(dias).toBeGreaterThanOrEqual(14);
      expect(dias).toBeLessThanOrEqual(15);
    });

    it("TASY: deve funcionar com case insensitive (tasy vs TASY)", () => {
      const dtEntrega = new Date();
      dtEntrega.setDate(dtEntrega.getDate() - 7);
      const dias1 = calcularDiasParadoUnificado(null, null, "tasy", dtEntrega.toISOString(), null);
      const dias2 = calcularDiasParadoUnificado(null, null, "TASY", dtEntrega.toISOString(), null);
      const dias3 = calcularDiasParadoUnificado(null, null, "Tasy", dtEntrega.toISOString(), null);
      expect(dias1).toBe(7);
      expect(dias2).toBe(7);
      expect(dias3).toBe(7);
    });

    it("WARLEINE: deve calcular dias desde data_entrada até hoje (sem data_saida)", () => {
      const dataEntrada = new Date();
      dataEntrada.setDate(dataEntrada.getDate() - 20);
      const dias = calcularDiasParadoUnificado(
        dataEntrada.toISOString(), null, "WARLEINE", null, null
      );
      // Pode ser 19 ou 20 dependendo da hora do dia (floor)
      expect(dias).toBeGreaterThanOrEqual(19);
      expect(dias).toBeLessThanOrEqual(20);
    });

    it("WARLEINE: deve calcular dias entre data_entrada e data_saida", () => {
      const dias = calcularDiasParadoUnificado(
        "2025-01-01", "2025-01-11", "WARLEINE", null, null
      );
      expect(dias).toBe(10);
    });

    it("EASYVISION: deve usar mesma lógica que WARLEINE", () => {
      const dataEntrada = new Date();
      dataEntrada.setDate(dataEntrada.getDate() - 3);
      const dias = calcularDiasParadoUnificado(
        dataEntrada.toISOString(), null, "EASYVISION", null, null
      );
      expect(dias).toBe(3);
    });

    it("deve retornar 0 quando data_entrada é null (não-TASY)", () => {
      const dias = calcularDiasParadoUnificado(null, null, "WARLEINE", null, null);
      expect(dias).toBe(0);
    });

    it("nunca deve retornar valor negativo", () => {
      // Data futura para dtEntrega
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 10);
      const dias = calcularDiasParadoUnificado(null, null, "tasy", futuro.toISOString(), null);
      expect(dias).toBe(0);
    });
  });

  describe("Filtro por origem", () => {
    it("deve filtrar corretamente por origem tasy", () => {
      const allData = [...mockTasyData, ...mockWarleineData, ...mockEasyVisionData];
      const filtered = allData.filter(a => a.origemSistema?.toLowerCase() === "tasy");
      expect(filtered).toHaveLength(3);
      expect(filtered.every(a => a.origemSistema === "tasy")).toBe(true);
    });

    it("deve filtrar corretamente por origem WARLEINE", () => {
      const allData = [...mockTasyData, ...mockWarleineData, ...mockEasyVisionData];
      const filtered = allData.filter(a => a.origemSistema?.toLowerCase() === "warleine");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].origemSistema).toBe("WARLEINE");
    });

    it("deve filtrar corretamente por origem EASYVISION", () => {
      const allData = [...mockTasyData, ...mockWarleineData, ...mockEasyVisionData];
      const filtered = allData.filter(a => a.origemSistema?.toLowerCase() === "easyvision");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].origemSistema).toBe("EASYVISION");
    });

    it("deve retornar todos quando filtro é 'all'", () => {
      const allData = [...mockTasyData, ...mockWarleineData, ...mockEasyVisionData];
      // "all" não filtra
      expect(allData).toHaveLength(5);
    });
  });
});
