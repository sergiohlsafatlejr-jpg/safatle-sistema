import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryConfigForm } from "./QueryConfigForm";
import { trpc } from "@/lib/trpc";

// Mock do trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    integradorDados: {
      testarConexaoWarleine: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isLoading: false,
        })),
      },
      cadastrarQueryConfig: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isLoading: false,
        })),
      },
    },
  },
}));

const mockEstabelecimentos = [
  { id: 1, nome: "Pronto Socorro Infantil" },
  { id: 2, nome: "Maternidade Ela" },
];

describe("QueryConfigForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar o formulário com campos básicos", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    expect(screen.getByText("Cadastro de Query para Sincronização")).toBeInTheDocument();
    expect(screen.getByLabelText("Estabelecimento *")).toBeInTheDocument();
    expect(screen.getByLabelText("Sistema *")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de Dados *")).toBeInTheDocument();
  });

  it("deve renderizar campos de configuração de conexão", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    expect(screen.getByLabelText("Host *")).toBeInTheDocument();
    expect(screen.getByLabelText("Porta *")).toBeInTheDocument();
    expect(screen.getByLabelText("Banco de Dados *")).toBeInTheDocument();
    expect(screen.getByLabelText("Usuário *")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha *")).toBeInTheDocument();
  });

  it("deve renderizar campo de Query SQL", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    expect(screen.getByLabelText("Query *")).toBeInTheDocument();
  });

  it("deve renderizar botões de ação", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    expect(screen.getByRole("button", { name: /Testar Conexão/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar Configuração/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeInTheDocument();
  });

  it("deve preencher campos de conexão com valores padrão", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const hostInput = screen.getByDisplayValue("hup.safatle.net.br");
    const portInput = screen.getByDisplayValue("55333");
    const databaseInput = screen.getByDisplayValue("db1");
    const userInput = screen.getByDisplayValue("TI");

    expect(hostInput).toBeInTheDocument();
    expect(portInput).toBeInTheDocument();
    expect(databaseInput).toBeInTheDocument();
    expect(userInput).toBeInTheDocument();
  });

  it("deve permitir seleção de estabelecimento", async () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const select = screen.getByLabelText("Estabelecimento *");
    fireEvent.click(select);

    await waitFor(() => {
      expect(screen.getByText("Pronto Socorro Infantil")).toBeInTheDocument();
      expect(screen.getByText("Maternidade Ela")).toBeInTheDocument();
    });
  });

  it("deve permitir seleção de sistema", async () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const select = screen.getByLabelText("Sistema *");
    fireEvent.click(select);

    await waitFor(() => {
      expect(screen.getByText("WARLEINE (PostgreSQL)")).toBeInTheDocument();
      expect(screen.getByText("TASY (Oracle)")).toBeInTheDocument();
      expect(screen.getByText("OMNI (Firebird)")).toBeInTheDocument();
      expect(screen.getByText("GESTHOR (Firebird)")).toBeInTheDocument();
    });
  });

  it("deve permitir seleção de tipo de dados", async () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const select = screen.getByLabelText("Tipo de Dados *");
    fireEvent.click(select);

    await waitFor(() => {
      expect(screen.getByText("Atendimentos")).toBeInTheDocument();
      expect(screen.getByText("Faturamento")).toBeInTheDocument();
      expect(screen.getByText("Procedimentos")).toBeInTheDocument();
      expect(screen.getByText("Pacientes")).toBeInTheDocument();
    });
  });

  it("deve permitir seleção de frequência", async () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const select = screen.getByLabelText("Frequência de Sincronização");
    fireEvent.click(select);

    await waitFor(() => {
      expect(screen.getByText("Tempo Real")).toBeInTheDocument();
      expect(screen.getByText("1x ao Dia")).toBeInTheDocument();
      expect(screen.getByText("1x por Semana")).toBeInTheDocument();
    });
  });

  it("deve permitir preenchimento de descrição", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const descricaoInput = screen.getByPlaceholderText(
      "Ex: Query para sincronizar atendimentos dos últimos 30 dias"
    );

    fireEvent.change(descricaoInput, {
      target: { value: "Minha descrição" },
    });

    expect(descricaoInput).toHaveValue("Minha descrição");
  });

  it("deve permitir preenchimento de query SQL", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const queryInput = screen.getByPlaceholderText(
      "SELECT * FROM atendimentos WHERE data >= CURRENT_DATE - INTERVAL '60 days'"
    );

    fireEvent.change(queryInput, {
      target: { value: "SELECT * FROM atendimentos" },
    });

    expect(queryInput).toHaveValue("SELECT * FROM atendimentos");
  });

  it("deve permitir preenchimento de campos de conexão", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const hostInput = screen.getByPlaceholderText("hup.safatle.net.br");
    const portInput = screen.getByPlaceholderText("55333");
    const databaseInput = screen.getByPlaceholderText("db1");
    const userInput = screen.getByPlaceholderText("TI");
    const passwordInput = screen.getByPlaceholderText("••••••••");

    fireEvent.change(hostInput, { target: { value: "novo.host.com" } });
    fireEvent.change(portInput, { target: { value: "5432" } });
    fireEvent.change(databaseInput, { target: { value: "nova_db" } });
    fireEvent.change(userInput, { target: { value: "novo_user" } });
    fireEvent.change(passwordInput, { target: { value: "nova_senha" } });

    expect(hostInput).toHaveValue("novo.host.com");
    expect(portInput).toHaveValue(5432);
    expect(databaseInput).toHaveValue("nova_db");
    expect(userInput).toHaveValue("novo_user");
    expect(passwordInput).toHaveValue("nova_senha");
  });

  it("deve desabilitar botão de salvar até testar conexão", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    const salvarButton = screen.getByRole("button", { name: /Salvar Configuração/i });
    expect(salvarButton).toBeDisabled();
  });

  it("deve mostrar mensagem de aviso quando conexão não foi testada", () => {
    render(<QueryConfigForm estabelecimentos={mockEstabelecimentos} />);

    expect(
      screen.getByText(/Teste a conexão antes de salvar a configuração/i)
    ).toBeInTheDocument();
  });

  it("deve chamar onSuccess quando formulário é enviado com sucesso", async () => {
    const onSuccess = vi.fn();
    render(
      <QueryConfigForm estabelecimentos={mockEstabelecimentos} onSuccess={onSuccess} />
    );

    // TODO: Implementar teste completo de envio
  });

  it("deve aceitar dados iniciais", () => {
    const initialData = {
      estabelecimentoId: 1,
      sistema: "warleine" as const,
      tipoDados: "atendimentos" as const,
      querySql: "SELECT * FROM atendimentos",
      descricao: "Query de teste",
      frequencia: "tempo_real" as const,
    };

    render(
      <QueryConfigForm
        estabelecimentos={mockEstabelecimentos}
        initialData={initialData}
      />
    );

    const queryInput = screen.getByDisplayValue("SELECT * FROM atendimentos");
    expect(queryInput).toBeInTheDocument();
  });
});
