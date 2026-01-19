import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { 
  Activity, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Target,
  BarChart3,
  Calendar,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Timer,
  Award,
  Zap
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatTime = (seconds: number) => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  return `${Math.round(seconds / 3600)}h`;
};

export default function DashboardProdutividade() {
  const { user } = useAuth();
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");

  const { data: metricas, isLoading, refetch } = trpc.produtividade.metricas.useQuery({
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });

  // Preparar dados para gráficos
  const chartDataDia = useMemo(() => {
    if (!metricas?.porDia) return [];
    return metricas.porDia.map(d => ({
      data: new Date(d.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      aceitas: d.aceitas,
      recursadas: d.recursadas,
      total: d.totalClassificados,
    }));
  }, [metricas?.porDia]);

  const chartDataValor = useMemo(() => {
    if (!metricas?.porDia) return [];
    return metricas.porDia.map(d => ({
      data: new Date(d.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      valorAceito: d.valorAceito,
      valorRecursado: d.valorRecursado,
    }));
  }, [metricas?.porDia]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Dashboard de Produtividade
            </h1>
            <p className="text-muted-foreground">
              Métricas de classificação de glosas por dia e por usuário
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-40"
              placeholder="Data início"
            />
            <span className="text-muted-foreground">até</span>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-40"
              placeholder="Data fim"
            />
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Classificados</p>
                      <p className="text-3xl font-bold">{metricas?.totais.totalClassificados || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <ThumbsUp className="h-3 w-3 mr-1" />
                      {metricas?.totais.totalAceitas || 0} aceitas
                    </Badge>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      <ThumbsDown className="h-3 w-3 mr-1" />
                      {metricas?.totais.totalRecursadas || 0} recursadas
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pendentes</p>
                      <p className="text-3xl font-bold text-amber-600">{metricas?.totais.totalPendentes || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-amber-600" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de classificação</span>
                      <span className="font-medium">{(metricas?.totais.taxaClassificacao || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${metricas?.totais.taxaClassificacao || 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Aceito</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(metricas?.totais.valorTotalAceito || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <ThumbsUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Glosas aceitas sem recurso
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor para Recurso</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(metricas?.totais.valorTotalRecursado || 0)}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <ThumbsDown className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Glosas marcadas para recurso
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Classificações por Dia */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Classificações por Dia
                  </CardTitle>
                  <CardDescription>
                    Quantidade de itens classificados nos últimos 30 dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chartDataDia.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartDataDia}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="aceitas" name="Aceitas" fill="#22c55e" stackId="a" />
                        <Bar dataKey="recursadas" name="Recursadas" fill="#f97316" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum dado disponível</p>
                        <p className="text-sm">Classifique glosas para ver as métricas</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico de Valores por Dia */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Valores por Dia
                  </CardTitle>
                  <CardDescription>
                    Valores de glosas aceitas e recursadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chartDataValor.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartDataValor}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="data" fontSize={12} />
                        <YAxis fontSize={12} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="valorAceito" 
                          name="Valor Aceito" 
                          stroke="#22c55e" 
                          fill="#22c55e" 
                          fillOpacity={0.3} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="valorRecursado" 
                          name="Valor Recursado" 
                          stroke="#f97316" 
                          fill="#f97316" 
                          fillOpacity={0.3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum dado disponível</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Produtividade por Usuário */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Produtividade por Usuário
                </CardTitle>
                <CardDescription>
                  Ranking de classificações por usuário
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricas?.porUsuario && metricas.porUsuario.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Aceitas</TableHead>
                        <TableHead className="text-center">Recursadas</TableHead>
                        <TableHead className="text-right">Valor Aceito</TableHead>
                        <TableHead className="text-right">Valor Recursado</TableHead>
                        <TableHead className="text-center">Tempo Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metricas.porUsuario.map((usuario, index) => (
                        <TableRow key={usuario.userId}>
                          <TableCell>
                            {index === 0 ? (
                              <Award className="h-5 w-5 text-yellow-500" />
                            ) : index === 1 ? (
                              <Award className="h-5 w-5 text-gray-400" />
                            ) : index === 2 ? (
                              <Award className="h-5 w-5 text-amber-700" />
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{usuario.userName}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{usuario.totalClassificados}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {usuario.aceitas}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              {usuario.recursadas}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(usuario.valorAceito)}
                          </TableCell>
                          <TableCell className="text-right text-orange-600 font-medium">
                            {formatCurrency(usuario.valorRecursado)}
                          </TableCell>
                          <TableCell className="text-center">
                            {usuario.tempoMedioClassificacao > 0 ? (
                              <Badge variant="outline" className="gap-1">
                                <Timer className="h-3 w-3" />
                                {formatTime(usuario.tempoMedioClassificacao)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de produtividade disponível</p>
                    <p className="text-sm mt-2">Classifique glosas para ver as métricas por usuário</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
