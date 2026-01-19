import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  AlertTriangle,
  BarChart3,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export default function DashboardConsolidado() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [expandedEstabelecimento, setExpandedEstabelecimento] = useState<number | null>(null);

  // Verificar se é gestor
  const { data: isGestor, isLoading: loadingGestor } = trpc.permissoes.verificarGestor.useQuery();

  // Buscar dados consolidados
  const { data: dadosConsolidados, isLoading: loadingDados, refetch: refetchDados } = 
    trpc.dashboardConsolidado.dados.useQuery(undefined, {
      enabled: isGestor === true,
    });

  // Buscar comparativo de glosas
  const { data: comparativoGlosas, isLoading: loadingComparativo, refetch: refetchComparativo } = 
    trpc.dashboardConsolidado.comparativoGlosas.useQuery(
      dataInicio && dataFim ? { dataInicio, dataFim } : undefined,
      { enabled: isGestor === true }
    );

  const handleFiltrar = () => {
    refetchDados();
    refetchComparativo();
  };

  if (loadingGestor) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!isGestor) {
    return (
      <div className="container py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Você não tem permissão para acessar o dashboard consolidado. 
            Este recurso está disponível apenas para gestores e administradores.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Dashboard Consolidado
          </h1>
          <p className="text-muted-foreground">
            Visão geral de todos os estabelecimentos
          </p>
        </div>

        {/* Filtros de período */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Data Início</Label>
            <Input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Fim</Label>
            <Input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={handleFiltrar} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs Totais */}
      {loadingDados ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : dadosConsolidados && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Estabelecimentos</p>
                  <p className="text-2xl font-bold">{dadosConsolidados.estabelecimentos.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Arquivos</p>
                  <p className="text-2xl font-bold">{dadosConsolidados.totais.totalArquivos}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Faturado</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(dadosConsolidados.totais.valorTotalFaturado)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Glosado</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(dadosConsolidados.totais.valorTotalGlosado)}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">% Glosa</p>
                  <p className={`text-2xl font-bold ${
                    dadosConsolidados.totais.percentualGlosa > 10 ? "text-red-600" : 
                    dadosConsolidados.totais.percentualGlosa > 5 ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {formatPercent(dadosConsolidados.totais.percentualGlosa)}
                  </p>
                </div>
                <AlertTriangle className={`h-8 w-8 opacity-80 ${
                  dadosConsolidados.totais.percentualGlosa > 10 ? "text-red-500" : 
                  dadosConsolidados.totais.percentualGlosa > 5 ? "text-yellow-500" : "text-green-500"
                }`} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cards por Estabelecimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Desempenho por Estabelecimento
          </CardTitle>
          <CardDescription>
            Clique em um estabelecimento para ver detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingDados ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : dadosConsolidados && (
            <div className="space-y-4">
              {dadosConsolidados.estabelecimentos.map((est) => (
                <div
                  key={est.id}
                  className="border rounded-lg overflow-hidden"
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedEstabelecimento(
                      expandedEstabelecimento === est.id ? null : est.id
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{est.nome}</h3>
                          {est.cnpj && (
                            <p className="text-sm text-muted-foreground">CNPJ: {est.cnpj}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Faturado</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(est.valorFaturado)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Glosado</p>
                          <p className="font-semibold text-red-600">
                            {formatCurrency(est.valorGlosado)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">% Glosa</p>
                          <Badge variant={
                            est.percentualGlosa > 10 ? "destructive" : 
                            est.percentualGlosa > 5 ? "secondary" : "default"
                          }>
                            {formatPercent(est.percentualGlosa)}
                          </Badge>
                        </div>
                        {expandedEstabelecimento === est.id ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes expandidos */}
                  {expandedEstabelecimento === est.id && (
                    <div className="border-t bg-muted/30 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Arquivos</p>
                          <p className="text-lg font-semibold">{est.totalArquivos}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Convênios</p>
                          <p className="text-lg font-semibold">{est.totalConvenios}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Procedimentos</p>
                          <p className="text-lg font-semibold">{est.totalProcedimentos}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Valor Pago</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatCurrency(est.valorPago)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparativo de Glosas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Comparativo de Glosas entre Estabelecimentos
          </CardTitle>
          <CardDescription>
            Ranking de estabelecimentos por valor glosado e principais motivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingComparativo ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : comparativoGlosas && comparativoGlosas.length > 0 ? (
            <div className="space-y-4">
              {comparativoGlosas.map((est, index) => (
                <div key={est.estabelecimentoId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? "bg-red-500" : 
                        index === 1 ? "bg-orange-500" : 
                        index === 2 ? "bg-yellow-500" : "bg-gray-400"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{est.estabelecimentoNome}</h3>
                        <p className="text-sm text-muted-foreground">
                          {est.totalProcedimentos} procedimentos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(est.valorGlosado)}
                      </p>
                      <Badge variant={
                        est.percentualGlosa > 10 ? "destructive" : 
                        est.percentualGlosa > 5 ? "secondary" : "default"
                      }>
                        {formatPercent(est.percentualGlosa)} de glosa
                      </Badge>
                    </div>
                  </div>

                  {/* Top motivos de glosa */}
                  {est.topMotivosGlosa && est.topMotivosGlosa.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Principais motivos de glosa:</p>
                      <div className="flex flex-wrap gap-2">
                        {est.topMotivosGlosa.map((motivo, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {motivo.motivo.substring(0, 40)}
                            {motivo.motivo.length > 40 ? "..." : ""} 
                            ({motivo.quantidade}x - {formatCurrency(motivo.valor)})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado de glosa encontrado para o período selecionado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
