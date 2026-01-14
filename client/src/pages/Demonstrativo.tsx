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
  FileText
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Demonstrativo() {
  const { user } = useAuth();
  const [arquivoId, setArquivoId] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Buscar arquivos de retorno
  const { data: arquivosRetorno, isLoading: isLoadingArquivos } = trpc.arquivos.list.useQuery({
    direcao: "retornado",
    status: "processado",
  });

  // Buscar procedimentos do arquivo selecionado
  const { data: procedimentosData, isLoading: isLoadingProcedimentos } = trpc.procedimentos.list.useQuery(
    { arquivoId: parseInt(arquivoId), page, pageSize },
    { enabled: !!arquivoId }
  );

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  // Calcular resumo
  const resumo = useMemo(() => {
    if (!procedimentosData?.items) return null;
    
    let totalPago = 0;
    let totalGlosado = 0;
    let quantidadePagos = 0;
    let quantidadeGlosados = 0;
    let quantidadeParciais = 0;

    for (const proc of (procedimentosData.items as any[])) {
      const valor = parseFloat(proc.valorTotal || "0");
      const extras = proc.dadosExtras ? 
        (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
      const valorGlosado = parseFloat(extras.valorGlosado || "0");
      
      if (valorGlosado > 0 && valorGlosado >= valor) {
        quantidadeGlosados++;
        totalGlosado += valorGlosado;
      } else if (valorGlosado > 0) {
        quantidadeParciais++;
        totalGlosado += valorGlosado;
        totalPago += valor - valorGlosado;
      } else {
        quantidadePagos++;
        totalPago += valor;
      }
    }

    return {
      totalPago,
      totalGlosado,
      quantidadePagos,
      quantidadeGlosados,
      quantidadeParciais,
      total: procedimentosData.total || 0,
    };
  }, [procedimentosData]);

  // Filtrar procedimentos
  const procedimentosFiltrados = useMemo(() => {
    if (!procedimentosData?.items) return [];
    
    return (procedimentosData.items as any[]).filter((proc: any) => {
      const extras = proc.dadosExtras ? 
        (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
      const valorGlosado = parseFloat(extras.valorGlosado || "0");
      const valor = parseFloat(proc.valorTotal || "0");
      
      // Determinar status
      let status = "pago";
      if (valorGlosado > 0 && valorGlosado >= valor) {
        status = "glosado";
      } else if (valorGlosado > 0) {
        status = "parcial";
      }

      // Filtro de status
      if (filtroStatus !== "todos" && status !== filtroStatus) return false;
      
      // Filtro de busca
      if (busca) {
        const termoBusca = busca.toLowerCase();
        const motivoGlosa = extras.motivoGlosa || "";
        return (
          proc.codigo.toLowerCase().includes(termoBusca) ||
          (proc.descricao || "").toLowerCase().includes(termoBusca) ||
          (proc.guiaNumero || "").toLowerCase().includes(termoBusca) ||
          (proc.pacienteNome || "").toLowerCase().includes(termoBusca) ||
          motivoGlosa.toLowerCase().includes(termoBusca)
        );
      }
      
      return true;
    });
  }, [procedimentosData?.items, filtroStatus, busca]);

  const handleExportExcel = () => {
    if (!procedimentosData?.items || procedimentosData.items.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const excelData = (procedimentosData.items as any[]).map((proc: any) => {
      const extras = proc.dadosExtras ? 
        (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
      const valorGlosado = parseFloat(extras.valorGlosado || "0");
      const valor = parseFloat(proc.valorTotal || "0");
      
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
        "Motivo Glosa": extras.motivoGlosa || "",
        "Status": status,
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = [
      { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 50 }, { wch: 30 },
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Demonstrativo");
    
    const arquivo = arquivosRetorno?.find((a: any) => a.id === parseInt(arquivoId));
    const nomeArquivo = arquivo?.nome?.replace(/\.[^/.]+$/, "") || "demonstrativo";
    XLSX.writeFile(wb, `demonstrativo_${nomeArquivo}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Arquivo exportado com sucesso!");
  };

  const getStatusBadge = (proc: any) => {
    const extras = proc.dadosExtras ? 
      (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
    const valorGlosado = parseFloat(extras.valorGlosado || "0");
    const valor = parseFloat(proc.valorTotal || "0");
    
    if (valorGlosado > 0 && valorGlosado >= valor) {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Glosado</Badge>;
    } else if (valorGlosado > 0) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Parcial</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 border-green-200">Pago</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demonstrativo de Retorno</h1>
          <p className="text-muted-foreground">
            Visualize os itens pagos, glosados e motivos de glosa do arquivo de retorno
          </p>
        </div>

        {/* Seleção de arquivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Selecionar Arquivo de Retorno
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium">Arquivo de Retorno</label>
                <Select value={arquivoId} onValueChange={(v) => { setArquivoId(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um arquivo de retorno" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingArquivos ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : !arquivosRetorno || arquivosRetorno.length === 0 ? (
                      <SelectItem value="empty" disabled>Nenhum arquivo de retorno</SelectItem>
                    ) : (
                      arquivosRetorno.map((arq: any) => (
                        <SelectItem key={arq.id} value={String(arq.id)}>
                          {arq.nome}
                        </SelectItem>
                      ))
                    )}
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

            {arquivoId && (
              <div className="flex gap-2 mt-4">
                <Button onClick={handleExportExcel} disabled={!procedimentosData?.items?.length}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cards de resumo */}
        {arquivoId && resumo && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
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

            <Card>
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

            <Card>
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

            <Card>
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

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
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
        {arquivoId && (
          <Card>
            <CardHeader>
              <CardTitle>
                Itens do Demonstrativo
                {procedimentosFiltrados.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({procedimentosFiltrados.length} itens)
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Detalhes dos procedimentos do arquivo de retorno
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProcedimentos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : procedimentosFiltrados.length > 0 ? (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Guia</TableHead>
                          <TableHead className="w-[100px]">Data</TableHead>
                          <TableHead className="w-[100px]">Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="w-[150px]">Paciente</TableHead>
                          <TableHead className="w-[80px] text-center">Qtd</TableHead>
                          <TableHead className="w-[120px] text-right">Valor Pago</TableHead>
                          <TableHead className="w-[120px] text-right">Valor Glosado</TableHead>
                          <TableHead className="w-[200px]">Motivo Glosa</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {procedimentosFiltrados.map((proc: any, idx: number) => {
                          const extras = proc.dadosExtras ? 
                            (typeof proc.dadosExtras === "string" ? JSON.parse(proc.dadosExtras) : proc.dadosExtras) : {};
                          const valorGlosado = parseFloat(extras.valorGlosado || "0");
                          const valor = parseFloat(proc.valorTotal || "0");
                          const valorPago = valor - valorGlosado;
                          
                          return (
                            <TableRow 
                              key={proc.id || idx}
                              className={
                                valorGlosado >= valor ? "bg-red-50" :
                                valorGlosado > 0 ? "bg-amber-50" : ""
                              }
                            >
                              <TableCell className="font-mono text-sm">{proc.guiaNumero || "-"}</TableCell>
                              <TableCell>
                                {proc.dataExecucao ? new Date(proc.dataExecucao).toLocaleDateString("pt-BR") : "-"}
                              </TableCell>
                              <TableCell className="font-mono text-sm">{proc.codigo}</TableCell>
                              <TableCell className="max-w-[300px] truncate" title={proc.descricao || ""}>
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
                              <TableCell className="max-w-[200px] truncate text-sm" title={extras.motivoGlosa || ""}>
                                {extras.motivoGlosa || "-"}
                              </TableCell>
                              <TableCell>{getStatusBadge(proc)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginação */}
                  {procedimentosData && procedimentosData.total > pageSize && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {page} de {Math.ceil(procedimentosData.total / pageSize)}
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
                          disabled={page >= Math.ceil(procedimentosData.total / pageSize)}
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
                  <p>Nenhum item encontrado para os filtros selecionados.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mensagem quando nenhum arquivo selecionado */}
        {!arquivoId && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Selecione um arquivo de retorno para visualizar o demonstrativo</p>
              <p className="text-sm mt-2">
                Os arquivos de retorno são importados na seção "Upload de Arquivos" com direção "Retornado do Convênio"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
