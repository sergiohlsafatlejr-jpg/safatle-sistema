import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Plus, 
  Upload, 
  Search, 
  Pencil, 
  Trash2, 
  FileSpreadsheet,
  Bed,
  Pill,
  Receipt,
  Stethoscope,
  Download,
  RefreshCw,
  History
} from "lucide-react";

type TipoTabela = "diarias" | "mat_med" | "taxas" | "procedimentos";

const tiposTabela = [
  { value: "diarias", label: "Diárias", icon: Bed, description: "Diárias de apartamento, UTI, etc." },
  { value: "mat_med", label: "Mat/Med", icon: Pill, description: "Materiais e medicamentos" },
  { value: "taxas", label: "Taxas", icon: Receipt, description: "Taxas diversas" },
  { value: "procedimentos", label: "Procedimentos", icon: Stethoscope, description: "Procedimentos médicos" },
];

export default function TabelasPreco() {
  const [convenioId, setConvenioId] = useState<number | undefined>();
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoTabela>("diarias");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [formCodigo, setFormCodigo] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formValor, setFormValor] = useState("");
  const [formVigenciaInicio, setFormVigenciaInicio] = useState("");
  const [formVigenciaFim, setFormVigenciaFim] = useState("");
  const [formUnidade, setFormUnidade] = useState("");
  const [formObservacao, setFormObservacao] = useState("");

  // Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSubstituir, setImportSubstituir] = useState(false);

  // Queries
  const { data: convenios } = trpc.convenios.list.useQuery();
  const { data: tabelasData, isLoading, refetch } = trpc.tabelasPreco.list.useQuery(
    {
      convenioId,
      tipo: tipoSelecionado,
      codigo: searchTerm || undefined,
      nome: searchTerm || undefined,
      apenasVigentes: false, // Mostrar todos os itens, não apenas os vigentes
      page,
      limit: 50,
    },
    { enabled: !!convenioId }
  );
  const { data: contagem } = trpc.tabelasPreco.contarPorTipo.useQuery(
    { convenioId: convenioId! },
    { enabled: !!convenioId }
  );
  const { data: historicoImportacoes } = trpc.tabelasPreco.historicoImportacoes.useQuery(
    { convenioId },
    { enabled: !!convenioId }
  );

  // Mutations
  const createMutation = trpc.tabelasPreco.create.useMutation({
    onSuccess: () => {
      toast.success("Item criado com sucesso!");
      refetch();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao criar item: ${error.message}`);
    },
  });

  const updateMutation = trpc.tabelasPreco.update.useMutation({
    onSuccess: () => {
      toast.success("Item atualizado com sucesso!");
      refetch();
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar item: ${error.message}`);
    },
  });

  const deleteMutation = trpc.tabelasPreco.delete.useMutation({
    onSuccess: () => {
      toast.success("Item excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao excluir item: ${error.message}`);
    },
  });

  const importMutation = trpc.tabelasPreco.importar.useMutation({
    onSuccess: (result) => {
      toast.success(`Importação concluída! ${result.itensImportados} itens importados.`);
      refetch();
      setImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormCodigo("");
    setFormNome("");
    setFormValor("");
    setFormVigenciaInicio("");
    setFormVigenciaFim("");
    setFormUnidade("");
    setFormObservacao("");
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormCodigo(item.codigo);
    setFormNome(item.nome);
    setFormValor(item.valor);
    setFormVigenciaInicio(item.vigenciaInicio ? new Date(item.vigenciaInicio).toISOString().split("T")[0] : "");
    setFormVigenciaFim(item.vigenciaFim ? new Date(item.vigenciaFim).toISOString().split("T")[0] : "");
    setFormUnidade(item.unidade || "");
    setFormObservacao(item.observacao || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!convenioId) {
      toast.error("Selecione um convênio");
      return;
    }

    if (!formCodigo || !formNome || !formValor || !formVigenciaInicio) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        codigo: formCodigo,
        nome: formNome,
        valor: formValor,
        vigenciaInicio: formVigenciaInicio,
        vigenciaFim: formVigenciaFim || undefined,
        unidade: formUnidade || undefined,
        observacao: formObservacao || undefined,
      });
    } else {
      createMutation.mutate({
        convenioId,
        tipo: tipoSelecionado,
        codigo: formCodigo,
        nome: formNome,
        valor: formValor,
        vigenciaInicio: formVigenciaInicio,
        vigenciaFim: formVigenciaFim || undefined,
        unidade: formUnidade || undefined,
        observacao: formObservacao || undefined,
      });
    }
  };

  const handleImport = async () => {
    if (!convenioId || !importFile) {
      toast.error("Selecione um convênio e um arquivo");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const ext = importFile.name.split(".").pop()?.toLowerCase();
      let formato: "excel" | "csv" | "dbf" = "excel";
      if (ext === "csv") formato = "csv";
      else if (ext === "dbf") formato = "dbf";

      importMutation.mutate({
        convenioId,
        tipo: tipoSelecionado,
        nomeArquivo: importFile.name,
        formatoArquivo: formato,
        conteudo: base64,
        substituirExistentes: importSubstituir,
      });
    };
    reader.readAsDataURL(importFile);
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const tipoAtual = tiposTabela.find(t => t.value === tipoSelecionado);
  const IconeTipo = tipoAtual?.icon || FileSpreadsheet;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tabelas de Preços</h1>
            <p className="text-muted-foreground">
              Cadastre e gerencie tabelas de preços por convênio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHistoryDialogOpen(true)} disabled={!convenioId}>
              <History className="h-4 w-4 mr-2" />
              Histórico
            </Button>
            <Button variant="outline" onClick={() => refetch()} disabled={!convenioId}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Seletor de Convênio */}
        <Card>
          <CardHeader>
            <CardTitle>Selecione o Convênio</CardTitle>
            <CardDescription>
              Escolha o convênio para visualizar e gerenciar suas tabelas de preços
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={convenioId?.toString() || ""}
              onValueChange={(v) => {
                setConvenioId(v ? parseInt(v) : undefined);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecione um convênio..." />
              </SelectTrigger>
              <SelectContent>
                {convenios?.map((conv) => (
                  <SelectItem key={conv.id} value={conv.id.toString()}>
                    {conv.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {convenioId && (
          <>
            {/* Cards de Contagem por Tipo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tiposTabela.map((tipo) => {
                const Icon = tipo.icon;
                const count = contagem?.[tipo.value as keyof typeof contagem] || 0;
                const isSelected = tipoSelecionado === tipo.value;
                return (
                  <Card
                    key={tipo.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => {
                      setTipoSelecionado(tipo.value as TipoTabela);
                      setPage(1);
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{tipo.label}</p>
                          <p className="text-2xl font-bold">{count}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Tabela de Itens */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconeTipo className="h-6 w-6 text-primary" />
                    <div>
                      <CardTitle>{tipoAtual?.label}</CardTitle>
                      <CardDescription>{tipoAtual?.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Importar
                    </Button>
                    <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Item
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Busca */}
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código ou nome..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Tabela */}
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : !tabelasData?.items.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum item cadastrado. Clique em "Novo Item" ou "Importar" para começar.
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Vigência Início</TableHead>
                          <TableHead>Vigência Fim</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tabelasData.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono">{item.codigo}</TableCell>
                            <TableCell>{item.nome}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.valor)}
                            </TableCell>
                            <TableCell>{item.unidade || "-"}</TableCell>
                            <TableCell>{formatDate(item.vigenciaInicio)}</TableCell>
                            <TableCell>{formatDate(item.vigenciaFim)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm("Deseja excluir este item?")) {
                                      deleteMutation.mutate({ id: item.id });
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

                    {/* Paginação */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {tabelasData.items.length} de {tabelasData.total} itens
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(p => p - 1)}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={tabelasData.items.length < 50}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Próximo
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Dialog de Criar/Editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Atualize os dados do item" : "Preencha os dados do novo item"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    placeholder="Ex: 6006632"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor *</Label>
                  <Input
                    id="valor"
                    value={formValor}
                    onChange={(e) => setFormValor(e.target.value)}
                    placeholder="Ex: 250.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Diária de Apartamento"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vigenciaInicio">Vigência Início *</Label>
                  <Input
                    id="vigenciaInicio"
                    type="date"
                    value={formVigenciaInicio}
                    onChange={(e) => setFormVigenciaInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vigenciaFim">Vigência Fim</Label>
                  <Input
                    id="vigenciaFim"
                    type="date"
                    value={formVigenciaFim}
                    onChange={(e) => setFormVigenciaFim(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade</Label>
                  <Input
                    id="unidade"
                    value={formUnidade}
                    onChange={(e) => setFormUnidade(e.target.value)}
                    placeholder="Ex: UN, ML, MG"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacao">Observação</Label>
                  <Input
                    id="observacao"
                    value={formObservacao}
                    onChange={(e) => setFormObservacao(e.target.value)}
                    placeholder="Observações adicionais"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingItem ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Importação */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar Tabela de Preços</DialogTitle>
              <DialogDescription>
                Importe uma planilha com os itens da tabela de {tipoAtual?.label.toLowerCase()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Arquivo (Excel, CSV ou DBF)</Label>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".xlsx,.xls,.csv,.dbf"
                    ref={fileInputRef}
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
                {importFile && (
                  <p className="text-sm text-muted-foreground">
                    Arquivo selecionado: {importFile.name}
                  </p>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-medium text-sm">Formato esperado das colunas:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>codigo</strong> - Código do item (obrigatório)</li>
                  <li>• <strong>nome</strong> ou <strong>descricao</strong> - Nome do item (obrigatório)</li>
                  <li>• <strong>valor</strong> ou <strong>preco</strong> - Valor em reais (obrigatório)</li>
                  <li>• <strong>vigencia_inicio</strong> - Data de início da vigência</li>
                  <li>• <strong>vigencia_fim</strong> - Data de fim da vigência</li>
                  <li>• <strong>unidade</strong> - Unidade de medida (opcional)</li>
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="substituir"
                  checked={importSubstituir}
                  onChange={(e) => setImportSubstituir(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="substituir" className="text-sm">
                  Substituir itens existentes (desativa os anteriores)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={!importFile || importMutation.isPending}>
                {importMutation.isPending ? "Importando..." : "Importar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Histórico de Importações */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Histórico de Importações</DialogTitle>
              <DialogDescription>
                Visualize o histórico de importações de tabelas de preços
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-auto">
              {!historicoImportacoes?.length ? (
                <p className="text-center py-4 text-muted-foreground">
                  Nenhuma importação realizada ainda.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Itens</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoImportacoes.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell>{formatDate(imp.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{imp.tipo}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{imp.nomeArquivo}</TableCell>
                        <TableCell>
                          {imp.itensImportados}/{imp.totalItens}
                          {(imp.itensErro ?? 0) > 0 && (
                            <span className="text-destructive ml-1">({imp.itensErro} erros)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              imp.status === "concluido" ? "default" :
                              imp.status === "erro" ? "destructive" : "secondary"
                            }
                          >
                            {imp.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
