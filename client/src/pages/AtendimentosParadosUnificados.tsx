'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowUpDown, Download, RefreshCw, Search, X, ChevronLeft, ChevronRight, Eye,
  Users, Building2, Stethoscope, FlaskConical, Bell, Mail
} from "lucide-react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";

type SortColumn = "numero_atendimento" | "paciente" | "convenio" | "data_entrada" | "data_saida" | "diasParado" | "descricao_atendimento" | "codigo_servico" | "valorConta" | "etapaConta" | "medicoResp" | "matricula" | "setorEtapa" | "dtEtapa" | "userEtapa" | "tipo_atendimento";
type SortOrder = "asc" | "desc";

interface AtendimentoUnificado {
  id: number;
  origemSistema: string;
  origemId: string;
  estabelecimentoId: number;
  numero_atendimento?: string | null;
  codigo_saida?: string | null;
  convenio?: string | null;
  paciente?: string | null;
  caracter_atendimento?: string | null;
  data_entrada?: string | Date | null;
  data_saida?: string | Date | null;
  tipo_atendimento?: string | null;
  descricao_atendimento?: string | null;
  codigo_servico?: string | null;
  codigo_procedimento?: string | null;
  destino_conta?: string | null;
  diasParado: number;
  dataSincronizacao?: string | Date | null;
  atualizadoEm?: Date | null;
  dsCategoria?: string | null;
  dsPlano?: string | null;
  competencia?: string | null;
  referencia?: string | null;
  protTasy?: string | null;
  nomeProtocolo?: string | null;
  protConv?: string | null;
  dtEntrega?: string | Date | null;
  protStatus?: string | null;
  titulo?: string | null;
  dtTitulo?: string | Date | null;
  dataVencimento?: string | Date | null;
  dsSetorEntrada?: string | null;
  dsSetorLeito?: string | null;
  etapaConta?: string | null;
  setorEtapa?: string | null;
  dtEtapa?: string | Date | null;
  userEtapa?: string | null;
  motivoDevolucao?: string | null;
  conta?: string | null;
  autorizacao?: string | null;
  valorConta?: string | number | null;
  matricula?: string | null;
  sexo?: string | null;
  idade?: string | null;
  medicoResp?: string | null;
  crm?: string | null;
  dsMotivoAlta?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  codServico?: string | null;
  centroCusto?: string | null;
}

const PAGE_SIZE = 50;

// Tipos de origem
type OrigemSistema = "tasy" | "WARLEINE" | "EASYVISION" | "all";

export default function AtendimentosParadosUnificados() {
  const [sortColumn, setSortColumn] = useState<SortColumn>("data_entrada");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("");
  const [filtroConvenio, setFiltroConvenio] = useState<string>("");
  const [filtroServico, setFiltroServico] = useState<string>("");
  const [filtroEtapa, setFiltroEtapa] = useState<string>("");
  const [filtroOrigem, setFiltroOrigem] = useState<OrigemSistema>("all");
  const [filtroProtocolo, setFiltroProtocolo] = useState<string>("all"); // "all" | "null" | "com_protocolo" | nome específico
  const [selectedRow, setSelectedRow] = useState<AtendimentoUnificado | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Buscar dados
  const { data: atendimentos = [], isLoading, refetch } = trpc.atendimentos.listarParadosUnificados.useQuery();

  // Filtrar e ordenar dados
  const filteredData = useMemo(() => {
    let filtered = [...atendimentos];

    // Filtro por origem do sistema
    if (filtroOrigem !== "all") {
      filtered = filtered.filter(a => a.origemSistema?.toLowerCase() === filtroOrigem.toLowerCase());
    }

    // Filtro por nome_protocolo
    if (filtroProtocolo !== "all") {
      if (filtroProtocolo === "null") {
        filtered = filtered.filter(a => !(a as any).nomeProtocolo);
      } else if (filtroProtocolo === "com_protocolo") {
        filtered = filtered.filter(a => !!(a as any).nomeProtocolo);
      } else {
        filtered = filtered.filter(a => (a as any).nomeProtocolo === filtroProtocolo);
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        (a.numero_atendimento?.toLowerCase().includes(term)) ||
        (a.paciente?.toLowerCase().includes(term)) ||
        (a.convenio?.toLowerCase().includes(term)) ||
        ((a as any).matricula?.toLowerCase().includes(term)) ||
        ((a as any).conta?.toLowerCase().includes(term)) ||
        ((a as any).medicoResp?.toLowerCase().includes(term)) ||
        ((a as any).descricao_atendimento?.toLowerCase().includes(term)) ||
        ((a as any).codigo_servico?.toLowerCase().includes(term)) ||
        ((a as any).etapaConta?.toLowerCase().includes(term)) ||
        ((a as any).setorEtapa?.toLowerCase().includes(term)) ||
        ((a as any).userEtapa?.toLowerCase().includes(term))
      );
    }

    if (filtroTipo) {
      filtered = filtered.filter(a => a.tipo_atendimento === filtroTipo);
    }

    if (filtroConvenio) {
      filtered = filtered.filter(a => a.convenio === filtroConvenio);
    }

    if (filtroServico) {
      filtered = filtered.filter(a => a.descricao_atendimento === filtroServico);
    }

    if (filtroEtapa) {
      filtered = filtered.filter(a => (a as any).etapaConta === filtroEtapa);
    }

    // Ordenar
    filtered.sort((a: any, b: any) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (sortColumn === 'valorConta') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      }
      const comparison = (aVal ?? '') < (bVal ?? '') ? -1 : (aVal ?? '') > (bVal ?? '') ? 1 : 0;
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [atendimentos, searchTerm, filtroTipo, filtroConvenio, filtroServico, filtroEtapa, filtroOrigem, filtroProtocolo, sortColumn, sortOrder]);

  // Detectar a origem predominante dos dados filtrados
  const origemDetectada = useMemo((): OrigemSistema => {
    if (filtroOrigem !== "all") return filtroOrigem;
    const origens = new Set(filteredData.map(a => a.origemSistema?.toLowerCase()));
    if (origens.size === 1) {
      const unica = [...origens][0];
      if (unica === "tasy") return "tasy";
      if (unica === "warleine") return "WARLEINE";
      if (unica === "easyvision") return "EASYVISION";
    }
    return "all";
  }, [filteredData, filtroOrigem]);

  // Calcular quantidade por descrição de atendimento para Tasy
  const quantidadePorDescricao = useMemo(() => {
    const map: Record<string, number> = {};
    const baseData = filtroOrigem === "tasy"
      ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === "tasy")
      : filteredData;
    baseData.forEach(a => {
      const desc = (a as any).descricao_atendimento || "Sem descrição";
      map[desc] = (map[desc] || 0) + 1;
    });
    return map;
  }, [atendimentos, filteredData, filtroOrigem]);

  // Paginação
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  // Reset page when filters change
  useMemo(() => { setCurrentPage(1); }, [searchTerm, filtroTipo, filtroConvenio, filtroServico, filtroEtapa, filtroOrigem, filtroProtocolo]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Exportar Excel com colunas baseadas na origem
  const handleExportExcel = () => {
    const isTasy = filtroOrigem === "tasy";
    
    const data = filteredData.map((a: any) => {
      if (isTasy) {
        return {
          "N° Atend": a.numero_atendimento,
          "Paciente": a.paciente,
          "Plano": a.convenio,
          "Data Entrada": a.data_entrada ? formatDate(a.data_entrada) : "-",
          "Data Saída": a.data_saida ? formatDate(a.data_saida) : "-",
          "Dias Parado": a.diasParado,
          "Tipo Atend.": a.tipo_atendimento,
          "Cód. Serviço": a.codigo_servico,
          "Descrição Atendimento": a.descricao_atendimento,
          "Etapa Conta": a.etapaConta,
          "Setor Etapa": a.setorEtapa,
          "Data Etapa": a.dtEtapa ? formatDate(a.dtEtapa) : "-",
          "Usuário Etapa": a.userEtapa,
          "Nome Protocolo": a.nomeProtocolo || "Sem protocolo",
          "Qtd. Serviço": quantidadePorDescricao[a.descricao_atendimento || "Sem descrição"] || 0,
        };
      } else {
        return {
          "N° Atend": a.numero_atendimento,
          "Plano": a.convenio,
          "Categoria": a.dsCategoria,
          "Plano Detalhe": a.dsPlano,
          "Paciente": a.paciente,
          "Matrícula": a.matricula,
          "Sexo": a.sexo,
          "Idade": a.idade,
          "Caráter": a.caracter_atendimento,
          "Data Entrada": a.data_entrada ? formatDate(a.data_entrada) : "-",
          "Data Saída": a.data_saida ? formatDate(a.data_saida) : "-",
          "Dias Parado": a.diasParado,
          "Tipo": a.tipo_atendimento,
          "Serviço": a.descricao_atendimento,
          "Proc. Principal": a.codigo_procedimento,
          "Conta": a.conta,
          "Autorização": a.autorizacao,
          "Valor Conta": a.valorConta,
          "Etapa Conta": a.etapaConta,
          "Setor Etapa": a.setorEtapa,
          "Data Etapa": a.dtEtapa ? formatDate(a.dtEtapa) : "-",
          "Usuário Etapa": a.userEtapa,
          "Motivo Devolução": a.motivoDevolucao,
          "Competência": a.competencia,
          "Referência": a.referencia,
          "Protocolo Tasy": a.protTasy,
          "Nome Protocolo": a.nomeProtocolo,
          "Protocolo Convênio": a.protConv,
          "Status Protocolo": a.protStatus,
          "Data Entrega": a.dtEntrega ? formatDate(a.dtEntrega) : "-",
          "Título": a.titulo,
          "Data Título": a.dtTitulo ? formatDate(a.dtTitulo) : "-",
          "Data Vencimento": a.dataVencimento ? formatDate(a.dataVencimento) : "-",
          "Setor Entrada": a.dsSetorEntrada,
          "Setor Leito": a.dsSetorLeito,
          "Médico Resp.": a.medicoResp,
          "CRM": a.crm,
          "Motivo Alta": a.dsMotivoAlta,
          "Centro Custo": a.centroCusto,
          "Origem": a.origemSistema,
        };
      }
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Atendimentos");
    XLSX.writeFile(wb, `atendimentos-parados${isTasy ? '-tasy' : ''}.xlsx`);
    toast.success("Arquivo exportado com sucesso!");
  };

  // Calcular quantidade por tipo de atendimento (usando campo tipo_atendimento da tabela)
  const getQuantidadePorTipo = () => {
    const baseData = filtroOrigem !== "all" 
      ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === filtroOrigem.toLowerCase())
      : atendimentos;
    const tipos = [...new Set(baseData.map(a => a.tipo_atendimento).filter(Boolean))];
    return tipos.map(tipo => ({
      tipo,
      quantidade: baseData.filter(a => a.tipo_atendimento === tipo).length
    })).sort((a, b) => b.quantidade - a.quantidade);
  };

  // Calcular quantidade por plano
  const getQuantidadePorPlano = () => {
    const baseData = filtroOrigem !== "all"
      ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === filtroOrigem.toLowerCase())
      : atendimentos;
    const planos = [...new Set(baseData.map(a => a.convenio).filter(Boolean))];
    return planos.map(plano => ({
      plano,
      quantidade: baseData.filter(a => a.convenio === plano).length
    })).sort((a, b) => b.quantidade - a.quantidade);
  };

  // Calcular quantidade por etapa
  const getQuantidadePorEtapa = () => {
    const baseData = filtroOrigem !== "all"
      ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === filtroOrigem.toLowerCase())
      : atendimentos;
    const etapas = [...new Set(baseData.map((a: any) => a.etapaConta).filter(Boolean))];
    return etapas.map(etapa => ({
      etapa,
      quantidade: baseData.filter((a: any) => a.etapaConta === etapa).length
    })).sort((a: any, b: any) => b.quantidade - a.quantidade);
  };

  // Calcular quantidade por origem
  const getQuantidadePorOrigem = () => {
    const origens = [...new Set(atendimentos.map(a => a.origemSistema).filter(Boolean))];
    return origens.map(origem => ({
      origem,
      quantidade: atendimentos.filter(a => a.origemSistema === origem).length
    })).sort((a, b) => b.quantidade - a.quantidade);
  };

  // Calcular quantidade por nome_protocolo (para filtro TASY)
  const getQuantidadePorProtocolo = useMemo(() => {
    const baseData = filtroOrigem === "tasy"
      ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === "tasy")
      : atendimentos;
    const protocolos: Record<string, number> = {};
    let nullCount = 0;
    let comProtocoloCount = 0;
    baseData.forEach((a: any) => {
      if (!a.nomeProtocolo) {
        nullCount++;
      } else {
        comProtocoloCount++;
        protocolos[a.nomeProtocolo] = (protocolos[a.nomeProtocolo] || 0) + 1;
      }
    });
    return {
      nullCount,
      comProtocoloCount,
      protocolos: Object.entries(protocolos).sort((a, b) => b[1] - a[1])
    };
  }, [atendimentos, filtroOrigem]);

  // Calcular quantidade por descrição de atendimento (para seção "Quantidade por Serviço")
  const getQuantidadePorDescricao = useMemo(() => {
    const baseData = filtroOrigem !== "all"
      ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === filtroOrigem.toLowerCase())
      : atendimentos;
    const descs: Record<string, number> = {};
    baseData.forEach((a: any) => {
      const desc = a.descricao_atendimento || "Sem descrição";
      descs[desc] = (descs[desc] || 0) + 1;
    });
    return Object.entries(descs).sort((a, b) => b[1] - a[1]);
  }, [atendimentos, filtroOrigem]);

  // Calcular valor total
  const valorTotal = useMemo(() => {
    return filteredData.reduce((sum, a: any) => sum + (parseFloat(a.valorConta) || 0), 0);
  }, [filteredData]);

  const getTypeColor = (tipo?: string | null) => {
    const t = tipo?.toUpperCase() || '';
    if (t.includes('INTERNACAO') || t.includes('INTERNAÇÃO') || t.includes('INTERNADO')) return 'bg-orange-500 hover:bg-orange-600';
    if (t.includes('EXAME')) return 'bg-purple-500 hover:bg-purple-600';
    if (t.includes('AMBULATORIO') || t.includes('AMBULATÓRIO') || t.includes('AMBULATORIAL')) return 'bg-blue-500 hover:bg-blue-600';
    if (t.includes('PRONTO') || t.includes('SOCORRO')) return 'bg-red-500 hover:bg-red-600';
    return 'bg-slate-600 hover:bg-slate-700';
  };

  const getTypeIcon = (tipo?: string | null) => {
    const t = tipo?.toUpperCase() || '';
    if (t.includes('INTERNACAO') || t.includes('INTERNAÇÃO') || t.includes('INTERNADO')) return <Building2 className="w-5 h-5" />;
    if (t.includes('EXAME')) return <FlaskConical className="w-5 h-5" />;
    if (t.includes('AMBULATORIO') || t.includes('AMBULATÓRIO') || t.includes('AMBULATORIAL')) return <Stethoscope className="w-5 h-5" />;
    if (t.includes('PRONTO') || t.includes('SOCORRO')) return <Users className="w-5 h-5" />;
    return <Users className="w-5 h-5" />;
  };

  const getDiasParadoColor = (dias: number) => {
    if (dias >= 30) return "bg-red-100 text-red-800";
    if (dias >= 15) return "bg-orange-100 text-orange-800";
    return "bg-yellow-100 text-yellow-800";
  };

  const getTipoAtendimentoBadgeColor = (tipo?: string | null) => {
    const t = tipo?.toUpperCase() || '';
    if (t.includes('INTERNACAO') || t.includes('INTERNAÇÃO') || t.includes('INTERNADO')) return "bg-orange-100 text-orange-800";
    if (t.includes('AMBULATORIO') || t.includes('AMBULATÓRIO') || t.includes('AMBULATORIAL')) return "bg-blue-100 text-blue-800";
    if (t.includes('EXAME')) return "bg-purple-100 text-purple-800";
    if (t.includes('PRONTO') || t.includes('SOCORRO')) return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const getOrigemColor = (origem?: string) => {
    const o = origem?.toLowerCase() || '';
    if (o === 'tasy') return 'bg-teal-600 text-white';
    if (o === 'warleine') return 'bg-indigo-600 text-white';
    if (o === 'easyvision') return 'bg-amber-600 text-white';
    return 'bg-slate-600 text-white';
  };

  const getOrigemLabel = (origem?: string) => {
    const o = origem?.toLowerCase() || '';
    if (o === 'tasy') return 'TASY';
    if (o === 'warleine') return 'WARLEINE';
    if (o === 'easyvision') return 'EASYVISION';
    return origem?.toUpperCase() || 'DESCONHECIDO';
  };

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return "-";
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return String(date);
    }
  };

  const formatCurrency = (value: string | number | null | undefined): string => {
    if (!value) return "-";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "-";
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Layout Tasy só ativa quando o usuário seleciona explicitamente o filtro TASY
  const isTasyLayout = filtroOrigem === "tasy";

  // Notificação placeholder
  const handleNotificacao = (atendimento: any) => {
    toast.info(`Notificação para atendimento ${atendimento.numero_atendimento} - Funcionalidade em breve`);
  };

  const handleEnviarEmail = (atendimento: any) => {
    toast.info(`Email para atendimento ${atendimento.numero_atendimento} - Funcionalidade em breve`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Atendimentos Parados</h1>
          <p className="text-slate-400">Acompanhe atendimentos pendentes de faturamento</p>
        </div>

        {/* KPIs por Tipo de Atendimento */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total de Atendimentos</p>
                <p className="text-3xl font-bold text-white">
                  {filtroOrigem !== "all"
                    ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === filtroOrigem.toLowerCase()).length
                    : atendimentos.length}
                </p>
              </div>
              <div className="bg-teal-500/20 p-3 rounded-xl">
                <Users className="w-6 h-6 text-teal-400" />
              </div>
            </CardContent>
          </Card>
          {getQuantidadePorTipo().slice(0, 3).map(({ tipo, quantidade }) => (
            <Card key={tipo} className="bg-slate-800 border-slate-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{tipo}</p>
                  <p className={`text-3xl font-bold ${
                    tipo?.toUpperCase().includes('INTERNADO') ? 'text-orange-400' :
                    tipo?.toUpperCase().includes('PRONTO') ? 'text-red-400' :
                    tipo?.toUpperCase().includes('AMBULAT') ? 'text-blue-400' :
                    'text-purple-400'
                  }`}>{quantidade}</p>
                </div>
                <div className={`p-3 rounded-xl ${
                  tipo?.toUpperCase().includes('INTERNADO') ? 'bg-orange-500/20' :
                  tipo?.toUpperCase().includes('PRONTO') ? 'bg-red-500/20' :
                  tipo?.toUpperCase().includes('AMBULAT') ? 'bg-blue-500/20' :
                  'bg-purple-500/20'
                }`}>
                  {getTypeIcon(tipo)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtro por Sistema de Origem */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader className="py-3">
            <CardTitle className="text-white text-sm">Sistema de Origem</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setFiltroOrigem('all'); setFiltroProtocolo('all'); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filtroOrigem === 'all'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Todos ({atendimentos.length})
              </button>
              {getQuantidadePorOrigem().map(({ origem, quantidade }) => (
                <button
                  key={origem}
                  onClick={() => { setFiltroOrigem(origem as OrigemSistema); setFiltroProtocolo('all'); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroOrigem === origem
                      ? `${getOrigemColor(origem)} shadow-lg`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {getOrigemLabel(origem)} ({quantidade})
                </button>
              ))}
            </div>
            {filtroOrigem !== 'all' && (
              <div className="mt-2 flex items-center gap-2">
                <Badge className={getOrigemColor(filtroOrigem)}>
                  Layout: {getOrigemLabel(filtroOrigem)}
                </Badge>
                <span className="text-slate-400 text-xs">
                  Colunas adaptadas para o sistema {getOrigemLabel(filtroOrigem)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Filtro por Nome Protocolo (só aparece quando TASY está selecionado) */}
        {isTasyLayout && (
          <Card className="bg-slate-800 border-slate-700 mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-white text-sm">Nome Protocolo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                <button
                  onClick={() => setFiltroProtocolo('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroProtocolo === 'all'
                      ? 'bg-cyan-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFiltroProtocolo('null')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroProtocolo === 'null'
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Sem Protocolo ({getQuantidadePorProtocolo.nullCount})
                </button>
                <button
                  onClick={() => setFiltroProtocolo('com_protocolo')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroProtocolo === 'com_protocolo'
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Com Protocolo ({getQuantidadePorProtocolo.comProtocoloCount})
                </button>
                {getQuantidadePorProtocolo.protocolos.map(([nome, qtd]) => (
                  <button
                    key={nome}
                    onClick={() => setFiltroProtocolo(nome)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filtroProtocolo === nome
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {nome} ({qtd})
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros por Tipo de Atendimento */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader className="py-3">
            <CardTitle className="text-white text-sm">Tipo de Atendimento</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroTipo('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filtroTipo === ''
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Todos ({filtroOrigem !== "all" ? atendimentos.filter(a => a.origemSistema?.toLowerCase() === filtroOrigem.toLowerCase()).length : atendimentos.length})
              </button>
              {getQuantidadePorTipo().map(({ tipo, quantidade }) => (
                <button
                  key={tipo}
                  onClick={() => setFiltroTipo(tipo || '')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroTipo === tipo
                      ? `${getTypeColor(tipo)} text-white shadow-lg`
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {tipo} ({quantidade})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filtros por Plano */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardHeader className="py-3">
            <CardTitle className="text-white text-sm">Plano (Convênio)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroConvenio('')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filtroConvenio === ''
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Todos
              </button>
              {getQuantidadePorPlano().map(({ plano, quantidade }) => (
                <button
                  key={plano}
                  onClick={() => setFiltroConvenio(plano || '')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroConvenio === plano
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {plano} ({quantidade})
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quantidade por Descrição de Atendimento (em vez de código) */}
        {isTasyLayout && getQuantidadePorDescricao.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-white text-sm">Quantidade por Serviço (Descrição Atendimento)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto">
                {getQuantidadePorDescricao.map(([desc, qtd]) => (
                  <button
                    key={desc}
                    onClick={() => setFiltroServico(filtroServico === desc ? '' : desc)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all ${
                      filtroServico === desc
                        ? 'bg-cyan-600 text-white shadow-lg'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className="truncate mr-2" title={desc}>{desc}</span>
                    <span className="text-cyan-400 font-bold shrink-0">{qtd}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros por Etapa da Conta */}
        {getQuantidadePorEtapa().length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mb-4">
            <CardHeader className="py-3">
              <CardTitle className="text-white text-sm">Etapa da Conta</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFiltroEtapa('')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filtroEtapa === ''
                      ? 'bg-violet-600 text-white shadow-lg'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  Todas
                </button>
                {getQuantidadePorEtapa().map(({ etapa, quantidade }: any) => (
                  <button
                    key={etapa}
                    onClick={() => setFiltroEtapa(etapa || '')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filtroEtapa === etapa
                        ? 'bg-violet-600 text-white shadow-lg'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {etapa} ({quantidade})
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Atendimentos */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-white">Atendimentos</CardTitle>
                  {filtroOrigem !== 'all' && (
                    <Badge className={getOrigemColor(filtroOrigem)}>
                      {getOrigemLabel(filtroOrigem)}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => refetch()}
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button
                    onClick={handleExportExcel}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>

              {/* Barra de Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={isTasyLayout 
                    ? "Buscar por N° Atend, Paciente, Plano, Serviço, Descrição, Etapa, Setor, Usuário..." 
                    : "Buscar por N° Atend, Paciente, Plano, Matrícula, Conta ou Médico..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64 text-slate-400">Carregando...</div>
            ) : filteredData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-400">Nenhum atendimento encontrado</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {isTasyLayout ? (
                        /* ===== COLUNAS TASY ===== */
                        <>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("numero_atendimento")}>
                            <div className="flex items-center gap-1">N.Atend <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("paciente")}>
                            <div className="flex items-center gap-1">Paciente <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("convenio")}>
                            <div className="flex items-center gap-1">Plano <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("data_entrada")}>
                            <div className="flex items-center gap-1">Data Entrada <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">Data Saída</th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("diasParado")}>
                            <div className="flex items-center gap-1">Dias Parado <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("tipo_atendimento")}>
                            <div className="flex items-center gap-1">Tipo <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("codigo_servico")}>
                            <div className="flex items-center gap-1">Serviço <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("descricao_atendimento")}>
                            <div className="flex items-center gap-1">Descrição Atend. <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("etapaConta")}>
                            <div className="flex items-center gap-1">Etapa Conta <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("setorEtapa")}>
                            <div className="flex items-center gap-1">Setor Etapa <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("userEtapa")}>
                            <div className="flex items-center gap-1">User Etapa <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">Ações</th>
                        </>
                      ) : (
                        /* ===== COLUNAS WARLEINE / EASYVISION / MISTO ===== */
                        <>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("numero_atendimento")}>
                            <div className="flex items-center gap-1">N° Atend <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("convenio")}>
                            <div className="flex items-center gap-1">Plano <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("paciente")}>
                            <div className="flex items-center gap-1">Paciente <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("matricula")}>
                            <div className="flex items-center gap-1">Matrícula <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("data_entrada")}>
                            <div className="flex items-center gap-1">Entrada <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">Saída</th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("diasParado")}>
                            <div className="flex items-center gap-1">Dias <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">Tipo</th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("valorConta")}>
                            <div className="flex items-center gap-1">Valor <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("etapaConta")}>
                            <div className="flex items-center gap-1">Etapa <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort("medicoResp")}>
                            <div className="flex items-center gap-1">Médico <ArrowUpDown className="w-3 h-3" /></div>
                          </th>
                          {origemDetectada === "all" && (
                            <th className="px-3 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">Origem</th>
                          )}
                          <th className="px-3 py-3 text-left text-slate-300 font-semibold whitespace-nowrap">Ações</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((atendimento: any, idx) => (
                      <tr
                        key={atendimento.id || idx}
                        className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                      >
                        {isTasyLayout ? (
                          /* ===== LINHAS TASY ===== */
                          <>
                            <td className="px-3 py-2.5 text-slate-200 font-mono text-xs">{atendimento.numero_atendimento}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[180px] truncate" title={atendimento.paciente}>{atendimento.paciente}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[120px] truncate" title={atendimento.convenio}>{atendimento.convenio}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs whitespace-nowrap">{formatDate(atendimento.data_entrada)}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs whitespace-nowrap">{formatDate(atendimento.data_saida)}</td>
                            <td className="px-3 py-2.5">
                              <Badge className={`${getDiasParadoColor(atendimento.diasParado)} text-xs`}>
                                {atendimento.diasParado}d
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge className={`${getTipoAtendimentoBadgeColor(atendimento.tipo_atendimento)} text-xs`}>
                                {atendimento.tipo_atendimento || '-'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-slate-200 font-mono text-xs">{atendimento.codigo_servico || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[200px] truncate" title={atendimento.descricao_atendimento}>{atendimento.descricao_atendimento || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[140px] truncate" title={atendimento.etapaConta}>{atendimento.etapaConta || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[120px] truncate" title={atendimento.setorEtapa}>{atendimento.setorEtapa || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[120px] truncate" title={atendimento.userEtapa}>{atendimento.userEtapa || '-'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                                  onClick={() => setSelectedRow(atendimento as AtendimentoUnificado)}
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-amber-400 hover:text-amber-300"
                                  onClick={() => handleNotificacao(atendimento)}
                                  title="Gerar notificação"
                                >
                                  <Bell className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-blue-400 hover:text-blue-300"
                                  onClick={() => handleEnviarEmail(atendimento)}
                                  title="Enviar email"
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* ===== LINHAS WARLEINE / EASYVISION / MISTO ===== */
                          <>
                            <td className="px-3 py-2.5 text-slate-200 font-mono text-xs">{atendimento.numero_atendimento}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[150px] truncate" title={atendimento.convenio}>{atendimento.convenio}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[180px] truncate" title={atendimento.paciente}>{atendimento.paciente}</td>
                            <td className="px-3 py-2.5 text-slate-200 font-mono text-xs">{atendimento.matricula || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs whitespace-nowrap">{formatDate(atendimento.data_entrada)}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs whitespace-nowrap">{formatDate(atendimento.data_saida)}</td>
                            <td className="px-3 py-2.5">
                              <Badge className={`${getDiasParadoColor(atendimento.diasParado)} text-xs`}>
                                {atendimento.diasParado}d
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge className={`${getTipoAtendimentoBadgeColor(atendimento.tipo_atendimento)} text-xs`}>
                                {atendimento.tipo_atendimento}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 text-emerald-400 font-mono text-xs whitespace-nowrap">{formatCurrency(atendimento.valorConta)}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[120px] truncate" title={atendimento.etapaConta}>{atendimento.etapaConta || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-200 text-xs max-w-[150px] truncate" title={atendimento.medicoResp}>{atendimento.medicoResp || '-'}</td>
                            {origemDetectada === "all" && (
                              <td className="px-3 py-2.5">
                                <Badge className={`${getOrigemColor(atendimento.origemSistema)} text-xs`}>
                                  {getOrigemLabel(atendimento.origemSistema)}
                                </Badge>
                              </td>
                            )}
                            <td className="px-3 py-2.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                                onClick={() => setSelectedRow(atendimento as AtendimentoUnificado)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            <div className="mt-4 flex items-center justify-between text-slate-400 text-sm">
              <span>Exibindo {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filteredData.length)} de {filteredData.length} atendimentos</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-white">Página {currentPage} de {totalPages || 1}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel Lateral - Detalhes do Atendimento */}
        {selectedRow && (
          <div className="fixed inset-0 bg-black/60 flex justify-end z-50" onClick={() => setSelectedRow(null)}>
            <div className="bg-slate-800 w-full md:w-[480px] h-screen shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Detalhes do Atendimento</h2>
                  <Badge className={getOrigemColor(selectedRow.origemSistema)}>
                    {getOrigemLabel(selectedRow.origemSistema)}
                  </Badge>
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-1">
                {/* Identificação */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Identificação</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="N° Atendimento" value={selectedRow.numero_atendimento} mono />
                    <DetailField label="Conta" value={selectedRow.conta} mono />
                    <DetailField label="Autorização" value={selectedRow.autorizacao} mono />
                    <DetailField label="Origem" value={getOrigemLabel(selectedRow.origemSistema)} />
                  </div>
                </div>

                {/* Paciente */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Paciente</h3>
                  <DetailField label="Nome" value={selectedRow.paciente} />
                  <div className="grid grid-cols-3 gap-3">
                    <DetailField label="Matrícula" value={selectedRow.matricula} mono />
                    <DetailField label="Sexo" value={selectedRow.sexo} />
                    <DetailField label="Idade" value={selectedRow.idade} />
                  </div>
                </div>

                {/* Atendimento */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Atendimento</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-slate-400 text-xs">Tipo</p>
                      <Badge className={getTipoAtendimentoBadgeColor(selectedRow.tipo_atendimento)}>
                        {selectedRow.tipo_atendimento || '-'}
                      </Badge>
                    </div>
                    <DetailField label="Caráter" value={selectedRow.caracter_atendimento} />
                    <DetailField label="Data Entrada" value={formatDate(selectedRow.data_entrada)} />
                    <DetailField label="Data Saída" value={formatDate(selectedRow.data_saida)} />
                    <div>
                      <p className="text-slate-400 text-xs">Dias Parado</p>
                      <Badge className={getDiasParadoColor(selectedRow.diasParado)}>
                        {selectedRow.diasParado} dias
                      </Badge>
                    </div>
                    <DetailField label="Motivo Alta" value={selectedRow.dsMotivoAlta} />
                  </div>
                  <DetailField label="Código Serviço" value={selectedRow.codigo_servico} mono />
                  <DetailField label="Descrição Atendimento" value={selectedRow.descricao_atendimento} />
                  <DetailField label="Procedimento Principal" value={selectedRow.codigo_procedimento} />
                </div>

                {/* Convênio */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">Convênio</h3>
                  <DetailField label="Plano" value={selectedRow.convenio} />
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="Categoria" value={selectedRow.dsCategoria} />
                    <DetailField label="Plano Detalhe" value={selectedRow.dsPlano} />
                  </div>
                </div>

                {/* Financeiro */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Financeiro</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="Valor Conta" value={formatCurrency(selectedRow.valorConta)} highlight />
                    <DetailField label="Competência" value={selectedRow.competencia} />
                    <DetailField label="Referência" value={selectedRow.referencia} />
                    <DetailField label="Título" value={selectedRow.titulo} />
                    <DetailField label="Data Título" value={formatDate(selectedRow.dtTitulo)} />
                    <DetailField label="Data Vencimento" value={formatDate(selectedRow.dataVencimento)} />
                  </div>
                </div>

                {/* Protocolo */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">Protocolo</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="Protocolo Tasy" value={selectedRow.protTasy} mono />
                    <DetailField label="Nome Protocolo" value={selectedRow.nomeProtocolo} />
                    <DetailField label="Protocolo Convênio" value={selectedRow.protConv} />
                    <DetailField label="Status" value={selectedRow.protStatus} />
                    <DetailField label="Data Entrega" value={formatDate(selectedRow.dtEntrega)} />
                  </div>
                </div>

                {/* Etapa da Conta */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-rose-400 uppercase tracking-wider">Etapa da Conta</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="Etapa" value={selectedRow.etapaConta} />
                    <DetailField label="Setor Etapa" value={selectedRow.setorEtapa} />
                    <DetailField label="Data Etapa" value={formatDate(selectedRow.dtEtapa)} />
                    <DetailField label="Usuário" value={selectedRow.userEtapa} />
                  </div>
                  {selectedRow.motivoDevolucao && (
                    <DetailField label="Motivo Devolução" value={selectedRow.motivoDevolucao} />
                  )}
                </div>

                {/* Setor/Local */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-orange-400 uppercase tracking-wider">Setor / Local</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="Setor Entrada" value={selectedRow.dsSetorEntrada} />
                    <DetailField label="Setor Leito" value={selectedRow.dsSetorLeito} />
                    <DetailField label="Centro Custo" value={selectedRow.centroCusto} />
                    <DetailField label="Destino Conta" value={selectedRow.destino_conta} />
                  </div>
                </div>

                {/* Médico */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wider">Médico</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailField label="Médico Resp." value={selectedRow.medicoResp} />
                    <DetailField label="CRM" value={selectedRow.crm} mono />
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-700">
                <Button
                  onClick={() => setSelectedRow(null)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value, mono, highlight }: { label: string; value?: string | null; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`text-sm ${highlight ? 'text-emerald-400 font-bold' : 'text-white'} ${mono ? 'font-mono' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}
