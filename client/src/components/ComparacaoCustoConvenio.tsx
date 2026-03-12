import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, PieChart, Pie,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent, Package, Scale,
} from "lucide-react";

interface ComparacaoData {
  resumo: {
    totalItens: number;
    totalComLucro: number;
    totalComPrejuizo: number;
    totalNeutro: number;
    margemMediaPercent: number;
    margemTotalReais: number;
    custoTotalHospital: number;
    valorTotalConvenio: number;
  };
  topPrejuizo: { codprod: string; descricao: string; tipoprod: string; codtbmm: string; tabelaPrecoDesc: string; custoHospital: number; valorConvenio: number; margemReais: number; margemPercent: number }[];
  topLucro: { codprod: string; descricao: string; tipoprod: string; codtbmm: string; tabelaPrecoDesc: string; custoHospital: number; valorConvenio: number; margemReais: number; margemPercent: number }[];
  margemPorTipo: { tipo: string; margemMedia: number; custoMedio: number; valorMedio: number; total: number }[];
  margemPorTabela: { tabela: string; codigo: string; margemMedia: number; custoMedio: number; valorMedio: number; total: number }[];
  margemPorConvenio?: { convenio: string; codplaco: string; margemMedia: number; custoMedio: number; valorMedio: number; total: number }[];
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

const COLORS_LUCRO_PREJUIZO = ["#22c55e", "#ef4444", "#94a3b8"];
const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];

export default function ComparacaoCustoConvenio({ data }: { data: ComparacaoData }) {
  const { resumo, topPrejuizo, topLucro, margemPorTipo, margemPorTabela, margemPorConvenio } = data;

  // Dados para gráfico de pizza (distribuição lucro/prejuízo/neutro)
  const pieData = useMemo(() => [
    { name: "Com Lucro", value: resumo.totalComLucro, color: "#22c55e" },
    { name: "Com Prejuízo", value: resumo.totalComPrejuizo, color: "#ef4444" },
    { name: "Neutro", value: resumo.totalNeutro, color: "#94a3b8" },
  ].filter(d => d.value > 0), [resumo]);

  // Dados para gráfico de barras - Top Prejuízo
  const topPrejuizoChart = useMemo(() =>
    topPrejuizo.slice(0, 10).map(d => ({
      nome: d.descricao.length > 30 ? d.descricao.substring(0, 30) + "..." : d.descricao,
      prejuizo: Math.abs(d.margemReais),
      custoHospital: d.custoHospital,
      valorConvenio: d.valorConvenio,
      codprod: d.codprod,
      tabela: d.tabelaPrecoDesc,
    })),
    [topPrejuizo]
  );

  // Dados para gráfico de barras - Top Lucro
  const topLucroChart = useMemo(() =>
    topLucro.slice(0, 10).map(d => ({
      nome: d.descricao.length > 30 ? d.descricao.substring(0, 30) + "..." : d.descricao,
      lucro: d.margemReais,
      custoHospital: d.custoHospital,
      valorConvenio: d.valorConvenio,
      codprod: d.codprod,
      tabela: d.tabelaPrecoDesc,
    })),
    [topLucro]
  );

  // Dados para gráfico comparativo por tipo
  const comparativoPorTipo = useMemo(() =>
    margemPorTipo.map(t => ({
      tipo: t.tipo,
      "Custo Hospital": t.custoMedio,
      "Valor Convênio": t.valorMedio,
      margem: t.margemMedia,
      total: t.total,
    })),
    [margemPorTipo]
  );

  // Dados para gráfico comparativo por tabela
  const comparativoPorTabela = useMemo(() =>
    margemPorTabela.map(t => ({
      tabela: t.tabela,
      "Custo Hospital": t.custoMedio,
      "Valor Convênio": t.valorMedio,
      margem: t.margemMedia,
      total: t.total,
    })),
    [margemPorTabela]
  );

  // Dados para gráfico comparativo por convênio
  const comparativoPorConvenio = useMemo(() =>
    (margemPorConvenio || []).map(c => ({
      convenio: c.convenio.length > 20 ? c.convenio.substring(0, 20) + "..." : c.convenio,
      convenioFull: c.convenio,
      "Custo Hospital": c.custoMedio,
      "Valor Convênio": c.valorMedio,
      margem: c.margemMedia,
      total: c.total,
    })),
    [margemPorConvenio]
  );

  const CustomTooltipCurrency = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Scale className="h-3.5 w-3.5" />
              Margem Total
            </div>
            <p className={`text-xl font-bold ${resumo.margemTotalReais >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(resumo.margemTotalReais)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatPercent(resumo.margemMediaPercent)} média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Itens com Lucro
            </div>
            <p className="text-xl font-bold text-green-600">
              {resumo.totalComLucro.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {resumo.totalItens > 0 ? ((resumo.totalComLucro / resumo.totalItens) * 100).toFixed(1) : 0}% dos itens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Itens com Prejuízo
            </div>
            <p className="text-xl font-bold text-red-600">
              {resumo.totalComPrejuizo.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {resumo.totalItens > 0 ? ((resumo.totalComPrejuizo / resumo.totalItens) * 100).toFixed(1) : 0}% dos itens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Package className="h-3.5 w-3.5" />
              Total Analisado
            </div>
            <p className="text-xl font-bold">
              {resumo.totalItens.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              itens com custo e valor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5 text-orange-500" />
              Custo Total Hospital
            </div>
            <p className="text-lg font-bold">{formatCurrency(resumo.custoTotalHospital)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              Valor Total Convênio
            </div>
            <p className="text-lg font-bold">{formatCurrency(resumo.valorTotalConvenio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Percent className="h-3.5 w-3.5 text-purple-500" />
              Margem Média
            </div>
            <p className={`text-lg font-bold ${resumo.margemMediaPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPercent(resumo.margemMediaPercent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos linha 1: Pizza + Comparativo por Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pizza: Distribuição Lucro/Prejuízo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Distribuição Lucro / Prejuízo</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR")} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparativo por Tipo de Produto */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custo Hospital vs Valor Convênio (Média por Tipo)</CardTitle>
          </CardHeader>
          <CardContent>
            {comparativoPorTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparativoPorTipo} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="tipo" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltipCurrency />} />
                  <Legend />
                  <Bar dataKey="Custo Hospital" fill="#f97316" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Valor Convênio" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráficos linha 2: Comparativo por Tabela de Preço */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Custo Hospital vs Valor Convênio (Média por Tabela de Preço)</CardTitle>
        </CardHeader>
        <CardContent>
          {comparativoPorTabela.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparativoPorTabela}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="tabela" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltipCurrency />} />
                <Legend />
                <Bar dataKey="Custo Hospital" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Valor Convênio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados para exibir
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráficos linha 3: Top Prejuízo + Top Lucro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Prejuízo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Top 10 Itens com Maior Prejuízo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topPrejuizoChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(250, topPrejuizoChart.length * 32)}>
                <BarChart data={topPrejuizoChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nome" width={180} tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-medium mb-1">{d?.codprod} - {d?.nome}</p>
                          <p className="text-muted-foreground">{d?.tabela}</p>
                          <p>Custo Hospital: {formatCurrency(d?.custoHospital || 0)}</p>
                          <p>Valor Convênio: {formatCurrency(d?.valorConvenio || 0)}</p>
                          <p className="text-red-600 font-medium">Prejuízo: {formatCurrency(d?.prejuizo || 0)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="prejuizo" fill="#ef4444" radius={[0, 4, 4, 0]} name="Prejuízo (R$)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum item com prejuízo encontrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Lucro */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top 10 Itens com Maior Lucro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topLucroChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(250, topLucroChart.length * 32)}>
                <BarChart data={topLucroChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nome" width={180} tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-xs">
                          <p className="font-medium mb-1">{d?.codprod} - {d?.nome}</p>
                          <p className="text-muted-foreground">{d?.tabela}</p>
                          <p>Custo Hospital: {formatCurrency(d?.custoHospital || 0)}</p>
                          <p>Valor Convênio: {formatCurrency(d?.valorConvenio || 0)}</p>
                          <p className="text-green-600 font-medium">Lucro: {formatCurrency(d?.lucro || 0)}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="lucro" fill="#22c55e" radius={[0, 4, 4, 0]} name="Lucro (R$)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                Nenhum item com lucro encontrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico comparativo por Convênio */}
      {comparativoPorConvenio.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Custo Hospital vs Valor Convênio (Média por Convênio)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(280, comparativoPorConvenio.length * 35)}>
              <BarChart data={comparativoPorConvenio} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="convenio" width={160} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltipCurrency />} />
                <Legend />
                <Bar dataKey="Custo Hospital" fill="#f97316" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Valor Conv\u00eanio" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela resumo margem por convênio */}
      {(margemPorConvenio || []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resumo de Margem por Convênio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Convênio</th>
                    <th className="pb-2 font-medium text-right">Qtd Itens</th>
                    <th className="pb-2 font-medium text-right">Custo Médio</th>
                    <th className="pb-2 font-medium text-right">Valor Convênio Médio</th>
                    <th className="pb-2 font-medium text-right">Margem Média</th>
                  </tr>
                </thead>
                <tbody>
                  {(margemPorConvenio || []).map((c, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2">{c.convenio}</td>
                      <td className="py-2 text-right">{c.total.toLocaleString("pt-BR")}</td>
                      <td className="py-2 text-right">{formatCurrency(c.custoMedio)}</td>
                      <td className="py-2 text-right">{formatCurrency(c.valorMedio)}</td>
                      <td className="py-2 text-right">
                        <Badge variant={c.margemMedia >= 0 ? "default" : "destructive"} className="text-xs">
                          {formatPercent(c.margemMedia)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela resumo margem por tabela de preço */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Resumo de Margem por Tabela de Preço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Tabela</th>
                  <th className="pb-2 font-medium text-right">Qtd Itens</th>
                  <th className="pb-2 font-medium text-right">Custo Médio</th>
                  <th className="pb-2 font-medium text-right">Valor Convênio Médio</th>
                  <th className="pb-2 font-medium text-right">Margem Média</th>
                </tr>
              </thead>
              <tbody>
                {margemPorTabela.map((t, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2">{t.tabela}</td>
                    <td className="py-2 text-right">{t.total.toLocaleString("pt-BR")}</td>
                    <td className="py-2 text-right">{formatCurrency(t.custoMedio)}</td>
                    <td className="py-2 text-right">{formatCurrency(t.valorMedio)}</td>
                    <td className="py-2 text-right">
                      <Badge variant={t.margemMedia >= 0 ? "default" : "destructive"} className="text-xs">
                        {formatPercent(t.margemMedia)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {margemPorTabela.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-muted-foreground">Sem dados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
