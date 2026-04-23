import { useState, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useDebounce } from "@/_core/hooks/useDebounce";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, Filter, Download, Eye, CheckCircle2, AlertCircle, XCircle, Clock,
  DollarSign, TrendingUp, TrendingDown, FileText, Building2, ArrowUpDown,
  ChevronDown, ChevronUp, RefreshCw, Link2, Database, Loader2, Unlink,
  Zap, RotateCcw, BarChart3, Info, ListChecks, Table2, ChevronRight, ArrowLeft,
  Ban, Undo2, CheckSquare, FileCode, Package, ExternalLink, FileDown
} from "lucide-react";

import { AbaXmlRecurso } from "@/components/ConciliacaoCruzada/AbaXmlRecurso";
import { AbaFaturamento } from "@/components/ConciliacaoCruzada/AbaFaturamento";
import { AbaConciliados } from "@/components/ConciliacaoCruzada/AbaConciliados";
import * as XLSX from "xlsx";
import { formatDateBR, formatDateTimeBR } from "@/lib/dateUtils";

export default function ConciliacaoCruzada() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 0;

  // Aba ativa
  const [abaAtiva, setAbaAtiva] = useState("conciliados");

  // Filtros compartilhados
  const [competenciaFiltro, setCompetenciaFiltro] = useState<string>("todos");
  const [convenioFiltro, setConvenioFiltro] = useState("todos");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [loteXmlFiltro, setLoteXmlFiltro] = useState("todos");
  const [loteRetornoFiltro, setLoteRetornoFiltro] = useState("todos");
  const [loteXmlOpen, setLoteXmlOpen] = useState(false);
  const [loteRetornoOpen, setLoteRetornoOpen] = useState(false);
  const [buscaInput, setBuscaInput] = useState("");
  const busca = useDebounce(buscaInput, 500);
  const [paginaAtual, setPaginaAtual] = useState(0);
  const ITENS_POR_PAGINA = 50;

  // Paginação da aba conciliados (agrupado por guia)
  const [paginaConciliados, setPaginaConciliados] = useState(0);

  // Tela de detalhes de guia conciliada (drill-down)
  const [guiaConciliadaSelecionada, setGuiaConciliadaSelecionada] = useState<any>(null);

  // Modal de detalhes da guia (aba faturamento)
  const [guiaSelecionada, setGuiaSelecionada] = useState<{ contaNumero?: string; numeroGuia?: string } | null>(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);

  // Modal de vinculacao manual
  const [modalVinculacaoAberto, setModalVinculacaoAberto] = useState(false);
  const [buscaVinculacao, setBuscaVinculacao] = useState("");
  const [faturamentoParaVincular, setFaturamentoParaVincular] = useState<any>(null);

  // Modal de resultado da conciliacao
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);
  const [resultadoConciliacao, setResultadoConciliacao] = useState<any>(null);

  // Job de conciliação assíncrona
  const [conciliacaoJobId, setConciliacaoJobId] = useState<string | null>(null);
  const [conciliacaoEmAndamento, setConciliacaoEmAndamento] = useState(false);

  // Geração de XML de recurso
  const [guiasSelecionadasXml, setGuiasSelecionadasXml] = useState<Set<string>>(new Set());
  const [modalXmlAberto, setModalXmlAberto] = useState(false);
  const [xmlRegistroANS, setXmlRegistroANS] = useState("");
  const [xmlCnpjOperadora, setXmlCnpjOperadora] = useState("");
  const [xmlNumeroProtocolo, setXmlNumeroProtocolo] = useState("");
  const [xmlDataProtocolo, setXmlDataProtocolo] = useState("");

  // Glosa de itens não recebidos
  const [itensSelecionadosGlosa, setItensSelecionadosGlosa] = useState<Set<number>>(new Set());
  const [modalGlosaAberto, setModalGlosaAberto] = useState(false);
  const [motivoGlosa, setMotivoGlosa] = useState("");
  const [codigoGlosa, setCodigoGlosa] = useState("");
  const [modoGlosa, setModoGlosa] = useState<'selecionados' | 'todos'>('selecionados');

  // ===== QUERIES PARA ABA CONCILIADOS =====

  // Competências da conciliados_automatico
  const { data: competenciasConciliados } = trpc.faturamentoUnificado.competenciasConciliados.useQuery(
    { estabelecimentoId },
    { enabled: estabelecimentoId > 0 }
  );

  // Auto-selecionar a competencia mais recente ao carregar
  useEffect(() => {
    if (competenciasConciliados && competenciasConciliados.length > 0 && competenciaFiltro === "todos") {
      setCompetenciaFiltro(competenciasConciliados[0].competencia);
    }
  }, [competenciasConciliados]);

  // Convênios da conciliados_automatico
  const { data: conveniosConciliados } = trpc.faturamentoUnificado.conveniosConciliados.useQuery(
    { estabelecimentoId, competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined },
    { enabled: estabelecimentoId > 0 }
  );

  // Convênio ID numérico para filtro
  const convenioIdNum = useMemo(() => {
    if (convenioFiltro === "todos") return undefined;
    const n = Number(convenioFiltro);
    return isNaN(n) ? undefined : n;
  }, [convenioFiltro]);

  // Lotes do XML TISS (enviado)
  const { data: lotesXml } = trpc.faturamentoUnificado.lotesXmlTiss.useQuery(
    { estabelecimentoId, competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined, convenioId: convenioIdNum },
    { enabled: estabelecimentoId > 0 }
  );

  // Lotes do retorno/demonstrativo
  const { data: lotesRetorno } = trpc.faturamentoUnificado.lotesRetorno.useQuery(
    { estabelecimentoId, competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined, convenioId: convenioIdNum },
    { enabled: estabelecimentoId > 0 }
  );

  // ===== QUERY PARA SEPARAÇÃO PRÓPRIO/TERCEIRO =====
  const { data: codigosPrestador } = trpc.faturamentoUnificado.codigosPrestadorEstabelecimento.useQuery(
    { estabelecimentoId },
    { enabled: estabelecimentoId > 0 }
  );

  // Filtro de tipo de prestador (próprio/terceiro)
  const [filtroPrestador, setFiltroPrestador] = useState<'todos' | 'proprio' | 'terceiro'>('todos');

  // Função para verificar se uma guia é de terceiro
  // Terceiro = código do prestador executante NÃO está entre os códigos PRÓPRIOS cadastrados
  const isTerceiro = useCallback((guia: any) => {
    // Primeiro: verificar pelo statusGuia se disponível (vem do backend)
    if (guia.statusGuia === 'terceiro') return true;
    // Segundo: verificar pelo código do prestador executante vs próprios
    if (!codigosPrestador?.codigosProprios?.length) return false;
    const codExec = guia.codigoPrestadorExecutante;
    if (!codExec) return false;
    // Se o código NÃO está nos próprios, é terceiro
    return !codigosPrestador.codigosProprios.includes(codExec);
  }, [codigosPrestador]);

  // ===== QUERIES PARA ABA XML RECURSO =====

  // Guias glosadas disponíveis para geração de XML
  const { data: guiasGlosadas, isLoading: isLoadingGuiasGlosadas, refetch: refetchGuiasGlosadas } = trpc.faturamentoUnificado.guiasGlosadasDisponiveis.useQuery(
    {
      estabelecimentoId,
      convenioId: convenioIdNum,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      loteXml: loteXmlFiltro !== "todos" ? loteXmlFiltro : undefined,
      loteRetorno: loteRetornoFiltro !== "todos" ? loteRetornoFiltro : undefined,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "xml_recurso" }
  );

  // Histórico de XMLs gerados
  const { data: xmlsGerados, isLoading: isLoadingXmlsGerados, refetch: refetchXmlsGerados } = trpc.faturamentoUnificado.listarXmlsGerados.useQuery(
    {
      estabelecimentoId,
      convenioId: convenioIdNum,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "xml_recurso" }
  );

  // Resumo agrupado por guia (aba conciliados - tabela principal)
  const { data: dadosGuiasConciliadas, isLoading: isLoadingGuiasConciliadas, refetch: refetchGuiasConciliadas } = trpc.faturamentoUnificado.resumoConciliadosPorGuia.useQuery(
    {
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenioId: convenioIdNum,
      statusConciliacao: statusFiltro !== "todos" ? statusFiltro : undefined,
      busca: busca || undefined,
      loteXml: loteXmlFiltro !== "todos" ? loteXmlFiltro : undefined,
      loteRetorno: loteRetornoFiltro !== "todos" ? loteRetornoFiltro : undefined,
      limit: ITENS_POR_PAGINA,
      offset: paginaConciliados * ITENS_POR_PAGINA,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "conciliados" && !guiaConciliadaSelecionada && competenciaFiltro !== "todos" }
  );

  // Resumo totais dos conciliados
  const { data: resumoConciliados, refetch: refetchResumo } = trpc.faturamentoUnificado.resumoConciliados.useQuery(
    {
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenioId: convenioIdNum,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "conciliados" && competenciaFiltro !== "todos" }
  );

  // Itens detalhados de uma guia conciliada (drill-down)
  const { data: itensConciliadosGuia, isLoading: isLoadingItensConciliados } = trpc.faturamentoUnificado.itensConciliadosPorGuia.useQuery(
    {
      estabelecimentoId,
      numeroGuia: guiaConciliadaSelecionada?.numeroGuia || undefined,
      contaNumero: guiaConciliadaSelecionada?.contaNumero || undefined,
    },
    { enabled: !!guiaConciliadaSelecionada && estabelecimentoId > 0 }
  );

  // ===== QUERIES PARA ABA FATURAMENTO UNIFICADO =====

  // Competências do faturamento_unificado
  const { data: competencias } = trpc.faturamentoUnificado.competencias.useQuery(
    { estabelecimentoId },
    { enabled: estabelecimentoId > 0 }
  );

  // Convênios do faturamento_unificado
  const { data: convenios } = trpc.faturamentoUnificado.convenios.useQuery(
    { estabelecimentoId, competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined },
    { enabled: estabelecimentoId > 0 }
  );

  // Resumo por guia (aba faturamento)
  const { data: dadosGuias, isLoading, refetch } = trpc.faturamentoUnificado.resumoPorGuia.useQuery(
    {
      estabelecimentoId,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
      convenio: convenioFiltro !== "todos" && isNaN(Number(convenioFiltro)) ? convenioFiltro : undefined,
      convenioId: convenioIdNum,
      statusConciliacao: statusFiltro !== "todos" ? statusFiltro : undefined,
      busca: busca || undefined,
      loteXml: loteXmlFiltro !== "todos" ? loteXmlFiltro : undefined,
      loteRetorno: loteRetornoFiltro !== "todos" ? loteRetornoFiltro : undefined,
      limite: ITENS_POR_PAGINA,
      offset: paginaAtual * ITENS_POR_PAGINA,
    },
    { enabled: estabelecimentoId > 0 && abaAtiva === "faturamento" && competenciaFiltro !== "todos" }
  );

  // Itens da guia selecionada (modal faturamento)
  const { data: itensGuia, isLoading: isLoadingItens } = trpc.faturamentoUnificado.itensPorGuia.useQuery(
    {
      estabelecimentoId,
      contaNumero: guiaSelecionada?.contaNumero || undefined,
      numeroGuia: guiaSelecionada?.numeroGuia || undefined,
    },
    { enabled: !!guiaSelecionada && estabelecimentoId > 0 }
  );

  // Recebimentos candidatos para vinculação manual
  const { data: recebimentosCandidatos, isLoading: isLoadingCandidatos } = trpc.faturamentoUnificado.buscarRecebimentosCandidatos.useQuery(
    {
      estabelecimentoId,
      pacienteNome: buscaVinculacao || undefined,
      competencia: competenciaFiltro !== "todos" ? competenciaFiltro : undefined,
    },
    { enabled: modalVinculacaoAberto && buscaVinculacao.length >= 3 && estabelecimentoId > 0 }
  );

  // ===== MUTATIONS =====

  const popularTudo = trpc.faturamentoUnificado.popularTudo.useMutation({
    onSuccess: (data) => {
      const partes = [];
      if (data.warleine.total > 0) partes.push(`${data.warleine.total} Warleine`);
      if (data.xmlTiss.total > 0) partes.push(`${data.xmlTiss.total} XML TISS`);
      if (data.tasyStaging?.total > 0) partes.push(`${data.tasyStaging.total} Tasy`);
      toast.success(`Faturamento unificado: ${partes.join(' + ')} = ${data.totalGeral} itens`);
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
    onSuccess: (data: any) => {
      if (data.jobId) {
        setConciliacaoJobId(data.jobId);
        setConciliacaoEmAndamento(true);
        toast.info('Conciliação iniciada em background. Acompanhe o progresso...');
      }
    },
    onError: (err) => toast.error(`Erro na conciliação: ${err.message}`),
  });

  // Polling do status do job de conciliação
  const { data: statusJob } = trpc.faturamentoUnificado.statusConciliacao.useQuery(
    { jobId: conciliacaoJobId || '' },
    {
      enabled: !!conciliacaoJobId && conciliacaoEmAndamento,
      refetchInterval: conciliacaoEmAndamento ? 3000 : false,
    }
  );

  // Reagir ao status do job
  useEffect(() => {
    if (!statusJob || !conciliacaoEmAndamento) return;
    
    if (statusJob.status === 'concluido') {
      setConciliacaoEmAndamento(false);
      if (statusJob.resultado && statusJob.resultado.totalProcessados > 0) {
        setResultadoConciliacao(statusJob.resultado);
        setModalResultadoAberto(true);
        const r = statusJob.resultado;
        toast.success(`Conciliação concluída: ${r.totalConciliados} conciliados, ${r.totalDivergentes} divergentes, ${r.totalNaoRecebidos} glosados${r.totalTerceiros ? `, ${r.totalTerceiros} terceiros` : ''}`);
        refetch();
        refetchGuiasConciliadas();
        refetchResumo();
      } else if (statusJob.erro) {
        // Concluído mas com mensagem informativa (ex: sem demonstrativos)
        toast.warning(statusJob.erro, { duration: 10000 });
      } else {
        toast.info('Conciliação concluída: nenhum item processado.');
      }
    } else if (statusJob.status === 'erro') {
      setConciliacaoEmAndamento(false);
      toast.error(`Erro na conciliação: ${statusJob.erro || 'Erro desconhecido'}`);
    }
  }, [statusJob?.status, statusJob?.resultado]);

  const resetarConc = trpc.faturamentoUnificado.resetarConciliacao.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.resetados} registros de conciliação removidos`);
      refetch();
      refetchGuiasConciliadas();
      refetchResumo();
      setGuiaConciliadaSelecionada(null);
    },
    onError: (err) => toast.error(`Erro ao resetar: ${err.message}`),
  });

  // Mutations de glosa
  const glosarItensMut = trpc.faturamentoUnificado.glosarItens.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.atualizados} itens marcados como glosa`);
      setItensSelecionadosGlosa(new Set());
      setModalGlosaAberto(false);
      setMotivoGlosa("");
      setCodigoGlosa("");
      refetchGuiasConciliadas();
      refetchResumo();
    },
    onError: (err) => toast.error(`Erro ao glosar: ${err.message}`),
  });

  const glosarTodosMut = trpc.faturamentoUnificado.glosarTodosNaoRecebidosPorGuia.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.atualizados} itens marcados como glosa`);
      setModalGlosaAberto(false);
      setMotivoGlosa("");
      setCodigoGlosa("");
      refetchGuiasConciliadas();
      refetchResumo();
    },
    onError: (err) => toast.error(`Erro ao glosar: ${err.message}`),
  });

  const reverterGlosaMut = trpc.faturamentoUnificado.reverterGlosa.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.atualizados} itens revertidos para não recebido`);
      setItensSelecionadosGlosa(new Set());
      refetchGuiasConciliadas();
      refetchResumo();
    },
    onError: (err) => toast.error(`Erro ao reverter glosa: ${err.message}`),
  });

  // Mutation de geração de XML
  const gerarXmlMut = trpc.faturamentoUnificado.gerarXmlRecurso.useMutation({
    onSuccess: (data) => {
      toast.success(`XML gerado com sucesso! ${data.totalGuias} guia(s), ${data.totalItens} itens, ${formatarMoeda(data.valorTotalGlosado)} glosados`);
      setGuiasSelecionadasXml(new Set());
      setModalXmlAberto(false);
      refetchGuiasGlosadas();
      refetchXmlsGerados();
      // Abrir o download
      if (data.xmlUrl) {
        window.open(data.xmlUrl, '_blank');
      }
    },
    onError: (err) => toast.error(`Erro ao gerar XML: ${err.message}`),
  });

  // ===== HELPERS =====

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
      case 'glosado':
        return <Badge className="bg-purple-600 hover:bg-purple-700"><Ban className="w-3 h-3 mr-1" /> Glosado</Badge>;
      case 'terceiro':
        return <Badge className="bg-orange-500 hover:bg-orange-600"><ExternalLink className="w-3 h-3 mr-1" /> Terceiro</Badge>;
      case 'pendente':
      default:
        return <Badge className="bg-gray-500 hover:bg-gray-600"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const getMetodoBadge = (metodo: string | null) => {
    if (!metodo) return <span className="text-muted-foreground text-xs">-</span>;
    switch (metodo) {
      case 'guia_codigo':
        return <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300">Guia+Código</Badge>;
      case 'guia_codigo_tuss':
        return <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300">Guia+TUSS</Badge>;
      case 'vinculacao':
        return <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300">De-Para</Badge>;
      case 'paciente_codigo':
        return <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300">Paciente+Código</Badge>;
      case 'agrupamento':
        return <Badge variant="outline" className="text-xs bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-300">Agrupado</Badge>;
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
    const guias = dadosGuiasConciliadas?.items || [];
    if (!guias.length) return;

    const dados = guias.map((g: any) => ({
      'Guia': g.guia || '-',
      'Paciente': g.pacienteNome || '-',
      'Convênio': g.convenio || String(g.convenioId || '-'),
      'Competência': formatarCompetencia(g.competencia),
      'Lote': g.loteXml || g.loteRetorno || '-',
      'Protocolo': g.protocoloXml || g.protocoloRetorno || '-',
      'Origem': g.origemSistema || '-',
      'Total Itens': Number(g.totalItens || 0),
      'Valor Faturado': Number(g.valorFaturado || 0),
      'Valor Recebido': Number(g.valorPago || 0),
      'Valor Glosado': Number(g.valorGlosa || 0),
      'Diferença': Number(g.diferenca || 0),
      'Status': g.statusGuia || '-',
      'Itens Conciliados': Number(g.itensConciliados || 0),
      'Itens Divergentes': Number(g.itensDivergentes || 0),
      'Itens Não Recebidos': Number(g.itensNaoRecebidos || 0),
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

    const wsGuias = XLSX.utils.json_to_sheet(dados);
    XLSX.utils.book_append_sheet(wb, wsGuias, 'Guias Conciliadas');

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

  const guiasConciliadasTodas = dadosGuiasConciliadas?.items || [];
  const guiasConciliadas = useMemo(() => {
    if (filtroPrestador === 'todos') return guiasConciliadasTodas;
    return guiasConciliadasTodas.filter((g: any) => {
      const terceiro = isTerceiro(g);
      return filtroPrestador === 'terceiro' ? terceiro : !terceiro;
    });
  }, [guiasConciliadasTodas, filtroPrestador, isTerceiro]);
  const guiasTerceiros = useMemo(() => guiasConciliadasTodas.filter((g: any) => isTerceiro(g)), [guiasConciliadasTodas, isTerceiro]);
  const guiasProprias = useMemo(() => guiasConciliadasTodas.filter((g: any) => !isTerceiro(g)), [guiasConciliadasTodas, isTerceiro]);
  const totalPaginasConciliados = Math.ceil((dadosGuiasConciliadas?.total || 0) / ITENS_POR_PAGINA);

  // Competências e convênios dependem da aba ativa
  const competenciasAtivas = abaAtiva === "conciliados" ? competenciasConciliados : competencias;
  const conveniosAtivos = abaAtiva === "conciliados" ? conveniosConciliados : convenios;

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
              disabled={conciliarAuto.isPending || conciliacaoEmAndamento}
            >
              {(conciliarAuto.isPending || conciliacaoEmAndamento) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              {conciliacaoEmAndamento && statusJob?.progresso 
                ? `Conciliando ${statusJob.progresso.competenciaAtual || ''} (${statusJob.progresso.competenciasProcessadas}/${statusJob.progresso.competenciasTotal}) - ${(statusJob.progresso.itensProcessados || 0).toLocaleString('pt-BR')} itens${statusJob.progresso.tempoDecorrido ? ` - ${Math.floor(statusJob.progresso.tempoDecorrido / 60)}min${statusJob.progresso.tempoDecorrido % 60}s` : ''}...`
                : conciliarAuto.isPending 
                  ? "Iniciando..." 
                  : "Conciliar Automaticamente"}
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
            <Button variant="outline" onClick={() => { refetch(); refetchGuiasConciliadas(); refetchResumo(); }}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <div>
                <Label className="font-semibold text-primary">Competência</Label>
                <Select value={competenciaFiltro} onValueChange={(v) => { setCompetenciaFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                  <SelectTrigger className="border-primary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {competenciasAtivas?.map((c: any) => (
                      <SelectItem key={c.competencia} value={c.competencia}>
                        {formatarCompetencia(c.competencia)} ({c.total} itens)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Convênio</Label>
                <Select value={convenioFiltro} onValueChange={(v) => { setConvenioFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {conveniosAtivos?.map((c: any) => (
                      <SelectItem key={String(c.convenioId || c.convenio)} value={String(c.convenioId || c.convenio)}>
                        {c.convenio || `Convênio ${c.convenioId}`} ({c.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status Conciliação</Label>
                <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="conciliado">Conciliado</SelectItem>
                    <SelectItem value="divergente">Divergente</SelectItem>
                    <SelectItem value="nao_recebido">Não Recebido</SelectItem>
                    <SelectItem value="glosado">Glosado</SelectItem>
                    <SelectItem value="terceiro">Terceiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lote XML (Enviado)</Label>
                <Popover open={loteXmlOpen} onOpenChange={setLoteXmlOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={loteXmlOpen} className="w-full justify-between font-normal h-9 bg-transparent">
                      {loteXmlFiltro === "todos" ? "Todos" : `Lote ${loteXmlFiltro}`}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar lote..." />
                      <CommandList>
                        <CommandEmpty>Nenhum lote encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="todos" onSelect={() => { setLoteXmlFiltro("todos"); setLoteXmlOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                            <Check className={cn("mr-2 h-4 w-4", loteXmlFiltro === "todos" ? "opacity-100" : "opacity-0")} />
                            Todos
                          </CommandItem>
                          {lotesXml?.map((l: any) => (
                            <CommandItem key={l.lote} value={`lote ${l.lote} ${l.total} itens`} onSelect={() => { setLoteXmlFiltro(l.lote); setLoteXmlOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                              <Check className={cn("mr-2 h-4 w-4", loteXmlFiltro === l.lote ? "opacity-100" : "opacity-0")} />
                              Lote {l.lote} ({l.total} itens)
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Lote Retorno (Convênio)</Label>
                <Popover open={loteRetornoOpen} onOpenChange={setLoteRetornoOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={loteRetornoOpen} className="w-full justify-between font-normal h-9 bg-transparent">
                      {loteRetornoFiltro === "todos" ? "Todos" : (() => { const found = lotesRetorno?.find((l: any) => l.lote === loteRetornoFiltro); return found?.protocolo ? `Lote ${loteRetornoFiltro} (Prot. ${found.protocolo})` : `Lote ${loteRetornoFiltro}`; })()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[320px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar lote ou protocolo..." />
                      <CommandList>
                        <CommandEmpty>Nenhum lote encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem value="todos" onSelect={() => { setLoteRetornoFiltro("todos"); setLoteRetornoOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                            <Check className={cn("mr-2 h-4 w-4", loteRetornoFiltro === "todos" ? "opacity-100" : "opacity-0")} />
                            Todos
                          </CommandItem>
                          {lotesRetorno?.map((l: any) => (
                            <CommandItem key={l.lote} value={`lote ${l.lote} protocolo ${l.protocolo || ''} ${l.total} itens`} onSelect={() => { setLoteRetornoFiltro(l.lote); setLoteRetornoOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                              <Check className={cn("mr-2 h-4 w-4", loteRetornoFiltro === l.lote ? "opacity-100" : "opacity-0")} />
                              Lote {l.lote} {l.protocolo ? `(Prot. ${l.protocolo})` : ''} ({l.total} itens)
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="lg:col-span-2 xl:col-span-1">
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Guia, conta, paciente..."
                    value={buscaInput}
                    onChange={(e) => { setBuscaInput(e.target.value); setPaginaAtual(0); setPaginaConciliados(0); }}
                    className="pl-9"
                  />
                </div>
              </div>
              {(abaAtiva === 'conciliados' || abaAtiva === 'xml_recurso') && (
                <div>
                  <Label>Prestador</Label>
                  <Select value={filtroPrestador} onValueChange={(v) => setFiltroPrestador(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="proprio">Próprio</SelectItem>
                      <SelectItem value="terceiro">Terceiros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Abas */}
        <Tabs value={abaAtiva} onValueChange={(v) => { setAbaAtiva(v); setGuiaConciliadaSelecionada(null); }}>
          <TabsList className="grid w-full grid-cols-3 max-w-xl">
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
            <TabsTrigger value="xml_recurso" className="flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              XML Retorno
              {guiasGlosadas && guiasGlosadas.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {guiasGlosadas.filter((g: any) => !Number(g.xmlGerado)).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ==================== ABA CONCILIADOS ==================== */}
          <TabsContent value="conciliados" className="space-y-4 mt-4">
            <AbaConciliados 
              guiaConciliadaSelecionada={guiaConciliadaSelecionada}
              setGuiaConciliadaSelecionada={setGuiaConciliadaSelecionada}
              itensConciliadosGuia={itensConciliadosGuia || []}
              isLoadingItensConciliados={isLoadingItensConciliados}
              modoGlosa={modoGlosa}
              setModoGlosa={setModoGlosa}
              setModalGlosaAberto={setModalGlosaAberto}
              itensSelecionadosGlosa={itensSelecionadosGlosa}
              setItensSelecionadosGlosa={setItensSelecionadosGlosa}
              reverterGlosaMut={reverterGlosaMut}
              resumoConciliados={resumoConciliados}
              dadosGuiasConciliadas={dadosGuiasConciliadas}
              guiasConciliadas={guiasConciliadas}
              isLoadingGuiasConciliadas={isLoadingGuiasConciliadas}
              exportarConciliadosExcel={exportarConciliadosExcel}
              paginaConciliados={paginaConciliados}
              setPaginaConciliados={setPaginaConciliados}
              totalPaginasConciliados={totalPaginasConciliados}
              estabelecimentoId={estabelecimentoId}
              formatarMoeda={formatarMoeda}
              formatarCompetencia={formatarCompetencia}
              formatDateBR={formatDateBR}
              getStatusBadge={getStatusBadge}
              getMetodoBadge={getMetodoBadge}
              isTerceiro={isTerceiro}
            />
          </TabsContent>

          {/* ==================== ABA FATURAMENTO UNIFICADO ==================== */}
          <TabsContent value="faturamento" className="space-y-4 mt-4">
            <AbaFaturamento 
              isLoading={isLoading}
              resumo={resumo}
              dadosGuias={dadosGuias}
              contas={contas}
              exportarFaturamentoExcel={exportarFaturamentoExcel}
              abrirDetalhes={abrirDetalhes}
              abrirVinculacao={abrirVinculacao}
              paginaAtual={paginaAtual}
              setPaginaAtual={setPaginaAtual}
              totalPaginas={totalPaginas}
              formatarMoeda={formatarMoeda}
              formatarCompetencia={formatarCompetencia}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          {/* ==================== ABA XML RECURSO ==================== */}
          <TabsContent value="xml_recurso" className="space-y-4 mt-4">
            <AbaXmlRecurso 
              guiasGlosadas={guiasGlosadas || []}
              isLoadingGuiasGlosadas={isLoadingGuiasGlosadas}
              xmlsGerados={xmlsGerados}
              isLoadingXmlsGerados={isLoadingXmlsGerados}
              filtroPrestador={filtroPrestador}
              guiasSelecionadasXml={guiasSelecionadasXml}
              setGuiasSelecionadasXml={setGuiasSelecionadasXml}
              setModalXmlAberto={setModalXmlAberto}
              formatarMoeda={formatarMoeda}
              formatarCompetencia={formatarCompetencia}
              formatDateTimeBR={formatDateTimeBR}
              isTerceiro={isTerceiro}
            />
          </TabsContent>
        </Tabs>

        {/* Modal de Geração de XML */}
        <Dialog open={modalXmlAberto} onOpenChange={setModalXmlAberto}>
          <DialogContent className="max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-purple-600" />
                Gerar XML de Recurso de Glosa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm font-medium">Guias selecionadas: <span className="text-purple-600">{guiasSelecionadasXml.size}</span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Array.from(guiasSelecionadasXml).slice(0, 10).join(', ')}
                  {guiasSelecionadasXml.size > 10 && ` e mais ${guiasSelecionadasXml.size - 10}...`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Registro ANS (opcional)</Label>
                  <Input
                    placeholder="Ex: 346659"
                    value={xmlRegistroANS}
                    onChange={(e) => setXmlRegistroANS(e.target.value)}
                  />
                </div>
                <div>
                  <Label>CNPJ Operadora (opcional)</Label>
                  <Input
                    placeholder="Ex: 01234567000100"
                    value={xmlCnpjOperadora}
                    onChange={(e) => setXmlCnpjOperadora(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Número Protocolo (opcional)</Label>
                  <Input
                    placeholder="Preenchido automaticamente"
                    value={xmlNumeroProtocolo}
                    onChange={(e) => setXmlNumeroProtocolo(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Data Protocolo (opcional)</Label>
                  <Input
                    type="date"
                    value={xmlDataProtocolo}
                    onChange={(e) => setXmlDataProtocolo(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                O XML será gerado no formato TISS (Demonstrativo de Análise de Conta) compatível com importação no TASY.
                Campos opcionais serão preenchidos automaticamente quando possível.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalXmlAberto(false)}>Cancelar</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  const guias = Array.from(guiasSelecionadasXml);
                  // Pegar o convenioId da primeira guia selecionada
                  const primeiraGuia = guiasGlosadas?.find((g: any) => String(g.numeroGuia) === guias[0]);
                  gerarXmlMut.mutate({
                    estabelecimentoId,
                    guias,
                    convenioId: primeiraGuia?.convenioId ? Number(primeiraGuia.convenioId) : undefined,
                    registroANS: xmlRegistroANS || undefined,
                    cnpjOperadora: xmlCnpjOperadora || undefined,
                    numeroProtocolo: xmlNumeroProtocolo || undefined,
                    dataProtocolo: xmlDataProtocolo || undefined,
                  });
                }}
                disabled={gerarXmlMut.isPending || guiasSelecionadasXml.size === 0}
              >
                {gerarXmlMut.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileCode className="w-4 h-4 mr-2" />
                )}
                {gerarXmlMut.isPending ? 'Gerando...' : `Gerar XML (${guiasSelecionadasXml.size} guia${guiasSelecionadasXml.size > 1 ? 's' : ''})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Detalhes da Guia (aba faturamento) */}
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
                          <td className="p-2 text-sm">{item.dataExecucao ? formatDateBR(item.dataExecucao) : '-'}</td>
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
                      <p className="text-xs text-muted-foreground">Glosados</p>
                      <p className="text-2xl font-bold text-red-600">{resultadoConciliacao.totalNaoRecebidos}</p>
                    </CardContent>
                  </Card>
                  {(resultadoConciliacao.totalTerceiros || 0) > 0 && (
                    <Card className="bg-orange-50 dark:bg-orange-950">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Terceiros</p>
                        <p className="text-2xl font-bold text-orange-600">{resultadoConciliacao.totalTerceiros}</p>
                      </CardContent>
                    </Card>
                  )}
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
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Carteira + Código:</span>
                        <span className="font-medium">{resultadoConciliacao.detalhes?.conciliadosPorCarteiraCodigo || 0}</span>
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

        {/* Modal de Glosa */}
        <Dialog open={modalGlosaAberto} onOpenChange={setModalGlosaAberto}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-purple-600" />
                Marcar como Glosa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {modoGlosa === 'todos' ? (
                    <>Todos os itens <strong>Não Recebidos</strong> desta guia serão marcados como <strong>Glosados</strong>. O valor da glosa será o valor faturado de cada item.</>
                  ) : (
                    <><strong>{itensSelecionadosGlosa.size}</strong> item(ns) selecionado(s) serão marcados como <strong>Glosados</strong>. O valor da glosa será o valor faturado de cada item.</>
                  )}
                </p>
              </div>
              <div>
                <Label>Código da Glosa (opcional)</Label>
                <Input
                  placeholder="Ex: 1001, A001, etc."
                  value={codigoGlosa}
                  onChange={(e) => setCodigoGlosa(e.target.value)}
                />
              </div>
              <div>
                <Label>Motivo da Glosa (opcional)</Label>
                <Textarea
                  placeholder="Descreva o motivo da glosa..."
                  value={motivoGlosa}
                  onChange={(e) => setMotivoGlosa(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalGlosaAberto(false)}>Cancelar</Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => {
                  if (modoGlosa === 'todos') {
                    glosarTodosMut.mutate({
                      estabelecimentoId,
                      numeroGuia: guiaConciliadaSelecionada?.numeroGuia || undefined,
                      contaNumero: guiaConciliadaSelecionada?.contaNumero || undefined,
                      codigoGlosa: codigoGlosa || undefined,
                      motivoGlosa: motivoGlosa || 'Item não recebido no demonstrativo',
                    });
                  } else {
                    const ids = Array.from(itensSelecionadosGlosa);
                    glosarItensMut.mutate({
                      ids,
                      estabelecimentoId,
                      codigoGlosa: codigoGlosa || undefined,
                      motivoGlosa: motivoGlosa || 'Item não recebido no demonstrativo',
                    });
                  }
                }}
                disabled={glosarItensMut.isPending || glosarTodosMut.isPending}
              >
                {(glosarItensMut.isPending || glosarTodosMut.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4 mr-2" />
                )}
                Confirmar Glosa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
