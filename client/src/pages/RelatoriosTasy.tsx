import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  BarChart3, 
  PieChart, 
  LineChart,
  RefreshCw, 
  FileSpreadsheet,
  Settings2,
  Columns,
  Filter,
  Download,
  TrendingUp,
  DollarSign,
  Package,
  Stethoscope,
  Building2,
  User,
  Calendar,
  ChevronDown
} from "lucide-react";
import { useState, useMemo } from "react";
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
  { id: 'mesAno', label: 'Mês/Ano', icon: Calendar },
  { id: 'statusProtocolo', label: 'Status Protocolo', icon: Filter },
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

export default function RelatoriosTasy() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  
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
  
  // Calcular datas
  const dataInicio = useMemo(() => {
    return `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`;
  }, [mesSelecionado, anoSelecionado]);
  
  const dataFim = useMemo(() => {
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
  
  // Lista de anos
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => anoAtual - i);
  }, []);

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
    
    const grupos: Record<string, { label: string; valor: number; quantidade: number }> = {};
    
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
        case 'mesAno':
          if (item.dataFaturado) {
            const data = new Date(item.dataFaturado);
            chave = `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
          } else {
            chave = 'Sem data';
          }
          break;
        case 'statusProtocolo':
          chave = item.statusProtocolo || 'Não informado';
          break;
        default:
          chave = 'Outros';
      }
      
      if (!grupos[chave]) {
        grupos[chave] = { label: chave, valor: 0, quantidade: 0 };
      }
      
      grupos[chave].valor += parseFloat(item.valorTotal || '0');
      grupos[chave].quantidade += parseInt(item.quantidade || '1');
    }
    
    // Ordenar por valor (maior primeiro)
    return Object.values(grupos).sort((a, b) => b.valor - a.valor);
  }, [dadosFiltrados, agrupamento]);

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

  // Opções do gráfico
  const opcoesGrafico = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${camposAgrupamento.find(c => c.id === agrupamento)?.label || 'Dados'} - ${metricaGrafico === 'valor' ? 'Valor Total' : 'Quantidade'}`,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.raw;
            if (metricaGrafico === 'valor') {
              return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            }
            return `${value.toLocaleString('pt-BR')} itens`;
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
  };

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
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setConvenioFiltro("");
                    setTipoFiltro("all");
                    setSetorFiltro("");
                    setMesSelecionado(currentDate.getMonth() + 1);
                    setAnoSelecionado(currentDate.getFullYear());
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div className="text-2xl font-bold text-green-600">
                  {totais.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <div className="text-2xl font-bold">{dadosFiltrados.length.toLocaleString('pt-BR')}</div>
              </div>
              <p className="text-xs text-muted-foreground">Total de Itens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-500" />
                <div className="text-2xl font-bold text-amber-600">{totais.materiais.toLocaleString('pt-BR')}</div>
              </div>
              <p className="text-xs text-muted-foreground">Materiais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-purple-500" />
                <div className="text-2xl font-bold text-purple-600">{totais.honorarios.toLocaleString('pt-BR')}</div>
              </div>
              <p className="text-xs text-muted-foreground">Honorários</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs para Gráficos e Tabela */}
        <Tabs defaultValue="graficos" className="space-y-4">
          <TabsList>
            <TabsTrigger value="graficos">
              <BarChart3 className="h-4 w-4 mr-2" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="tabela">
              <Columns className="h-4 w-4 mr-2" />
              Tabela Personalizada
            </TabsTrigger>
            <TabsTrigger value="resumo">
              <TrendingUp className="h-4 w-4 mr-2" />
              Resumo Agrupado
            </TabsTrigger>
          </TabsList>

          {/* Aba de Gráficos */}
          <TabsContent value="graficos">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Visualização Gráfica</CardTitle>
                    <CardDescription>Analise os dados visualmente</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={agrupamento} onValueChange={setAgrupamento}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Agrupar por" />
                      </SelectTrigger>
                      <SelectContent>
                        {camposAgrupamento.map((campo) => (
                          <SelectItem key={campo.id} value={campo.id}>
                            {campo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={metricaGrafico} onValueChange={(v: 'valor' | 'quantidade') => setMetricaGrafico(v)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Métrica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="valor">Valor (R$)</SelectItem>
                        <SelectItem value="quantidade">Quantidade</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex border rounded-md">
                      <Button 
                        variant={tipoGrafico === 'bar' ? 'default' : 'ghost'} 
                        size="sm"
                        onClick={() => setTipoGrafico('bar')}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={tipoGrafico === 'pie' ? 'default' : 'ghost'} 
                        size="sm"
                        onClick={() => setTipoGrafico('pie')}
                      >
                        <PieChart className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={tipoGrafico === 'line' ? 'default' : 'ghost'} 
                        size="sm"
                        onClick={() => setTipoGrafico('line')}
                      >
                        <LineChart className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-[400px]">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : dadosAgrupados.length === 0 ? (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    Nenhum dado encontrado para o período selecionado
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

          {/* Aba de Tabela Personalizada */}
          <TabsContent value="tabela">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tabela Personalizada</CardTitle>
                    <CardDescription>Selecione as colunas que deseja visualizar</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
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
                  <Select value={agrupamento} onValueChange={setAgrupamento}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Agrupar por" />
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
