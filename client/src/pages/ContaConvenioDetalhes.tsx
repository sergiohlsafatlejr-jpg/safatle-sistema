import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  ArrowLeft,
  Download, 
  RefreshCw, 
  Calendar, 
  FileSpreadsheet,
  CreditCard,
  Hash,
  User,
  DollarSign,
  FileText,
  Receipt,
  Package,
  Pill,
  Syringe,
  Bed,
  Stethoscope,
  Activity,
  Shield,
  Key,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  BarChart3,
  Loader2,
  Eye,
  ArrowUpDown,
  ShieldAlert,
  Info,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  MessageSquare
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import * as XLSX from "xlsx";
import { toast } from "sonner";

// Formatar valor em reais
const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
};

// Formatar data
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
};

// Ícones por tipo de item
const getTipoIcon = (tipo: string) => {
  const tipoLower = (tipo || "").toLowerCase();
  if (tipoLower.includes("medicamento") || tipoLower.includes("med")) return Pill;
  if (tipoLower.includes("material") || tipoLower.includes("mat")) return Package;
  if (tipoLower.includes("diária") || tipoLower.includes("diaria")) return Bed;
  if (tipoLower.includes("taxa")) return Receipt;
  if (tipoLower.includes("procedimento") || tipoLower.includes("proc")) return Stethoscope;
  if (tipoLower.includes("exame")) return Activity;
  if (tipoLower.includes("sadt")) return Syringe;
  return FileText;
};

// Cores por tipo de item
const getTipoColor = (tipo: string) => {
  const tipoLower = (tipo || "").toLowerCase();
  if (tipoLower.includes("medicamento") || tipoLower.includes("med")) return "bg-green-100 text-green-800";
  if (tipoLower.includes("material") || tipoLower.includes("mat")) return "bg-blue-100 text-blue-800";
  if (tipoLower.includes("diária") || tipoLower.includes("diaria")) return "bg-purple-100 text-purple-800";
  if (tipoLower.includes("taxa")) return "bg-yellow-100 text-yellow-800";
  if (tipoLower.includes("procedimento") || tipoLower.includes("proc")) return "bg-red-100 text-red-800";
  if (tipoLower.includes("exame")) return "bg-cyan-100 text-cyan-800";
  if (tipoLower.includes("sadt")) return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-800";
};

// Badge de status
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "conforme":
      return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Conforme</Badge>;
    case "divergente":
      return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" />Divergente</Badge>;
    case "revisado":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Eye className="h-3 w-3 mr-1" />Revisado</Badge>;
    default:
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  }
};

// Badge de severidade
const SeveridadeBadge = ({ severidade }: { severidade: string }) => {
  switch (severidade) {
    case "critico":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Crítico</Badge>;
    case "alerta":
      return <Badge className="bg-orange-100 text-orange-800 border-orange-200"><AlertTriangle className="h-3 w-3 mr-1" />Alerta</Badge>;
    default:
      return <Badge variant="outline"><Info className="h-3 w-3 mr-1" />Info</Badge>;
  }
};

export default function ContaConvenioDetalhes() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  
  const numeroConta = params.get("numeroConta") || "";
  const estabelecimentoId = parseInt(params.get("estabelecimentoId") || "0") || estabelecimentoAtual?.id || 0;

  const [activeTab, setActiveTab] = useState("itens");
  const [tipoFiltro, setTipoFiltro] = useState<string | null>(null);
  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean;
    div: any;
    acao: "aceitar" | "rejeitar" | "ajustar";
  }>({ open: false, div: null, acao: "aceitar" });
  const [feedbackObs, setFeedbackObs] = useState("");
  const [feedbackValor, setFeedbackValor] = useState("");

  // Buscar itens da conta na nova tabela
  const { data: itensData, isLoading, refetch } = trpc.contasConvenio.listarItens.useQuery(
    {
      numeroConta,
      estabelecimentoId,
      tipoItem: tipoFiltro || undefined,
    },
    { enabled: !!numeroConta && !!estabelecimentoId }
  );

  // Buscar divergências
  const { data: divergenciasData, isLoading: isLoadingDiv } = trpc.contasConvenio.getDivergencias.useQuery(
    {
      numeroConta,
      estabelecimentoId,
    },
    { enabled: !!numeroConta && !!estabelecimentoId }
  );

  // Mutation para registrar feedback
  const feedbackMutation = trpc.contasConvenio.registrarFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback registrado com sucesso!");
      setFeedbackDialog({ open: false, div: null, acao: "aceitar" });
      setFeedbackObs("");
      setFeedbackValor("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFeedback = (div: any, acao: "aceitar" | "rejeitar" | "ajustar") => {
    if (acao === "aceitar") {
      // Aceitar direto sem dialog
      feedbackMutation.mutate({
        numeroConta,
        estabelecimentoId,
        padraoId: div.padraoId,
        codigoItem: div.codigoItem,
        tipoDivergencia: div.tipo,
        acao: "aceitar",
      });
    } else {
      // Abrir dialog para rejeitar ou ajustar
      setFeedbackDialog({ open: true, div, acao });
      setFeedbackObs("");
      setFeedbackValor(div.valorEsperado?.toString() || "");
    }
  };

  const submitFeedback = () => {
    if (!feedbackDialog.div) return;
    feedbackMutation.mutate({
      numeroConta,
      estabelecimentoId,
      padraoId: feedbackDialog.div.padraoId,
      codigoItem: feedbackDialog.div.codigoItem,
      tipoDivergencia: feedbackDialog.div.tipo,
      acao: feedbackDialog.div.acao === "ajustar" ? "ajustar" : "rejeitar",
      observacao: feedbackObs || undefined,
      valorSugerido: feedbackDialog.acao === "ajustar" ? feedbackValor : undefined,
    });
  };

  // Mutation para comparar com padrões
  const compararMutation = trpc.contasConvenio.compararComPadroes.useMutation({
    onSuccess: (result) => {
      if (result.statusGeral === "conforme") {
        toast.success(`Conta conforme! ${result.totalItensAnalisados} itens analisados.`);
      } else {
        toast.warning(`${result.totalDivergencias} divergência(s) encontrada(s)`);
      }
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Dados da conta (primeiro item para info geral)
  const primeiroItem = itensData?.items?.[0];
  const resumoGeral = itensData?.resumoGeral;
  const resumoPorTipo = itensData?.resumoPorTipo || [];

  // Exportar para Excel
  const handleExportExcel = () => {
    if (!itensData?.items?.length) return;

    const data = itensData.items.map((item: any) => ({
      "Nº Conta": item.numeroConta,
      "Tipo Item": item.tipoItem || "-",
      "Código": item.codigoItem || "-",
      "Descrição": item.descricaoItem || "-",
      "Setor": item.setor || "-",
      "Quantidade": parseFloat(item.quantidade || "1"),
      "Valor Unitário": parseFloat(item.valorUnitario || "0"),
      "Valor Total": parseFloat(item.valorTotal || "0"),
      "Data Execução": formatDate(item.dataExecucao),
      "Status": item.statusAnalise || "pendente",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Itens");
    XLSX.writeFile(wb, `conta_${numeroConta}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Voltar para lista (preserva filtros via history)
  const handleVoltar = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/conta-convenio");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleVoltar}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Conta {numeroConta}</h1>
              <p className="text-muted-foreground">
                {primeiroItem?.convenio || "Convênio não identificado"} | 
                Paciente: {primeiroItem?.pacienteNome || "-"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                compararMutation.mutate({ numeroConta, estabelecimentoId });
              }}
              disabled={compararMutation.isPending}
            >
              {compararMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Comparar com Padrões
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button 
              size="sm" 
              onClick={handleExportExcel}
              disabled={!itensData?.items?.length}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Número da Conta</p>
                  <p className="font-semibold font-mono">{numeroConta}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Convênio</p>
                  <p className="font-semibold">{primeiroItem?.convenio || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="font-semibold">{primeiroItem?.pacienteNome || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Carteirinha</p>
                  <p className="font-semibold">{primeiroItem?.carteiraBeneficiario || "-"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Data Execução</p>
                  <p className="font-semibold">{formatDate(primeiroItem?.dataExecucao)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Origem</p>
                  <p className="font-semibold">
                    {primeiroItem?.origem === "BANCO_CLIENTE" ? "Banco Hospital" : primeiroItem?.origem || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-semibold text-green-600">{formatCurrency(resumoGeral?.valorTotal)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="font-semibold">{resumoGeral?.totalItens || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs por Tipo */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Valores por Tipo de Item
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card "Todos" */}
            <Card 
              className={`cursor-pointer transition-all ${!tipoFiltro ? "ring-2 ring-primary" : "hover:shadow-md"}`}
              onClick={() => setTipoFiltro(null)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Todos</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(resumoGeral?.valorTotal)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {resumoGeral?.totalItens || 0} itens
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-gray-100 text-gray-800">
                    <FileText className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {resumoPorTipo.map((kpi: any) => {
              const TipoIcon = getTipoIcon(kpi.tipoItem);
              const tipoColor = getTipoColor(kpi.tipoItem);
              const isActive = tipoFiltro === kpi.tipoItem;
              
              return (
                <Card 
                  key={kpi.tipoItem} 
                  className={`cursor-pointer transition-all ${isActive ? "ring-2 ring-primary" : "hover:shadow-md"}`}
                  onClick={() => setTipoFiltro(isActive ? null : kpi.tipoItem)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{kpi.tipoItem || "Outros"}</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(kpi.valorTotal)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {kpi.totalItens} {kpi.totalItens === 1 ? "item" : "itens"}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${tipoColor}`}>
                        <TipoIcon className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Totais de Análise */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="text-3xl font-bold">{resumoGeral?.totalItens || 0}</p>
                </div>
                <FileText className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Conformes</p>
                  <p className="text-3xl font-bold text-green-600">{Number(resumoGeral?.totalConformes || 0)}</p>
                </div>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Divergentes</p>
                  <p className="text-3xl font-bold text-red-600">{Number(resumoGeral?.totalDivergentes || 0)}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-3xl font-bold text-emerald-600">{formatCurrency(resumoGeral?.valorTotal)}</p>
                </div>
                <DollarSign className="h-10 w-10 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Itens e Divergências */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="itens" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Itens ({itensData?.items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="divergencias" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Divergências ({divergenciasData?.divergencias?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Itens */}
          <TabsContent value="itens">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Itens da Conta {tipoFiltro && `- ${tipoFiltro}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !itensData?.items?.length ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhum item encontrado para esta conta</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Setor</TableHead>
                          <TableHead>Data Exec.</TableHead>
                          <TableHead className="text-right">Qtd</TableHead>
                          <TableHead className="text-right">Valor Unit.</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensData.items.map((item: any, index: number) => {
                          const TipoIcon = getTipoIcon(item.tipoItem);
                          const tipoColor = getTipoColor(item.tipoItem);
                          const hasDivergencias = item.divergencias && (item.divergencias as any[]).length > 0;
                          
                          return (
                            <TableRow key={item.id || index} className={hasDivergencias ? "bg-red-50/50" : ""}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={tipoColor}>
                                  <TipoIcon className="h-3 w-3 mr-1" />
                                  {item.tipoItem || "-"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{item.codigoItem || "-"}</TableCell>
                              <TableCell className="max-w-xs truncate" title={item.descricaoItem}>
                                {item.descricaoItem || "-"}
                              </TableCell>
                              <TableCell>
                                {item.setor ? (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {item.setor}
                                  </Badge>
                                ) : "-"}
                              </TableCell>
                              <TableCell>{formatDate(item.dataExecucao)}</TableCell>
                              <TableCell className="text-right">{item.quantidade || 1}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600">
                                {formatCurrency(item.valorTotal)}
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={item.statusAnalise || "pendente"} />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Divergências */}
          <TabsContent value="divergencias">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Divergências Encontradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingDiv ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : !divergenciasData?.divergencias?.length ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma divergência encontrada</h3>
                    <p className="text-muted-foreground mb-4">
                      Execute a comparação com padrões para verificar a conta.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => compararMutation.mutate({ numeroConta, estabelecimentoId })}
                      disabled={compararMutation.isPending}
                    >
                      {compararMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <BarChart3 className="mr-2 h-4 w-4" />
                      )}
                      Comparar com Padrões
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Resumo de Divergências */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">Total Divergências</p>
                              <p className="text-2xl font-bold text-red-600">{divergenciasData.resumo.total}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-red-200">
                        <CardContent className="p-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Por Severidade</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(divergenciasData.resumo.porSeveridade).map(([sev, count]) => (
                                <div key={sev} className="flex items-center gap-1">
                                  <SeveridadeBadge severidade={sev} />
                                  <span className="text-sm font-medium">({count as number})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-orange-200">
                        <CardContent className="p-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Por Tipo</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(divergenciasData.resumo.porTipo).map(([tipo, count]) => (
                                <Badge key={tipo} variant="outline" className="text-xs">
                                  {tipo}: {count as number}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Tabela de Divergências */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Severidade</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Descrição da Divergência</TableHead>
                            <TableHead className="text-right">Valor Cobrado</TableHead>
                            <TableHead className="text-right">Valor Esperado</TableHead>
                            <TableHead className="text-right">Diferença</TableHead>
                            <TableHead className="text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {divergenciasData.divergencias.map((div: any, index: number) => (
                            <TableRow key={index} className={div.severidade === "critico" ? "bg-red-50/50" : ""}>
                              <TableCell>
                                <SeveridadeBadge severidade={div.severidade} />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {div.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-mono text-sm">{div.codigoItem || "-"}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={div.descricaoItem}>
                                    {div.descricaoItem || "-"}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="text-sm">{div.mensagem || div.descricao || "-"}</p>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {div.valorCobrado != null ? formatCurrency(div.valorCobrado) : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {div.valorEsperado != null ? formatCurrency(div.valorEsperado) : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {div.diferenca != null ? (
                                  <span className={parseFloat(div.diferenca) > 0 ? "text-red-600" : "text-green-600"}>
                                    {formatCurrency(div.diferenca)}
                                  </span>
                                ) : "-"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                          onClick={() => handleFeedback(div, "aceitar")}
                                          disabled={feedbackMutation.isPending}
                                        >
                                          <ThumbsUp className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Aceitar divergência (padrão correto)</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => handleFeedback(div, "rejeitar")}
                                          disabled={feedbackMutation.isPending}
                                        >
                                          <ThumbsDown className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Rejeitar divergência (falso positivo)</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                          onClick={() => handleFeedback(div, "ajustar")}
                                          disabled={feedbackMutation.isPending}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Ajustar valor esperado</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Feedback */}
        <Dialog open={feedbackDialog.open} onOpenChange={(open) => setFeedbackDialog(prev => ({ ...prev, open }))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {feedbackDialog.acao === "rejeitar" ? "Rejeitar Divergência" : "Ajustar Valor"}
              </DialogTitle>
              <DialogDescription>
                {feedbackDialog.acao === "rejeitar"
                  ? "Informe o motivo da rejeição. Isso ajudará a refinar os padrões de cobrança."
                  : "Informe o valor correto esperado. Isso ajustará o padrão de cobrança."}
              </DialogDescription>
            </DialogHeader>

            {feedbackDialog.div && (
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg space-y-1">
                  <p className="text-sm"><strong>Item:</strong> {feedbackDialog.div.codigoItem} - {feedbackDialog.div.descricaoItem}</p>
                  <p className="text-sm"><strong>Tipo:</strong> {feedbackDialog.div.tipo}</p>
                  <p className="text-sm"><strong>Mensagem:</strong> {feedbackDialog.div.mensagem || feedbackDialog.div.descricao}</p>
                </div>

                {feedbackDialog.acao === "ajustar" && (
                  <div className="space-y-2">
                    <Label htmlFor="valor-sugerido">Valor Correto Esperado</Label>
                    <Input
                      id="valor-sugerido"
                      type="text"
                      value={feedbackValor}
                      onChange={(e) => setFeedbackValor(e.target.value)}
                      placeholder="Ex: 150.00"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="observacao">
                    {feedbackDialog.acao === "rejeitar" ? "Motivo da Rejeição" : "Observação"}
                  </Label>
                  <Textarea
                    id="observacao"
                    value={feedbackObs}
                    onChange={(e) => setFeedbackObs(e.target.value)}
                    placeholder={feedbackDialog.acao === "rejeitar"
                      ? "Ex: Este item é cobrado separadamente neste convênio..."
                      : "Ex: O valor correto conforme tabela do convênio é..."}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackDialog({ open: false, div: null, acao: "aceitar" })}>
                Cancelar
              </Button>
              <Button
                onClick={submitFeedback}
                disabled={feedbackMutation.isPending}
                variant={feedbackDialog.acao === "rejeitar" ? "destructive" : "default"}
              >
                {feedbackMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : feedbackDialog.acao === "rejeitar" ? (
                  <ThumbsDown className="mr-2 h-4 w-4" />
                ) : (
                  <Pencil className="mr-2 h-4 w-4" />
                )}
                {feedbackDialog.acao === "rejeitar" ? "Rejeitar" : "Salvar Ajuste"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
