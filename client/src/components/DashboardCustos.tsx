import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Package, DollarSign, Pill, Layers, Database, Cloud,
  TrendingUp, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const CHART_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57",
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

const TIPO_COLORS: Record<string, string> = {
  Medicamento: "#0088FE",
  Taxa: "#00C49F",
  Outros: "#FFBB28",
};

interface MetricasCustosDashboard {
  totalProdutos: number;
  totalMedicamentos: number;
  totalTaxas: number;
  totalOutros: number;
  custoMedioEstoque: number;
  custoMedioFatura: number;
  valorMedioMM: number;
  porTipoProduto: { nome: string; codigo: string; total: number }[];
  porTabelaPreco: { nome: string; codigo: string; total: number }[];
  topCustoEstoque: { codprod: string; descricao: string; custoEstoque: number; tipoprod: string }[];
  topCustoFatura: { codprod: string; descricao: string; custoMultFat: number; tipoprod: string }[];
  comparativoCustos: { tipo: string; custoEstoque: number; custoFatura: number; valorMM: number }[];
  fonte: "cache_local" | "postgresql_direto";
}

interface DashboardCustosProps {
  metricas: MetricasCustosDashboard | undefined;
  isLoading: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function truncateLabel(label: string, maxLen: number = 25): string {
  if (!label) return "";
  return label.length > maxLen ? label.slice(0, maxLen) + "..." : label;
}

function KpiCard({ title, value, icon: Icon, color, subtitle }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold text-foreground">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardCustos({ metricas, isLoading }: DashboardCustosProps) {
  const dadosTipo = useMemo(() => {
    if (!metricas?.porTipoProduto) return [];
    return metricas.porTipoProduto.map((t) => ({
      name: t.nome,
      value: t.total,
    }));
  }, [metricas?.porTipoProduto]);

  const dadosTabela = useMemo(() => {
    if (!metricas?.porTabelaPreco) return [];
    return metricas.porTabelaPreco.map((t) => ({
      nome: t.nome,
      total: t.total,
    }));
  }, [metricas?.porTabelaPreco]);

  const dadosTopEstoque = useMemo(() => {
    if (!metricas?.topCustoEstoque) return [];
    return metricas.topCustoEstoque.map((d) => ({
      nome: truncateLabel(d.descricao, 22),
      nomeCompleto: `${d.codprod} - ${d.descricao}`,
      valor: d.custoEstoque,
      tipoprod: d.tipoprod,
    }));
  }, [metricas?.topCustoEstoque]);

  const dadosTopFatura = useMemo(() => {
    if (!metricas?.topCustoFatura) return [];
    return metricas.topCustoFatura.map((d) => ({
      nome: truncateLabel(d.descricao, 22),
      nomeCompleto: `${d.codprod} - ${d.descricao}`,
      valor: d.custoMultFat,
      tipoprod: d.tipoprod,
    }));
  }, [metricas?.topCustoFatura]);

  const dadosComparativo = useMemo(() => {
    if (!metricas?.comparativoCustos) return [];
    return metricas.comparativoCustos.map((c) => ({
      tipo: c.tipo,
      "Custo Estoque": Number(c.custoEstoque.toFixed(4)),
      "Custo Fatura": Number(c.custoFatura.toFixed(4)),
      "Valor MM": Number(c.valorMM.toFixed(4)),
    }));
  }, [metricas?.comparativoCustos]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5 pb-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!metricas) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Clique em "Carregar Dashboard" para visualizar as metricas</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            As metricas serao calculadas com base nos custos de produtos sincronizados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fonte dos dados */}
      <div className="flex items-center gap-2">
        <Badge
          variant="secondary"
          className={`text-xs py-1 px-2 ${
            metricas.fonte === "cache_local"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          }`}
        >
          {metricas.fonte === "cache_local" ? (
            <><Database className="h-3 w-3 mr-1" /> Cache Local</>
          ) : (
            <><Cloud className="h-3 w-3 mr-1" /> PostgreSQL Direto</>
          )}
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Produtos"
          value={metricas.totalProdutos}
          icon={Package}
          color="bg-blue-600"
          subtitle={`${metricas.totalMedicamentos} med. | ${metricas.totalTaxas} taxas | ${metricas.totalOutros} outros`}
        />
        <KpiCard
          title="Custo Medio Estoque"
          value={formatCurrency(metricas.custoMedioEstoque)}
          icon={DollarSign}
          color="bg-emerald-600"
          subtitle="media por produto"
        />
        <KpiCard
          title="Custo Medio Fatura"
          value={formatCurrency(metricas.custoMedioFatura)}
          icon={TrendingUp}
          color="bg-purple-600"
          subtitle="media custo/mult fatura"
        />
        <KpiCard
          title="Valor Medio MM"
          value={formatCurrency(metricas.valorMedioMM)}
          icon={BarChart3}
          color="bg-orange-600"
          subtitle="media valor tabela"
        />
      </div>

      {/* Linha 1: Distribuição por Tipo + Distribuição por Tabela de Preço */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Tipo de Produto */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              Distribuicao por Tipo de Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {dadosTipo.map((entry, idx) => (
                      <Cell key={idx} fill={TIPO_COLORS[entry.name] || CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString("pt-BR"), "Produtos"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por Tabela de Preço */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Produtos por Tabela de Preco
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosTabela.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosTabela} margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString("pt-BR"), "Produtos"]}
                  />
                  <Bar dataKey="total" name="Produtos" fill="#8884D8" radius={[4, 4, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Comparativo Custo Estoque vs Fatura vs Valor MM */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            Comparativo de Custos Medios por Tipo de Produto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dadosComparativo.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dadosComparativo} margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="tipo" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v.toFixed(2)}`} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend />
                <Bar dataKey="Custo Estoque" fill="#0088FE" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="Custo Fatura" fill="#00C49F" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="Valor MM" fill="#FFBB28" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linha 3: Top 20 Custo Estoque + Top 20 Custo Fatura */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 20 Custo Estoque */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Top 20 Produtos - Custo Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosTopEstoque.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(350, dadosTopEstoque.length * 24)}>
                <BarChart data={dadosTopEstoque} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v.toFixed(2)}`} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={160}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-sm">
                          <p className="font-medium">{d.nomeCompleto}</p>
                          <p className="text-muted-foreground">
                            Custo: <span className="font-semibold text-foreground">{formatCurrency(d.valor)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="valor" name="Custo Estoque" fill="#0088FE" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 20 Custo Fatura */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Top 20 Produtos - Custo Fatura
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosTopFatura.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(350, dadosTopFatura.length * 24)}>
                <BarChart data={dadosTopFatura} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v.toFixed(2)}`} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={160}
                    tick={{ fontSize: 9 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-sm">
                          <p className="font-medium">{d.nomeCompleto}</p>
                          <p className="text-muted-foreground">
                            Custo: <span className="font-semibold text-foreground">{formatCurrency(d.valor)}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="valor" name="Custo Fatura" fill="#00C49F" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
