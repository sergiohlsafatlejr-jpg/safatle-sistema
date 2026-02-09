import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Building2,
  TrendingDown,
  TrendingUp,
  Info,
  Banknote
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// Lista de meses em português
const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

// Gerar lista de anos (últimos 5 anos + ano atual)
const getAnos = () => {
  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let i = anoAtual; i >= anoAtual - 5; i--) {
    anos.push({ value: String(i), label: String(i) });
  }
  return anos;
};

export default function Demonstrativo() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioId, setConvenioId] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");
  const [buscaDebounced, setBuscaDebounced] = useState<string>("");
  const [page, setPage] = useState(1);
  const [mesReferencia, setMesReferencia] = useState<string>("");
  const [anoReferencia, setAnoReferencia] = useState<string>("");
  const [itemDetalhe, setItemDetalhe] = useState<any>(null);
  const pageSize = 50;

  // Memoize anos para evitar recriação a cada render
  const anos = useMemo(() => getAnos(), []);

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
  }, [convenioId, filtroStatus, mesReferencia, anoReferencia]);

  // Buscar convênios
  const { data: convenios, isLoading: isLoadingConvenios } = trpc.convenios.list.useQuery();

  // Buscar dados de recebimento_tiss
  const { data: recebimentoData, isLoading: isLoadingRecebimento, refetch } = trpc.recebimentoTiss.list.useQuery(
    { 
      convenioId: convenioId ? parseInt(convenioId) : undefined, 
      estabelecimentoId: estabelecimentoAtual?.id,
      page, 
      pageSize,
      search: buscaDebounced || undefined,
      statusGlosa: filtroStatus !== "todos" ? filtroStatus as "pago" | "glosado" | "parcial" : undefined,
      mesReferencia: mesReferencia ? parseInt(mesReferencia) : undefined,
      anoReferencia: anoReferencia ? parseInt(anoReferencia) : undefined,
    },
    { enabled: !!estabelecimentoAtual }
  );

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === "string" ? parseFloat(value) : (value || 0);
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return "-";
    }
  };

  const handleExportExcel = () => {
    if (!recebimentoData?.items || recebimentoData.items.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const excelData = (recebimentoData.items as any[]).map((item: any) => {
      const valorLiberado = parseFloat(item.valorLiberado || "0");
      const valorInformado = parseFloat(item.valorInformado || "0");
      const valorProcessado = parseFloat(item.valorProcessado || "0");
      const valorGlosado = parseFloat(item.valorGlosado || "0");
      const temGlosa = item.codigoGlosa && item.codigoGlosa !== '';
      
      let status = "Pago";
      if (temGlosa && valorLiberado === 0) {
        status = "Glosado";
      } else if (temGlosa) {
        status = "Parcial";
      }

      return {
        "Registro ANS": item.registroANS || "",
        "CNES": item.cnes || "",
        "Nº Demonstrativo": item.numeroDemonstrativo || "",
        "Data Emissão": formatDate(item.dataEmissao),
        "Protocolo": item.numeroProtocolo || "",
        "Data Protocolo": formatDate(item.dataProtocolo),
        "Lote": item.numeroLotePrestador || "",
        "Guia Prestador": item.numeroGuiaPrestador || "",
        "Guia Operadora": item.numeroGuiaOperadora || "",
        "Senha": item.senha || "",
        "Beneficiário": item.nomeBeneficiario || "",
        "Carteirinha": item.numeroCarteira || "",
        "Data Execução": formatDate(item.dataRealizacao),
        "Cód. Tabela": item.codigoTabela || "",
        "Código Item": item.codigoItem || "",
        "Descrição": item.descricaoItem || "",
        "Qtd Executada": item.quantidadeExecutada || "",
        "Valor Informado": valorInformado,
        "Valor Processado": valorProcessado,
        "Valor Liberado": valorLiberado,
        "Valor Glosado": valorGlosado,
        "Código Glosa": item.codigoGlosa || "",
        "Descrição Glosa": item.descricaoGlosa || "",
        "Glosa Guia Código": item.motivoGlosaGuiaCodigo || "",
        "Glosa Guia Descrição": item.motivoGlosaGuiaDescricao || "",
        "Glosa Protocolo Código": item.glosaProtocoloCodigo || "",
        "Glosa Protocolo Descrição": item.glosaProtocoloDescricao || "",
        "Valor Informado Guia": item.valorInformadoGuia || "",
        "Valor Processado Guia": item.valorProcessadoGuia || "",
        "Valor Liberado Guia": item.valorLiberadoGuia || "",
        "Valor Glosa Guia": item.valorGlosaGuia || "",
        "Data Pagamento": formatDate(item.dataPagamento),
        "Valor Final Receber": item.valorFinalReceber || "",
        "Status": status,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = Array(34).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(wb, ws, "Demonstrativo");
    
    const convenio = convenios?.find((c: any) => c.id === parseInt(convenioId));
    const nomeArquivo = convenio?.nome || "demonstrativo";
    const periodoSuffix = mesReferencia && anoReferencia ? `_${mesReferencia}_${anoReferencia}` : "";
    XLSX.writeFile(wb, `${nomeArquivo}_demonstrativo${periodoSuffix}.xlsx`);
    toast.success("Arquivo exportado com sucesso!");
  };

  const handleLimparFiltros = () => {
    setMesReferencia("");
    setAnoReferencia("");
    setFiltroStatus("todos");
    setBusca("");
    setConvenioId("");
  };

  const getStatusBadge = (item: any) => {
    const valorLiberado = parseFloat(item.valorLiberado || "0");
    const temGlosa = item.codigoGlosa && item.codigoGlosa !== '';

    if (temGlosa && valorLiberado === 0) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Glosado</Badge>;
    } else if (temGlosa) {
      return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600"><AlertCircle className="h-3 w-3" /> Parcial</Badge>;
    }
    return <Badge variant="outline" className="gap-1 border-green-500 text-green-600"><CheckCircle2 className="h-3 w-3" /> Pago</Badge>;
  };

  const resumo = recebimentoData?.resumo;
  const totalPages = Math.ceil((recebimentoData?.total || 0) / pageSize);
  const items = recebimentoData?.items || [];

  // Verificar se há filtros ativos
  const temFiltrosAtivos = mesReferencia || anoReferencia || filtroStatus !== "todos" || busca || convenioId;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Demonstrativo de Retorno</h1>
            <p className="text-muted-foreground">
              Análise detalhada dos itens do demonstrativo TISS com status de pagamento, glosas e totais
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
                  Mês
                </label>
                <Select value={mesReferencia} onValueChange={setMesReferencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {MESES.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Ano
                </label>
                <Select value={anoReferencia} onValueChange={setAnoReferencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {anos.map((ano) => (
                      <SelectItem key={ano.value} value={ano.value}>
                        {ano.label}
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
                    placeholder="Código, guia, paciente..."
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
            {(mesReferencia || anoReferencia) && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Filtrando por referência: {mesReferencia ? MESES.find(m => m.value === mesReferencia)?.label : "Todos os meses"} / {anoReferencia || "Todos os anos"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards de resumo - com novos campos TISS */}
        {resumo && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "todos" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setFiltroStatus("todos")}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Total Itens</p>
                    <p className="text-xl font-bold">{Number(resumo.totalItens || 0).toLocaleString("pt-BR")}</p>
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
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Pagos</p>
                    <p className="text-xl font-bold text-green-600">{Number(resumo.itensPagos || 0).toLocaleString("pt-BR")}</p>
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
                  <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Glosados</p>
                    <p className="text-xl font-bold text-red-600">{Number(resumo.itensGlosados || 0).toLocaleString("pt-BR")}</p>
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
                    <p className="text-sm font-bold text-blue-600 truncate">{formatCurrency(resumo.valorInformadoTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-indigo-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Vl. Processado</p>
                    <p className="text-sm font-bold text-indigo-600 truncate">{formatCurrency(resumo.valorProcessadoTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Vl. Liberado</p>
                    <p className="text-sm font-bold text-emerald-600 truncate">{formatCurrency(resumo.valorLiberado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Vl. Glosado</p>
                    <p className="text-sm font-bold text-red-600 truncate">{formatCurrency(resumo.valorGlosadoTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de itens - com novos campos TISS */}
        <Card>
          <CardContent className="pt-6">
            {isLoadingRecebimento ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item encontrado</p>
                <p className="text-sm">Ajuste os filtros ou importe arquivos de retorno</p>
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
                        <TableHead>Código</TableHead>
                        <TableHead className="max-w-[200px]">Descrição</TableHead>
                        <TableHead>Beneficiário</TableHead>
                        <TableHead>Data Exec.</TableHead>
                        <TableHead className="text-right">Vl. Informado</TableHead>
                        <TableHead className="text-right">Vl. Liberado</TableHead>
                        <TableHead className="text-right">Vl. Glosado</TableHead>
                        <TableHead>Cód. Glosa</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item: any, idx: number) => {
                        const temGlosa = item.codigoGlosa && item.codigoGlosa !== '';
                        return (
                          <TableRow 
                            key={item.id || idx} 
                            className={`${temGlosa ? "bg-red-50/50 dark:bg-red-950/20" : ""} cursor-pointer hover:bg-muted/50`}
                            onClick={() => setItemDetalhe(item)}
                          >
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setItemDetalhe(item); }}>
                                      <Eye className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver detalhes</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.numeroGuiaPrestador || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{item.numeroProtocolo || "-"}</TableCell>
                            <TableCell className="font-mono text-sm">{item.codigoItem || "-"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{item.descricaoItem || "-"}</TableCell>
                            <TableCell className="max-w-[150px] truncate text-sm">{item.nomeBeneficiario || "-"}</TableCell>
                            <TableCell className="text-sm">{formatDate(item.dataRealizacao)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatCurrency(item.valorInformado)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-emerald-600 font-semibold">{formatCurrency(item.valorLiberado)}</TableCell>
                            <TableCell className="text-right font-mono text-sm text-red-600">{formatCurrency(item.valorGlosado)}</TableCell>
                            <TableCell className="text-sm">
                              {temGlosa ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge variant="outline" className="text-xs border-red-300 text-red-600">
                                        {item.codigoGlosa}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px]">
                                      <p className="font-semibold">Glosa: {item.codigoGlosa}</p>
                                      <p className="text-sm">{item.descricaoGlosa || "Sem descrição"}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(item)}
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
                    Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, recebimentoData?.total || 0)} de {recebimentoData?.total || 0} itens
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
                      Página {page} de {totalPages || 1}
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

      {/* Dialog de detalhes do item */}
      <Dialog open={!!itemDetalhe} onOpenChange={(open) => !open && setItemDetalhe(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Detalhes do Item - Demonstrativo TISS
            </DialogTitle>
          </DialogHeader>

          {itemDetalhe && (
            <div className="space-y-6">
              {/* Cabeçalho do Demonstrativo */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  CABEÇALHO DO DEMONSTRATIVO
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailField label="Registro ANS" value={itemDetalhe.registroANS} />
                  <DetailField label="Nº Demonstrativo" value={itemDetalhe.numeroDemonstrativo} />
                  <DetailField label="Data Emissão" value={formatDate(itemDetalhe.dataEmissao)} />
                  <DetailField label="CNES" value={itemDetalhe.cnes} />
                  <DetailField label="Cód. Prestador" value={itemDetalhe.codigoPrestadorOperadora} />
                  <DetailField label="Nome Contratado" value={itemDetalhe.nomeContratado} />
                  <DetailField label="Operadora" value={itemDetalhe.nomeOperadora} />
                  <DetailField label="CNPJ Operadora" value={itemDetalhe.cnpjOperadora} />
                  <DetailField label="Convênio" value={itemDetalhe.convenioNome} />
                </div>
              </div>

              {/* Dados do Protocolo */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  PROTOCOLO / LOTE
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailField label="Protocolo" value={itemDetalhe.numeroProtocolo} />
                  <DetailField label="Data Protocolo" value={formatDate(itemDetalhe.dataProtocolo)} />
                  <DetailField label="Lote Prestador" value={itemDetalhe.numeroLotePrestador} />
                  <DetailField label="Situação Protocolo" value={itemDetalhe.situacaoProtocolo} />
                  <DetailField label="Vl. Informado Protocolo" value={formatCurrency(itemDetalhe.valorInformadoProtocolo)} highlight="blue" />
                  <DetailField label="Vl. Processado Protocolo" value={formatCurrency(itemDetalhe.valorProcessadoProtocolo)} highlight="indigo" />
                  <DetailField label="Vl. Liberado Protocolo" value={formatCurrency(itemDetalhe.valorLiberadoProtocolo)} highlight="green" />
                  <DetailField label="Vl. Glosa Protocolo" value={formatCurrency(itemDetalhe.valorGlosaProtocoloTotal)} highlight="red" />
                  {itemDetalhe.glosaProtocoloCodigo && (
                    <>
                      <DetailField label="Cód. Glosa Protocolo" value={itemDetalhe.glosaProtocoloCodigo} highlight="red" />
                      <DetailField label="Desc. Glosa Protocolo" value={itemDetalhe.glosaProtocoloDescricao} highlight="red" />
                    </>
                  )}
                </div>
              </div>

              {/* Dados da Guia */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  DADOS DA GUIA
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailField label="Guia Prestador" value={itemDetalhe.numeroGuiaPrestador} />
                  <DetailField label="Guia Operadora" value={itemDetalhe.numeroGuiaOperadora} />
                  <DetailField label="Senha" value={itemDetalhe.senha} />
                  <DetailField label="Carteirinha" value={itemDetalhe.numeroCarteira} />
                  <DetailField label="Beneficiário" value={itemDetalhe.nomeBeneficiario} />
                  <DetailField label="Situação Guia" value={itemDetalhe.situacaoGuia} />
                  <DetailField label="Início Faturamento" value={formatDate(itemDetalhe.dataInicioFat)} />
                  <DetailField label="Fim Faturamento" value={formatDate(itemDetalhe.dataFimFat)} />
                  <DetailField label="Vl. Informado Guia" value={formatCurrency(itemDetalhe.valorInformadoGuia)} highlight="blue" />
                  <DetailField label="Vl. Processado Guia" value={formatCurrency(itemDetalhe.valorProcessadoGuia)} highlight="indigo" />
                  <DetailField label="Vl. Liberado Guia" value={formatCurrency(itemDetalhe.valorLiberadoGuia)} highlight="green" />
                  <DetailField label="Vl. Glosa Guia" value={formatCurrency(itemDetalhe.valorGlosaGuia)} highlight="red" />
                  {itemDetalhe.motivoGlosaGuiaCodigo && (
                    <>
                      <DetailField label="Cód. Glosa Guia" value={itemDetalhe.motivoGlosaGuiaCodigo} highlight="red" />
                      <DetailField label="Desc. Glosa Guia" value={itemDetalhe.motivoGlosaGuiaDescricao} highlight="red" />
                    </>
                  )}
                </div>
              </div>

              {/* Detalhes do Item */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  DETALHES DO ITEM
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailField label="Seq. Item" value={itemDetalhe.sequencialItem} />
                  <DetailField label="Data Execução" value={formatDate(itemDetalhe.dataRealizacao)} />
                  <DetailField label="Cód. Tabela" value={itemDetalhe.codigoTabela} />
                  <DetailField label="Código Item" value={itemDetalhe.codigoItem} />
                  <div className="col-span-2">
                    <DetailField label="Descrição" value={itemDetalhe.descricaoItem} />
                  </div>
                  <DetailField label="Grau Participação" value={itemDetalhe.grauParticipacao} />
                  <DetailField label="Qtd. Executada" value={itemDetalhe.quantidadeExecutada} />
                  <DetailField label="Vl. Informado" value={formatCurrency(itemDetalhe.valorInformado)} highlight="blue" />
                  <DetailField label="Vl. Processado" value={formatCurrency(itemDetalhe.valorProcessado)} highlight="indigo" />
                  <DetailField label="Vl. Liberado" value={formatCurrency(itemDetalhe.valorLiberado)} highlight="green" />
                  <DetailField label="Vl. Glosado" value={formatCurrency(itemDetalhe.valorGlosado)} highlight="red" />
                  {itemDetalhe.codigoGlosa && (
                    <>
                      <DetailField label="Cód. Glosa Item" value={itemDetalhe.codigoGlosa} highlight="red" />
                      <div className="col-span-2">
                        <DetailField label="Desc. Glosa Item" value={itemDetalhe.descricaoGlosa} highlight="red" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dados de Pagamento */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  PAGAMENTO E TOTAIS GERAIS
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <DetailField label="Data Pagamento" value={formatDate(itemDetalhe.dataPagamento)} />
                  <DetailField label="Forma Pagamento" value={itemDetalhe.formaPagamento} />
                  <DetailField label="Banco / Agência" value={itemDetalhe.banco ? `${itemDetalhe.banco} / ${itemDetalhe.agencia || ""}` : null} />
                  <DetailField label="Vl. Informado Geral" value={formatCurrency(itemDetalhe.valorInformadoGeral)} highlight="blue" />
                  <DetailField label="Vl. Processado Geral" value={formatCurrency(itemDetalhe.valorProcessadoGeral)} highlight="indigo" />
                  <DetailField label="Vl. Liberado Geral" value={formatCurrency(itemDetalhe.valorLiberadoGeral)} highlight="green" />
                  <DetailField label="Vl. Glosa Geral" value={formatCurrency(itemDetalhe.valorGlosaGeral)} highlight="red" />
                  <DetailField label="Valor Final a Receber" value={formatCurrency(itemDetalhe.valorFinalReceber)} highlight="emerald" />
                  <DetailField label="Origem" value={itemDetalhe.origemDado?.toUpperCase()} />
                </div>
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
