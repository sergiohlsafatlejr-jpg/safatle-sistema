import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  RefreshCw
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

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const handleExportExcel = () => {
    if (!recebimentoData?.items || recebimentoData.items.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const excelData = (recebimentoData.items as any[]).map((item: any) => {
      const valorLiberado = parseFloat(item.valorLiberado || "0");
      const valorInformado = parseFloat(item.valorInformado || "0");
      const temGlosa = item.codigoGlosa && item.codigoGlosa !== '';
      
      let status = "Pago";
      if (temGlosa && valorLiberado === 0) {
        status = "Glosado";
      } else if (temGlosa) {
        status = "Parcial";
      }

      return {
        "Guia": item.numeroGuiaPrestador || "",
        "Protocolo": item.numeroProtocolo || "",
        "Data Execução": item.dataRealizacao ? new Date(item.dataRealizacao).toLocaleDateString("pt-BR") : "",
        "Data Pagamento": item.dataPagamento ? new Date(item.dataPagamento).toLocaleDateString("pt-BR") : "",
        "Código": item.codigoProcedimento || "",
        "Descrição": item.descricaoProcedimento || "",
        "Tipo Lançamento": item.tipoLancamento || "",
        "Beneficiário": item.nomeBeneficiario || "",
        "Carteirinha": item.numeroCarteira || "",
        "Quantidade": item.qtdExecutada || 1,
        "Valor Informado": valorInformado / 100,
        "Valor Liberado": valorLiberado / 100,
        "Código Glosa": item.codigoGlosa || "",
        "Descrição Glosa": item.descricaoGlosa || "",
        "Status": status,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
      { wch: 50 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 10 }
    ];
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
              Visualize os itens do arquivo de retorno com status de pagamento e glosas - Tabela recebimento_tiss
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Seleção de arquivo */}
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

        {/* Cards de resumo - clicáveis para filtrar */}
        {resumo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "todos" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setFiltroStatus("todos")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Itens</p>
                    <p className="text-2xl font-bold">{Number(resumo.totalItens || 0).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "pago" ? "ring-2 ring-green-500" : ""}`}
              onClick={() => setFiltroStatus("pago")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pagos</p>
                    <p className="text-2xl font-bold text-green-600">{Number(resumo.itensPagos || 0).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "glosado" ? "ring-2 ring-red-500" : ""}`}
              onClick={() => setFiltroStatus("glosado")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Glosados</p>
                    <p className="text-2xl font-bold text-red-600">{Number(resumo.itensGlosados || 0).toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Liberado</p>
                    <p className="text-xl font-bold text-emerald-600">{formatCurrency(Number(resumo.valorLiberado || 0))}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de itens */}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guia</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="max-w-[250px]">Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Beneficiário</TableHead>
                      <TableHead>Data Exec.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any, idx: number) => (
                      <TableRow key={item.id || idx} className={item.codigoGlosa ? "bg-red-50/50" : ""}>
                        <TableCell className="font-mono">{item.numeroGuiaPrestador || "-"}</TableCell>
                        <TableCell className="font-mono">{item.codigoProcedimento || "-"}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{item.descricaoProcedimento || "-"}</TableCell>
                        <TableCell>{item.tipoLancamento || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{item.nomeBeneficiario || "-"}</TableCell>
                        <TableCell>
                          {item.dataRealizacao ? new Date(item.dataRealizacao).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(parseFloat(item.valorLiberado || "0"))}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

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
    </DashboardLayout>
  );
}
