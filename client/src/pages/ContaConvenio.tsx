import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  Search,
  Loader2
} from "lucide-react";
import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import * as XLSX from "xlsx";

// Interface para conta agrupada (Master)
interface ContaAgrupada {
  chave: string;
  guiaNumero: string;
  numeroLote: string;
  sequencialTransacao: string;
  senha: string;
  carteirinha: string;
  dataConta: Date | null;
  valorTotal: number;
  pacienteNome: string;
  convenioNome: string;
  arquivoNome: string;
  arquivoId: number;
  itens: any[];
  quantidadeItens: number;
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

export default function ContaConvenio() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioId, setConvenioId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [mesReferencia, setMesReferencia] = useState<string>("");
  const [anoReferencia, setAnoReferencia] = useState<string>("");
  const [page, setPage] = useState(1);
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [filtrosRestaurados, setFiltrosRestaurados] = useState(false);
  const pageSize = 50;

  const anos = useMemo(() => getAnos(), []);

  // Debounce da busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Restaurar filtros da URL ao carregar a página
  useEffect(() => {
    if (filtrosRestaurados) return;
    
    const params = new URLSearchParams(searchString);
    const convenioIdUrl = params.get('convenioId');
    const mesReferenciaUrl = params.get('mesReferencia');
    const anoReferenciaUrl = params.get('anoReferencia');
    const searchTermUrl = params.get('searchTerm');
    
    if (convenioIdUrl) setConvenioId(convenioIdUrl);
    if (mesReferenciaUrl) setMesReferencia(mesReferenciaUrl);
    if (anoReferenciaUrl) setAnoReferencia(anoReferenciaUrl);
    if (searchTermUrl) setSearchTerm(searchTermUrl);
    
    setFiltrosRestaurados(true);
  }, [searchString, filtrosRestaurados]);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setPage(1);
  }, [convenioId, mesReferencia, anoReferencia]);

  // Buscar convênios
  const { data: convenios } = trpc.convenios.list.useQuery({});

  // Buscar dados de faturamento_tiss
  const { data: faturamentoData, isLoading, refetch } = trpc.faturamentoTiss.list.useQuery(
    {
      convenioId: convenioId && convenioId !== "all" ? parseInt(convenioId) : undefined,
      estabelecimentoId: estabelecimentoAtual?.id,
      search: searchDebounced || undefined,
      mesReferencia: mesReferencia && mesReferencia !== "all" ? parseInt(mesReferencia) : undefined,
      anoReferencia: anoReferencia && anoReferencia !== "all" ? parseInt(anoReferencia) : undefined,
      page: 1,
      pageSize: 10000, // Buscar todos para agrupar no frontend
    },
    { enabled: !!estabelecimentoAtual }
  );

  const itens = faturamentoData?.items || [];

  // Agrupar itens por guia (chave composta)
  const contasAgrupadas = useMemo(() => {
    const grupos: Record<string, ContaAgrupada> = {};
    
    itens.forEach((item: any) => {
      const loteValido = item.numeroLote && item.numeroLote !== 'null' && String(item.numeroLote).trim() !== '';
      const seqValido = item.sequencialTransacao && item.sequencialTransacao !== 'null' && String(item.sequencialTransacao).trim() !== '';
      
      let chave: string;
      if (loteValido && seqValido) {
        chave = `${item.numeroGuiaPrestador || 'sem_guia'}_${item.numeroLote}_${item.sequencialTransacao}`;
      } else if (loteValido) {
        chave = `${item.numeroGuiaPrestador || 'sem_guia'}_${item.numeroLote}_sem_seq`;
      } else {
        chave = `${item.numeroGuiaPrestador || 'sem_guia'}_arquivo_${item.arquivoId}`;  
      }
      
      if (!grupos[chave]) {
        grupos[chave] = {
          chave,
          guiaNumero: item.numeroGuiaPrestador || "-",
          numeroLote: item.numeroLote || "-",
          sequencialTransacao: item.sequencialTransacao || "-",
          senha: item.senha || "-",
          carteirinha: item.carteiraBeneficiario || "-",
          dataConta: item.dataExecucao ? new Date(item.dataExecucao) : null,
          valorTotal: 0,
          pacienteNome: "-",
          convenioNome: "-",
          arquivoNome: "-",
          arquivoId: item.arquivoId,
          itens: [],
          quantidadeItens: 0,
        };
      }
      
      // Acumular valores e itens
      grupos[chave].valorTotal += parseFloat(item.valorTotalItem || "0");
      grupos[chave].itens.push(item);
      grupos[chave].quantidadeItens++;
      
      // Usar a data mais antiga como data da conta
      if (item.dataExecucao) {
        const dataItem = new Date(item.dataExecucao);
        const currentDate = grupos[chave].dataConta;
        if (!currentDate || dataItem < currentDate) {
          grupos[chave].dataConta = dataItem;
        }
      }
      
      // Preencher dados que podem estar vazios
      if (item.carteiraBeneficiario && grupos[chave].carteirinha === "-") {
        grupos[chave].carteirinha = item.carteiraBeneficiario;
      }
      if (item.senha && grupos[chave].senha === "-") {
        grupos[chave].senha = item.senha;
      }
    });
    
    // Converter para array e ordenar por data (mais recente primeiro)
    return Object.values(grupos).sort((a, b) => {
      if (!a.dataConta) return 1;
      if (!b.dataConta) return -1;
      return b.dataConta.getTime() - a.dataConta.getTime();
    });
  }, [itens]);

  // Paginação das contas
  const totalContas = contasAgrupadas.length;
  const totalPages = Math.ceil(totalContas / pageSize);
  const contasPaginadas = contasAgrupadas.slice((page - 1) * pageSize, page * pageSize);

  // Totais
  const valorTotalGeral = contasAgrupadas.reduce((acc, c) => acc + c.valorTotal, 0);
  const totalItens = contasAgrupadas.reduce((acc, c) => acc + c.quantidadeItens, 0);

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

    const excelData = contasAgrupadas.map((c) => ({
      "Guia": c.guiaNumero,
      "Nº Lote": c.numeroLote,
      "Seq. Transação": c.sequencialTransacao,
      "Senha": c.senha,
      "Carteirinha": c.carteirinha,
      "Data Conta": c.dataConta ? c.dataConta.toLocaleDateString("pt-BR") : "-",
      "Valor Total": c.valorTotal,
      "Qtd Itens": c.quantidadeItens,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Contas");
    
    const convenioSelecionado = convenios?.find((c: any) => String(c.id) === convenioId);
    const nomeConvenio = convenioSelecionado ? `_${convenioSelecionado.nome.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    XLSX.writeFile(wb, `contas_faturamento${nomeConvenio}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleExportExcelItens = () => {
    if (!contasAgrupadas.length) return;

    const itensData: any[] = [];
    
    contasAgrupadas.forEach((conta) => {
      conta.itens.forEach((item: any) => {
        itensData.push({
          "Guia": conta.guiaNumero,
          "Nº Lote": conta.numeroLote,
          "Seq. Transação": conta.sequencialTransacao,
          "Senha": conta.senha,
          "Carteirinha": conta.carteirinha,
          "Data Execução": item.dataExecucao ? new Date(item.dataExecucao).toLocaleDateString("pt-BR") : "-",
          "Código": item.codigoItem || "-",
          "Descrição": item.descricaoItem || "-",
          "Tipo": item.tipoItem || "-",
          "Quantidade": parseFloat(item.quantidade || 1),
          "Valor Unitário": parseFloat(item.valorUnitario || 0),
          "Valor Total": parseFloat(item.valorTotalItem || 0),
          "Médico": item.nomeProf || "-",
          "CRM": item.conselhoProf || "-",
        });
      });
    });

    const wb = XLSX.utils.book_new();
    
    // Aba 1: Resumo por Conta
    const resumoData = contasAgrupadas.map((c) => ({
      "Guia": c.guiaNumero,
      "Nº Lote": c.numeroLote,
      "Seq. Transação": c.sequencialTransacao,
      "Senha": c.senha,
      "Carteirinha": c.carteirinha,
      "Data Conta": c.dataConta ? c.dataConta.toLocaleDateString("pt-BR") : "-",
      "Valor Total": c.valorTotal,
      "Qtd Itens": c.quantidadeItens,
    }));
    const wsResumo = XLSX.utils.json_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo Contas");
    
    // Aba 2: Itens Detalhados
    const wsItens = XLSX.utils.json_to_sheet(itensData);
    XLSX.utils.book_append_sheet(wb, wsItens, "Itens Detalhados");

    const convenioSelecionado = convenios?.find((c: any) => String(c.id) === convenioId);
    const nomeConvenio = convenioSelecionado ? `_${convenioSelecionado.nome.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    XLSX.writeFile(wb, `relatorio_itens_faturamento${nomeConvenio}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return date.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const handleVerDetalhes = (conta: ContaAgrupada) => {
    const params = new URLSearchParams();
    params.set('origem', 'conta-convenio');
    params.set('chave', conta.chave);
    params.set('arquivoId', String(conta.arquivoId));
    if (convenioId) params.set('convenioId', convenioId);
    if (mesReferencia) params.set('mesReferencia', mesReferencia);
    if (anoReferencia) params.set('anoReferencia', anoReferencia);
    if (searchTerm) params.set('searchTerm', searchTerm);
    setLocation(`/contas/${encodeURIComponent(conta.chave)}?${params.toString()}`);
  };

  const handleLimparFiltros = () => {
    setConvenioId("");
    setMesReferencia("");
    setAnoReferencia("");
    setSearchTerm("");
  };

  // Verificar se há filtros ativos
  const temFiltrosAtivos = (convenioId && convenioId !== "all") || (mesReferencia && mesReferencia !== "all") || (anoReferencia && anoReferencia !== "all") || searchTerm;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conta Convênio</h1>
            <p className="text-muted-foreground">
              Arquivos XML enviados para as operadoras - Tabela faturamento_tiss
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={!contasAgrupadas.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel Resumo
            </Button>
            <Button onClick={handleExportExcelItens} disabled={!contasAgrupadas.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel Itens
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioId} onValueChange={setConvenioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os convênios</SelectItem>
                    {convenios?.map((convenio: any) => (
                      <SelectItem key={convenio.id} value={String(convenio.id)}>
                        {convenio.nome} ({convenio.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Mês
                </label>
                <Select value={mesReferencia} onValueChange={setMesReferencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {MESES.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Ano
                </label>
                <Select value={anoReferencia} onValueChange={setAnoReferencia}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {anos.map((ano) => (
                      <SelectItem key={ano.value} value={ano.value}>
                        {ano.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Busca</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Guia, código, carteirinha..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

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

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Contas</p>
                  <p className="text-2xl font-bold">{totalContas.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Itens</p>
                  <p className="text-2xl font-bold">{totalItens.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-xl font-bold text-emerald-600">{formatCurrency(valorTotalGeral)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Média por Conta</p>
                  <p className="text-xl font-bold text-orange-600">
                    {totalContas > 0 ? formatCurrency(valorTotalGeral / totalContas) : "R$ 0,00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de contas */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : contasPaginadas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma conta encontrada</p>
                <p className="text-sm">Ajuste os filtros ou importe arquivos XML</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Guia</TableHead>
                      <TableHead>Nº Lote</TableHead>
                      <TableHead>Senha</TableHead>
                      <TableHead>Carteirinha</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-center">Itens</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasPaginadas.map((conta) => (
                      <React.Fragment key={conta.chave}>
                        <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(conta.chave)}>
                          <TableCell>
                            {expandedRows.has(conta.chave) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono">{conta.guiaNumero}</TableCell>
                          <TableCell className="font-mono">{conta.numeroLote}</TableCell>
                          <TableCell className="font-mono">{conta.senha}</TableCell>
                          <TableCell className="font-mono">{conta.carteirinha}</TableCell>
                          <TableCell>{formatDate(conta.dataConta)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(conta.valorTotal)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{conta.quantidadeItens}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVerDetalhes(conta);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        
                        {/* Linha expandida com itens */}
                        {expandedRows.has(conta.chave) && (
                          <TableRow>
                            <TableCell colSpan={9} className="bg-muted/30 p-4">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Itens da Conta</h4>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Código</TableHead>
                                      <TableHead>Descrição</TableHead>
                                      <TableHead>Tipo</TableHead>
                                      <TableHead>Data Exec.</TableHead>
                                      <TableHead className="text-right">Qtd</TableHead>
                                      <TableHead className="text-right">Valor Unit.</TableHead>
                                      <TableHead className="text-right">Valor Total</TableHead>
                                      <TableHead>Profissional</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {conta.itens.map((item: any, idx: number) => (
                                      <TableRow key={idx}>
                                        <TableCell className="font-mono">{item.codigoItem || "-"}</TableCell>
                                        <TableCell className="max-w-[200px] truncate">{item.descricaoItem || "-"}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline">{item.tipoItem || "-"}</Badge>
                                        </TableCell>
                                        <TableCell>
                                          {item.dataExecucao ? new Date(item.dataExecucao).toLocaleDateString("pt-BR") : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">{parseFloat(item.quantidade || 1)}</TableCell>
                                        <TableCell className="text-right font-mono">
                                          {formatCurrency(parseFloat(item.valorUnitario || 0))}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold">
                                          {formatCurrency(parseFloat(item.valorTotalItem || 0))}
                                        </TableCell>
                                        <TableCell>
                                          {item.nomeProf ? (
                                            <span className="text-sm">
                                              {item.nomeProf}
                                              {item.conselhoProf && <span className="text-muted-foreground ml-1">({item.conselhoProf})</span>}
                                            </span>
                                          ) : "-"}
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
                    ))}
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
