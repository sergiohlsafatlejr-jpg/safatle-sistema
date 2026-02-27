import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  LineChart as RechartsLineChart,
  Line,
  Cell,
  ResponsiveContainer,
  Legend as RechartsLegend,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { BarChart3, PieChart, TrendingUp } from "lucide-react";

const CORES = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

interface ConvenioBarChartProps {
  data: Array<{ convenio: string; faturado: number; recebido: number; glosado: number; itens: number }>;
  visibleSeries?: { faturado: boolean; recebido: boolean; glosado: boolean };
}

export function ConvenioBarChart({ data, visibleSeries = { faturado: true, recebido: true, glosado: true } }: ConvenioBarChartProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Valores por Convênio
        </CardTitle>
        <CardDescription>Comparação de faturado, recebido e glosado</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="convenio" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <RechartsTooltip
                formatter={(value) =>
                  `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                }
              />
              <RechartsLegend />
              {visibleSeries.faturado && <RechartsBar dataKey="faturado" fill="#3b82f6" name="Faturado" />}
              {visibleSeries.recebido && <RechartsBar dataKey="recebido" fill="#10b981" name="Recebido" />}
              {visibleSeries.glosado && <RechartsBar dataKey="glosado" fill="#ef4444" name="Glosado" />}
            </RechartsBarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TiposPieChartProps {
  data: Array<{ tipo: string; valor: number; quantidade: number; percentual: string }>;
  onTipoClick?: (tipo: string | null) => void;
  tipoSelecionado?: string | null;
}

type ViewMode = "valor" | "quantidade";

const renderDonutLabel = (viewMode: ViewMode) => ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text
      x={x}
      y={y}
      fill="currentColor"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-[11px] fill-foreground"
    >
      {name} ({(percent * 100).toFixed(1)}%)
    </text>
  );
};

export function TiposPieChart({ data, onTipoClick, tipoSelecionado }: TiposPieChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("valor");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const dataKey = viewMode === "valor" ? "valor" : "quantidade";
  const total = data.reduce((sum, item) => sum + item[dataKey], 0);
  const totalLabel = viewMode === "valor"
    ? `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : `${total.toLocaleString("pt-BR")} itens`;

  const handleClick = (_: unknown, index: number) => {
    if (!onTipoClick) return;
    const clickedTipo = data[index]?.tipo;
    if (tipoSelecionado === clickedTipo) {
      onTipoClick(null);
      setActiveIndex(null);
    } else {
      onTipoClick(clickedTipo);
      setActiveIndex(index);
    }
  };

  // Sync activeIndex with tipoSelecionado
  const resolvedActiveIndex = tipoSelecionado
    ? data.findIndex(d => d.tipo === tipoSelecionado)
    : null;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              Distribuição por Tipo
            </CardTitle>
            <CardDescription>
              {tipoSelecionado
                ? `Filtrado: ${tipoSelecionado} — clique novamente para limpar`
                : "Clique em uma fatia para filtrar"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            <button
              onClick={() => setViewMode("valor")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "valor"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              R$ Valor
            </button>
            <button
              onClick={() => setViewMode("quantidade")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                viewMode === "quantidade"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Qtd Itens
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="relative">
            <ResponsiveContainer width="100%" height={350}>
              <RechartsPieChart>
                <RechartsPie
                  data={data}
                  dataKey={dataKey}
                  nameKey="tipo"
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={110}
                  label={renderDonutLabel(viewMode)}
                  labelLine={true}
                  onClick={handleClick}
                  style={{ cursor: onTipoClick ? "pointer" : "default" }}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CORES[index % CORES.length]}
                      opacity={
                        resolvedActiveIndex !== null && resolvedActiveIndex !== -1
                          ? index === resolvedActiveIndex ? 1 : 0.35
                          : 1
                      }
                      stroke={
                        resolvedActiveIndex !== null && index === resolvedActiveIndex
                          ? "#fff"
                          : "transparent"
                      }
                      strokeWidth={resolvedActiveIndex !== null && index === resolvedActiveIndex ? 3 : 0}
                    />
                  ))}
                </RechartsPie>
                <RechartsTooltip
                  formatter={(value: number, name: string) => [
                    viewMode === "valor"
                      ? `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      : `${Number(value).toLocaleString("pt-BR")} itens`,
                    name,
                  ]}
                />
                <RechartsLegend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value: string) => <span className="text-xs">{value}</span>}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            {/* Center label for donut */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: "-5%" }}>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground leading-tight">{totalLabel}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface EvolucaoMensalChartProps {
  data: Array<{ mes: string; faturado?: number; recebido?: number; glosado?: number }>;
  visibleSeries?: { faturado: boolean; recebido: boolean; glosado: boolean };
}

export function EvolucaoMensalChart({ data, visibleSeries = { faturado: true, recebido: true, glosado: true } }: EvolucaoMensalChartProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Evolução Mensal
        </CardTitle>
        <CardDescription>Tendência de faturamento ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" />
              <YAxis />
              <RechartsTooltip
                formatter={(value) =>
                  `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                }
              />
              <RechartsLegend />
              {visibleSeries.faturado && <Line type="monotone" dataKey="faturado" stroke="#3b82f6" name="Faturado" />}
              {visibleSeries.recebido && <Line type="monotone" dataKey="recebido" stroke="#10b981" name="Recebido" />}
              {visibleSeries.glosado && <Line type="monotone" dataKey="glosado" stroke="#ef4444" name="Glosado" />}
            </RechartsLineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
