import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataSyncEngine, SyncConfig } from "./dataSyncEngine";
import { WarleineConnector } from "./connectors/WarleineConnector";

// Mock do WarleineConnector
vi.mock("./connectors/WarleineConnector");

describe("DataSyncEngine", () => {
  let engine: DataSyncEngine;

  beforeEach(() => {
    engine = new DataSyncEngine();
  });

  describe("Registrar Configurações", () => {
    it("deve registrar uma configuração de sincronização", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      engine.registrarConfig(config);
      const status = engine.getStatus();

      expect(status.totalConfigs).toBe(1);
      expect(status.configs[0].sistema).toBe("warleine");
    });

    it("deve registrar múltiplas configurações", () => {
      const configs: SyncConfig[] = [
        {
          sistema: "warleine",
          tipoDados: "atendimentos",
          estabelecimentoId: 1,
          querySql: "SELECT * FROM atendimentos",
          frequencia: "tempo_real",
        },
        {
          sistema: "warleine",
          tipoDados: "faturamento",
          estabelecimentoId: 1,
          querySql: "SELECT * FROM faturamento",
          frequencia: "1x_dia",
        },
      ];

      configs.forEach((config) => engine.registrarConfig(config));
      const status = engine.getStatus();

      expect(status.totalConfigs).toBe(2);
    });

    it("deve atualizar configuração existente", () => {
      const config1: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      const config2: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos WHERE data > NOW()",
        frequencia: "1x_dia",
      };

      engine.registrarConfig(config1);
      engine.registrarConfig(config2);
      const status = engine.getStatus();

      expect(status.totalConfigs).toBe(1);
    });
  });

  describe("Obter Status", () => {
    it("deve retornar status inicial vazio", () => {
      const status = engine.getStatus();

      expect(status.isRunning).toBe(false);
      expect(status.totalConfigs).toBe(0);
      expect(status.configs).toHaveLength(0);
    });

    it("deve retornar status com configurações registradas", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      engine.registrarConfig(config);
      const status = engine.getStatus();

      expect(status.totalConfigs).toBe(1);
      expect(status.configs[0]).toEqual({
        chave: "warleine_atendimentos_1",
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
      });
    });
  });

  describe("Sincronização", () => {
    it("deve retornar erro para sistema não implementado", async () => {
      const config: SyncConfig = {
        sistema: "tasy",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      const resultado = await engine.sincronizar(config);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.mensagem).toContain("não implementada");
    });

    it("deve retornar erro para sistema desconhecido", async () => {
      const config: SyncConfig = {
        sistema: "sistema_inexistente" as any,
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      const resultado = await engine.sincronizar(config);

      expect(resultado.sucesso).toBe(false);
      expect(resultado.mensagem).toContain("desconhecido");
    });

    it("deve retornar erro se sincronização já está em andamento", async () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      // Simula sincronização em andamento
      const promise1 = engine.sincronizar(config);
      const promise2 = engine.sincronizar(config);

      const resultado2 = await promise2;

      expect(resultado2.sucesso).toBe(false);
      expect(resultado2.mensagem).toContain("já em andamento");

      // Aguarda primeira promise
      await promise1;
    });
  });

  describe("Validação de Frequência", () => {
    it("deve aceitar frequência tempo_real", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar frequência 1x_dia", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "1x_dia",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar frequência 1x_semana", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "1x_semana",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });
  });

  describe("Validação de Tipo de Dados", () => {
    it("deve aceitar tipo atendimentos", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar tipo faturamento", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "faturamento",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM faturamento",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar tipo procedimentos", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "procedimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM procedimentos",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar tipo pacientes", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "pacientes",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM pacientes",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });
  });

  describe("Validação de Sistemas", () => {
    it("deve aceitar sistema warleine", () => {
      const config: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar sistema tasy", () => {
      const config: SyncConfig = {
        sistema: "tasy",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar sistema omni", () => {
      const config: SyncConfig = {
        sistema: "omni",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });

    it("deve aceitar sistema gesthor", () => {
      const config: SyncConfig = {
        sistema: "gesthor",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      expect(() => engine.registrarConfig(config)).not.toThrow();
    });
  });

  describe("Configuração por Estabelecimento", () => {
    it("deve registrar configurações para estabelecimentos diferentes", () => {
      const config1: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      const config2: SyncConfig = {
        sistema: "warleine",
        tipoDados: "atendimentos",
        estabelecimentoId: 2,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      engine.registrarConfig(config1);
      engine.registrarConfig(config2);
      const status = engine.getStatus();

      expect(status.totalConfigs).toBe(2);
      expect(status.configs[0].estabelecimentoId).toBe(1);
      expect(status.configs[1].estabelecimentoId).toBe(2);
    });
  });

  describe("Resultado de Sincronização", () => {
    it("deve retornar resultado com timestamp", async () => {
      const config: SyncConfig = {
        sistema: "tasy",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      const resultado = await engine.sincronizar(config);

      expect(resultado.timestamp).toBeInstanceOf(Date);
    });

    it("deve retornar resultado com duração", async () => {
      const config: SyncConfig = {
        sistema: "tasy",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      const resultado = await engine.sincronizar(config);

      expect(resultado.duracao).toBeGreaterThanOrEqual(0);
    });

    it("deve retornar resultado com mensagem", async () => {
      const config: SyncConfig = {
        sistema: "tasy",
        tipoDados: "atendimentos",
        estabelecimentoId: 1,
        querySql: "SELECT * FROM atendimentos",
        frequencia: "tempo_real",
      };

      const resultado = await engine.sincronizar(config);

      expect(resultado.mensagem).toBeDefined();
      expect(resultado.mensagem.length).toBeGreaterThan(0);
    });
  });
});
