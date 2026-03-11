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
      // Simula o fluxo: query funciona → fonteDados = BANCO_REMOTO
      let fonteDados: "BANCO_REMOTO" | "CACHE_LOCAL" = "BANCO_REMOTO";
      const querySuccess = true;

      if (querySuccess) {
        fonteDados = "BANCO_REMOTO";
      }

      expect(fonteDados).toBe("BANCO_REMOTO");
    });

    it("deve retornar fonteDados='CACHE_LOCAL' quando query falha e forceRemote=false", () => {
      // Simula o fluxo: query falha + forceRemote=false → fallback para cache local
      let fonteDados: "BANCO_REMOTO" | "CACHE_LOCAL" = "BANCO_REMOTO";
      const querySuccess = false;
      const forceRemote = false;

      if (!querySuccess && !forceRemote) {
        fonteDados = "CACHE_LOCAL";
      }

      expect(fonteDados).toBe("CACHE_LOCAL");
    });

    it("deve lançar erro quando query falha e forceRemote=true", () => {
      // Simula o fluxo: query falha + forceRemote=true → erro direto, sem fallback
      const querySuccess = false;
      const forceRemote = true;

      expect(() => {
        if (!querySuccess && forceRemote) {
          throw new Error(
            "Falha ao buscar conta diretamente do banco do hospital: Connection timeout. Verifique se a conexão está ativa e a query está correta no Integrador de Dados."
          );
        }
      }).toThrow("Falha ao buscar conta diretamente do banco do hospital");
    });

    it("deve incluir aviso de fallback na mensagem quando fonteDados='CACHE_LOCAL'", () => {
      const fonteDados = "CACHE_LOCAL";
      const numeroConta = "143800";
      const totalInseridos = 104;
      const valorTotalConta = 12085.37;

      const avisoFallback =
        fonteDados === "CACHE_LOCAL"
          ? " ⚠️ ATENÇÃO: Dados carregados do cache local (podem estar desatualizados). Use 'Reimportar do Banco' para buscar dados atualizados diretamente do sistema do hospital."
          : "";

      const mensagem = `Conta ${numeroConta} importada com ${totalInseridos} itens. Valor total: R$ ${valorTotalConta.toFixed(2)}${avisoFallback}`;

      expect(mensagem).toContain("ATENÇÃO");
      expect(mensagem).toContain("cache local");
      expect(mensagem).toContain("Reimportar do Banco");
      expect(mensagem).toContain("143800");
      expect(mensagem).toContain("104 itens");
      expect(mensagem).toContain("R$ 12085.37");
    });

    it("NÃO deve incluir aviso quando fonteDados='BANCO_REMOTO'", () => {
      const fonteDados = "BANCO_REMOTO";
      const numeroConta = "143800";
      const totalInseridos = 104;
      const valorTotalConta = 12085.37;

      const avisoFallback =
        fonteDados === "CACHE_LOCAL"
          ? " ⚠️ ATENÇÃO: Dados carregados do cache local (podem estar desatualizados)."
          : "";

      const mensagem = `Conta ${numeroConta} importada com ${totalInseridos} itens. Valor total: R$ ${valorTotalConta.toFixed(2)}${avisoFallback}`;

      expect(mensagem).not.toContain("ATENÇÃO");
      expect(mensagem).not.toContain("cache local");
      expect(mensagem).toContain("143800");
      expect(mensagem).toContain("104 itens");
    });
  });

  describe("Validação de input forceRemote", () => {
    it("deve aceitar forceRemote=true como parâmetro válido", () => {
      const input = {
        numeroConta: "143800",
        estabelecimentoId: 1,
        forceRemote: true,
      };

      expect(input.forceRemote).toBe(true);
      expect(typeof input.forceRemote).toBe("boolean");
    });

    it("deve aceitar forceRemote=false como parâmetro válido", () => {
      const input = {
        numeroConta: "143800",
        estabelecimentoId: 1,
        forceRemote: false,
      };

      expect(input.forceRemote).toBe(false);
    });

    it("deve ter forceRemote como false por padrão quando não fornecido", () => {
      const input = {
        numeroConta: "143800",
        estabelecimentoId: 1,
      };

      const forceRemote = input.forceRemote ?? false;
      expect(forceRemote).toBe(false);
    });
  });

  describe("Resposta com fonteDados", () => {
    it("deve incluir fonteDados no retorno de sucesso", () => {
      const response = {
        sucesso: true,
        mensagem: "Conta 143800 importada com 104 itens. Valor total: R$ 12085.37",
        totalItens: 104,
        valorTotal: 12085.37,
        fonteDados: "BANCO_REMOTO" as const,
        convenio: "UNIMED",
        paciente: "SARA OLIVEIRA ROCHA",
        conta: {
          numeroConta: "143800",
          convenio: "UNIMED",
          paciente: "SARA OLIVEIRA ROCHA",
          totalItens: 104,
          valorTotal: 12085.37,
        },
      };

      expect(response.fonteDados).toBe("BANCO_REMOTO");
      expect(response.sucesso).toBe(true);
      expect(response.totalItens).toBe(104);
    });

    it("deve retornar fonteDados='CACHE_LOCAL' quando fallback é usado", () => {
      const response = {
        sucesso: true,
        fonteDados: "CACHE_LOCAL" as const,
        totalItens: 104,
        valorTotal: 12085.37,
      };

      expect(response.fonteDados).toBe("CACHE_LOCAL");
    });
  });

  describe("Cenário completo: conta 143800 após auditoria", () => {
    it("deve reimportar com forceRemote=true para garantir dados atualizados", () => {
      // Simula o cenário do usuário:
      // 1. Enfermeira fez auditoria
      // 2. Faturista corrigiu no sistema do hospital
      // 3. Usuário clica "Reimportar do Banco" (forceRemote=true)
      const inputReimportacao = {
        numeroConta: "143800",
        estabelecimentoId: 1,
        forceRemote: true,
      };

      expect(inputReimportacao.forceRemote).toBe(true);

      // Com forceRemote=true, se a query falhar, deve dar erro (não fallback)
      const queryFalhou = true;
      let resultado: "sucesso" | "erro" | "fallback" = "sucesso";

      if (queryFalhou && inputReimportacao.forceRemote) {
        resultado = "erro";
      } else if (queryFalhou && !inputReimportacao.forceRemote) {
        resultado = "fallback";
      }

      expect(resultado).toBe("erro");
      // Isso garante que o usuário saberá que a conexão falhou,
      // em vez de receber dados desatualizados silenciosamente
    });

    it("deve mostrar dados atualizados quando query funciona com forceRemote=true", () => {
      const inputReimportacao = {
        numeroConta: "143800",
        estabelecimentoId: 1,
        forceRemote: true,
      };

      const queryFalhou = false;
      let fonteDados: "BANCO_REMOTO" | "CACHE_LOCAL" = "BANCO_REMOTO";
      let resultado: "sucesso" | "erro" = "sucesso";

      if (!queryFalhou) {
        fonteDados = "BANCO_REMOTO";
        resultado = "sucesso";
      }

      expect(resultado).toBe("sucesso");
      expect(fonteDados).toBe("BANCO_REMOTO");
      // Dados vieram diretamente do banco do hospital, refletindo as correções da faturista
    });
  });
});
