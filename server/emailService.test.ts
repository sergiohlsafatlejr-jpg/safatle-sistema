import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ENV before importing emailService
vi.mock("./_core/env", () => ({
  ENV: {
    smtpHost: "smtp.test.com",
    smtpPort: "587",
    smtpUser: "test@test.com",
    smtpPass: "testpass",
    smtpFrom: "noreply@test.com",
  },
}));

// Mock nodemailer
const mockSendMail = vi.fn();
const mockVerify = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
      verify: mockVerify,
    })),
  },
}));

import { enviarEmail, gerarHtmlNotificacaoAtendimentos, verificarConexaoSMTP } from "./emailService";

describe("emailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("verificarConexaoSMTP", () => {
    it("deve retornar ok quando a conexão SMTP é válida", async () => {
      mockVerify.mockResolvedValueOnce(true);
      const result = await verificarConexaoSMTP();
      expect(result.ok).toBe(true);
    });

    it("deve retornar erro quando a conexão SMTP falha", async () => {
      mockVerify.mockRejectedValueOnce(new Error("Connection refused"));
      const result = await verificarConexaoSMTP();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Connection refused");
    });
  });

  describe("enviarEmail", () => {
    it("deve enviar e-mail com sucesso", async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: "test-123" });
      const result = await enviarEmail({
        destinatario: "dest@test.com",
        assunto: "Teste",
        conteudoHtml: "<p>Teste</p>",
        conteudoTexto: "Teste",
      });
      expect(result.ok).toBe(true);
      expect(result.messageId).toBe("test-123");
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "dest@test.com",
          subject: "Teste",
          html: "<p>Teste</p>",
        })
      );
    });

    it("deve retornar erro quando o envio falha", async () => {
      mockSendMail.mockRejectedValueOnce(new Error("SMTP timeout"));
      const result = await enviarEmail({
        destinatario: "dest@test.com",
        assunto: "Teste",
        conteudoHtml: "<p>Teste</p>",
      });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("SMTP timeout");
    });
  });

  describe("gerarHtmlNotificacaoAtendimentos", () => {
    it("deve gerar HTML com dados dos atendimentos", () => {
      const html = gerarHtmlNotificacaoAtendimentos({
        estabelecimentoNome: "Hospital Teste",
        totalAtendimentos: 2,
        atendimentos: [
          {
            paciente: "João Silva",
            numatend: "12345",
            tipoAtendimento: "INTERNACAO",
            plano: "Unimed",
            diasParado: 10,
            dataEntrada: "01/01/2026",
          },
          {
            paciente: "Maria Santos",
            numatend: "67890",
            tipoAtendimento: "EXAME",
            plano: "Bradesco",
            diasParado: 5,
            dataEntrada: "15/01/2026",
          },
        ],
      });

      expect(html).toContain("Hospital Teste");
      expect(html).toContain("João Silva");
      expect(html).toContain("12345");
      expect(html).toContain("Maria Santos");
      expect(html).toContain("67890");
      expect(html).toContain("Unimed");
      expect(html).toContain("Bradesco");
      expect(html).toContain("10 dias");
      expect(html).toContain("5 dias");
      expect(html).toContain("Total de atendimentos parados: <strong>2</strong>");
    });

    it("deve incluir mensagem personalizada quando fornecida", () => {
      const html = gerarHtmlNotificacaoAtendimentos({
        estabelecimentoNome: "Hospital Teste",
        totalAtendimentos: 1,
        atendimentos: [
          {
            paciente: "João Silva",
            numatend: "12345",
            tipoAtendimento: "INTERNACAO",
            plano: "Unimed",
            diasParado: 10,
            dataEntrada: "01/01/2026",
          },
        ],
        mensagemPersonalizada: "Urgente: verificar pendências",
      });

      expect(html).toContain("Urgente: verificar pendências");
    });

    it("não deve incluir bloco de mensagem personalizada quando não fornecida", () => {
      const html = gerarHtmlNotificacaoAtendimentos({
        estabelecimentoNome: "Hospital Teste",
        totalAtendimentos: 1,
        atendimentos: [
          {
            paciente: "João Silva",
            numatend: "12345",
            tipoAtendimento: "INTERNACAO",
            plano: "Unimed",
            diasParado: 10,
            dataEntrada: "01/01/2026",
          },
        ],
      });

      // Não deve ter o bloco de mensagem personalizada (que tem border-left: 4px solid #f59e0b)
      expect(html).not.toContain("border-left: 4px solid #f59e0b");
    });

    it("deve aplicar cores corretas baseado nos dias parados", () => {
      const html = gerarHtmlNotificacaoAtendimentos({
        estabelecimentoNome: "Hospital Teste",
        totalAtendimentos: 3,
        atendimentos: [
          {
            paciente: "Paciente A",
            numatend: "001",
            tipoAtendimento: "INTERNACAO",
            plano: "Plano A",
            diasParado: 35, // > 30 = vermelho
            dataEntrada: "01/01/2026",
          },
          {
            paciente: "Paciente B",
            numatend: "002",
            tipoAtendimento: "EXAME",
            plano: "Plano B",
            diasParado: 20, // > 15 = amarelo
            dataEntrada: "10/01/2026",
          },
          {
            paciente: "Paciente C",
            numatend: "003",
            tipoAtendimento: "AMBULATORIO",
            plano: "Plano C",
            diasParado: 5, // <= 15 = verde
            dataEntrada: "20/01/2026",
          },
        ],
      });

      // Vermelho para > 30 dias
      expect(html).toContain("#ef4444");
      // Amarelo para > 15 dias
      expect(html).toContain("#f59e0b");
      // Verde para <= 15 dias
      expect(html).toContain("#22c55e");
    });
  });
});
