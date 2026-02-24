import { describe, it, expect } from "vitest";
import { detectarMudancas, prepararCamposAtualizacao, calcularEstatisticasMerge } from "../db.merge";

describe("Merge Inteligente - Detecção de Mudanças", () => {
  describe("detectarMudancas", () => {
    it("deve detectar quando não há mudanças", () => {
      const registroAntigo = {
        id: 1,
        numero_atendimento: "12345",
        convenio: "Unimed",
        paciente: "João Silva",
      };

      const registroNovo = {
        numero_atendimento: "12345",
        convenio: "Unimed",
        paciente: "João Silva",
      };

      const resultado = detectarMudancas(registroAntigo, registroNovo);

      expect(resultado.temMudancas).toBe(false);
      expect(resultado.camposAlterados).toHaveLength(0);
    });

    it("deve detectar mudança em campo de texto", () => {
      const registroAntigo = {
        id: 1,
        convenio: "Unimed",
        paciente: "João Silva",
      };

      const registroNovo = {
        convenio: "Unimed",
        paciente: "João Santos",
      };

      const resultado = detectarMudancas(registroAntigo, registroNovo);

      expect(resultado.temMudancas).toBe(true);
      expect(resultado.camposAlterados).toContain("paciente");
      expect(resultado.valoresAntigos["paciente"]).toBe("João Silva");
      expect(resultado.valoresNovos["paciente"]).toBe("João Santos");
    });

    it("deve detectar mudança em campo de data", () => {
      const data1 = new Date("2026-02-24");
      const data2 = new Date("2026-02-25");

      const registroAntigo = {
        id: 1,
        data_entrada: data1,
      };

      const registroNovo = {
        data_entrada: data2,
      };

      const resultado = detectarMudancas(registroAntigo, registroNovo);

      expect(resultado.temMudancas).toBe(true);
      expect(resultado.camposAlterados).toContain("data_entrada");
    });

    it("deve ignorar campos especificados", () => {
      const registroAntigo = {
        id: 1,
        numero_atendimento: "12345",
        criadoEm: new Date("2026-02-20"),
      };

      const registroNovo = {
        numero_atendimento: "12345",
        criadoEm: new Date("2026-02-24"),
      };

      const resultado = detectarMudancas(registroAntigo, registroNovo, [
        "id",
        "criadoEm",
      ]);

      expect(resultado.temMudancas).toBe(false);
      expect(resultado.camposAlterados).not.toContain("criadoEm");
    });

    it("deve comparar strings normalizadas (trim e lowercase)", () => {
      const registroAntigo = {
        id: 1,
        convenio: "  UNIMED  ",
      };

      const registroNovo = {
        convenio: "unimed",
      };

      const resultado = detectarMudancas(registroAntigo, registroNovo);

      expect(resultado.temMudancas).toBe(false);
    });

    it("deve tratar null e undefined como iguais", () => {
      const registroAntigo = {
        id: 1,
        codigo_saida: null,
      };

      const registroNovo = {
        codigo_saida: undefined,
      };

      const resultado = detectarMudancas(registroAntigo, registroNovo);

      expect(resultado.temMudancas).toBe(false);
    });

    it("deve detectar múltiplas mudanças", () => {
      const registroAntigo = {
        id: 1,
        numero_atendimento: "12345",
        convenio: "Unimed",
        paciente: "João Silva",
        tipo_atendimento: "Consulta",
      };

      const registroNovo = {
        numero_atendimento: "12345",
        convenio: "Bradesco",
        paciente: "João Santos",
        tipo_atendimento: "Internação",
      };

      const resultado = detectarMudancas(registroAntigo, registroNovo);

      expect(resultado.temMudancas).toBe(true);
      expect(resultado.camposAlterados).toHaveLength(3);
      expect(resultado.camposAlterados).toContain("convenio");
      expect(resultado.camposAlterados).toContain("paciente");
      expect(resultado.camposAlterados).toContain("tipo_atendimento");
    });
  });

  describe("prepararCamposAtualizacao", () => {
    it("deve retornar apenas campos que mudaram", () => {
      const registroAntigo = {
        id: 1,
        numero_atendimento: "12345",
        convenio: "Unimed",
        paciente: "João Silva",
      };

      const registroNovo = {
        numero_atendimento: "12345",
        convenio: "Bradesco",
        paciente: "João Silva",
      };

      const atualizacoes = prepararCamposAtualizacao(
        registroAntigo,
        registroNovo
      );

      expect(atualizacoes).toHaveProperty("convenio");
      expect(atualizacoes).not.toHaveProperty("numero_atendimento");
      expect(atualizacoes).not.toHaveProperty("paciente");
      expect(atualizacoes).toHaveProperty("atualizadoEm");
    });

    it("deve sempre incluir timestamp de atualização", () => {
      const registroAntigo = {
        id: 1,
        numero_atendimento: "12345",
      };

      const registroNovo = {
        numero_atendimento: "12345",
      };

      const atualizacoes = prepararCamposAtualizacao(
        registroAntigo,
        registroNovo
      );

      expect(atualizacoes).toHaveProperty("atualizadoEm");
      expect(atualizacoes.atualizadoEm).toBeInstanceOf(Date);
    });

    it("deve ignorar campos especificados", () => {
      const registroAntigo = {
        id: 1,
        numero_atendimento: "12345",
        criadoEm: new Date("2026-02-20"),
      };

      const registroNovo = {
        numero_atendimento: "54321",
        criadoEm: new Date("2026-02-24"),
      };

      const atualizacoes = prepararCamposAtualizacao(
        registroAntigo,
        registroNovo,
        ["id", "criadoEm"]
      );

      expect(atualizacoes).toHaveProperty("numero_atendimento");
      expect(atualizacoes).not.toHaveProperty("criadoEm");
    });
  });

  describe("calcularEstatisticasMerge", () => {
    it("deve calcular estatísticas corretas", () => {
      const resultados = [
        {
          acao: "criado" as const,
          registroId: 1,
          camposAlterados: [],
        },
        {
          acao: "criado" as const,
          registroId: 2,
          camposAlterados: [],
        },
        {
          acao: "atualizado" as const,
          registroId: 3,
          camposAlterados: ["convenio", "paciente"],
        },
        {
          acao: "sem_alteracao" as const,
          registroId: 4,
          camposAlterados: [],
        },
      ];

      const stats = calcularEstatisticasMerge(resultados);

      expect(stats.total).toBe(4);
      expect(stats.criados).toBe(2);
      expect(stats.atualizados).toBe(1);
      expect(stats.semAlteracao).toBe(1);
    });

    it("deve contar frequência de campos alterados", () => {
      const resultados = [
        {
          acao: "atualizado" as const,
          registroId: 1,
          camposAlterados: ["convenio", "paciente"],
        },
        {
          acao: "atualizado" as const,
          registroId: 2,
          camposAlterados: ["convenio", "tipo_atendimento"],
        },
        {
          acao: "atualizado" as const,
          registroId: 3,
          camposAlterados: ["paciente"],
        },
      ];

      const stats = calcularEstatisticasMerge(resultados);

      expect(stats.camposAlteradosFrequencia["convenio"]).toBe(2);
      expect(stats.camposAlteradosFrequencia["paciente"]).toBe(2);
      expect(stats.camposAlteradosFrequencia["tipo_atendimento"]).toBe(1);
    });
  });

  describe("Cenários de Merge Completos", () => {
    it("deve simular merge com registros novos e atualizados", () => {
      const registrosAntigos = [
        {
          id: 1,
          origemId: "1-1",
          numero_atendimento: "12345",
          convenio: "Unimed",
          paciente: "João Silva",
        },
        {
          id: 2,
          origemId: "1-2",
          numero_atendimento: "12346",
          convenio: "Bradesco",
          paciente: "Maria Santos",
        },
      ];

      const registrosNovos = [
        {
          origemId: "1-1",
          numero_atendimento: "12345",
          convenio: "Unimed",
          paciente: "João Silva", // Sem mudanças
        },
        {
          origemId: "1-2",
          numero_atendimento: "12346",
          convenio: "Bradesco",
          paciente: "Maria Silva", // Mudou paciente
        },
        {
          origemId: "1-3",
          numero_atendimento: "12347",
          convenio: "Amil",
          paciente: "Pedro Costa", // Novo registro
        },
      ];

      let criados = 0;
      let atualizados = 0;
      let semAlteracao = 0;

      for (const registroNovo of registrosNovos) {
        const registroExistente = registrosAntigos.find(
          (r) => r.origemId === registroNovo.origemId
        );

        if (!registroExistente) {
          criados++;
        } else {
          const { temMudancas } = detectarMudancas(registroExistente, {
            numero_atendimento: registroNovo.numero_atendimento,
            convenio: registroNovo.convenio,
            paciente: registroNovo.paciente,
          });

          if (temMudancas) {
            atualizados++;
          } else {
            semAlteracao++;
          }
        }
      }

      expect(criados).toBe(1);
      expect(atualizados).toBe(1);
      expect(semAlteracao).toBe(1);
    });
  });
});
