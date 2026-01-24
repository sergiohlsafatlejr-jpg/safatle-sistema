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
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  Save,
  FolderOpen,
  Star,
  StarOff,
  Trash2,
  Eye,
  X,
  ArrowLeftRight,
  Info
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
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
import { Bar, Pie, Line } from 'react-chartjs-2';
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

// Definição das colunas disponíveis
const colunasDisponiveis = [
  { id: 'atendimento', label: 'Atendimento', tipo: 'texto' },
  { id: 'nrInternoConta', label: 'Nr Interno Conta', tipo: 'texto' },
  { id: 'guia', label: 'Guia', tipo: 'texto' },
  { id: 'convenio', label: 'Convênio', tipo: 'texto' },
  { id: 'paciente', label: 'Paciente', tipo: 'texto' },
  { id: 'dataFaturado', label: 'Data Faturado', tipo: 'data' },
  { id: 'dataConta', label: 'Data Conta', tipo: 'data' },
  { id: 'codigo', label: 'Código', tipo: 'texto' },
  { id: 'codigoConvenio', label: 'Código Convênio', tipo: 'texto' },
  { id: 'descricao', label: 'Descrição', tipo: 'texto' },
  { id: 'quantidade', label: 'Quantidade', tipo: 'numero' },
  { id: 'valorUnitario', label: 'Valor Unitário', tipo: 'moeda' },
  { id: 'valorTotal', label: 'Valor Total', tipo: 'moeda' },
  { id: 'setor', label: 'Setor', tipo: 'texto' },
  { id: 'protocolo', label: 'Protocolo', tipo: 'texto' },
  { id: 'statusProtocolo', label: 'Status Protocolo', tipo: 'texto' },
  { id: 'tipo', label: 'Tipo', tipo: 'texto' },
  { id: 'medico', label: 'Médico', tipo: 'texto' },
  { id: 'crm', label: 'CRM', tipo: 'texto' },
];

// Campos disponíveis para agrupamento
const camposAgrupamento = [
  { id: 'convenio', label: 'Convênio', icon: Building2 },
  { id: 'setor', label: 'Setor', icon: Building2 },
  { id: 'tipo', label: 'Tipo (Mat/Hon)', icon: Package },
  { id: 'medico', label: 'Médico', icon: User },
];

// Cores para gráficos
const coresGraficos = [
  'rgba(59, 130, 246, 0.8)',   // blue
  'rgba(16, 185, 129, 0.8)',   // green
  'rgba(245, 158, 11, 0.8)',   // amber
  'rgba(239, 68, 68, 0.8)',    // red
  'rgba(139, 92, 246, 0.8)',   // purple
  'rgba(236, 72, 153, 0.8)',   // pink
  'rgba(20, 184, 166, 0.8)',   // teal
  'rgba(249, 115, 22, 0.8)',   // orange
  'rgba(99, 102, 241, 0.8)',   // indigo
  'rgba(34, 197, 94, 0.8)',    // emerald
];

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

export default function RelatoriosTasy() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const utils = trpc.useUtils();
  
  // Estados para filtros
  const currentDate = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(currentDate.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(currentDate.getFullYear());
  const [convenioFiltro, setConvenioFiltro] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("all");
  const [setorFiltro, setSetorFiltro] = useState<string>("");
  
  // Estados para configuração do relatório
  const [colunasVisiveis, setColunasVisiveis] = useState<string[]>([
    'atendimento', 'guia', 'convenio', 'paciente', 'tipo', 'valorTotal', 'setor'
  ]);
  const [agrupamento, setAgrupamento] = useState<string>('convenio');
  const [tipoGrafico, setTipoGrafico] = useState<'bar' | 'pie' | 'line'>('bar');
  const [metricaGrafico, setMetricaGrafico] = useState<'valor' | 'quantidade'>('valor');
  
  // Estados para comparativo
  const [comparativoAtivo, setComparativoAtivo] = useState(false);
  const [periodo2Mes, setPeriodo2Mes] = useState<number>(currentDate.getMonth()); // Mês anterior
  const [periodo2Ano, setPeriodo2Ano] = useState<number>(currentDate.getFullYear());
  
  // Estados para drill-down
  const [drillDownAberto, setDrillDownAberto] = useState(false);
  const [drillDownDados, setDrillDownDados] = useState<any[]>([]);
  const [drillDownTitulo, setDrillDownTitulo] = useState("");
  
  // Estados para salvar dashboard
  const [salvarDialogAberto, setSalvarDialogAberto] = useState(false);
  const [carregarDialogAberto, setCarregarDialogAberto] = useState(false);
  const [nomeDashboard, setNomeDashboard] = useState("");
  const [descricaoDashboard, setDescricaoDashboard] = useState("");
  const [dashboardParaExcluir, setDashboardParaExcluir] = useState<number | null>(null);
  
  // Lista de anos
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => anoAtual - i);
  }, []);

  // Calcular datas
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
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      convenio: convenioFiltro || undefined,
      tipo: tipoFiltro !== 'all' ? tipoFiltro as 'MATERIAL' | 'HONORARIO' : undefined,
      limite: 50000,
    },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar dados por convênio para lista de filtros
  const { data: dadosPorConvenio } = trpc.importacaoTasy.porConvenio.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0 },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar dados comparativos
  const { data: dadosComparativo, isLoading: loadingComparativo } = trpc.importacaoTasy.comparativo.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      periodo1Mes: mesSelecionado,
      periodo1Ano: anoSelecionado,
      periodo2Mes: periodo2Mes,
      periodo2Ano: periodo2Ano,
      agrupamento: agrupamento as 'convenio' | 'setor' | 'medico' | 'tipo',
    },
    { enabled: !!estabelecimentoAtual && comparativoAtivo }
  );

  // Buscar dashboards salvos
  const { data: dashboardsSalvos, refetch: refetchDashboards } = trpc.dashboards.listar.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id || 0 },
    { enabled: !!estabelecimentoAtual }
  );

  // Mutations para dashboards
  const salvarDashboardMutation = trpc.dashboards.salvar.useMutation({
    onSuccess: () => {
      toast.success("Dashboard salvo com sucesso!");
      setSalvarDialogAberto(false);
      setNomeDashboard("");
      setDescricaoDashboard("");
      refetchDashboards();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar dashboard: ${error.message}`);
    },
  });

  const atualizarDashboardMutation = trpc.dashboards.atualizar.useMutation({
    onSuccess: () => {
      toast.success("Dashboard atualizado!");
      refetchDashboards();
    },
  });

  const excluirDashboardMutation = trpc.dashboards.excluir.useMutation({
    onSuccess: () => {
      toast.success("Dashboard excluído!");
      setDashboardParaExcluir(null);
      refetchDashboards();
    },
  });

  // Lista de convênios únicos
  const conveniosUnicos = useMemo(() => {
    if (!dadosPorConvenio) return [];
    return dadosPorConvenio.map((c: any) => c.convenio).filter(Boolean);
  }, [dadosPorConvenio]);

  // Lista de setores únicos
  const setoresUnicos = useMemo(() => {
    if (!dadosTasy) return [];
    const setores = new Set(dadosTasy.map((d: any) => d.setor).filter(Boolean));
    return Array.from(setores) as string[];
  }, [dadosTasy]);

  // Filtrar dados
  const dadosFiltrados = useMemo(() => {
    if (!dadosTasy) return [];
    
    return dadosTasy.filter((item: any) => {
      if (setorFiltro && item.setor !== setorFiltro) return false;
      return true;
    });
  }, [dadosTasy, setorFiltro]);

  // Agrupar dados para gráficos
  const dadosAgrupados = useMemo(() => {
    if (!dadosFiltrados.length) return [];
    
    const grupos: Record<string, { label: string; valor: number; quantidade: number; itens: any[] }> = {};
    
    for (const item of dadosFiltrados) {
      let chave: string;
      
      switch (agrupamento) {
        case 'convenio':
          chave = item.convenio || 'Não informado';
          break;
        case 'setor':
          chave = item.setor || 'Não informado';
          break;
        case 'tipo':
          chave = item.tipo === 'MATERIAL' ? 'Materiais' : 'Honorários';
          break;
        case 'medico':
          chave = item.medico || 'Não informado';
          break;
        default:
          chave = 'Outros';
      }
      
      if (!grupos[chave]) {
        grupos[chave] = { label: chave, valor: 0, quantidade: 0, itens: [] };
      }
      
      grupos[chave].valor += parseFloat(item.valorTotal || '0');
      grupos[chave].quantidade += parseInt(item.quantidade || '1');
      grupos[chave].itens.push(item);
    }
    
    // Ordenar por valor (maior primeiro)
    return Object.values(grupos).sort((a, b) => b.valor - a.valor);
  }, [dadosFiltrados, agrupamento]);

  // Handler para drill-down nos gráficos
  const handleChartClick = useCallback((event: any, elements: any[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const grupo = dadosAgrupados[index];
      if (grupo) {
        setDrillDownTitulo(`Detalhes: ${grupo.label}`);
        setDrillDownDados(grupo.itens);
        setDrillDownAberto(true);
      }
    }
  }, [dadosAgrupados]);

  // Dados para o gráfico
  const dadosGrafico = useMemo(() => {
    const labels = dadosAgrupados.slice(0, 10).map(d => d.label);
    const valores = dadosAgrupados.slice(0, 10).map(d => 
      metricaGrafico === 'valor' ? d.valor : d.quantidade
    );
    
    return {
      labels,
      datasets: [
        {
          label: metricaGrafico === 'valor' ? 'Valor Total (R$)' : 'Quantidade',
          data: valores,
          backgroundColor: coresGraficos,
          borderColor: coresGraficos.map(c => c.replace('0.8', '1')),
          borderWidth: 1,
        },
      ],
    };
  }, [dadosAgrupados, metricaGrafico]);

  // Dados para gráfico comparativo
  const dadosGraficoComparativo = useMemo(() => {
    if (!dadosComparativo?.dados) return null;
    
    const labels = dadosComparativo.dados.slice(0, 10).map((d: any) => d.chave);
    const valoresPeriodo1 = dadosComparativo.dados.slice(0, 10).map((d: any) => 
      metricaGrafico === 'valor' ? d.periodo1.valorTotal : d.periodo1.quantidade
    );
    const valoresPeriodo2 = dadosComparativo.dados.slice(0, 10).map((d: any) => 
      metricaGrafico === 'valor' ? d.periodo2.valorTotal : d.periodo2.quantidade
    );
    
    return {
      labels,
      datasets: [
        {
          label: `${meses[periodo2Mes - 1]?.label || periodo2Mes}/${periodo2Ano}`,
          data: valoresPeriodo1,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: `${meses[mesSelecionado - 1]?.label || mesSelecionado}/${anoSelecionado}`,
          data: valoresPeriodo2,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgba(16, 185, 129, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [dadosComparativo, metricaGrafico, mesSelecionado, anoSelecionado, periodo2Mes, periodo2Ano]);

  // Opções do gráfico com drill-down
  const opcoesGrafico = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: comparativoAtivo 
          ? `Comparativo: ${meses[periodo2Mes - 1]?.label}/${periodo2Ano} vs ${meses[mesSelecionado - 1]?.label}/${anoSelecionado}`
          : `${camposAgrupamento.find(c => c.id === agrupamento)?.label || 'Dados'} - ${metricaGrafico === 'valor' ? 'Valor Total' : 'Quantidade'}`,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            if (metricaGrafico === 'valor') {
              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            return `${value.toLocaleString('pt-BR')} itens`;
          },
          footer: function() {
            return 'Clique para ver detalhes';
          }
        }
      }
    },
    scales: tipoGrafico !== 'pie' ? {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            if (metricaGrafico === 'valor') {
              return `R$ ${(value / 1000).toFixed(0)}k`;
            }
            return value;
          }
        }
      }
    } : undefined,
  }), [handleChartClick, comparativoAtivo, periodo2Mes, periodo2Ano, mesSelecionado, anoSelecionado, agrupamento, metricaGrafico, tipoGrafico]);

  // Totais
  const totais = useMemo(() => {
    if (!dadosFiltrados.length) return { valor: 0, quantidade: 0, materiais: 0, honorarios: 0 };
    
    let valor = 0;
    let quantidade = 0;
    let materiais = 0;
    let honorarios = 0;
    
    for (const item of dadosFiltrados) {
      valor += parseFloat(item.valorTotal || '0');
      quantidade += parseInt(item.quantidade || '1');
      if (item.tipo === 'MATERIAL') materiais++;
      else honorarios++;
    }
    
    return { valor, quantidade, materiais, honorarios };
  }, [dadosFiltrados]);

  // Toggle coluna visível
  const toggleColuna = (colunaId: string) => {
    setColunasVisiveis(prev => 
      prev.includes(colunaId)
        ? prev.filter(c => c !== colunaId)
        : [...prev, colunaId]
    );
  };

  // Formatar valor de célula
  const formatarValor = (valor: any, tipo: string) => {
    if (valor === null || valor === undefined) return '-';
    
    switch (tipo) {
      case 'moeda':
        return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      case 'data':
        return valor ? new Date(valor).toLocaleDateString('pt-BR') : '-';
      case 'numero':
        return parseFloat(valor).toLocaleString('pt-BR');
      default:
        return String(valor);
    }
  };

  // Exportar para Excel
  const handleExportExcel = () => {
    if (!dadosFiltrados.length) return;

    const excelData = dadosFiltrados.map((item: any) => {
      const row: Record<string, any> = {};
      for (const coluna of colunasDisponiveis) {
        if (colunasVisiveis.includes(coluna.id)) {
          row[coluna.label] = formatarValor(item[coluna.id], coluna.tipo);
        }
      }
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Tasy");
    XLSX.writeFile(wb, `relatorio_tasy_${meses[mesSelecionado - 1].label}_${anoSelecionado}.xlsx`);
  };

  // Exportar resumo agrupado
  const handleExportResumo = () => {
    if (!dadosAgrupados.length) return;

    const excelData = dadosAgrupados.map((item) => ({
      [camposAgrupamento.find(c => c.id === agrupamento)?.label || 'Grupo']: item.label,
      'Valor Total': item.valor,
      'Quantidade': item.quantidade,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Resumo");
    XLSX.writeFile(wb, `resumo_${agrupamento}_${meses[mesSelecionado - 1].label}_${anoSelecionado}.xlsx`);
  };

  // Salvar dashboard
  const handleSalvarDashboard = () => {
    if (!nomeDashboard.trim()) {
      toast.error("Informe um nome para o dashboard");
      return;
    }

    salvarDashboardMutation.mutate({
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      nome: nomeDashboard,
      descricao: descricaoDashboard,
      configuracao: {
        tipoGrafico,
        agrupamento,
        colunasSelecionadas: colunasVisiveis,
        filtros: {
          mes: mesSelecionado,
          ano: anoSelecionado,
          convenio: convenioFiltro || undefined,
          tipo: tipoFiltro !== 'all' ? tipoFiltro : undefined,
          setor: setorFiltro || undefined,
        },
      },
      comparativoAtivo,
      periodo1Mes: mesSelecionado,
      periodo1Ano: anoSelecionado,
      periodo2Mes: comparativoAtivo ? periodo2Mes : undefined,
      periodo2Ano: comparativoAtivo ? periodo2Ano : undefined,
    });
  };

  // Carregar dashboard
  const handleCarregarDashboard = (dashboard: any) => {
    const config = dashboard.configuracao;
    
    setTipoGrafico(config.tipoGrafico || 'bar');
    setAgrupamento(config.agrupamento || 'convenio');
    setColunasVisiveis(config.colunasSelecionadas || ['atendimento', 'guia', 'convenio', 'paciente', 'tipo', 'valorTotal', 'setor']);
    
    if (config.filtros) {
      if (config.filtros.mes) setMesSelecionado(config.filtros.mes);
      if (config.filtros.ano) setAnoSelecionado(config.filtros.ano);
      setConvenioFiltro(config.filtros.convenio || '');
      setTipoFiltro(config.filtros.tipo || 'all');
      setSetorFiltro(config.filtros.setor || '');
    }
    
    setComparativoAtivo(dashboard.comparativoAtivo || false);
    if (dashboard.periodo2Mes) setPeriodo2Mes(dashboard.periodo2Mes);
    if (dashboard.periodo2Ano) setPeriodo2Ano(dashboard.periodo2Ano);
    
    setCarregarDialogAberto(false);
    toast.success(`Dashboard "${dashboard.nome}" carregado!`);
  };

  // Toggle favorito
  const handleToggleFavorito = (dashboard: any) => {
    atualizarDashboardMutation.mutate({
      id: dashboard.id,
      favorito: !dashboard.favorito,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8" />
              Relatórios Dinâmicos
            </h1>
            <p className="text-muted-foreground">
              Construa relatórios personalizados com os dados do Tasy
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCarregarDialogAberto(true)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Carregar
            </Button>
            <Button variant="outline" onClick={() => setSalvarDialogAberto(true)}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuCheckboxItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Dados Detalhados
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem onClick={handleExportResumo}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Exportar Resumo Agrupado
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes) => (
                      <SelectItem key={mes.value} value={String(mes.value)}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((ano) => (
                      <SelectItem key={ano} value={String(ano)}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Convênio</Label>
                <Select value={convenioFiltro || "all"} onValueChange={(v) => setConvenioFiltro(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {conveniosUnicos.map((conv: string) => (
                      <SelectItem key={conv} value={conv}>
                        {conv}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="MATERIAL">Materiais</SelectItem>
                    <SelectItem value="HONORARIO">Honorários</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={setorFiltro || "all"} onValueChange={(v) => setSetorFiltro(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {setoresUnicos.map((setor: string) => (
                      <SelectItem key={setor} value={setor}>
                        {setor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Agrupar por</Label>
                <Select value={agrupamento} onValueChange={setAgrupamento}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {camposAgrupamento.map((campo) => (
                      <SelectItem key={campo.id} value={campo.id}>
                        {campo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Comparativo entre períodos */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                  <Label htmlFor="comparativo">Comparar com outro período</Label>
                </div>
                <Switch
                  id="comparativo"
                  checked={comparativoAtivo}
                  onCheckedChange={setComparativoAtivo}
                />
              </div>
              
              {comparativoAtivo && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Mês Comparação</Label>
                    <Select value={String(periodo2Mes)} onValueChange={(v) => setPeriodo2Mes(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {meses.map((mes) => (
                          <SelectItem key={mes.value} value={String(mes.value)}>
                            {mes.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ano Comparação</Label>
                    <Select value={String(periodo2Ano)} onValueChange={(v) => setPeriodo2Ano(Number(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {anos.map((ano) => (
                          <SelectItem key={ano} value={String(ano)}>
                            {ano}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cards de Totais */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totais.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              {comparativoAtivo && dadosComparativo && (
                <p className={`text-xs flex items-center gap-1 ${
                  dadosComparativo.totais.periodo2.valorTotal > dadosComparativo.totais.periodo1.valorTotal 
                    ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dadosComparativo.totais.periodo2.valorTotal > dadosComparativo.totais.periodo1.valorTotal 
                    ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {((dadosComparativo.totais.periodo2.valorTotal - dadosComparativo.totais.periodo1.valorTotal) / 
                    (dadosComparativo.totais.periodo1.valorTotal || 1) * 100).toFixed(1)}% vs período anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Itens</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totais.quantidade.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Materiais</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totais.materiais.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Honorários</CardTitle>
              <User className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {totais.honorarios.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="graficos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="graficos" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="tabela" className="flex items-center gap-2">
              <Columns className="h-4 w-4" />
              Tabela Personalizada
            </TabsTrigger>
            <TabsTrigger value="resumo" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Resumo Agrupado
            </TabsTrigger>
            {comparativoAtivo && (
              <TabsTrigger value="comparativo" className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Comparativo
              </TabsTrigger>
            )}
          </TabsList>

          {/* Aba de Gráficos */}
          <TabsContent value="graficos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Visualização Gráfica</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Clique em uma barra ou fatia para ver os detalhes
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={tipoGrafico} onValueChange={(v) => setTipoGrafico(v as 'bar' | 'pie' | 'line')}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Barras
                          </div>
                        </SelectItem>
                        <SelectItem value="pie">
                          <div className="flex items-center gap-2">
                            <PieChart className="h-4 w-4" />
                            Pizza
                          </div>
                        </SelectItem>
                        <SelectItem value="line">
                          <div className="flex items-center gap-2">
                            <LineChart className="h-4 w-4" />
                            Linhas
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={metricaGrafico} onValueChange={(v) => setMetricaGrafico(v as 'valor' | 'quantidade')}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor">Valor (R$)</SelectItem>
                        <SelectItem value="quantidade">Quantidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : dadosAgrupados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado
                  </div>
                ) : (
                  <div className="h-[400px]">
                    {tipoGrafico === 'bar' && <Bar data={dadosGrafico} options={opcoesGrafico} />}
                    {tipoGrafico === 'pie' && <Pie data={dadosGrafico} options={opcoesGrafico} />}
                    {tipoGrafico === 'line' && <Line data={dadosGrafico} options={opcoesGrafico} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Tabela */}
          <TabsContent value="tabela">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Dados Detalhados</CardTitle>
                    <CardDescription>Selecione as colunas que deseja visualizar</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Columns className="h-4 w-4 mr-2" />
                        Colunas
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-[400px] overflow-auto">
                      {colunasDisponiveis.map((coluna) => (
                        <DropdownMenuCheckboxItem
                          key={coluna.id}
                          checked={colunasVisiveis.includes(coluna.id)}
                          onCheckedChange={() => toggleColuna(coluna.id)}
                        >
                          {coluna.label}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : dadosFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto max-h-[500px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          {colunasDisponiveis
                            .filter(c => colunasVisiveis.includes(c.id))
                            .map((coluna) => (
                              <TableHead key={coluna.id}>{coluna.label}</TableHead>
                            ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dadosFiltrados.slice(0, 100).map((item: any, index: number) => (
                          <TableRow key={`${item.id}-${index}`}>
                            {colunasDisponiveis
                              .filter(c => colunasVisiveis.includes(c.id))
                              .map((coluna) => (
                                <TableCell key={coluna.id}>
                                  {coluna.id === 'tipo' ? (
                                    <Badge variant={item.tipo === 'MATERIAL' ? 'default' : 'secondary'}>
                                      {item.tipo === 'MATERIAL' ? 'Mat' : 'Hon'}
                                    </Badge>
                                  ) : (
                                    formatarValor(item[coluna.id], coluna.tipo)
                                  )}
                                </TableCell>
                              ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {dadosFiltrados.length > 100 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Mostrando os primeiros 100 itens de {dadosFiltrados.length}. Exporte para Excel para ver todos.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Resumo Agrupado */}
          <TabsContent value="resumo">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resumo Agrupado</CardTitle>
                    <CardDescription>Totais agrupados por categoria</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : dadosAgrupados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado encontrado
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{camposAgrupamento.find(c => c.id === agrupamento)?.label || 'Grupo'}</TableHead>
                          <TableHead className="text-right">Quantidade</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead className="text-right">% do Total</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dadosAgrupados.map((item, index) => (
                          <TableRow key={`${item.label}-${index}`}>
                            <TableCell className="font-medium">{item.label}</TableCell>
                            <TableCell className="text-right">{item.quantidade.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">
                                {totais.valor > 0 ? ((item.valor / totais.valor) * 100).toFixed(1) : 0}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDrillDownTitulo(`Detalhes: ${item.label}`);
                                  setDrillDownDados(item.itens);
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Comparativo */}
          {comparativoAtivo && (
            <TabsContent value="comparativo">
              <Card>
                <CardHeader>
                  <CardTitle>Comparativo entre Períodos</CardTitle>
                  <CardDescription>
                    {meses[periodo2Mes - 1]?.label}/{periodo2Ano} vs {meses[mesSelecionado - 1]?.label}/{anoSelecionado}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingComparativo ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !dadosComparativo ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum dado encontrado
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Gráfico comparativo */}
                      {dadosGraficoComparativo && (
                        <div className="h-[400px]">
                          <Bar data={dadosGraficoComparativo} options={opcoesGrafico} />
                        </div>
                      )}

                      {/* Tabela comparativa */}
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{camposAgrupamento.find(c => c.id === agrupamento)?.label || 'Grupo'}</TableHead>
                              <TableHead className="text-right">{meses[periodo2Mes - 1]?.label}/{periodo2Ano}</TableHead>
                              <TableHead className="text-right">{meses[mesSelecionado - 1]?.label}/{anoSelecionado}</TableHead>
                              <TableHead className="text-right">Diferença</TableHead>
                              <TableHead className="text-right">Variação %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dadosComparativo.dados.map((item: any, index: number) => (
                              <TableRow key={`${item.chave}-${index}`}>
                                <TableCell className="font-medium">{item.chave}</TableCell>
                                <TableCell className="text-right">
                                  {item.periodo1.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.periodo2.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className={`text-right font-medium ${item.diferencaValor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.diferencaValor >= 0 ? '+' : ''}{item.diferencaValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={item.variacaoPercentual >= 0 ? 'default' : 'destructive'}>
                                    {item.variacaoPercentual >= 0 ? '+' : ''}{item.variacaoPercentual.toFixed(1)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Modal de Drill-down */}
        <Dialog open={drillDownAberto} onOpenChange={setDrillDownAberto}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {drillDownTitulo}
              </DialogTitle>
              <DialogDescription>
                {drillDownDados.length} itens encontrados
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Atendimento</TableHead>
                    <TableHead>Guia</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drillDownDados.slice(0, 100).map((item: any, index: number) => (
                    <TableRow key={`drill-${index}`}>
                      <TableCell>{item.atendimento}</TableCell>
                      <TableCell>{item.guia}</TableCell>
                      <TableCell>{item.paciente}</TableCell>
                      <TableCell>{item.codigo || item.codigoConvenio}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.descricao}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {parseFloat(item.valorTotal || '0').toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {drillDownDados.length > 100 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Mostrando os primeiros 100 itens de {drillDownDados.length}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDrillDownAberto(false)}>
                Fechar
              </Button>
              <Button onClick={() => {
                const excelData = drillDownDados.map((item: any) => ({
                  'Atendimento': item.atendimento,
                  'Guia': item.guia,
                  'Paciente': item.paciente,
                  'Código': item.codigo || item.codigoConvenio,
                  'Descrição': item.descricao,
                  'Quantidade': item.quantidade,
                  'Valor Total': parseFloat(item.valorTotal || '0'),
                }));
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.json_to_sheet(excelData);
                XLSX.utils.book_append_sheet(wb, ws, "Detalhes");
                XLSX.writeFile(wb, `detalhes_${drillDownTitulo.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
              }}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Salvar Dashboard */}
        <Dialog open={salvarDialogAberto} onOpenChange={setSalvarDialogAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Save className="h-5 w-5" />
                Salvar Dashboard
              </DialogTitle>
              <DialogDescription>
                Salve a configuração atual para acesso rápido
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Dashboard</Label>
                <Input
                  id="nome"
                  placeholder="Ex: Faturamento Mensal por Convênio"
                  value={nomeDashboard}
                  onChange={(e) => setNomeDashboard(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Descreva o propósito deste dashboard..."
                  value={descricaoDashboard}
                  onChange={(e) => setDescricaoDashboard(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSalvarDialogAberto(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSalvarDashboard} disabled={salvarDashboardMutation.isPending}>
                {salvarDashboardMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Carregar Dashboard */}
        <Dialog open={carregarDialogAberto} onOpenChange={setCarregarDialogAberto}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Carregar Dashboard
              </DialogTitle>
              <DialogDescription>
                Selecione um dashboard salvo para carregar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {!dashboardsSalvos?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dashboard salvo
                </div>
              ) : (
                dashboardsSalvos.map((dashboard: any) => (
                  <div
                    key={dashboard.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleCarregarDashboard(dashboard)}
                  >
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorito(dashboard);
                        }}
                      >
                        {dashboard.favorito ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <div>
                        <p className="font-medium">{dashboard.nome}</p>
                        {dashboard.descricao && (
                          <p className="text-sm text-muted-foreground">{dashboard.descricao}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Criado em {new Date(dashboard.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDashboardParaExcluir(dashboard.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCarregarDialogAberto(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmação de Exclusão */}
        <AlertDialog open={!!dashboardParaExcluir} onOpenChange={() => setDashboardParaExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Dashboard</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este dashboard? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (dashboardParaExcluir) {
                    excluirDashboardMutation.mutate({ id: dashboardParaExcluir });
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
