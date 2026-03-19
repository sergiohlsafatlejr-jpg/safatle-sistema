import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@safatle.com",
    name: "Admin Safatle",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("financeiro.clientes", () => {
  const ctx = createAdminContext();
  const caller = appRouter.createCaller(ctx);
  let clienteId: number;

  it("cria um cliente com todos os campos de endereço e CNPJ Safatle", async () => {
    const result = await caller.financeiro.clientes.criar({
      nome: "Hospital Teste CEP",
      cnpj: "12.345.678/0001-99",
      email: "contato@hospitalteste.com",
      telefone: "(62) 3333-4444",
      valorContrato: "15000.00",
      cep: "74000-000",
      endereco: "Rua Teste",
      numero: "123",
      complemento: "Sala 5",
      bairro: "Centro",
      cidade: "Goiânia",
      uf: "GO",
      cnpjSafatle: "24.785.393/0001-54",
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
    clienteId = Number(result.id);
  });

  it("lista clientes e retorna os campos de endereço", async () => {
    const lista = await caller.financeiro.clientes.listar();
    const cliente = lista.find((c: any) => c.id === clienteId);
    expect(cliente).toBeDefined();
    expect(cliente!.nome).toBe("Hospital Teste CEP");
    expect(cliente!.cep).toBe("74000-000");
    expect(cliente!.endereco).toBe("Rua Teste");
    expect(cliente!.numero).toBe("123");
    expect(cliente!.complemento).toBe("Sala 5");
    expect(cliente!.bairro).toBe("Centro");
    expect(cliente!.cidade).toBe("Goiânia");
    expect(cliente!.uf).toBe("GO");
    expect(cliente!.cnpjSafatle).toBe("24.785.393/0001-54");
  });

  it("atualiza o endereço do cliente", async () => {
    const result = await caller.financeiro.clientes.atualizar({
      id: clienteId,
      nome: "Hospital Teste CEP Atualizado",
      cep: "74001-000",
      endereco: "Av. Goiás",
      numero: "456",
      complemento: "Andar 2",
      bairro: "Setor Central",
      cidade: "Goiânia",
      uf: "GO",
      cnpjSafatle: "24.785.393/0001-54",
    });
    expect(result).toEqual({ success: true });
  });

  it("verifica que a atualização foi persistida", async () => {
    const lista = await caller.financeiro.clientes.listar();
    const cliente = lista.find((c: any) => c.id === clienteId);
    expect(cliente).toBeDefined();
    expect(cliente!.nome).toBe("Hospital Teste CEP Atualizado");
    expect(cliente!.cep).toBe("74001-000");
    expect(cliente!.endereco).toBe("Av. Goiás");
    expect(cliente!.numero).toBe("456");
    expect(cliente!.complemento).toBe("Andar 2");
    expect(cliente!.bairro).toBe("Setor Central");
  });

  it("cria cliente com CNPJ Safatle padrão quando não informado", async () => {
    const result = await caller.financeiro.clientes.criar({
      nome: "Cliente Sem CNPJ Safatle",
    });
    expect(result).toHaveProperty("id");
    const lista = await caller.financeiro.clientes.listar();
    const cliente = lista.find((c: any) => c.id === Number(result.id));
    expect(cliente).toBeDefined();
    expect(cliente!.cnpjSafatle).toBe("24.785.393/0001-54");
    // Cleanup
    await caller.financeiro.clientes.excluir({ id: Number(result.id) });
  });

  it("exclui o cliente de teste", async () => {
    const result = await caller.financeiro.clientes.excluir({ id: clienteId });
    expect(result).toEqual({ success: true });
  });
});
