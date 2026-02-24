import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users, Building2, Stethoscope, FlaskConical,
  ArrowUpDown, Download, RefreshCw, Search, ArrowLeft, Clock
} from "lucide-react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { useState, useMemo } from "react";

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

  // Buscar dados da procedure
  const { data: atendimentos = [], isLoading, refetch } = trpc.atendimentos.listarParadosUnificados.useQuery();

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
      "Paciente": a.paciente,
      "Convênio": a.convenio,
      "Data Entrada": a.data_entrada,
      "Data Saída": a.data_saida,
      "Dias Parado": a.diasParado,
      "Tipo": a.tipo_atendimento,
      "Descrição": a.descricao_atendimento,
      "Serviço": a.codigo_servico,
      "Origem": a.origemSistema,
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimentos");
    XLSX.writeFile(wb, `atendimentos-parados-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Arquivo exportado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
                Atendimentos Parados Unificados
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total de Atendimentos</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Dias Parado (Total)</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.diasParado}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Média de Dias</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.mediaDias}</p>
                </div>
                <Stethoscope className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Sistemas</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {new Set(atendimentos.map(a => a.origemSistema)).size}
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-purple-400" />
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Pesquisar por nº atendimento, paciente ou convênio..."
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
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 mb-6">
              <Button
                onClick={exportToExcel}
                disabled={sortedData.length === 0}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
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
                        Nº Atendimento
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("paciente")}>
                      <div className="flex items-center gap-2">
                        Paciente
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("convenio")}>
                      <div className="flex items-center gap-2">
                        Convênio
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("data_entrada")}>
                      <div className="flex items-center gap-2">
                        Data Entrada
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("diasParado")}>
                      <div className="flex items-center gap-2">
                        Dias Parado
                        <ArrowUpDown className="w-4 h-4" />
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Tipo</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Carregando dados...
                      </td>
                    </tr>
                  ) : sortedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Nenhum atendimento encontrado
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((atendimento) => (
                      <tr key={atendimento.id} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors">
                        <td className="py-3 px-4 text-white font-mono">{atendimento.numero_atendimento}</td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.paciente}</td>
                        <td className="py-3 px-4 text-slate-300">{atendimento.convenio}</td>
                        <td className="py-3 px-4 text-slate-300">
                          {atendimento.data_entrada ? new Date(atendimento.data_entrada).toLocaleDateString("pt-BR") : "-"}
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
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs">
                            {atendimento.origemSistema}
                          </Badge>
                        </td>
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
