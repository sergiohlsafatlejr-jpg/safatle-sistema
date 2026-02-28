import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowLeft,
  Download,
  Percent,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  LineChart as RechartsLineChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend as RechartsLegend,
} from "recharts";
import { MetricCard } from "./MetricCard";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";

const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const fmtCurrencyShort = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface RecebimentoGeralReportProps {
  estabelecimentoId: number;
  onBack: () => void;
}

export function RecebimentoGeralReport({ estabelecimentoId, onBack }: RecebimentoGeralReportProps) {
  const [mesProducao, setMesProducao] = useState("todos");
  const [convenioFiltro, setConvenioFiltro] = useState("todos");
  const [setorFiltro, setSetorFiltro] = useState("todos");
  const [receberFiltro, setReceberFiltro] = useState("todos");

  const { data, isLoading } = trpc.recebimentoGeral.dadosBI.useQuery(
    {
      estabelecimentoId,
      mesProducao: mesProducao !== "todos" ? mesProducao : undefined,
      convenio: convenioFiltro !== "todos" ? convenioFiltro : undefined,
      setor: setorFiltro !== "todos" ? setorFiltro : undefined,
      receberHospital: receberFiltro !== "todos" ? receberFiltro : undefined,
    },
    { enabled: !!estabelecimentoId }
  );

  // Listas para filtros
  const mesesDisponiveis = useMemo(() => {
    if (!data?.porMes) return [];
    return data.porMes.map((m) => m.chave).filter(Boolean);
  }, [data]);

  const conveniosDisponiveis = useMemo(() => {
    if (!data?.porConvenio) return [];
    return data.porConvenio.map((c) => c.chave).filter(Boolean);
  }, [data]);

  const setoresDisponiveis = useMemo(() => {
    if (!data?.porSetor) return [];
    return data.porSetor.map((s) => s.chave).filter(Boolean);
  }, [data]);

  // Métricas
  const resumo = data?.resumo || {
    totalFaturado: 0,
    totalRecebido: 0,
    totalGlosas: 0,
    totalAberto: 0,
    totalRecurso: 0,
    totalRecuperado: 0,
    totalRecebAMaior: 0,
    totalItens: 0,
    taxaRecebimento: 0,
  };

  // Dados para gráfico de barras por convênio
  const dadosBarConvenio = useMemo(() => {
    if (!data?.porConvenio) return [];
    return data.porConvenio.slice(0, 12).map((c) => ({
      convenio: c.chave.length > 18 ? c.chave.substring(0, 18) + "..." : c.chave,
      convenioFull: c.chave,
      faturado: c.faturado,
      recebido: c.recebido,
      aberto: c.aberto,
    }));
  }, [data]);

  // Dados para gráfico de evolução mensal
  const dadosEvolucao = useMemo(() => {
    if (!data?.porMes) return [];
    return data.porMes.map((m) => ({
      mes: m.chave,
      faturado: m.faturado,
      recebido: m.recebido,
      aberto: m.aberto,
      glosas: m.glosas,
    }));
  }, [data]);

  // Top convênios com maior valor em aberto
  const topConveniosAberto = useMemo(() => {
    if (!data?.porConvenio) return [];
    return [...data.porConvenio]
      .filter((c) => c.aberto > 0)
      .sort((a, b) => b.aberto - a.aberto)
      .slice(0, 8);
  }, [data]);

  // Convênio mais crítico (maior valor em aberto)
  const convenioCritico = useMemo(() => {
    if (!topConveniosAberto.length) return null;
    const c = topConveniosAberto[0];
    const taxa = c.faturado > 0 ? (c.aberto / c.faturado) * 100 : 0;
    return { nome: c.chave, aberto: c.aberto, faturado: c.faturado, taxa };
  }, [topConveniosAberto]);

  // Exportar Excel
  const handleExportar = useCallback(() => {
    if (!data?.porConvenio || data.porConvenio.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const wb = XLSX.utils.book_new();

    // Aba 1: Resumo
    const resumoSheet = [
      { Métrica: "Total Faturado", Valor: resumo.totalFaturado },
      { Métrica: "Total Recebido", Valor: resumo.totalRecebido },
      { Métrica: "Total Glosas", Valor: resumo.totalGlosas },
      { Métrica: "Total Em Aberto", Valor: resumo.totalAberto },
      { Métrica: "Total Recurso", Valor: resumo.totalRecurso },
      { Métrica: "Total Recuperado", Valor: resumo.totalRecuperado },
      { Métrica: "Recebido a Maior", Valor: resumo.totalRecebAMaior },
      { Métrica: "Taxa de Recebimento (%)", Valor: resumo.taxaRecebimento },
      { Métrica: "Total de Itens", Valor: resumo.totalItens },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoSheet), "Resumo");

    // Aba 2: Por Convênio
    const convSheet = data.porConvenio.map((c) => ({
      Convênio: c.chave,
      Faturado: c.faturado,
      Recebido: c.recebido,
      Glosas: c.glosas,
      "Em Aberto": c.aberto,
      Recurso: c.recurso,
      Recuperado: c.recuperado,
      Itens: c.itens,
      "% Recebimento": c.faturado > 0 ? Number(((c.recebido / c.faturado) * 100).toFixed(1)) : 0,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(convSheet), "Por Convênio");

    // Aba 3: Por Mês
    if (data.porMes) {
      const mesSheet = data.porMes.map((m) => ({
        "Mês Produção": m.chave,
        Faturado: m.faturado,
        Recebido: m.recebido,
        Glosas: m.glosas,
        "Em Aberto": m.aberto,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mesSheet), "Por Mês");
    }

    // Aba 4: Por Setor
    if (data.porSetor) {
      const setorSheet = data.porSetor.map((s) => ({
        Setor: s.chave,
        Faturado: s.faturado,
        Recebido: s.recebido,
        Glosas: s.glosas,
        "Em Aberto": s.aberto,
        Itens: s.itens,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(setorSheet), "Por Setor");
    }

    // Aba 5: Top Contas em Aberto
    if (data.topAberto) {
      const topSheet = data.topAberto.map((t) => ({
        Convênio: t.convenio,
        "Nº Conta": t.numeroConta,
        Protocolo: t.protocolo,
        Faturado: t.faturado,
        Recebido: t.recebido,
        "Em Aberto": t.aberto,
        "Mês Produção": t.mesProducao,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topSheet), "Top Em Aberto");
    }

    XLSX.writeFile(wb, `recebimento-geral-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  }, [data, resumo]);

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Recebimento Geral
            </h2>
            <p className="text-sm text-muted-foreground">
              Faturado vs Recebido vs Em Aberto por convênio
            </p>
          </div>
        </div>
        <Button onClick={handleExportar} disabled={isLoading} className="gap-2 shadow-sm">
          <Download className="h-4 w-4" />
          Exportar Excel
        </Button>
      </motion.div>

      {/* Filtros */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Mês de Produção
                </label>
                <Select value={mesProducao} onValueChange={setMesProducao}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos os meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {mesesDisponiveis.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Convênio
                </label>
                <Select value={convenioFiltro} onValueChange={setConvenioFiltro}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os convênios</SelectItem>
                    {conveniosDisponiveis.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Setor
                </label>
                <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os setores</SelectItem>
                    {setoresDisponiveis.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  A Receber
                </label>
                <Select value={receberFiltro} onValueChange={setReceberFiltro}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="S">Hospital</SelectItem>
                    <SelectItem value="N">Terceiros / Médicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="text-muted-foreground text-sm">Carregando dados de recebimento...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              Resumo Financeiro
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                title="Total Faturado"
                value={fmtCurrency(resumo.totalFaturado)}
                subtitle={`${resumo.totalItens.toLocaleString("pt-BR")} itens`}
                icon={DollarSign}
                variant="primary"
                delay={0.05}
              />
              <MetricCard
                title="Total Recebido"
                value={fmtCurrency(resumo.totalRecebido)}
                subtitle="Valor efetivamente recebido"
                icon={CheckCircle2}
                variant="success"
                delay={0.1}
                breakdown={data?.porConvenio?.slice(0, 5).map((c) => ({
                  nome: c.chave,
                  valor: c.recebido,
                }))}
              />
              <MetricCard
                title="Em Aberto"
                value={fmtCurrency(resumo.totalAberto)}
                subtitle="Aguardando recebimento"
                icon={AlertTriangle}
                variant="danger"
                delay={0.15}
                breakdown={topConveniosAberto.slice(0, 5).map((c) => ({
                  nome: c.chave,
                  valor: c.aberto,
                }))}
              />
              <MetricCard
                title="Taxa Recebimento"
                value={`${resumo.taxaRecebimento}%`}
                subtitle="Recebido / Faturado"
                icon={Percent}
                variant="warning"
                delay={0.2}
              />
              <MetricCard
                title="Recebido a Maior"
                value={fmtCurrency(resumo.totalRecebAMaior)}
                subtitle="Valores pagos acima do faturado"
                icon={ArrowUpRight}
                variant="success"
                delay={0.25}
              />
            </div>
          </div>

          {/* Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Convênio com Maior Valor em Aberto */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-red-500/30 bg-red-50/50 dark:bg-red-950/20 hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <span className="text-amber-500">⚠</span> Convênio com Maior Valor em Aberto
                      </p>
                      {convenioCritico ? (
                        <>
                          <p className="text-lg font-bold text-foreground mt-1">
                            {convenioCritico.nome}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                            <span className="text-muted-foreground">
                              Em aberto:{" "}
                              <span className="font-semibold text-red-500">
                                {fmtCurrencyShort(convenioCritico.aberto)}
                              </span>
                            </span>
                            <span className="text-muted-foreground">
                              Taxa:{" "}
                              <span className="font-semibold text-red-500">
                                {convenioCritico.taxa.toFixed(1)}%
                              </span>
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Faturado:{" "}
                            <span className="font-semibold text-foreground">
                              {fmtCurrencyShort(convenioCritico.faturado)}
                            </span>
                          </p>
                          <div className="mt-3 w-full h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600"
                              style={{ width: `${Math.min(convenioCritico.taxa, 100)}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">
                          Nenhum convênio com valor em aberto
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Resumo de Glosas e Recursos */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                        <span>📊</span> Glosas e Recursos
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Glosas</p>
                          <p className="text-lg font-bold text-foreground">
                            {fmtCurrencyShort(resumo.totalGlosas)}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {resumo.totalFaturado > 0
                              ? ((resumo.totalGlosas / resumo.totalFaturado) * 100).toFixed(1)
                              : "0"}
                            % do faturado
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Recurso / Recuperado</p>
                          <p className="text-lg font-bold text-foreground">
                            {fmtCurrencyShort(resumo.totalRecurso)}
                          </p>
                          <span className={cn(
                            "text-xs font-semibold",
                            resumo.totalRecuperado > 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-muted-foreground"
                          )}>
                            Recuperado: {fmtCurrencyShort(resumo.totalRecuperado)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Gráfico de Barras: Faturado vs Recebido vs Em Aberto por Convênio */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Faturado vs Recebido vs Em Aberto por Convênio
                </CardTitle>
                <CardDescription>Top 12 convênios por valor faturado</CardDescription>
              </CardHeader>
              <CardContent>
                {dadosBarConvenio.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <RechartsBarChart data={dadosBarConvenio}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="convenio" angle={-35} textAnchor="end" height={90} tick={{ fontSize: 11 }} />
                      <YAxis
                        tickFormatter={(v) =>
                          `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`
                        }
                        tick={{ fontSize: 11 }}
                      />
                      <RechartsTooltip
                        formatter={(value: number) => fmtCurrency(value)}
                        labelFormatter={(label) => {
                          const item = dadosBarConvenio.find((d) => d.convenio === label);
                          return item?.convenioFull || label;
                        }}
                      />
                      <RechartsLegend />
                      <RechartsBar dataKey="faturado" fill="#3b82f6" name="Faturado" radius={[2, 2, 0, 0]} />
                      <RechartsBar dataKey="recebido" fill="#10b981" name="Recebido" radius={[2, 2, 0, 0]} />
                      <RechartsBar dataKey="aberto" fill="#ef4444" name="Em Aberto" radius={[2, 2, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Grid: Evolução Mensal + Top Convênios em Aberto */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Evolução Mensal */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Evolução Mensal
                  </CardTitle>
                  <CardDescription>Faturado, Recebido e Em Aberto por mês</CardDescription>
                </CardHeader>
                <CardContent>
                  {dadosEvolucao.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsLineChart data={dadosEvolucao}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis
                          tickFormatter={(v) =>
                            `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`
                          }
                          tick={{ fontSize: 11 }}
                        />
                        <RechartsTooltip formatter={(value: number) => fmtCurrency(value)} />
                        <RechartsLegend />
                        <Line type="monotone" dataKey="faturado" stroke="#3b82f6" name="Faturado" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="recebido" stroke="#10b981" name="Recebido" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="aberto" stroke="#ef4444" name="Em Aberto" strokeWidth={2} dot={{ r: 3 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Convênios com Maior Valor em Aberto */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Top Convênios em Aberto
                  </CardTitle>
                  <CardDescription>Convênios com maior valor pendente de recebimento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topConveniosAberto.length > 0 ? (
                    <>
                      {topConveniosAberto.map((item, idx) => {
                        const taxaAberto = item.faturado > 0
                          ? (item.aberto / item.faturado) * 100
                          : 0;
                        const taxaRecebido = item.faturado > 0
                          ? (item.recebido / item.faturado) * 100
                          : 0;

                        return (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                                  {idx + 1}.
                                </span>
                                <span className="font-medium text-foreground truncate mr-2">
                                  {item.chave}
                                </span>
                              </div>
                              <span className="text-red-500 font-semibold text-xs whitespace-nowrap">
                                {fmtCurrencyShort(item.aberto)}
                              </span>
                            </div>
                            <div className="w-full h-5 bg-muted/50 rounded-full overflow-hidden flex ml-7">
                              <div
                                className="h-full bg-green-500 dark:bg-green-600 flex items-center justify-center transition-all duration-500"
                                style={{ width: `${Math.max(taxaRecebido, 0)}%` }}
                              >
                                {taxaRecebido >= 15 && (
                                  <span className="text-[9px] font-bold text-white">
                                    {Math.round(taxaRecebido)}%
                                  </span>
                                )}
                              </div>
                              <div
                                className="h-full bg-red-500 dark:bg-red-600 flex items-center justify-center transition-all duration-500"
                                style={{ width: `${Math.max(taxaAberto, 0)}%` }}
                              >
                                {taxaAberto >= 8 && (
                                  <span className="text-[9px] font-bold text-white">
                                    {Math.round(taxaAberto)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-center gap-6 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-xs text-muted-foreground">Recebido</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-xs text-muted-foreground">Em Aberto</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      Nenhum convênio com valor em aberto
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Tabela Detalhada por Convênio */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">Detalhamento por Convênio</CardTitle>
                <CardDescription>
                  Valores detalhados de faturamento, recebimento e pendências por convênio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.porConvenio && data.porConvenio.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Convênio
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Faturado
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Recebido
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Glosas
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Em Aberto
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            % Receb.
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Itens
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.porConvenio.map((c, idx) => {
                          const taxaReceb = c.faturado > 0
                            ? ((c.recebido / c.faturado) * 100).toFixed(1)
                            : "0.0";
                          return (
                            <tr
                              key={idx}
                              className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-2.5 px-2 font-medium text-foreground">
                                {c.chave}
                              </td>
                              <td className="py-2.5 px-2 text-right text-foreground">
                                {fmtCurrency(c.faturado)}
                              </td>
                              <td className="py-2.5 px-2 text-right text-green-600 dark:text-green-400 font-medium">
                                {fmtCurrency(c.recebido)}
                              </td>
                              <td className="py-2.5 px-2 text-right text-amber-600 dark:text-amber-400">
                                {fmtCurrency(c.glosas)}
                              </td>
                              <td className={cn(
                                "py-2.5 px-2 text-right font-medium",
                                c.aberto > 0
                                  ? "text-red-500 dark:text-red-400"
                                  : "text-muted-foreground"
                              )}>
                                {fmtCurrency(c.aberto)}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
                                    Number(taxaReceb) >= 90
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : Number(taxaReceb) >= 70
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  )}
                                >
                                  {taxaReceb}%
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-right text-muted-foreground">
                                {c.itens.toLocaleString("pt-BR")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/30 font-bold">
                          <td className="py-3 px-2 text-foreground">TOTAL</td>
                          <td className="py-3 px-2 text-right text-foreground">
                            {fmtCurrency(resumo.totalFaturado)}
                          </td>
                          <td className="py-3 px-2 text-right text-green-600 dark:text-green-400">
                            {fmtCurrency(resumo.totalRecebido)}
                          </td>
                          <td className="py-3 px-2 text-right text-amber-600 dark:text-amber-400">
                            {fmtCurrency(resumo.totalGlosas)}
                          </td>
                          <td className="py-3 px-2 text-right text-red-500 dark:text-red-400">
                            {fmtCurrency(resumo.totalAberto)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              {resumo.taxaRecebimento}%
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-muted-foreground">
                            {resumo.totalItens.toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabela: Top 20 Contas com Maior Valor em Aberto */}
          {data?.topAberto && data.topAberto.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">Top 20 Contas com Maior Valor em Aberto</CardTitle>
                  <CardDescription>
                    Contas individuais com os maiores valores pendentes de recebimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            #
                          </th>
                          <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Convênio
                          </th>
                          <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Nº Conta
                          </th>
                          <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Protocolo
                          </th>
                          <th className="text-left py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Mês Prod.
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Faturado
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Recebido
                          </th>
                          <th className="text-right py-3 px-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                            Em Aberto
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topAberto.map((t, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-2 px-2 text-muted-foreground font-bold text-xs">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2 font-medium text-foreground">
                              {t.convenio}
                            </td>
                            <td className="py-2 px-2 text-muted-foreground">{t.numeroConta}</td>
                            <td className="py-2 px-2 text-muted-foreground">{t.protocolo}</td>
                            <td className="py-2 px-2 text-muted-foreground">{t.mesProducao}</td>
                            <td className="py-2 px-2 text-right text-foreground">
                              {fmtCurrency(t.faturado)}
                            </td>
                            <td className="py-2 px-2 text-right text-green-600 dark:text-green-400">
                              {fmtCurrency(t.recebido)}
                            </td>
                            <td className="py-2 px-2 text-right text-red-500 dark:text-red-400 font-semibold">
                              {fmtCurrency(t.aberto)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
