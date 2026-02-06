import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  FileSearch, 
  Download, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  FileSpreadsheet,
  Eye,
  CreditCard,
  Hash,
  User,
  DollarSign,
  FileText,
  Receipt,
  ExternalLink,
  Package,
  Layers2
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";

// Gerar lista de competências no formato MM/AAAA
const getCompetencias = () => {
  const competencias = [];
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  
  // Gerar últimos 24 meses
  for (let i = 0; i < 24; i++) {
    let mes = mesAtual - i;
    let ano = anoAtual;
    
    while (mes <= 0) {
      mes += 12;
      ano -= 1;
    }
    
    const mesStr = String(mes).padStart(2, '0');
    const value = `${mes}-${ano}`; // formato interno: mes-ano
    const label = `${mesStr}/${ano}`; // formato exibição: MM/AAAA
    
    competencias.push({ value, label, mes, ano });
  }
  
  return competencias;
};

// Formatar valor em reais
const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
};

// Formatar data
const formatDate = (date: Date | string | null | undefined) => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
};

// Formatar data de referência como MM/AAAA
const formatDataReferencia = (date: Date | string | null | undefined) => {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const ano = d.getFullYear();
  return `${mes}/${ano}`;
};

// Interface para conta agrupada (usando chave composta para separar altas administrativas)
interface ContaAgrupada {
  numeroGuia: string;
  numeroLote: string;
  protocolo: string;
  carteirinha: string;
  paciente: string;
  dataExecucao: Date | null;
  dataReferencia: Date | null;
  totalItens: number;
  valorTotal: number;
  arquivoId: number;
  convenioId: number;
  tipoItem: string;
  // Chave composta para identificar altas administrativas
  chaveComposta: string;
  // Flag para indicar se é alta administrativa
  isAltaAdministrativa?: boolean;
  totalLotes?: number;
}

export default function ContaConvenio() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioId, setConvenioId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Inicializar com mês anterior (para mostrar dados mais recentes disponíveis)
  const getCompetenciaInicial = () => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    if (mesAtual === 1) {
      return `12-${hoje.getFullYear() - 1}`;
    }
    return `${mesAtual - 1}-${hoje.getFullYear()}`;
  };
  
  const [competencia, setCompetencia] = useState<string>(getCompetenciaInicial());
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const pageSize = 20;

  // Extrair mês e ano da competência selecionada
  const { mesReferencia, anoReferencia } = useMemo(() => {
    if (!competencia || competencia === "all") {
      return { mesReferencia: undefined, anoReferencia: undefined };
    }
    const [mes, ano] = competencia.split("-").map(Number);
    return { mesReferencia: mes, anoReferencia: ano };
  }, [competencia]);

  // Lista de competências
  const competencias = useMemo(() => getCompetencias(), []);

  // Buscar convênios
  const { data: convenios } = trpc.convenios.list.useQuery({});

  // Buscar dados de faturamento_tiss
  const { data: faturamentoData, isLoading, refetch } = trpc.faturamentoTiss.list.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || undefined,
      convenioId: convenioId && convenioId !== "all" ? parseInt(convenioId) : undefined,
      mesReferencia: mesReferencia,
      anoReferencia: anoReferencia,
      search: searchTerm || undefined,
      page,
      pageSize,
    }
  );

  // Buscar resumo total (sem paginação)
  const { data: resumoTotal } = trpc.faturamentoTiss.resumo.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || undefined,
      convenioId: convenioId && convenioId !== "all" ? parseInt(convenioId) : undefined,
      mesReferencia: mesReferencia,
      anoReferencia: anoReferencia,
    }
  );

  // Buscar guias com múltiplos lotes (altas administrativas)
  const { data: guiasMultiplosLotes } = trpc.faturamentoTiss.guiasMultiplosLotes?.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || undefined,
      convenioId: convenioId && convenioId !== "all" ? parseInt(convenioId) : undefined,
      mesReferencia: mesReferencia,
      anoReferencia: anoReferencia,
    },
    { enabled: !!estabelecimentoAtual?.id }
  ) || { data: [] };

  // Criar mapa de guias com múltiplos lotes
  const guiasAltaAdmMap = useMemo(() => {
    const map = new Map<string, number>();
    if (guiasMultiplosLotes && Array.isArray(guiasMultiplosLotes)) {
      guiasMultiplosLotes.forEach((g: any) => {
        map.set(g.numeroGuia, g.totalLotes);
      });
    }
    return map;
  }, [guiasMultiplosLotes]);

  // Os dados já vem agrupados do backend por chave composta (guia + lote)
  // Isso separa as altas administrativas (mesma guia, lotes diferentes)
  const contasAgrupadas = useMemo(() => {
    if (!faturamentoData?.items) return [];
    
    return faturamentoData.items.map((item: any) => {
      const guia = item.numeroGuiaPrestador || "";
      const lote = item.numeroLote || "";
      const key = `${guia}|${lote}`;
      const totalLotes = guiasAltaAdmMap.get(guia);
      
      return {
        numeroGuia: guia || "-",
        numeroLote: lote || "-",
        protocolo: "-",
        carteirinha: item.carteiraBeneficiario || "-",
        paciente: item.nomeProf || "-",
        dataExecucao: item.dataExecucao,
        dataReferencia: item.dataReferencia,
        totalItens: item.totalItens || 1,
        valorTotal: parseFloat(item.valorFaturado || "0"),
        arquivoId: item.arquivoId,
        convenioId: item.convenioId,
        tipoItem: item.tipoItem || "-",
        chaveComposta: key,
        isAltaAdministrativa: totalLotes ? totalLotes > 1 : false,
        totalLotes: totalLotes || 1,
      } as ContaAgrupada;
    });
  }, [faturamentoData?.items, guiasAltaAdmMap]);

  // Calcular totais
  const totalContas = resumoTotal?.totalGuias || 0;
  const totalItens = resumoTotal?.totalItens || 0;
  const valorTotalGeral = resumoTotal?.valorTotal || 0;
  const totalPages = Math.ceil((faturamentoData?.total || 0) / pageSize);

  // Obter nome do convênio selecionado
  const convenioSelecionado = convenios?.find(c => c.id === parseInt(convenioId));

  // Obter label da competência selecionada
  const competenciaSelecionada = competencias.find(c => c.value === competencia);

  // Navegar para detalhes da conta
  const handleVerDetalhes = (conta: ContaAgrupada) => {
    const params = new URLSearchParams({
      guia: conta.numeroGuia,
      lote: conta.numeroLote,
      protocolo: conta.protocolo,
      arquivoId: String(conta.arquivoId),
      convenioId: String(conta.convenioId || convenioId),
      origem: "faturamento",
    });
    setLocation(`/conta-convenio-detalhes?${params.toString()}`);
  };

  // Exportar para Excel
  const handleExportExcel = () => {
    if (!contasAgrupadas.length) return;

    const data = contasAgrupadas.map(conta => ({
      "Guia": conta.numeroGuia,
      "Nº Lote": conta.numeroLote,
      "Alta Administrativa": conta.isAltaAdministrativa ? "Sim" : "Não",
      "Protocolo": conta.protocolo,
      "Carteirinha": conta.carteirinha,
      "Paciente": conta.paciente,
      "Data Execução": formatDate(conta.dataExecucao),
      "Competência": formatDataReferencia(conta.dataReferencia),
      "Qtd Itens": conta.totalItens,
      "Valor Total": conta.valorTotal,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas");
    
    const nomeArquivo = convenioSelecionado?.nome || "faturamento";
    const competenciaLabel = competenciaSelecionada?.label?.replace("/", "-") || "";
    XLSX.writeFile(wb, `contas_faturamento_${nomeArquivo}_${competenciaLabel}.xlsx`);
  };

  // Exportar itens detalhados
  const handleExportExcelItens = () => {
    if (!faturamentoData?.items?.length) return;

    const data = faturamentoData.items.map((item: any) => ({
      "Guia": item.numeroGuiaPrestador || "-",
      "Nº Lote": item.numeroLote || "-",
      "Seq. Transação": item.sequencialTransacao || "-",
      "Senha": item.senha || "-",
      "Carteirinha": item.carteiraBeneficiario || "-",
      "Tipo Item": item.tipoItem || "-",
      "Seq. Item": item.sequencialItem || "-",
      "Código": item.codigoItem || "-",
      "Descrição": item.descricaoItem || "-",
      "Data Execução": formatDate(item.dataExecucao),
      "Quantidade": item.quantidade || 0,
      "Valor Unitário": parseFloat(item.valorUnitario || "0"),
      "Valor Faturado": parseFloat(item.valorFaturado || "0"),
      "Valor Total": parseFloat(item.valorFaturado || "0"),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Itens");
    
    const nomeArquivo = convenioSelecionado?.nome || "faturamento";
    const competenciaLabel = competenciaSelecionada?.label?.replace("/", "-") || "";
    XLSX.writeFile(wb, `itens_faturamento_${nomeArquivo}_${competenciaLabel}.xlsx`);
  };

  // Limpar filtros
  const handleLimparFiltros = () => {
    setConvenioId("");
    setCompetencia(getCompetenciaInicial());
    setSearchTerm("");
    setPage(1);
  };

  const temFiltrosAtivos = (convenioId && convenioId !== "all") || 
    (competencia && competencia !== "all") || 
    searchTerm;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conta Convênio</h1>
            <p className="text-muted-foreground">
              Arquivos XML enviados para as operadoras - Tabela faturamento_tiss
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportExcel}
              disabled={!contasAgrupadas.length}
            >
              <Download className="mr-2 h-4 w-4" />
              Excel Resumo
            </Button>
            <Button 
              size="sm" 
              onClick={handleExportExcelItens}
              disabled={!faturamentoData?.items?.length}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel Itens
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Convênio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioId} onValueChange={(v) => { setConvenioId(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {convenios?.map(conv => (
                      <SelectItem key={conv.id} value={String(conv.id)}>
                        {conv.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Competência (MM/AAAA) */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Competência (MM/AAAA)</label>
                <Select value={competencia} onValueChange={(v) => { setCompetencia(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {competencias.map(comp => (
                      <SelectItem key={comp.value} value={comp.value}>
                        {comp.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <FileSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Guia, paciente, carteirinha..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Botão Limpar */}
              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleLimparFiltros}
                  disabled={!temFiltrosAtivos}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Guias</p>
                  <p className="text-2xl font-bold">{totalContas.toLocaleString("pt-BR")}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Itens</p>
                  <p className="text-2xl font-bold">{totalItens.toLocaleString("pt-BR")}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total Faturado</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(valorTotalGeral)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média por Guia</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalContas > 0 ? valorTotalGeral / totalContas : 0)}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contas */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : contasAgrupadas.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhuma conta encontrada</h3>
                <p className="text-muted-foreground">
                  Ajuste os filtros ou selecione outro período
                </p>
              </CardContent>
            </Card>
          ) : (
            contasAgrupadas.map((conta, index) => (
              <Card key={`${conta.chaveComposta}-${index}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Informações da Guia */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Receipt className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-muted-foreground"># Guia</span>
                          <span className="font-semibold">{conta.numeroGuia}</span>
                          {/* Badge de Alta Administrativa */}
                          {conta.isAltaAdministrativa && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              <Layers2 className="h-3 w-3 mr-1" />
                              Alta Adm ({conta.totalLotes} lotes)
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-4 w-4" />
                          <span className="truncate">{conta.paciente}</span>
                        </div>
                      </div>
                    </div>

                    {/* Carteirinha e Lote */}
                    <div className="flex flex-col gap-1 min-w-[180px]">
                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span>{conta.carteirinha}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>Lote: {conta.numeroLote}</span>
                      </div>
                    </div>

                    {/* Data Execução */}
                    <div className="flex flex-col gap-1 min-w-[120px]">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Data Execução</span>
                      </div>
                      <span className="text-sm">{formatDate(conta.dataExecucao)}</span>
                      <span className="text-xs text-muted-foreground">
                        Comp: {formatDataReferencia(conta.dataReferencia)}
                      </span>
                    </div>

                    {/* Valores */}
                    <div className="flex flex-col gap-1 min-w-[120px]">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Valores</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(conta.valorTotal)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conta.totalItens} itens
                      </span>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {conta.totalItens} itens
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportExcel()}
                      >
                        Excel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleVerDetalhes(conta)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} ({faturamentoData?.total || 0} itens)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
