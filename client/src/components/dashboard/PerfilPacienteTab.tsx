import { useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { Users, MapPin, UserCheck, Percent } from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import HeatmapPacientes from "@/components/dashboard/HeatmapPacientes";
import { Skeleton } from "@/components/ui/skeleton";

const SEXO_COLORS: Record<string, string> = {
  Masculino: "#3b82f6",
  Feminino: "#ec4899",
  "Não informado": "#6b7280",
};

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#a855f7", "#22c55e",
  "#d946ef", "#0891b2", "#65a30d", "#dc2626", "#7c3aed",
];

interface DemograficasData {
  porSexo: Array<{ sexo: string; total: number; percentual: number }>;
  porSexoTipo: Array<{ sexo: string; tipo: string; total: number }>;
  porCep: Array<{ cep: string; cidade?: string; total: number; percentual: number }>;
  porCepTipo: Array<{ cep: string; tipo: string; total: number }>;
  totalComSexo: number;
  totalComCep: number;
  totalGeral: number;
  fonte: string;
}

interface Props {
  data: DemograficasData | null | undefined;
  isLoading: boolean;
  dataInicio?: string;
  dataFim?: string;
  dashboardAtivo?: boolean;
}

const CustomTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{p.value?.toLocaleString("pt-BR")}</span>
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
      <p className="font-semibold">{d.name}</p>
      <p>{d.value?.toLocaleString("pt-BR")} atendimentos ({d.payload?.percentual}%)</p>
    </div>
  );
};

export default function PerfilPacienteTab({ data, isLoading, dataInicio, dataFim, dashboardAtivo }: Props) {
  // Prepare stacked bar data for Sexo × Tipo
  const sexoTipoData = useMemo(() => {
    if (!data?.porSexoTipo?.length) return { chartData: [], tipos: [] };
    const tipos = [...new Set(data.porSexoTipo.map(d => d.tipo))];
    const sexos = [...new Set(data.porSexoTipo.map(d => d.sexo))];
    const chartData = sexos.map(sexo => {
      const row: any = { sexo };
      tipos.forEach(tipo => {
        const match = data.porSexoTipo.find(d => d.sexo === sexo && d.tipo === tipo);
        row[tipo] = match?.total || 0;
      });
      return row;
    });
    return { chartData, tipos };
  }, [data?.porSexoTipo]);

  // Format CEP for display
  const formatCep = (cep: string) => {
    if (cep === "Não informado" || !cep) return cep;
    const clean = cep.replace(/\D/g, "");
    if (clean.length === 8) return `${clean.slice(0, 5)}-${clean.slice(5)}`;
    return cep;
  };

  // Get display name for CEP (city or formatted CEP)
  const getDisplayName = (item: { cep: string; cidade?: string }) => {
    if (item.cidade && item.cidade !== item.cep && item.cidade !== "Não informado") {
      return item.cidade;
    }
    return formatCep(item.cep);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">Clique em "Carregar" para visualizar o perfil dos pacientes</p>
      </div>
    );
  }

  const masculino = data.porSexo.find(s => s.sexo === "Masculino");
  const feminino = data.porSexo.find(s => s.sexo === "Feminino");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Atendimentos"
          value={data.totalGeral.toLocaleString("pt-BR")}
          icon={Users}
          gradient="blue"
        />
        <KpiCard
          title="Masculino"
          value={masculino ? `${masculino.total.toLocaleString("pt-BR")} (${masculino.percentual}%)` : "0"}
          icon={UserCheck}
          gradient="blue"
        />
        <KpiCard
          title="Feminino"
          value={feminino ? `${feminino.total.toLocaleString("pt-BR")} (${feminino.percentual}%)` : "0"}
          icon={UserCheck}
          gradient="violet"
        />
        <KpiCard
          title="Cidades Distintas"
          value={data.porCep.filter(c => c.cep !== "Não informado").length.toLocaleString("pt-BR")}
          icon={MapPin}
          gradient="emerald"
        />
      </div>

      {/* Charts Row 1: Sexo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Distribuição por Sexo */}
        <ChartCard title="Distribuição por Sexo" icon={Users}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.porSexo}
                dataKey="total"
                nameKey="sexo"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={3}
                label={({ sexo, percentual }) => `${sexo} (${percentual}%)`}
                labelLine={true}
              >
                {data.porSexo.map((entry, i) => (
                  <Cell key={i} fill={SEXO_COLORS[entry.sexo] || CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Stacked Bar - Sexo × Tipo de Atendimento */}
        <ChartCard title="Sexo por Tipo de Atendimento" icon={Percent}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sexoTipoData.chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="sexo" width={90} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltipContent />} />
              <Legend />
              {sexoTipoData.tipos.map((tipo, i) => (
                <Bar key={tipo} dataKey={tipo} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === sexoTipoData.tipos.length - 1 ? [0, 4, 4, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Mapa de Calor Geográfico - substitui o gráfico de barras de CEPs */}
      {dataInicio && dataFim && (
        <div className="grid grid-cols-1 gap-6">
          <HeatmapPacientes
            dataInicio={dataInicio}
            dataFim={dataFim}
            enabled={!!dashboardAtivo}
          />
        </div>
      )}

      {/* Tabela de Cidades detalhada */}
      {data.porCep.length > 0 && (
        <ChartCard title="Top 20 Cidades com Mais Atendimentos" icon={MapPin}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">#</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Cidade</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">CEP</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Atendimentos</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">%</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Proporção</th>
                </tr>
              </thead>
              <tbody>
                {data.porCep.map((item, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-3 font-medium">{getDisplayName(item)}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground text-xs">{formatCep(item.cep)}</td>
                    <td className="py-2 px-3 text-right font-medium">{item.total.toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{item.percentual}%</td>
                    <td className="py-2 px-3 w-40">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (item.total / (data.porCep[0]?.total || 1)) * 100)}%`,
                            backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Fonte */}
      <p className="text-xs text-muted-foreground text-right">
        Fonte: {data.fonte === "cache_local" ? "Cache local" : "PostgreSQL direto"}
      </p>
    </motion.div>
  );
}
