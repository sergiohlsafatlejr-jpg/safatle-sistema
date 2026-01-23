import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { 
  Brain, 
  Settings2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  Edit,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";

interface Parametros {
  limiteDesvioAbaixo?: number;
  limiteDesvioAcima?: number;
  minimoContasHistorico?: number;
  periodoAnalise?: number;
  taxaGlosaMinima?: number;
  minimoProcedimentos?: number;
  periodoMeses?: number;
  scoreRiscoMinimo?: number;
  historicoMinimoContas?: number;
  variacaoMinima?: number;
  periodoComparacao?: number;
  maxResultados?: number;
}

interface RegraIA {
  id: number;
  estabelecimentoId: number | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  categoria: 'outlier' | 'padrao_erro' | 'risco_glosa' | 'tendencia' | 'comparacao';
  tipoAlerta: 'critico' | 'alerta' | 'info';
  parametros: Parametros | null;
  prioridade: number | null;
  ativo: 'sim' | 'nao';
  criadoPor: number | null;
  atualizadoPor: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function RegrasIA() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const [editingRegra, setEditingRegra] = useState<RegraIA | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { data: regras, isLoading, refetch } = trpc.regrasIA.list.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id },
    { enabled: !!estabelecimentoAtual }
  );

  const toggleMutation = trpc.regrasIA.toggle.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Regra atualizada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar regra: ${error.message}`);
    },
  });

  const updateMutation = trpc.regrasIA.update.useMutation({
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      setEditingRegra(null);
      toast.success("Regra atualizada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar regra: ${error.message}`);
    },
  });

  const createMutation = trpc.regrasIA.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      setEditingRegra(null);
      setIsCreating(false);
      toast.success("Regra criada com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao criar regra: ${error.message}`);
    },
  });

  const deleteMutation = trpc.regrasIA.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Regra excluída com sucesso");
    },
    onError: (error) => {
      toast.error(`Erro ao excluir regra: ${error.message}`);
    },
  });

  const restaurarMutation = trpc.regrasIA.restaurarPadrao.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Regra restaurada para valores padrão");
    },
    onError: (error) => {
      toast.error(`Erro ao restaurar regra: ${error.message}`);
    },
  });

  const handleToggle = (regra: RegraIA) => {
    toggleMutation.mutate({
      id: regra.id,
      ativo: regra.ativo === 'sim' ? 'nao' : 'sim',
    });
  };

  const handleEdit = (regra: RegraIA) => {
    setEditingRegra(regra);
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRegra({
      id: 0,
      estabelecimentoId: estabelecimentoAtual?.id || null,
      codigo: '',
      nome: '',
      descricao: '',
      categoria: 'outlier',
      tipoAlerta: 'alerta',
      parametros: {},
      prioridade: 100,
      ativo: 'sim',
      criadoPor: null,
      atualizadoPor: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingRegra) return;

    if (isCreating) {
      createMutation.mutate({
        estabelecimentoId: estabelecimentoAtual?.id,
        codigo: editingRegra.codigo,
        nome: editingRegra.nome,
        descricao: editingRegra.descricao || undefined,
        categoria: editingRegra.categoria,
        tipoAlerta: editingRegra.tipoAlerta,
        parametros: editingRegra.parametros || undefined,
        prioridade: editingRegra.prioridade || undefined,
        ativo: editingRegra.ativo,
      });
    } else {
      updateMutation.mutate({
        id: editingRegra.id,
        nome: editingRegra.nome,
        descricao: editingRegra.descricao || undefined,
        tipoAlerta: editingRegra.tipoAlerta,
        parametros: editingRegra.parametros || undefined,
        prioridade: editingRegra.prioridade || undefined,
        ativo: editingRegra.ativo,
      });
    }
  };

  const handleRestaurar = (codigo: string) => {
    restaurarMutation.mutate({
      codigo,
      estabelecimentoId: estabelecimentoAtual?.id,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta regra?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      outlier: 'Outlier',
      padrao_erro: 'Padrão de Erro',
      risco_glosa: 'Risco de Glosa',
      tendencia: 'Tendência',
      comparacao: 'Comparação',
    };
    return labels[categoria] || categoria;
  };

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      outlier: 'bg-purple-100 text-purple-800',
      padrao_erro: 'bg-red-100 text-red-800',
      risco_glosa: 'bg-orange-100 text-orange-800',
      tendencia: 'bg-blue-100 text-blue-800',
      comparacao: 'bg-green-100 text-green-800',
    };
    return colors[categoria] || 'bg-gray-100 text-gray-800';
  };

  const getTipoAlertaIcon = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'alerta':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTipoAlertaLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      critico: 'Crítico',
      alerta: 'Alerta',
      info: 'Informativo',
    };
    return labels[tipo] || tipo;
  };

  if (!estabelecimentoAtual) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Selecione um estabelecimento para gerenciar as regras de IA</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-6 w-6 text-primary" />
              Regras de IA
            </h1>
            <p className="text-muted-foreground">
              Configure os parâmetros e limites utilizados pela IA para gerar alertas
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </div>

        {/* Tabela de Regras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Regras Configuradas
            </CardTitle>
            <CardDescription>
              Gerencie as regras que a IA utiliza para analisar contas e gerar alertas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !regras || regras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma regra configurada. Clique em "Nova Regra" para criar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo de Alerta</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.map((regra) => (
                    <TableRow key={regra.id}>
                      <TableCell>
                        <Switch
                          checked={regra.ativo === 'sim'}
                          onCheckedChange={() => handleToggle(regra as RegraIA)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{regra.nome}</p>
                          <p className="text-xs text-muted-foreground">{regra.codigo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoriaColor(regra.categoria)}>
                          {getCategoriaLabel(regra.categoria)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTipoAlertaIcon(regra.tipoAlerta)}
                          <span>{getTipoAlertaLabel(regra.tipoAlerta)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{regra.prioridade}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(regra as RegraIA)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestaurar(regra.codigo)}
                            title="Restaurar valores padrão"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          {regra.estabelecimentoId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(regra.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isCreating ? 'Nova Regra de IA' : 'Editar Regra de IA'}
              </DialogTitle>
              <DialogDescription>
                Configure os parâmetros da regra de análise
              </DialogDescription>
            </DialogHeader>

            {editingRegra && (
              <div className="space-y-4">
                {/* Informações Básicas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="codigo">Código</Label>
                    <Input
                      id="codigo"
                      value={editingRegra.codigo}
                      onChange={(e) => setEditingRegra({ ...editingRegra, codigo: e.target.value })}
                      disabled={!isCreating}
                      placeholder="ex: outlier_personalizado"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={editingRegra.nome}
                      onChange={(e) => setEditingRegra({ ...editingRegra, nome: e.target.value })}
                      placeholder="Nome da regra"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={editingRegra.descricao || ''}
                    onChange={(e) => setEditingRegra({ ...editingRegra, descricao: e.target.value })}
                    placeholder="Descreva o que esta regra analisa"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select
                      value={editingRegra.categoria}
                      onValueChange={(value: 'outlier' | 'padrao_erro' | 'risco_glosa' | 'tendencia' | 'comparacao') => 
                        setEditingRegra({ ...editingRegra, categoria: value })
                      }
                      disabled={!isCreating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outlier">Outlier</SelectItem>
                        <SelectItem value="padrao_erro">Padrão de Erro</SelectItem>
                        <SelectItem value="risco_glosa">Risco de Glosa</SelectItem>
                        <SelectItem value="tendencia">Tendência</SelectItem>
                        <SelectItem value="comparacao">Comparação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipoAlerta">Tipo de Alerta</Label>
                    <Select
                      value={editingRegra.tipoAlerta}
                      onValueChange={(value: 'critico' | 'alerta' | 'info') => 
                        setEditingRegra({ ...editingRegra, tipoAlerta: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critico">Crítico (Vermelho)</SelectItem>
                        <SelectItem value="alerta">Alerta (Amarelo)</SelectItem>
                        <SelectItem value="info">Informativo (Azul)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Input
                      id="prioridade"
                      type="number"
                      value={editingRegra.prioridade || 100}
                      onChange={(e) => setEditingRegra({ ...editingRegra, prioridade: parseInt(e.target.value) || 100 })}
                      placeholder="1-100 (menor = mais importante)"
                    />
                  </div>
                </div>

                {/* Parâmetros por Categoria */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Parâmetros da Análise</h4>
                  
                  {(editingRegra.categoria === 'outlier') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Limite Desvio Padrão (Abaixo)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editingRegra.parametros?.limiteDesvioAbaixo || 2}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              limiteDesvioAbaixo: parseFloat(e.target.value) || 2,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Valores abaixo de X desvios padrão da média
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Limite Desvio Padrão (Acima)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={editingRegra.parametros?.limiteDesvioAcima || 2}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              limiteDesvioAcima: parseFloat(e.target.value) || 2,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Valores acima de X desvios padrão da média
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Mínimo de Contas no Histórico</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.minimoContasHistorico || 3}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              minimoContasHistorico: parseInt(e.target.value) || 3,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Mínimo de contas para calcular estatísticas
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Período de Análise (dias)</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.periodoAnalise || 90}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              periodoAnalise: parseInt(e.target.value) || 90,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Dias de histórico para análise
                        </p>
                      </div>
                    </div>
                  )}

                  {(editingRegra.categoria === 'padrao_erro') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Taxa Mínima de Glosa (%)</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.taxaGlosaMinima || 20}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              taxaGlosaMinima: parseInt(e.target.value) || 20,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Taxa de glosa para gerar alerta
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Mínimo de Procedimentos</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.minimoProcedimentos || 50}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              minimoProcedimentos: parseInt(e.target.value) || 50,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Mínimo de procedimentos para análise
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Período (meses)</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.periodoMeses || 6}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              periodoMeses: parseInt(e.target.value) || 6,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Meses de histórico para análise
                        </p>
                      </div>
                    </div>
                  )}

                  {(editingRegra.categoria === 'risco_glosa') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Score Mínimo de Risco (%)</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.scoreRiscoMinimo || 30}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              scoreRiscoMinimo: parseInt(e.target.value) || 30,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Score mínimo para considerar alto risco
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Mínimo de Contas no Histórico</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.historicoMinimoContas || 5}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              historicoMinimoContas: parseInt(e.target.value) || 5,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Mínimo de contas para calcular risco
                        </p>
                      </div>
                    </div>
                  )}

                  {(editingRegra.categoria === 'tendencia') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Variação Mínima (%)</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.variacaoMinima || 10}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              variacaoMinima: parseInt(e.target.value) || 10,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Variação mínima para gerar alerta
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Período de Comparação (meses)</Label>
                        <Input
                          type="number"
                          value={editingRegra.parametros?.periodoComparacao || 3}
                          onChange={(e) => setEditingRegra({
                            ...editingRegra,
                            parametros: {
                              ...editingRegra.parametros,
                              periodoComparacao: parseInt(e.target.value) || 3,
                            },
                          })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Meses para comparação de tendência
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Configuração comum */}
                  <div className="mt-4 space-y-2">
                    <Label>Máximo de Resultados</Label>
                    <Input
                      type="number"
                      value={editingRegra.parametros?.maxResultados || 10}
                      onChange={(e) => setEditingRegra({
                        ...editingRegra,
                        parametros: {
                          ...editingRegra.parametros,
                          maxResultados: parseInt(e.target.value) || 10,
                        },
                      })}
                      className="w-48"
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantidade máxima de itens a exibir no alerta
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {isCreating ? 'Criar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
