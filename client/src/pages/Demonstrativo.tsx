import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  FileSpreadsheet, 
  Download,
  Loader2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  TrendingDown,
  TrendingUp,
  Info,
  Banknote,
  Layers2,
  Hash,
  User,
  CreditCard
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Gerar lista de competências no formato MM/AAAA
const getCompetencias = () => {
  const competencias = [];
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  
  for (let i = 0; i < 24; i++) {
    let mes = mesAtual - i;
    let ano = anoAtual;
    
    while (mes <= 0) {
      mes += 12;
      ano -= 1;
    }
    
    const mesStr = String(mes).padStart(2, '0');
    const value = `${mes}-${ano}`;
    const label = `${mesStr}/${ano}`;
    
    competencias.push({ value, label, mes, ano });
  }
  
  return competencias;
};

export default function Demonstrativo() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioId, setConvenioId] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");
  const [buscaDebounced, setBuscaDebounced] = useState<string>("");
  const [page, setPage] = useState(1);
  const [itemDetalhe, setItemDetalhe] = useState<any>(null);
  const pageSize = 50;

  // Inicializar com mês anterior
  const getCompetenciaInicial = () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    if (mesAtual === 1) {
      return `12-${hoje.getFullYear() - 1}`;
    }
    return `${mesAtual - 1}-${hoje.getFullYear()}`;
  };

  const [competencia, setCompetencia] = useState<string>(getCompetenciaInicial());

  // Extrair mês e ano da competência selecionada
  const { mesReferencia, anoReferencia } = useMemo(() => {
    if (!competencia || competencia === "all") {
      return { mesReferencia: undefined, anoReferencia: undefined };
    }
    const [mes, ano] = competencia.split("-").map(Number);
    return { mesReferencia: mes, anoReferencia: ano };
  }, [competencia]);

  // Memoize competências
  const competencias = useMemo(() => getCompetencias(), []);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [busca]);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [convenioId, filtroStatus, competencia]);

  // Buscar convênios
  const { data: convenios } = trpc.convenios.list.useQuery({});

  // Buscar dados do demonstrativo (tabela demonstrativo - dados de Excel e XML)
  const { data: contasData, isLoading: isLoadingContas, refetch } = trpc.demonstrativo.contas.useQuery(
    { 
      convenioId: convenioId ? parseInt(convenioId) : undefined, 
      estabelecimentoId: estabelecimentoAtual?.id,
      page, 
      pageSize,
      search: buscaDebounced || undefined,
      statusGlosa: filtroStatus !== "todos" ? filtroStatus as "pago" | "glosado" | "parcial" : undefined,
      mesReferencia,
      anoReferencia,
    },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar resumo do demonstrativo
  const { data: resumo } = trpc.demonstrativo.resumo.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id,
      convenioId: convenioId ? parseInt(convenioId) : undefined,
      mesReferencia,
      anoReferencia,
    },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar itens de uma guia específica quando dialog está aberto
  const { data: itensGuia, isLoading: isLoadingItens } = trpc.demonstrativo.itensPorGuia.useQuery(
    {
      numeroGuia: itemDetalhe?.numeroGuia || "",
      protocolo: itemDetalhe?.protocolo || undefined,
      convenioId: itemDetalhe?.convenioId || undefined,
      arquivoId: itemDetalhe?.arquivoId || undefined,
    },
    { enabled: !!itemDetalhe?.numeroGuia }
  );

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === "string" ? parseFloat(value) : (value || 0);
    if (isNaN(num)) return "R$ 0,00";
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | Date | null | undefined) => {
    if (!dateStr) return "-";
    try {
      const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
      return d.toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  const handleExportExcel = () => {
    if (!contasData?.items || contasData.items.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const excelData = (contasData.items as any[]).map((conta: any) => {
      const valorPago = parseFloat(conta.valorTotal || "0");
      const valorGlosado = parseFloat(conta.valorGlosado || "0");
      const valorInformado = parseFloat(conta.valorInformado || "0");
      
      let status = "Pago";
      if (valorGlosado > 0 && valorPago === 0) {
        status = "Glosado";
      } else if (valorGlosado > 0 && valorPago > 0) {
        status = "Parcial";
      }

      return {
        "Guia": conta.numeroGuia || "",
        "Protocolo": conta.protocolo || "",
        "Lote": conta.lotePrestador || "",
        "Carteirinha": conta.carteiraBeneficiario || "",
        "Paciente": conta.nomeBeneficiario || "",
        "Data Pagamento": formatDate(conta.dataPagamento),
        "Competência": formatDate(conta.dataReferencia),
        "Total Itens": conta.totalItens || 0,
        "Itens Glosados": conta.itensGlosados || 0,
        "Valor Informado": valorInformado,
        "Valor Pago": valorPago,
        "Valor Glosado": valorGlosado,
        "Origem": conta.origemTipo === "excel" ? "Excel" : "XML",
        "Status": status,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = Array(14).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws, "Demonstrativo");
    
    const convenio = convenios?.find((c: any) => c.id === parseInt(convenioId));
    const nomeArquivo = convenio?.nome || "demonstrativo";
    const competenciaLabel = competencias.find(c => c.value === competencia)?.label?.replace("/", "-") || "";
    XLSX.writeFile(wb, `${nomeArquivo}_demonstrativo_${competenciaLabel}.xlsx`);
    toast.success("Arquivo exportado com sucesso!");
  };

  const handleLimparFiltros = () => {
    setCompetencia("all");
    setFiltroStatus("todos");
    setBusca("");
    setConvenioId("");
  };

  const getStatusBadge = (conta: any) => {
    const valorGlosa = parseFloat(conta.valorGlosado || "0");
    const valorPago = parseFloat(conta.valorTotal || "0");

    if (valorGlosa > 0 && valorPago === 0) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Glosado</Badge>;
    } else if (valorGlosa > 0 && valorPago > 0) {
      return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600"><AlertCircle className="h-3 w-3" /> Parcial</Badge>;
    }
    return <Badge variant="outline" className="gap-1 border-green-500 text-green-600"><CheckCircle2 className="h-3 w-3" /> Pago</Badge>;
  };

  const getItemStatusBadge = (item: any) => {
    const valorGlosa = parseFloat(item.valorGlosa || "0");
    const situacao = (item.situacaoItem || "").toUpperCase();

    if (situacao.includes("GLOS") || valorGlosa > 0) {
      return <Badge variant="destructive" className="text-xs">Glosado</Badge>;
    }
    return <Badge variant="outline" className="text-xs border-green-500 text-green-600">Pago</Badge>;
  };

  const totalPages = contasData?.totalPages || 1;
  const items = contasData?.items || [];

  // Verificar se há filtros ativos
  const temFiltrosAtivos = (competencia && competencia !== "all") || filtroStatus !== "todos" || busca || convenioId;

  // Competência selecionada label
  const competenciaSelecionada = competencias.find(c => c.value === competencia);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Demonstrativo de Retorno</h1>
            <p className="text-muted-foreground">
              Análise detalhada dos itens do demonstrativo com status de pagamento, glosas e totais
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Filtros do Demonstrativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioId} onValueChange={setConvenioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os convênios</SelectItem>
                    {convenios?.map((convenio: any) => (
                      <SelectItem key={convenio.id} value={String(convenio.id)}>
                        {convenio.nome} ({convenio.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Competência
                </label>
                <Select value={competencia} onValueChange={setCompetencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    {competencias.map((comp) => (
                      <SelectItem key={comp.value} value={comp.value}>
                        {comp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="glosado">Glosados</SelectItem>
                    <SelectItem value="parcial">Parciais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Busca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Guia, paciente, carteirinha..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleExportExcel} disabled={!items.length}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              {temFiltrosAtivos && (
                <Button variant="outline" onClick={handleLimparFiltros}>
                  Limpar Filtros
                </Button>
              )}
            </div>

            {/* Indicador de período selecionado */}
            {competenciaSelecionada && competencia !== "all" && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Filtrando por competência: {competenciaSelecionada.label}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards de resumo */}
        {resumo && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "todos" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setFiltroStatus("todos")}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Total Contas</p>
                    <p className="text-xl font-bold">{Number(resumo.totalContas || 0).toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">{Number(resumo.totalItens || 0).toLocaleString("pt-BR")} itens</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Vl. Informado</p>
                    <p className="text-sm font-bold text-blue-600 truncate">{formatCurrency(resumo.valorTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "pago" ? "ring-2 ring-green-500" : ""}`}
              onClick={() => setFiltroStatus("pago")}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Vl. Pago</p>
                    <p className="text-sm font-bold text-emerald-600 truncate">{formatCurrency(resumo.valorPago)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "glosado" ? "ring-2 ring-red-500" : ""}`}
              onClick={() => setFiltroStatus("glosado")}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Vl. Glosado</p>
                    <p className="text-sm font-bold text-red-600 truncate">{formatCurrency(resumo.valorGlosado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">% Glosa</p>
                    <p className="text-sm font-bold text-indigo-600 truncate">
                      {resumo.valorTotal > 0 
                        ? `${((resumo.valorGlosado / resumo.valorTotal) * 100).toFixed(1)}%`
                        : resumo.valorPago > 0 
                          ? `${((resumo.valorGlosado / (resumo.valorPago + resumo.valorGlosado)) * 100).toFixed(1)}%`
                          : "0%"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de contas agrupadas por guia */}
        <Card>
          <CardContent className="pt-6">
            {isLoadingContas ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta encontrada</p>
                <p className="text-sm">Ajuste os filtros ou importe arquivos de retorno (Excel ou XML)</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead>Guia</TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Lote</TableHead>
                        <TableHead className="max-w-[180px]">Paciente</TableHead>
                        <TableHead>Carteirinha</TableHead>
                        <TableHead>Dt. Pagamento</TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead className="text-center">Itens</TableHead>
                        <TableHead className="text-right">Vl. Informado</TableHead>
                        <TableHead className="text-right">Vl. Pago</TableHead>
                        <TableHead className="text-right">Vl. Glosado</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((conta: any, idx: number) => {
                        const valorGlosa = parseFloat(conta.valorGlosado || "0");
                        return (
                          <TableRow 
                            key={`${conta.numeroGuia}-${conta.protocolo}-${conta.lotePrestador}-${idx}`} 
                            className={`${valorGlosa > 0 ? "bg-red-50/50 dark:bg-red-950/20" : ""} cursor-pointer hover:bg-muted/50`}
                            onClick={() => setItemDetalhe(conta)}
                          >
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setItemDetalhe(conta); }}>
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver detalhes</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-1">
                                {conta.numeroGuia || "-"}
                                {conta.isAltaAdministrativa && (
                                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-[10px] px-1 py-0">
                                    <Layers2 className="h-3 w-3 mr-0.5" />
                                    {conta.totalLotesGuia}L
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{conta.protocolo || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{conta.lotePrestador || "-"}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-sm">{conta.nomeBeneficiario || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{conta.carteiraBeneficiario || "-"}</TableCell>
                            <TableCell className="text-sm">{formatDate(conta.dataPagamento)}</TableCell>
                            <TableCell className="text-sm">{formatDate(conta.dataReferencia)}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-sm font-medium">{conta.totalItens}</span>
                                {conta.itensGlosados > 0 && (
                                  <span className="text-[10px] text-red-500">{conta.itensGlosados} glos.</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(conta.valorInformado)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-emerald-600 font-semibold">{formatCurrency(conta.valorTotal)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-red-600">{formatCurrency(conta.valorGlosado)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">
                                {conta.origemTipo === "excel" ? "Excel" : "XML"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(conta)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, contasData?.total || 0)} de {contasData?.total || 0} contas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de detalhes da conta (itens da guia) */}
      <Dialog open={!!itemDetalhe} onOpenChange={(open) => !open && setItemDetalhe(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Detalhes da Conta - Guia {itemDetalhe?.numeroGuia || ""}
            </DialogTitle>
          </DialogHeader>

          {itemDetalhe && (
            <div className="space-y-6">
              {/* Resumo da conta */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  RESUMO DA CONTA
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <DetailField label="Guia" value={itemDetalhe.numeroGuia} />
                  <DetailField label="Protocolo" value={itemDetalhe.protocolo} />
                  <DetailField label="Lote" value={itemDetalhe.lotePrestador} />
                  <DetailField label="Origem" value={itemDetalhe.origemTipo === "excel" ? "Excel" : "XML"} />
                  <DetailField label="Paciente" value={itemDetalhe.nomeBeneficiario} />
                  <DetailField label="Carteirinha" value={itemDetalhe.carteiraBeneficiario} />
                  <DetailField label="Data Pagamento" value={formatDate(itemDetalhe.dataPagamento)} />
                  <DetailField label="Competência" value={formatDate(itemDetalhe.dataReferencia)} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <DetailField label="Total Itens" value={itemDetalhe.totalItens} />
                  <DetailField label="Vl. Informado" value={formatCurrency(itemDetalhe.valorInformado)} highlight="blue" />
                  <DetailField label="Vl. Pago" value={formatCurrency(itemDetalhe.valorTotal)} highlight="green" />
                  <DetailField label="Vl. Glosado" value={formatCurrency(itemDetalhe.valorGlosado)} highlight="red" />
                </div>
              </div>

              {/* Itens da guia */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  ITENS DA CONTA ({itensGuia?.length || 0} itens)
                </h3>
                {isLoadingItens ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : itensGuia && itensGuia.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">Seq</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead className="max-w-[200px]">Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data Exec.</TableHead>
                          <TableHead className="text-center">Qtd</TableHead>
                          <TableHead className="text-right">Vl. Informado</TableHead>
                          <TableHead className="text-right">Vl. Pago</TableHead>
                          <TableHead className="text-right">Vl. Glosa</TableHead>
                          <TableHead>Cód. Glosa</TableHead>
                          <TableHead>Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensGuia.map((item: any, idx: number) => {
                          const temGlosa = parseFloat(item.valorGlosa || "0") > 0 || (item.situacaoItem || "").toUpperCase().includes("GLOS");
                          return (
                            <TableRow key={item.id || idx} className={temGlosa ? "bg-red-50/50 dark:bg-red-950/20" : ""}>
                              <TableCell className="text-xs text-muted-foreground">{item.sequencialItem || idx + 1}</TableCell>
                              <TableCell className="font-mono text-sm">{item.codigoItem || "-"}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-sm">{item.descricaoItem || "-"}</TableCell>
                              <TableCell>
                                {item.tipoLancamento ? (
                                  <Badge variant="secondary" className="text-xs">{item.tipoLancamento}</Badge>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-sm">{formatDate(item.dataExecucao)}</TableCell>
                              <TableCell className="text-center text-sm">{item.quantidade || "-"}</TableCell>
                              <TableCell className="text-right font-mono text-sm">{formatCurrency(item.valorInformado)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-emerald-600 font-semibold">{formatCurrency(item.valorPago)}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-red-600">{formatCurrency(item.valorGlosa)}</TableCell>
                              <TableCell className="text-sm">
                                {item.codigoGlosa ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                                          {item.codigoGlosa}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-[300px]">
                                        <p className="font-semibold">Glosa: {item.codigoGlosa}</p>
                                        <p className="text-sm">{item.erroTiss || "Sem descrição"}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {getItemStatusBadge(item)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    Nenhum item encontrado para esta guia
                  </div>
                )}

                {/* Totais da guia */}
                {itensGuia && itensGuia.length > 0 && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Itens</p>
                        <p className="text-lg font-bold">{itensGuia.length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Informado</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(itensGuia.reduce((acc: number, i: any) => acc + parseFloat(i.valorInformado || "0"), 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Pago</p>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatCurrency(itensGuia.reduce((acc: number, i: any) => acc + parseFloat(i.valorPago || "0"), 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Glosado</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(itensGuia.reduce((acc: number, i: any) => acc + parseFloat(i.valorGlosa || "0"), 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Componente auxiliar para exibir campos de detalhe
function DetailField({ label, value, highlight }: { label: string; value: any; highlight?: string }) {
  const displayValue = value === null || value === undefined || value === "" || value === "R$ 0,00" ? "-" : String(value);
  
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    indigo: "text-indigo-600",
    green: "text-emerald-600",
    red: "text-red-600",
    emerald: "text-emerald-700 font-bold",
  };

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${highlight && displayValue !== "-" ? colorMap[highlight] || "" : ""}`}>
        {displayValue}
      </p>
    </div>
  );
}
