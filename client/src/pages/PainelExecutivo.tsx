import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  BarChart3, Users, Scale, Shield, Activity, Receipt, Clock, Filter,
} from "lucide-react";

function formatCurrency(value: number | string | null | undefined) {
  const num = Number(value || 0);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR");
}

export default function PainelExecutivo() {
  const [filtroEstabelecimento, setFiltroEstabelecimento] = useState<string>("todos");

  const { data: dadosConsolidados, isLoading } = trpc.dashboardConsolidado.dados.useQuery(undefined);
  const { data: comparativoGlosas } = trpc.dashboardConsolidado.comparativoGlosas.useQuery(undefined);
  const { data: recursadoData } = trpc.dashboardConsolidado.recursadoConsolidado.useQuery(undefined);
  const { data: atendimentosData } = trpc.dashboardConsolidado.atendimentosConsolidados.useQuery(undefined);

  const rec = recursadoData;

  // Filtrar dados por estabelecimento selecionado
  const dadosFiltrados = useMemo(() => {
    if (!dadosConsolidados) return null;
    
    if (filtroEstabelecimento === "todos") {
      return dadosConsolidados;
    }
    
    const estId = Number(filtroEstabelecimento);
    const estabsFiltrados = dadosConsolidados.estabelecimentos.filter(
      (e: any) => e.id === estId
    );
    
    // Recalcular totais para o filtro
    const totais = {
      totalArquivos: estabsFiltrados.reduce((acc: number, e: any) => acc + Number(e.totalArquivos || 0), 0),
      totalProcedimentos: estabsFiltrados.reduce((acc: number, e: any) => acc + Number(e.totalProcedimentos || 0), 0),
      valorTotalFaturado: estabsFiltrados.reduce((acc: number, e: any) => acc + Number(e.valorFaturado || 0), 0),
      valorTotalGlosado: estabsFiltrados.reduce((acc: number, e: any) => acc + Number(e.valorGlosado || 0), 0),
      valorTotalPago: estabsFiltrados.reduce((acc: number, e: any) => acc + Number(e.valorPago || 0), 0),
      percentualGlosa: 0,
    };
    
    if (totais.valorTotalFaturado > 0) {
      totais.percentualGlosa = (totais.valorTotalGlosado / totais.valorTotalFaturado) * 100;
    }
    
    return {
      estabelecimentos: estabsFiltrados,
      totais,
    };
  }, [dadosConsolidados, filtroEstabelecimento]);

  // Filtrar recursado por estabelecimento
  const recFiltrado = useMemo(() => {
    if (!rec) return rec;
    if (filtroEstabelecimento === "todos") return rec;
    
    const estId = Number(filtroEstabelecimento);
    const porEstabFiltrado = rec.porEstabelecimento.filter((e: any) => e.id === estId);
    
    // Recalcular KPIs
    const kpis = {
      totalRecursos: porEstabFiltrado.reduce((acc: number, e: any) => acc + Number(e.totalRecursos || 0), 0),
      valorTotalGlosado: porEstabFiltrado.reduce((acc: number, e: any) => acc + Number(e.valorGlosado || 0), 0),
      valorTotalRecursado: 0,
      valorTotalRecuperado: porEstabFiltrado.reduce((acc: number, e: any) => acc + Number(e.valorRecuperado || 0), 0),
      valorTotalRecebido: porEstabFiltrado.reduce((acc: number, e: any) => acc + Number(e.valorRecebido || 0), 0),
      taxaRecuperacao: 0,
    };
    
    const valorGlosado = kpis.valorTotalGlosado;
    const valorRecuperado = kpis.valorTotalRecuperado;
    kpis.taxaRecuperacao = valorGlosado > 0 ? Math.round((valorRecuperado / valorGlosado) * 10000) / 100 : 0;
    
    return {
      ...rec,
      kpis,
      porEstabelecimento: porEstabFiltrado,
    };
  }, [rec, filtroEstabelecimento]);

  // Filtrar atendimentos por estabelecimento
  const atendimentosFiltrados = useMemo(() => {
    if (!atendimentosData) return atendimentosData;
    if (filtroEstabelecimento === "todos") return atendimentosData;
    
    const estId = Number(filtroEstabelecimento);
    const porEstabFiltrado = atendimentosData.porEstabelecimento.filter((e: any) => e.id === estId);
    
    return {
      ...atendimentosData,
      porEstabelecimento: porEstabFiltrado,
      kpis: {
        total: porEstabFiltrado.reduce((acc: number, e: any) => acc + (e.total || 0), 0),
        mediaDias: atendimentosData.kpis.mediaDias,
        valorTotal: porEstabFiltrado.reduce((acc: number, e: any) => acc + Number(e.valorTotal || 0), 0),
      },
    };
  }, [atendimentosData, filtroEstabelecimento]);

  // Filtrar comparativo glosas por estabelecimento
  const comparativoFiltrado = useMemo(() => {
    if (!comparativoGlosas) return comparativoGlosas;
    if (filtroEstabelecimento === "todos") return comparativoGlosas;
    
    const estId = Number(filtroEstabelecimento);
    return comparativoGlosas.filter((e: any) => e.estabelecimentoId === estId);
  }, [comparativoGlosas, filtroEstabelecimento]);

  // Calcular totais de atendimentos a partir de porEstabelecimento
  const atendimentosTotais = useMemo(() => {
    const data = atendimentosFiltrados;
    if (!data?.porEstabelecimento) return { total: 0, internacao: 0, ambulatorial: 0, urgencia: 0 };
    const ests = data.porEstabelecimento;
    return {
      total: ests.reduce((acc: number, e: any) => acc + (e.total || 0), 0),
      internacao: ests.reduce((acc: number, e: any) => acc + (e.internacao || 0), 0),
      ambulatorial: ests.reduce((acc: number, e: any) => acc + (e.ambulatorio || 0), 0),
      urgencia: ests.reduce((acc: number, e: any) => acc + (e.exame || 0) + (e.outros || 0), 0),
    };
  }, [atendimentosFiltrados]);

  // Lista de estabelecimentos para o filtro
  const listaEstabelecimentos = useMemo(() => {
    if (!dadosConsolidados?.estabelecimentos) return [];
    return dadosConsolidados.estabelecimentos
      .filter((e: any) => e.nome)
      .sort((a: any, b: any) => (a.nome || "").localeCompare(b.nome || ""));
  }, [dadosConsolidados]);

  const dados = dadosFiltrados;
  const recExibir = recFiltrado;

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando dados consolidados...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Painel Executivo Safatle</h1>
                <p className="text-sm text-muted-foreground">Visão consolidada de todos os estabelecimentos do grupo</p>
              </div>
            </div>
            
            {/* Filtro de Estabelecimento */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroEstabelecimento} onValueChange={setFiltroEstabelecimento}>
                <SelectTrigger className="w-[280px] bg-background">
                  <SelectValue placeholder="Selecione o estabelecimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Todos os Estabelecimentos
                    </span>
                  </SelectItem>
                  {listaEstabelecimentos.map((est: any) => (
                    <SelectItem key={est.id} value={String(est.id)}>
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {est.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {filtroEstabelecimento !== "todos" && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Filtrando: {listaEstabelecimentos.find((e: any) => String(e.id) === filtroEstabelecimento)?.nome || filtroEstabelecimento}
              </Badge>
              <button 
                onClick={() => setFiltroEstabelecimento("todos")}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Limpar filtro
              </button>
            </div>
          )}
        </div>

        {/* ===== SEÇÃO 1: KPIs FINANCEIROS ===== */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Indicadores Financeiros
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" /> Faturado Total
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {formatCurrency(dados?.totais?.valorTotalFaturado || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(dados?.totais?.totalArquivos || 0)} arquivos | {formatNumber(dados?.totais?.totalProcedimentos || 0)} procedimentos
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Recebido Total
                </div>
                <div className="text-2xl font-bold text-green-500">
                  {formatCurrency(dados?.totais?.valorTotalPago || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dados?.totais?.valorTotalFaturado
                    ? formatPercent((Number(dados.totais.valorTotalPago || 0) / Number(dados.totais.valorTotalFaturado)) * 100)
                    : "0%"} do faturado
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingDown className="h-3.5 w-3.5" /> Glosado Total
                </div>
                <div className="text-2xl font-bold text-red-500">
                  {formatCurrency(dados?.totais?.valorTotalGlosado || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dados?.totais?.valorTotalFaturado
                    ? formatPercent((Number(dados.totais.valorTotalGlosado || 0) / Number(dados.totais.valorTotalFaturado)) * 100)
                    : "0%"} do faturado
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Scale className="h-3.5 w-3.5" /> Recursado Total
                </div>
                <div className="text-2xl font-bold text-amber-500">
                  {formatCurrency(recExibir?.kpis?.valorTotalRecursado || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {recExibir?.kpis?.totalRecursos || 0} recursos | Recuperado: {formatCurrency(recExibir?.kpis?.valorTotalRecuperado || 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== SEÇÃO 2: KPIs ATENDIMENTOS ===== */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Atendimentos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Users className="h-3.5 w-3.5" /> Total Atendimentos
                </div>
                <div className="text-2xl font-bold text-indigo-500">
                  {formatNumber(atendimentosTotais.total)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {filtroEstabelecimento === "todos" ? "Todos os estabelecimentos" : listaEstabelecimentos.find((e: any) => String(e.id) === filtroEstabelecimento)?.nome}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Activity className="h-3.5 w-3.5" /> Internação
                </div>
                <div className="text-2xl font-bold text-purple-500">
                  {formatNumber(atendimentosTotais.internacao)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {atendimentosTotais.total > 0 ? formatPercent((atendimentosTotais.internacao / atendimentosTotais.total) * 100) : "0%"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-cyan-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" /> Ambulatorial
                </div>
                <div className="text-2xl font-bold text-cyan-500">
                  {formatNumber(atendimentosTotais.ambulatorial)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {atendimentosTotais.total > 0 ? formatPercent((atendimentosTotais.ambulatorial / atendimentosTotais.total) * 100) : "0%"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500 hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Urgência/Emergência
                </div>
                <div className="text-2xl font-bold text-rose-500">
                  {formatNumber(atendimentosTotais.urgencia)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {atendimentosTotais.total > 0 ? formatPercent((atendimentosTotais.urgencia / atendimentosTotais.total) * 100) : "0%"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== SEÇÃO 3: RECURSOS DE GLOSA ===== */}
        {recExibir && recExibir.kpis.totalRecursos > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4" /> Recursos de Glosa
            </h2>
            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{recExibir.kpis.totalRecursos}</div>
                    <div className="text-xs text-muted-foreground">Total Recursos</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(recExibir.kpis.valorTotalGlosado)}</div>
                    <div className="text-xs text-muted-foreground">Valor Glosado</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-amber-500">{formatCurrency(recExibir.kpis.valorTotalRecursado)}</div>
                    <div className="text-xs text-muted-foreground">Valor Recursado</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(recExibir.kpis.valorTotalRecuperado)}</div>
                    <div className="text-xs text-muted-foreground">Valor Recuperado</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{formatPercent(recExibir.kpis.taxaRecuperacao)}</div>
                    <div className="text-xs text-muted-foreground">Taxa Recuperação</div>
                  </div>
                </div>
                {recExibir.porStatus && recExibir.porStatus.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recExibir.porStatus.map((s: any) => (
                      <Badge key={s.status} variant={s.status === 'deferido' ? 'default' : s.status === 'indeferido' ? 'destructive' : 'secondary'} className="text-xs">
                        {s.status}: {s.quantidade} ({formatCurrency(s.valorGlosado)})
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== SEÇÃO 4: COMPARATIVO POR ESTABELECIMENTO ===== */}
        {dados?.estabelecimentos && dados.estabelecimentos.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Comparativo por Estabelecimento
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estabelecimento</TableHead>
                        <TableHead className="text-right">Faturado</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                        <TableHead className="text-right">Glosado</TableHead>
                        <TableHead className="text-right">% Glosa</TableHead>
                        <TableHead className="text-right">Recursado</TableHead>
                        <TableHead className="text-right">Recuperado</TableHead>
                        <TableHead className="text-right">Arquivos</TableHead>
                        <TableHead className="text-right">Procedimentos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dados.estabelecimentos.map((est: any) => {
                        // Buscar dados de recurso deste estabelecimento
                        const estRec = recExibir?.porEstabelecimento?.find((r: any) => r.id === est.id);
                        return (
                          <TableRow key={est.id}>
                            <TableCell className="font-medium">{est.nome}</TableCell>
                            <TableCell className="text-right">{formatCurrency(est.valorFaturado)}</TableCell>
                            <TableCell className="text-right text-green-500">{formatCurrency(est.valorPago)}</TableCell>
                            <TableCell className="text-right text-red-500">{formatCurrency(est.valorGlosado)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={Number(est.percentualGlosa || 0) > 10 ? "destructive" : "default"}>
                                {formatPercent(Number(est.percentualGlosa || 0))}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-amber-500">{formatCurrency(estRec?.valorGlosado || 0)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(estRec?.valorRecuperado || 0)}</TableCell>
                            <TableCell className="text-right">{formatNumber(est.totalArquivos || 0)}</TableCell>
                            <TableCell className="text-right">{formatNumber(est.totalProcedimentos || 0)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Linha de totais */}
                      {dados.estabelecimentos.length > 1 && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>TOTAL</TableCell>
                          <TableCell className="text-right">{formatCurrency(dados.totais?.valorTotalFaturado || 0)}</TableCell>
                          <TableCell className="text-right text-green-500">{formatCurrency(dados.totais?.valorTotalPago || 0)}</TableCell>
                          <TableCell className="text-right text-red-500">{formatCurrency(dados.totais?.valorTotalGlosado || 0)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">
                              {dados.totais?.valorTotalFaturado
                                ? formatPercent((Number(dados.totais.valorTotalGlosado || 0) / Number(dados.totais.valorTotalFaturado)) * 100)
                                : "0%"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-amber-500">{formatCurrency(recExibir?.kpis?.valorTotalRecursado || 0)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(recExibir?.kpis?.valorTotalRecuperado || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(dados.totais?.totalArquivos || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(dados.totais?.totalProcedimentos || 0)}</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== SEÇÃO 5: ALERTAS ===== */}
        {comparativoFiltrado && comparativoFiltrado.filter((e: any) => e.percentualGlosa > 10).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas
            </h2>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="pt-5">
                <div className="space-y-2">
                  {comparativoFiltrado.filter((e: any) => e.percentualGlosa > 10).map((est: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-sm">
                        <strong>{est.estabelecimentoNome}</strong>: glosa de {formatPercent(est.percentualGlosa)} ({formatCurrency(est.valorGlosado)})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== SEÇÃO 6: ATENDIMENTOS POR ESTABELECIMENTO ===== */}
        {atendimentosFiltrados?.porEstabelecimento && atendimentosFiltrados.porEstabelecimento.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Atendimentos por Estabelecimento
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Estabelecimento</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Internação</TableHead>
                        <TableHead className="text-right">Ambulatório</TableHead>
                        <TableHead className="text-right">Exame</TableHead>
                        <TableHead className="text-right">Valor Faturado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atendimentosFiltrados.porEstabelecimento.map((est: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{est.nome || `Estab. ${est.id}`}</TableCell>
                          <TableCell className="text-right">{formatNumber(est.total)}</TableCell>
                          <TableCell className="text-right">{formatNumber(est.internacao || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(est.ambulatorio || 0)}</TableCell>
                          <TableCell className="text-right">{formatNumber(est.exame || 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(est.valorTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== SEÇÃO 7: TOP CONVÊNIOS (ATENDIMENTOS) ===== */}
        {atendimentosFiltrados?.topConvenios && atendimentosFiltrados.topConvenios.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Top Convênios por Atendimentos
            </h2>
            <Card>
              <CardContent className="pt-5">
                <div className="space-y-2">
                  {atendimentosFiltrados.topConvenios.slice(0, 10).map((conv: any, i: number) => {
                    const maxQtd = atendimentosFiltrados.topConvenios[0]?.quantidade || 1;
                    const pct = (conv.quantidade / maxQtd) * 100;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium truncate max-w-[200px]">{conv.convenio}</span>
                            <span className="text-sm font-bold">{formatNumber(conv.quantidade)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
