import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, Building2, Stethoscope, FlaskConical,
  ArrowUpDown, Download, RefreshCw, Search, ArrowLeft, Clock, BarChart3
} from "lucide-react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type SortColumn = "numero_atendimento" | "paciente" | "convenio" | "data_entrada" | "data_saida" | "diasParado" | "descricao_atendimento" | "codigo_servico";
type SortOrder = "asc" | "desc";

interface AtendimentoUnificado {
  id: number;
  origemSistema: string;
  origemId: string;
  estabelecimentoId: number;
  numero_atendimento?: string;
  codigo_saida?: string;
  convenio?: string;
  paciente?: string;
  caracter_atendimento?: string;
  data_entrada?: string;
  data_saida?: string | null;
  tipo_atendimento?: string;
  descricao_atendimento?: string;
  codigo_servico?: string;
  codigo_procedimento?: string;
  destino_conta?: string;
  diasParado: number;
  dataSincronizacao?: string;
}

export default function AtendimentosParadosUnificados() {
  const [, navigate] = useLocation();
  const [sortColumn, setSortColumn] = useState<SortColumn>("data_entrada");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroConvenio, setFiltroConvenio] = useState<string>("");

  // Buscar dados
  const { data: atendimentos = [], isLoading, refetch } = trpc.atendimentos.listarParadosUnificados.useQuery();
  const { data: kpis, isLoading: loadingKPIs } = trpc.atendimentos.getKPIs.useQuery();
  const { data: quantidadePorPlano, isLoading: loadingPlano } = trpc.atendimentos.getQuantidadePorPlano.useQuery();
  const { data: quantidadePorServico, isLoading: loadingServico } = trpc.atendimentos.getQuantidadePorServico.useQuery();

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!atendimentos || atendimentos.length === 0) {
      return {
        total: 0,
        diasParado: 0,
        mediaDias: 0,
        porTipo: {},
        porConvenio: {},
      };
    }

    const total = atendimentos.length;
    const diasParado = atendimentos.reduce((sum, a) => sum + (a.diasParado || 0), 0);
    const mediaDias = Math.round(diasParado / total);

    const porTipo: Record<string, number> = {};
    const porConvenio: Record<string, number> = {};

    atendimentos.forEach(a => {
      if (a.tipo_atendimento) {
        porTipo[a.tipo_atendimento] = (porTipo[a.tipo_atendimento] || 0) + 1;
      }
      if (a.convenio) {
        porConvenio[a.convenio] = (porConvenio[a.convenio] || 0) + 1;
      }
    });

    return { total, diasParado, mediaDias, porTipo, porConvenio };
  }, [atendimentos]);

  // Filtrar dados
  const filteredData = useMemo(() => {
    let filtered = atendimentos || [];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.numero_atendimento?.toLowerCase().includes(term)) ||
        (a.paciente?.toLowerCase().includes(term)) ||
        (a.convenio?.toLowerCase().includes(term))
      );
    }

    if (filtroTipo) {
      filtered = filtered.filter(a => a.tipo_atendimento === filtroTipo);
    }

    if (filtroConvenio) {
      filtered = filtered.filter(a => a.convenio === filtroConvenio);
    }

    return filtered;
  }, [atendimentos, searchTerm, filtroTipo, filtroConvenio]);

  // Ordenar dados
  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];

      if (aVal === null || aVal === undefined) aVal = "";
      if (bVal === null || bVal === undefined) bVal = "";

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  }, [filteredData, sortColumn, sortOrder]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sortedData.map(a => ({
      "Nº Atendimento": a.numero_atendimento,
      "Plano": a.convenio,
      "Paciente": a.paciente,
      "Caráter": a.caracter_atendimento,
      "Data Entrada": a.data_entrada,
      "Data Saída": a.data_saida,
      "Dias Parado": a.diasParado,
      "Tipo": a.tipo_atendimento,
      "Serviço": a.codigo_servico,
      "Proc. Principal": a.codigo_procedimento,
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimentos");
    XLSX.writeFile(wb, `atendimentos-parados-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Arquivo exportado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-400" />
                Atendimentos Parados
              </h1>
              <p className="text-slate-400 mt-1">Consolidado de todos os sistemas</p>
            </div>
          </div>
          <Button
            onClick={() => refetch()}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-0 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total a Faturar</p>
                  <p className="text-4xl font-bold mt-2">{kpis?.totalAFaturar || 0}</p>
                </div>
                <Users className="w-12 h-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-900 to-orange-800 border-0 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Internação</p>
                  <p className="text-4xl font-bold mt-2">{kpis?.internacao || 0}</p>
                </div>
                <Stethoscope className="w-12 h-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900 to-purple-800 border-0 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Exame</p>
                  <p className="text-4xl font-bold mt-2">{kpis?.exame || 0}</p>
                </div>
                <FlaskConical className="w-12 h-12 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-900 to-cyan-800 border-0 text-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Ambulatório</p>
                  <p className="text-4xl font-bold mt-2">{kpis?.ambulatorio || 0}</p>
                </div>
                <Building2 className="w-12 h-12 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico por Plano */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Quantidade por Plano (Convênio)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPlano ? (
                <div className="text-center text-slate-400">Carregando...</div>
              ) : quantidadePorPlano && quantidadePorPlano.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quantidadePorPlano}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="plano" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                    <Bar dataKey="quantidade" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400">Sem dados</div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico por Serviço */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Quantidade por Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingServico ? (
                <div className="text-center text-slate-400">Carregando...</div>
              ) : quantidadePorServico && quantidadePorServico.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quantidadePorServico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="servico" stroke="#94a3b8" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "8px" }} />
                    <Bar dataKey="quantidade" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400">Sem dados</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filtros e Tabela */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Pesquisar por nº atend, paciente ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>

              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">Todos os Tipos</option>
                {Object.keys(stats.porTipo).map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>

              <select
                value={filtroConvenio}
                onChange={(e) => setFiltroConvenio(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="">Todos os Convênios</option>
                {Object.keys(stats.porConvenio).map(convenio => (
                  <option key={convenio} value={convenio}>{convenio}</option>
                ))}
              </select>

              <Button
                onClick={exportToExcel}
                disabled={sortedData.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </div>

            {/* Tabela */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("numero_atendimento")}>
                      <div className="flex items-center gap-2">
                        Nº Atend
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("convenio")}>
                      <div className="flex items-center gap-2">
                        Plano
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("paciente")}>
                      <div className="flex items-center gap-2">
                        Paciente
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Caráter</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("data_entrada")}>
                      <div className="flex items-center gap-2">
                        Data Entrada
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Data Saída</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("diasParado")}>
                      <div className="flex items-center gap-2">
                        Dias Parado
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Serviço</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Proc. Principal</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400">
                        Carregando dados...
                      </td>
                    </tr>
                  ) : sortedData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400">
                        Nenhum atendimento encontrado
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((atendimento) => (
                      <tr key={atendimento.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <td className="py-3 px-4 text-white font-mono">{atendimento.numero_atendimento}</td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.convenio}</td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.paciente}</td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.caracter_atendimento}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {atendimento.data_entrada ? new Date(atendimento.data_entrada).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {atendimento.data_saida ? new Date(atendimento.data_saida).toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={atendimento.diasParado > 30 ? "destructive" : atendimento.diasParado > 15 ? "secondary" : "default"}
                            className="font-semibold"
                          >
                            {atendimento.diasParado} dias
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.tipo_atendimento}</td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.codigo_servico}</td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.codigo_procedimento}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Resumo */}
            <div className="mt-6 pt-6 border-t border-slate-700 text-slate-400 text-sm">
              Exibindo <span className="text-white font-semibold">{sortedData.length}</span> de <span className="text-white font-semibold">{atendimentos.length}</span> atendimentos
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
