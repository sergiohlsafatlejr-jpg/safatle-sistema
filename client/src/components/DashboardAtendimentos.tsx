import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Users, Building2, Stethoscope, FileText, TrendingUp,
  Heart, Layers, BedDouble, ArrowRightLeft, Clock,
} from "lucide-react";
import KpiCard from "@/components/dashboard/KpiCard";
import ChartCard from "@/components/dashboard/ChartCard";
import CustomTooltip, { SimpleTooltip } from "@/components/dashboard/CustomTooltip";
import FunilStatusAtendimentos from "@/components/dashboard/FunilStatusAtendimentos";
import ComparacaoCards from "@/components/dashboard/ComparacaoCards";
import { VolumePorTurno } from "@/components/dashboard/VolumePorTurno";
import { TaxaConversaoEmergencia } from "@/components/dashboard/TaxaConversaoEmergencia";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
  "#84cc16", "#e11d48", "#0ea5e9", "#a855f7", "#22c55e",
];

const TIPO_COLORS: Record<string, string> = {
  "Internação": "#3b82f6",
  "Ambulatorial": "#10b981",
  "Emergência": "#ef4444",
  "Urgência": "#f59e0b",
};

const FUNIL_COLORS = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];

interface MetricasData {
  totalAtendimentos: number;
  totalMedicos: number;
  totalConvenios: number;
  totalProcedimentos: number;
  porMesAno: Array<{ mesAno: string; total: number }>;
  porTipo: Array<{ nome: string; codigo: string | null; total: number }>;
  porMedico: Array<{ nome: string; codigo: string | null; total: number }>;
  porPlano: Array<{ nome: string; codigo: string | null; total: number }>;
  porServico: Array<{ nome: string; codigo: string | null; total: number }>;
  porCid: Array<{ nome: string; codigo: string | null; total: number }>;
  porProcedimento: Array<{ nome: string; codigo: string | null; total: number }>;
  fonte: string;
}

interface ComparacaoData {
  periodoAtual: {
    label: string;
    totalAtendimentos: number;
    totalMedicos: number;
    totalConvenios: number;
    totalProcedimentos: number;
  };
  periodoAnterior: {
    label: string;
    totalAtendimentos: number;
    totalMedicos: number;
    totalConvenios: number;
    totalProcedimentos: number;
  };
  fonte: string;
}

interface MetricasAvancadasData {
  mediaPermanenciaDias: number;
  totalInternacoes: number;
  porTurno: {
    manha: number;
    tarde: number;
    noite: number;
    madrugada: number;
    total: number;
  };
  taxaConversao: {
    totalEmergencias: number;
    totalConvertidos: number;
    taxa: number;
    evolucaoMensal: Array<{
      mesAno: string;
      emergencias: number;
      convertidos: number;
      taxa: number;
    }>;
  };
  comparativoDetalhado: {
    periodoAtual: {
      label: string;
      internacoes: number;
      ambulatoriais: number;
      emergencias: number;
      urgencias: number;
      procedimentos: number;
    };
    periodoAnterior: {
      label: string;
      internacoes: number;
      ambulatoriais: number;
      emergencias: number;
      urgencias: number;
      procedimentos: number;
    };
  };
  porCarater: Array<{ nome: string; total: number }>;
  fonte: string;
}

interface DashboardAtendimentosProps {
  metricas: MetricasData | null | undefined;
  comparacao?: ComparacaoData | null;
  metricasAvancadas?: MetricasAvancadasData | null;
  isLoading: boolean;
}

export default function DashboardAtendimentos({
  metricas,
  comparacao,
  metricasAvancadas,
  isLoading,
}: DashboardAtendimentosProps) {
  // Prepare chart data
  const dadosMesAno = useMemo(() => {
    if (!metricas?.porMesAno) return [];
    return metricas.porMesAno.map((m) => ({
      ...m,
      label: m.mesAno,
    }));
  }, [metricas?.porMesAno]);

  const dadosTipo = useMemo(() => {
    if (!metricas?.porTipo) return [];
    return metricas.porTipo.map((t) => ({
      name: t.nome || "Outros",
      value: t.total,
      fill: TIPO_COLORS[t.nome] || "#94a3b8",
    }));
  }, [metricas?.porTipo]);

  const dadosMedico = useMemo(() => {
    if (!metricas?.porMedico) return [];
    return metricas.porMedico.slice(0, 15).map((m) => ({
      nome: m.nome?.length > 22 ? m.nome.substring(0, 22) + "..." : m.nome,
      nomeCompleto: m.nome,
      total: m.total,
    }));
  }, [metricas?.porMedico]);

  const dadosPlano = useMemo(() => {
    if (!metricas?.porPlano) return [];
    return metricas.porPlano.slice(0, 15).map((p) => ({
      name: p.nome?.length > 25 ? p.nome.substring(0, 25) + "..." : p.nome,
      nomeCompleto: p.nome,
      value: p.total,
    }));
  }, [metricas?.porPlano]);

  const dadosServico = useMemo(() => {
    if (!metricas?.porServico) return [];
    return metricas.porServico.map((s) => ({
      nome: s.nome?.length > 22 ? s.nome.substring(0, 22) + "..." : s.nome,
      nomeCompleto: s.nome,
      total: s.total,
    }));
  }, [metricas?.porServico]);

  const dadosCid = useMemo(() => {
    if (!metricas?.porCid) return [];
    return metricas.porCid.slice(0, 15).map((c) => ({
      nome: c.nome?.length > 30 ? c.nome.substring(0, 30) + "..." : c.nome,
      nomeCompleto: c.nome,
      total: c.total,
    }));
  }, [metricas?.porCid]);

  const dadosProcedimento = useMemo(() => {
    if (!metricas?.porProcedimento) return [];
    return metricas.porProcedimento.slice(0, 15).map((p) => ({
      nome: p.nome?.length > 25 ? p.nome.substring(0, 25) + "..." : p.nome,
      nomeCompleto: p.nome,
      total: p.total,
    }));
  }, [metricas?.porProcedimento]);

  // Radar data for services
  const dadosRadarServico = useMemo(() => {
    if (!metricas?.porServico) return [];
    const maxItems = 8;
    return metricas.porServico.slice(0, maxItems).map((s) => ({
      subject: s.nome?.length > 15 ? s.nome.substring(0, 15) + "..." : s.nome,
      total: s.total,
      fullMark: Math.max(...metricas.porServico.slice(0, maxItems).map((x) => x.total)),
    }));
  }, [metricas?.porServico]);

  // Funil data
  const dadosFunil = useMemo(() => {
    if (!dadosTipo.length) return [];
    return dadosTipo
      .sort((a, b) => b.value - a.value)
      .map((t, idx) => ({
        nome: t.name,
        total: t.value,
        cor: FUNIL_COLORS[idx % FUNIL_COLORS.length],
      }));
  }, [dadosTipo]);

  // Caráter data for funil
  const dadosCarater = useMemo(() => {
    if (!metricasAvancadas?.porCarater) return [];
    const caraterColors: Record<string, string> = {
      "Eletivo": "#3b82f6",
      "Urgência": "#ef4444",
    };
    return metricasAvancadas.porCarater.map((c, idx) => ({
      nome: c.nome,
      total: c.total,
      cor: caraterColors[c.nome] || FUNIL_COLORS[idx % FUNIL_COLORS.length],
    }));
  }, [metricasAvancadas?.porCarater]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[140px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[120px] rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px] rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!metricas) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="chart-card p-12 text-center"
      >
        <Activity className="h-14 w-14 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          Configure os filtros e clique em "Carregar"
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Os dados do dashboard serao carregados conforme o periodo selecionado
        </p>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <div className="space-y-6">
        {/* KPI Cards - 6 cards em uma linha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard
            title="Total Atendimentos"
            value={metricas.totalAtendimentos}
            subtitle="No periodo selecionado"
            icon={Activity}
            gradient="blue"
            trend={
              comparacao
                ? {
                    value:
                      comparacao.periodoAnterior.totalAtendimentos > 0
                        ? ((comparacao.periodoAtual.totalAtendimentos -
                            comparacao.periodoAnterior.totalAtendimentos) /
                            comparacao.periodoAnterior.totalAtendimentos) *
                          100
                        : 0,
                    label: "vs anterior",
                  }
                : undefined
            }
            delay={0}
          />
          <KpiCard
            title="Medicos Ativos"
            value={metricas.totalMedicos}
            subtitle="Prestadores distintos"
            icon={Users}
            gradient="emerald"
            trend={
              comparacao
                ? {
                    value:
                      comparacao.periodoAnterior.totalMedicos > 0
                        ? ((comparacao.periodoAtual.totalMedicos -
                            comparacao.periodoAnterior.totalMedicos) /
                            comparacao.periodoAnterior.totalMedicos) *
                          100
                        : 0,
                    label: "vs anterior",
                  }
                : undefined
            }
            delay={0.05}
          />
          <KpiCard
            title="Convenios"
            value={metricas.totalConvenios}
            subtitle="Planos distintos"
            icon={Building2}
            gradient="violet"
            trend={
              comparacao
                ? {
                    value:
                      comparacao.periodoAnterior.totalConvenios > 0
                        ? ((comparacao.periodoAtual.totalConvenios -
                            comparacao.periodoAnterior.totalConvenios) /
                            comparacao.periodoAnterior.totalConvenios) *
                          100
                        : 0,
                    label: "vs anterior",
                  }
                : undefined
            }
            delay={0.1}
          />
          <KpiCard
            title="Procedimentos"
            value={metricas.totalProcedimentos}
            subtitle="Procedimentos distintos"
            icon={Heart}
            gradient="amber"
            delay={0.15}
          />
          {/* Média de Permanência */}
          <KpiCard
            title="Media Permanencia"
            value={metricasAvancadas ? `${metricasAvancadas.mediaPermanenciaDias} dias` : "-"}
            subtitle={metricasAvancadas ? `${metricasAvancadas.totalInternacoes} internacoes` : "Carregando..."}
            icon={BedDouble}
            gradient="blue"
            delay={0.2}
          />
          {/* Taxa de Conversão */}
          <KpiCard
            title="Conversao Emerg."
            value={metricasAvancadas ? `${metricasAvancadas.taxaConversao.taxa}%` : "-"}
            subtitle={metricasAvancadas ? `${metricasAvancadas.taxaConversao.totalConvertidos} de ${metricasAvancadas.taxaConversao.totalEmergencias}` : "Carregando..."}
            icon={ArrowRightLeft}
            gradient="emerald"
            delay={0.25}
          />
        </div>

        {/* Comparação de Períodos */}
        {comparacao && (
          <ComparacaoCards
            periodoAtual={comparacao.periodoAtual.label}
            periodoAnterior={comparacao.periodoAnterior.label}
            items={[
              {
                label: "Atendimentos",
                valorAtual: comparacao.periodoAtual.totalAtendimentos,
                valorAnterior: comparacao.periodoAnterior.totalAtendimentos,
                icon: Activity,
              },
              {
                label: "Medicos",
                valorAtual: comparacao.periodoAtual.totalMedicos,
                valorAnterior: comparacao.periodoAnterior.totalMedicos,
                icon: Users,
              },
              {
                label: "Convenios",
                valorAtual: comparacao.periodoAtual.totalConvenios,
                valorAnterior: comparacao.periodoAnterior.totalConvenios,
                icon: Building2,
              },
              {
                label: "Procedimentos",
                valorAtual: comparacao.periodoAtual.totalProcedimentos,
                valorAnterior: comparacao.periodoAnterior.totalProcedimentos,
                icon: Heart,
              },
            ]}
            delay={0.2}
          />
        )}

        {/* Comparativo Detalhado por Tipo (se métricas avançadas disponíveis) */}
        {metricasAvancadas?.comparativoDetalhado && (
          <ComparacaoCards
            periodoAtual={metricasAvancadas.comparativoDetalhado.periodoAtual.label}
            periodoAnterior={metricasAvancadas.comparativoDetalhado.periodoAnterior.label}
            items={[
              {
                label: "Internacoes",
                valorAtual: metricasAvancadas.comparativoDetalhado.periodoAtual.internacoes,
                valorAnterior: metricasAvancadas.comparativoDetalhado.periodoAnterior.internacoes,
                icon: BedDouble,
              },
              {
                label: "Ambulatoriais",
                valorAtual: metricasAvancadas.comparativoDetalhado.periodoAtual.ambulatoriais,
                valorAnterior: metricasAvancadas.comparativoDetalhado.periodoAnterior.ambulatoriais,
                icon: Stethoscope,
              },
              {
                label: "Emergencias",
                valorAtual: metricasAvancadas.comparativoDetalhado.periodoAtual.emergencias,
                valorAnterior: metricasAvancadas.comparativoDetalhado.periodoAnterior.emergencias,
                icon: Heart,
              },
              {
                label: "Urgencias",
                valorAtual: metricasAvancadas.comparativoDetalhado.periodoAtual.urgencias,
                valorAnterior: metricasAvancadas.comparativoDetalhado.periodoAnterior.urgencias,
                icon: Activity,
              },
            ]}
            delay={0.25}
          />
        )}

        {/* Evolução Mensal (AreaChart) + Funil de Tipos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard
            title="Volume de Atendimentos (Evolucao Mensal)"
            icon={TrendingUp}
            delay={0.3}
            className="lg:col-span-2"
          >
            {dadosMesAno.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={dadosMesAno} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v.toLocaleString("pt-BR")}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Atendimentos"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#gradientArea)"
                    dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para o periodo
              </div>
            )}
          </ChartCard>

          <FunilStatusAtendimentos dados={dadosFunil} delay={0.35} />
        </div>

        {/* Distribuição por Convênio (Donut) + Distribuição por Tipo (Donut) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Distribuicao por Convenio" icon={Building2} delay={0.4}>
            {dadosPlano.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={dadosPlano}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                  >
                    {dadosPlano.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const total = dadosPlano.reduce((acc, p) => acc + p.value, 0);
                      const perc = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                      return (
                        <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xl">
                          <p className="text-xs font-semibold text-card-foreground mb-1">{d.nomeCompleto || d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Atendimentos:{" "}
                            <span className="font-bold text-card-foreground">
                              {d.value.toLocaleString("pt-BR")}
                            </span>
                            {" "}({perc}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-[10px] text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </ChartCard>

          <ChartCard title="Distribuicao por Tipo de Atendimento" icon={Layers} delay={0.45}>
            {dadosTipo.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={dadosTipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                  >
                    {dadosTipo.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xl">
                          <p className="text-xs font-semibold text-card-foreground mb-1">{d.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Atendimentos:{" "}
                            <span className="font-bold text-card-foreground">
                              {d.value.toLocaleString("pt-BR")}
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </ChartCard>
        </div>

        {/* Volume por Turno + Taxa de Conversão */}
        {metricasAvancadas && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VolumePorTurno data={metricasAvancadas.porTurno} />
            <TaxaConversaoEmergencia data={metricasAvancadas.taxaConversao} />
          </div>
        )}

        {/* Caráter (Eletivo vs Urgência) + Radar de Serviços */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dadosCarater.length > 0 && (
            <FunilStatusAtendimentos dados={dadosCarater} delay={0.5} />
          )}

          <ChartCard title="Distribuicao por Servico" icon={Stethoscope} delay={0.55}>
            {dadosRadarServico.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={dadosRadarServico}>
                  <PolarGrid strokeDasharray="3 3" className="opacity-30" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar
                    name="Atendimentos"
                    dataKey="total"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip content={<SimpleTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </ChartCard>
        </div>

        {/* Top Médicos + Top CIDs (barras horizontais) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Top 15 Medicos por Atendimentos" icon={Users} delay={0.6}>
            {dadosMedico.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosMedico.length * 30)}>
                <BarChart data={dadosMedico} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={150}
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<SimpleTooltip />} />
                  <Bar dataKey="total" name="Atendimentos" radius={[0, 6, 6, 0]} barSize={18}>
                    {dadosMedico.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </ChartCard>

          <ChartCard title="Top 15 CIDs (Diagnosticos)" icon={FileText} delay={0.65}>
            {dadosCid.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosCid.length * 30)}>
                <BarChart data={dadosCid} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={200}
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<SimpleTooltip />} />
                  <Bar dataKey="total" name="Atendimentos" radius={[0, 6, 6, 0]} barSize={18}>
                    {dadosCid.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[(idx + 3) % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </ChartCard>
        </div>

        {/* Procedimentos + Serviços */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Top 15 Procedimentos" icon={Stethoscope} delay={0.7}>
            {dadosProcedimento.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosProcedimento.length * 30)}>
                <BarChart data={dadosProcedimento} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={170}
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<SimpleTooltip />} />
                  <Bar dataKey="total" name="Atendimentos" radius={[0, 6, 6, 0]} barSize={18}>
                    {dadosProcedimento.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[(idx + 7) % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </ChartCard>

          <ChartCard title="Atendimentos por Servico" icon={Stethoscope} delay={0.75}>
            {dadosServico.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosServico.length * 35)}>
                <BarChart data={dadosServico} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={150}
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<SimpleTooltip />} />
                  <Bar dataKey="total" name="Atendimentos" radius={[0, 6, 6, 0]} barSize={22}>
                    {dadosServico.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </AnimatePresence>
  );
}
