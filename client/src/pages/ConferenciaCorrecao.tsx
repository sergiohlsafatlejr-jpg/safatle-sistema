import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ClipboardCheck, Clock, CheckCircle2, XCircle, AlertTriangle, ArrowLeft,
  RefreshCw, Eye, FileCheck, BarChart3, TrendingUp, ArrowRight, Download,
} from "lucide-react";

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num == null || isNaN(num)) return "R$ 0,00";
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    aguardando_correcao: { label: "Aguardando Correção", variant: "secondary", icon: Clock },
    reimportado: { label: "Reimportado", variant: "default", icon: RefreshCw },
    conferido: { label: "Conferido", variant: "outline", icon: Eye },
    aprovado: { label: "Aprovado", variant: "default", icon: CheckCircle2 },
    reprovado: { label: "Reprovado", variant: "destructive", icon: XCircle },
  };
  const c = config[status] || { label: status, variant: "outline" as const, icon: AlertTriangle };
  const Icon = c.icon;
  return (
    <Badge variant={c.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

function CorrecaoBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    corrigido: { label: "Corrigido", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
    parcialmente_corrigido: { label: "Parcial", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    nao_corrigido: { label: "Não Corrigido", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    item_removido: { label: "Removido", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
    item_adicionado: { label: "Adicionado", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
    novo_problema: { label: "Novo Problema", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  };
  const c = config[status] || { label: status, className: "bg-gray-100 text-gray-800" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>{c.label}</span>;
}

function TipoApontamentoBadge({ tipo }: { tipo: string }) {
  const config: Record<string, { label: string; className: string }> = {
    divergencia_aceita: { label: "Divergência", className: "bg-orange-100 text-orange-800" },
    falha_prontuario: { label: "Falha Prontuário", className: "bg-rose-100 text-rose-800" },
    ajuste_auditoria: { label: "Ajuste Auditoria", className: "bg-indigo-100 text-indigo-800" },
  };
  const c = config[tipo] || { label: tipo, className: "bg-gray-100 text-gray-800" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>{c.label}</span>;
}

// ============ DASHBOARD VIEW ============
function DashboardView() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 0;
  const [, navigate] = useLocation();
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  const { data: dashboard, isLoading: loadingDash } = trpc.conferencia.dashboard.useQuery(
    { estabelecimentoId },
    { enabled: !!estabelecimentoId }
  );

  const { data: snapshotsData, isLoading: loadingSnaps } = trpc.conferencia.listarSnapshots.useQuery(
    {
      estabelecimentoId,
      status: filtroStatus !== "todos" ? filtroStatus as any : undefined,
      pageSize: 50,
    },
    { enabled: !!estabelecimentoId }
  );

  const isLoading = loadingDash || loadingSnaps;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const dash = dashboard;
  const snapshots = snapshotsData?.snapshots || [];

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aguardando Correção</p>
                <p className="text-2xl font-bold">{dash?.contasPorStatus.aguardandoCorrecao || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <RefreshCw className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reimportadas</p>
                <p className="text-2xl font-bold">{dash?.contasPorStatus.reimportadas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold">{dash?.contasPorStatus.aprovadas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reprovadas</p>
                <p className="text-2xl font-bold">{dash?.contasPorStatus.reprovadas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Correção</p>
                <p className="text-2xl font-bold">{dash?.conferencias.taxaCorrecaoGeral || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de conferências */}
      {dash && dash.conferencias.total > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Resumo das Conferências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-2xl font-bold text-emerald-600">{dash.conferencias.corrigidos}</p>
                <p className="text-xs text-muted-foreground">Corrigidos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <p className="text-2xl font-bold text-amber-600">{dash.conferencias.parcialmenteCorrigidos}</p>
                <p className="text-xs text-muted-foreground">Parciais</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                <p className="text-2xl font-bold text-red-600">{dash.conferencias.naoCorrigidos}</p>
                <p className="text-xs text-muted-foreground">Não Corrigidos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20">
                <p className="text-2xl font-bold text-gray-600">{dash.conferencias.itensRemovidos}</p>
                <p className="text-xs text-muted-foreground">Removidos</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-2xl font-bold text-blue-600">{dash.conferencias.itensAdicionados}</p>
                <p className="text-xs text-muted-foreground">Adicionados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de snapshots */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Contas Auditadas
              </CardTitle>
              <CardDescription>Contas com snapshot de auditoria para conferência pós-correção</CardDescription>
            </div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="aguardando_correcao">Aguardando Correção</SelectItem>
                <SelectItem value="reimportado">Reimportado</SelectItem>
                <SelectItem value="conferido">Conferido</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum snapshot de auditoria encontrado</p>
              <p className="text-sm mt-1">Os snapshots são gerados automaticamente quando a auditoria é finalizada na tela de Conta Convênio Detalhes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Convênio</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-center">Divergências</TableHead>
                  <TableHead className="text-center">Falhas</TableHead>
                  <TableHead className="text-center">Ajustes</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshots.map((snap: any) => (
                  <TableRow key={snap.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{snap.numeroConta}</TableCell>
                    <TableCell>{snap.convenio || "-"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{snap.pacienteNome || "-"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700">{snap.totalDivergenciasAceitas}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-rose-50 text-rose-700">{snap.totalFalhasAbertas}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700">{snap.totalAjustes}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{snap.auditorNome || "-"}</TableCell>
                    <TableCell><StatusBadge status={snap.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(snap.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/conferencia-correcao/${snap.id}`)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============ DETALHES VIEW ============
function DetalhesView({ snapshotId }: { snapshotId: number }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.conferencia.detalhesSnapshot.useQuery(
    { snapshotId },
    { enabled: !!snapshotId }
  );

  const executarComparacao = trpc.conferencia.executarComparacao.useMutation({
    onSuccess: (result) => {
      toast.success(`Comparação concluída! ${result.totalComparados} itens comparados. Taxa de correção: ${result.resumo.taxaCorrecao}%`);
      utils.conferencia.detalhesSnapshot.invalidate({ snapshotId });
      utils.conferencia.dashboard.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const atualizarStatus = trpc.conferencia.atualizarStatus.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado com sucesso!");
      utils.conferencia.detalhesSnapshot.invalidate({ snapshotId });
      utils.conferencia.dashboard.invalidate();
      utils.conferencia.listarSnapshots.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Snapshot não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/conferencia-correcao")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const { snapshot, conferencias } = data;
  const divergenciasAceitas = (snapshot.divergenciasAceitas as any[]) || [];
  const falhasAbertas = (snapshot.falhasAbertas as any[]) || [];
  const ajustesAplicados = (snapshot.ajustesAplicados as any[]) || [];

  // Resumo das conferências
  const resumoConf = useMemo(() => {
    const r = { corrigidos: 0, parciais: 0, naoCorrigidos: 0, removidos: 0, adicionados: 0, total: conferencias.length };
    for (const c of conferencias) {
      if (c.statusCorrecao === "corrigido") r.corrigidos++;
      else if (c.statusCorrecao === "parcialmente_corrigido") r.parciais++;
      else if (c.statusCorrecao === "nao_corrigido") r.naoCorrigidos++;
      else if (c.statusCorrecao === "item_removido") r.removidos++;
      else if (c.statusCorrecao === "item_adicionado") r.adicionados++;
    }
    return r;
  }, [conferencias]);

  const taxaCorrecao = resumoConf.total > 0 ? Math.round((resumoConf.corrigidos / resumoConf.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/conferencia-correcao")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Conta {snapshot.numeroConta}</h2>
            <p className="text-sm text-muted-foreground">
              {snapshot.convenio || "Sem convênio"} {snapshot.pacienteNome ? `- ${snapshot.pacienteNome}` : ""}
            </p>
          </div>
          <StatusBadge status={snapshot.status} />
        </div>
        <div className="flex gap-2">
          {snapshot.status === "aguardando_correcao" && (
            <Button
              onClick={() => executarComparacao.mutate({ snapshotId })}
              disabled={executarComparacao.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${executarComparacao.isPending ? "animate-spin" : ""}`} />
              Executar Comparação
            </Button>
          )}
          {snapshot.status === "reimportado" && (
            <>
              <Button
                variant="outline"
                onClick={() => atualizarStatus.mutate({ snapshotId, status: "reprovado" })}
                disabled={atualizarStatus.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" /> Reprovar
              </Button>
              <Button
                onClick={() => atualizarStatus.mutate({ snapshotId, status: "aprovado" })}
                disabled={atualizarStatus.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Cards de resumo do snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-muted-foreground">Total Itens</p>
            <p className="text-xl font-bold">{snapshot.totalItens}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-muted-foreground">Valor Total</p>
            <p className="text-xl font-bold">{formatCurrency(snapshot.valorTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-orange-600">Divergências Aceitas</p>
            <p className="text-xl font-bold text-orange-600">{snapshot.totalDivergenciasAceitas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-rose-600">Falhas Abertas</p>
            <p className="text-xl font-bold text-rose-600">{snapshot.totalFalhasAbertas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-2 text-center">
            <p className="text-xs text-indigo-600">Ajustes</p>
            <p className="text-xl font-bold text-indigo-600">{snapshot.totalAjustes}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={conferencias.length > 0 ? "comparacao" : "snapshot"}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="snapshot">Snapshot Original</TabsTrigger>
          <TabsTrigger value="comparacao" disabled={conferencias.length === 0}>
            Comparação ({conferencias.length})
          </TabsTrigger>
          <TabsTrigger value="apontamentos">
            Apontamentos ({divergenciasAceitas.length + falhasAbertas.length + ajustesAplicados.length})
          </TabsTrigger>
        </TabsList>

        {/* Aba Comparação */}
        <TabsContent value="comparacao" className="space-y-4">
          {conferencias.length > 0 && (
            <>
              {/* Barra de progresso visual */}
              <Card>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Taxa de Correção</span>
                    <span className="text-sm font-bold">{taxaCorrecao}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 dark:bg-gray-700">
                    <div
                      className={`h-3 rounded-full transition-all ${taxaCorrecao >= 80 ? "bg-emerald-500" : taxaCorrecao >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${taxaCorrecao}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{resumoConf.corrigidos} corrigidos</span>
                    <span>{resumoConf.parciais} parciais</span>
                    <span>{resumoConf.naoCorrigidos} não corrigidos</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de conferências */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo Apontamento</TableHead>
                    <TableHead className="text-right">Antes</TableHead>
                    <TableHead className="text-center">→</TableHead>
                    <TableHead className="text-right">Depois</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Impacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conferencias.map((conf: any) => (
                    <TableRow key={conf.id}>
                      <TableCell className="font-mono text-sm">{conf.codigoItem || "-"}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{conf.descricaoItem || "-"}</TableCell>
                      <TableCell><TipoApontamentoBadge tipo={conf.tipoApontamento} /></TableCell>
                      <TableCell className="text-right text-sm">
                        {conf.valorAntes ? formatCurrency(conf.valorAntes) : "-"}
                        {conf.quantidadeAntes && <span className="block text-xs text-muted-foreground">Qtd: {conf.quantidadeAntes}</span>}
                      </TableCell>
                      <TableCell className="text-center"><ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" /></TableCell>
                      <TableCell className="text-right text-sm">
                        {conf.valorDepois ? formatCurrency(conf.valorDepois) : "-"}
                        {conf.quantidadeDepois && <span className="block text-xs text-muted-foreground">Qtd: {conf.quantidadeDepois}</span>}
                      </TableCell>
                      <TableCell><CorrecaoBadge status={conf.statusCorrecao} /></TableCell>
                      <TableCell className={`text-right text-sm font-medium ${parseFloat(conf.impactoFinanceiro || "0") > 0 ? "text-emerald-600" : parseFloat(conf.impactoFinanceiro || "0") < 0 ? "text-red-600" : ""}`}>
                        {conf.impactoFinanceiro ? formatCurrency(conf.impactoFinanceiro) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
          {conferencias.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Comparação ainda não executada</p>
              <p className="text-sm mt-1">Clique em "Executar Comparação" após a reimportação da conta para ver os resultados.</p>
            </div>
          )}
        </TabsContent>

        {/* Aba Snapshot Original */}
        <TabsContent value="snapshot" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Itens da Conta no Momento da Auditoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((snapshot.itensSnapshot as any[]) || []).map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{item.codigoItem || "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{item.descricaoItem || "-"}</TableCell>
                        <TableCell className="text-sm">{item.tipoItem || "-"}</TableCell>
                        <TableCell className="text-right text-sm">{item.quantidade || "-"}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(item.valorUnitario)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(item.valorTotal)}</TableCell>
                        <TableCell>
                          <Badge variant={item.statusAnalise === "divergente" ? "destructive" : "secondary"} className="text-xs">
                            {item.statusAnalise}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Apontamentos */}
        <TabsContent value="apontamentos" className="space-y-4">
          {divergenciasAceitas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700">{divergenciasAceitas.length}</Badge>
                  Divergências Aceitas (Faturista deve corrigir)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {divergenciasAceitas.map((d: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{d.codigoItem || "-"}</TableCell>
                        <TableCell className="text-sm">{d.tipoDivergencia}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.justificativa || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {falhasAbertas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-rose-50 text-rose-700">{falhasAbertas.length}</Badge>
                  Falhas de Prontuário Abertas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Descrição</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {falhasAbertas.map((f: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{f.tipoFalha}</TableCell>
                        <TableCell className="text-sm">{f.categoriaFalha}</TableCell>
                        <TableCell>
                          <Badge variant={f.severidade === "critica" || f.severidade === "grave" ? "destructive" : "secondary"} className="text-xs">
                            {f.severidade}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">{f.descricao || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {ajustesAplicados.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700">{ajustesAplicados.length}</Badge>
                  Ajustes da Auditoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Tipo Ajuste</TableHead>
                      <TableHead className="text-right">Valor Original</TableHead>
                      <TableHead className="text-right">Valor Ajustado</TableHead>
                      <TableHead>Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajustesAplicados.map((a: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{a.codigoItem || "-"}</TableCell>
                        <TableCell className="text-sm">{a.tipoAjuste}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(a.valorOriginal)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(a.valorAjustado)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{a.justificativa || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ MAIN COMPONENT ============
export default function ConferenciaCorrecao() {
  const [matched, params] = useRoute("/conferencia-correcao/:snapshotId");
  const snapshotId = matched ? parseInt(params?.snapshotId || "0") : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conferência Pós-Correção</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe se o faturista corrigiu os itens apontados pela auditoria
            </p>
          </div>
        </div>

        {snapshotId > 0 ? (
          <DetalhesView snapshotId={snapshotId} />
        ) : (
          <DashboardView />
        )}
      </div>
    </DashboardLayout>
  );
}
