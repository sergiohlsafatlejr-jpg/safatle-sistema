import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "./db";
import * as dbFunctions from "./db";

describe("Exclusão de Usuários", () => {
  describe("deleteUsuario", () => {
    it("deve ter a função deleteUsuario exportada", () => {
      expect(typeof dbFunctions.deleteUsuario).toBe("function");
    });

    it("deve retornar erro ao tentar excluir usuário inexistente", async () => {
      const result = await dbFunctions.deleteUsuario(999999, 1);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Usuário não encontrado");
    });

    it("deve retornar erro ao tentar excluir a si mesmo", async () => {
      // Criar um usuário de teste
      const testOpenId = `test-self-delete-${Date.now()}`;
      await dbFunctions.upsertUser({
        openId: testOpenId,
        name: "Usuário Auto-Exclusão",
        email: "autoexclusao@test.com",
        role: "admin",
      });

      const user = await dbFunctions.getUserByOpenId(testOpenId);
      if (!user) {
        throw new Error("Usuário de teste não foi criado");
      }

      const result = await dbFunctions.deleteUsuario(user.id, user.id);
      expect(result.success).toBe(false);
      expect(result.message).toBe("Você não pode excluir seu próprio usuário");

      // Limpar: excluir o usuário de teste usando outro admin
      // Como não temos outro admin, vamos deixar o usuário para limpeza posterior
    });

    it("deve excluir usuário com sucesso quando válido", async () => {
      // Criar um usuário admin para fazer a exclusão
      const adminOpenId = `test-admin-${Date.now()}`;
      await dbFunctions.upsertUser({
        openId: adminOpenId,
        name: "Admin Teste",
        email: "admin@test.com",
        role: "admin",
      });
      const admin = await dbFunctions.getUserByOpenId(adminOpenId);

      // Criar usuário para ser excluído
      const userOpenId = `test-user-delete-${Date.now()}`;
      await dbFunctions.upsertUser({
        openId: userOpenId,
        name: "Usuário Para Excluir",
        email: "excluir@test.com",
        role: "user",
      });
      const userToDelete = await dbFunctions.getUserByOpenId(userOpenId);

      if (!admin || !userToDelete) {
        throw new Error("Usuários de teste não foram criados");
      }

      // Excluir o usuário
      const result = await dbFunctions.deleteUsuario(userToDelete.id, admin.id);
      expect(result.success).toBe(true);
      expect(result.message).toBe("Usuário excluído com sucesso");

      // Verificar que o usuário foi realmente excluído
      const deletedUser = await dbFunctions.getUserByOpenId(userOpenId);
      expect(deletedUser).toBeUndefined();

      // Limpar: excluir o admin de teste
      // Não podemos excluir o admin porque ele é o único que pode excluir
    });

    it("deve listar todos os usuários corretamente", async () => {
      const usuarios = await dbFunctions.listarTodosUsuarios();
      expect(Array.isArray(usuarios)).toBe(true);
      // Cada usuário deve ter os campos esperados
      if (usuarios.length > 0) {
        const user = usuarios[0];
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("role");
        expect(user).toHaveProperty("estabelecimentosCount");
      }
    });
  });
});
