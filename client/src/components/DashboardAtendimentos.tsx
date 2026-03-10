import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Users, Building2, Stethoscope, TrendingUp,
  Database, Cloud, FileText,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

// Cores para gráficos - paleta profissional
const CHART_COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8",
  "#82CA9D", "#FFC658", "#8DD1E1", "#A4DE6C", "#D0ED57",
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
];

interface MetricaAgrupada {
  nome: string;
  codigo: string | null;
  total: number;
}

interface MetricaMesAno {
  mesAno: string;
  total: number;
}

interface MetricasDashboard {
  totalAtendimentos: number;
  totalMedicos: number;
  totalConvenios: number;
  totalProcedimentos: number;
  porMedico: MetricaAgrupada[];
  porTipo: MetricaAgrupada[];
  porPlano: MetricaAgrupada[];
  porServico: MetricaAgrupada[];
  porMesAno: MetricaMesAno[];
  porCid: MetricaAgrupada[];
  porProcedimento: MetricaAgrupada[];
  fonte: "cache_local" | "postgresql_direto";
}

interface DashboardAtendimentosProps {
  metricas: MetricasDashboard | undefined;
  isLoading: boolean;
}

function formatMesAno(mesAno: string): string {
  const [ano, mes] = mesAno.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(mes, 10) - 1]}/${ano?.slice(2)}`;
}

function truncateLabel(label: string, maxLen: number = 25): string {
  if (!label) return "";
  return label.length > maxLen ? label.slice(0, maxLen) + "..." : label;
}

// Tooltip customizado
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-muted-foreground">
          {entry.name}: <span className="font-semibold text-foreground">{entry.value?.toLocaleString("pt-BR")}</span>
        </p>
      ))}
    </div>
  );
}

// Card de KPI
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
            <p className="text-3xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</p>
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

export default function DashboardAtendimentos({ metricas, isLoading }: DashboardAtendimentosProps) {
  // Preparar dados para gráficos
  const dadosMesAno = useMemo(() => {
    if (!metricas?.porMesAno) return [];
    return metricas.porMesAno.map(m => ({
      ...m,
      label: formatMesAno(m.mesAno),
    }));
  }, [metricas?.porMesAno]);

  const dadosTipo = useMemo(() => {
    if (!metricas?.porTipo) return [];
    return metricas.porTipo.map(t => ({
      name: t.nome,
      value: t.total,
    }));
  }, [metricas?.porTipo]);

  const dadosMedico = useMemo(() => {
    if (!metricas?.porMedico) return [];
    return metricas.porMedico.slice(0, 15).map(m => ({
      nome: truncateLabel(m.nome, 20),
      nomeCompleto: m.nome,
      total: m.total,
    }));
  }, [metricas?.porMedico]);

  const dadosPlano = useMemo(() => {
    if (!metricas?.porPlano) return [];
    return metricas.porPlano.slice(0, 15).map(p => ({
      nome: truncateLabel(p.nome, 22),
      nomeCompleto: p.nome,
      total: p.total,
    }));
  }, [metricas?.porPlano]);

  const dadosServico = useMemo(() => {
    if (!metricas?.porServico) return [];
    return metricas.porServico.map(s => ({
      nome: truncateLabel(s.nome, 20),
      nomeCompleto: s.nome,
      total: s.total,
    }));
  }, [metricas?.porServico]);

  const dadosCid = useMemo(() => {
    if (!metricas?.porCid) return [];
    return metricas.porCid.slice(0, 15).map(c => ({
      nome: c.codigo ? `${c.codigo}` : truncateLabel(c.nome, 15),
      nomeCompleto: c.codigo ? `${c.codigo} - ${c.nome}` : c.nome,
      total: c.total,
    }));
  }, [metricas?.porCid]);

  const dadosProcedimento = useMemo(() => {
    if (!metricas?.porProcedimento) return [];
    return metricas.porProcedimento.slice(0, 15).map(p => ({
      nome: truncateLabel(p.nome, 20),
      nomeCompleto: p.codigo ? `${p.codigo} - ${p.nome}` : p.nome,
      total: p.total,
    }));
  }, [metricas?.porProcedimento]);

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
          <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Selecione o periodo e clique em Carregar Dashboard</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            As metricas serao calculadas com base nos atendimentos do periodo selecionado
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
          title="Total Atendimentos"
          value={metricas.totalAtendimentos}
          icon={Activity}
          color="bg-blue-600"
        />
        <KpiCard
          title="Medicos"
          value={metricas.totalMedicos}
          icon={Users}
          color="bg-emerald-600"
          subtitle="profissionais distintos"
        />
        <KpiCard
          title="Convenios"
          value={metricas.totalConvenios}
          icon={Building2}
          color="bg-purple-600"
          subtitle="planos distintos"
        />
        <KpiCard
          title="Procedimentos"
          value={metricas.totalProcedimentos}
          icon={Stethoscope}
          color="bg-orange-600"
          subtitle="tipos distintos"
        />
      </div>

      {/* Linha 1: Evolução Temporal + Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolução por Mês/Ano */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolucao Mensal de Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosMesAno.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosMesAno}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Atendimentos"
                    stroke="#0088FE"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#0088FE" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados para o periodo
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por Tipo de Atendimento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Por Tipo de Atendimento
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
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {dadosTipo.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString("pt-BR"), "Atendimentos"]}
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
      </div>

      {/* Linha 2: Por Médico + Por Plano */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Médico */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Top 15 Medicos por Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosMedico.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosMedico.length * 28)}>
                <BarChart data={dadosMedico} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={140}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
                          <p className="font-medium">{d.nomeCompleto}</p>
                          <p className="text-muted-foreground">
                            Atendimentos: <span className="font-semibold text-foreground">{d.total.toLocaleString("pt-BR")}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" name="Atendimentos" fill="#0088FE" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por Plano/Convênio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Top 15 Planos/Convenios por Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosPlano.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosPlano.length * 28)}>
                <BarChart data={dadosPlano} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={160}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
                          <p className="font-medium">{d.nomeCompleto}</p>
                          <p className="text-muted-foreground">
                            Atendimentos: <span className="font-semibold text-foreground">{d.total.toLocaleString("pt-BR")}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" name="Atendimentos" fill="#00C49F" radius={[0, 4, 4, 0]} barSize={18} />
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

      {/* Linha 3: Por Serviço + Por CID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por Serviço */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Atendimentos por Servico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosServico.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosServico.length * 32)}>
                <BarChart data={dadosServico} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={140}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
                          <p className="font-medium">{d.nomeCompleto}</p>
                          <p className="text-muted-foreground">
                            Atendimentos: <span className="font-semibold text-foreground">{d.total.toLocaleString("pt-BR")}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" name="Atendimentos" fill="#FFBB28" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Por CID */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Top 15 CIDs por Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dadosCid.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, dadosCid.length * 28)}>
                <BarChart data={dadosCid} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="nome"
                    width={80}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-xs">
                          <p className="font-medium">{d.nomeCompleto}</p>
                          <p className="text-muted-foreground">
                            Atendimentos: <span className="font-semibold text-foreground">{d.total.toLocaleString("pt-BR")}</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" name="Atendimentos" fill="#8884D8" radius={[0, 4, 4, 0]} barSize={18} />
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

      {/* Linha 4: Por Procedimento */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Top 15 Procedimentos por Atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dadosProcedimento.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(350, dadosProcedimento.length * 28)}>
              <BarChart data={dadosProcedimento} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={160}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg px-3 py-2 text-sm max-w-sm">
                        <p className="font-medium">{d.nomeCompleto}</p>
                        <p className="text-muted-foreground">
                          Atendimentos: <span className="font-semibold text-foreground">{d.total.toLocaleString("pt-BR")}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="total" name="Atendimentos" fill="#FF8042" radius={[0, 4, 4, 0]} barSize={18} />
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
  );
}
