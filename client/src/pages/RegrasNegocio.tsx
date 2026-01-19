import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Settings2, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText,
  Package,
  Pill,
  Bed,
  Wrench,
  MoreHorizontal
} from "lucide-react";

export default function RegrasNegocio() {
  const [convenioId, setConvenioId] = useState<number | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedRegra, setSelectedRegra] = useState<any>(null);
  
  // Form states
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [codigoProcedimentoPrincipal, setCodigoProcedimentoPrincipal] = useState("");
  const [descricaoProcedimentoPrincipal, setDescricaoProcedimentoPrincipal] = useState("");
  const [tipoVerificacao, setTipoVerificacao] = useState<"deve_conter" | "nao_deve_conter" | "pode_conter" | "quantidade_minima" | "quantidade_maxima">("deve_conter");
  const [acaoInconsistencia, setAcaoInconsistencia] = useState<"alerta" | "bloquear" | "sugerir_adicao" | "sugerir_remocao">("alerta");
  const [prioridade, setPrioridade] = useState(5);
  const [itens, setItens] = useState<Array<{
    codigoItem: string;
    descricaoItem: string;
    tipoItem: "procedimento" | "taxa" | "material" | "medicamento" | "diaria" | "outros";
    quantidadeMinima?: number;
    quantidadeMaxima?: number;
    valorEsperado?: string;
    obrigatorio: "sim" | "nao";
  }>>([]);
  
  // Novo item form
  const [novoItemCodigo, setNovoItemCodigo] = useState("");
  const [novoItemDescricao, setNovoItemDescricao] = useState("");
  const [novoItemTipo, setNovoItemTipo] = useState<"procedimento" | "taxa" | "material" | "medicamento" | "diaria" | "outros">("taxa");
  const [novoItemQtdMin, setNovoItemQtdMin] = useState<number | undefined>(1);
  const [novoItemQtdMax, setNovoItemQtdMax] = useState<number | undefined>();
  const [novoItemValor, setNovoItemValor] = useState("");
  const [novoItemObrigatorio, setNovoItemObrigatorio] = useState<"sim" | "nao">("sim");

  // Queries
  const { data: convenios } = trpc.convenios.list.useQuery();
  const { data: regras, refetch: refetchRegras } = trpc.regrasNegocio.list.useQuery({
    convenioId,
    ativo: "sim"
  });

  // Mutations
  const createMutation = trpc.regrasNegocio.create.useMutation({
    onSuccess: () => {
      toast.success("Regra criada com sucesso!");
      setShowCreateDialog(false);
      resetForm();
      refetchRegras();
    },
    onError: (error) => {
      toast.error(`Erro ao criar regra: ${error.message}`);
    }
  });

  const updateMutation = trpc.regrasNegocio.update.useMutation({
    onSuccess: () => {
      toast.success("Regra atualizada com sucesso!");
      setShowEditDialog(false);
      refetchRegras();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar regra: ${error.message}`);
    }
  });

  const deleteMutation = trpc.regrasNegocio.delete.useMutation({
    onSuccess: () => {
      toast.success("Regra excluída com sucesso!");
      refetchRegras();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir regra: ${error.message}`);
    }
  });

  const resetForm = () => {
    setNome("");
    setDescricao("");
    setCodigoProcedimentoPrincipal("");
    setDescricaoProcedimentoPrincipal("");
    setTipoVerificacao("deve_conter");
    setAcaoInconsistencia("alerta");
    setPrioridade(5);
    setItens([]);
  };

  const adicionarItem = () => {
    if (!novoItemCodigo) {
      toast.error("Informe o código do item");
      return;
    }
    
    setItens([...itens, {
      codigoItem: novoItemCodigo,
      descricaoItem: novoItemDescricao,
      tipoItem: novoItemTipo,
      quantidadeMinima: novoItemQtdMin,
      quantidadeMaxima: novoItemQtdMax,
      valorEsperado: novoItemValor || undefined,
      obrigatorio: novoItemObrigatorio
    }]);
    
    // Reset novo item form
    setNovoItemCodigo("");
    setNovoItemDescricao("");
    setNovoItemQtdMin(1);
    setNovoItemQtdMax(undefined);
    setNovoItemValor("");
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleCreate = () => {
    if (!nome || !codigoProcedimentoPrincipal) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    
    createMutation.mutate({
      convenioId,
      nome,
      descricao: descricao || undefined,
      codigoProcedimentoPrincipal,
      descricaoProcedimentoPrincipal: descricaoProcedimentoPrincipal || undefined,
      tipoVerificacao,
      acaoInconsistencia,
      prioridade,
      itens: itens.length > 0 ? itens : undefined
    });
  };

  const handleToggleAtivo = (regra: any) => {
    updateMutation.mutate({
      id: regra.id,
      ativo: regra.ativo === "sim" ? "nao" : "sim"
    });
  };

  const getTipoVerificacaoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      "deve_conter": "Deve Conter",
      "nao_deve_conter": "Não Deve Conter",
      "pode_conter": "Pode Conter",
      "quantidade_minima": "Quantidade Mínima",
      "quantidade_maxima": "Quantidade Máxima"
    };
    return labels[tipo] || tipo;
  };

  const getAcaoLabel = (acao: string) => {
    const labels: Record<string, string> = {
      "alerta": "Alertar",
      "bloquear": "Bloquear",
      "sugerir_adicao": "Sugerir Adição",
      "sugerir_remocao": "Sugerir Remoção"
    };
    return labels[acao] || acao;
  };

  const getTipoItemIcon = (tipo: string) => {
    switch (tipo) {
      case "procedimento": return <FileText className="h-4 w-4" />;
      case "taxa": return <Wrench className="h-4 w-4" />;
      case "material": return <Package className="h-4 w-4" />;
      case "medicamento": return <Pill className="h-4 w-4" />;
      case "diaria": return <Bed className="h-4 w-4" />;
      default: return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Regras de Negócio</h1>
            <p className="text-muted-foreground">
              Configure regras de composição de contas para validação automática
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Regra
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="w-64">
                <Label>Convênio</Label>
                <Select
                  value={convenioId?.toString() || "todos"}
                  onValueChange={(v) => setConvenioId(v === "todos" ? undefined : parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os convênios</SelectItem>
                    {convenios?.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Regras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Regras Cadastradas
            </CardTitle>
            <CardDescription>
              {regras?.length || 0} regras encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!regras || regras.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma regra cadastrada</p>
                <p className="text-sm">Clique em "Nova Regra" para começar</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Procedimento Principal</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.map((regra) => (
                    <TableRow key={regra.id}>
                      <TableCell>
                        <Badge variant="outline">{regra.prioridade}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{regra.nome}</p>
                          {regra.descricao && (
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {regra.descricao}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <code className="text-sm bg-muted px-1 rounded">
                            {regra.codigoProcedimentoPrincipal}
                          </code>
                          {regra.descricaoProcedimentoPrincipal && (
                            <p className="text-sm text-muted-foreground">
                              {regra.descricaoProcedimentoPrincipal}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getTipoVerificacaoLabel(regra.tipoVerificacao)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={regra.acaoInconsistencia === "bloquear" ? "destructive" : "outline"}
                        >
                          {getAcaoLabel(regra.acaoInconsistencia)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {regra.ativo === "sim" ? (
                          <Badge className="bg-green-500">Ativa</Badge>
                        ) : (
                          <Badge variant="secondary">Inativa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleAtivo(regra)}
                          >
                            {regra.ativo === "sim" ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRegra(regra);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Deseja excluir esta regra?")) {
                                deleteMutation.mutate({ id: regra.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Exemplos de Regras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Exemplos de Regras
            </CardTitle>
            <CardDescription>
              Sugestões de regras comuns para validação de contas hospitalares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Cirurgia com Taxa de Sala</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Procedimento cirúrgico deve conter:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Taxa de sala cirúrgica</li>
                    <li>Oxigênio</li>
                    <li>Material de consumo</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Videolaparoscopia</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Procedimento de vídeo deve conter:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Taxa de vídeo</li>
                    <li>Gás CO2</li>
                    <li>Instrumental específico</li>
                  </ul>
                </CardContent>
              </Card>
              
              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Internação UTI</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <p>Diária de UTI deve conter:</p>
                  <ul className="list-disc list-inside mt-2">
                    <li>Monitorização</li>
                    <li>Oxigênio</li>
                    <li>Gases medicinais</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Criação */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Regra de Negócio</DialogTitle>
            <DialogDescription>
              Configure uma regra para validação automática de composição de contas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Regra *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Cirurgia com Taxa de Sala"
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={prioridade}
                  onChange={(e) => setPrioridade(parseInt(e.target.value) || 5)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva quando esta regra deve ser aplicada..."
              />
            </div>

            {/* Procedimento Principal */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Procedimento Principal (Gatilho)</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Código do Procedimento *</Label>
                  <Input
                    value={codigoProcedimentoPrincipal}
                    onChange={(e) => setCodigoProcedimentoPrincipal(e.target.value)}
                    placeholder="Ex: 31003079"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={descricaoProcedimentoPrincipal}
                    onChange={(e) => setDescricaoProcedimentoPrincipal(e.target.value)}
                    placeholder="Ex: Colecistectomia por videolaparoscopia"
                  />
                </div>
              </div>
            </div>

            {/* Tipo de Verificação */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Verificação</Label>
                <Select
                  value={tipoVerificacao}
                  onValueChange={(v) => setTipoVerificacao(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deve_conter">Deve Conter (obrigatório)</SelectItem>
                    <SelectItem value="nao_deve_conter">Não Deve Conter (proibido)</SelectItem>
                    <SelectItem value="pode_conter">Pode Conter (validar valor)</SelectItem>
                    <SelectItem value="quantidade_minima">Quantidade Mínima</SelectItem>
                    <SelectItem value="quantidade_maxima">Quantidade Máxima</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ação quando Inconsistente</Label>
                <Select
                  value={acaoInconsistencia}
                  onValueChange={(v) => setAcaoInconsistencia(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alerta">Apenas Alertar</SelectItem>
                    <SelectItem value="bloquear">Bloquear Envio</SelectItem>
                    <SelectItem value="sugerir_adicao">Sugerir Adição</SelectItem>
                    <SelectItem value="sugerir_remocao">Sugerir Remoção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Itens da Regra */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-medium">Itens Obrigatórios/Proibidos</h3>
              
              {/* Lista de itens */}
              {itens.length > 0 && (
                <div className="space-y-2">
                  {itens.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      {getTipoItemIcon(item.tipoItem)}
                      <code className="text-sm">{item.codigoItem}</code>
                      <span className="text-sm text-muted-foreground">
                        {item.descricaoItem || "Sem descrição"}
                      </span>
                      {item.quantidadeMinima && (
                        <Badge variant="outline" className="text-xs">
                          Mín: {item.quantidadeMinima}
                        </Badge>
                      )}
                      {item.obrigatorio === "sim" && (
                        <Badge className="text-xs">Obrigatório</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() => removerItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Form para adicionar item */}
              <div className="grid gap-3 md:grid-cols-4 border-t pt-4">
                <div className="space-y-1">
                  <Label className="text-xs">Código</Label>
                  <Input
                    value={novoItemCodigo}
                    onChange={(e) => setNovoItemCodigo(e.target.value)}
                    placeholder="Código"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Input
                    value={novoItemDescricao}
                    onChange={(e) => setNovoItemDescricao(e.target.value)}
                    placeholder="Descrição"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={novoItemTipo}
                    onValueChange={(v) => setNovoItemTipo(v as any)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="procedimento">Procedimento</SelectItem>
                      <SelectItem value="taxa">Taxa</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="medicamento">Medicamento</SelectItem>
                      <SelectItem value="diaria">Diária</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={adicionarItem} size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Qtd Mínima</Label>
                  <Input
                    type="number"
                    value={novoItemQtdMin || ""}
                    onChange={(e) => setNovoItemQtdMin(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="1"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qtd Máxima</Label>
                  <Input
                    type="number"
                    value={novoItemQtdMax || ""}
                    onChange={(e) => setNovoItemQtdMax(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Sem limite"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor Esperado</Label>
                  <Input
                    value={novoItemValor}
                    onChange={(e) => setNovoItemValor(e.target.value)}
                    placeholder="R$ 0,00"
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Obrigatório</Label>
                  <Select
                    value={novoItemObrigatorio}
                    onValueChange={(v) => setNovoItemObrigatorio(v as any)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setSelectedRegra(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Regra de Negócio</DialogTitle>
            <DialogDescription>
              Modifique as configurações da regra de validação
            </DialogDescription>
          </DialogHeader>

          {selectedRegra && (
            <EditRegraForm
              regra={selectedRegra}
              onSave={(data) => {
                updateMutation.mutate(data);
              }}
              onCancel={() => setShowEditDialog(false)}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Componente separado para o formulário de edição
function EditRegraForm({ 
  regra, 
  onSave, 
  onCancel, 
  isPending 
}: { 
  regra: any; 
  onSave: (data: any) => void; 
  onCancel: () => void;
  isPending: boolean;
}) {
  const [nome, setNome] = useState(regra.nome || "");
  const [descricao, setDescricao] = useState(regra.descricao || "");
  const [codigoProcedimentoPrincipal, setCodigoProcedimentoPrincipal] = useState(regra.codigoProcedimentoPrincipal || "");
  const [descricaoProcedimentoPrincipal, setDescricaoProcedimentoPrincipal] = useState(regra.descricaoProcedimentoPrincipal || "");
  const [tipoVerificacao, setTipoVerificacao] = useState<"deve_conter" | "nao_deve_conter" | "pode_conter" | "quantidade_minima" | "quantidade_maxima">(regra.tipoVerificacao || "deve_conter");
  const [acaoInconsistencia, setAcaoInconsistencia] = useState<"alerta" | "bloquear" | "sugerir_adicao" | "sugerir_remocao">(regra.acaoInconsistencia || "alerta");
  const [prioridade, setPrioridade] = useState(regra.prioridade || 5);

  // Buscar regra com itens
  const { data: regraCompleta } = trpc.regrasNegocio.getById.useQuery({ id: regra.id });

  const handleSave = () => {
    if (!nome || !codigoProcedimentoPrincipal) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    
    onSave({
      id: regra.id,
      nome,
      descricao: descricao || undefined,
      codigoProcedimentoPrincipal,
      descricaoProcedimentoPrincipal: descricaoProcedimentoPrincipal || undefined,
      tipoVerificacao,
      acaoInconsistencia,
      prioridade,
    });
  };

  const getTipoItemIcon = (tipo: string) => {
    switch (tipo) {
      case "procedimento": return <FileText className="h-4 w-4" />;
      case "taxa": return <Wrench className="h-4 w-4" />;
      case "material": return <Package className="h-4 w-4" />;
      case "medicamento": return <Pill className="h-4 w-4" />;
      case "diaria": return <Bed className="h-4 w-4" />;
      default: return <MoreHorizontal className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome da Regra *</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Cirurgia com Taxa de Sala"
          />
        </div>
        <div className="space-y-2">
          <Label>Prioridade</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={prioridade}
            onChange={(e) => setPrioridade(parseInt(e.target.value) || 5)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva quando esta regra deve ser aplicada..."
        />
      </div>

      {/* Procedimento Principal */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-medium">Procedimento Principal (Gatilho)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Código do Procedimento *</Label>
            <Input
              value={codigoProcedimentoPrincipal}
              onChange={(e) => setCodigoProcedimentoPrincipal(e.target.value)}
              placeholder="Ex: 31003079"
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={descricaoProcedimentoPrincipal}
              onChange={(e) => setDescricaoProcedimentoPrincipal(e.target.value)}
              placeholder="Ex: Colecistectomia por videolaparoscopia"
            />
          </div>
        </div>
      </div>

      {/* Tipo de Verificação */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo de Verificação</Label>
          <Select
            value={tipoVerificacao}
            onValueChange={(v) => setTipoVerificacao(v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deve_conter">Deve Conter (obrigatório)</SelectItem>
              <SelectItem value="nao_deve_conter">Não Deve Conter (proibido)</SelectItem>
              <SelectItem value="pode_conter">Pode Conter (validar valor)</SelectItem>
              <SelectItem value="quantidade_minima">Quantidade Mínima</SelectItem>
              <SelectItem value="quantidade_maxima">Quantidade Máxima</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ação quando Inconsistente</Label>
          <Select
            value={acaoInconsistencia}
            onValueChange={(v) => setAcaoInconsistencia(v as any)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alerta">Apenas Alertar</SelectItem>
              <SelectItem value="bloquear">Bloquear Envio</SelectItem>
              <SelectItem value="sugerir_adicao">Sugerir Adição</SelectItem>
              <SelectItem value="sugerir_remocao">Sugerir Remoção</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Itens da Regra (somente visualização) */}
      <div className="border rounded-lg p-4 space-y-4">
        <h3 className="font-medium">Itens Obrigatórios/Proibidos</h3>
        
        {regraCompleta?.itens && regraCompleta.itens.length > 0 ? (
          <div className="space-y-2">
            {regraCompleta.itens.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                {getTipoItemIcon(item.tipoItem)}
                <code className="text-sm">{item.codigoItem}</code>
                <span className="text-sm text-muted-foreground">
                  {item.descricaoItem || "Sem descrição"}
                </span>
                {item.quantidadeMinima && (
                  <Badge variant="outline" className="text-xs">
                    Mín: {item.quantidadeMinima}
                  </Badge>
                )}
                {item.obrigatorio === "sim" && (
                  <Badge className="text-xs">Obrigatório</Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum item cadastrado para esta regra</p>
        )}
        
        <p className="text-xs text-muted-foreground">
          Para adicionar ou remover itens, utilize a função de gerenciamento de itens após salvar a regra.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </DialogFooter>
    </div>
  );
}
