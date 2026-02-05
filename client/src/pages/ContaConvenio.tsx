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
  Package
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";

// Lista de meses em português
const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

// Gerar lista de anos
const getAnos = () => {
  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let i = anoAtual; i >= anoAtual - 5; i--) {
    anos.push({ value: String(i), label: String(i) });
  }
  return anos;
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

// Interface para conta agrupada
interface ContaAgrupada {
  numeroGuia: string;
  carteirinha: string;
  paciente: string;
  dataExecucao: Date | null;
  dataReferencia: Date | null;
  totalItens: number;
  valorTotal: number;
  arquivoId: number;
  convenioId: number;
  tipoItem: string;
}

export default function ContaConvenio() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioId, setConvenioId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  // Inicializar com mês e ano atual
  const [mesReferencia, setMesReferencia] = useState<string>(String(new Date().getMonth() + 1));
  const [anoReferencia, setAnoReferencia] = useState<string>(String(new Date().getFullYear()));
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const pageSize = 20;

  // Buscar convênios
  const { data: convenios } = trpc.convenios.list.useQuery({});

  // Buscar dados de faturamento_tiss
  const { data: faturamentoData, isLoading, refetch } = trpc.faturamentoTiss.list.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || undefined,
      convenioId: convenioId && convenioId !== "all" ? parseInt(convenioId) : undefined,
      mesReferencia: mesReferencia && mesReferencia !== "all" ? parseInt(mesReferencia) : undefined,
      anoReferencia: anoReferencia && anoReferencia !== "all" ? parseInt(anoReferencia) : undefined,
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
      mesReferencia: mesReferencia && mesReferencia !== "all" ? parseInt(mesReferencia) : undefined,
      anoReferencia: anoReferencia && anoReferencia !== "all" ? parseInt(anoReferencia) : undefined,
    }
  );

  // Agrupar itens por guia
  const contasAgrupadas = useMemo(() => {
    if (!faturamentoData?.items) return [];
    
    const grouped = new Map<string, ContaAgrupada>();
    
    faturamentoData.items.forEach((item: any) => {
      const key = item.numeroGuiaPrestador || `sem-guia-${item.id}`;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.totalItens += 1;
        existing.valorTotal += parseFloat(item.valorTotalItem || item.valorFaturado || "0");
      } else {
        grouped.set(key, {
          numeroGuia: item.numeroGuiaPrestador || "-",
          carteirinha: item.carteiraBeneficiario || "-",
          paciente: item.nomeProf || "-",
          dataExecucao: item.dataExecucao,
          dataReferencia: item.dataReferencia,
          totalItens: 1,
          valorTotal: parseFloat(item.valorTotalItem || item.valorFaturado || "0"),
          arquivoId: item.arquivoId,
          convenioId: item.convenioId,
          tipoItem: item.tipoItem || "-",
        });
      }
    });
    
    return Array.from(grouped.values());
  }, [faturamentoData?.items]);

  // Calcular totais
  const totalContas = resumoTotal?.totalGuias || 0;
  const totalItens = resumoTotal?.totalItens || 0;
  const valorTotalGeral = resumoTotal?.valorTotal || 0;
  const totalPages = Math.ceil((faturamentoData?.total || 0) / pageSize);

  // Obter nome do convênio selecionado
  const convenioSelecionado = convenios?.find(c => c.id === parseInt(convenioId));

  // Navegar para detalhes da conta
  const handleVerDetalhes = (conta: ContaAgrupada) => {
    const params = new URLSearchParams({
      guia: conta.numeroGuia,
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
      "Carteirinha": conta.carteirinha,
      "Paciente": conta.paciente,
      "Data Execução": formatDate(conta.dataExecucao),
      "Data Referência": formatDate(conta.dataReferencia),
      "Qtd Itens": conta.totalItens,
      "Valor Total": conta.valorTotal,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contas");
    
    const nomeArquivo = convenioSelecionado?.nome || "faturamento";
    XLSX.writeFile(wb, `contas_faturamento_${nomeArquivo}_${new Date().toISOString().split("T")[0]}.xlsx`);
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
      "Valor Total": parseFloat(item.valorTotalItem || "0"),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Itens");
    
    const nomeArquivo = convenioSelecionado?.nome || "faturamento";
    XLSX.writeFile(wb, `itens_faturamento_${nomeArquivo}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // Limpar filtros
  const handleLimparFiltros = () => {
    setConvenioId("");
    setMesReferencia("");
    setAnoReferencia("");
    setSearchTerm("");
    setPage(1);
  };

  const temFiltrosAtivos = (convenioId && convenioId !== "all") || 
    (mesReferencia && mesReferencia !== "all") || 
    (anoReferencia && anoReferencia !== "all") || 
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Convênio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioId} onValueChange={(v) => { setConvenioId(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os convênios</SelectItem>
                    {convenios?.map(conv => (
                      <SelectItem key={conv.id} value={String(conv.id)}>
                        {conv.nome} ({conv.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mês */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mês Referência</label>
                <Select value={mesReferencia} onValueChange={(v) => { setMesReferencia(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {MESES.map(mes => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ano Referência</label>
                <Select value={anoReferencia} onValueChange={(v) => { setAnoReferencia(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {getAnos().map(ano => (
                      <SelectItem key={ano.value} value={ano.value}>
                        {ano.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Guia, código, carteirinha..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Limpar Filtros */}
              <div className="space-y-2 flex items-end">
                {temFiltrosAtivos && (
                  <Button variant="outline" onClick={handleLimparFiltros} className="w-full">
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo - KPIs com totais de TODAS as contas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Guias</p>
                  <p className="text-2xl font-bold">{totalContas.toLocaleString("pt-BR")}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Itens</p>
                  <p className="text-2xl font-bold">{totalItens.toLocaleString("pt-BR")}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total Faturado</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(valorTotalGeral)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Média por Guia</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totalContas > 0 ? valorTotalGeral / totalContas : 0)}
                  </p>
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contas */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : contasAgrupadas.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileSearch className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma conta encontrada</h3>
              <p className="text-muted-foreground">
                Ajuste os filtros ou importe arquivos XML
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {contasAgrupadas.map((conta, index) => (
              <Card 
                key={`${conta.numeroGuia}-${index}`}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleVerDetalhes(conta)}
              >
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Ícone */}
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-800">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>

                    {/* Informações principais */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Guia e Paciente */}
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          <span>Guia</span>
                        </div>
                        <p className="font-semibold">{conta.numeroGuia}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{conta.paciente}</span>
                        </div>
                      </div>

                      {/* Carteirinha */}
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard className="h-3 w-3" />
                          <span>Carteirinha</span>
                        </div>
                        <p className="font-medium">{conta.carteirinha}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Tipo: {conta.tipoItem}
                        </p>
                      </div>

                      {/* Datas */}
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Data Execução</span>
                        </div>
                        <p className="font-medium">{formatDate(conta.dataExecucao)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ref: {formatDate(conta.dataReferencia)}
                        </p>
                      </div>

                      {/* Valores */}
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>Valor Total</span>
                        </div>
                        <p className="font-semibold text-emerald-600">
                          {formatCurrency(conta.valorTotal)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {conta.totalItens} {conta.totalItens === 1 ? "item" : "itens"}
                        </p>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="hidden md:flex">
                        {conta.totalItens} {conta.totalItens === 1 ? "item" : "itens"}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
