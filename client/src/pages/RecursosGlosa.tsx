import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Download,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Calendar,
  Building2,
  TrendingUp
} from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";

const STATUS_CONFIG: { [key: string]: { label: string; color: string; icon: any } } = {
  rascunho: { label: "Rascunho", color: "bg-gray-100 text-gray-800", icon: FileText },
  pendente_envio: { label: "Pendente Envio", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  enviado: { label: "Enviado", color: "bg-blue-100 text-blue-800", icon: Send },
  em_analise: { label: "Em Análise", color: "bg-purple-100 text-purple-800", icon: AlertCircle },
  deferido: { label: "Deferido", color: "bg-green-100 text-green-800", icon: CheckCircle },
  deferido_parcial: { label: "Deferido Parcial", color: "bg-lime-100 text-lime-800", icon: CheckCircle },
  indeferido: { label: "Indeferido", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelado: { label: "Cancelado", color: "bg-gray-100 text-gray-500", icon: XCircle },
};

const PRIORIDADE_CONFIG: { [key: string]: { label: string; color: string } } = {
  baixa: { label: "Baixa", color: "bg-gray-100 text-gray-600" },
  media: { label: "Média", color: "bg-blue-100 text-blue-600" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-600" },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-600" },
};

export default function RecursosGlosa() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  
  // Estados de filtro
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [convenioFiltro, setConvenioFiltro] = useState<string>("todos");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState<string>("todos");
  const [page, setPage] = useState(1);
  
  // Estados de modal
  const [showNovoRecurso, setShowNovoRecurso] = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [recursoSelecionado, setRecursoSelecionado] = useState<number | null>(null);
  const [showEnviar, setShowEnviar] = useState(false);
  const [showResposta, setShowResposta] = useState(false);
  
  // Estados do formulário
  const [novoRecurso, setNovoRecurso] = useState({
    convenioId: "",
    codigoProcedimento: "",
    descricaoProcedimento: "",
    guiaNumero: "",
    pacienteNome: "",
    valorCobrado: "",
    valorGlosado: "",
    motivoGlosaConvenio: "",
    justificativaRecurso: "",
    prioridade: "media" as "baixa" | "media" | "alta" | "urgente",
  });
  
  const [protocoloEnvio, setProtocoloEnvio] = useState("");
  const [resposta, setResposta] = useState({
    status: "deferido" as "deferido" | "deferido_parcial" | "indeferido",
    respostaConvenio: "",
    valorRecuperado: "",
  });
  const [novoComentario, setNovoComentario] = useState("");

  // Queries
  const { data: recursosData, isLoading, refetch } = trpc.recursos.list.useQuery({
    convenioId: convenioFiltro !== "todos" ? parseInt(convenioFiltro) : undefined,
    status: statusFiltro !== "todos" ? statusFiltro : undefined,
    prioridade: prioridadeFiltro !== "todos" ? prioridadeFiltro : undefined,
    busca: busca || undefined,
    page,
    limit: 15,
  });

  const { data: estatisticas } = trpc.recursos.estatisticas.useQuery();
  const { data: convenios } = trpc.convenios.list.useQuery({ ativo: "sim" });
  const { data: recursoDetalhes, refetch: refetchDetalhes } = trpc.recursos.byId.useQuery(
    { id: recursoSelecionado! },
    { enabled: !!recursoSelecionado }
  );

  // Mutations
  const createMutation = trpc.recursos.create.useMutation({
    onSuccess: () => {
      toast.success("Recurso criado com sucesso!");
      setShowNovoRecurso(false);
      resetNovoRecurso();
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar recurso: " + error.message);
    },
  });

  const enviarMutation = trpc.recursos.enviar.useMutation({
    onSuccess: () => {
      toast.success("Recurso enviado com sucesso!");
      setShowEnviar(false);
      setProtocoloEnvio("");
      refetch();
      refetchDetalhes();
    },
    onError: (error) => {
      toast.error("Erro ao enviar recurso: " + error.message);
    },
  });

  const respostaMutation = trpc.recursos.registrarResposta.useMutation({
    onSuccess: () => {
      toast.success("Resposta registrada com sucesso!");
      setShowResposta(false);
      setResposta({ status: "deferido", respostaConvenio: "", valorRecuperado: "" });
      refetch();
      refetchDetalhes();
    },
    onError: (error) => {
      toast.error("Erro ao registrar resposta: " + error.message);
    },
  });

  const comentarioMutation = trpc.recursos.addHistorico.useMutation({
    onSuccess: () => {
      toast.success("Comentário adicionado!");
      setNovoComentario("");
      refetchDetalhes();
    },
  });

  const deleteMutation = trpc.recursos.delete.useMutation({
    onSuccess: () => {
      toast.success("Recurso excluído!");
      refetch();
    },
  });

  const resetNovoRecurso = () => {
    setNovoRecurso({
      convenioId: "",
      codigoProcedimento: "",
      descricaoProcedimento: "",
      guiaNumero: "",
      pacienteNome: "",
      valorCobrado: "",
      valorGlosado: "",
      motivoGlosaConvenio: "",
      justificativaRecurso: "",
      prioridade: "media",
    });
  };

  const handleCriarRecurso = () => {
    if (!novoRecurso.convenioId || !novoRecurso.justificativaRecurso) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    createMutation.mutate({
      ...novoRecurso,
      convenioId: parseInt(novoRecurso.convenioId),
    });
  };

  const handleEnviarRecurso = () => {
    if (!recursoSelecionado) return;
    enviarMutation.mutate({
      id: recursoSelecionado,
      protocoloRecurso: protocoloEnvio || undefined,
    });
  };

  const handleRegistrarResposta = () => {
    if (!recursoSelecionado || !resposta.respostaConvenio) {
      toast.error("Preencha a resposta do convênio");
      return;
    }
    respostaMutation.mutate({
      id: recursoSelecionado,
      ...resposta,
    });
  };

  const handleAddComentario = () => {
    if (!recursoSelecionado || !novoComentario) return;
    comentarioMutation.mutate({
      recursoId: recursoSelecionado,
      tipo: "comentario",
      descricao: novoComentario,
    });
  };

  const formatCurrency = (value: string | number | null) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    if (!num) return "R$ 0,00";
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handleExportExcel = () => {
    if (!recursosData?.recursos) return;
    const data = recursosData.recursos.map((r) => ({
      "Convênio": r.convenioNome,
      "Código": r.codigoProcedimento || "-",
      "Descrição": r.descricaoProcedimento || "-",
      "Guia": r.guiaNumero || "-",
      "Paciente": r.pacienteNome || "-",
      "Valor Cobrado": r.valorCobrado || "0",
      "Valor Glosado": r.valorGlosado || "0",
      "Valor Recuperado": r.valorRecuperado || "0",
      "Status": STATUS_CONFIG[r.status]?.label || r.status,
      "Prioridade": PRIORIDADE_CONFIG[r.prioridade]?.label || r.prioridade,
      "Protocolo": r.protocoloRecurso || "-",
      "Data Criação": formatDate(r.createdAt),
      "Data Envio": formatDate(r.dataEnvioRecurso),
      "Data Resposta": formatDate(r.dataResposta),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Recursos");
    XLSX.writeFile(wb, `recursos_glosa_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const totalPages = Math.ceil((recursosData?.total || 0) / 15);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recursos de Glosa</h1>
            <p className="text-muted-foreground">
              Gerencie contestações e acompanhe o status de cada recurso
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={showNovoRecurso} onOpenChange={setShowNovoRecurso}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Recurso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Recurso de Glosa</DialogTitle>
                  <DialogDescription>
                    Registre uma nova contestação para enviar ao convênio
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Convênio *</Label>
                      <Select
                        value={novoRecurso.convenioId}
                        onValueChange={(v) => setNovoRecurso({ ...novoRecurso, convenioId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {convenios?.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={novoRecurso.prioridade}
                        onValueChange={(v: any) => setNovoRecurso({ ...novoRecurso, prioridade: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Código do Procedimento</Label>
                      <Input
                        value={novoRecurso.codigoProcedimento}
                        onChange={(e) => setNovoRecurso({ ...novoRecurso, codigoProcedimento: e.target.value })}
                        placeholder="Ex: 10101039"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Número da Guia</Label>
                      <Input
                        value={novoRecurso.guiaNumero}
                        onChange={(e) => setNovoRecurso({ ...novoRecurso, guiaNumero: e.target.value })}
                        placeholder="Ex: 123456"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição do Procedimento</Label>
                    <Input
                      value={novoRecurso.descricaoProcedimento}
                      onChange={(e) => setNovoRecurso({ ...novoRecurso, descricaoProcedimento: e.target.value })}
                      placeholder="Ex: Consulta em pronto socorro"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Paciente</Label>
                    <Input
                      value={novoRecurso.pacienteNome}
                      onChange={(e) => setNovoRecurso({ ...novoRecurso, pacienteNome: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor Cobrado (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoRecurso.valorCobrado}
                        onChange={(e) => setNovoRecurso({ ...novoRecurso, valorCobrado: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Glosado (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={novoRecurso.valorGlosado}
                        onChange={(e) => setNovoRecurso({ ...novoRecurso, valorGlosado: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Motivo da Glosa (informado pelo convênio)</Label>
                    <Textarea
                      value={novoRecurso.motivoGlosaConvenio}
                      onChange={(e) => setNovoRecurso({ ...novoRecurso, motivoGlosaConvenio: e.target.value })}
                      placeholder="Descreva o motivo informado pelo convênio para a glosa"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Justificativa do Recurso *</Label>
                    <Textarea
                      value={novoRecurso.justificativaRecurso}
                      onChange={(e) => setNovoRecurso({ ...novoRecurso, justificativaRecurso: e.target.value })}
                      placeholder="Descreva a justificativa para contestar a glosa"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNovoRecurso(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCriarRecurso} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Criando..." : "Criar Recurso"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Recursos</p>
                  <p className="text-2xl font-bold">{estatisticas?.total || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">{estatisticas?.pendentes || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Análise</p>
                  <p className="text-2xl font-bold text-purple-600">{estatisticas?.emAnalise || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Deferidos</p>
                  <p className="text-2xl font-bold text-green-600">{estatisticas?.deferidos || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Recuperação</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {(estatisticas?.taxaRecuperacao || 0).toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código, guia, paciente..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={convenioFiltro} onValueChange={setConvenioFiltro}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Convênio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos convênios</SelectItem>
                  {convenios?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={prioridadeFiltro} onValueChange={setPrioridadeFiltro}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {Object.entries(PRIORIDADE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Recursos */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Recursos</CardTitle>
            <CardDescription>
              {recursosData?.total || 0} recursos encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recursosData?.recursos && recursosData.recursos.length > 0 ? (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead>Guia</TableHead>
                        <TableHead className="text-right">Valor Glosado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recursosData.recursos.map((recurso) => {
                        const statusConfig = STATUS_CONFIG[recurso.status] || STATUS_CONFIG.rascunho;
                        const prioridadeConfig = PRIORIDADE_CONFIG[recurso.prioridade] || PRIORIDADE_CONFIG.media;
                        const StatusIcon = statusConfig.icon;
                        return (
                          <TableRow key={recurso.id}>
                            <TableCell className="font-medium">{recurso.convenioNome}</TableCell>
                            <TableCell>
                              <div>
                                <span className="font-mono text-sm">{recurso.codigoProcedimento || "-"}</span>
                                {recurso.descricaoProcedimento && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {recurso.descricaoProcedimento}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{recurso.guiaNumero || "-"}</TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              {formatCurrency(recurso.valorGlosado)}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusConfig.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={prioridadeConfig.color}>
                                {prioridadeConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(recurso.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setRecursoSelecionado(recurso.id);
                                    setShowDetalhes(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {recurso.status === "rascunho" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600"
                                    onClick={() => {
                                      if (confirm("Excluir este recurso?")) {
                                        deleteMutation.mutate({ id: recurso.id });
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-4 text-sm">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum recurso encontrado</p>
                <Button className="mt-4" onClick={() => setShowNovoRecurso(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Recurso
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Recurso</DialogTitle>
            </DialogHeader>
            {recursoDetalhes ? (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="justificativa">Justificativa</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>
                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Convênio</Label>
                      <p className="font-medium">{recursoDetalhes.convenioNome}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <Badge className={STATUS_CONFIG[recursoDetalhes.status]?.color || ""}>
                        {STATUS_CONFIG[recursoDetalhes.status]?.label || recursoDetalhes.status}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Código</Label>
                      <p className="font-mono">{recursoDetalhes.codigoProcedimento || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Guia</Label>
                      <p>{recursoDetalhes.guiaNumero || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Paciente</Label>
                      <p>{recursoDetalhes.pacienteNome || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Protocolo</Label>
                      <p>{recursoDetalhes.protocoloRecurso || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Valor Cobrado</Label>
                      <p className="font-medium">{formatCurrency(recursoDetalhes.valorCobrado)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Valor Glosado</Label>
                      <p className="font-medium text-red-600">{formatCurrency(recursoDetalhes.valorGlosado)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Valor Recuperado</Label>
                      <p className="font-medium text-green-600">{formatCurrency(recursoDetalhes.valorRecuperado)}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Data Envio</Label>
                      <p>{formatDate(recursoDetalhes.dataEnvioRecurso)}</p>
                    </div>
                  </div>
                  {recursoDetalhes.respostaConvenio && (
                    <div>
                      <Label className="text-muted-foreground">Resposta do Convênio</Label>
                      <p className="mt-1 p-3 bg-muted rounded-md">{recursoDetalhes.respostaConvenio}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    {(recursoDetalhes.status === "rascunho" || recursoDetalhes.status === "pendente_envio") && (
                      <Button onClick={() => setShowEnviar(true)}>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar Recurso
                      </Button>
                    )}
                    {(recursoDetalhes.status === "enviado" || recursoDetalhes.status === "em_analise") && (
                      <Button onClick={() => setShowResposta(true)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Registrar Resposta
                      </Button>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="justificativa" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Motivo da Glosa (Convênio)</Label>
                    <p className="mt-1 p-3 bg-red-50 rounded-md text-red-800">
                      {recursoDetalhes.motivoGlosaConvenio || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Justificativa do Recurso</Label>
                    <p className="mt-1 p-3 bg-blue-50 rounded-md text-blue-800">
                      {recursoDetalhes.justificativaRecurso}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="historico" className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Adicionar comentário..."
                        value={novoComentario}
                        onChange={(e) => setNovoComentario(e.target.value)}
                      />
                      <Button onClick={handleAddComentario} disabled={!novoComentario}>
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {recursoDetalhes.historico?.map((h: any) => (
                        <div key={h.id} className="border-l-2 border-blue-200 pl-4 py-2">
                          <div className="flex justify-between items-start">
                            <Badge variant="outline" className="text-xs">
                              {h.tipo}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(h.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm">{h.descricao}</p>
                          {h.statusAnterior && h.statusNovo && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {STATUS_CONFIG[h.statusAnterior]?.label} → {STATUS_CONFIG[h.statusNovo]?.label}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : (
              <Skeleton className="h-[400px] w-full" />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Enviar */}
        <Dialog open={showEnviar} onOpenChange={setShowEnviar}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Recurso</DialogTitle>
              <DialogDescription>
                Registre o envio do recurso ao convênio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Número do Protocolo (opcional)</Label>
                <Input
                  value={protocoloEnvio}
                  onChange={(e) => setProtocoloEnvio(e.target.value)}
                  placeholder="Ex: PROT-2024-001234"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEnviar(false)}>
                Cancelar
              </Button>
              <Button onClick={handleEnviarRecurso} disabled={enviarMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {enviarMutation.isPending ? "Enviando..." : "Confirmar Envio"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Resposta */}
        <Dialog open={showResposta} onOpenChange={setShowResposta}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Resposta do Convênio</DialogTitle>
              <DialogDescription>
                Informe o resultado da análise do recurso
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Resultado</Label>
                <Select
                  value={resposta.status}
                  onValueChange={(v: any) => setResposta({ ...resposta, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deferido">Deferido (Aceito)</SelectItem>
                    <SelectItem value="deferido_parcial">Deferido Parcialmente</SelectItem>
                    <SelectItem value="indeferido">Indeferido (Negado)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(resposta.status === "deferido" || resposta.status === "deferido_parcial") && (
                <div className="space-y-2">
                  <Label>Valor Recuperado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={resposta.valorRecuperado}
                    onChange={(e) => setResposta({ ...resposta, valorRecuperado: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Resposta do Convênio *</Label>
                <Textarea
                  value={resposta.respostaConvenio}
                  onChange={(e) => setResposta({ ...resposta, respostaConvenio: e.target.value })}
                  placeholder="Descreva a resposta recebida do convênio"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResposta(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegistrarResposta} disabled={respostaMutation.isPending}>
                {respostaMutation.isPending ? "Salvando..." : "Registrar Resposta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
