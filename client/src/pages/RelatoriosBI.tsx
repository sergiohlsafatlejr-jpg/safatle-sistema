import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  BarChart3, 
  PieChart, 
  LineChart,
  RefreshCw, 
  FileSpreadsheet,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Building2,
  User,
  Calendar,
  Database,
  FileText,
  Search,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Wallet,
  Receipt,
  Ban
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import * as XLSX from "xlsx";
import { exportToExcel, exportToPDF, exportToCSV } from "@/lib/exportUtils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import { toast } from "sonner";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Cores para gráficos
const coresGraficos = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(239, 68, 68, 0.8)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(20, 184, 166, 0.8)',
  'rgba(249, 115, 22, 0.8)',
  'rgba(99, 102, 241, 0.8)',
  'rgba(34, 197, 94, 0.8)',
];

// Campos disponíveis para análise
const camposAnalise = {
  dimensoes: [
    { id: 'convenio', label: 'Convênio', icon: Building2 },
    { id: 'tipo', label: 'Tipo (Mat/Hon)', icon: Package },
    { id: 'medico', label: 'Médico', icon: User },
    { id: 'paciente', label: 'Paciente', icon: User },
    { id: 'procedimento', label: 'Procedimento', icon: FileText },
    { id: 'descricao', label: 'Descrição do Item', icon: FileText },
    { id: 'guia', label: 'Guia', icon: Receipt },
    { id: 'mes', label: 'Mês/Ano', icon: Calendar },
    { id: 'motivoGlosa', label: 'Motivo da Glosa', icon: Ban },
    { id: 'statusGlosa', label: 'Status da Glosa', icon: AlertTriangle },
    { id: 'recursoGlosa', label: 'Recurso de Glosa', icon: Wallet },
  ],
  metricas: [
    { id: 'valorFaturado', label: 'Valor Faturado (R$)', icon: DollarSign },
    { id: 'valorRecebido', label: 'Valor Recebido (R$)', icon: CheckCircle2 },
    { id: 'valorGlosado', label: 'Valor Glosado (R$)', icon: XCircle },
    { id: 'valorPendente', label: 'Valor Pendente (R$)', icon: Clock },
    { id: 'quantidade', label: 'Quantidade', icon: Package },
    { id: 'registros', label: 'Nº Registros', icon: FileText },
  ]
};

// Lista de meses
const meses = [
  { value: 0, label: 'Todos os Meses' },
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

// Formatar moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formatar número
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export default function RelatoriosBI() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  
  // Filtros de período
  const currentDate = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(0); // 0 = todos
  const [anoSelecionado, setAnoSelecionado] = useState<number>(currentDate.getFullYear());
  
  // Estados para análise
  const [dimensaoSelecionada, setDimensaoSelecionada] = useState('convenio');
  const [metricasSelecionadas, setMetricasSelecionadas] = useState<string[]>(['valorFaturado']); // Agora suporta múltiplos valores
  const [tipoGrafico, setTipoGrafico] = useState<'bar' | 'pie' | 'line' | 'doughnut'>('bar');
  
  // Filtros adicionais
  const [filtroConvenio, setFiltroConvenio] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [filtroPaciente, setFiltroPaciente] = useState<string>('');
  const [filtroProcedimento, setFiltroProcedimento] = useState<string>('');
  
  
  // Modal de detalhes
  const [drillDownAberto, setDrillDownAberto] = useState(false);
  const [drillDownTitulo, setDrillDownTitulo] = useState('');
  const [drillDownDados, setDrillDownDados] = useState<any[]>([]);
  
  // Lista de anos
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => anoAtual - i);
  }, []);
  
  // Buscar dados do BI (banco principal)
  const { data: dadosBI, isLoading, refetch } = trpc.relatoriosBI.dados.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      mesReferencia: mesSelecionado > 0 ? mesSelecionado : undefined,
      anoReferencia: anoSelecionado,
      convenioId: filtroConvenio !== 'all' ? parseInt(filtroConvenio) : undefined,
      tipo: filtroTipo !== 'all' ? filtroTipo : undefined,
      paciente: filtroPaciente || undefined,
      procedimento: filtroProcedimento || undefined,
    },
    { enabled: !!estabelecimentoAtual }
  );
  
  // Buscar opções de filtro
  const { data: opcoesFiltro } = trpc.relatoriosBI.opcoesFiltro.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0 },
    { enabled: !!estabelecimentoAtual }
  );
  
  // Buscar novos relatórios
  const { data: itemsPorCategoria } = trpc.relatoriosBI.itemsPorCategoria.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0, mesReferencia: mesSelecionado > 0 ? mesSelecionado : undefined, anoReferencia: anoSelecionado, convenioId: filtroConvenio !== 'all' ? parseInt(filtroConvenio) : undefined },
    { enabled: !!estabelecimentoAtual }
  );
  
  const { data: glosasPorMotivo } = trpc.relatoriosBI.glosasPorMotivo.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0, mesReferencia: mesSelecionado > 0 ? mesSelecionado : undefined, anoReferencia: anoSelecionado, convenioId: filtroConvenio !== 'all' ? parseInt(filtroConvenio) : undefined },
    { enabled: !!estabelecimentoAtual }
  );
  
  const { data: performanceMedico } = trpc.relatoriosBI.performanceMedico.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0, mesReferencia: mesSelecionado > 0 ? mesSelecionado : undefined, anoReferencia: anoSelecionado },
    { enabled: !!estabelecimentoAtual }
  );
  

  
  // Dados agrupados baseado na dimensão selecionada
  const dadosAgrupados = useMemo(() => {
    if (!dadosBI) return [];
    
    let dados: any[] = [];
    switch (dimensaoSelecionada) {
      case 'convenio':
        dados = dadosBI.porConvenio;
        break;
      case 'tipo':
        dados = dadosBI.porTipo;
        break;
      case 'medico':
        dados = dadosBI.porMedico;
        break;
      case 'paciente':
        dados = dadosBI.porPaciente;
        break;
      case 'procedimento':
        dados = dadosBI.porProcedimento;
        break;
      case 'descricao':
        dados = dadosBI.porDescricao || [];
        break;
      case 'guia':
        dados = dadosBI.porGuia || [];
        break;
      case 'mes':
        dados = dadosBI.porMes;
        break;
      case 'motivoGlosa':
        dados = dadosBI.porMotivoGlosa || [];
        break;
      case 'statusGlosa':
        dados = dadosBI.porStatusGlosa || [];
        break;
      case 'recursoGlosa':
        dados = dadosBI.porRecursoGlosa || [];
        break;
      default:
        dados = dadosBI.porConvenio;
    }
    
    return dados || [];
  }, [dadosBI, dimensaoSelecionada]);
  
  // Dados para o gráfico principal - agora suporta múltiplas métricas
  const dadosGrafico = useMemo(() => {
    const top10 = dadosAgrupados.slice(0, 10);
    const labels = top10.map((g: any) => {
      const label = g.chave || 'Não informado';
      return label.length > 25 ? label.substring(0, 25) + '...' : label;
    });
    
    const coresPorMetrica: Record<string, string> = {
      'valorFaturado': 'rgba(59, 130, 246, 0.8)',
      'valorRecebido': 'rgba(16, 185, 129, 0.8)',
      'valorGlosado': 'rgba(239, 68, 68, 0.8)',
      'valorPendente': 'rgba(245, 158, 11, 0.8)',
      'quantidade': 'rgba(139, 92, 246, 0.8)',
      'registros': 'rgba(236, 72, 153, 0.8)',
    };
    
    const getValores = (metrica: string) => {
      switch (metrica) {
        case 'valorFaturado':
          return top10.map((g: any) => g.valorFaturado || 0);
        case 'valorRecebido':
          return top10.map((g: any) => g.valorRecebido || 0);
        case 'valorGlosado':
          return top10.map((g: any) => g.valorGlosado || 0);
        case 'valorPendente':
          return top10.map((g: any) => g.valorPendente || 0);
        case 'quantidade':
          return top10.map((g: any) => g.quantidade || 0);
        case 'registros':
          return top10.map((g: any) => g.registros || 0);
        default:
          return top10.map((g: any) => g.valorFaturado || 0);
      }
    };
    
    // Se for gráfico de pizza/doughnut, usar apenas a primeira métrica
    if (tipoGrafico === 'pie' || tipoGrafico === 'doughnut') {
      const metrica = metricasSelecionadas[0] || 'valorFaturado';
      return {
        labels,
        datasets: [{
          label: camposAnalise.metricas.find(m => m.id === metrica)?.label || 'Valor',
          data: getValores(metrica),
          backgroundColor: coresGraficos,
          borderColor: coresGraficos.map(c => c.replace('0.8', '1')),
          borderWidth: 1,
        }]
      };
    }
    
    // Para gráficos de barra e linha, criar um dataset para cada métrica
    const datasets = metricasSelecionadas.map((metrica, index) => {
      const cor = coresPorMetrica[metrica] || coresGraficos[index % coresGraficos.length];
      return {
        label: camposAnalise.metricas.find(m => m.id === metrica)?.label || metrica,
        data: getValores(metrica),
        backgroundColor: cor,
        borderColor: cor.replace('0.8', '1'),
        borderWidth: 1,
      };
    });
    
    return {
      labels,
      datasets,
    };
  }, [dadosAgrupados, metricasSelecionadas, tipoGrafico]);
  
  // Opções do gráfico
  const opcoesGrafico = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const grupo = dadosAgrupados[index];
        if (grupo) {
          setDrillDownTitulo(`Detalhes: ${grupo.chave}`);
          setDrillDownDados([grupo]);
          setDrillDownAberto(true);
        }
      }
    },
    plugins: {
      legend: { display: tipoGrafico === 'pie' || tipoGrafico === 'doughnut' || metricasSelecionadas.length > 1 },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            const datasetLabel = context.dataset.label || '';
            // Verificar se é uma métrica de valor monetário
            if (datasetLabel.includes('Valor') || datasetLabel.includes('R$')) {
              return `${datasetLabel}: ${formatCurrency(value)}`;
            }
            return `${datasetLabel}: ${formatNumber(value)}`;
          }
        }
      }
    },
    scales: tipoGrafico === 'bar' || tipoGrafico === 'line' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            // Verificar se alguma métrica selecionada é monetária
            const temMetricaMonetaria = metricasSelecionadas.some(m => m.includes('valor'));
            if (temMetricaMonetaria) {
              return formatCurrency(value);
            }
            return formatNumber(value);
          }
        }
      }
    } : undefined
  }), [tipoGrafico, metricasSelecionadas, dadosAgrupados]);
  
  // Exportar para Excel
  const exportarExcel = useCallback(() => {
    if (!dadosAgrupados || dadosAgrupados.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }
    
    const dadosExport = dadosAgrupados.map((item: any) => ({
      'Dimensão': item.chave,
      'Valor Faturado': item.valorFaturado,
      'Valor Recebido': item.valorRecebido,
      'Valor Glosado': item.valorGlosado,
      'Valor Pendente': item.valorPendente,
      'Quantidade': item.quantidade,
      'Registros': item.registros,
    }));
    
    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório BI');
    XLSX.writeFile(wb, `relatorio_bi_${anoSelecionado}_${mesSelecionado || 'todos'}.xlsx`);
    toast.success('Relatório exportado com sucesso!');
  }, [dadosAgrupados, anoSelecionado, mesSelecionado]);
  
  // Calcular percentuais
  const percentuais = useMemo(() => {
    if (!dadosBI?.resumo) return { recebido: 0, glosado: 0, pendente: 0 };
    const { totalFaturado, totalRecebido, totalGlosado, totalPendente } = dadosBI.resumo;
    if (totalFaturado === 0) return { recebido: 0, glosado: 0, pendente: 0 };
    return {
      recebido: (totalRecebido / totalFaturado) * 100,
      glosado: (totalGlosado / totalFaturado) * 100,
      pendente: (totalPendente / totalFaturado) * 100,
    };
  }, [dadosBI]);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Relatórios BI
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise de Faturamento, Recebimento e Glosas - Dados do Sistema
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={exportarExcel} className="bg-gradient-to-r from-green-600 to-emerald-600">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>
        
        {/* Filtros de Período */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período e Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Ano */}
              <div>
                <Label className="text-sm">Ano</Label>
                <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map(ano => (
                      <SelectItem key={ano} value={String(ano)}>{ano}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Mês */}
              <div>
                <Label className="text-sm">Mês</Label>
                <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(parseInt(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Convênio */}
              <div>
                <Label className="text-sm">Convênio</Label>
                <Select value={filtroConvenio} onValueChange={setFiltroConvenio}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Convênios</SelectItem>
                    {opcoesFiltro?.convenios?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Tipo */}
              <div>
                <Label className="text-sm">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    {opcoesFiltro?.tipos?.map((t: string) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Paciente */}
              <div>
                <Label className="text-sm">Paciente</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={filtroPaciente}
                    onChange={(e) => setFiltroPaciente(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              {/* Procedimento */}
              <div>
                <Label className="text-sm">Procedimento</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Código..."
                    value={filtroProcedimento}
                    onChange={(e) => setFiltroProcedimento(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              

            </div>
          </CardContent>
        </Card>
        
        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* Faturado */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Wallet className="h-5 w-5" />
                <span className="text-sm font-medium">Faturado</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(dadosBI?.resumo?.totalFaturado || 0)}
              </p>
            </CardContent>
          </Card>
          
          {/* Recebido */}
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Recebido</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {formatCurrency(dadosBI?.resumo?.totalRecebido || 0)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                {percentuais.recebido.toFixed(1)}% do faturado
              </p>
            </CardContent>
          </Card>
          
          {/* Glosado */}
          <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <Ban className="h-5 w-5" />
                <span className="text-sm font-medium">Glosado</span>
              </div>
              <p className="text-2xl font-bold text-red-700">
                {formatCurrency(dadosBI?.resumo?.totalGlosado || 0)}
              </p>
              <p className="text-xs text-red-600 mt-1">
                {percentuais.glosado.toFixed(1)}% do faturado
              </p>
            </CardContent>
          </Card>
          
          {/* Pendente */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Pendente</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">
                {formatCurrency(dadosBI?.resumo?.totalPendente || 0)}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {percentuais.pendente.toFixed(1)}% do faturado
              </p>
            </CardContent>
          </Card>
          
          {/* Total Itens */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Receipt className="h-5 w-5" />
                <span className="text-sm font-medium">Itens</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(dadosBI?.resumo?.totalItens || 0)}
              </p>
            </CardContent>
          </Card>
          
          {/* Pacientes */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <User className="h-5 w-5" />
                <span className="text-sm font-medium">Pacientes</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(dadosBI?.resumo?.totalPacientes || 0)}
              </p>
            </CardContent>
          </Card>
          
          {/* Convênios */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Building2 className="h-5 w-5" />
                <span className="text-sm font-medium">Convênios</span>
              </div>
              <p className="text-2xl font-bold">
                {formatNumber(dadosBI?.resumo?.totalConvenios || 0)}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* KPIs Avançados - Métricas de Desempenho */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Ticket Médio */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium">Ticket Médio</span>
              </div>
              <p className="text-xl font-bold text-purple-700">
                {formatCurrency(dadosBI?.resumo?.ticketMedio || 0)}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                por guia/atendimento
              </p>
            </CardContent>
          </Card>
          
          {/* Taxa de Glosa */}
          <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/10 border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-rose-600 mb-2">
                <TrendingDown className="h-5 w-5" />
                <span className="text-sm font-medium">Taxa de Glosa</span>
              </div>
              <p className="text-xl font-bold text-rose-700">
                {(dadosBI?.resumo?.taxaGlosa || 0).toFixed(2)}%
              </p>
              <p className="text-xs text-rose-600 mt-1">
                do valor faturado
              </p>
            </CardContent>
          </Card>
          
          {/* Total de Guias */}
          <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-cyan-600 mb-2">
                <FileText className="h-5 w-5" />
                <span className="text-sm font-medium">Total Guias</span>
              </div>
              <p className="text-xl font-bold text-cyan-700">
                {formatNumber(dadosBI?.resumo?.totalGuias || 0)}
              </p>
              <p className="text-xs text-cyan-600 mt-1">
                atendimentos únicos
              </p>
            </CardContent>
          </Card>
          
          {/* Valor Médio por Item */}
          <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <Activity className="h-5 w-5" />
                <span className="text-sm font-medium">Média/Item</span>
              </div>
              <p className="text-xl font-bold text-indigo-700">
                {formatCurrency(dadosBI?.resumo?.valorMedioPorItem || 0)}
              </p>
              <p className="text-xs text-indigo-600 mt-1">
                valor médio por procedimento
              </p>
            </CardContent>
          </Card>
          
          {/* Total Recursado */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Wallet className="h-5 w-5" />
                <span className="text-sm font-medium">Recursado</span>
              </div>
              <p className="text-xl font-bold text-orange-700">
                {formatCurrency(dadosBI?.resumo?.totalRecursado || 0)}
              </p>
              <p className="text-xs text-orange-600 mt-1">
                valor em recursos de glosa
              </p>
            </CardContent>
          </Card>
          
          {/* Taxa de Recuperação */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Recuperação</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">
                {(dadosBI?.resumo?.taxaRecuperacao || 0).toFixed(2)}%
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                {formatCurrency(dadosBI?.resumo?.totalRecuperado || 0)} recuperados
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Abas de Relatórios */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="itens">Análise Itens</TabsTrigger>
            <TabsTrigger value="glosas">Glosas</TabsTrigger>
            <TabsTrigger value="medicos">Médicos</TabsTrigger>
          </TabsList>
          
          {/* Aba Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
        {/* Área de Análise */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Painel de Controle */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração</CardTitle>
              <CardDescription>Personalize a visualização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dimensão */}
              <div>
                <Label className="text-sm font-medium">Agrupar por</Label>
                <Select value={dimensaoSelecionada} onValueChange={setDimensaoSelecionada}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {camposAnalise.dimensoes.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        <div className="flex items-center gap-2">
                          <d.icon className="h-4 w-4" />
                          {d.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Métricas - agora suporta múltiplas seleções */}
              <div>
                <Label className="text-sm font-medium">Métricas (clique para adicionar/remover)</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {camposAnalise.metricas.map(m => {
                    const isSelected = metricasSelecionadas.includes(m.id);
                    return (
                      <Badge
                        key={m.id}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary' : 'hover:bg-accent'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            // Remover se já estiver selecionado (mas manter pelo menos 1)
                            if (metricasSelecionadas.length > 1) {
                              setMetricasSelecionadas(prev => prev.filter(id => id !== m.id));
                            }
                          } else {
                            // Adicionar se não estiver selecionado
                            setMetricasSelecionadas(prev => [...prev, m.id]);
                          }
                        }}
                      >
                        <m.icon className="h-3 w-3 mr-1" />
                        {m.label.replace(' (R$)', '').replace(' (R$)', '')}
                      </Badge>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metricasSelecionadas.length} métrica(s) selecionada(s)
                </p>
              </div>
              
              {/* Tipo de Gráfico */}
              <div>
                <Label className="text-sm font-medium">Tipo de Gráfico</Label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  <Button
                    variant={tipoGrafico === 'bar' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGrafico('bar')}
                    className="p-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tipoGrafico === 'line' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGrafico('line')}
                    className="p-2"
                  >
                    <LineChart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tipoGrafico === 'pie' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGrafico('pie')}
                    className="p-2"
                  >
                    <PieChart className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={tipoGrafico === 'doughnut' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoGrafico('doughnut')}
                    className="p-2"
                  >
                    <Activity className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Resumo */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Agrupados em <span className="font-bold text-foreground">{dadosAgrupados.length}</span> categorias
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Gráfico Principal */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                {tipoGrafico === 'bar' && <BarChart3 className="h-5 w-5" />}
                {tipoGrafico === 'line' && <LineChart className="h-5 w-5" />}
                {tipoGrafico === 'pie' && <PieChart className="h-5 w-5" />}
                {tipoGrafico === 'doughnut' && <Activity className="h-5 w-5" />}
                  {metricasSelecionadas.length === 1 
                    ? camposAnalise.metricas.find(m => m.id === metricasSelecionadas[0])?.label 
                    : `${metricasSelecionadas.length} métricas`} por {camposAnalise.dimensoes.find(d => d.id === dimensaoSelecionada)?.label}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportToExcel(dadosAgrupados, 'relatorio-dashboard')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportToPDF(dadosAgrupados, 'relatorio-dashboard', 'Relatório Dashboard')}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
              <CardDescription>
                Clique em uma barra/fatia para ver os detalhes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-[400px]">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : dadosAgrupados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Database className="h-12 w-12 mb-4" />
                  <p className="text-lg font-medium">Nenhum dado encontrado</p>
                  <p className="text-sm mt-2">Importe arquivos XML ou Excel para visualizar os dados aqui</p>
                </div>
              ) : (
                <div className="h-[400px]">
                  {tipoGrafico === 'bar' && <Bar data={dadosGrafico} options={opcoesGrafico} />}
                  {tipoGrafico === 'line' && <Line data={dadosGrafico} options={opcoesGrafico} />}
                  {tipoGrafico === 'pie' && <Pie data={dadosGrafico} options={opcoesGrafico} />}
                  {tipoGrafico === 'doughnut' && <Doughnut data={dadosGrafico} options={opcoesGrafico} />}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Tabela de Dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Dados Detalhados
            </CardTitle>
            <CardDescription>
              Top 20 por {camposAnalise.dimensoes.find(d => d.id === dimensaoSelecionada)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-bold">
                      {camposAnalise.dimensoes.find(d => d.id === dimensaoSelecionada)?.label}
                    </TableHead>
                    <TableHead className="text-right font-bold">Faturado</TableHead>
                    <TableHead className="text-right font-bold">Recebido</TableHead>
                    <TableHead className="text-right font-bold">Glosado</TableHead>
                    <TableHead className="text-right font-bold">Pendente</TableHead>
                    <TableHead className="text-right font-bold">Qtd</TableHead>
                    <TableHead className="text-right font-bold">Registros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosAgrupados.slice(0, 20).map((item: any, idx: number) => (
                    <TableRow key={idx} className="hover:bg-muted/30">
                      <TableCell className="font-medium max-w-[250px] truncate" title={item.chave}>
                        {item.chave || 'Não informado'}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {formatCurrency(item.valorFaturado || 0)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatCurrency(item.valorRecebido || 0)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatCurrency(item.valorGlosado || 0)}
                      </TableCell>
                      <TableCell className="text-right text-amber-600 font-medium">
                        {formatCurrency(item.valorPendente || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.quantidade || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(item.registros || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {dadosAgrupados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum dado encontrado para o período selecionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {dadosAgrupados.length > 20 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Mostrando 20 de {dadosAgrupados.length} registros. Exporte para Excel para ver todos.
              </p>
            )}
          </CardContent>
        </Card>
          </TabsContent>
          
          {/* Aba Análise de Itens */}
          <TabsContent value="itens" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Itens por Categoria</CardTitle>
                <CardDescription>Distribuição de valores por tipo de item</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {itemsPorCategoria?.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{item.categoria}</h3>
                        <Badge>{item.percentual}%</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Quantidade</p>
                          <p className="font-bold">{formatNumber(item.quantidade)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor</p>
                          <p className="font-bold text-blue-600">{formatCurrency(item.valor)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tendência</p>
                          <p className={`font-bold ${item.tendencia === 'up' ? 'text-green-600' : item.tendencia === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                            {item.tendencia === 'up' ? '↑' : item.tendencia === 'down' ? '↓' : '→'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Aba Glosas */}
          <TabsContent value="glosas" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Glosas por Motivo</CardTitle>
                <CardDescription>Análise detalhada de motivos de glosa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {glosasPorMotivo?.map((item: any, idx: number) => (
                    <div key={idx} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-red-900">{item.motivo}</h3>
                        <Badge variant="destructive">{item.percentual}%</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Quantidade</p>
                          <p className="font-bold">{formatNumber(item.quantidade)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor</p>
                          <p className="font-bold text-red-600">{formatCurrency(item.valor)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Por Convenío</p>
                          <p className="text-xs">{item.porConvenio?.length || 0} conveníos</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Aba Performance por Médico */}
          <TabsContent value="medicos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance por Médico</CardTitle>
                <CardDescription>Análise de faturamento e taxa de glosa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Médico</TableHead>
                        <TableHead className="text-right">Faturado</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                        <TableHead className="text-right">Glosado</TableHead>
                        <TableHead className="text-right">Taxa Glosa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceMedico?.map((medico: any, idx: number) => (
                        <TableRow key={idx} className="hover:bg-muted/50">
                          <TableCell className="font-medium">{medico.medicoNome}</TableCell>
                          <TableCell className="text-right">{formatCurrency(medico.faturado)}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">{formatCurrency(medico.recebido)}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">{formatCurrency(medico.glosado)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={medico.taxaGlosa > 15 ? 'destructive' : 'default'}>
                              {medico.taxaGlosa}%
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
        </Tabs>
        
        {/* Modal de Drill-Down */}
        <Dialog open={drillDownAberto} onOpenChange={setDrillDownAberto}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{drillDownTitulo}</DialogTitle>
              <DialogDescription>
                Detalhes do item selecionado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {drillDownDados.map((item: any, idx: number) => (
                <div key={idx} className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-sm text-blue-600">Faturado</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(item.valorFaturado || 0)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm text-green-600">Recebido</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(item.valorRecebido || 0)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">Glosado</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(item.valorGlosado || 0)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-sm text-amber-600">Pendente</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(item.valorPendente || 0)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Quantidade</p>
                    <p className="text-xl font-bold">{formatNumber(item.quantidade || 0)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Registros</p>
                    <p className="text-xl font-bold">{formatNumber(item.registros || 0)}</p>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDrillDownAberto(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
