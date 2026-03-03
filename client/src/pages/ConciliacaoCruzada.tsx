import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { toast } from "sonner";
import { 
  Search, Filter, Download, Eye, CheckCircle2, AlertCircle, XCircle, Clock,
  DollarSign, TrendingUp, TrendingDown, FileText, Building2, ArrowUpDown,
  ChevronDown, ChevronUp, RefreshCw, Link2, Database, Loader2, Unlink,
  Zap, RotateCcw, BarChart3, Info, ListChecks, Table2
} from "lucide-react";
import * as XLSX from "xlsx";

export default function ConciliacaoCruzada() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 0;

  // Aba ativa
  const [abaAtiva, setAbaAtiva] = useState("conciliados");

  // Filtros
  const [competenciaFiltro, setCompetenciaFiltro] = useState<string>("todos");
  const [convenioFiltro, setConvenioFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(0);
  const ITENS_POR_PAGINA = 50;

  // Paginação da aba conciliados
  const [paginaConciliados, setPaginaConciliados] = useState(0);

  // Modal de detalhes da guia
  const [guiaSelecionada, setGuiaSelecionada] = useState<{ contaNumero?: string; numeroGuia?: string } | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);

  // Modal de vinculacao manual
  const [modalVinculacaoAberto, setModalVinculacaoAberto] = useState(false);
  const [buscaVinculacao, setBuscaVinculacao] = useState("");
  const [faturamentoParaVincular, setFaturamentoParaVincular] = useState<any>(null);

  // Modal de resultado da conciliacao
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);
  const [resultadoConciliacao, setResultadoConciliacao] = useState<any>(null);

  // Query de competencias disponiveis
  const { data: competencias } = trpc.faturamentoUnificado.competencias.useQuery(
    { estabelecimentoId },
    { enabled: estabelecimentoId > 0 }
  );

  // Query de convenios disponiveis
  const { data: convenios } = trpc.faturamentoUnificado.convenios.useQuery(
    { estabelecimentoId, competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined },
    { enabled: estabelecimentoId > 0 }
  );

  // Query principal - resumo por guia (aba faturamento)
  const { data: dadosGuias, isLoading, refetch } = trpc.faturamentoUnificado.resumoPorGuia.useQuery(
    {
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenio: convenioFiltro !== "todos" ? convenioFiltro : undefined,
      statusConciliacao: statusFiltro !== "todos" ? statusFiltro : undefined,
      busca: busca || undefined,
      limite: ITENS_POR_PAGINA,
      offset: paginaAtual * ITENS_POR_PAGINA,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "faturamento" }
  );

  // Query de conciliados automáticos (aba conciliados)
  const convenioIdNum = useMemo(() => {
    if (convenioFiltro === "todos") return undefined;
    const n = Number(convenioFiltro);
    return isNaN(n) ? undefined : n;
  }, [convenioFiltro]);

  const { data: dadosConciliados, isLoading: isLoadingConciliados, refetch: refetchConciliados } = trpc.faturamentoUnificado.listarConciliados.useQuery(
    {
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenioId: convenioIdNum,
      statusConciliacao: statusFiltro !== "todos" ? statusFiltro : undefined,
      busca: busca || undefined,
      limit: ITENS_POR_PAGINA,
      offset: paginaConciliados * ITENS_POR_PAGINA,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "conciliados" }
  );

  // Resumo dos conciliados
  const { data: resumoConciliados, refetch: refetchResumo } = trpc.faturamentoUnificado.resumoConciliados.useQuery(
    {
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenioId: convenioIdNum,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "conciliados" }
  );

  // Query de itens da guia selecionada
  const { data: itensGuia, isLoading: isLoadingItens } = trpc.faturamentoUnificado.itensPorGuia.useQuery(
    {
      estabelecimentoId,
      contaNumero: guiaSelecionada?.contaNumero || undefined,
      numeroGuia: guiaSelecionada?.numeroGuia || undefined,
    },
    { enabled: !!guiaSelecionada && estabelecimentoId > 0 }
  );

  // Query de recebimentos candidatos para vinculacao
  const { data: recebimentosCandidatos, isLoading: isLoadingCandidatos } = trpc.faturamentoUnificado.buscarRecebimentosCandidatos.useQuery(
    {
      estabelecimentoId,
      pacienteNome: buscaVinculacao || undefined,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
    },
    { enabled: modalVinculacaoAberto && buscaVinculacao.length >= 3 && estabelecimentoId > 0 }
  );

  // Mutations
  const popularTudo = trpc.faturamentoUnificado.popularTudo.useMutation({
    onSuccess: (data) => {
      toast.success(`Faturamento unificado atualizado: ${data.warleine.inseridos} itens Warleine + ${data.xmlTiss.inseridos} itens XML TISS`);
      refetch();
    },
    onError: (err) => toast.error(`Erro ao popular: ${err.message}`),
  });

  const vincularGuia = trpc.faturamentoUnificado.vincularGuia.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.atualizados} itens vinculados com sucesso`);
      setModalVinculacaoAberto(false);
      refetch();
    },
    onError: (err) => toast.error(`Erro ao vincular: ${err.message}`),
  });

  const conciliarAuto = trpc.faturamentoUnificado.conciliarAutomaticamente.useMutation({
    onSuccess: (data) => {
      setResultadoConciliacao(data);
      setModalResultadoAberto(true);
      toast.success(`Conciliação concluída: ${data.totalConciliados} conciliados, ${data.totalDivergentes} divergentes, ${data.totalNaoRecebidos} não recebidos`);
      refetch();
      refetchConciliados();
      refetchResumo();
    },
    onError: (err) => toast.error(`Erro na conciliação: ${err.message}`),
  });

  const resetarConc = trpc.faturamentoUnificado.resetarConciliacao.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.resetados} registros de conciliação removidos`);
      refetch();
      refetchConciliados();
      refetchResumo();
    },
    onError: (err) => toast.error(`Erro ao resetar: ${err.message}`),
  });

  // Funcoes auxiliares
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const formatarCompetencia = (comp: string | null) => {
    if (!comp) return '-';
    const match = comp.match(/(\d{4})-(\d{2})/);
    if (match) return `${match[2]}/${match[1]}`;
    return comp;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'conciliado':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Conciliado</Badge>;
      case 'divergente':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Divergente</Badge>;
      case 'nao_recebido':
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1" /> Não Recebido</Badge>;
      case 'pendente':
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const getMetodoBadge = (metodo: string | null) => {
    if (!metodo) return <Badge variant="outline" className="text-xs">-</Badge>;
    switch (metodo) {
      case 'guia_codigo':
        return <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300">Guia+Código</Badge>;
      case 'guia_codigo_tuss':
        return <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300">Guia+TUSS</Badge>;
      case 'vinculacao':
        return <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300">De-Para</Badge>;
      case 'paciente_codigo':
        return <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300">Paciente+Código</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{metodo}</Badge>;
    }
  };

  const abrirDetalhes = (conta: any) => {
    setGuiaSelecionada({ contaNumero: conta.contaNumero, numeroGuia: conta.numeroGuia });
    setModalDetalhesAberto(true);
  };

  const abrirVinculacao = (conta: any) => {
    setFaturamentoParaVincular(conta);
    setBuscaVinculacao(conta.pacienteNome || "");
    setModalVinculacaoAberto(true);
  };

  const confirmarVinculacao = (recebimento: any) => {
    if (!faturamentoParaVincular) return;
    const ids = faturamentoParaVincular.ids ? 
      (typeof faturamentoParaVincular.ids === 'string' ? faturamentoParaVincular.ids.split(',').map(Number) : [faturamentoParaVincular.ids]) :
      [faturamentoParaVincular.id];
    vincularGuia.mutate({
      faturamentoIds: ids,
      recebimentoId: recebimento.id,
      recebimentoOrigem: recebimento.origem || 'excel',
    });
  };

  const executarConciliacaoAutomatica = () => {
    conciliarAuto.mutate({
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenioId: convenioIdNum,
    });
  };

  const executarReset = () => {
    if (!confirm("Tem certeza que deseja resetar a conciliação? Todos os registros de conciliação serão removidos.")) return;
    resetarConc.mutate({
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenioId: convenioIdNum,
    });
  };

  // Exportar conciliados para Excel
  const exportarConciliadosExcel = () => {
    if (!dadosConciliados?.items?.length) return;

    const dados = dadosConciliados.items.map((c: any) => ({
      'Guia': c.numeroGuia || '-',
      'Conta': c.contaNumero || '-',
      'Paciente': c.pacienteNome || '-',
      'Convênio': c.convenio || '-',
      'Competência': formatarCompetencia(c.competencia),
      'Código Item': c.codigoItem || '-',
      'Código TUSS': c.codigoItemTuss || '-',
      'Descrição': c.descricaoItem || '-',
      'Origem': c.origemSistema || '-',
      'Qtd': Number(c.quantidade || 0),
      'Valor Faturado': Number(c.valorFaturado || 0),
      'Valor Pago': Number(c.valorPago || 0),
      'Valor Glosa': Number(c.valorGlosa || 0),
      'Diferença': Number(c.diferenca || 0),
      '% Diferença': Number(c.percentualDiferenca || 0),
      'Status': c.statusConciliacao || '-',
      'Método': c.metodoConciliacao || '-',
    }));

    const wb = XLSX.utils.book_new();

    if (resumoConciliados) {
      const wsResumo = XLSX.utils.json_to_sheet([{
        'Total Conciliados': resumoConciliados.totalConciliados,
        'Total Divergentes': resumoConciliados.totalDivergentes,
        'Total Não Recebidos': resumoConciliados.totalNaoRecebidos,
        'Valor Total Faturado': resumoConciliados.valorTotalFaturado,
        'Valor Total Pago': resumoConciliados.valorTotalPago,
        'Valor Total Glosa': resumoConciliados.valorTotalGlosa,
        'Valor Total Diferença': resumoConciliados.valorTotalDiferenca,
      }]);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
    }

    const wsItens = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, wsItens, 'Conciliados');

    XLSX.writeFile(wb, `conciliacao_automatica_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Exportar faturamento para Excel
  const exportarFaturamentoExcel = () => {
    if (!dadosGuias?.contas?.length) return;
    const dados = dadosGuias.contas.map((c: any) => ({
      'Guia/Conta': c.contaNumero || c.numeroGuia || '-',
      'Paciente': c.pacienteNome || '-',
      'Convênio': c.convenio || '-',
      'Competência': formatarCompetencia(c.competencia),
      'Origem': c.origemSistema || '-',
      'Total Itens': c.totalItens || 0,
      'Valor Faturado': Number(c.valorFaturado || 0),
      'Valor Pago': Number(c.valorPago || 0),
      'Valor Glosado': Number(c.valorGlosa || 0),
      'Status': c.statusConciliacao || 'pendente',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, ws, 'Faturamento');
    XLSX.writeFile(wb, `faturamento_unificado_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!estabelecimentoId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione um estabelecimento para visualizar a conciliação cruzada.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const resumo = dadosGuias?.resumo;
  const contas = dadosGuias?.contas || [];
  const totalPaginas = Math.ceil((dadosGuias?.total || 0) / ITENS_POR_PAGINA);

  const itensConciliados = dadosConciliados?.items || [];
  const totalPaginasConciliados = Math.ceil((dadosConciliados?.total || 0) / ITENS_POR_PAGINA);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Link2 className="w-7 h-7 text-primary" />
              Conciliação Cruzada
            </h1>
            <p className="text-muted-foreground">Cruzamento do faturamento (Warleine + XML TISS) com recebimentos (Excel + XML retorno)</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => popularTudo.mutate({ estabelecimentoId, competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined })}
              disabled={popularTudo.isPending}
            >
              {popularTudo.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              Popular Dados
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={executarConciliacaoAutomatica}
              disabled={conciliarAuto.isPending}
            >
              {conciliarAuto.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {conciliarAuto.isPending ? "Conciliando..." : "Conciliar Automaticamente"}
            </Button>
            <Button 
              variant="outline" 
              onClick={executarReset}
              disabled={resetarConc.isPending}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              {resetarConc.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Resetar
            </Button>
            <Button variant="outline" onClick={() => { refetch(); refetchConciliados(); refetchResumo(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label className="font-semibold text-primary">Competência</Label>
                <Select value={competenciaFiltro} onValueChange={(v) => { setCompetenciaFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); }}>
                  <SelectTrigger className="border-primary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {competencias?.map((c: any) => (
                      <SelectItem key={c.competencia} value={c.competencia}>
                        {formatarCompetencia(c.competencia)} ({c.total} itens)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Convênio</Label>
                <Select value={convenioFiltro} onValueChange={(v) => { setConvenioFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {convenios?.map((c: any) => (
                      <SelectItem key={c.convenio || c.convenioId} value={c.convenio || String(c.convenioId)}>
                        {c.convenio} ({c.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Conciliação</Label>
                <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="conciliado">Conciliado</SelectItem>
                    <SelectItem value="divergente">Divergente</SelectItem>
                    <SelectItem value="nao_recebido">Não Recebido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="lg:col-span-2">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Guia, conta, paciente, convênio..."
                    value={busca}
                    onChange={(e) => { setBusca(e.target.value); setPaginaAtual(0); setPaginaConciliados(0); }}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Abas */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="conciliados" className="flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Conciliados
              {resumoConciliados && (resumoConciliados.totalConciliados + resumoConciliados.totalDivergentes + resumoConciliados.totalNaoRecebidos) > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {resumoConciliados.totalConciliados + resumoConciliados.totalDivergentes + resumoConciliados.totalNaoRecebidos}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="faturamento" className="flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              Faturamento Unificado
            </TabsTrigger>
          </TabsList>

          {/* ==================== ABA CONCILIADOS ==================== */}
          <TabsContent value="conciliados" className="space-y-4 mt-4">
            {/* Cards de Resumo da Conciliação */}
            {resumoConciliados && (resumoConciliados.totalConciliados + resumoConciliados.totalDivergentes + resumoConciliados.totalNaoRecebidos) > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Conciliados</p>
                          <p className="text-2xl font-bold">{resumoConciliados.totalConciliados}</p>
                          <p className="text-xs opacity-70">{formatarMoeda(resumoConciliados.valorTotalPago)}</p>
                        </div>
                        <CheckCircle2 className="w-10 h-10 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Divergentes</p>
                          <p className="text-2xl font-bold">{resumoConciliados.totalDivergentes}</p>
                          <p className="text-xs opacity-70">{formatarMoeda(resumoConciliados.valorTotalDiferenca)} diferença</p>
                        </div>
                        <AlertCircle className="w-10 h-10 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Não Recebidos</p>
                          <p className="text-2xl font-bold">{resumoConciliados.totalNaoRecebidos}</p>
                          <p className="text-xs opacity-70">Sem retorno do convênio</p>
                        </div>
                        <XCircle className="w-10 h-10 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Total Faturado</p>
                          <p className="text-2xl font-bold">{formatarMoeda(resumoConciliados.valorTotalFaturado)}</p>
                          <p className="text-xs opacity-70">Glosa: {formatarMoeda(resumoConciliados.valorTotalGlosa)}</p>
                        </div>
                        <DollarSign className="w-10 h-10 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Barra de progresso */}
                {(() => {
                  const total = resumoConciliados.totalConciliados + resumoConciliados.totalDivergentes + resumoConciliados.totalNaoRecebidos;
                  if (total === 0) return null;
                  return (
                    <div className="space-y-2">
                      <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                        {resumoConciliados.totalConciliados > 0 && (
                          <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                            style={{ width: `${(resumoConciliados.totalConciliados / total) * 100}%` }}>
                            {((resumoConciliados.totalConciliados / total) * 100).toFixed(0)}%
                          </div>
                        )}
                        {resumoConciliados.totalDivergentes > 0 && (
                          <div className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                            style={{ width: `${(resumoConciliados.totalDivergentes / total) * 100}%` }}>
                            {((resumoConciliados.totalDivergentes / total) * 100).toFixed(0)}%
                          </div>
                        )}
                        {resumoConciliados.totalNaoRecebidos > 0 && (
                          <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                            style={{ width: `${(resumoConciliados.totalNaoRecebidos / total) * 100}%` }}>
                            {((resumoConciliados.totalNaoRecebidos / total) * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Conciliado</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Divergente</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Não Recebido</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : null}

            {/* Tabela de Conciliados */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Resultados da Conciliação ({dadosConciliados?.total || 0})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportarConciliadosExcel} disabled={!itensConciliados.length}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingConciliados ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : itensConciliados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum resultado de conciliação encontrado.</p>
                    <p className="text-sm mt-2">Clique em "Conciliar Automaticamente" para executar o cruzamento.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Guia</th>
                            <th className="text-left p-3 font-medium">Código</th>
                            <th className="text-left p-3 font-medium max-w-[180px]">Paciente</th>
                            <th className="text-left p-3 font-medium">Convênio</th>
                            <th className="text-left p-3 font-medium">Comp.</th>
                            <th className="text-center p-3 font-medium">Origem</th>
                            <th className="text-right p-3 font-medium">Faturado</th>
                            <th className="text-right p-3 font-medium">Pago</th>
                            <th className="text-right p-3 font-medium">Glosa</th>
                            <th className="text-right p-3 font-medium">Diferença</th>
                            <th className="text-center p-3 font-medium">Status</th>
                            <th className="text-center p-3 font-medium">Método</th>
                          </tr>
                        </thead>
                        <tbody>
                          {itensConciliados.map((item: any, index: number) => (
                            <tr key={item.id || index} className={`border-b hover:bg-muted/50 ${
                              item.statusConciliacao === 'divergente' ? 'bg-yellow-50/50 dark:bg-yellow-950/20' :
                              item.statusConciliacao === 'nao_recebido' ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                            }`}>
                              <td className="p-3 font-mono text-sm">{item.numeroGuia || item.contaNumero || '-'}</td>
                              <td className="p-3 font-mono text-sm">{item.codigoItem || '-'}</td>
                              <td className="p-3 text-sm max-w-[180px] truncate" title={item.pacienteNome}>{item.pacienteNome || '-'}</td>
                              <td className="p-3 text-sm max-w-[120px] truncate" title={item.convenio}>{item.convenio || '-'}</td>
                              <td className="p-3 text-sm">{formatarCompetencia(item.competencia)}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className="text-xs">
                                  {item.origemSistema === 'WARLEINE' ? 'Warleine' : 'XML'}
                                </Badge>
                              </td>
                              <td className="p-3 text-right font-medium text-blue-600">{formatarMoeda(Number(item.valorFaturado))}</td>
                              <td className="p-3 text-right font-medium text-green-600">{formatarMoeda(Number(item.valorPago))}</td>
                              <td className="p-3 text-right font-medium text-red-600">{formatarMoeda(Number(item.valorGlosa))}</td>
                              <td className={`p-3 text-right font-medium ${Number(item.diferenca) > 0 ? 'text-red-600' : Number(item.diferenca) < 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                                {Number(item.diferenca) !== 0 ? formatarMoeda(Number(item.diferenca)) : '-'}
                              </td>
                              <td className="p-3 text-center">{getStatusBadge(item.statusConciliacao)}</td>
                              <td className="p-3 text-center">{getMetodoBadge(item.metodoConciliacao)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    {totalPaginasConciliados > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Página {paginaConciliados + 1} de {totalPaginasConciliados} ({dadosConciliados?.total} itens)
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPaginaConciliados(p => Math.max(0, p - 1))} disabled={paginaConciliados === 0}>
                            Anterior
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPaginaConciliados(p => Math.min(totalPaginasConciliados - 1, p + 1))} disabled={paginaConciliados >= totalPaginasConciliados - 1}>
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ==================== ABA FATURAMENTO UNIFICADO ==================== */}
          <TabsContent value="faturamento" className="space-y-4 mt-4">
            {/* Cards de Resumo do Faturamento */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
                ))}
              </div>
            ) : resumo && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Total Faturado</p>
                        <p className="text-2xl font-bold">{formatarMoeda(Number(resumo.totalFaturado))}</p>
                        <p className="text-xs opacity-70">{resumo.totalContas} guias / {resumo.totalItens} itens</p>
                      </div>
                      <DollarSign className="w-10 h-10 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Total Pago</p>
                        <p className="text-2xl font-bold">{formatarMoeda(Number(resumo.totalPago))}</p>
                        <p className="text-xs opacity-70">
                          {Number(resumo.totalFaturado) > 0 
                            ? ((Number(resumo.totalPago) / Number(resumo.totalFaturado)) * 100).toFixed(1) 
                            : 0}%
                        </p>
                      </div>
                      <TrendingUp className="w-10 h-10 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Total Glosado</p>
                        <p className="text-2xl font-bold">{formatarMoeda(Number(resumo.totalGlosado))}</p>
                        <p className="text-xs opacity-70">
                          {Number(resumo.totalFaturado) > 0 
                            ? ((Number(resumo.totalGlosado) / Number(resumo.totalFaturado)) * 100).toFixed(1) 
                            : 0}%
                        </p>
                      </div>
                      <TrendingDown className="w-10 h-10 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Status</p>
                        <div className="flex gap-2 mt-1 text-xs flex-wrap">
                          <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensConciliados} OK</span>
                          <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensDivergentes} Div.</span>
                        </div>
                        <div className="flex gap-2 mt-1 text-xs flex-wrap">
                          <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensPendentes} Pend.</span>
                          <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensNaoRecebidos} N/R</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabela de Guias */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  Guias / Contas ({dadosGuias?.total || 0})
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportarFaturamentoExcel} disabled={!contas.length}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Excel
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : contas.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma guia encontrada.</p>
                    <p className="text-sm mt-2">Clique em "Popular Dados" para importar do Warleine e XML TISS.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium">Guia/Conta</th>
                            <th className="text-left p-3 font-medium">Paciente</th>
                            <th className="text-left p-3 font-medium">Convênio</th>
                            <th className="text-left p-3 font-medium">Comp.</th>
                            <th className="text-center p-3 font-medium">Origem</th>
                            <th className="text-center p-3 font-medium">Itens</th>
                            <th className="text-right p-3 font-medium">Faturado</th>
                            <th className="text-right p-3 font-medium">Pago</th>
                            <th className="text-right p-3 font-medium">Glosado</th>
                            <th className="text-center p-3 font-medium">Status</th>
                            <th className="text-center p-3 font-medium">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contas.map((conta: any, index: number) => (
                            <tr key={`${conta.contaNumero || conta.numeroGuia}-${index}`} className="border-b hover:bg-muted/50">
                              <td className="p-3">
                                <div className="font-medium font-mono text-sm">{conta.contaNumero || conta.numeroGuia || '-'}</div>
                              </td>
                              <td className="p-3 text-sm max-w-[200px] truncate" title={conta.pacienteNome}>
                                {conta.pacienteNome || '-'}
                              </td>
                              <td className="p-3 text-sm max-w-[150px] truncate" title={conta.convenio}>
                                {conta.convenio || '-'}
                              </td>
                              <td className="p-3 text-sm">{formatarCompetencia(conta.competencia)}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className="text-xs">
                                  {conta.origemSistema === 'WARLEINE' ? 'Warleine' : 'XML'}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">{conta.totalItens || 0}</td>
                              <td className="p-3 text-right font-medium text-blue-600">{formatarMoeda(Number(conta.valorFaturado))}</td>
                              <td className="p-3 text-right font-medium text-green-600">{formatarMoeda(Number(conta.valorPago))}</td>
                              <td className="p-3 text-right font-medium text-red-600">{formatarMoeda(Number(conta.valorGlosa))}</td>
                              <td className="p-3 text-center">{getStatusBadge(conta.statusConciliacao || 'pendente')}</td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => abrirDetalhes(conta)} title="Ver detalhes">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => abrirVinculacao(conta)} title="Vincular com recebimento">
                                    <Link2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    {totalPaginas > 1 && (
                      <div className="flex items-center justify-between mt-4">
                        <p className="text-sm text-muted-foreground">
                          Página {paginaAtual + 1} de {totalPaginas} ({dadosGuias?.total} guias)
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => Math.max(0, p - 1))} disabled={paginaAtual === 0}>
                            Anterior
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaAtual >= totalPaginas - 1}>
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de Detalhes da Guia */}
        <Dialog open={modalDetalhesAberto} onOpenChange={setModalDetalhesAberto}>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detalhes da Guia: {guiaSelecionada?.contaNumero || guiaSelecionada?.numeroGuia}
              </DialogTitle>
            </DialogHeader>

            {isLoadingItens ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : itensGuia && itensGuia.length > 0 ? (
              <div className="space-y-4">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium">Código</th>
                        <th className="text-left p-2 font-medium min-w-[250px]">Descrição</th>
                        <th className="text-left p-2 font-medium">Tipo</th>
                        <th className="text-center p-2 font-medium">Qtd</th>
                        <th className="text-right p-2 font-medium">Faturado</th>
                        <th className="text-right p-2 font-medium">Pago</th>
                        <th className="text-right p-2 font-medium">Glosado</th>
                        <th className="text-left p-2 font-medium">Data Exec.</th>
                        <th className="text-center p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensGuia.map((item: any, index: number) => (
                        <tr key={item.id || index} className={`border-b ${Number(item.valorGlosado) > 0 ? 'bg-red-50 dark:bg-red-950/30' : ''}`}>
                          <td className="p-2 font-mono text-sm">{item.codigoItem || '-'}</td>
                          <td className="p-2 text-sm">{item.descricaoItem || '-'}</td>
                          <td className="p-2"><Badge variant="secondary" className="text-xs">{item.tipoItem || '-'}</Badge></td>
                          <td className="p-2 text-center">{item.quantidade || 1}</td>
                          <td className="p-2 text-right text-blue-600">{formatarMoeda(Number(item.valorFaturado))}</td>
                          <td className="p-2 text-right text-green-600">{formatarMoeda(Number(item.valorPago))}</td>
                          <td className="p-2 text-right text-red-600">{formatarMoeda(Number(item.valorGlosado))}</td>
                          <td className="p-2 text-sm">{item.dataExecucao ? new Date(item.dataExecucao).toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="p-2 text-center">{getStatusBadge(item.statusConciliacao || 'pendente')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum item encontrado para esta guia.</p>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Vinculação Manual */}
        <Dialog open={modalVinculacaoAberto} onOpenChange={setModalVinculacaoAberto}>
          <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5" />
                Vincular Guia com Recebimento
              </DialogTitle>
            </DialogHeader>

            {faturamentoParaVincular && (
              <div className="space-y-4">
                <Card className="bg-blue-50 dark:bg-blue-950">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Guia/Conta do Faturamento</p>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                      <div><span className="text-muted-foreground">Guia:</span> {faturamentoParaVincular.contaNumero || faturamentoParaVincular.numeroGuia}</div>
                      <div><span className="text-muted-foreground">Paciente:</span> {faturamentoParaVincular.pacienteNome || '-'}</div>
                      <div><span className="text-muted-foreground">Convênio:</span> {faturamentoParaVincular.convenio || '-'}</div>
                      <div><span className="text-muted-foreground">Valor:</span> {formatarMoeda(Number(faturamentoParaVincular.valorFaturado))}</div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <Label>Buscar recebimento por nome do paciente (min. 3 caracteres)</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Nome do paciente..." value={buscaVinculacao} onChange={(e) => setBuscaVinculacao(e.target.value)} className="pl-9" />
                  </div>
                </div>

                {isLoadingCandidatos ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : recebimentosCandidatos && recebimentosCandidatos.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {recebimentosCandidatos.map((rec: any) => (
                      <Card key={`${rec.origem}-${rec.id}`} className="hover:bg-muted/50 cursor-pointer" onClick={() => confirmarVinculacao(rec)}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <div className="font-medium">{rec.nomeBeneficiario || '-'}</div>
                              <div className="text-muted-foreground">
                                Guia: {rec.numeroGuia || '-'} | Código: {rec.codigoItem || '-'} | {rec.descricaoItem || '-'}
                              </div>
                              <div className="text-muted-foreground">
                                Pago: <span className="text-green-600 font-medium">{formatarMoeda(Number(rec.valorPago))}</span>
                                {Number(rec.valorGlosa) > 0 && (
                                  <> | Glosa: <span className="text-red-600">{formatarMoeda(Number(rec.valorGlosa))}</span></>
                                )}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); confirmarVinculacao(rec); }}>
                              <Link2 className="w-4 h-4 mr-1" />
                              Vincular
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : buscaVinculacao.length >= 3 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhum recebimento encontrado para "{buscaVinculacao}".</p>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Digite pelo menos 3 caracteres para buscar.</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Resultado da Conciliação Automática */}
        <Dialog open={modalResultadoAberto} onOpenChange={setModalResultadoAberto}>
          <DialogContent className="max-w-[700px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Resultado da Conciliação Automática
              </DialogTitle>
            </DialogHeader>

            {resultadoConciliacao && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card className="bg-blue-50 dark:bg-blue-950">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Processados</p>
                      <p className="text-2xl font-bold text-blue-600">{resultadoConciliacao.totalProcessados}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Conciliados</p>
                      <p className="text-2xl font-bold text-green-600">{resultadoConciliacao.totalConciliados}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-yellow-50 dark:bg-yellow-950">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Divergentes</p>
                      <p className="text-2xl font-bold text-yellow-600">{resultadoConciliacao.totalDivergentes}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-950">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Não Recebidos</p>
                      <p className="text-2xl font-bold text-red-600">{resultadoConciliacao.totalNaoRecebidos}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Métodos de matching */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Métodos de Matching Utilizados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guia + Código:</span>
                        <span className="font-medium">{resultadoConciliacao.detalhes?.conciliadosPorGuiaCodigo || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Guia + TUSS:</span>
                        <span className="font-medium">{resultadoConciliacao.detalhes?.conciliadosPorGuiaCodigoTuss || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vinculação (de-para):</span>
                        <span className="font-medium">{resultadoConciliacao.detalhes?.conciliadosPorVinculacao || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Paciente + Código:</span>
                        <span className="font-medium">{resultadoConciliacao.detalhes?.conciliadosPorPacienteCodigo || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top divergências */}
                {resultadoConciliacao.divergencias && resultadoConciliacao.divergencias.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                        Top Divergências ({resultadoConciliacao.divergencias.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[250px]">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-background">
                            <tr className="border-b">
                              <th className="text-left p-2">Guia</th>
                              <th className="text-left p-2">Código</th>
                              <th className="text-right p-2">Faturado</th>
                              <th className="text-right p-2">Recebido</th>
                              <th className="text-right p-2">Diferença</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultadoConciliacao.divergencias.slice(0, 20).map((d: any, i: number) => (
                              <tr key={i} className="border-b hover:bg-muted/50">
                                <td className="p-2 font-mono">{d.numeroGuia}</td>
                                <td className="p-2 font-mono">{d.codigoItem}</td>
                                <td className="p-2 text-right text-blue-600">{formatarMoeda(d.valorFaturado)}</td>
                                <td className="p-2 text-right text-green-600">{formatarMoeda(d.valorRecebido)}</td>
                                <td className={`p-2 text-right font-medium ${d.diferenca > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                  {formatarMoeda(d.diferenca)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {resultadoConciliacao.divergencias.length > 20 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Mostrando 20 de {resultadoConciliacao.divergencias.length} divergências. Exporte para Excel para ver todas.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => setModalResultadoAberto(false)}>
                    Fechar
                  </Button>
                  <Button variant="outline" onClick={() => { setModalResultadoAberto(false); setAbaAtiva("conciliados"); }}>
                    <ListChecks className="w-4 h-4 mr-2" />
                    Ver Conciliados
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
