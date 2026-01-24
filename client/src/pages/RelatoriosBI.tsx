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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Columns,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Building2,
  User,
  Calendar,
  ChevronDown,
  Eye,
  X,
  Database,
  FileText,
  Search,
  Layers,
  LayoutDashboard,
  Activity,
  Target,
  Zap
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
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
    { id: 'setor', label: 'Setor', icon: Building2 },
    { id: 'tipo', label: 'Tipo (Mat/Hon)', icon: Package },
    { id: 'medico', label: 'Médico', icon: User },
    { id: 'paciente', label: 'Paciente', icon: User },
    { id: 'codigo', label: 'Procedimento', icon: FileText },
    { id: 'descricao', label: 'Descrição', icon: FileText },
    { id: 'protocolo', label: 'Protocolo', icon: FileText },
    { id: 'statusProtocolo', label: 'Status Protocolo', icon: FileText },
    { id: 'guia', label: 'Guia', icon: FileText },
    { id: 'atendimento', label: 'Atendimento', icon: FileText },
    { id: 'crm', label: 'CRM', icon: User },
    { id: 'funcaoMedico', label: 'Função Médico', icon: User },
    { id: 'mesAno', label: 'Mês/Ano', icon: Calendar },
    { id: 'trimestre', label: 'Trimestre', icon: Calendar },
    { id: 'ano', label: 'Ano', icon: Calendar },
  ],
  metricas: [
    { id: 'valorTotal', label: 'Valor Total (R$)', icon: DollarSign },
    { id: 'quantidade', label: 'Quantidade', icon: Package },
    { id: 'valorUnitario', label: 'Valor Unitário (R$)', icon: DollarSign },
  ]
};

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

export default function RelatoriosBI() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  
  // Filtros de período
  const currentDate = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(currentDate.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(currentDate.getFullYear());
  
  // Estados para análise
  const [dimensaoSelecionada, setDimensaoSelecionada] = useState('convenio');
  const [metricaSelecionada, setMetricaSelecionada] = useState('valorTotal');
  const [tipoGrafico, setTipoGrafico] = useState<'bar' | 'pie' | 'line' | 'doughnut'>('bar');
  
  // Filtros adicionais
  const [filtroConvenio, setFiltroConvenio] = useState<string>('all');
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [filtroSetor, setFiltroSetor] = useState<string>('all');
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
  
  // Calcular período
  const dataInicio = useMemo(() => {
    return `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`;
  }, [mesSelecionado, anoSelecionado]);
  
  const dataFim = useMemo(() => {
    const ultimoDia = new Date(anoSelecionado, mesSelecionado, 0).getDate();
    return `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${ultimoDia}`;
  }, [mesSelecionado, anoSelecionado]);
  
  // Buscar dados do Tasy
  const { data: dadosTasy, isLoading, refetch } = trpc.importacaoTasy.dados.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      dataInicio,
      dataFim,
      limite: 50000,
    },
    { enabled: !!estabelecimentoAtual }
  );
  
  // Listas únicas para filtros
  const conveniosUnicos = useMemo(() => {
    if (!dadosTasy) return [];
    const set = new Set(dadosTasy.map((d: any) => d.convenio).filter(Boolean));
    return Array.from(set).sort();
  }, [dadosTasy]);
  
  const setoresUnicos = useMemo(() => {
    if (!dadosTasy) return [];
    const set = new Set(dadosTasy.map((d: any) => d.setor).filter(Boolean));
    return Array.from(set).sort();
  }, [dadosTasy]);
  
  // Dados filtrados
  const dadosFiltrados = useMemo(() => {
    if (!dadosTasy) return [];
    
    return dadosTasy.filter((item: any) => {
      if (filtroConvenio !== 'all' && item.convenio !== filtroConvenio) return false;
      if (filtroTipo !== 'all' && item.tipo !== filtroTipo) return false;
      if (filtroSetor !== 'all' && item.setor !== filtroSetor) return false;
      if (filtroPaciente && !item.paciente?.toLowerCase().includes(filtroPaciente.toLowerCase())) return false;
      if (filtroProcedimento && !item.codigo?.toLowerCase().includes(filtroProcedimento.toLowerCase()) && !item.descricao?.toLowerCase().includes(filtroProcedimento.toLowerCase())) return false;
      return true;
    });
  }, [dadosTasy, filtroConvenio, filtroTipo, filtroSetor, filtroPaciente, filtroProcedimento]);
  
  // Totais gerais
  const totaisGerais = useMemo(() => {
    let valor = 0;
    let quantidade = 0;
    let materiais = 0;
    let honorarios = 0;
    let pacientes = new Set();
    let procedimentos = new Set();
    
    dadosFiltrados.forEach((item: any) => {
      valor += parseFloat(item.valorTotal || '0');
      quantidade += parseInt(item.quantidade || '1');
      if (item.tipo === 'MATERIAL') materiais++;
      else honorarios++;
      if (item.paciente) pacientes.add(item.paciente);
      if (item.codigo) procedimentos.add(item.codigo);
    });
    
    return { 
      valor, 
      quantidade, 
      materiais, 
      honorarios, 
      totalItens: dadosFiltrados.length,
      pacientesUnicos: pacientes.size,
      procedimentosUnicos: procedimentos.size
    };
  }, [dadosFiltrados]);
  
  // Função para obter valor da dimensão
  const getValorDimensao = useCallback((item: any, dimensao: string) => {
    switch (dimensao) {
      case 'mesAno':
        const data = new Date(item.dataFaturado || item.dataConta);
        return `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
      case 'trimestre':
        const dataT = new Date(item.dataFaturado || item.dataConta);
        const trimestre = Math.ceil((dataT.getMonth() + 1) / 3);
        return `T${trimestre}/${dataT.getFullYear()}`;
      case 'ano':
        const dataA = new Date(item.dataFaturado || item.dataConta);
        return String(dataA.getFullYear());
      default:
        return item[dimensao] || 'Não informado';
    }
  }, []);
  
  // Dados agrupados
  const dadosAgrupados = useMemo(() => {
    const grupos: Record<string, { valor: number; quantidade: number; valorUnitario: number; itens: any[] }> = {};
    
    dadosFiltrados.forEach((item: any) => {
      const chave = getValorDimensao(item, dimensaoSelecionada);
      
      if (!grupos[chave]) {
        grupos[chave] = { valor: 0, quantidade: 0, valorUnitario: 0, itens: [] };
      }
      
      grupos[chave].valor += parseFloat(item.valorTotal || '0');
      grupos[chave].quantidade += parseInt(item.quantidade || '1');
      grupos[chave].valorUnitario += parseFloat(item.valorUnitario || '0');
      grupos[chave].itens.push(item);
    });
    
    return Object.entries(grupos)
      .map(([label, data]) => ({ 
        label, 
        ...data,
        valorMedio: data.itens.length > 0 ? data.valor / data.itens.length : 0
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [dadosFiltrados, dimensaoSelecionada, getValorDimensao]);
  
  // Dados para o gráfico principal
  const dadosGrafico = useMemo(() => {
    const top10 = dadosAgrupados.slice(0, 10);
    const labels = top10.map(g => g.label.length > 20 ? g.label.substring(0, 20) + '...' : g.label);
    
    let valores: number[];
    switch (metricaSelecionada) {
      case 'valorTotal':
        valores = top10.map(g => g.valor);
        break;
      case 'quantidade':
        valores = top10.map(g => g.quantidade);
        break;
      case 'valorUnitario':
        valores = top10.map(g => g.valorMedio);
        break;
      default:
        valores = top10.map(g => g.valor);
    }
    
    return {
      labels,
      datasets: [{
        label: camposAnalise.metricas.find(m => m.id === metricaSelecionada)?.label || 'Valor',
        data: valores,
        backgroundColor: coresGraficos,
        borderColor: coresGraficos.map(c => c.replace('0.8', '1')),
        borderWidth: 1,
      }]
    };
  }, [dadosAgrupados, metricaSelecionada]);
  
  // Opções do gráfico
  const opcoesGrafico = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const grupo = dadosAgrupados[index];
        if (grupo) {
          setDrillDownTitulo(`Detalhes: ${grupo.label}`);
          setDrillDownDados(grupo.itens);
          setDrillDownAberto(true);
        }
      }
    },
    plugins: {
      legend: { display: tipoGrafico === 'pie' || tipoGrafico === 'doughnut' },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            if (metricaSelecionada === 'valorTotal' || metricaSelecionada === 'valorUnitario') {
              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            return `${value.toLocaleString('pt-BR')} itens`;
          }
        }
      }
    },
    scales: (tipoGrafico === 'bar' || tipoGrafico === 'line') ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => {
            if (metricaSelecionada === 'valorTotal' || metricaSelecionada === 'valorUnitario') {
              return `R$ ${(value / 1000).toFixed(0)}k`;
            }
            return value;
          }
        }
      }
    } : undefined
  }), [dadosAgrupados, tipoGrafico, metricaSelecionada]);
  
  // Formatar moeda
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };
  
  // Exportar para Excel
  const handleExportExcel = () => {
    if (!dadosFiltrados.length) return;

    const excelData = dadosFiltrados.map((item: any) => ({
      "Atendimento": item.atendimento || '-',
      "Guia": item.guia || '-',
      "Convênio": item.convenio || '-',
      "Paciente": item.paciente || '-',
      "Código": item.codigo || '-',
      "Descrição": item.descricao || '-',
      "Tipo": item.tipo || '-',
      "Quantidade": item.quantidade || 1,
      "Valor Unitário": parseFloat(item.valorUnitario || '0'),
      "Valor Total": parseFloat(item.valorTotal || '0'),
      "Médico": item.medico || '-',
      "CRM": item.crm || '-',
      "Setor": item.setor || '-',
      "Protocolo": item.protocolo || '-',
      "Status": item.statusProtocolo || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `relatorio_bi_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  };
  
  // Limpar filtros
  const limparFiltros = () => {
    setFiltroConvenio('all');
    setFiltroTipo('all');
    setFiltroSetor('all');
    setFiltroPaciente('');
    setFiltroProcedimento('');
  };
  
  if (!estabelecimentoAtual) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Selecione um estabelecimento para continuar</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              Relatórios BI
            </h1>
            <p className="text-muted-foreground">
              Análise avançada dos dados importados via XML/Excel - Estilo Power BI
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Filtros de Período */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Mês */}
              <div>
                <Label className="text-xs">Mês</Label>
                <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Ano */}
              <div>
                <Label className="text-xs">Ano</Label>
                <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Convênio */}
              <div>
                <Label className="text-xs">Convênio</Label>
                <Select value={filtroConvenio} onValueChange={setFiltroConvenio}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {conveniosUnicos.map((c: string) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Tipo */}
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="MATERIAL">Materiais</SelectItem>
                    <SelectItem value="HONORARIO">Honorários</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Setor */}
              <div>
                <Label className="text-xs">Setor</Label>
                <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {setoresUnicos.map((s: string) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Paciente */}
              <div>
                <Label className="text-xs">Paciente</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                <Label className="text-xs">Procedimento</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Código/Descrição..."
                    value={filtroProcedimento}
                    onChange={(e) => setFiltroProcedimento(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            
            {(filtroConvenio !== 'all' || filtroTipo !== 'all' || filtroSetor !== 'all' || filtroPaciente || filtroProcedimento) && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                <Button variant="ghost" size="sm" onClick={limparFiltros}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar todos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-xs text-blue-600/70">Valor Total</span>
              </div>
              <div className="text-xl font-bold text-blue-600 mt-1">
                {formatCurrency(totaisGerais.valor)}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                <span className="text-xs text-green-600/70">Total Itens</span>
              </div>
              <div className="text-xl font-bold text-green-600 mt-1">
                {totaisGerais.totalItens.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-purple-600" />
                <span className="text-xs text-purple-600/70">Materiais</span>
              </div>
              <div className="text-xl font-bold text-purple-600 mt-1">
                {totaisGerais.materiais.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-amber-600" />
                <span className="text-xs text-amber-600/70">Honorários</span>
              </div>
              <div className="text-xl font-bold text-amber-600 mt-1">
                {totaisGerais.honorarios.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-600" />
                <span className="text-xs text-rose-600/70">Quantidade</span>
              </div>
              <div className="text-xl font-bold text-rose-600 mt-1">
                {totaisGerais.quantidade.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-cyan-600" />
                <span className="text-xs text-cyan-600/70">Pacientes</span>
              </div>
              <div className="text-xl font-bold text-cyan-600 mt-1">
                {totaisGerais.pacientesUnicos.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600" />
                <span className="text-xs text-indigo-600/70">Procedimentos</span>
              </div>
              <div className="text-xl font-bold text-indigo-600 mt-1">
                {totaisGerais.procedimentosUnicos.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Área de Análise */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Painel de Configuração */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Configurar Análise
              </CardTitle>
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
              
              {/* Métrica */}
              <div>
                <Label className="text-sm font-medium">Métrica</Label>
                <Select value={metricaSelecionada} onValueChange={setMetricaSelecionada}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {camposAnalise.metricas.map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <m.icon className="h-4 w-4" />
                          {m.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  Mostrando <span className="font-bold text-foreground">{dadosFiltrados.length}</span> registros
                </p>
                <p className="text-sm text-muted-foreground">
                  Agrupados em <span className="font-bold text-foreground">{dadosAgrupados.length}</span> categorias
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Gráfico Principal */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {tipoGrafico === 'bar' && <BarChart3 className="h-5 w-5" />}
                {tipoGrafico === 'line' && <LineChart className="h-5 w-5" />}
                {tipoGrafico === 'pie' && <PieChart className="h-5 w-5" />}
                {tipoGrafico === 'doughnut' && <Activity className="h-5 w-5" />}
                {camposAnalise.metricas.find(m => m.id === metricaSelecionada)?.label} por {camposAnalise.dimensoes.find(d => d.id === dimensaoSelecionada)?.label}
              </CardTitle>
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
                  <p>Nenhum dado encontrado para o período selecionado</p>
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

        {/* Tabela de Dados Agrupados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Dados Agrupados por {camposAnalise.dimensoes.find(d => d.id === dimensaoSelecionada)?.label}
            </CardTitle>
            <CardDescription>
              Top 20 categorias ordenadas por valor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>{camposAnalise.dimensoes.find(d => d.id === dimensaoSelecionada)?.label}</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                    <TableHead className="text-right">Valor Médio</TableHead>
                    <TableHead className="text-right">% do Total</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosAgrupados.slice(0, 20).map((grupo, index) => (
                    <TableRow key={grupo.label}>
                      <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{grupo.label}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(grupo.valor)}
                      </TableCell>
                      <TableCell className="text-right">{grupo.quantidade.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{grupo.itens.length.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(grupo.valorMedio)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {((grupo.valor / totaisGerais.valor) * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDrillDownTitulo(`Detalhes: ${grupo.label}`);
                            setDrillDownDados(grupo.itens);
                            setDrillDownAberto(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Drill-Down */}
        <Dialog open={drillDownAberto} onOpenChange={setDrillDownAberto}>
          <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{drillDownTitulo}</DialogTitle>
              <DialogDescription>
                {drillDownDados.length} itens encontrados
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Atendimento</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Médico</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownDados.slice(0, 100).map((item: any, index: number) => (
                    <TableRow key={`${item.id}-${index}`}>
                      <TableCell className="font-mono text-sm">{item.atendimento || '-'}</TableCell>
                      <TableCell>{item.paciente || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{item.codigo || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.descricao}>
                        {item.descricao || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.tipo === 'MATERIAL' ? 'default' : 'secondary'}>
                          {item.tipo === 'MATERIAL' ? 'Mat' : 'Hon'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.quantidade || 1}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(parseFloat(item.valorTotal || '0'))}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={item.medico}>
                        {item.medico || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {drillDownDados.length > 100 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Mostrando os primeiros 100 de {drillDownDados.length} itens
                </p>
              )}
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
