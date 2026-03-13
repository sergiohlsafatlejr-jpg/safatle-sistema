import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Building2, Calendar,
  Stethoscope, Heart, BarChart3, TableIcon, Loader2,
  ArrowUpRight, ArrowDownRight, Minus, FileText, Hash,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import { toast } from "sonner";

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#a855f7", "#22c55e",
  "#d946ef", "#0891b2", "#65a30d", "#dc2626", "#7c3aed",
];

function formatCurrency(value: number | null | undefined): string {
  if (value == null || value === 0) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1 max-w-[280px] truncate">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const PieTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold max-w-[280px] truncate">{d.name}</p>
      <p>{formatCurrency(d.value)}</p>
      {d.payload?.percentual != null && (
        <p className="text-muted-foreground">{d.payload.percentual}%</p>
      )}
    </div>
  );
};

function VariacaoBadge({ valor }: { valor: number }) {
  if (valor === 0) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Minus className="h-3 w-3" />
        0%
      </Badge>
    );
  }
  if (valor > 0) {
    return (
      <Badge className="gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
        <ArrowUpRight className="h-3 w-3" />
        +{valor.toFixed(1)}%
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-red-500/20 text-red-400 border-red-500/30">
      <ArrowDownRight className="h-3 w-3" />
      {valor.toFixed(1)}%
    </Badge>
  );
}

export default function RelatorioFaturamento() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 0;

  const anoCorrente = new Date().getFullYear();
  const [anoAtual, setAnoAtual] = useState(anoCorrente);
  const [anoAnterior, setAnoAnterior] = useState(anoCorrente - 1);
  const [carregado, setCarregado] = useState(false);
  const [queryParams, setQueryParams] = useState<{ estabelecimentoId: number; anoAtual: number; anoAnterior: number } | null>(null);

  const { data, isLoading, error } = trpc.relatorioFaturamento.buscar.useQuery(
    queryParams ?? { estabelecimentoId: 0, anoAtual, anoAnterior },
    { enabled: !!queryParams && queryParams.estabelecimentoId > 0 }
  );

  const handleCarregar = () => {
    if (estabelecimentoId <= 0) {
      toast.error("Selecione um estabelecimento primeiro");
      return;
    }
    setCarregado(true);
    setQueryParams({ estabelecimentoId, anoAtual, anoAnterior });
  };

  // Prepare chart data: mês a mês comparison
  const chartMesComparativo = useMemo(() => {
    if (!data?.tabelaComparativa) return [];
    return data.tabelaComparativa
      .filter(m => m.faturadoAtual > 0 || m.faturadoAnterior > 0)
      .map(m => ({
        mes: m.mesNome.substring(0, 3),
        [`${anoAtual}`]: m.faturadoAtual,
        [`${anoAnterior}`]: m.faturadoAnterior,
      }));
  }, [data?.tabelaComparativa, anoAtual, anoAnterior]);

  // Prepare setor data for horizontal bar chart
  const chartSetor = useMemo(() => {
    if (!data?.porSetor) return [];
    return data.porSetor.slice(0, 12).map(s => ({
      ...s,
      nome: s.setor.length > 25 ? s.setor.slice(0, 25) + "..." : s.setor,
    }));
  }, [data?.porSetor]);

  // Prepare tipo atendimento for pie chart
  const chartTipo = useMemo(() => {
    if (!data?.porTipoAtendimento) return [];
    return data.porTipoAtendimento.map(t => ({
      name: t.tipoDescricao,
      value: t.totalFaturado,
      percentual: t.percentual,
    }));
  }, [data?.porTipoAtendimento]);

  // Prepare convenio for horizontal bar chart
  const chartConvenio = useMemo(() => {
    if (!data?.porConvenio) return [];
    return data.porConvenio.slice(0, 12).map(c => ({
      ...c,
      nome: c.convenio.length > 25 ? c.convenio.slice(0, 25) + "..." : c.convenio,
    }));
  }, [data?.porConvenio]);

  // Anos disponíveis para seleção
  const anosDisponiveis = useMemo(() => {
    const anos = [];
    for (let a = anoCorrente; a >= anoCorrente - 5; a--) {
      anos.push(a);
    }
    return anos;
  }, [anoCorrente]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Relatório de Faturamento
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Análise comparativa do faturamento por período, setor, convênio e tipo de atendimento
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ano Atual
                </label>
                <Select
                  value={String(anoAtual)}
                  onValueChange={(v) => { setAnoAtual(Number(v)); setAnoAnterior(Number(v) - 1); }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ano Comparação
                </label>
                <Select
                  value={String(anoAnterior)}
                  onValueChange={(v) => setAnoAnterior(Number(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCarregar} disabled={isLoading || estabelecimentoId === 0}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Carregar
              </Button>

              {estabelecimentoId === 0 && (
                <p className="text-sm text-amber-400">Selecione um estabelecimento primeiro</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && carregado && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!carregado && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <DollarSign className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Selecione o período e clique em "Carregar"</p>
            <p className="text-sm mt-1">Os dados serão buscados da tabela de faturamento integrado</p>
          </div>
        )}

        {/* Error state */}
        {error && carregado && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <DollarSign className="h-16 w-16 mb-4 opacity-30 text-red-400" />
            <p className="text-lg font-medium text-red-400">Erro ao carregar dados</p>
            <p className="text-sm mt-1">{error.message}</p>
            <Button variant="outline" className="mt-4" onClick={handleCarregar}>
              Tentar novamente
            </Button>
          </div>
        )}

        {/* No data state */}
        {carregado && !isLoading && !error && data && data.acumulado.totalFaturadoAtual === 0 && data.acumulado.totalFaturadoAnterior === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <DollarSign className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Nenhum dado encontrado</p>
            <p className="text-sm mt-1">Não há registros de faturamento para o estabelecimento e período selecionados</p>
          </div>
        )}

        {/* Data loaded */}
        {data && !isLoading && !error && (data.acumulado.totalFaturadoAtual > 0 || data.acumulado.totalFaturadoAnterior > 0) && (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList>
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="tabela" className="gap-2">
                <TableIcon className="h-4 w-4" /> Tabela Comparativa
              </TabsTrigger>
            </TabsList>

            {/* ========== ABA DASHBOARD ========== */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* KPIs Acumulado */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KpiCard
                    title={`Faturado ${anoAtual}`}
                    value={formatCurrency(data.acumulado.totalFaturadoAtual)}
                    subtitle="Acumulado no ano"
                    icon={DollarSign}
                    gradient="blue"
                    trend={{
                      value: data.acumulado.variacaoPercentual,
                      label: `vs ${anoAnterior}`,
                    }}
                  />
                  <KpiCard
                    title={`Faturado ${anoAnterior}`}
                    value={formatCurrency(data.acumulado.totalFaturadoAnterior)}
                    subtitle="Acumulado no ano"
                    icon={DollarSign}
                    gradient="violet"
                  />
                  <KpiCard
                    title={`Contas ${anoAtual}`}
                    value={formatNumber(data.acumulado.qtdContasAtual)}
                    subtitle="Contas distintas"
                    icon={Hash}
                    gradient="emerald"
                  />
                  <KpiCard
                    title={`Contas ${anoAnterior}`}
                    value={formatNumber(data.acumulado.qtdContasAnterior)}
                    subtitle="Contas distintas"
                    icon={Hash}
                    gradient="amber"
                  />
                </div>
              </motion.div>

              {/* Gráfico Comparativo Mês a Mês */}
              <ChartCard title={`Faturamento Mensal: ${anoAtual} vs ${anoAnterior}`} icon={Calendar}>
                {chartMesComparativo.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartMesComparativo} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => formatCurrencyCompact(v)}
                      />
                      <Tooltip content={<CustomTooltipContent />} />
                      <Legend />
                      <Bar
                        dataKey={String(anoAtual)}
                        name={String(anoAtual)}
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey={String(anoAnterior)}
                        name={String(anoAnterior)}
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        opacity={0.6}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                    Sem dados para exibir
                  </div>
                )}
              </ChartCard>

              {/* Gráficos: Por Setor e Por Tipo de Atendimento */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por Setor */}
                <ChartCard title={`Faturamento por Setor (${anoAtual})`} icon={Building2}>
                  {chartSetor.length > 0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(250, chartSetor.length * 32)}>
                      <BarChart
                        data={chartSetor}
                        layout="vertical"
                        margin={{ left: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => formatCurrencyCompact(v)}
                        />
                        <YAxis type="category" dataKey="nome" width={180} tick={{ fontSize: 10 }} />
                        <Tooltip content={<CustomTooltipContent />} />
                        <Bar dataKey="totalFaturado" name="Faturado" radius={[0, 6, 6, 0]}>
                          {chartSetor.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </ChartCard>

                {/* Por Tipo de Atendimento */}
                <ChartCard title={`Faturamento por Tipo de Atendimento (${anoAtual})`} icon={Stethoscope}>
                  {chartTipo.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={chartTipo}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={60}
                          paddingAngle={3}
                          label={({ name, percentual }) => `${name} (${percentual}%)`}
                          labelLine={true}
                        >
                          {chartTipo.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                      Sem dados
                    </div>
                  )}
                </ChartCard>
              </div>

              {/* Gráfico: Por Convênio */}
              <ChartCard title={`Faturamento por Convênio - Top 12 (${anoAtual})`} icon={Heart}>
                {chartConvenio.length > 0 ? (
                  <ResponsiveContainer width="100%" height={Math.max(250, chartConvenio.length * 32)}>
                    <BarChart
                      data={chartConvenio}
                      layout="vertical"
                      margin={{ left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => formatCurrencyCompact(v)}
                      />
                      <YAxis type="category" dataKey="nome" width={180} tick={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltipContent />} />
                      <Bar dataKey="totalFaturado" name="Faturado" radius={[0, 6, 6, 0]}>
                        {chartConvenio.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Sem dados
                  </div>
                )}
              </ChartCard>

              {/* Tabelas de ranking: Setor e Convênio */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ranking Setores */}
                <ChartCard title={`Ranking de Setores (${anoAtual})`} icon={Building2}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Setor</TableHead>
                          <TableHead className="text-right">Faturado</TableHead>
                          <TableHead className="text-right">Contas</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.porSetor.slice(0, 15).map((s, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={s.setor}>{s.setor}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(s.totalFaturado)}</TableCell>
                            <TableCell className="text-right">{formatNumber(s.qtdContas)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{s.percentual}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ChartCard>

                {/* Ranking Convênios */}
                <ChartCard title={`Ranking de Convênios (${anoAtual})`} icon={Heart}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Convênio</TableHead>
                          <TableHead className="text-right">Faturado</TableHead>
                          <TableHead className="text-right">Contas</TableHead>
                          <TableHead className="text-right">%</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.porConvenio.map((c, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={c.convenio}>{c.convenio}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(c.totalFaturado)}</TableCell>
                            <TableCell className="text-right">{formatNumber(c.qtdContas)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{c.percentual}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ChartCard>
              </div>

              {/* Ranking Tipo de Atendimento */}
              <ChartCard title={`Faturamento por Tipo de Atendimento (${anoAtual})`} icon={Stethoscope}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Faturado</TableHead>
                        <TableHead className="text-right">Contas</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.porTipoAtendimento.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Badge variant="secondary">{t.tipo}</Badge>
                          </TableCell>
                          <TableCell>{t.tipoDescricao}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(t.totalFaturado)}</TableCell>
                          <TableCell className="text-right">{formatNumber(t.qtdContas)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{t.percentual}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ChartCard>
            </TabsContent>

            {/* ========== ABA TABELA COMPARATIVA ========== */}
            <TabsContent value="tabela" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* KPIs resumo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <KpiCard
                    title={`Total ${anoAtual}`}
                    value={formatCurrency(data.acumulado.totalFaturadoAtual)}
                    subtitle="Acumulado"
                    icon={DollarSign}
                    gradient="blue"
                    trend={{
                      value: data.acumulado.variacaoPercentual,
                      label: `vs ${anoAnterior}`,
                    }}
                  />
                  <KpiCard
                    title={`Total ${anoAnterior}`}
                    value={formatCurrency(data.acumulado.totalFaturadoAnterior)}
                    subtitle="Acumulado"
                    icon={DollarSign}
                    gradient="violet"
                  />
                  <KpiCard
                    title="Diferença"
                    value={formatCurrency(data.acumulado.totalFaturadoAtual - data.acumulado.totalFaturadoAnterior)}
                    subtitle={`${anoAtual} - ${anoAnterior}`}
                    icon={data.acumulado.variacaoPercentual >= 0 ? TrendingUp : TrendingDown}
                    gradient={data.acumulado.variacaoPercentual >= 0 ? "emerald" : "amber"}
                  />
                  <KpiCard
                    title="Variação"
                    value={`${data.acumulado.variacaoPercentual > 0 ? "+" : ""}${data.acumulado.variacaoPercentual.toFixed(1)}%`}
                    subtitle="Percentual"
                    icon={data.acumulado.variacaoPercentual >= 0 ? TrendingUp : TrendingDown}
                    gradient={data.acumulado.variacaoPercentual >= 0 ? "emerald" : "amber"}
                  />
                </div>

                {/* Tabela Mês a Mês */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Comparativo Mês a Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Mês</TableHead>
                            <TableHead className="text-right">Faturado {anoAtual}</TableHead>
                            <TableHead className="text-right">Faturado {anoAnterior}</TableHead>
                            <TableHead className="text-center">Variação</TableHead>
                            <TableHead className="text-right">Contas {anoAtual}</TableHead>
                            <TableHead className="text-right">Contas {anoAnterior}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.tabelaComparativa.map((m, i) => {
                            const temDados = m.faturadoAtual > 0 || m.faturadoAnterior > 0;
                            return (
                              <TableRow
                                key={i}
                                className={!temDados ? "opacity-40" : ""}
                              >
                                <TableCell className="font-medium">{m.mesNome}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {m.faturadoAtual > 0 ? formatCurrency(m.faturadoAtual) : "-"}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {m.faturadoAnterior > 0 ? formatCurrency(m.faturadoAnterior) : "-"}
                                </TableCell>
                                <TableCell className="text-center">
                                  {temDados ? <VariacaoBadge valor={m.variacao} /> : "-"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {m.qtdContasAtual > 0 ? formatNumber(m.qtdContasAtual) : "-"}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {m.qtdContasAnterior > 0 ? formatNumber(m.qtdContasAnterior) : "-"}
                                </TableCell>
                              </TableRow>
                            );
                          })}

                          {/* Totais */}
                          <TableRow className="border-t-2 border-primary/30 font-bold bg-muted/30">
                            <TableCell>TOTAL</TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(data.acumulado.totalFaturadoAtual)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(data.acumulado.totalFaturadoAnterior)}
                            </TableCell>
                            <TableCell className="text-center">
                              <VariacaoBadge valor={data.acumulado.variacaoPercentual} />
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(data.acumulado.qtdContasAtual)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(data.acumulado.qtdContasAnterior)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de linha comparativo */}
                <ChartCard title={`Evolução Mensal: ${anoAtual} vs ${anoAnterior}`} icon={TrendingUp}>
                  {chartMesComparativo.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={chartMesComparativo}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => formatCurrencyCompact(v)}
                        />
                        <Tooltip content={<CustomTooltipContent />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey={String(anoAtual)}
                          name={String(anoAtual)}
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        <Line
                          type="monotone"
                          dataKey={String(anoAnterior)}
                          name={String(anoAnterior)}
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                      Sem dados para exibir
                    </div>
                  )}
                </ChartCard>
              </motion.div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
