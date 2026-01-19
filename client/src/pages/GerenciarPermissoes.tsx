import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Shield,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export default function GerenciarPermissoes() {
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPermissao, setNewPermissao] = useState({
    userId: 0,
    podeVisualizar: "sim" as "sim" | "nao",
    podeEditar: "nao" as "sim" | "nao",
    podeExcluir: "nao" as "sim" | "nao",
    podeGerenciar: "nao" as "sim" | "nao",
  });

  // Verificar se é gestor
  const { data: isGestor, isLoading: loadingGestor } = trpc.permissoes.verificarGestor.useQuery();

  // Buscar estabelecimentos
  const { data: estabelecimentos, isLoading: loadingEstabelecimentos } = 
    trpc.estabelecimentos.list.useQuery({ ativo: "sim" });

  // Buscar usuários do estabelecimento selecionado
  const { data: usuarios, isLoading: loadingUsuarios, refetch: refetchUsuarios } = 
    trpc.permissoes.usuariosEstabelecimento.useQuery(
      { estabelecimentoId: selectedEstabelecimento! },
      { enabled: selectedEstabelecimento !== null && isGestor === true }
    );

  // Mutations
  const upsertPermissao = trpc.permissoes.upsertPermissao.useMutation({
    onSuccess: () => {
      toast.success("Permissão atualizada com sucesso!");
      refetchUsuarios();
      setShowAddDialog(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar permissão", {
        description: error.message,
      });
    },
  });

  const removerPermissao = trpc.permissoes.removerPermissao.useMutation({
    onSuccess: () => {
      toast.success("Permissão removida com sucesso!");
      refetchUsuarios();
    },
    onError: (error) => {
      toast.error("Erro ao remover permissão", {
        description: error.message,
      });
    },
  });

  const handleTogglePermissao = (
    userId: number, 
    tipo: "podeVisualizar" | "podeEditar" | "podeExcluir" | "podeGerenciar",
    valorAtual: "sim" | "nao"
  ) => {
    if (!selectedEstabelecimento) return;
    
    upsertPermissao.mutate({
      userId,
      estabelecimentoId: selectedEstabelecimento,
      [tipo]: valorAtual === "sim" ? "nao" : "sim",
    });
  };

  const handleRemoverPermissao = (userId: number) => {
    if (!selectedEstabelecimento) return;
    
    if (confirm("Tem certeza que deseja remover todas as permissões deste usuário para este estabelecimento?")) {
      removerPermissao.mutate({
        userId,
        estabelecimentoId: selectedEstabelecimento,
      });
    }
  };

  const handleAddPermissao = () => {
    if (!selectedEstabelecimento || !newPermissao.userId) return;
    
    upsertPermissao.mutate({
      ...newPermissao,
      estabelecimentoId: selectedEstabelecimento,
    });
  };

  if (loadingGestor || loadingEstabelecimentos) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!isGestor) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para gerenciar permissões de usuários. 
            Este recurso está disponível apenas para gestores e administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Gerenciar Permissões
        </h1>
        <p className="text-muted-foreground">
          Configure quais usuários podem acessar cada estabelecimento
        </p>
      </div>

      {/* Seleção de Estabelecimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecione o Estabelecimento
          </CardTitle>
          <CardDescription>
            Escolha um estabelecimento para gerenciar suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {estabelecimentos?.map((est) => (
              <div
                key={est.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedEstabelecimento === est.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "hover:border-primary/50 hover:bg-muted/50"
                }`}
                onClick={() => setSelectedEstabelecimento(est.id)}
              >
                <div className="flex items-center gap-3">
                  <Building2 className={`h-5 w-5 ${
                    selectedEstabelecimento === est.id ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <div>
                    <h3 className="font-semibold">{est.nome}</h3>
                    {est.cnpj && (
                      <p className="text-sm text-muted-foreground">CNPJ: {est.cnpj}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários com Permissões */}
      {selectedEstabelecimento && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários com Acesso
                </CardTitle>
                <CardDescription>
                  Gerencie as permissões de cada usuário para este estabelecimento
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Usuário
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsuarios ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : usuarios && usuarios.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-center">Visualizar</TableHead>
                    <TableHead className="text-center">Editar</TableHead>
                    <TableHead className="text-center">Excluir</TableHead>
                    <TableHead className="text-center">Gerenciar</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.userName || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.userRole === "admin" ? "default" : "secondary"}>
                          {user.userRole === "admin" ? "Administrador" : "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={user.podeVisualizar === "sim"}
                          onCheckedChange={() => handleTogglePermissao(
                            user.userId, 
                            "podeVisualizar", 
                            user.podeVisualizar
                          )}
                          disabled={user.userRole === "admin"}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={user.podeEditar === "sim"}
                          onCheckedChange={() => handleTogglePermissao(
                            user.userId, 
                            "podeEditar", 
                            user.podeEditar
                          )}
                          disabled={user.userRole === "admin"}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={user.podeExcluir === "sim"}
                          onCheckedChange={() => handleTogglePermissao(
                            user.userId, 
                            "podeExcluir", 
                            user.podeExcluir
                          )}
                          disabled={user.userRole === "admin"}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={user.podeGerenciar === "sim"}
                          onCheckedChange={() => handleTogglePermissao(
                            user.userId, 
                            "podeGerenciar", 
                            user.podeGerenciar
                          )}
                          disabled={user.userRole === "admin"}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoverPermissao(user.userId)}
                          disabled={user.userRole === "admin"}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário com permissões específicas para este estabelecimento.</p>
                <p className="text-sm">
                  Usuários sem permissões específicas terão acesso padrão a todos os estabelecimentos.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legenda de Permissões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legenda de Permissões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Visualizar</p>
                <p className="text-sm text-muted-foreground">
                  Permite ver arquivos, relatórios e dados do estabelecimento
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Edit className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Editar</p>
                <p className="text-sm text-muted-foreground">
                  Permite fazer upload de arquivos e editar dados
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">Excluir</p>
                <p className="text-sm text-muted-foreground">
                  Permite excluir arquivos e dados do estabelecimento
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Gerenciar</p>
                <p className="text-sm text-muted-foreground">
                  Permite gerenciar permissões de outros usuários (gestor)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para adicionar permissão */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Permissão de Usuário</DialogTitle>
            <DialogDescription>
              Configure as permissões para um novo usuário neste estabelecimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID do Usuário</Label>
              <Input
                type="number"
                placeholder="Digite o ID do usuário"
                value={newPermissao.userId || ""}
                onChange={(e) => setNewPermissao({
                  ...newPermissao,
                  userId: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                O ID do usuário pode ser encontrado na lista de usuários do sistema
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pode Visualizar</Label>
                <Switch
                  checked={newPermissao.podeVisualizar === "sim"}
                  onCheckedChange={(checked) => setNewPermissao({
                    ...newPermissao,
                    podeVisualizar: checked ? "sim" : "nao"
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Pode Editar</Label>
                <Switch
                  checked={newPermissao.podeEditar === "sim"}
                  onCheckedChange={(checked) => setNewPermissao({
                    ...newPermissao,
                    podeEditar: checked ? "sim" : "nao"
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Pode Excluir</Label>
                <Switch
                  checked={newPermissao.podeExcluir === "sim"}
                  onCheckedChange={(checked) => setNewPermissao({
                    ...newPermissao,
                    podeExcluir: checked ? "sim" : "nao"
                  })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Pode Gerenciar</Label>
                <Switch
                  checked={newPermissao.podeGerenciar === "sim"}
                  onCheckedChange={(checked) => setNewPermissao({
                    ...newPermissao,
                    podeGerenciar: checked ? "sim" : "nao"
                  })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddPermissao}
              disabled={!newPermissao.userId || upsertPermissao.isPending}
            >
              {upsertPermissao.isPending ? "Salvando..." : "Salvar Permissão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
