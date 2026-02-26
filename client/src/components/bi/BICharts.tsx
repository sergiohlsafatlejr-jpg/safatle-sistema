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
  data: Array<{ tipo: string; valor: number; percentual: string }>;
}

export function TiposPieChart({ data }: TiposPieChartProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-purple-600" />
          Distribuição por Tipo
        </CardTitle>
        <CardDescription>Percentual de valores recebidos</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <RechartsPie
                data={data}
                dataKey="valor"
                nameKey="tipo"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                ))}
              </RechartsPie>
              <RechartsTooltip
                formatter={(value) =>
                  `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                }
              />
            </RechartsPieChart>
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
