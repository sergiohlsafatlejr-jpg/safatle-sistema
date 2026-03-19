import React, { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Building2, DollarSign, TrendingUp, TrendingDown, AlertTriangle,
  BarChart3, Users, Scale, Shield, Activity, Receipt, Clock,
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
  const { data: dadosConsolidados, isLoading } = trpc.dashboardConsolidado.dados.useQuery(undefined);
  const { data: comparativoGlosas } = trpc.dashboardConsolidado.comparativoGlosas.useQuery(undefined);
  const { data: recursadoData } = trpc.dashboardConsolidado.recursadoConsolidado.useQuery(undefined);
  const { data: atendimentosData } = trpc.dashboardConsolidado.atendimentosConsolidados.useQuery(undefined);

  const dados = dadosConsolidados;
  const rec = recursadoData;

  // Calcular totais de atendimentos a partir de porEstabelecimento
  const atendimentosTotais = useMemo(() => {
    if (!atendimentosData?.porEstabelecimento) return { total: 0, internacao: 0, ambulatorial: 0, urgencia: 0 };
    const ests = atendimentosData.porEstabelecimento;
    return {
      total: ests.reduce((acc: number, e: any) => acc + (e.total || 0), 0),
      internacao: ests.reduce((acc: number, e: any) => acc + (e.internacao || 0), 0),
      ambulatorial: ests.reduce((acc: number, e: any) => acc + (e.ambulatorio || 0), 0),
      urgencia: ests.reduce((acc: number, e: any) => acc + (e.exame || 0) + (e.outros || 0), 0),
    };
  }, [atendimentosData]);

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
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel Executivo Safatle</h1>
              <p className="text-sm text-muted-foreground">Visão consolidada de todos os estabelecimentos do grupo</p>
            </div>
          </div>
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
                  {formatNumber(dados?.totais?.totalArquivos || 0)} arquivos
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
                  {formatCurrency(rec?.kpis?.valorTotalRecursado || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {rec?.kpis?.totalRecursos || 0} recursos | Recuperado: {formatCurrency(rec?.kpis?.valorTotalRecuperado || 0)}
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
                <p className="text-xs text-muted-foreground mt-1">Todos os estabelecimentos</p>
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
        {rec && rec.kpis.totalRecursos > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4" /> Recursos de Glosa
            </h2>
            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{rec.kpis.totalRecursos}</div>
                    <div className="text-xs text-muted-foreground">Total Recursos</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-500">{formatCurrency(rec.kpis.valorTotalGlosado)}</div>
                    <div className="text-xs text-muted-foreground">Valor Glosado</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-amber-500">{formatCurrency(rec.kpis.valorTotalRecursado)}</div>
                    <div className="text-xs text-muted-foreground">Valor Recursado</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{formatCurrency(rec.kpis.valorTotalRecuperado)}</div>
                    <div className="text-xs text-muted-foreground">Valor Recuperado</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">{formatPercent(rec.kpis.taxaRecuperacao)}</div>
                    <div className="text-xs text-muted-foreground">Taxa Recuperação</div>
                  </div>
                </div>
                {rec.porStatus.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rec.porStatus.map((s: any) => (
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dados.estabelecimentos.map((est: any) => {
                        const estRec = rec?.porEstabelecimento?.find((r: any) => r.estabelecimentoId === est.id);
                        return (
                          <TableRow key={est.id}>
                            <TableCell className="font-medium">{est.nome}</TableCell>
                            <TableCell className="text-right">{formatCurrency(est.faturado)}</TableCell>
                            <TableCell className="text-right text-green-500">{formatCurrency(est.recebido)}</TableCell>
                            <TableCell className="text-right text-red-500">{formatCurrency(est.glosado)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={est.percentualGlosa > 10 ? "destructive" : "default"}>
                                {formatPercent(est.percentualGlosa || 0)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-amber-500">{formatCurrency(estRec?.valorGlosado || 0)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(estRec?.valorRecuperado || 0)}</TableCell>
                            <TableCell className="text-right">{formatNumber(est.totalArquivos || 0)}</TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Linha de totais */}
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
                        <TableCell className="text-right text-amber-500">{formatCurrency(rec?.kpis?.valorTotalRecursado || 0)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(rec?.kpis?.valorTotalRecuperado || 0)}</TableCell>
                        <TableCell className="text-right">{formatNumber(dados.totais?.totalArquivos || 0)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== SEÇÃO 5: ALERTAS ===== */}
        {comparativoGlosas && comparativoGlosas.filter((e: any) => e.percentualGlosa > 10).length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas
            </h2>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="pt-5">
                <div className="space-y-2">
                  {comparativoGlosas.filter((e: any) => e.percentualGlosa > 10).map((est: any, i: number) => (
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
        {atendimentosData?.porEstabelecimento && atendimentosData.porEstabelecimento.length > 0 && (
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
                        <TableHead className="text-right">Valor Faturado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {atendimentosData.porEstabelecimento.map((est: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{est.nome || `Estab. ${est.id}`}</TableCell>
                          <TableCell className="text-right">{formatNumber(est.total)}</TableCell>
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
      </div>
    </DashboardLayout>
  );
}
