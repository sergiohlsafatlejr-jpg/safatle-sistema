import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Trash2, Edit2, Search } from "lucide-react";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: "admin" | "user";
  estabelecimentos: string[];
  ativo: boolean;
}

export default function ConfiguracoesUsuarios() {
  const [searchTerm, setSearchTerm] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([
    {
      id: 1,
      nome: "Sergio Safatle",
      email: "sergiohlsafatlejr@gmail.com",
      role: "admin",
      estabelecimentos: ["Todos"],
      ativo: true,
    },
    {
      id: 2,
      nome: "João Silva",
      email: "joao@example.com",
      role: "user",
      estabelecimentos: ["Pronto Socorro Infantil"],
      ativo: true,
    },
  ]);

  const filteredUsuarios = usuarios.filter(u =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUsuario = (id: number) => {
    setUsuarios(usuarios.filter(u => u.id !== id));
    toast.success("Usuário removido com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Usuários e Permissões
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerencie usuários e suas permissões de acesso
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários do Sistema
              </CardTitle>
              <CardDescription>
                Total de {usuarios.length} usuários cadastrados
              </CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-3">
            {filteredUsuarios.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                Nenhum usuário encontrado
              </div>
            ) : (
              filteredUsuarios.map((usuario) => (
                <div
                  key={usuario.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {usuario.nome}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {usuario.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Badge
                        className={
                          usuario.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {usuario.role === "admin" ? "Administrador" : "Usuário"}
                      </Badge>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {usuario.estabelecimentos.join(", ")}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={() => handleDeleteUsuario(usuario.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grupos de Permissão</CardTitle>
          <CardDescription>
            Configure grupos de permissão para facilitar o gerenciamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { nome: "Administrador", permissoes: "Acesso total ao sistema" },
              { nome: "Gestor", permissoes: "Acesso a dashboards e relatórios" },
              { nome: "Operador", permissoes: "Acesso a funcionalidades básicas" },
            ].map((grupo) => (
              <div
                key={grupo.nome}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">
                    {grupo.nome}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {grupo.permissoes}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Editar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
