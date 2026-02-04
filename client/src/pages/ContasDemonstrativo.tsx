import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";

// Interface para conta agrupada (Master)
// Usa chave composta (guiaNumero + numeroProtocolo) para identificar faturamentos únicos
interface ContaAgrupada {
  chave: string;
  guiaNumero: string;
  numeroProtocolo: string;
  numeroLotePrestador: string;
  senha: string;
  carteirinha: string;
  dataPagamento: Date | null;
  dataRealizacao: Date | null;
  valorTotal: number;
  valorGlosado: number;
  pacienteNome: string;
  convenioNome: string;
  arquivoNome: string;
  arquivoId: number;
  itens: any[];
  quantidadeItens: number;
  itensGlosados: number;
}

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

export default function ContasDemonstrativo() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioId, setConvenioId] = useState<string>("");
  const [arquivoId, setArquivoId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mesReferencia, setMesReferencia] = useState<string>("");
  const [anoReferencia, setAnoReferencia] = useState<string>("");
  const [statusGlosa, setStatusGlosa] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const pageSize = 50;

  const anos = useMemo(() => getAnos(), []);

  // Buscar convênios
  const { data: convenios } = trpc.convenios.list.useQuery({});

  // Buscar arquivos do convênio selecionado (apenas retornados)
  const { data: arquivos } = trpc.arquivos.list.useQuery(
    { 
      convenioId: convenioId ? parseInt(convenioId) : undefined,
      direcao: "retornado"
    },
    { enabled: true }
  );

  // Buscar dados de recebimento_tiss
  const { data: recebimentoData, isLoading, refetch } = trpc.recebimentoTiss.list.useQuery(
    {
      arquivoId: arquivoId ? parseInt(arquivoId) : undefined,
      convenioId: convenioId ? parseInt(convenioId) : undefined,
      estabelecimentoId: estabelecimentoAtual?.id,
      search: searchTerm || undefined,
      mesReferencia: mesReferencia ? parseInt(mesReferencia) : undefined,
      anoReferencia: anoReferencia ? parseInt(anoReferencia) : undefined,
      statusGlosa: statusGlosa !== "todos" ? statusGlosa as "pago" | "glosado" | "parcial" : undefined,
      page: 1,
      pageSize: 10000,
    },
    { enabled: !!estabelecimentoAtual }
  );

  const itensRecebimento = recebimentoData?.items || [];

  // Agrupar itens por guia + protocolo
  const contasAgrupadas = useMemo(() => {
    const grupos: Record<string, ContaAgrupada> = {};
    
    itensRecebimento.forEach((item: any) => {
      // Chave composta: guia + protocolo
      const guia = item.numeroGuiaPrestador || 'sem_guia';
      const protocolo = item.numeroProtocolo || item.numeroLotePrestador || 'sem_protocolo';
      const chave = `${guia}_${protocolo}`;
      
      if (!grupos[chave]) {
        grupos[chave] = {
          chave,
          guiaNumero: item.numeroGuiaPrestador || "-",
          numeroProtocolo: item.numeroProtocolo || "-",
          numeroLotePrestador: item.numeroLotePrestador || "-",
          senha: item.senha || "-",
          carteirinha: item.numeroCarteira || "-",
          dataPagamento: item.dataPagamento ? new Date(item.dataPagamento) : null,
          dataRealizacao: item.dataRealizacao ? new Date(item.dataRealizacao) : null,
          valorTotal: 0,
          valorGlosado: 0,
          pacienteNome: item.nomeBeneficiario || "-",
          convenioNome: item.convenioNome || item.nomeOperadora || "-",
          arquivoNome: item.arquivoNome || "-",
          arquivoId: item.arquivoId,
          itens: [],
          quantidadeItens: 0,
          itensGlosados: 0,
        };
      }
      
      // Acumular valores
      const valorItem = parseFloat(item.valorLiberado || "0");
      grupos[chave].valorTotal += valorItem;
      grupos[chave].itens.push(item);
      grupos[chave].quantidadeItens++;
      
      // Contar itens glosados
      if (item.codigoGlosa && item.codigoGlosa !== '') {
        grupos[chave].itensGlosados++;
        grupos[chave].valorGlosado += valorItem === 0 ? parseFloat(item.valorInformado || "0") : 0;
      }
      
      // Usar a data mais recente
      if (item.dataPagamento) {
        const dataItem = new Date(item.dataPagamento);
        const currentDate = grupos[chave].dataPagamento;
        if (!currentDate || dataItem > currentDate) {
          grupos[chave].dataPagamento = dataItem;
        }
      }
      
      // Preencher dados que podem estar vazios
      if (item.nomeBeneficiario && grupos[chave].pacienteNome === "-") {
        grupos[chave].pacienteNome = item.nomeBeneficiario;
      }
      if (item.numeroCarteira && grupos[chave].carteirinha === "-") {
        grupos[chave].carteirinha = item.numeroCarteira;
      }
      if (item.senha && grupos[chave].senha === "-") {
        grupos[chave].senha = item.senha;
      }
    });
    
    // Converter para array e ordenar por data (mais recente primeiro)
    return Object.values(grupos).sort((a, b) => {
      if (!a.dataPagamento) return 1;
      if (!b.dataPagamento) return -1;
      return b.dataPagamento.getTime() - a.dataPagamento.getTime();
    });
  }, [itensRecebimento]);

  // Paginação das contas
  const totalContas = contasAgrupadas.length;
  const totalPages = Math.ceil(totalContas / pageSize);
  const contasPaginadas = contasAgrupadas.slice((page - 1) * pageSize, page * pageSize);

  // Totais
  const valorTotalGeral = contasAgrupadas.reduce((acc, c) => acc + c.valorTotal, 0);
  const totalItens = contasAgrupadas.reduce((acc, c) => acc + c.quantidadeItens, 0);
  const totalGlosados = contasAgrupadas.reduce((acc, c) => acc + c.itensGlosados, 0);

  // Toggle expansão de linha
  const toggleExpand = (chave: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chave)) {
        newSet.delete(chave);
      } else {
        newSet.add(chave);
      }
      return newSet;
    });
  };

  const handleExportExcel = () => {
    if (!contasAgrupadas.length) return;

    // Dados das contas agrupadas
    const contasData = contasAgrupadas.map((c) => ({
      "Guia": c.guiaNumero,
      "Protocolo TISS": c.numeroProtocolo,
      "Lote Prestador": c.numeroLotePrestador,
      "Senha": c.senha,
      "Carteirinha": c.carteirinha,
      "Paciente": c.pacienteNome,
      "Data Pagamento": c.dataPagamento ? c.dataPagamento.toLocaleDateString("pt-BR") : "-",
      "Valor Total": c.valorTotal / 100,
      "Qtd Itens": c.quantidadeItens,
      "Itens Glosados": c.itensGlosados,
      "Convênio": c.convenioNome,
      "Arquivo": c.arquivoNome,
    }));

    // Dados detalhados dos itens
    const itensData = itensRecebimento.map((item: any) => ({
      "Guia": item.numeroGuiaPrestador || "-",
      "Protocolo": item.numeroProtocolo || "-",
      "Código": item.codigoProcedimento || "-",
      "Descrição": item.descricaoProcedimento || "-",
      "Tipo Lançamento": item.tipoLancamento || "-",
      "Quantidade": item.qtdExecutada || 1,
      "Valor Liberado": parseFloat(item.valorLiberado || "0") / 100,
      "Código Glosa": item.codigoGlosa || "-",
      "Descrição Glosa": item.descricaoGlosa || "-",
      "Beneficiário": item.nomeBeneficiario || "-",
      "Carteirinha": item.numeroCarteira || "-",
      "Data Execução": item.dataRealizacao ? new Date(item.dataRealizacao).toLocaleDateString("pt-BR") : "-",
      "Data Pagamento": item.dataPagamento ? new Date(item.dataPagamento).toLocaleDateString("pt-BR") : "-",
    }));

    const wb = XLSX.utils.book_new();
    
    const wsContas = XLSX.utils.json_to_sheet(contasData);
    XLSX.utils.book_append_sheet(wb, wsContas, "Contas Agrupadas");
    
    const wsItens = XLSX.utils.json_to_sheet(itensData);
    XLSX.utils.book_append_sheet(wb, wsItens, "Itens Detalhados");

    const convenio = convenios?.find((c: any) => c.id === parseInt(convenioId));
    const nomeArquivo = convenio?.nome || "demonstrativo";
    XLSX.writeFile(wb, `contas_demonstrativo_${nomeArquivo}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return date.toLocaleDateString("pt-BR");
  };

  // Determinar status da conta
  const getStatusConta = (conta: ContaAgrupada) => {
    if (conta.itensGlosados === 0) {
      return { label: "Pago", variant: "success" as const, icon: CheckCircle2 };
    } else if (conta.itensGlosados === conta.quantidadeItens) {
      return { label: "Glosado", variant: "destructive" as const, icon: XCircle };
    } else {
      return { label: "Parcial", variant: "warning" as const, icon: AlertCircle };
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas Demonstrativo</h1>
            <p className="text-muted-foreground">
              Arquivos retornados pelas operadoras (XML, PDF, Excel) - Tabela recebimento_tiss
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={!contasAgrupadas.length}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioId} onValueChange={(v) => { setConvenioId(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {convenios?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mês</label>
                <Select value={mesReferencia} onValueChange={(v) => { setMesReferencia(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Ano</label>
                <Select value={anoReferencia} onValueChange={(v) => { setAnoReferencia(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {anos.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusGlosa} onValueChange={(v) => { setStatusGlosa(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="glosado">Glosado</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo</label>
                <Select value={arquivoId} onValueChange={(v) => { setArquivoId(v); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {arquivos?.filter((a: any) => a.direcao === "retornado").map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Guia, paciente, código..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Contas</p>
                  <p className="text-2xl font-bold">{totalContas.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(valorTotalGeral)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Hash className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Itens</p>
                  <p className="text-2xl font-bold">{totalItens.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Itens Glosados</p>
                  <p className="text-2xl font-bold">{totalGlosados.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : contasPaginadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileSearch className="h-12 w-12 mb-4" />
                <p>Nenhuma conta encontrada</p>
                <p className="text-sm">Selecione um convênio ou ajuste os filtros</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Guia</TableHead>
                      <TableHead>Protocolo</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Carteirinha</TableHead>
                      <TableHead>Data Pgto</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasPaginadas.map((conta) => {
                      const status = getStatusConta(conta);
                      const StatusIcon = status.icon;
                      return (
                        <React.Fragment key={conta.chave}>
                          <TableRow 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => toggleExpand(conta.chave)}
                          >
                            <TableCell>
                              {expandedRows.has(conta.chave) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono">{conta.guiaNumero}</TableCell>
                            <TableCell className="font-mono">{conta.numeroProtocolo}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{conta.pacienteNome}</TableCell>
                            <TableCell className="font-mono">{conta.carteirinha}</TableCell>
                            <TableCell>{formatDate(conta.dataPagamento)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(conta.valorTotal)}</TableCell>
                            <TableCell className="text-center">{conta.quantidadeItens}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={status.variant === "success" ? "default" : status.variant === "warning" ? "secondary" : "destructive"}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {expandedRows.has(conta.chave) && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-muted/30 p-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold">Itens da Conta</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead className="text-center">Qtd</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead>Glosa</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {conta.itens.map((item: any, idx: number) => (
                                        <TableRow key={idx} className={item.codigoGlosa ? "bg-red-50" : ""}>
                                          <TableCell className="font-mono">{item.codigoProcedimento || "-"}</TableCell>
                                          <TableCell className="max-w-[250px] truncate">{item.descricaoProcedimento || "-"}</TableCell>
                                          <TableCell>{item.tipoLancamento || "-"}</TableCell>
                                          <TableCell className="text-center">{item.qtdExecutada || 1}</TableCell>
                                          <TableCell className="text-right font-mono">{formatCurrency(parseFloat(item.valorLiberado || "0"))}</TableCell>
                                          <TableCell>
                                            {item.codigoGlosa ? (
                                              <Badge variant="destructive" className="text-xs">
                                                {item.codigoGlosa}
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline" className="text-xs">OK</Badge>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Paginação */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalContas)} de {totalContas} contas
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Página {page} de {totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
