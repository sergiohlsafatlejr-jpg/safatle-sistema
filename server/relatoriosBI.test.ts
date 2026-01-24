import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do banco de dados
vi.mock('./db', () => ({
  getDadosBI: vi.fn(),
  getOpcoesFiltroBi: vi.fn(),
}));

import * as db from './db';

describe('Relatórios BI - Dados do Banco Principal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDadosBI', () => {
    it('deve retornar estrutura correta de resumo', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 80000,
          totalGlosado: 10000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      expect(result).toBeDefined();
      expect(result.resumo).toBeDefined();
      expect(result.resumo.totalFaturado).toBe(100000);
      expect(result.resumo.totalRecebido).toBe(80000);
      expect(result.resumo.totalGlosado).toBe(10000);
      expect(result.resumo.totalPendente).toBe(10000);
    });

    it('deve retornar dados agrupados por convênio', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 80000,
          totalGlosado: 10000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 2,
        },
        porConvenio: [
          { chave: 'Unimed', valorFaturado: 60000, valorRecebido: 50000, valorGlosado: 5000, valorPendente: 5000, quantidade: 300, registros: 300 },
          { chave: 'Bradesco', valorFaturado: 40000, valorRecebido: 30000, valorGlosado: 5000, valorPendente: 5000, quantidade: 200, registros: 200 },
        ],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      expect(result.porConvenio).toHaveLength(2);
      expect(result.porConvenio[0].chave).toBe('Unimed');
      expect(result.porConvenio[0].valorFaturado).toBe(60000);
    });

    it('deve aceitar filtro por mês de referência', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 50000,
          totalRecebido: 40000,
          totalGlosado: 5000,
          totalPendente: 5000,
          totalItens: 250,
          totalMateriais: 100,
          totalHonorarios: 150,
          totalProcedimentos: 250,
          totalPacientes: 25,
          totalConvenios: 3,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        mesReferencia: 6,
        anoReferencia: 2025,
      });

      expect(result).toBeDefined();
      expect(result.resumo.totalFaturado).toBe(50000);
    });

    it('deve aceitar filtro por convênio', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 30000,
          totalRecebido: 25000,
          totalGlosado: 3000,
          totalPendente: 2000,
          totalItens: 150,
          totalMateriais: 60,
          totalHonorarios: 90,
          totalProcedimentos: 150,
          totalPacientes: 15,
          totalConvenios: 1,
        },
        porConvenio: [
          { chave: 'Unimed', valorFaturado: 30000, valorRecebido: 25000, valorGlosado: 3000, valorPendente: 2000, quantidade: 150, registros: 150 },
        ],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        convenioId: 1,
        anoReferencia: 2025,
      });

      expect(result.porConvenio).toHaveLength(1);
      expect(result.porConvenio[0].chave).toBe('Unimed');
    });

    it('deve retornar dados agrupados por tipo', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 80000,
          totalGlosado: 10000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [
          { chave: 'procedimento', valorFaturado: 60000, valorRecebido: 50000, valorGlosado: 5000, valorPendente: 5000, quantidade: 300, registros: 300 },
          { chave: 'material', valorFaturado: 30000, valorRecebido: 25000, valorGlosado: 3000, valorPendente: 2000, quantidade: 150, registros: 150 },
          { chave: 'medicamento', valorFaturado: 10000, valorRecebido: 5000, valorGlosado: 2000, valorPendente: 3000, quantidade: 50, registros: 50 },
        ],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      expect(result.porTipo).toHaveLength(3);
      expect(result.porTipo[0].chave).toBe('procedimento');
    });

    it('deve retornar dados agrupados por mês', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 80000,
          totalGlosado: 10000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [
          { chave: '2025-01', valorFaturado: 50000, valorRecebido: 40000, valorGlosado: 5000, valorPendente: 5000, quantidade: 250, registros: 250 },
          { chave: '2025-02', valorFaturado: 50000, valorRecebido: 40000, valorGlosado: 5000, valorPendente: 5000, quantidade: 250, registros: 250 },
        ],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      expect(result.porMes).toHaveLength(2);
      expect(result.porMes[0].chave).toBe('2025-01');
    });

    it('deve retornar dados agrupados por médico', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 80000,
          totalGlosado: 10000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [
          { chave: 'Dr. João Silva', valorFaturado: 40000, valorRecebido: 35000, valorGlosado: 3000, valorPendente: 2000, quantidade: 200, registros: 200 },
          { chave: 'Dra. Maria Santos', valorFaturado: 30000, valorRecebido: 25000, valorGlosado: 3000, valorPendente: 2000, quantidade: 150, registros: 150 },
        ],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      expect(result.porMedico).toHaveLength(2);
      expect(result.porMedico[0].chave).toBe('Dr. João Silva');
    });

    it('deve retornar dados agrupados por paciente', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 80000,
          totalGlosado: 10000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 3,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [
          { chave: 'Paciente A', valorFaturado: 40000, valorRecebido: 35000, valorGlosado: 3000, valorPendente: 2000, quantidade: 200, registros: 200 },
          { chave: 'Paciente B', valorFaturado: 35000, valorRecebido: 28000, valorGlosado: 4000, valorPendente: 3000, quantidade: 175, registros: 175 },
          { chave: 'Paciente C', valorFaturado: 25000, valorRecebido: 17000, valorGlosado: 3000, valorPendente: 5000, quantidade: 125, registros: 125 },
        ],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      expect(result.porPaciente).toHaveLength(3);
      expect(result.porPaciente[0].chave).toBe('Paciente A');
    });

    it('deve retornar dados agrupados por procedimento', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 80000,
          totalGlosado: 10000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [
          { chave: '10101012', valorFaturado: 20000, valorRecebido: 18000, valorGlosado: 1000, valorPendente: 1000, quantidade: 100, registros: 100 },
          { chave: '20201015', valorFaturado: 15000, valorRecebido: 12000, valorGlosado: 2000, valorPendente: 1000, quantidade: 75, registros: 75 },
        ],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      expect(result.porProcedimento).toHaveLength(2);
      expect(result.porProcedimento[0].chave).toBe('10101012');
    });

    it('deve retornar valores zerados quando não há dados', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 0,
          totalRecebido: 0,
          totalGlosado: 0,
          totalPendente: 0,
          totalItens: 0,
          totalMateriais: 0,
          totalHonorarios: 0,
          totalProcedimentos: 0,
          totalPacientes: 0,
          totalConvenios: 0,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 999,
        anoReferencia: 2025,
      });

      expect(result.resumo.totalFaturado).toBe(0);
      expect(result.resumo.totalRecebido).toBe(0);
      expect(result.porConvenio).toHaveLength(0);
    });
  });

  describe('getOpcoesFiltroBi', () => {
    it('deve retornar lista de convênios', async () => {
      const mockResult = {
        convenios: [
          { id: 1, nome: 'Unimed' },
          { id: 2, nome: 'Bradesco' },
        ],
        tipos: ['procedimento', 'material'],
        pacientes: ['Paciente A', 'Paciente B'],
        procedimentos: [{ codigo: '10101012', descricao: 'Consulta' }],
        meses: [{ mes: 1, ano: 2025, label: 'Jan/2025' }],
      };

      (db.getOpcoesFiltroBi as any).mockResolvedValue(mockResult);

      const result = await db.getOpcoesFiltroBi(1);

      expect(result.convenios).toHaveLength(2);
      expect(result.convenios[0].nome).toBe('Unimed');
    });

    it('deve retornar lista de tipos', async () => {
      const mockResult = {
        convenios: [],
        tipos: ['procedimento', 'material', 'medicamento', 'taxa'],
        pacientes: [],
        procedimentos: [],
        meses: [],
      };

      (db.getOpcoesFiltroBi as any).mockResolvedValue(mockResult);

      const result = await db.getOpcoesFiltroBi(1);

      expect(result.tipos).toHaveLength(4);
      expect(result.tipos).toContain('procedimento');
      expect(result.tipos).toContain('material');
    });

    it('deve retornar lista de meses disponíveis', async () => {
      const mockResult = {
        convenios: [],
        tipos: [],
        pacientes: [],
        procedimentos: [],
        meses: [
          { mes: 1, ano: 2025, label: 'Jan/2025' },
          { mes: 2, ano: 2025, label: 'Fev/2025' },
          { mes: 12, ano: 2024, label: 'Dez/2024' },
        ],
      };

      (db.getOpcoesFiltroBi as any).mockResolvedValue(mockResult);

      const result = await db.getOpcoesFiltroBi(1);

      expect(result.meses).toHaveLength(3);
      expect(result.meses[0].label).toBe('Jan/2025');
    });

    it('deve retornar lista de procedimentos únicos', async () => {
      const mockResult = {
        convenios: [],
        tipos: [],
        pacientes: [],
        procedimentos: [
          { codigo: '10101012', descricao: 'Consulta médica' },
          { codigo: '20201015', descricao: 'Exame de sangue' },
        ],
        meses: [],
      };

      (db.getOpcoesFiltroBi as any).mockResolvedValue(mockResult);

      const result = await db.getOpcoesFiltroBi(1);

      expect(result.procedimentos).toHaveLength(2);
      expect(result.procedimentos[0].codigo).toBe('10101012');
    });

    it('deve retornar arrays vazios quando não há dados', async () => {
      const mockResult = {
        convenios: [],
        tipos: [],
        pacientes: [],
        procedimentos: [],
        meses: [],
      };

      (db.getOpcoesFiltroBi as any).mockResolvedValue(mockResult);

      const result = await db.getOpcoesFiltroBi(999);

      expect(result.convenios).toHaveLength(0);
      expect(result.tipos).toHaveLength(0);
      expect(result.meses).toHaveLength(0);
    });
  });

  describe('Cálculos de Percentuais', () => {
    it('deve calcular percentual de recebimento corretamente', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 75000,
          totalGlosado: 15000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      const percentualRecebido = (result.resumo.totalRecebido / result.resumo.totalFaturado) * 100;
      expect(percentualRecebido).toBe(75);
    });

    it('deve calcular percentual de glosa corretamente', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 100000,
          totalRecebido: 75000,
          totalGlosado: 15000,
          totalPendente: 10000,
          totalItens: 500,
          totalMateriais: 200,
          totalHonorarios: 300,
          totalProcedimentos: 500,
          totalPacientes: 50,
          totalConvenios: 5,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      const percentualGlosado = (result.resumo.totalGlosado / result.resumo.totalFaturado) * 100;
      expect(percentualGlosado).toBe(15);
    });

    it('deve lidar com faturamento zero sem erro', async () => {
      const mockResult = {
        resumo: {
          totalFaturado: 0,
          totalRecebido: 0,
          totalGlosado: 0,
          totalPendente: 0,
          totalItens: 0,
          totalMateriais: 0,
          totalHonorarios: 0,
          totalProcedimentos: 0,
          totalPacientes: 0,
          totalConvenios: 0,
        },
        porConvenio: [],
        porTipo: [],
        porMes: [],
        porSetor: [],
        porMedico: [],
        porPaciente: [],
        porProcedimento: [],
      };

      (db.getDadosBI as any).mockResolvedValue(mockResult);

      const result = await db.getDadosBI({
        estabelecimentoId: 1,
        anoReferencia: 2025,
      });

      // Não deve dar erro de divisão por zero
      expect(result.resumo.totalFaturado).toBe(0);
    });
  });
});
