import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  AlertTriangle, 
  TrendingDown, 
  Building2,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  FileWarning,
  Target,
  Activity
} from "lucide-react";
import { useState } from "react";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"];

const CATEGORIA_COLORS: { [key: string]: string } = {
  "Valor Divergente": "#ef4444",
  "Procedimento Não Autorizado": "#f97316",
  "Documentação Incompleta": "#eab308",
  "Prazo Excedido": "#8b5cf6",
  "Duplicidade": "#ec4899",
  "Código Inválido": "#06b6d4",
  "Quantidade Excedente": "#22c55e",
  "Paciente Não Elegível": "#3b82f6",
  "Outros": "#6b7280",
};

export default function AnaliseGlosa() {
  const { user } = useAuth();
  const [convenioFiltro, setConvenioFiltro] = useState<string>("todos");
  const [periodoMeses, setPeriodoMeses] = useState<string>("12");

  // Buscar dados
  const { data: glosaPorConvenio, isLoading: loadingConvenio, refetch: refetchConvenio } = 
    trpc.glosa.porConvenio.useQuery();
  
  const { data: glosaPorProcedimento, isLoading: loadingProcedimento, refetch: refetchProcedimento } = 
    trpc.glosa.porProcedimento.useQuery({
      convenioId: convenioFiltro !== "todos" ? parseInt(convenioFiltro) : undefined,
      limit: 20,
    });

  const { data: tendenciaGlosa, isLoading: loadingTendencia, refetch: refetchTendencia } = 
    trpc.glosa.tendencia.useQuery({
      convenioId: convenioFiltro !== "todos" ? parseInt(convenioFiltro) : undefined,
      meses: parseInt(periodoMeses),
    });

  const { data: resumoGlosa, isLoading: loadingResumo } = 
    trpc.glosa.resumo.useQuery();

  const { data: convenios } = trpc.convenios.list.useQuery({ ativo: "sim" });

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleRefresh = () => {
    refetchConvenio();
    refetchProcedimento();
    refetchTendencia();
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: Glosa por Convênio
    if (glosaPorConvenio) {
      const convData = glosaPorConvenio.map(item => ({
        "Convênio": item.convenioNome,
        "Total Divergências": item.totalDivergencias,
        "Valor Glosado": item.valorGlosado,
        "Motivo Principal": item.motivosPrincipais[0]?.categoriaGlosa || "-",
        "% Motivo Principal": item.motivosPrincipais[0]?.percentual?.toFixed(1) || "0",
      }));
      const wsConv = XLSX.utils.json_to_sheet(convData);
      XLSX.utils.book_append_sheet(wb, wsConv, "Glosa por Convênio");
    }

    // Aba 2: Procedimentos Mais Glosados
    if (glosaPorProcedimento) {
      const procData = glosaPorProcedimento.map(item => ({
        "Código": item.codigo,
        "Descrição": item.descricao,
        "Qtd Glosas": item.quantidadeGlosas,
        "Valor Glosado": item.valorGlosado,
        "Motivo Principal": item.motivoPrincipal,
      }));
      const wsProc = XLSX.utils.json_to_sheet(procData);
      XLSX.utils.book_append_sheet(wb, wsProc, "Procedimentos Glosados");
    }

    // Aba 3: Tendência Mensal
    if (tendenciaGlosa) {
      const tendData = tendenciaGlosa.map(item => ({
        "Mês/Ano": `${item.mes}/${item.ano}`,
        "Total Glosas": item.totalGlosas,
        "Valor Glosado": item.valorGlosado,
      }));
      const wsTend = XLSX.utils.json_to_sheet(tendData);
      XLSX.utils.book_append_sheet(wb, wsTend, "Tendência Mensal");
    }

    // Aba 4: Resumo por Categoria
    if (resumoGlosa?.categorias) {
      const catData = resumoGlosa.categorias.map(item => ({
        "Categoria": item.categoria,
        "Quantidade": item.quantidade,
        "Valor": item.valor,
        "Percentual": item.percentual.toFixed(1) + "%",
      }));
      const wsCat = XLSX.utils.json_to_sheet(catData);
      XLSX.utils.book_append_sheet(wb, wsCat, "Categorias de Glosa");
    }

    XLSX.writeFile(wb, `analise_glosa_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Preparar dados para gráficos
  const pieData = resumoGlosa?.categorias?.map(item => ({
    name: item.categoria,
    value: item.quantidade,
    valor: item.valor,
  })) || [];

  const barConvenioData = glosaPorConvenio?.map(item => ({
    name: item.convenioNome.length > 12 ? item.convenioNome.substring(0, 12) + "..." : item.convenioNome,
    divergencias: item.totalDivergencias,
    valor: item.valorGlosado,
  })) || [];

  const lineData = tendenciaGlosa?.map(item => ({
    name: item.mes,
    glosas: item.totalGlosas,
    valor: item.valorGlosado,
  })) || [];

  const isLoading = loadingConvenio || loadingProcedimento || loadingTendencia || loadingResumo;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Análise de Glosa</h1>
            <p className="text-muted-foreground">
              Identifique padrões e principais motivos de glosa por convênio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Glosas</p>
                  {loadingResumo ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-red-600">
                      {resumoGlosa?.totalDivergencias || 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total Glosado</p>
                  {loadingResumo ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(resumoGlosa?.valorTotalGlosado || 0)}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Motivo Principal</p>
                  {loadingResumo ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <p className="text-lg font-bold text-amber-600 truncate max-w-[150px]">
                      {resumoGlosa?.categoriaPrincipal?.nome || "N/A"}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Convênios Afetados</p>
                  {loadingConvenio ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-purple-600">
                      {glosaPorConvenio?.length || 0}
                    </p>
                  )}
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium mb-2 block">Convênio</label>
                <Select value={convenioFiltro} onValueChange={setConvenioFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os convênios</SelectItem>
                    {convenios?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[150px]">
                <label className="text-sm font-medium mb-2 block">Período</label>
                <Select value={periodoMeses} onValueChange={setPeriodoMeses}>
                  <SelectTrigger>
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Últimos 3 meses</SelectItem>
                    <SelectItem value="6">Últimos 6 meses</SelectItem>
                    <SelectItem value="12">Últimos 12 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de Análise */}
        <Tabs defaultValue="categorias" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="categorias">Por Categoria</TabsTrigger>
            <TabsTrigger value="convenios">Por Convênio</TabsTrigger>
            <TabsTrigger value="procedimentos">Por Procedimento</TabsTrigger>
            <TabsTrigger value="tendencia">Tendência</TabsTrigger>
          </TabsList>

          {/* Tab: Por Categoria */}
          <TabsContent value="categorias" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Pizza */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Distribuição por Categoria
                  </CardTitle>
                  <CardDescription>Principais motivos de glosa</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CATEGORIA_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string, props: any) => [
                            `${value} ocorrências (${formatCurrency(props.payload.valor)})`,
                            props.payload.name
                          ]}
                        />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhuma glosa registrada</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabela de Categorias */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento por Categoria</CardTitle>
                  <CardDescription>Ranking de motivos de glosa</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingResumo ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : resumoGlosa?.categorias && resumoGlosa.categorias.length > 0 ? (
                    <div className="space-y-4">
                      {resumoGlosa.categorias
                        .sort((a, b) => b.quantidade - a.quantidade)
                        .map((cat, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">{cat.categoria}</span>
                              <span className="text-sm text-muted-foreground">
                                {cat.quantidade} ({formatPercent(cat.percentual)})
                              </span>
                            </div>
                            <Progress 
                              value={cat.percentual} 
                              className="h-2"
                              style={{ 
                                backgroundColor: "#e5e7eb",
                              }}
                            />
                            <p className="text-xs text-muted-foreground">
                              Valor: {formatCurrency(cat.valor)}
                            </p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma categoria de glosa encontrada
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Por Convênio */}
          <TabsContent value="convenios" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Barras */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Glosa por Convênio
                  </CardTitle>
                  <CardDescription>Quantidade e valor de glosas</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingConvenio ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : barConvenioData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barConvenioData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" orientation="left" stroke="#ef4444" />
                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number, name: string) => [
                          name === "valor" ? formatCurrency(value) : value,
                          name === "valor" ? "Valor Glosado" : "Divergências"
                        ]} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="divergencias" name="Divergências" fill="#ef4444" />
                        <Bar yAxisId="right" dataKey="valor" name="Valor Glosado" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tabela de Convênios */}
              <Card>
                <CardHeader>
                  <CardTitle>Motivos por Convênio</CardTitle>
                  <CardDescription>Principais causas de glosa em cada convênio</CardDescription>
                </CardHeader>
                <CardContent className="max-h-[400px] overflow-y-auto">
                  {loadingConvenio ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : glosaPorConvenio && glosaPorConvenio.length > 0 ? (
                    <div className="space-y-4">
                      {glosaPorConvenio.map((conv) => (
                        <div key={conv.convenioId} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold">{conv.convenioNome}</h4>
                              <p className="text-sm text-muted-foreground">
                                {conv.totalDivergencias} divergências • {formatCurrency(conv.valorGlosado)}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {conv.motivosPrincipais.slice(0, 3).map((motivo, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline"
                                className="text-xs"
                                style={{ 
                                  borderColor: CATEGORIA_COLORS[motivo.categoriaGlosa] || "#6b7280",
                                  color: CATEGORIA_COLORS[motivo.categoriaGlosa] || "#6b7280"
                                }}
                              >
                                {motivo.categoriaGlosa}: {formatPercent(motivo.percentual)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum convênio com glosas
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab: Por Procedimento */}
          <TabsContent value="procedimentos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileWarning className="h-5 w-5" />
                  Procedimentos Mais Glosados
                </CardTitle>
                <CardDescription>
                  Top 20 procedimentos com maior incidência de glosa
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingProcedimento ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : glosaPorProcedimento && glosaPorProcedimento.length > 0 ? (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">#</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead className="text-center">Qtd Glosas</TableHead>
                          <TableHead className="text-right">Valor Glosado</TableHead>
                          <TableHead>Motivo Principal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {glosaPorProcedimento.map((proc, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-mono">{proc.codigo}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{proc.descricao}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="destructive">{proc.quantidadeGlosas}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium text-red-600">
                              {formatCurrency(proc.valorGlosado)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                style={{ 
                                  borderColor: CATEGORIA_COLORS[proc.motivoPrincipal] || "#6b7280",
                                  color: CATEGORIA_COLORS[proc.motivoPrincipal] || "#6b7280"
                                }}
                              >
                                {proc.motivoPrincipal}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileWarning className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum procedimento glosado encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Tendência */}
          <TabsContent value="tendencia">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Tendência de Glosa
                </CardTitle>
                <CardDescription>
                  Evolução mensal das glosas no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTendencia ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : lineData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#ef4444" />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number, name: string) => [
                        name === "valor" ? formatCurrency(value) : value,
                        name === "valor" ? "Valor Glosado" : "Quantidade de Glosas"
                      ]} />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="glosas" name="Quantidade" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                      <Area yAxisId="right" type="monotone" dataKey="valor" name="Valor" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum dado de tendência disponível</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
