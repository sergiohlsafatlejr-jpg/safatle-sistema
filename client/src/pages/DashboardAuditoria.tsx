import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import {
  ClipboardCheck,
  ThumbsUp,
  ThumbsDown,
  Clock,
  FileWarning,
  Wrench,
  Brain,
  TrendingUp,
  BarChart3,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Download,
  Hash,
  DollarSign,
  Plus,
  Minus,
} from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

export default function DashboardAuditoria() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 0;

  // Período: últimos 30 dias por padrão
  const [dataInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dataFim] = useState(() => new Date().toISOString().split("T")[0]);
  const [periodoLabel, setPeriodoLabel] = useState("30d");

  const periodoRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    switch (periodoLabel) {
      case "7d": start = new Date(now.getTime() - 7 * 86400000); break;
      case "30d": start = new Date(now.getTime() - 30 * 86400000); break;
      case "90d": start = new Date(now.getTime() - 90 * 86400000); break;
      case "180d": start = new Date(now.getTime() - 180 * 86400000); break;
      case "365d": start = new Date(now.getTime() - 365 * 86400000); break;
      default: start = new Date(now.getTime() - 30 * 86400000);
    }
    return {
      dataInicio: start.toISOString().split("T")[0],
      dataFim: now.toISOString().split("T")[0],
    };
  }, [periodoLabel]);

  // Buscar dashboard de auditoria
  const { data, isLoading, refetch } = trpc.auditoria.dashboardAuditoria.useQuery(
    {
      estabelecimentoId,
      dataInicio: periodoRange.dataInicio,
      dataFim: periodoRange.dataFim,
    },
    { enabled: !!estabelecimentoId }
  );

  // Buscar aprendizados
  const { data: aprendizados } = trpc.auditoria.listarAprendizados.useQuery(
    { estabelecimentoId },
    { enabled: !!estabelecimentoId }
  );

  const exportarExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const resumoRows = [
      ["Métrica", "Valor"],
      ["Contas Auditadas", data.contasAuditadas],
      ["Total de Feedbacks", data.feedbacks.total],
      ["Divergências Aceitas", data.feedbacks.aceitar],
      ["Divergências Rejeitadas", data.feedbacks.rejeitar],
      ["Divergências Ignoradas", data.feedbacks.ignorar],
      ["Total de Falhas de Prontuário", data.falhas.total],
      ["Total de Ajustes", data.ajustes.total],
      ["Alterações de Quantidade", data.ajustes.alteracoesQtd],
      ["Alterações de Valor", data.ajustes.alteracoesValor],
      ["Itens Adicionados", data.ajustes.itensAdicionados],
      ["Itens Removidos", data.ajustes.itensRemovidos],
      ["Padrões Aprendidos", data.aprendizado.totalPadroes],
      ["Padrões Ativos", data.aprendizado.padroesAtivos],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    if (data.falhas.topFalhas?.length) {
      const falhasRows = [["Tipo de Falha", "Categoria", "Ocorrências"]];
      (data.falhas.topFalhas as any[]).forEach((f: any) => {
        falhasRows.push([f.tipoFalha, f.categoriaFalha, f.total]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(falhasRows), "Falhas Comuns");
    }

    if (data.auditoresAtivos?.length) {
      const auditorRows = [["Auditor", "Total Ações"]];
      (data.auditoresAtivos as any[]).forEach((a: any) => {
        auditorRows.push([a.usuarioNome, a.totalAcoes]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(auditorRows), "Auditores");
    }

    XLSX.writeFile(wb, `dashboard-auditoria-${periodoRange.dataInicio}-${periodoRange.dataFim}.xlsx`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <ClipboardCheck className="h-7 w-7 text-indigo-600" />
              Dashboard de Auditoria
            </h1>
            <p className="text-muted-foreground mt-1">
              Métricas consolidadas de auditoria de contas por período
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={periodoLabel} onValueChange={setPeriodoLabel}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="180d">Últimos 6 meses</SelectItem>
                <SelectItem value="365d">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={exportarExcel} disabled={!data}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : !data ? (
          <div className="text-center py-12">
            <ClipboardCheck className="mx-auto h-16 w-16 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">Nenhum dado de auditoria</h3>
            <p className="text-muted-foreground">Selecione um estabelecimento para visualizar as métricas.</p>
          </div>
        ) : (
          <>
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-indigo-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Contas Auditadas</p>
                      <p className="text-3xl font-bold text-indigo-600">{data.contasAuditadas}</p>
                    </div>
                    <ClipboardCheck className="h-10 w-10 text-indigo-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Divergências Aceitas</p>
                      <p className="text-3xl font-bold text-green-600">{data.feedbacks.aceitar}</p>
                      {data.feedbacks.total > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {((data.feedbacks.aceitar / data.feedbacks.total) * 100).toFixed(1)}% do total
                        </p>
                      )}
                    </div>
                    <ThumbsUp className="h-10 w-10 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Divergências Rejeitadas</p>
                      <p className="text-3xl font-bold text-red-600">{data.feedbacks.rejeitar}</p>
                      {data.feedbacks.total > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {((data.feedbacks.rejeitar / data.feedbacks.total) * 100).toFixed(1)}% do total
                        </p>
                      )}
                    </div>
                    <ThumbsDown className="h-10 w-10 text-red-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Feedbacks</p>
                      <p className="text-3xl font-bold text-yellow-600">{data.feedbacks.total}</p>
                    </div>
                    <BarChart3 className="h-10 w-10 text-yellow-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Segunda linha de KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-amber-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Falhas de Prontuário</p>
                      <p className="text-3xl font-bold text-amber-600">{data.falhas.total}</p>
                    </div>
                    <FileWarning className="h-10 w-10 text-amber-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ajustes Realizados</p>
                      <p className="text-3xl font-bold text-blue-600">{data.ajustes.total}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          <Hash className="h-2.5 w-2.5 mr-0.5" />Qtd: {data.ajustes.alteracoesQtd}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          <DollarSign className="h-2.5 w-2.5 mr-0.5" />Val: {data.ajustes.alteracoesValor}
                        </Badge>
                      </div>
                    </div>
                    <Wrench className="h-10 w-10 text-blue-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Padrões Aprendidos</p>
                      <p className="text-3xl font-bold text-purple-600">{data.aprendizado.totalPadroes}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.aprendizado.padroesAtivos} ativos
                      </p>
                    </div>
                    <Brain className="h-10 w-10 text-purple-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-200">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Itens Adicionados/Removidos</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center text-green-600 font-bold text-xl">
                          <Plus className="h-4 w-4 mr-1" />{data.ajustes.itensAdicionados}
                        </span>
                        <span className="flex items-center text-red-600 font-bold text-xl">
                          <Minus className="h-4 w-4 mr-1" />{data.ajustes.itensRemovidos}
                        </span>
                      </div>
                    </div>
                    <TrendingUp className="h-10 w-10 text-emerald-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Seção de detalhes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Falhas mais comuns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-amber-500" />
                    Falhas de Prontuário Mais Comuns
                  </CardTitle>
                  <CardDescription>
                    Top 10 tipos de falhas encontradas no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!(data.falhas.topFalhas as any[])?.length ? (
                    <div className="text-center py-6">
                      <FileWarning className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhuma falha registrada no período</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(data.falhas.topFalhas as any[]).map((falha: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{falha.tipoFalha}</p>
                              <p className="text-xs text-muted-foreground">{falha.categoriaFalha}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-sm">
                            {falha.total}x
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Auditores ativos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-indigo-500" />
                    Auditores Ativos
                  </CardTitle>
                  <CardDescription>
                    Ranking de auditores por volume de ações no período
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!(data.auditoresAtivos as any[])?.length ? (
                    <div className="text-center py-6">
                      <UserCheck className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                      <p className="text-muted-foreground text-sm">Nenhum auditor ativo no período</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(data.auditoresAtivos as any[]).map((auditor: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                              {i + 1}
                            </div>
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-indigo-500" />
                              <span className="text-sm font-medium">{auditor.usuarioNome}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-sm">
                            {auditor.totalAcoes} ações
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Ajustes mais frequentes */}
            {(data.ajustes.topAjustes as any[])?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-blue-500" />
                    Ajustes Mais Frequentes
                  </CardTitle>
                  <CardDescription>
                    Itens que mais receberam ajustes durante a auditoria
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Código</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo Ajuste</TableHead>
                          <TableHead className="text-center">Ocorrências</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.ajustes.topAjustes as any[]).map((ajuste: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{i + 1}</TableCell>
                            <TableCell className="font-mono text-sm">{ajuste.codigoItem || "-"}</TableCell>
                            <TableCell className="max-w-xs truncate">{ajuste.descricaoItem || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {ajuste.tipoAjuste === "ALTERAR_QUANTIDADE" ? "Qtd" :
                                 ajuste.tipoAjuste === "ALTERAR_VALOR" ? "Valor" :
                                 ajuste.tipoAjuste === "ADICIONAR_ITEM" ? "+ Item" : "- Item"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className="bg-blue-100 text-blue-800">{ajuste.total}x</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aprendizados do sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  Aprendizados do Sistema
                </CardTitle>
                <CardDescription>
                  Padrões aprendidos automaticamente a partir das decisões dos auditores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!aprendizados?.length ? (
                  <div className="text-center py-6">
                    <Brain className="mx-auto h-10 w-10 text-muted-foreground opacity-50 mb-2" />
                    <p className="text-muted-foreground text-sm">
                      O sistema ainda está aprendendo. Conforme os auditores registram feedbacks, falhas e ajustes,
                      padrões serão identificados automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {aprendizados.map((ap: any, i: number) => (
                      <div key={ap.id || i} className={`p-4 rounded-lg border ${
                        ap.ativo ? "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200" : "bg-gray-50 border-gray-200 opacity-60"
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs border-purple-300">
                            {ap.tipoAprendizado === "FALHA_PRONTUARIO" ? "Falha" :
                             ap.tipoAprendizado === "AJUSTE_ITEM" ? "Ajuste" :
                             ap.tipoAprendizado === "DECISAO_DIVERGENCIA" ? "Decisão" : ap.tipoAprendizado}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            {ap.totalOcorrencias}x
                          </Badge>
                          {ap.confianca != null && (
                            <Badge className={`text-xs ${
                              Number(ap.confianca) >= 0.8 ? "bg-green-100 text-green-800" :
                              Number(ap.confianca) >= 0.5 ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {Math.round(Number(ap.confianca) * 100)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {ap.codigoItem && <span className="font-mono text-xs text-muted-foreground mr-1">[{ap.codigoItem}]</span>}
                          {ap.descricaoItem || (ap.dadosAprendizado as any)?.tipoFalha || "Padrão identificado"}
                        </p>
                        {(ap.dadosAprendizado as any)?.direcao && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Direção: {(ap.dadosAprendizado as any).direcao === "AUMENTO" ? "Aumento" : "Redução"}
                          </p>
                        )}
                        {(ap.dadosAprendizado as any)?.decisaoPredominante && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Decisão: {(ap.dadosAprendizado as any).decisaoPredominante === "aceitar" ? "Aceitar" : "Rejeitar"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Falhas por Categoria */}
            {(data.falhas.porCategoria as any[])?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-amber-500" />
                    Falhas por Categoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(data.falhas.porCategoria as any[]).map((cat: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-center">
                        <p className="text-2xl font-bold text-amber-700">{cat.total}</p>
                        <p className="text-xs text-amber-600 mt-1">{cat.categoriaFalha}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
