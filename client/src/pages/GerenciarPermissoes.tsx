import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Trash2,
  UserPlus,
  FileText,
  BarChart3,
  Settings,
  FolderOpen,
  GitCompare,
  DollarSign,
  BookOpen,
  AlertCircle,
  Briefcase,
  Eye,
  Edit,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

// Definição dos grupos de serviço
const GRUPOS_SERVICO = [
  { 
    value: "administrador", 
    label: "Administrador", 
    description: "Acesso total a todas as funcionalidades",
    icon: ShieldCheck,
    color: "bg-red-500"
  },
  { 
    value: "faturista", 
    label: "Faturista", 
    description: "Arquivos, Comparações, Faturamento, Tabelas de Preço",
    icon: FileText,
    color: "bg-blue-500"
  },
  { 
    value: "recurso_glosa", 
    label: "Recurso de Glosa", 
    description: "Análise de Glosa, Dicionário, Recursos",
    icon: AlertCircle,
    color: "bg-orange-500"
  },
  { 
    value: "gestor", 
    label: "Gestor", 
    description: "Dashboard, Relatórios, Produtividade",
    icon: BarChart3,
    color: "bg-green-500"
  },
  { 
    value: "visualizador", 
    label: "Visualizador", 
    description: "Apenas visualização (somente leitura)",
    icon: Eye,
    color: "bg-gray-500"
  },
];

// Definição dos módulos do sistema
const MODULOS = [
  { key: "acessoDashboard", label: "Dashboard", icon: BarChart3 },
  { key: "acessoArquivos", label: "Arquivos", icon: FolderOpen },
  { key: "acessoComparacoes", label: "Comparações", icon: GitCompare },
  { key: "acessoFaturamento", label: "Faturamento", icon: DollarSign },
  { key: "acessoTabelasPreco", label: "Tabelas de Preço", icon: FileText },
  { key: "acessoAnaliseGlosa", label: "Análise de Glosa", icon: AlertCircle },
  { key: "acessoDicionarioGlosas", label: "Dicionário de Glosas", icon: BookOpen },
  { key: "acessoRecursosGlosa", label: "Recursos de Glosa", icon: Briefcase },
  { key: "acessoConvenios", label: "Convênios", icon: Building2 },
  { key: "acessoRegrasNegocio", label: "Regras de Negócio", icon: Settings },
  { key: "acessoProdutividade", label: "Produtividade", icon: BarChart3 },
  { key: "acessoEstabelecimentos", label: "Estabelecimentos", icon: Building2 },
  { key: "acessoPermissoes", label: "Permissões", icon: Shield },
];

export default function GerenciarPermissoes() {
  const [selectedEstabelecimento, setSelectedEstabelecimento] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newPermissao, setNewPermissao] = useState({
    userId: 0,
    grupoServico: "visualizador" as "administrador" | "faturista" | "recurso_glosa" | "gestor" | "visualizador",
    podeVisualizar: "sim" as "sim" | "nao",
    podeEditar: "nao" as "sim" | "nao",
    podeExcluir: "nao" as "sim" | "nao",
    podeGerenciar: "nao" as "sim" | "nao",
    // Módulos
    acessoDashboard: "sim" as "sim" | "nao",
    acessoArquivos: "nao" as "sim" | "nao",
    acessoComparacoes: "nao" as "sim" | "nao",
    acessoFaturamento: "nao" as "sim" | "nao",
    acessoTabelasPreco: "nao" as "sim" | "nao",
    acessoAnaliseGlosa: "nao" as "sim" | "nao",
    acessoDicionarioGlosas: "nao" as "sim" | "nao",
    acessoRecursosGlosa: "nao" as "sim" | "nao",
    acessoConvenios: "nao" as "sim" | "nao",
    acessoRegrasNegocio: "nao" as "sim" | "nao",
    acessoProdutividade: "nao" as "sim" | "nao",
    acessoEstabelecimentos: "nao" as "sim" | "nao",
    acessoPermissoes: "nao" as "sim" | "nao",
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

  // Buscar todos os usuários do sistema
  const { data: todosUsuarios } = trpc.permissoes.listarUsuarios.useQuery(
    undefined,
    { enabled: isGestor === true }
  );

  // Mutations
  const upsertPermissao = trpc.permissoes.upsertPermissao.useMutation({
    onSuccess: () => {
      toast.success("Permissão atualizada com sucesso!");
      refetchUsuarios();
      setShowAddDialog(false);
      setShowEditDialog(false);
      setEditingUser(null);
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

  // Aplicar permissões padrão do grupo
  const aplicarPermissoesGrupo = (grupo: string) => {
    const permissoesPadrao: Record<string, "sim" | "nao"> = {
      acessoDashboard: "nao",
      acessoArquivos: "nao",
      acessoComparacoes: "nao",
      acessoFaturamento: "nao",
      acessoTabelasPreco: "nao",
      acessoAnaliseGlosa: "nao",
      acessoDicionarioGlosas: "nao",
      acessoRecursosGlosa: "nao",
      acessoConvenios: "nao",
      acessoRegrasNegocio: "nao",
      acessoProdutividade: "nao",
      acessoEstabelecimentos: "nao",
      acessoPermissoes: "nao",
    };

    switch (grupo) {
      case "administrador":
        Object.keys(permissoesPadrao).forEach(key => {
          permissoesPadrao[key] = "sim";
        });
        break;
      case "faturista":
        permissoesPadrao.acessoDashboard = "sim";
        permissoesPadrao.acessoArquivos = "sim";
        permissoesPadrao.acessoComparacoes = "sim";
        permissoesPadrao.acessoFaturamento = "sim";
        permissoesPadrao.acessoTabelasPreco = "sim";
        permissoesPadrao.acessoConvenios = "sim";
        permissoesPadrao.acessoRegrasNegocio = "sim";
        break;
      case "recurso_glosa":
        permissoesPadrao.acessoDashboard = "sim";
        permissoesPadrao.acessoAnaliseGlosa = "sim";
        permissoesPadrao.acessoDicionarioGlosas = "sim";
        permissoesPadrao.acessoRecursosGlosa = "sim";
        break;
      case "gestor":
        permissoesPadrao.acessoDashboard = "sim";
        permissoesPadrao.acessoFaturamento = "sim";
        permissoesPadrao.acessoAnaliseGlosa = "sim";
        permissoesPadrao.acessoProdutividade = "sim";
        break;
      case "visualizador":
      default:
        permissoesPadrao.acessoDashboard = "sim";
        break;
    }

    return permissoesPadrao;
  };

  // Atualizar permissões quando o grupo muda
  useEffect(() => {
    if (newPermissao.grupoServico) {
      const permissoes = aplicarPermissoesGrupo(newPermissao.grupoServico);
      setNewPermissao(prev => ({
        ...prev,
        ...permissoes,
        podeVisualizar: "sim",
        podeEditar: prev.grupoServico === "administrador" || prev.grupoServico === "faturista" ? "sim" : "nao",
        podeExcluir: prev.grupoServico === "administrador" ? "sim" : "nao",
        podeGerenciar: prev.grupoServico === "administrador" ? "sim" : "nao",
      }));
    }
  }, [newPermissao.grupoServico]);

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
    if (!selectedEstabelecimento || !newPermissao.userId) {
      toast.error("Selecione um usuário");
      return;
    }
    
    upsertPermissao.mutate({
      ...newPermissao,
      estabelecimentoId: selectedEstabelecimento,
    });
  };

  const handleEditPermissao = (user: any) => {
    setEditingUser(user);
    setNewPermissao({
      userId: user.userId,
      grupoServico: (user.grupoServico || "visualizador") as "administrador" | "faturista" | "recurso_glosa" | "gestor" | "visualizador",
      podeVisualizar: user.podeVisualizar || "sim",
      podeEditar: user.podeEditar || "nao",
      podeExcluir: user.podeExcluir || "nao",
      podeGerenciar: user.podeGerenciar || "nao",
      acessoDashboard: user.acessoDashboard || "sim",
      acessoArquivos: user.acessoArquivos || "nao",
      acessoComparacoes: user.acessoComparacoes || "nao",
      acessoFaturamento: user.acessoFaturamento || "nao",
      acessoTabelasPreco: user.acessoTabelasPreco || "nao",
      acessoAnaliseGlosa: user.acessoAnaliseGlosa || "nao",
      acessoDicionarioGlosas: user.acessoDicionarioGlosas || "nao",
      acessoRecursosGlosa: user.acessoRecursosGlosa || "nao",
      acessoConvenios: user.acessoConvenios || "nao",
      acessoRegrasNegocio: user.acessoRegrasNegocio || "nao",
      acessoProdutividade: user.acessoProdutividade || "nao",
      acessoEstabelecimentos: user.acessoEstabelecimentos || "nao",
      acessoPermissoes: user.acessoPermissoes || "nao",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!selectedEstabelecimento || !editingUser) return;
    
    upsertPermissao.mutate({
      ...newPermissao,
      estabelecimentoId: selectedEstabelecimento,
    });
  };

  const getGrupoInfo = (grupoServico: string | null) => {
    const grupo = GRUPOS_SERVICO.find(g => g.value === grupoServico);
    return grupo || GRUPOS_SERVICO.find(g => g.value === "visualizador")!;
  };

  // Filtrar usuários que ainda não têm permissão neste estabelecimento
  const usuariosDisponiveis = todosUsuarios?.filter(
    u => !usuarios?.some(p => p.userId === u.id)
  );

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
          Configure grupos de serviço e permissões de acesso por estabelecimento
        </p>
      </div>

      {/* Legenda dos Grupos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Grupos de Serviço</CardTitle>
          <CardDescription>
            Cada grupo possui permissões pré-definidas que podem ser personalizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {GRUPOS_SERVICO.map((grupo) => {
              const Icon = grupo.icon;
              return (
                <div key={grupo.value} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                  <div className={`p-2 rounded-lg ${grupo.color} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{grupo.label}</h4>
                    <p className="text-xs text-muted-foreground">{grupo.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
              <Button onClick={() => {
                setNewPermissao({
                  userId: 0,
                  grupoServico: "visualizador",
                  podeVisualizar: "sim",
                  podeEditar: "nao",
                  podeExcluir: "nao",
                  podeGerenciar: "nao",
                  acessoDashboard: "sim",
                  acessoArquivos: "nao",
                  acessoComparacoes: "nao",
                  acessoFaturamento: "nao",
                  acessoTabelasPreco: "nao",
                  acessoAnaliseGlosa: "nao",
                  acessoDicionarioGlosas: "nao",
                  acessoRecursosGlosa: "nao",
                  acessoConvenios: "nao",
                  acessoRegrasNegocio: "nao",
                  acessoProdutividade: "nao",
                  acessoEstabelecimentos: "nao",
                  acessoPermissoes: "nao",
                });
                setShowAddDialog(true);
              }}>
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
                    <TableHead>Grupo de Serviço</TableHead>
                    <TableHead>Módulos com Acesso</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((user) => {
                    const grupoInfo = getGrupoInfo(user.grupoServico);
                    const Icon = grupoInfo.icon;
                    
                    // Contar módulos com acesso
                    const modulosAtivos = MODULOS.filter(m => 
                      user[m.key as keyof typeof user] === "sim"
                    );
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.userName || "Usuário"}</p>
                              <p className="text-sm text-muted-foreground">{user.userEmail}</p>
                              {user.userRole === "admin" && (
                                <Badge variant="destructive" className="mt-1">Admin do Sistema</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${grupoInfo.color} text-white`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-medium">{grupoInfo.label}</p>
                              <p className="text-xs text-muted-foreground">{grupoInfo.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {modulosAtivos.slice(0, 4).map(m => {
                              const ModIcon = m.icon;
                              return (
                                <Badge key={m.key} variant="secondary" className="text-xs">
                                  <ModIcon className="h-3 w-3 mr-1" />
                                  {m.label}
                                </Badge>
                              );
                            })}
                            {modulosAtivos.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{modulosAtivos.length - 4} mais
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditPermissao(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoverPermissao(user.userId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário com permissões neste estabelecimento</p>
                <p className="text-sm">Clique em "Adicionar Usuário" para começar</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog para Adicionar Usuário */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Usuário ao Estabelecimento</DialogTitle>
            <DialogDescription>
              Selecione um usuário e defina seu grupo de serviço e permissões
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="grupo" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grupo">Grupo de Serviço</TabsTrigger>
              <TabsTrigger value="modulos">Módulos</TabsTrigger>
            </TabsList>

            <TabsContent value="grupo" className="space-y-4 mt-4">
              {/* Seleção de Usuário */}
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select
                  value={newPermissao.userId.toString()}
                  onValueChange={(value) => setNewPermissao(prev => ({ ...prev, userId: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosDisponiveis?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.email} {user.role === "admin" && "(Admin)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Grupo */}
              <div className="space-y-2">
                <Label>Grupo de Serviço</Label>
                <div className="grid grid-cols-1 gap-3">
                  {GRUPOS_SERVICO.map((grupo) => {
                    const Icon = grupo.icon;
                    const isSelected = newPermissao.grupoServico === grupo.value;
                    return (
                      <div
                        key={grupo.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary"
                            : "hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        onClick={() => setNewPermissao(prev => ({ ...prev, grupoServico: grupo.value as "administrador" | "faturista" | "recurso_glosa" | "gestor" | "visualizador" }))}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${grupo.color} text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{grupo.label}</h4>
                            <p className="text-sm text-muted-foreground">{grupo.description}</p>
                          </div>
                          {isSelected && (
                            <Badge variant="default">Selecionado</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modulos" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Personalize os módulos que este usuário pode acessar. As permissões padrão são baseadas no grupo selecionado.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULOS.map((modulo) => {
                  const Icon = modulo.icon;
                  const isEnabled = newPermissao[modulo.key as keyof typeof newPermissao] === "sim";
                  return (
                    <div
                      key={modulo.key}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{modulo.label}</span>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => 
                          setNewPermissao(prev => ({
                            ...prev,
                            [modulo.key]: checked ? "sim" : "nao"
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddPermissao} disabled={!newPermissao.userId}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar Permissões */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Permissões</DialogTitle>
            <DialogDescription>
              {editingUser?.userName || editingUser?.userEmail}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="grupo" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grupo">Grupo de Serviço</TabsTrigger>
              <TabsTrigger value="modulos">Módulos</TabsTrigger>
            </TabsList>

            <TabsContent value="grupo" className="space-y-4 mt-4">
              {/* Seleção de Grupo */}
              <div className="space-y-2">
                <Label>Grupo de Serviço</Label>
                <div className="grid grid-cols-1 gap-3">
                  {GRUPOS_SERVICO.map((grupo) => {
                    const Icon = grupo.icon;
                    const isSelected = newPermissao.grupoServico === grupo.value;
                    return (
                      <div
                        key={grupo.value}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary"
                            : "hover:border-primary/50 hover:bg-muted/50"
                        }`}
                        onClick={() => setNewPermissao(prev => ({ ...prev, grupoServico: grupo.value as "administrador" | "faturista" | "recurso_glosa" | "gestor" | "visualizador" }))}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${grupo.color} text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{grupo.label}</h4>
                            <p className="text-sm text-muted-foreground">{grupo.description}</p>
                          </div>
                          {isSelected && (
                            <Badge variant="default">Selecionado</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="modulos" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Personalize os módulos que este usuário pode acessar.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {MODULOS.map((modulo) => {
                  const Icon = modulo.icon;
                  const isEnabled = newPermissao[modulo.key as keyof typeof newPermissao] === "sim";
                  return (
                    <div
                      key={modulo.key}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{modulo.label}</span>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => 
                          setNewPermissao(prev => ({
                            ...prev,
                            [modulo.key]: checked ? "sim" : "nao"
                          }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setEditingUser(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
