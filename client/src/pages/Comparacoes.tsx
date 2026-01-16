import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  GitCompare, 
  Plus, 
  AlertTriangle, 
  CheckCircle2,
  Eye,
  Loader2,
  ArrowRight,
  Table2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function Comparacoes() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [arquivoEnviadoId, setArquivoEnviadoId] = useState<string>("");
  const [arquivoRetornadoId, setArquivoRetornadoId] = useState<string>("");
  const [filtroConvenio, setFiltroConvenio] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState("arquivos");
  
  // Estados para comparação com tabela de preços
  const [tabelaConvenioId, setTabelaConvenioId] = useState<string>("");
  const [tabelaTipo, setTabelaTipo] = useState<string>("todos");
  const [tabelaSearch, setTabelaSearch] = useState("");
  const [comparandoTabela, setComparandoTabela] = useState(false);

  const { data: comparacoes, isLoading, refetch } = trpc.comparacoes.list.useQuery({
    convenioId: filtroConvenio !== "todos" ? parseInt(filtroConvenio) : undefined,
    status: filtroStatus !== "todos" ? filtroStatus as "pendente" | "concluida" | "erro" : undefined,
  });

  const { data: convenios } = trpc.convenios.list.useQuery({ ativo: "sim" });
  const { data: arquivosEnviados } = trpc.arquivos.list.useQuery({ 
    direcao: "enviado", 
    status: "processado" 
  });
  const { data: arquivosRetornados } = trpc.arquivos.list.useQuery({ 
    direcao: "retornado", 
    status: "processado" 
  });

  // Buscar tabelas de preços do convênio selecionado
  const { data: tabelasPreco } = trpc.tabelasPreco.list.useQuery(
    { 
      convenioId: tabelaConvenioId ? parseInt(tabelaConvenioId) : 0,
      tipo: tabelaTipo !== "todos" ? tabelaTipo as "diarias" | "mat_med" | "taxas" | "procedimentos" : undefined,
      nome: tabelaSearch || undefined,
    },
    { enabled: !!tabelaConvenioId }
  );

  // Buscar procedimentos enviados do convênio para comparar com tabela
  const { data: procedimentosEnviados } = trpc.procedimentos.list.useQuery(
    {
      convenioId: tabelaConvenioId ? parseInt(tabelaConvenioId) : undefined,
      page: 1,
      pageSize: 10000,
    },
    { enabled: !!tabelaConvenioId && activeTab === "tabela" }
  );

  // Comparar procedimentos com tabela de preços
  const comparacaoTabela = useMemo(() => {
    if (!procedimentosEnviados?.items || !tabelasPreco?.items) {
      return { divergencias: [], resumo: { total: 0, divergentes: 0, valorDiferenca: 0, valorCobradoTotal: 0, valorTabelaTotal: 0 } };
    }

    const tabelaMap = new Map<string, typeof tabelasPreco.items[0]>();
    tabelasPreco.items.forEach(item => {
      tabelaMap.set(item.codigo, item);
    });

    const divergencias: Array<{
      procedimentoId: number;
      codigo: string;
      descricao: string;
      valorCobrado: number;
      valorTabela: number | null;
      diferenca: number;
      percentualDiferenca: number;
      status: "acima" | "abaixo" | "sem_tabela" | "ok";
      paciente: string;
      guia: string;
      dataExecucao: Date | null;
    }> = [];

    let totalDivergentes = 0;
    let valorDiferencaTotal = 0;
    let valorCobradoTotal = 0;
    let valorTabelaTotal = 0;

    for (const proc of procedimentosEnviados.items) {
      const tabelaItem = tabelaMap.get(proc.codigo);
      const valorCobrado = parseFloat(proc.valorTotal || "0");
      valorCobradoTotal += valorCobrado;

      if (!tabelaItem) {
        // Código não encontrado na tabela
        divergencias.push({
          procedimentoId: proc.id,
          codigo: proc.codigo,
          descricao: proc.descricao || "",
          valorCobrado,
          valorTabela: null,
          diferenca: 0,
          percentualDiferenca: 0,
          status: "sem_tabela",
          paciente: proc.pacienteNome || "",
          guia: proc.guiaNumero || "",
          dataExecucao: proc.dataExecucao,
        });
        totalDivergentes++;
      } else {
        const valorTabela = parseFloat(tabelaItem.valor);
        valorTabelaTotal += valorTabela;
        const diferenca = valorCobrado - valorTabela;
        const percentualDiferenca = valorTabela > 0 ? ((valorCobrado - valorTabela) / valorTabela) * 100 : 0;

        // Considerar divergência se diferença > 1% ou > R$ 1,00
        const isDivergente = Math.abs(percentualDiferenca) > 1 || Math.abs(diferenca) > 1;

        if (isDivergente) {
          divergencias.push({
            procedimentoId: proc.id,
            codigo: proc.codigo,
            descricao: proc.descricao || "",
            valorCobrado,
            valorTabela,
            diferenca,
            percentualDiferenca,
            status: diferenca > 0 ? "acima" : "abaixo",
            paciente: proc.pacienteNome || "",
            guia: proc.guiaNumero || "",
            dataExecucao: proc.dataExecucao,
          });
          totalDivergentes++;
          valorDiferencaTotal += diferenca;
        }
      }
    }

    // Ordenar por diferença absoluta (maiores primeiro)
    divergencias.sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca));

    return {
      divergencias,
      resumo: {
        total: procedimentosEnviados.items.length,
        divergentes: totalDivergentes,
        valorDiferenca: valorDiferencaTotal,
        valorCobradoTotal,
        valorTabelaTotal,
      },
    };
  }, [procedimentosEnviados, tabelasPreco]);

  const criarComparacaoMutation = trpc.comparacoes.criar.useMutation();
  const utils = trpc.useUtils();

  const handleCriarComparacao = async () => {
    if (!arquivoEnviadoId || !arquivoRetornadoId) {
      toast.error("Selecione os arquivos para comparação");
      return;
    }

    try {
      const result = await criarComparacaoMutation.mutateAsync({
        arquivoEnviadoId: parseInt(arquivoEnviadoId),
        arquivoRetornadoId: parseInt(arquivoRetornadoId),
      });

      toast.success(`Comparação realizada! ${result.totalDivergencias} divergência(s) encontrada(s)`);
      setDialogOpen(false);
      setArquivoEnviadoId("");
      setArquivoRetornadoId("");
      
      utils.comparacoes.list.invalidate();
      utils.comparacoes.stats.invalidate();
      utils.dashboard.resumo.invalidate();
      utils.dashboard.ultimasComparacoes.invalidate();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar comparação");
    }
  };

  const getStatusBadge = (status: string, divergencias: number | null) => {
    if (status === "concluida") {
      if (divergencias && divergencias > 0) {
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Com Divergências</Badge>;
      }
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OK</Badge>;
    }
    if (status === "erro") {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Erro</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">Pendente</Badge>;
  };

  const formatCurrency = (value: string | number | null) => {
    if (value === null || value === undefined) return "R$ 0,00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `R$ ${num.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Comparações</h1>
          <p className="text-slate-500">
            Compare arquivos enviados vs retornados ou valores cobrados vs tabela de preços
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="arquivos" className="flex items-center gap-2">
              <GitCompare className="h-4 w-4" />
              Arquivos
            </TabsTrigger>
            <TabsTrigger value="tabela" className="flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Tabela de Preços
            </TabsTrigger>
          </TabsList>

          {/* Aba de Comparação de Arquivos */}
          <TabsContent value="arquivos" className="space-y-6">
            {/* Filters */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Select value={filtroConvenio} onValueChange={setFiltroConvenio}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Convênio" />
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

                    <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos status</SelectItem>
                        <SelectItem value="concluida">Concluída</SelectItem>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="erro">Erro</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setFiltroConvenio("todos");
                        setFiltroStatus("todos");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>

                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Comparação
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de Comparações</CardTitle>
                <CardDescription>
                  {comparacoes?.length || 0} comparação(ões) encontrada(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : comparacoes?.length === 0 ? (
                  <div className="text-center py-12">
                    <GitCompare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhuma comparação realizada</p>
                    <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                      Criar primeira comparação
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>ID</TableHead>
                          <TableHead>Convênio</TableHead>
                          <TableHead className="text-right">Itens Env.</TableHead>
                          <TableHead className="text-right">Itens Ret.</TableHead>
                          <TableHead className="text-right">Valor Env.</TableHead>
                          <TableHead className="text-right">Valor Ret.</TableHead>
                          <TableHead className="text-center">Divergências</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparacoes?.map((comp) => (
                          <TableRow key={comp.id} className="hover:bg-slate-50">
                            <TableCell className="font-mono text-sm">#{comp.id}</TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-600">
                                {convenios?.find(c => c.id === comp.convenioId)?.nome || "-"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{comp.totalItensEnviados || 0}</TableCell>
                            <TableCell className="text-right">{comp.totalItensRetornados || 0}</TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(comp.valorTotalEnviado)}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(comp.valorTotalRetornado)}
                            </TableCell>
                            <TableCell className="text-center">
                              {comp.totalDivergencias && comp.totalDivergencias > 0 ? (
                                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                  <AlertTriangle className="h-4 w-4" />
                                  {comp.totalDivergencias}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  0
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(comp.status, comp.totalDivergencias)}</TableCell>
                            <TableCell>
                              <span className="text-sm text-slate-500">
                                {new Date(comp.createdAt).toLocaleDateString("pt-BR")}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setLocation(`/divergencias?comparacaoId=${comp.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
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

          {/* Aba de Comparação com Tabela de Preços */}
          <TabsContent value="tabela" className="space-y-6">
            {/* Filtros */}
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Select value={tabelaConvenioId} onValueChange={setTabelaConvenioId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecione o convênio" />
                      </SelectTrigger>
                      <SelectContent>
                        {convenios?.map((conv) => (
                          <SelectItem key={conv.id} value={conv.id.toString()}>
                            {conv.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={tabelaTipo} onValueChange={setTabelaTipo}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos tipos</SelectItem>
                        <SelectItem value="diarias">Diárias</SelectItem>
                        <SelectItem value="mat_med">Mat/Med</SelectItem>
                        <SelectItem value="taxas">Taxas</SelectItem>
                        <SelectItem value="procedimentos">Procedimentos</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar código ou descrição..."
                        value={tabelaSearch}
                        onChange={(e) => setTabelaSearch(e.target.value)}
                        className="pl-9 w-[250px]"
                      />
                    </div>
                  </div>

                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/tabelas-preco")}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Gerenciar Tabelas
                  </Button>
                </div>
              </CardContent>
            </Card>

            {!tabelaConvenioId ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12">
                  <div className="text-center">
                    <Table2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Selecione um convênio para comparar valores cobrados com a tabela de preços</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Cards de Resumo */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <FileSpreadsheet className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Total Itens</p>
                          <p className="text-2xl font-bold">{comparacaoTabela.resumo.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 rounded-lg">
                          <AlertTriangle className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Divergências</p>
                          <p className="text-2xl font-bold text-amber-600">{comparacaoTabela.resumo.divergentes}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                          <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Valor Cobrado</p>
                          <p className="text-xl font-bold">{formatCurrency(comparacaoTabela.resumo.valorCobradoTotal)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${comparacaoTabela.resumo.valorDiferenca > 0 ? "bg-red-100" : "bg-green-100"}`}>
                          {comparacaoTabela.resumo.valorDiferenca > 0 ? (
                            <TrendingUp className="h-6 w-6 text-red-600" />
                          ) : (
                            <TrendingDown className="h-6 w-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Diferença Total</p>
                          <p className={`text-xl font-bold ${comparacaoTabela.resumo.valorDiferenca > 0 ? "text-red-600" : "text-green-600"}`}>
                            {comparacaoTabela.resumo.valorDiferenca > 0 ? "+" : ""}{formatCurrency(comparacaoTabela.resumo.valorDiferenca)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabela de Divergências */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Divergências de Valores</CardTitle>
                    <CardDescription>
                      Itens com valor cobrado diferente da tabela de preços contratada
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {comparacaoTabela.divergencias.length === 0 ? (
                      <div className="text-center py-12">
                        <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
                        <p className="text-slate-500">Nenhuma divergência encontrada</p>
                        <p className="text-sm text-slate-400 mt-2">
                          Todos os valores cobrados estão de acordo com a tabela de preços
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead>Código</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Paciente</TableHead>
                              <TableHead>Guia</TableHead>
                              <TableHead className="text-right">Valor Cobrado</TableHead>
                              <TableHead className="text-right">Valor Tabela</TableHead>
                              <TableHead className="text-right">Diferença</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {comparacaoTabela.divergencias.slice(0, 100).map((div, index) => (
                              <TableRow key={index} className="hover:bg-slate-50">
                                <TableCell className="font-mono text-sm">{div.codigo}</TableCell>
                                <TableCell className="max-w-[200px] truncate" title={div.descricao}>
                                  {div.descricao}
                                </TableCell>
                                <TableCell className="max-w-[150px] truncate" title={div.paciente}>
                                  {div.paciente || "-"}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{div.guia || "-"}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(div.valorCobrado)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {div.valorTabela !== null ? formatCurrency(div.valorTabela) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </TableCell>
                                <TableCell className={`text-right font-medium ${div.diferenca > 0 ? "text-red-600" : div.diferenca < 0 ? "text-green-600" : ""}`}>
                                  {div.status === "sem_tabela" ? "-" : (
                                    <>
                                      {div.diferenca > 0 ? "+" : ""}{formatCurrency(div.diferenca)}
                                      <span className="text-xs text-slate-400 ml-1">
                                        ({div.percentualDiferenca > 0 ? "+" : ""}{div.percentualDiferenca.toFixed(1)}%)
                                      </span>
                                    </>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {div.status === "acima" && (
                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                      <TrendingUp className="h-3 w-3 mr-1" />
                                      Acima
                                    </Badge>
                                  )}
                                  {div.status === "abaixo" && (
                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                      <TrendingDown className="h-3 w-3 mr-1" />
                                      Abaixo
                                    </Badge>
                                  )}
                                  {div.status === "sem_tabela" && (
                                    <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Sem Tabela
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {comparacaoTabela.divergencias.length > 100 && (
                          <div className="p-4 text-center text-sm text-slate-500 bg-slate-50 border-t">
                            Exibindo 100 de {comparacaoTabela.divergencias.length} divergências
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Nova Comparação Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Comparação</DialogTitle>
            <DialogDescription>
              Selecione um arquivo enviado e um retornado do mesmo convênio para comparar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Arquivo Enviado</Label>
              <Select value={arquivoEnviadoId} onValueChange={setArquivoEnviadoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o arquivo enviado" />
                </SelectTrigger>
                <SelectContent>
                  {arquivosEnviados?.map((arq) => (
                    <SelectItem key={arq.id} value={arq.id.toString()}>
                      {arq.nome} ({convenios?.find(c => c.id === arq.convenioId)?.nome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-slate-400" />
            </div>

            <div className="space-y-2">
              <Label>Arquivo Retornado</Label>
              <Select value={arquivoRetornadoId} onValueChange={setArquivoRetornadoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o arquivo retornado" />
                </SelectTrigger>
                <SelectContent>
                  {arquivosRetornados?.map((arq) => (
                    <SelectItem key={arq.id} value={arq.id.toString()}>
                      {arq.nome} ({convenios?.find(c => c.id === arq.convenioId)?.nome})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCriarComparacao}
              disabled={!arquivoEnviadoId || !arquivoRetornadoId || criarComparacaoMutation.isPending}
            >
              {criarComparacaoMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Comparando...
                </>
              ) : (
                <>
                  <GitCompare className="h-4 w-4 mr-2" />
                  Comparar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
