import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  History, 
  Eye, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowLeft,
  FileText,
  Loader2,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  List
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function HistoricoConciliacaoTasy() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const [, navigate] = useLocation();
  const [anoFiltro, setAnoFiltro] = useState<string>("");
  const [mesFiltro, setMesFiltro] = useState<string>("");
  
  // Estado para visualização de detalhes
  const [conciliacaoSelecionada, setConciliacaoSelecionada] = useState<number | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<string>("");
  const [buscaFiltro, setBuscaFiltro] = useState<string>("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 20;

  // Buscar histórico de conciliações
  const { data: historico, isLoading, refetch } = trpc.historicoConciliacao.listar.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      mesReferencia: mesFiltro && mesFiltro !== 'all' ? parseInt(mesFiltro) : undefined,
      anoReferencia: anoFiltro && anoFiltro !== 'all' ? parseInt(anoFiltro) : undefined,
      limite: 50,
    },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar detalhes da conciliação selecionada
  const { data: detalhes, isLoading: isLoadingDetalhes } = trpc.historicoConciliacao.detalhes.useQuery(
    {
      resultadoId: conciliacaoSelecionada || 0,
      statusConciliacao: statusFiltro && statusFiltro !== 'all' ? statusFiltro : undefined,
      busca: buscaFiltro || undefined,
      limite: itensPorPagina,
      offset: (paginaAtual - 1) * itensPorPagina,
    },
    { enabled: !!conciliacaoSelecionada && modalAberto }
  );

  // Mutation para excluir conciliação
  const excluirMutation = trpc.historicoConciliacao.excluir.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Conciliação excluída com sucesso!');
        refetch();
      } else {
        toast.error('Erro ao excluir conciliação');
      }
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  // Buscar evolução das conciliações
  const { data: evolucao } = trpc.historicoConciliacao.evolucao.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      meses: 6,
    },
    { enabled: !!estabelecimentoAtual }
  );

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const formatDateSimple = (date: Date | string | null | undefined) => {
    if (!date) return '-';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const getMesNome = (mes: number | null | undefined) => {
    if (!mes) return 'Todos';
    const meses = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return meses[mes] || 'Todos';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">OK</Badge>;
      case 'glosa':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Glosa</Badge>;
      case 'divergente':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Divergente</Badge>;
      case 'nao_encontrado':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Não Encontrado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const abrirDetalhes = (id: number) => {
    setConciliacaoSelecionada(id);
    setModalAberto(true);
    setPaginaAtual(1);
    setStatusFiltro("");
    setBuscaFiltro("");
  };

  const fecharDetalhes = () => {
    setModalAberto(false);
    setConciliacaoSelecionada(null);
  };

  const totalPaginas = detalhes ? Math.ceil(detalhes.total / itensPorPagina) : 0;

  const anosDisponiveis = [2024, 2025, 2026];
  const mesesDisponiveis = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/conciliacao-tasy')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Histórico de Conciliações</h1>
              <p className="text-muted-foreground">
                Visualize e gerencie as conciliações salvas
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Mês de Referência</label>
                <Select value={mesFiltro} onValueChange={setMesFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os meses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {mesesDisponiveis.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ano de Referência</label>
                <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os anos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {anosDisponiveis.map((a) => (
                      <SelectItem key={a} value={String(a)}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo da Evolução */}
        {evolucao && evolucao.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Evolução das Conciliações
              </CardTitle>
              <CardDescription>
                Resumo dos últimos meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {evolucao.map((item, index) => (
                  <div key={index} className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {getMesNome(item.mesReferencia)}/{item.anoReferencia}
                    </p>
                    <p className="text-lg font-bold">{item.totalContas || 0}</p>
                    <p className="text-xs text-muted-foreground">contas</p>
                    <p className="text-sm text-green-600">
                      {formatCurrency(item.valorTotalPago)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Conciliações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Conciliações Salvas
            </CardTitle>
            <CardDescription>
              {historico?.length || 0} conciliações encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !historico || historico.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conciliação salva ainda.</p>
                <p className="text-sm">Acesse a tela de Conciliação Tasy para criar uma nova.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data da Conciliação</TableHead>
                    <TableHead>Período de Referência</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead className="text-right">Total Contas</TableHead>
                    <TableHead className="text-right">OK</TableHead>
                    <TableHead className="text-right">Glosas</TableHead>
                    <TableHead className="text-right">Valor Tasy</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead className="text-right">Glosa %</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item.createdAt)}</TableCell>
                      <TableCell>
                        {item.mesReferencia && item.anoReferencia 
                          ? `${getMesNome(item.mesReferencia)}/${item.anoReferencia}`
                          : 'Todos'
                        }
                      </TableCell>
                      <TableCell>{item.convenioNome || 'Todos os convênios'}</TableCell>
                      <TableCell className="text-right">{item.totalContas}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          {item.contasOk}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="bg-red-50 text-red-700">
                          {item.contasComGlosa}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorTotalTasy)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorTotalPago)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={parseFloat(String(item.percentualGlosa || 0)) > 5 ? "destructive" : "secondary"}>
                          {parseFloat(String(item.percentualGlosa || 0)).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => abrirDetalhes(item.id)}
                            title="Ver contas conciliadas"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" title="Excluir">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Conciliação</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta conciliação? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => excluirMutation.mutate({ resultadoId: item.id })}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes das Contas Conciliadas */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Contas Conciliadas
              </DialogTitle>
              <DialogDescription>
                {detalhes?.resultado && (
                  <>
                    Conciliação de {formatDate(detalhes.resultado.createdAt)} - 
                    {detalhes.resultado.mesReferencia && detalhes.resultado.anoReferencia 
                      ? ` ${getMesNome(detalhes.resultado.mesReferencia)}/${detalhes.resultado.anoReferencia}`
                      : ' Todos os períodos'
                    }
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Resumo */}
            {detalhes?.resultado && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-2">
                <div className="p-2 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">{detalhes.resultado.totalContas}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-green-700">OK</p>
                  <p className="text-lg font-bold text-green-700">{detalhes.resultado.contasOk}</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg text-center">
                  <p className="text-xs text-red-700">Glosa</p>
                  <p className="text-lg font-bold text-red-700">{detalhes.resultado.contasComGlosa}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded-lg text-center">
                  <p className="text-xs text-yellow-700">Divergente</p>
                  <p className="text-lg font-bold text-yellow-700">{detalhes.resultado.contasDivergentes}</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-700">Não Encontrado</p>
                  <p className="text-lg font-bold text-gray-700">{detalhes.resultado.contasNaoEncontradas}</p>
                </div>
              </div>
            )}

            {/* Filtros do Modal */}
            <div className="flex flex-wrap gap-3 py-2 border-t border-b">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por guia, paciente ou conta..."
                    value={buscaFiltro}
                    onChange={(e) => {
                      setBuscaFiltro(e.target.value);
                      setPaginaAtual(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="w-[180px]">
                <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPaginaAtual(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="glosa">Glosa</SelectItem>
                    <SelectItem value="divergente">Divergente</SelectItem>
                    <SelectItem value="nao_encontrado">Não Encontrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabela de Contas */}
            <div className="flex-1 overflow-auto">
              {isLoadingDetalhes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : !detalhes?.itens || detalhes.itens.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma conta encontrada com os filtros aplicados.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Conta</TableHead>
                      <TableHead>Guia</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor Tasy</TableHead>
                      <TableHead className="text-right">Valor Pago</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalhes.itens.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nrInternoConta}</TableCell>
                        <TableCell>{item.guia}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.paciente}>
                          {item.paciente}
                        </TableCell>
                        <TableCell>{formatDateSimple(item.dataInternacao)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.valorTasy)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(item.valorPago)}</TableCell>
                        <TableCell className="text-right">
                          <span className={parseFloat(item.valorDiferenca) > 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(item.valorDiferenca)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(item.statusConciliacao)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Paginação */}
            {detalhes && detalhes.total > itensPorPagina && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, detalhes.total)} de {detalhes.total} contas
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual === totalPaginas}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
