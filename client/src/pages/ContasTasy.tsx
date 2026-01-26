import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  FileSearch, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  DollarSign,
  FileText,
  Hash,
  Stethoscope,
  Package,
  Eye,
  X,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";

// Interface para conta unificada do Tasy
interface ContaTasyUnificada {
  id: number;
  estabelecimentoId: number;
  importacaoId: number;
  nrInternoConta: string;
  guia: string | null;
  atendimento: string | null;
  dataFaturado: Date | string | null;
  convenio: string | null;
  paciente: string | null;
  dataConta: Date | string | null;
  setor: string | null;
  protocolo: string | null;
  statusProtocolo: string | null;
  totalProcedimentos: number;
  valorTotalProcedimentos: string | null;
  totalMatMed: number;
  valorTotalMatMed: string | null;
  valorTotalConta: string | null;
  statusConta: 'pendente' | 'conciliado' | 'divergente' | 'pago' | null;
  createdAt: Date | string;
}

// Interface para item da conta
interface ItemContaTasy {
  id: number;
  contaTasyId: number;
  tipoItem: 'procedimento' | 'material' | 'medicamento';
  itemOriginalId: number;
  codigo: string | null;
  descricao: string | null;
  quantidade: string | null;
  valorUnitario: string | null;
  valorTotal: string | null;
  medico: string | null;
  crm: string | null;
  statusPagamento: 'pendente' | 'pago' | 'glosado' | 'parcial' | null;
  valorPago: string | null;
  valorGlosado: string | null;
  motivoGlosa: string | null;
  codigoGlosa: string | null;
}

export default function ContasTasy() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioFiltro, setConvenioFiltro] = useState<string>("");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtro por mês/ano
  const currentDate = new Date();
  // Iniciar sem filtro de data para mostrar todos os dados
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null);
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);
  
  // Calcular data início e fim baseado no mês/ano selecionado
  const dataInicio = useMemo(() => {
    if (!mesSelecionado || !anoSelecionado) return undefined;
    return `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`;
  }, [mesSelecionado, anoSelecionado]);
  
  const dataFim = useMemo(() => {
    if (!mesSelecionado || !anoSelecionado) return undefined;
    const ultimoDia = new Date(anoSelecionado, mesSelecionado, 0).getDate();
    return `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${ultimoDia}`;
  }, [mesSelecionado, anoSelecionado]);
  
  // Lista de meses
  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];
  
  // Lista de anos (últimos 5 anos)
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => anoAtual - i);
  }, []);
  
  const [page, setPage] = useState(1);
  const pageSize = 50;
  
  // Estado para o modal de detalhes
  const [contaSelecionada, setContaSelecionada] = useState<ContaTasyUnificada | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [, setLocation] = useLocation();

  // Buscar contas unificadas do Tasy
  const { data: contasUnificadas, isLoading, refetch } = trpc.importacaoTasy.contasUnificadas.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      convenio: convenioFiltro || undefined,
      status: statusFiltro !== 'all' ? statusFiltro : undefined,
      limite: 10000,
    },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar itens da conta selecionada
  const { data: itensContaSelecionada } = trpc.importacaoTasy.itensContaUnificada.useQuery(
    { contaTasyId: contaSelecionada?.id || 0 },
    { enabled: !!contaSelecionada }
  );

  // Buscar estatísticas
  const { data: estatisticas } = trpc.importacaoTasy.estatisticas.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0 },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar dados por convênio
  const { data: dadosPorConvenio } = trpc.importacaoTasy.porConvenio.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0 },
    { enabled: !!estabelecimentoAtual }
  );

  // Filtrar por busca
  const contasFiltradas = useMemo(() => {
    if (!contasUnificadas) return [];
    if (!searchTerm) return contasUnificadas;
    
    const termo = searchTerm.toLowerCase();
    return contasUnificadas.filter((c: ContaTasyUnificada) => 
      c.nrInternoConta?.toLowerCase().includes(termo) ||
      c.guia?.toLowerCase().includes(termo) ||
      c.paciente?.toLowerCase().includes(termo) ||
      c.convenio?.toLowerCase().includes(termo) ||
      c.atendimento?.toLowerCase().includes(termo)
    );
  }, [contasUnificadas, searchTerm]);

  // Paginação
  const totalContas = contasFiltradas.length;
  const totalPages = Math.ceil(totalContas / pageSize);
  const contasPaginadas = contasFiltradas.slice((page - 1) * pageSize, page * pageSize);

  // Totais
  const valorTotalGeral = contasFiltradas.reduce((acc: number, c: ContaTasyUnificada) => 
    acc + parseFloat(c.valorTotalConta || '0'), 0);
  const totalProcedimentos = contasFiltradas.reduce((acc: number, c: ContaTasyUnificada) => 
    acc + (c.totalProcedimentos || 0), 0);
  const totalMatMed = contasFiltradas.reduce((acc: number, c: ContaTasyUnificada) => 
    acc + (c.totalMatMed || 0), 0);
  const totalItens = totalProcedimentos + totalMatMed;

  // Função para formatar moeda
  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num || 0);
  };

  // Função para formatar data
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR");
  };

  // Função para abrir modal de detalhes
  const abrirDetalhes = (conta: ContaTasyUnificada) => {
    setContaSelecionada(conta);
    setModalAberto(true);
  };

  // Função para fechar modal
  const fecharModal = () => {
    setModalAberto(false);
    setContaSelecionada(null);
  };

  // Função para obter badge de status
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pago':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Pago</Badge>;
      case 'conciliado':
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Conciliado</Badge>;
      case 'divergente':
        return <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" />Divergente</Badge>;
      case 'pendente':
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  // Exportar para Excel
  const handleExportExcel = () => {
    if (!contasFiltradas?.length) return;

    const excelData = contasFiltradas.map((conta: ContaTasyUnificada) => ({
      "Nr Interno Conta": conta.nrInternoConta,
      "Guia": conta.guia || '-',
      "Atendimento": conta.atendimento || '-',
      "Convênio": conta.convenio || '-',
      "Paciente": conta.paciente || '-',
      "Data Faturado": formatDate(conta.dataFaturado),
      "Setor": conta.setor || '-',
      "Protocolo": conta.protocolo || '-',
      "Status Protocolo": conta.statusProtocolo || '-',
      "Total Procedimentos": conta.totalProcedimentos,
      "Valor Procedimentos": parseFloat(conta.valorTotalProcedimentos || '0'),
      "Total Mat/Med": conta.totalMatMed,
      "Valor Mat/Med": parseFloat(conta.valorTotalMatMed || '0'),
      "Valor Total": parseFloat(conta.valorTotalConta || '0'),
      "Status": conta.statusConta || 'pendente',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = [
      { wch: 15 },  // Nr Interno Conta
      { wch: 15 },  // Guia
      { wch: 15 },  // Atendimento
      { wch: 25 },  // Convênio
      { wch: 30 },  // Paciente
      { wch: 12 },  // Data Faturado
      { wch: 20 },  // Setor
      { wch: 15 },  // Protocolo
      { wch: 15 },  // Status Protocolo
      { wch: 15 },  // Total Procedimentos
      { wch: 15 },  // Valor Procedimentos
      { wch: 15 },  // Total Mat/Med
      { wch: 15 },  // Valor Mat/Med
      { wch: 15 },  // Valor Total
      { wch: 12 },  // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Contas Tasy");
    XLSX.writeFile(wb, `contas_tasy_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Exportar itens da conta selecionada
  const handleExportContaExcel = () => {
    if (!itensContaSelecionada?.length || !contaSelecionada) return;

    const excelData = itensContaSelecionada.map((item: ItemContaTasy) => ({
      "Código": item.codigo || '-',
      "Descrição": item.descricao || '-',
      "Tipo": item.tipoItem,
      "Quantidade": item.quantidade || 1,
      "Valor Unitário": parseFloat(item.valorUnitario || '0'),
      "Valor Total": parseFloat(item.valorTotal || '0'),
      "Médico": item.medico || '-',
      "CRM": item.crm || '-',
      "Status Pagamento": item.statusPagamento || 'pendente',
      "Valor Pago": parseFloat(item.valorPago || '0'),
      "Valor Glosado": parseFloat(item.valorGlosado || '0'),
      "Motivo Glosa": item.motivoGlosa || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    XLSX.utils.book_append_sheet(wb, ws, "Itens da Conta");
    XLSX.writeFile(wb, `conta_${contaSelecionada.nrInternoConta}_itens.xlsx`);
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas Tasy</h1>
            <p className="text-muted-foreground">
              Visualize as contas unificadas do Tasy (procedimentos + materiais/medicamentos)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportExcel} disabled={!contasFiltradas?.length}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Mês */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <Select value={mesSelecionado?.toString() || ''} onValueChange={(v) => { setMesSelecionado(v ? parseInt(v) : null); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value.toString()}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={anoSelecionado?.toString() || ''} onValueChange={(v) => { setAnoSelecionado(v ? parseInt(v) : null); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Convênio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioFiltro || "all"} onValueChange={(v) => { setConvenioFiltro(v === "all" ? "" : v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os convênios</SelectItem>
                    {dadosPorConvenio?.map((c: any) => (
                      <SelectItem key={c.convenio} value={c.convenio}>
                        {c.convenio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="conciliado">Conciliado</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="divergente">Divergente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Busca */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Conta, guia, paciente..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>

              {/* Limpar */}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setConvenioFiltro("");
                    setStatusFiltro("all");
                    setSearchTerm("");
                    setMesSelecionado(currentDate.getMonth() + 1);
                    setAnoSelecionado(currentDate.getFullYear());
                    setPage(1);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="text-2xl font-bold">{totalContas.toLocaleString('pt-BR')}</div>
              </div>
              <p className="text-xs text-muted-foreground">Total de Contas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div className="text-2xl font-bold">{totalItens.toLocaleString('pt-BR')}</div>
              </div>
              <p className="text-xs text-muted-foreground">Total de Itens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(valorTotalGeral)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-purple-500" />
                <div className="text-2xl font-bold text-purple-600">
                  {totalProcedimentos.toLocaleString('pt-BR')}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Procedimentos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                <div className="text-2xl font-bold text-blue-600">
                  {totalMatMed.toLocaleString('pt-BR')}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Mat/Med</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Contas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Contas Unificadas
            </CardTitle>
            <CardDescription>
              Clique no botão de visualização para ver os detalhes dos itens de cada conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : contasPaginadas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma conta encontrada. Execute a geração da tabela unificada primeiro.
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">Ações</TableHead>
                        <TableHead>Nr Conta</TableHead>
                        <TableHead>Guia</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Data Faturado</TableHead>
                        <TableHead className="text-center">Proc.</TableHead>
                        <TableHead className="text-center">Mat/Med</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contasPaginadas.map((conta: ContaTasyUnificada) => (
                        <TableRow key={conta.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirDetalhes(conta)}
                              title="Ver detalhes dos itens"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {conta.nrInternoConta}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {conta.guia || '-'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={conta.paciente || ''}>
                            {conta.paciente || '-'}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={conta.convenio || ''}>
                            {conta.convenio || '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(conta.dataFaturado)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              {conta.totalProcedimentos}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {conta.totalMatMed}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(conta.valorTotalConta)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(conta.statusConta)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalContas)} de {totalContas} contas
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Página {page} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Detalhes da Conta: {contaSelecionada?.nrInternoConta}</span>
                <Button variant="ghost" size="sm" onClick={fecharModal}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
              <DialogDescription>
                {contaSelecionada?.paciente} - {contaSelecionada?.convenio}
              </DialogDescription>
            </DialogHeader>

            {contaSelecionada && (
              <div className="space-y-4">
                {/* Resumo da Conta */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Guia</p>
                    <p className="font-medium">{contaSelecionada.guia || '-'}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Data Faturado</p>
                    <p className="font-medium">{formatDate(contaSelecionada.dataFaturado)}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Setor</p>
                    <p className="font-medium">{contaSelecionada.setor || '-'}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Protocolo</p>
                    <p className="font-medium">{contaSelecionada.protocolo || '-'}</p>
                  </div>
                </div>

                {/* Totais */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600">Procedimentos</p>
                    <p className="text-xl font-bold text-purple-700">{contaSelecionada.totalProcedimentos}</p>
                    <p className="text-sm text-purple-600">{formatCurrency(contaSelecionada.valorTotalProcedimentos)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600">Mat/Med</p>
                    <p className="text-xl font-bold text-blue-700">{contaSelecionada.totalMatMed}</p>
                    <p className="text-sm text-blue-600">{formatCurrency(contaSelecionada.valorTotalMatMed)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600">Valor Total</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(contaSelecionada.valorTotalConta)}</p>
                    <p className="text-sm text-green-600">{contaSelecionada.totalProcedimentos + contaSelecionada.totalMatMed} itens</p>
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Itens da Conta</h4>
                  <Button variant="outline" size="sm" onClick={handleExportContaExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Itens
                  </Button>
                </div>

                <div className="rounded-md border max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead className="max-w-[300px]">Descrição</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead>Médico</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itensContaSelecionada?.map((item: ItemContaTasy) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant={item.tipoItem === 'procedimento' ? 'default' : 'secondary'}>
                              {item.tipoItem === 'procedimento' ? 'Proc' : item.tipoItem === 'material' ? 'Mat' : 'Med'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.codigo || '-'}</TableCell>
                          <TableCell className="max-w-[300px] truncate" title={item.descricao || ''}>
                            {item.descricao || '-'}
                          </TableCell>
                          <TableCell className="text-center">{item.quantidade || 1}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.valorTotal)}</TableCell>
                          <TableCell className="text-xs">{item.medico || '-'}</TableCell>
                          <TableCell className="text-center">
                            {item.statusPagamento === 'pago' ? (
                              <Badge className="bg-green-500">Pago</Badge>
                            ) : item.statusPagamento === 'glosado' ? (
                              <Badge className="bg-red-500">Glosado</Badge>
                            ) : item.statusPagamento === 'parcial' ? (
                              <Badge className="bg-yellow-500">Parcial</Badge>
                            ) : (
                              <Badge variant="secondary">Pendente</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
