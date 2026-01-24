import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  Building2,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";
import { GLOSAS_TISS, traduzirMotivoGlosa } from "../../../shared/glossaryGlosas";

export default function ConciliacaoContasPagas() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 0;

  // Filtros
  const [mesAnoFiltro, setMesAnoFiltro] = useState(""); // Filtro principal por mês/ano
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [convenioFiltro, setConvenioFiltro] = useState("todos");
  const [guiaFiltro, setGuiaFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [busca, setBusca] = useState("");

  // Modal de detalhes
  const [contaSelecionada, setContaSelecionada] = useState<any>(null);
  const [modalAberto, setModalAberto] = useState(false);

  // Ordenação
  const [ordenacao, setOrdenacao] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({ campo: 'valorFaturado', direcao: 'desc' });

  // Query de meses disponíveis
  const { data: mesesDisponiveis } = trpc.importacaoTasy.mesesDisponiveis.useQuery(
    { estabelecimentoId },
    { enabled: estabelecimentoId > 0 }
  );

  // Query de conciliação
  const { data: conciliacao, isLoading, refetch } = trpc.importacaoTasy.conciliacaoCompleta.useQuery(
    {
      estabelecimentoId,
      mesAno: mesAnoFiltro || undefined,
      dataInicio: !mesAnoFiltro && dataInicio ? dataInicio : undefined,
      dataFim: !mesAnoFiltro && dataFim ? dataFim : undefined,
      convenio: convenioFiltro !== "todos" ? convenioFiltro : undefined,
      guia: guiaFiltro || undefined,
    },
    { enabled: estabelecimentoId > 0 }
  );

  // Query de convênios
  const { data: convenios } = trpc.importacaoTasy.conveniosContasPagas.useQuery(
    { estabelecimentoId },
    { enabled: estabelecimentoId > 0 }
  );

  // Filtrar e ordenar contas
  const contasFiltradas = useMemo(() => {
    if (!conciliacao?.contas) return [];

    let resultado = [...conciliacao.contas];

    // Filtro por status
    if (statusFiltro !== "todos") {
      resultado = resultado.filter(c => c.status === statusFiltro);
    }

    // Filtro por busca
    if (busca) {
      const termoBusca = busca.toLowerCase();
      resultado = resultado.filter(c =>
        c.paciente?.toLowerCase().includes(termoBusca) ||
        c.guia?.toLowerCase().includes(termoBusca) ||
        c.nrConta?.toLowerCase().includes(termoBusca) ||
        c.convenio?.toLowerCase().includes(termoBusca)
      );
    }

    // Ordenação
    resultado.sort((a, b) => {
      let valorA: any, valorB: any;
      
      switch (ordenacao.campo) {
        case 'valorFaturado':
          valorA = a.valorFaturado;
          valorB = b.valorFaturado;
          break;
        case 'valorPago':
          valorA = a.valorPago;
          valorB = b.valorPago;
          break;
        case 'valorGlosado':
          valorA = a.valorGlosado;
          valorB = b.valorGlosado;
          break;
        case 'paciente':
          valorA = a.paciente || '';
          valorB = b.paciente || '';
          break;
        case 'dataConta':
          valorA = a.dataConta ? new Date(a.dataConta).getTime() : 0;
          valorB = b.dataConta ? new Date(b.dataConta).getTime() : 0;
          break;
        default:
          valorA = a.valorFaturado;
          valorB = b.valorFaturado;
      }

      if (ordenacao.direcao === 'asc') {
        return valorA > valorB ? 1 : -1;
      }
      return valorA < valorB ? 1 : -1;
    });

    return resultado;
  }, [conciliacao?.contas, statusFiltro, busca, ordenacao]);

  // Funções auxiliares
  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const formatarData = (data: Date | string | null) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Pago</Badge>;
      case 'parcial':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Parcial</Badge>;
      case 'glosado':
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="w-3 h-3 mr-1" /> Glosado</Badge>;
      case 'pendente':
        return <Badge className="bg-gray-500 hover:bg-gray-600"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const alternarOrdenacao = (campo: string) => {
    if (ordenacao.campo === campo) {
      setOrdenacao({ campo, direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc' });
    } else {
      setOrdenacao({ campo, direcao: 'desc' });
    }
  };

  const abrirDetalhes = (conta: any) => {
    setContaSelecionada(conta);
    setModalAberto(true);
  };

  // Exportar para Excel
  const exportarExcel = () => {
    if (!contasFiltradas.length) return;

    // Dados das contas
    const dadosContas = contasFiltradas.map(c => ({
      'Conta': c.nrConta || '-',
      'Guia': c.guia || '-',
      'Convênio': c.convenio || '-',
      'Paciente': c.paciente || '-',
      'Data': formatarData(c.dataConta),
      'Valor Faturado': c.valorFaturado,
      'Valor Pago': c.valorPago,
      'Valor Glosado': c.valorGlosado,
      'Status': c.status
    }));

    // Dados dos itens
    const dadosItens: any[] = [];
    contasFiltradas.forEach(c => {
      c.itens?.forEach((item: any) => {
        dadosItens.push({
          'Conta': c.nrConta || '-',
          'Guia': c.guia || '-',
          'Paciente': c.paciente || '-',
          'Código': item.codigo || '-',
          'Descrição': item.descricao || '-',
          'Tipo': item.tipo || '-',
          'Quantidade': item.quantidade,
          'Valor Faturado': item.valorFaturado,
          'Valor Pago': item.valorPago,
          'Valor Glosado': item.valorGlosado,
          'Motivo Glosa': item.motivoGlosa || '-'
        });
      });
    });

    const wb = XLSX.utils.book_new();
    
    // Aba de resumo
    const wsResumo = XLSX.utils.json_to_sheet([{
      'Total Contas': conciliacao?.resumo.totalContas || 0,
      'Total Faturado': conciliacao?.resumo.totalFaturado || 0,
      'Total Pago': conciliacao?.resumo.totalPago || 0,
      'Total Glosado': conciliacao?.resumo.totalGlosado || 0,
      'Total Pendente': conciliacao?.resumo.totalPendente || 0,
      'Contas Pagas': conciliacao?.resumo.contasPagas || 0,
      'Contas Parciais': conciliacao?.resumo.contasParciais || 0,
      'Contas Glosadas': conciliacao?.resumo.contasGlosadas || 0,
      'Contas Pendentes': conciliacao?.resumo.contasPendentes || 0
    }]);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Aba de contas
    const wsContas = XLSX.utils.json_to_sheet(dadosContas);
    XLSX.utils.book_append_sheet(wb, wsContas, 'Contas');

    // Aba de itens
    if (dadosItens.length > 0) {
      const wsItens = XLSX.utils.json_to_sheet(dadosItens);
      XLSX.utils.book_append_sheet(wb, wsItens, 'Itens');
    }

    XLSX.writeFile(wb, `conciliacao_contas_pagas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (!estabelecimentoId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Selecione um estabelecimento para visualizar a conciliação.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" />
              Conciliação Contas Pagas
            </h1>
            <p className="text-muted-foreground">Cruzamento de dados faturados x pagos x glosados do Tasy</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={exportarExcel} disabled={!contasFiltradas.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Cards de Resumo */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : conciliacao?.resumo && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Total Faturado</p>
                    <p className="text-2xl font-bold">{formatarMoeda(conciliacao.resumo.totalFaturado)}</p>
                    <p className="text-xs opacity-70">{conciliacao.resumo.totalContas} contas</p>
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
                    <p className="text-2xl font-bold">{formatarMoeda(conciliacao.resumo.totalPago)}</p>
                    <p className="text-xs opacity-70">
                      {conciliacao.resumo.totalFaturado > 0 
                        ? ((conciliacao.resumo.totalPago / conciliacao.resumo.totalFaturado) * 100).toFixed(1) 
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
                    <p className="text-2xl font-bold">{formatarMoeda(conciliacao.resumo.totalGlosado)}</p>
                    <p className="text-xs opacity-70">
                      {conciliacao.resumo.totalFaturado > 0 
                        ? ((conciliacao.resumo.totalGlosado / conciliacao.resumo.totalFaturado) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                  <TrendingDown className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Total Pendente</p>
                    <p className="text-2xl font-bold">{formatarMoeda(conciliacao.resumo.totalPendente)}</p>
                    <p className="text-xs opacity-70">
                      {conciliacao.resumo.totalFaturado > 0 
                        ? ((conciliacao.resumo.totalPendente / conciliacao.resumo.totalFaturado) * 100).toFixed(1) 
                        : 0}%
                    </p>
                  </div>
                  <Clock className="w-10 h-10 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-80">Status das Contas</p>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="bg-white/20 px-2 py-0.5 rounded">{conciliacao.resumo.contasPagas} Pagas</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">{conciliacao.resumo.contasParciais} Parciais</span>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs">
                      <span className="bg-white/20 px-2 py-0.5 rounded">{conciliacao.resumo.contasGlosadas} Glosadas</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded">{conciliacao.resumo.contasPendentes} Pendentes</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
              <div className="lg:col-span-2">
                <Label className="font-semibold text-primary">Mês/Ano Faturado</Label>
                <Select value={mesAnoFiltro} onValueChange={(v) => {
                  setMesAnoFiltro(v);
                  if (v) {
                    setDataInicio("");
                    setDataFim("");
                  }
                }}>
                  <SelectTrigger className="border-primary">
                    <SelectValue placeholder="Selecione o mês/ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {mesesDisponiveis?.map((m) => (
                      <SelectItem key={m.mesAno} value={m.mesAno}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-muted-foreground">Data Início {mesAnoFiltro && mesAnoFiltro !== "todos" && "(desativado)"}</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  disabled={!!mesAnoFiltro && mesAnoFiltro !== "todos"}
                  className={mesAnoFiltro && mesAnoFiltro !== "todos" ? "opacity-50" : ""}
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Data Fim {mesAnoFiltro && mesAnoFiltro !== "todos" && "(desativado)"}</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  disabled={!!mesAnoFiltro && mesAnoFiltro !== "todos"}
                  className={mesAnoFiltro && mesAnoFiltro !== "todos" ? "opacity-50" : ""}
                />
              </div>
              <div>
                <Label>Convênio</Label>
                <Select value={convenioFiltro} onValueChange={setConvenioFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {convenios?.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="glosado">Glosado</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Guia</Label>
                <Input
                  placeholder="Número da guia"
                  value={guiaFiltro}
                  onChange={(e) => setGuiaFiltro(e.target.value)}
                />
              </div>
              <div>
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Paciente, guia, conta..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Contas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Contas ({contasFiltradas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : contasFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta encontrada com os filtros selecionados.</p>
                <p className="text-sm">Importe dados de contas pagas do Tasy para visualizar a conciliação.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Conta/Guia</th>
                      <th className="text-left p-3 font-medium">Convênio</th>
                      <th 
                        className="text-left p-3 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => alternarOrdenacao('paciente')}
                      >
                        <div className="flex items-center gap-1">
                          Paciente
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </th>
                      <th 
                        className="text-left p-3 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => alternarOrdenacao('dataConta')}
                      >
                        <div className="flex items-center gap-1">
                          Data
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </th>
                      <th 
                        className="text-right p-3 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => alternarOrdenacao('valorFaturado')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Faturado
                          {ordenacao.campo === 'valorFaturado' && (
                            ordenacao.direcao === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right p-3 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => alternarOrdenacao('valorPago')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Pago
                          {ordenacao.campo === 'valorPago' && (
                            ordenacao.direcao === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-right p-3 font-medium cursor-pointer hover:bg-muted/50"
                        onClick={() => alternarOrdenacao('valorGlosado')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Glosado
                          {ordenacao.campo === 'valorGlosado' && (
                            ordenacao.direcao === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contasFiltradas.slice(0, 100).map((conta, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="font-medium">{conta.nrConta || '-'}</div>
                          <div className="text-xs text-muted-foreground">{conta.guia || '-'}</div>
                        </td>
                        <td className="p-3 text-sm">{conta.convenio || '-'}</td>
                        <td className="p-3 text-sm max-w-[200px] truncate">{conta.paciente || '-'}</td>
                        <td className="p-3 text-sm">{formatarData(conta.dataConta)}</td>
                        <td className="p-3 text-right font-medium text-blue-600">{formatarMoeda(conta.valorFaturado)}</td>
                        <td className="p-3 text-right font-medium text-green-600">{formatarMoeda(conta.valorPago)}</td>
                        <td className="p-3 text-right font-medium text-red-600">{formatarMoeda(conta.valorGlosado)}</td>
                        <td className="p-3 text-center">{getStatusBadge(conta.status)}</td>
                        <td className="p-3 text-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => abrirDetalhes(conta)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {contasFiltradas.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Exibindo 100 de {contasFiltradas.length} contas. Use os filtros para refinar a busca.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detalhes da Conta
              </DialogTitle>
            </DialogHeader>

            {contaSelecionada && (
              <div className="space-y-6">
                {/* Resumo da Conta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Conta</p>
                      <p className="font-bold">{contaSelecionada.nrConta || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Guia</p>
                      <p className="font-bold">{contaSelecionada.guia || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Convênio</p>
                      <p className="font-bold">{contaSelecionada.convenio || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="mt-1">{getStatusBadge(contaSelecionada.status)}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Paciente e Data */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Paciente</p>
                      <p className="font-bold text-lg">{contaSelecionada.paciente || '-'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Data da Conta</p>
                      <p className="font-bold text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {formatarData(contaSelecionada.dataConta)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Valores */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-blue-50 dark:bg-blue-950">
                    <CardContent className="p-4">
                      <p className="text-sm text-blue-600 dark:text-blue-400">Valor Faturado</p>
                      <p className="font-bold text-2xl text-blue-700 dark:text-blue-300">
                        {formatarMoeda(contaSelecionada.valorFaturado)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-950">
                    <CardContent className="p-4">
                      <p className="text-sm text-green-600 dark:text-green-400">Valor Pago</p>
                      <p className="font-bold text-2xl text-green-700 dark:text-green-300">
                        {formatarMoeda(contaSelecionada.valorPago)}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {contaSelecionada.valorFaturado > 0 
                          ? ((contaSelecionada.valorPago / contaSelecionada.valorFaturado) * 100).toFixed(1) 
                          : 0}% do faturado
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-red-50 dark:bg-red-950">
                    <CardContent className="p-4">
                      <p className="text-sm text-red-600 dark:text-red-400">Valor Glosado</p>
                      <p className="font-bold text-2xl text-red-700 dark:text-red-300">
                        {formatarMoeda(contaSelecionada.valorGlosado)}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {contaSelecionada.valorFaturado > 0 
                          ? ((contaSelecionada.valorGlosado / contaSelecionada.valorFaturado) * 100).toFixed(1) 
                          : 0}% do faturado
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela de Itens */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Itens da Conta ({contaSelecionada.itens?.length || 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto max-h-[400px]">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-background">
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium">Código</th>
                            <th className="text-left p-2 font-medium min-w-[300px]">Descrição</th>
                            <th className="text-center p-2 font-medium">Tipo</th>
                            <th className="text-center p-2 font-medium">Qtd</th>
                            <th className="text-right p-2 font-medium">Faturado</th>
                            <th className="text-right p-2 font-medium">Pago</th>
                            <th className="text-right p-2 font-medium">Glosado</th>
                            <th className="text-left p-2 font-medium min-w-[150px]">Cód. Glosa</th>
                            <th className="text-left p-2 font-medium min-w-[300px]">Descrição da Glosa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contaSelecionada.itens?.map((item: any, index: number) => (
                            <tr key={index} className={`border-b ${item.valorGlosado > 0 ? 'bg-red-50 dark:bg-red-950/30' : ''}`}>
                              <td className="p-2 font-mono text-sm">{item.codigo || '-'}</td>
                              <td className="p-2 text-sm">{item.descricao || '-'}</td>
                              <td className="p-2 text-center">
                                <Badge variant="outline" className="text-xs">
                                  {item.tipo}
                                </Badge>
                              </td>
                              <td className="p-2 text-center">{item.quantidade}</td>
                              <td className="p-2 text-right text-blue-600">{formatarMoeda(item.valorFaturado)}</td>
                              <td className="p-2 text-right text-green-600">{formatarMoeda(item.valorPago)}</td>
                              <td className="p-2 text-right text-red-600">{formatarMoeda(item.valorGlosado)}</td>
                              <td className="p-2 text-sm text-red-600 font-mono">{item.motivoGlosa || '-'}</td>
                              <td className="p-2 text-sm text-red-600">
                                {item.motivoGlosa ? (
                                  <div className="space-y-1">
                                    {(() => {
                                      const descricao = traduzirMotivoGlosa(item.motivoGlosa);
                                      // Extrair código para buscar info completa
                                      const codigoMatch = item.motivoGlosa.match(/\b(\d{4})\b/);
                                      const glosaInfo = codigoMatch ? GLOSAS_TISS[codigoMatch[1]] : null;
                                      return (
                                        <>
                                          <p className="font-medium">{descricao !== item.motivoGlosa ? descricao : 'Código não encontrado no dicionário'}</p>
                                          {glosaInfo && (
                                            <div className="text-xs space-y-1 mt-1">
                                              <p className="text-muted-foreground"><span className="font-medium">Grupo:</span> {glosaInfo.grupo}</p>
                                              {glosaInfo.probabilidadeSucesso && (
                                                <p className="text-muted-foreground">
                                                  <span className="font-medium">Chance de reverter:</span>{' '}
                                                  <span className={glosaInfo.probabilidadeSucesso >= 60 ? 'text-green-600' : glosaInfo.probabilidadeSucesso >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                                                    {glosaInfo.probabilidadeSucesso}%
                                                  </span>
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
