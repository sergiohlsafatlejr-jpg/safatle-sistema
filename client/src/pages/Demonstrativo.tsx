import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
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
  Calendar
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

  // Buscar procedimentos do convênio selecionado com filtros no backend
  // Apenas arquivos retornados (para evitar duplicação com arquivos enviados)
  const { data: procedimentosData, isLoading: isLoadingProcedimentos } = trpc.procedimentos.list.useQuery(
    { 
      convenioId: parseInt(convenioId), 
      page, 
      pageSize,
      search: buscaDebounced || undefined,
      statusGlosa: filtroStatus !== "todos" ? filtroStatus as "pago" | "glosado" | "parcial" : undefined,
      apenasRetornados: true,
      mesReferencia: mesReferencia ? parseInt(mesReferencia) : undefined,
      anoReferencia: anoReferencia ? parseInt(anoReferencia) : undefined,
    },
    { enabled: !!convenioId }
  );

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const handleExportExcel = () => {
    if (!procedimentosData?.items || procedimentosData.items.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const excelData = (procedimentosData.items as any[]).map((proc: any) => {
      // Ler valorGlosado diretamente do procedimento (nova coluna) ou do dadosExtras (legado)
      const extras = proc.dadosExtras ? 
        (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
      const valorGlosado = parseFloat(proc.valorGlosado || extras.valorGlosado || "0");
      const valor = parseFloat(proc.valorTotal || "0");
      const motivoGlosa = proc.motivoGlosa || extras.motivoGlosa || "";
      
      let status = "Pago";
      if (valorGlosado > 0 && valorGlosado >= valor) {
        status = "Glosado";
      } else if (valorGlosado > 0) {
        status = "Parcial";
      }

      return {
        "Guia": proc.guiaNumero || "",
        "Data Execução": proc.dataExecucao ? new Date(proc.dataExecucao).toLocaleDateString("pt-BR") : "",
        "Código": proc.codigo,
        "Descrição": proc.descricao || "",
        "Paciente": proc.pacienteNome || "",
        "Quantidade": proc.quantidade || 1,
        "Valor Pago": valor - valorGlosado,
        "Valor Glosado": valorGlosado,
        "Motivo Glosa": motivoGlosa,
        "Status": status,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = [
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 50 }, { wch: 30 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 10 }
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
  };

  const getStatusBadge = (proc: any) => {
    // Ler valorGlosado diretamente do procedimento (nova coluna) ou do dadosExtras (legado)
    const extras = proc.dadosExtras ? 
      (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
    const valorGlosado = parseFloat(proc.valorGlosado || extras.valorGlosado || "0");
    const valor = parseFloat(proc.valorTotal || "0");

    if (valorGlosado > 0 && valorGlosado >= valor) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Glosado</Badge>;
    } else if (valorGlosado > 0) {
      return <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600"><AlertCircle className="h-3 w-3" /> Parcial</Badge>;
    }
    return <Badge variant="outline" className="gap-1 border-green-500 text-green-600"><CheckCircle2 className="h-3 w-3" /> Pago</Badge>;
  };

  const resumo = procedimentosData?.resumo;
  const totalPages = Math.ceil((procedimentosData?.total || 0) / pageSize);

  // Verificar se há filtros ativos
  const temFiltrosAtivos = mesReferencia || anoReferencia || filtroStatus !== "todos" || busca;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demonstrativo de Retorno</h1>
          <p className="text-muted-foreground">
            Visualize os itens do arquivo de retorno com status de pagamento e glosas
          </p>
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
                    <SelectValue placeholder="Selecione um convênio" />
                  </SelectTrigger>
                  <SelectContent>
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
                    placeholder="Código, guia..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {convenioId && (
              <div className="flex gap-2 mt-4">
                <Button onClick={handleExportExcel} disabled={!procedimentosData?.items?.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
                {temFiltrosAtivos && (
                  <Button variant="outline" onClick={handleLimparFiltros}>
                    Limpar Filtros
                  </Button>
                )}
              </div>
            )}

            {/* Indicador de período selecionado */}
            {convenioId && (mesReferencia || anoReferencia) && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Exibindo itens de: {mesReferencia ? MESES.find(m => m.value === mesReferencia)?.label : "Todos os meses"} / {anoReferencia || "Todos os anos"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards de resumo - clicáveis para filtrar */}
        {convenioId && resumo && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${filtroStatus === "todos" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setFiltroStatus("todos")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Itens</p>
                    <p className="text-2xl font-bold">{resumo.total}</p>
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
                    <p className="text-2xl font-bold text-green-600">{resumo.quantidadePagos}</p>
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
                    <p className="text-2xl font-bold text-red-600">{resumo.quantidadeGlosados}</p>
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
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pago</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(resumo.totalPago)}</p>
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
                  <DollarSign className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Glosado</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(resumo.totalGlosado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de procedimentos */}
        {convenioId && (
          <Card>
            <CardHeader>
              <CardTitle>
                Itens do Demonstrativo
                {procedimentosData?.total !== undefined && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({procedimentosData.total} itens{temFiltrosAtivos ? ` filtrados` : ""})
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Detalhamento dos procedimentos com valores pagos e glosados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProcedimentos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : procedimentosData?.items && procedimentosData.items.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Tipo</TableHead>
                          <TableHead className="w-[100px]">Guia</TableHead>
                          <TableHead className="w-[100px]">Data</TableHead>
                          <TableHead className="w-[100px]">Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-[150px]">Paciente</TableHead>
                          <TableHead className="w-[80px] text-center">Qtd</TableHead>
                          <TableHead className="w-[120px] text-right">Valor Pago</TableHead>
                          <TableHead className="w-[120px] text-right">Valor Glosado</TableHead>
                          <TableHead className="w-[200px]">Motivo Glosa</TableHead>
                          <TableHead className="w-[100px] text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(procedimentosData.items as any[]).map((proc: any) => {
                          // Ler valorGlosado diretamente do procedimento (nova coluna) ou do dadosExtras (legado)
                          const extras = proc.dadosExtras ? 
                            (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
                          const valorGlosado = parseFloat(proc.valorGlosado || extras.valorGlosado || "0");
                          const valor = parseFloat(proc.valorTotal || "0");
                          const valorPago = valor - valorGlosado;
                          const motivoGlosa = proc.motivoGlosa || extras.motivoGlosa || "";
                          
                          // Determinar tipo do código baseado no código TUSS e descrição
                          const getTipoCodigo = (codigo: string, descricao: string) => {
                            const cod = codigo || "";
                            const desc = (descricao || "").toLowerCase();
                            
                            // Materiais: códigos começam com 07
                            if (cod.startsWith("07")) return { tipo: "Material", cor: "bg-orange-100 text-orange-700" };
                            // Medicamentos: códigos começam com 06
                            if (cod.startsWith("06")) return { tipo: "Medicamento", cor: "bg-purple-100 text-purple-700" };
                            // Taxas e diárias: códigos começam com 05 ou 08
                            if (cod.startsWith("05") || cod.startsWith("08")) return { tipo: "Taxa/Diária", cor: "bg-gray-100 text-gray-700" };
                            // Exames: códigos começam com 40, 41, 42 ou descrição contém palavras-chave
                            if (cod.startsWith("40") || cod.startsWith("41") || cod.startsWith("42") ||
                                desc.includes("exame") || desc.includes("dosagem") || desc.includes("hemograma") ||
                                desc.includes("urina") || desc.includes("sangue") || desc.includes("laborat")) {
                              return { tipo: "Exame", cor: "bg-blue-100 text-blue-700" };
                            }
                            // Procedimentos: outros códigos
                            return { tipo: "Procedimento", cor: "bg-green-100 text-green-700" };
                          };
                          
                          const tipoCodigo = getTipoCodigo(proc.codigo, proc.descricao);

                          return (
                            <TableRow 
                              key={proc.id}
                              className={valorGlosado > 0 ? (valorGlosado >= valor ? "bg-red-50" : "bg-yellow-50") : ""}
                            >
                              <TableCell>
                                <Badge variant="outline" className={`text-xs ${tipoCodigo.cor}`}>
                                  {tipoCodigo.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{proc.guiaNumero || "-"}</TableCell>
                              <TableCell>
                                {proc.dataExecucao 
                                  ? new Date(proc.dataExecucao).toLocaleDateString("pt-BR") 
                                  : "-"}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{proc.codigo}</TableCell>
                              <TableCell className="max-w-[250px] truncate" title={proc.descricao || ""}>
                                {proc.descricao || "-"}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate" title={proc.pacienteNome || ""}>
                                {proc.pacienteNome || "-"}
                              </TableCell>
                              <TableCell className="text-center">{proc.quantidade || 1}</TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {formatCurrency(valorPago > 0 ? valorPago : 0)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-red-600">
                                {valorGlosado > 0 ? formatCurrency(valorGlosado) : "-"}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={motivoGlosa}>
                                {motivoGlosa || "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(proc)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {page} de {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage(p => p - 1)}
                        >
                          Anterior
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => p + 1)}
                        >
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum item encontrado com os filtros aplicados.</p>
                  {temFiltrosAtivos && (
                    <Button variant="link" onClick={handleLimparFiltros} className="mt-2">
                      Limpar filtros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!convenioId && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um convênio para visualizar o demonstrativo.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
