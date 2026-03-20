import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  ChevronLeft, 
  Download,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CircleMinus,
  DollarSign,
  TrendingDown,
  FileText
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatDateBR } from "@/lib/dateUtils";

interface ItemConciliacao {
  guiaNumero: string;
  numeroLote: string;
  dataExecucao: string;
  codigo: string;
  descricao: string;
  pacienteNome: string;
  valorFaturado: number;
  valorPago: number;
  valorGlosado: number;
  motivoGlosa: string;
  status: "ok" | "divergente" | "glosado" | "nao_encontrado" | "nao_recebido";
}

interface ContaConciliacao {
  guiaNumero: string;
  numeroLote: string;
  pacienteNome: string;
  dataExecucao: string;
  valorTotalFaturado: number;
  valorTotalRecebido: number;
  valorTotalGlosado: number;
  status: "ok" | "glosado" | "nao_encontrado" | "parcial";
  totalItens: number;
  itens: ItemConciliacao[];
}

export default function ConciliacaoDetalhes() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/conciliacao/:convenioId/:guiaNumero");
  const { estabelecimentoAtual } = useEstabelecimento();
  
  // Decodificar parâmetros da URL
  const convenioId = params?.convenioId ? parseInt(params.convenioId) : 0;
  const guiaNumero = params?.guiaNumero ? decodeURIComponent(params.guiaNumero) : "";
  
  // Buscar parâmetros de query string
  const urlParams = new URLSearchParams(window.location.search);
  const mesReferencia = urlParams.get("mes") ? parseInt(urlParams.get("mes")!) : new Date().getMonth() + 1;
  const anoReferencia = urlParams.get("ano") ? parseInt(urlParams.get("ano")!) : new Date().getFullYear();
  const chaveComposta = urlParams.get("chave") || "";

  // Função para voltar à lista de contas mantendo o contexto
  const handleVoltar = () => {
    // Voltar para a lista de contas do convênio selecionado com os filtros de período
    setLocation(`/conciliacao?convenio=${convenioId}&mes=${mesReferencia}&ano=${anoReferencia}`);
  };

  // Buscar dados da conta
  const { data: contaData, isLoading } = trpc.conciliacao.detalhesConta.useQuery(
    {
      convenioId,
      guiaNumero,
      estabelecimentoId: estabelecimentoAtual?.id,
      mesReferencia,
      anoReferencia,
    },
    { enabled: !!convenioId && !!guiaNumero }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      // Tentar parsear como ISO ou formato brasileiro
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // Se não for válido, tentar formato DD/MM/YYYY
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else {
            // Já está em DD/MM/YYYY
            return dateStr;
          }
        }
        return dateStr;
      }
      return formatDateBR(date);
    } catch {
      return dateStr;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "glosado":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "nao_encontrado":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "parcial":
        return <CircleMinus className="h-5 w-5 text-orange-500" />;
      default:
        return <CircleMinus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ok":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OK</Badge>;
      case "glosado":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Glosado</Badge>;
      case "divergente":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Divergente</Badge>;
      case "nao_encontrado":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Não Encontrado</Badge>;
      case "nao_recebido":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Não Recebido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleExportExcel = () => {
    if (!contaData) return;

    const excelData = contaData.itens.map((item: ItemConciliacao) => ({
      "Código": item.codigo,
      "Descrição": item.descricao,
      "Data Execução": formatDateBR(item.dataExecucao),
      "Valor Faturado": item.valorFaturado,
      "Valor Recebido": item.valorPago,
      "Valor Glosado": item.valorGlosado,
      "Motivo Glosa": item.motivoGlosa || "",
      "Status": item.status === "ok" ? "OK" : 
                item.status === "glosado" ? "Glosado" :
                item.status === "divergente" ? "Divergente" :
                item.status === "nao_encontrado" ? "Não Encontrado" : 
                item.status === "nao_recebido" ? "Não Recebido" : item.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    ws["!cols"] = [
      { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Itens da Conta");

    // Aba de resumo
    const resumoData = [{
      "Guia": contaData.guiaNumero,
      "Paciente": contaData.pacienteNome,
      "Data": formatDateBR(contaData.dataExecucao),
      "Total Itens": contaData.totalItens,
      "Valor Faturado": contaData.valorTotalFaturado,
      "Valor Recebido": contaData.valorTotalRecebido,
      "Valor Glosado": contaData.valorTotalGlosado,
      "Status": contaData.status,
    }];
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    XLSX.writeFile(wb, `conta_${guiaNumero}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (!match) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Conta não encontrada</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!contaData) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={handleVoltar}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar para Lista de Contas
          </Button>
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Dados da conta não encontrados</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleVoltar}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <div className="flex items-center gap-2">
                {getStatusIcon(contaData.status)}
                <h1 className="text-2xl font-bold">Conta: {contaData.guiaNumero || "Sem Guia"}</h1>
              </div>
              <p className="text-muted-foreground">
                Paciente: {contaData.pacienteNome} • Data: {formatDateBR(contaData.dataExecucao)}
              </p>
            </div>
          </div>
          <Button onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Faturado</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(contaData.valorTotalFaturado)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Recebido</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(contaData.valorTotalRecebido)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Glosado</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(contaData.valorTotalGlosado)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="text-2xl font-bold">{contaData.totalItens}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Itens */}
        <Card>
          <CardHeader>
            <CardTitle>Itens da Conta</CardTitle>
            <CardDescription>
              Detalhamento de todos os procedimentos desta conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[120px]">Data Execução</TableHead>
                    <TableHead className="w-[130px] text-right">Valor Faturado</TableHead>
                    <TableHead className="w-[130px] text-right">Valor Recebido</TableHead>
                    <TableHead className="w-[130px] text-right">Valor Glosado</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contaData.itens.map((item: ItemConciliacao, idx: number) => (
                    <TableRow 
                      key={idx}
                      className={
                        item.status === "glosado" ? "bg-red-50 dark:bg-red-950/20" :
                        item.status === "nao_recebido" ? "bg-orange-50 dark:bg-orange-950/20" :
                        item.status === "divergente" ? "bg-amber-50 dark:bg-amber-950/20" :
                        item.status === "nao_encontrado" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                        ""
                      }
                    >
                      <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                      <TableCell>
                        <div className="max-w-[300px]">
                          <div className="truncate" title={item.descricao}>{item.descricao}</div>
                          {item.motivoGlosa && (
                            <div className="text-xs text-red-600 mt-1" title={item.motivoGlosa}>
                              <span className="font-medium">Motivo:</span> {item.motivoGlosa}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateBR(item.dataExecucao)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.valorFaturado)}</TableCell>
                      <TableCell className="text-right font-mono text-green-600">{formatCurrency(item.valorPago)}</TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {item.valorGlosado > 0 ? formatCurrency(item.valorGlosado) : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
