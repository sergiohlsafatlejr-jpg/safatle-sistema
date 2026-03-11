import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Filter, X, TrendingUp, TrendingDown, Building2, Package,
  DollarSign, AlertTriangle, Loader2, BarChart3, PieChart,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const COLORS = [
  "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981",
  "#ec4899", "#3b82f6", "#f97316", "#14b8a6", "#a855f7",
];

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value.toFixed(1)}%`;
}

interface CustosPorConvenioProps {
  estabelecimentoId: number;
}

export default function CustosPorConvenio({ estabelecimentoId }: CustosPorConvenioProps) {
  const [loaded, setLoaded] = useState(false);
  const [convenio, setConvenio] = useState<string>("");
  const [tipoItem, setTipoItem] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [showTopPrejuizo, setShowTopPrejuizo] = useState(false);

  const queryInput = useMemo(() => ({
    estabelecimentoId,
    convenio: convenio || undefined,
    tipoItem: tipoItem || undefined,
    competencia: competencia || undefined,
    busca: busca || undefined,
  }), [estabelecimentoId, convenio, tipoItem, competencia, busca]);

  const { data, isLoading, error } = trpc.relatorioCustos.custosPorConvenio.useQuery(
    queryInput,
    { enabled: estabelecimentoId > 0 && loaded }
  );

  const handleLoad = () => {
    if (estabelecimentoId <= 0) {
      toast.error("Selecione um estabelecimento");
      return;
    }
    setLoaded(true);
  };

  const handleSearch = () => {
    setBusca(buscaInput);
  };

  const handleClearFilters = () => {
    setConvenio("");
    setTipoItem("");
    setCompetencia("");
    setBusca("");
    setBuscaInput("");
  };

  const filterCount = [convenio, tipoItem, competencia, busca].filter(Boolean).length;

  if (!loaded) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Custos por Convênio</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Cruza os itens faturados nas contas de convênio com os custos de estoque para calcular a margem real por convênio.
          </p>
          <Button onClick={handleLoad} size="lg">
            <BarChart3 className="h-4 w-4 mr-2" />
            Carregar Análise
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <p className="text-destructive font-medium">Erro ao carregar dados</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          <Button variant="outline" className="mt-4" onClick={() => setLoaded(false)}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { kpis, resumoPorConvenio, resumoPorTipoItem, topItensCusto, topItensPrejuizo, evolucaoMensal } = data;

  // Dados para gráfico de pizza por convênio
  const pieData = resumoPorConvenio.slice(0, 8).map((c, i) => ({
    name: c.convenio.length > 20 ? c.convenio.substring(0, 20) + "..." : c.convenio,
    fullName: c.convenio,
    value: c.valorFaturado,
    custo: c.custoEstoque,
    margem: c.margem,
    color: COLORS[i % COLORS.length],
  }));

  // Dados para gráfico de barras por convênio (margem)
  const barData = resumoPorConvenio.slice(0, 10).map((c) => ({
    convenio: c.convenio.length > 15 ? c.convenio.substring(0, 15) + "..." : c.convenio,
    fullName: c.convenio,
    faturado: c.valorFaturado,
    custo: c.custoEstoque,
    margem: c.margem,
    margemPercent: c.margemPercent,
  }));

  // Dados para gráfico de barras por tipo de item
  const tipoBarData = resumoPorTipoItem.map((t) => ({
    tipo: t.tipoItem,
    faturado: t.valorFaturado,
    custo: t.custoEstoque,
    margem: t.margem,
  }));

  const CustomTooltipCurrency = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover text-popover-foreground border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold mb-1">{payload[0]?.payload?.fullName || label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-popover text-popover-foreground border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-semibold mb-1">{d.fullName}</p>
        <p>Faturado: {formatCurrency(d.value)}</p>
        <p>Custo: {formatCurrency(d.custo)}</p>
        <p className={d.margem >= 0 ? "text-emerald-400" : "text-red-400"}>
          Margem: {formatCurrency(d.margem)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-3">
            {data.conveniosDisponiveis.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Convênio</Label>
                <Select value={convenio} onValueChange={setConvenio}>
                  <SelectTrigger className="w-[200px] h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {data.conveniosDisponiveis.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {data.tiposItemDisponiveis.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Tipo Item</Label>
                <Select value={tipoItem} onValueChange={setTipoItem}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {data.tiposItemDisponiveis.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {data.competenciasDisponiveis.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Competência</Label>
                <Select value={competencia} onValueChange={setCompetencia}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {data.competenciasDisponiveis.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Busca</Label>
              <div className="flex gap-1">
                <Input
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                  placeholder="Código ou descrição..."
                  className="w-[180px] h-9"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button size="sm" variant="outline" onClick={handleSearch} className="h-9">
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {filterCount > 0 && (
              <Button size="sm" variant="ghost" onClick={handleClearFilters} className="h-9 text-xs">
                <X className="h-3 w-3 mr-1" /> Limpar ({filterCount})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor Faturado</p>
            <p className="text-xl font-bold text-blue-400 mt-1">{formatCurrency(kpis.valorFaturadoTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpis.totalItensAnalisados.toLocaleString("pt-BR")} itens analisados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Custo Estoque</p>
            <p className="text-xl font-bold text-orange-400 mt-1">{formatCurrency(kpis.custoEstoqueTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpis.totalItensSemCusto} itens sem custo cadastrado</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${kpis.margemTotal >= 0 ? "border-l-emerald-500" : "border-l-red-500"}`}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Margem Total</p>
            <p className={`text-xl font-bold mt-1 ${kpis.margemTotal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(kpis.margemTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {kpis.margemMediaPercent >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              {formatPercent(kpis.margemMediaPercent)} média
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Convênios</p>
            <p className="text-xl font-bold text-purple-400 mt-1">{kpis.totalConvenios}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={kpis.conveniMaiorFaturamento}>
              Maior: {kpis.conveniMaiorFaturamento}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Pizza - Faturamento por Convênio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Faturamento por Convênio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Faturado vs Custo por Convênio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Faturado vs Custo por Convênio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="convenio" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltipCurrency />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="faturado" name="Faturado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="custo" name="Custo" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras - Por Tipo de Item */}
      {tipoBarData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Faturado vs Custo por Tipo de Item
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tipoBarData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltipCurrency />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="faturado" name="Faturado" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" name="Custo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="margem" name="Margem" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Evolução Mensal */}
      {evolucaoMensal.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolução Mensal - Faturado vs Custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolucaoMensal} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="competencia" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltipCurrency />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="valorFaturado" name="Faturado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="custoEstoque" name="Custo" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="margem" name="Margem" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Resumo por Convênio */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Resumo por Convênio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Convênio</TableHead>
                  <TableHead className="text-center">Contas</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-right">Valor Faturado</TableHead>
                  <TableHead className="text-right">Custo Estoque</TableHead>
                  <TableHead className="text-right">Margem (R$)</TableHead>
                  <TableHead className="text-right">Margem (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumoPorConvenio.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium max-w-[200px] truncate" title={c.convenio}>
                      {c.convenio}
                    </TableCell>
                    <TableCell className="text-center">{c.totalContas}</TableCell>
                    <TableCell className="text-center">{c.totalItens.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono text-blue-400">{formatCurrency(c.valorFaturado)}</TableCell>
                    <TableCell className="text-right font-mono text-orange-400">{formatCurrency(c.custoEstoque)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${c.margem >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(c.margem)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={c.margemPercent >= 0 ? "default" : "destructive"} className="text-xs font-mono">
                        {formatPercent(c.margemPercent)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {resumoPorConvenio.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum dado encontrado. Verifique se há contas importadas com convênio.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Toggle Top Itens */}
      <div className="flex gap-2">
        <Button
          variant={!showTopPrejuizo ? "default" : "outline"}
          size="sm"
          onClick={() => setShowTopPrejuizo(false)}
        >
          <DollarSign className="h-3.5 w-3.5 mr-1" />
          Top 20 Maior Custo
        </Button>
        <Button
          variant={showTopPrejuizo ? "destructive" : "outline"}
          size="sm"
          onClick={() => setShowTopPrejuizo(true)}
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
          Top 20 Maior Prejuízo
        </Button>
      </div>

      {/* Tabela Top Itens */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            {showTopPrejuizo ? (
              <><AlertTriangle className="h-4 w-4 text-red-400" /> Top 20 Itens com Maior Prejuízo</>
            ) : (
              <><DollarSign className="h-4 w-4 text-primary" /> Top 20 Itens com Maior Custo Total</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                  <TableHead className="text-right">Faturado</TableHead>
                  <TableHead className="text-right">Custo Unit.</TableHead>
                  <TableHead className="text-right">Custo Total</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Margem %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(showTopPrejuizo ? topItensPrejuizo : topItensCusto).map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{item.codigoItem}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs" title={item.descricao}>
                      {item.descricao}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{item.tipoItem}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs" title={item.convenio}>
                      {item.convenio}
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.quantidade.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono text-blue-400">{formatCurrency(item.valorFaturado)}</TableCell>
                    <TableCell className="text-right font-mono text-orange-400">{formatCurrency(item.custoEstoque)}</TableCell>
                    <TableCell className="text-right font-mono text-orange-400 font-semibold">{formatCurrency(item.custoTotal)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${item.margem >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(item.margem)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={item.margemPercent >= 0 ? "default" : "destructive"} className="text-xs font-mono">
                        {formatPercent(item.margemPercent)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(showTopPrejuizo ? topItensPrejuizo : topItensCusto).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      {showTopPrejuizo ? "Nenhum item com prejuízo encontrado" : "Nenhum item com custo encontrado"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
