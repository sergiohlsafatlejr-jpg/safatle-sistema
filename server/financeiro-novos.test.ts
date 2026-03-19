import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ==================== CENTRO DE CUSTO ====================
describe("Centro de Custo", () => {
  it("deve validar input de criação de centro de custo", () => {
    const schema = z.object({
      nome: z.string().min(1),
      codigo: z.string().optional(),
      descricao: z.string().optional(),
      ativo: z.boolean().default(true),
    });

    const valid = schema.safeParse({ nome: "Administrativo", codigo: "ADM-001", ativo: true });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({ nome: "" });
    expect(invalid.success).toBe(false);
  });

  it("deve validar input de atualização de centro de custo", () => {
    const schema = z.object({
      id: z.number(),
      nome: z.string().min(1).optional(),
      codigo: z.string().optional(),
      descricao: z.string().optional(),
      ativo: z.boolean().optional(),
    });

    const valid = schema.safeParse({ id: 1, nome: "Operacional", ativo: false });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({ nome: "Sem ID" });
    expect(invalid.success).toBe(false);
  });
});

// ==================== IMPORTADOR EXCEL ====================
describe("Importador Excel", () => {
  it("deve validar input do importador de contas a pagar", () => {
    const itemSchema = z.object({
      descricao: z.string().min(1),
      valor: z.number().positive(),
      dataVencimento: z.string(),
      categoria: z.string().optional(),
      fornecedor: z.string().optional(),
      centroCusto: z.string().optional(),
    });

    const schema = z.object({
      tipo: z.enum(["pagar", "receber"]),
      itens: z.array(itemSchema).min(1),
    });

    const valid = schema.safeParse({
      tipo: "pagar",
      itens: [
        { descricao: "Aluguel", valor: 5000, dataVencimento: "2026-04-01" },
        { descricao: "Energia", valor: 1200, dataVencimento: "2026-04-05", categoria: "Utilidades" },
      ],
    });
    expect(valid.success).toBe(true);
    expect(valid.data?.itens).toHaveLength(2);

    const invalid = schema.safeParse({ tipo: "pagar", itens: [] });
    expect(invalid.success).toBe(false);
  });

  it("deve validar input do importador de contas a receber", () => {
    const itemSchema = z.object({
      descricao: z.string().min(1),
      valor: z.number().positive(),
      dataVencimento: z.string(),
      cliente: z.string().optional(),
      convenio: z.string().optional(),
    });

    const schema = z.object({
      tipo: z.enum(["pagar", "receber"]),
      itens: z.array(itemSchema).min(1),
    });

    const valid = schema.safeParse({
      tipo: "receber",
      itens: [
        { descricao: "Fatura Unimed", valor: 45000, dataVencimento: "2026-04-15", convenio: "Unimed" },
      ],
    });
    expect(valid.success).toBe(true);
  });

  it("deve rejeitar tipo inválido", () => {
    const schema = z.object({
      tipo: z.enum(["pagar", "receber"]),
      itens: z.array(z.any()).min(1),
    });

    const invalid = schema.safeParse({ tipo: "outro", itens: [{}] });
    expect(invalid.success).toBe(false);
  });
});

// ==================== BANCO INTER - BOLETOS ====================
describe("Banco Inter - Emissão de Boleto", () => {
  it("deve validar input de emissão de boleto", () => {
    const pagadorSchema = z.object({
      cpfCnpj: z.string(),
      tipoPessoa: z.enum(["FISICA", "JURIDICA"]),
      nome: z.string(),
      endereco: z.string(),
      bairro: z.string(),
      cidade: z.string(),
      uf: z.string().length(2),
      cep: z.string(),
      email: z.string().optional(),
      ddd: z.string().optional(),
      telefone: z.string().optional(),
      numero: z.string().optional(),
      complemento: z.string().optional(),
    });

    const schema = z.object({
      seuNumero: z.string().max(15),
      valorNominal: z.number().min(2.5).max(99999999.99),
      dataVencimento: z.string(),
      numDiasAgenda: z.number().int().min(0).max(60).default(30),
      pagador: pagadorSchema,
      multa: z.object({
        taxa: z.number(),
        codigo: z.enum(["PERCENTUAL", "VALORFIXO"]),
      }).optional(),
      mora: z.object({
        taxa: z.number(),
        codigo: z.enum(["TAXAMENSAL", "VALORFIXO"]),
      }).optional(),
      mensagem: z.object({
        linha1: z.string().optional(),
      }).optional(),
      formasRecebimento: z.array(z.enum(["BOLETO", "PIX"])).optional(),
    });

    const valid = schema.safeParse({
      seuNumero: "NF-001",
      valorNominal: 1500.50,
      dataVencimento: "2026-04-15",
      numDiasAgenda: 30,
      pagador: {
        cpfCnpj: "12345678901",
        tipoPessoa: "FISICA",
        nome: "João da Silva",
        endereco: "Rua Teste 123",
        bairro: "Centro",
        cidade: "São Paulo",
        uf: "SP",
        cep: "01001000",
      },
      multa: { taxa: 2, codigo: "PERCENTUAL" },
      mora: { taxa: 1, codigo: "TAXAMENSAL" },
      formasRecebimento: ["BOLETO", "PIX"],
    });
    expect(valid.success).toBe(true);
  });

  it("deve rejeitar boleto com valor abaixo do mínimo", () => {
    const schema = z.object({
      valorNominal: z.number().min(2.5).max(99999999.99),
    });

    const invalid = schema.safeParse({ valorNominal: 1.0 });
    expect(invalid.success).toBe(false);
  });

  it("deve rejeitar boleto com seuNumero maior que 15 caracteres", () => {
    const schema = z.object({
      seuNumero: z.string().max(15),
    });

    const invalid = schema.safeParse({ seuNumero: "1234567890123456" });
    expect(invalid.success).toBe(false);
  });

  it("deve rejeitar UF com tamanho diferente de 2", () => {
    const schema = z.object({
      uf: z.string().length(2),
    });

    const invalid1 = schema.safeParse({ uf: "S" });
    expect(invalid1.success).toBe(false);

    const invalid2 = schema.safeParse({ uf: "SPP" });
    expect(invalid2.success).toBe(false);

    const valid = schema.safeParse({ uf: "SP" });
    expect(valid.success).toBe(true);
  });
});

describe("Banco Inter - Consulta e Listagem de Boletos", () => {
  it("deve validar input de consulta de boleto", () => {
    const schema = z.object({ codigoSolicitacao: z.string() });

    const valid = schema.safeParse({ codigoSolicitacao: "abc-123-def" });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({});
    expect(invalid.success).toBe(false);
  });

  it("deve validar input de listagem de boletos", () => {
    const schema = z.object({
      dataInicial: z.string(),
      dataFinal: z.string(),
      situacao: z.string().optional(),
      pagina: z.number().optional(),
      itensPorPagina: z.number().optional(),
    });

    const valid = schema.safeParse({
      dataInicial: "2026-01-01",
      dataFinal: "2026-03-31",
      situacao: "A_RECEBER",
    });
    expect(valid.success).toBe(true);

    const validSemSituacao = schema.safeParse({
      dataInicial: "2026-01-01",
      dataFinal: "2026-03-31",
    });
    expect(validSemSituacao.success).toBe(true);
  });

  it("deve validar input de cancelamento de boleto", () => {
    const schema = z.object({
      codigoSolicitacao: z.string(),
      motivoCancelamento: z.string().max(50),
    });

    const valid = schema.safeParse({
      codigoSolicitacao: "abc-123",
      motivoCancelamento: "Pagamento por outra forma",
    });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({
      codigoSolicitacao: "abc-123",
      motivoCancelamento: "A".repeat(51),
    });
    expect(invalid.success).toBe(false);
  });
});

// ==================== PERMISSÕES SAFATLE ====================
describe("Permissões Safatle - Validação de Campos", () => {
  it("deve validar campos de permissões Safatle no upsert", () => {
    const schema = z.object({
      userId: z.number(),
      estabelecimentoId: z.number(),
      acessoPainelExecutivo: z.boolean().optional(),
      acessoVisaoGeral: z.boolean().optional(),
      acessoFinanceiro: z.boolean().optional(),
      acessoContratos: z.boolean().optional(),
      acessoPropostas: z.boolean().optional(),
      acessoAtendimentosConsolidados: z.boolean().optional(),
      acessoNfseConsolidado: z.boolean().optional(),
    });

    const valid = schema.safeParse({
      userId: 1,
      estabelecimentoId: 2160001,
      acessoPainelExecutivo: true,
      acessoVisaoGeral: true,
      acessoFinanceiro: false,
      acessoContratos: true,
      acessoPropostas: false,
    });
    expect(valid.success).toBe(true);
  });

  it("deve aceitar permissões parciais (apenas alguns módulos)", () => {
    const schema = z.object({
      userId: z.number(),
      estabelecimentoId: z.number(),
      acessoFinanceiro: z.boolean().optional(),
    });

    const valid = schema.safeParse({
      userId: 1,
      estabelecimentoId: 2160001,
      acessoFinanceiro: false,
    });
    expect(valid.success).toBe(true);
  });
});
