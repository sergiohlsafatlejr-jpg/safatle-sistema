import { describe, it, expect } from "vitest";
import { calcularDiasParadoUnificado } from "./atendimentosUnificados";

describe("atendimentosUnificados", () => {
  describe("calcularDiasParadoUnificado", () => {
    it("retorna 0 quando dataEntrada é null", () => {
      expect(calcularDiasParadoUnificado(null, null)).toBe(0);
    });

    it("retorna 0 quando dataEntrada é undefined", () => {
      expect(calcularDiasParadoUnificado(undefined, undefined)).toBe(0);
    });

    it("calcula dias corretamente entre duas datas", () => {
      const entrada = new Date("2025-01-01");
      const saida = new Date("2025-01-11");
      expect(calcularDiasParadoUnificado(entrada, saida)).toBe(10);
    });

    it("calcula dias corretamente com strings ISO", () => {
      const entrada = "2025-03-01T00:00:00.000Z";
      const saida = "2025-03-16T00:00:00.000Z";
      expect(calcularDiasParadoUnificado(entrada, saida)).toBe(15);
    });

    it("retorna dias até hoje quando dataSaida é null", () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 5);
      const dias = calcularDiasParadoUnificado(ontem, null);
      expect(dias).toBeGreaterThanOrEqual(4);
      expect(dias).toBeLessThanOrEqual(6);
    });

    it("nunca retorna valor negativo", () => {
      const futuro = new Date();
      futuro.setDate(futuro.getDate() + 10);
      expect(calcularDiasParadoUnificado(futuro, null)).toBe(0);
    });
  });

  describe("interface AtendimentoUnificado - novos campos Tasy", () => {
    it("deve ter os campos novos definidos no schema Drizzle", async () => {
      // Importar o schema para verificar que os novos campos existem
      const schema = await import("../drizzle/schema-integracao");
      const atendimentos = schema.atendimentos;
      
      // Verificar campos originais
      expect(atendimentos.numero_atendimento).toBeDefined();
      expect(atendimentos.convenio).toBeDefined();
      expect(atendimentos.paciente).toBeDefined();
      expect(atendimentos.data_entrada).toBeDefined();
      expect(atendimentos.data_saida).toBeDefined();
      expect(atendimentos.tipo_atendimento).toBeDefined();
      expect(atendimentos.origemSistema).toBeDefined();
      
      // Verificar novos campos Tasy
      expect(atendimentos.dsCategoria).toBeDefined();
      expect(atendimentos.dsPlano).toBeDefined();
      expect(atendimentos.competencia).toBeDefined();
      expect(atendimentos.referencia).toBeDefined();
      expect(atendimentos.protTasy).toBeDefined();
      expect(atendimentos.nomeProtocolo).toBeDefined();
      expect(atendimentos.protConv).toBeDefined();
      expect(atendimentos.dtEntrega).toBeDefined();
      expect(atendimentos.protStatus).toBeDefined();
      expect(atendimentos.titulo).toBeDefined();
      expect(atendimentos.dtTitulo).toBeDefined();
      expect(atendimentos.dataVencimento).toBeDefined();
      expect(atendimentos.dsSetorEntrada).toBeDefined();
      expect(atendimentos.dsSetorLeito).toBeDefined();
      expect(atendimentos.etapaConta).toBeDefined();
      expect(atendimentos.setorEtapa).toBeDefined();
      expect(atendimentos.dtEtapa).toBeDefined();
      expect(atendimentos.userEtapa).toBeDefined();
      expect(atendimentos.motivoDevolucao).toBeDefined();
      expect(atendimentos.conta).toBeDefined();
      expect(atendimentos.autorizacao).toBeDefined();
      expect(atendimentos.valorConta).toBeDefined();
      expect(atendimentos.matricula).toBeDefined();
      expect(atendimentos.sexo).toBeDefined();
      expect(atendimentos.idade).toBeDefined();
      expect(atendimentos.medicoResp).toBeDefined();
      expect(atendimentos.crm).toBeDefined();
      expect(atendimentos.dsMotivoAlta).toBeDefined();
      expect(atendimentos.dataInicio).toBeDefined();
      expect(atendimentos.dataFim).toBeDefined();
      expect(atendimentos.codServico).toBeDefined();
      expect(atendimentos.centroCusto).toBeDefined();
    });
  });
});
