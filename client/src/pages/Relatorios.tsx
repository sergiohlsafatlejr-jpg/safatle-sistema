import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  FileText, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  Download,
  Calendar
} from "lucide-react";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatDateBR } from "@/lib/dateUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState<string>("resumo");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [convenioId, setConvenioId] = useState<string>("todos");

  const { data: resumo } = trpc.dashboard.resumo.useQuery();
  const { data: comparacoes } = trpc.comparacoes.list.useQuery({
    convenioId: convenioId !== "todos" ? parseInt(convenioId) : undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });
  const { data: convenios } = trpc.convenios.list.useQuery({ ativo: "sim" });

  // Prepare chart data
  const statusData = [
    { name: "Processados", value: resumo?.arquivos?.processados || 0 },
    { name: "Pendentes", value: resumo?.arquivos?.pendentes || 0 },
    { name: "Erros", value: resumo?.arquivos?.erros || 0 },
  ];

  const direcaoData = [
    { name: "Enviados", value: resumo?.arquivos?.enviados || 0 },
    { name: "Retornados", value: resumo?.arquivos?.retornados || 0 },
  ];

  const comparacoesData = [
    { name: "Concluídas", value: resumo?.comparacoes?.concluidas || 0 },
    { name: "Com Divergências", value: resumo?.comparacoes?.comDivergencias || 0 },
    { name: "Pendentes", value: resumo?.comparacoes?.pendentes || 0 },
  ];

  // Calculate divergence stats from comparacoes
  const divergenciasStats = comparacoes?.reduce((acc, comp) => {
    acc.total += comp.totalDivergencias || 0;
    acc.valorTotal += parseFloat(comp.diferencaValor || "0");
    return acc;
  }, { total: 0, valorTotal: 0 }) || { total: 0, valorTotal: 0 };

  const handleExportCSV = () => {
    if (!comparacoes) return;

    const headers = ["ID", "Convênio", "Itens Enviados", "Itens Retornados", "Valor Enviado", "Valor Retornado", "Divergências", "Data"];
    const rows = comparacoes.map(comp => [
      comp.id,
      convenios?.find(c => c.id === comp.convenioId)?.nome || "",
      comp.totalItensEnviados || 0,
      comp.totalItensRetornados || 0,
      comp.valorTotalEnviado || "0",
      comp.valorTotalRetornado || "0",
      comp.totalDivergencias || 0,
      formatDateBR(comp.createdAt),
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_comparacoes_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios</h1>
          <p className="text-slate-500">
            Visualize estatísticas e gere relatórios do sistema
          </p>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Tipo de Relatório</Label>
                <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resumo">Resumo Geral</SelectItem>
                    <SelectItem value="comparacoes">Comparações</SelectItem>
                    <SelectItem value="divergencias">Divergências</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Convênio</Label>
                <Select value={convenioId} onValueChange={setConvenioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos convênios</SelectItem>
                    {convenios?.map((conv) => (
                      <SelectItem key={conv.id} value={conv.id.toString()}>
                        {conv.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">{resumo?.arquivos?.total || 0}</p>
                  <p className="text-sm text-slate-500">Arquivos Totais</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">{resumo?.comparacoes?.total || 0}</p>
                  <p className="text-sm text-slate-500">Comparações</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900">{divergenciasStats.total}</p>
                  <p className="text-sm text-slate-500">Divergências</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <PieChart className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    R$ {Math.abs(divergenciasStats.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-slate-500">Diferença Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status dos Arquivos */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Status dos Arquivos</CardTitle>
              <CardDescription>Distribuição por status de processamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Direção dos Arquivos */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Direção dos Arquivos</CardTitle>
              <CardDescription>Enviados vs Retornados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={direcaoData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status das Comparações */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Status das Comparações</CardTitle>
              <CardDescription>Distribuição por resultado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparacoesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {comparacoesData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Export Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Exportar Dados</CardTitle>
              <CardDescription>Baixe os dados em formato CSV</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Exporte os dados das comparações filtradas para análise externa. 
                O arquivo CSV incluirá informações sobre convênios, valores e divergências.
              </p>
              
              <div className="flex gap-3">
                <Button onClick={handleExportCSV} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Comparações (CSV)
                </Button>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-700 mb-2">Dados incluídos:</p>
                <ul className="text-sm text-slate-500 space-y-1">
                  <li>• ID da comparação</li>
                  <li>• Nome do convênio</li>
                  <li>• Quantidade de itens enviados e retornados</li>
                  <li>• Valores totais</li>
                  <li>• Número de divergências</li>
                  <li>• Data da comparação</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
