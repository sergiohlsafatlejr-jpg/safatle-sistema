import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  DollarSign, BarChart3, AlertTriangle, Package, Search, RefreshCw, Loader2,
  TrendingUp, TrendingDown, ArrowUpDown, ChevronDown, ChevronUp, Info, Zap,
  ShieldAlert, CheckCircle2, XCircle, Activity
} from "lucide-react";

export default function PadroesCobranca() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const [activeTab, setActiveTab] = useState("resumo");
  const [selectedConvenio, setSelectedConvenio] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipoItem, setSelectedTipoItem] = useState<string>("");
  const [selectedNivelRisco, setSelectedNivelRisco] = useState<string>("");
  const [selectedSetor, setSelectedSetor] = useState<string>("");
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [pagePreco, setPagePreco] = useState(1);
  const [pageGlosa, setPageGlosa] = useState(1);
  const [pageQtd, setPageQtd] = useState(1);
  const [pageComp, setPageComp] = useState(1);

  const estabelecimentoId = estabelecimentoAtual?.id || 1;

  // Queries
  const resumo = trpc.padroesCobranca.resumo.useQuery({ estabelecimentoId });
  const convenios = trpc.padroesCobranca.listarConvenios.useQuery({ estabelecimentoId });
  const setores = trpc.padroesCobranca.listarSetores.useQuery({ estabelecimentoId });

  const padroesPreco = trpc.padroesCobranca.consultarPadroesPreco.useQuery(
    { estabelecimentoId, convenio: selectedConvenio || undefined, busca: searchTerm || undefined, tipoItem: selectedTipoItem || undefined, page: pagePreco },
    { enabled: activeTab === "preco" }
  );

  const padroesGlosa = trpc.padroesCobranca.consultarPadroesGlosa.useQuery(
    { estabelecimentoId, convenio: selectedConvenio || undefined, busca: searchTerm || undefined, nivelRisco: (selectedNivelRisco || undefined) as any, apenasComGlosa: true, page: pageGlosa },
    { enabled: activeTab === "glosa" }
  );

  const padroesQuantidade = trpc.padroesCobranca.consultarPadroesQuantidade.useQuery(
    { estabelecimentoId, convenio: selectedConvenio || undefined, setor: selectedSetor || undefined, busca: searchTerm || undefined, page: pageQtd },
    { enabled: activeTab === "quantidade" }
  );

  const padroesComposicao = trpc.padroesCobranca.consultarPadroesComposicao.useQuery(
    { estabelecimentoId, busca: searchTerm || undefined, page: pageComp },
    { enabled: activeTab === "composicao" }
  );

  // Mutations
  const gerarPreco = trpc.padroesCobranca.gerarPadroesPreco.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      padroesPreco.refetch();
      resumo.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const gerarGlosa = trpc.padroesCobranca.gerarPadroesGlosa.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      padroesGlosa.refetch();
      resumo.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const gerarQuantidade = trpc.padroesCobranca.gerarPadroesQuantidade.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      padroesQuantidade.refetch();
      resumo.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const gerarComposicao = trpc.padroesCobranca.gerarPadroesComposicao.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      padroesComposicao.refetch();
      resumo.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const gerarTodos = async () => {
    toast.info("Gerando todos os padrões... isso pode levar alguns minutos.");
    try {
      await gerarPreco.mutateAsync({ estabelecimentoId, convenio: selectedConvenio || undefined });
      await gerarGlosa.mutateAsync({ estabelecimentoId, convenio: selectedConvenio || undefined });
      await gerarQuantidade.mutateAsync({ estabelecimentoId, convenio: selectedConvenio || undefined });
      await gerarComposicao.mutateAsync({ estabelecimentoId, convenio: selectedConvenio || undefined });
      toast.success("Todos os padrões foram gerados com sucesso!");
    } catch (err: any) {
      toast.error(`Erro ao gerar padrões: ${err.message}`);
    }
  };

  const isGenerating = gerarPreco.isPending || gerarGlosa.isPending || gerarQuantidade.isPending || gerarComposicao.isPending;

  const nivelRiscoBadge = (nivel: string) => {
    const config: Record<string, { color: string; icon: any }> = {
      critico: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
      alto: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", icon: AlertTriangle },
      medio: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Info },
      baixo: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
    };
    const c = config[nivel] || config.baixo;
    const Icon = c.icon;
    return (
      <Badge variant="outline" className={`${c.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
      </Badge>
    );
  };

  const confiancaBadge = (valor: number) => {
    if (valor >= 85) return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">{valor}%</Badge>;
    if (valor >= 55) return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">{valor}%</Badge>;
    return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">{valor}%</Badge>;
  };

  const formatCurrency = (val: string | number | null) => {
    const num = parseFloat(String(val || "0"));
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatNumber = (val: string | number | null, decimals = 2) => {
    const num = parseFloat(String(val || "0"));
    return num.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const Pagination = ({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
        <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Padrões de Cobrança</h1>
            <p className="text-muted-foreground">Análise inteligente de padrões por convênio baseada em {resumo.data?.dadosDisponiveis?.totalItens?.toLocaleString("pt-BR") || "..."} itens faturados</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedConvenio} onValueChange={setSelectedConvenio}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todos os convênios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os convênios</SelectItem>
                {(convenios.data as any[])?.map((c: any) => (
                  <SelectItem key={c.convenio} value={c.convenio}>
                    {c.convenio} ({Number(c.totalContas).toLocaleString("pt-BR")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={gerarTodos} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Gerar Todos
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchTerm(""); setPagePreco(1); setPageGlosa(1); setPageQtd(1); setPageComp(1); }}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="resumo" className="gap-2"><Activity className="h-4 w-4" />Resumo</TabsTrigger>
            <TabsTrigger value="preco" className="gap-2"><DollarSign className="h-4 w-4" />Preços</TabsTrigger>
            <TabsTrigger value="glosa" className="gap-2"><AlertTriangle className="h-4 w-4" />Glosas</TabsTrigger>
            <TabsTrigger value="quantidade" className="gap-2"><BarChart3 className="h-4 w-4" />Quantidades</TabsTrigger>
            <TabsTrigger value="composicao" className="gap-2"><Package className="h-4 w-4" />Composição</TabsTrigger>
          </TabsList>

          {/* ========== RESUMO ========== */}
          <TabsContent value="resumo" className="space-y-6">
            {/* Cards de dados disponíveis */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Itens Faturados</CardDescription>
                  <CardTitle className="text-2xl">{resumo.data?.dadosDisponiveis?.totalItens?.toLocaleString("pt-BR") || "0"}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Contas</CardDescription>
                  <CardTitle className="text-2xl">{resumo.data?.dadosDisponiveis?.totalContas?.toLocaleString("pt-BR") || "0"}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Convênios</CardDescription>
                  <CardTitle className="text-2xl">{resumo.data?.dadosDisponiveis?.totalConvenios || "0"}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Período</CardDescription>
                  <CardTitle className="text-lg">{resumo.data?.dadosDisponiveis?.competenciaMin || "..."} a {resumo.data?.dadosDisponiveis?.competenciaMax || "..."}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Cards de padrões gerados */}
            <h3 className="text-lg font-semibold">Padrões Gerados</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("preco")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-400" />
                    <CardDescription>Padrões de Preço</CardDescription>
                  </div>
                  <CardTitle className="text-2xl">{resumo.data?.padroes?.preco?.toLocaleString("pt-BR") || "0"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Valor médio, mín, máx e desvio por item/convênio</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("glosa")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <CardDescription>Padrões de Glosa</CardDescription>
                  </div>
                  <CardTitle className="text-2xl">{resumo.data?.padroes?.glosa?.toLocaleString("pt-BR") || "0"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Taxa de glosa e códigos frequentes por item/convênio</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("quantidade")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    <CardDescription>Padrões de Quantidade</CardDescription>
                  </div>
                  <CardTitle className="text-2xl">{resumo.data?.padroes?.quantidade?.toLocaleString("pt-BR") || "0"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Quantidade média e limites por item/setor</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveTab("composicao")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-400" />
                    <CardDescription>Composição de Conta</CardDescription>
                  </div>
                  <CardTitle className="text-2xl">{resumo.data?.padroes?.composicao?.toLocaleString("pt-BR") || "0"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Kit cirúrgico: itens associados a cada procedimento</p>
                </CardContent>
              </Card>
            </div>

            {/* Convênios */}
            <h3 className="text-lg font-semibold">Convênios com Dados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(convenios.data as any[])?.map((c: any) => (
                <Card key={c.convenio} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setSelectedConvenio(c.convenio); setActiveTab("preco"); }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{c.convenio}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Itens:</span>
                      <span>{Number(c.totalItens).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Contas:</span>
                      <span>{Number(c.totalContas).toLocaleString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Faturado:</span>
                      <span className="font-medium text-green-400">{formatCurrency(c.totalFaturado)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ========== PREÇOS ========== */}
          <TabsContent value="preco" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código ou descrição..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPagePreco(1); }} className="pl-9" />
              </div>
              <Select value={selectedTipoItem} onValueChange={setSelectedTipoItem}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="P">Procedimento</SelectItem>
                  <SelectItem value="T">Taxa</SelectItem>
                  <SelectItem value="M">Material</SelectItem>
                  <SelectItem value="D">Medicamento</SelectItem>
                  <SelectItem value="H">Honorário</SelectItem>
                  <SelectItem value="DI">Diária</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => gerarPreco.mutate({ estabelecimentoId, convenio: selectedConvenio || undefined })} disabled={gerarPreco.isPending} className="gap-2">
                {gerarPreco.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar Padrões
              </Button>
            </div>

            {padroesPreco.isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : padroesPreco.data?.items?.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum padrão de preço encontrado. Clique em "Atualizar Padrões" para gerar.</p>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{padroesPreco.data?.total} padrões encontrados</p>
                <div className="space-y-2">
                  {padroesPreco.data?.items?.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{item.codigoItem}</Badge>
                              <Badge variant="secondary" className="text-xs">{item.tipoItem || "?"}</Badge>
                              <span className="text-xs text-muted-foreground">{item.convenio}</span>
                            </div>
                            <p className="text-sm font-medium truncate">{item.descricaoItem || "Sem descrição"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-green-400">{formatCurrency(item.mediaFaturado)}</p>
                            <p className="text-xs text-muted-foreground">média faturado</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Unitário Médio</p>
                            <p className="font-medium">{formatCurrency(item.mediaUnitario)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Mín / Máx</p>
                            <p className="font-medium">{formatCurrency(item.minFaturado)} - {formatCurrency(item.maxFaturado)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Desvio Padrão</p>
                            <p className="font-medium">{formatCurrency(item.desvioFaturado)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Ocorrências</p>
                            <p className="font-medium">{item.totalOcorrencias} ({item.totalContas} contas)</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Confiança</p>
                            {confiancaBadge(item.confianca)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <Pagination page={pagePreco} totalPages={padroesPreco.data?.totalPages || 1} setPage={setPagePreco} />
              </>
            )}
          </TabsContent>

          {/* ========== GLOSAS ========== */}
          <TabsContent value="glosa" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código ou descrição..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPageGlosa(1); }} className="pl-9" />
              </div>
              <Select value={selectedNivelRisco} onValueChange={setSelectedNivelRisco}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Nível de risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os níveis</SelectItem>
                  <SelectItem value="critico">Crítico</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => gerarGlosa.mutate({ estabelecimentoId, convenio: selectedConvenio || undefined })} disabled={gerarGlosa.isPending} className="gap-2">
                {gerarGlosa.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar Padrões
              </Button>
            </div>

            {padroesGlosa.isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : padroesGlosa.data?.items?.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum padrão de glosa encontrado. Clique em "Atualizar Padrões" para gerar.</p>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{padroesGlosa.data?.total} padrões encontrados</p>
                <div className="space-y-2">
                  {padroesGlosa.data?.items?.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{item.codigoItem}</Badge>
                              {nivelRiscoBadge(item.nivelRisco)}
                              <span className="text-xs text-muted-foreground">{item.convenio}</span>
                            </div>
                            <p className="text-sm font-medium truncate">{item.descricaoItem || "Sem descrição"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-red-400">{formatNumber(item.taxaGlosa)}%</p>
                            <p className="text-xs text-muted-foreground">taxa de glosa</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Faturado</p>
                            <p className="font-medium">{formatCurrency(item.valorTotalFaturado)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Glosado</p>
                            <p className="font-medium text-red-400">{formatCurrency(item.valorTotalGlosado)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Pago</p>
                            <p className="font-medium text-green-400">{formatCurrency(item.valorTotalPago)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Ocorrências</p>
                            <p className="font-medium">{item.totalFaturado} faturados / {item.totalGlosado} glosados</p>
                          </div>
                        </div>
                        {item.codigosGlosaFrequentes && (item.codigosGlosaFrequentes as any[]).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-2">Códigos de glosa frequentes:</p>
                            <div className="flex flex-wrap gap-2">
                              {(item.codigosGlosaFrequentes as any[]).slice(0, 5).map((cg: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs" title={cg.descricao}>
                                  {cg.codigoGlosa} ({cg.frequencia}x)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                <Pagination page={pageGlosa} totalPages={padroesGlosa.data?.totalPages || 1} setPage={setPageGlosa} />
              </>
            )}
          </TabsContent>

          {/* ========== QUANTIDADES ========== */}
          <TabsContent value="quantidade" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código ou descrição..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPageQtd(1); }} className="pl-9" />
              </div>
              <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {(setores.data as any[])?.map((s: any) => (
                    <SelectItem key={s.setor} value={s.setor}>{s.setor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => gerarQuantidade.mutate({ estabelecimentoId, convenio: selectedConvenio || undefined, setor: selectedSetor || undefined })} disabled={gerarQuantidade.isPending} className="gap-2">
                {gerarQuantidade.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar Padrões
              </Button>
            </div>

            {padroesQuantidade.isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : padroesQuantidade.data?.items?.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum padrão de quantidade encontrado. Clique em "Atualizar Padrões" para gerar.</p>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{padroesQuantidade.data?.total} padrões encontrados</p>
                <div className="space-y-2">
                  {padroesQuantidade.data?.items?.map((item: any) => (
                    <Card key={item.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{item.codigoItem}</Badge>
                              {item.tipoItem && <Badge variant="secondary" className="text-xs">{item.tipoItem}</Badge>}
                              {item.convenio && <span className="text-xs text-muted-foreground">{item.convenio}</span>}
                              {item.setor && <span className="text-xs text-muted-foreground">| {item.setor}</span>}
                            </div>
                            <p className="text-sm font-medium truncate">{item.descricaoItem || "Sem descrição"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-blue-400">{formatNumber(item.mediaQuantidade, 2)}</p>
                            <p className="text-xs text-muted-foreground">média</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Mín / Máx</p>
                            <p className="font-medium">{formatNumber(item.minQuantidade)} - {formatNumber(item.maxQuantidade)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Desvio Padrão</p>
                            <p className="font-medium">{formatNumber(item.desvioQuantidade)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Limites (2σ)</p>
                            <p className="font-medium">{formatNumber(item.limiteInferior)} - {formatNumber(item.limiteSuperior)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Ocorrências</p>
                            <p className="font-medium">{item.totalOcorrencias} ({item.totalContas} contas)</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Confiança</p>
                            {confiancaBadge(item.confianca)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
                <Pagination page={pageQtd} totalPages={padroesQuantidade.data?.totalPages || 1} setPage={setPageQtd} />
              </>
            )}
          </TabsContent>

          {/* ========== COMPOSIÇÃO ========== */}
          <TabsContent value="composicao" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por código ou descrição do procedimento..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPageComp(1); }} className="pl-9" />
              </div>
              <Button variant="outline" onClick={() => gerarComposicao.mutate({ estabelecimentoId, convenio: selectedConvenio || undefined })} disabled={gerarComposicao.isPending} className="gap-2">
                {gerarComposicao.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar Padrões
              </Button>
            </div>

            {padroesComposicao.isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : padroesComposicao.data?.items?.length === 0 ? (
              <Card className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum padrão de composição encontrado. Clique em "Atualizar Padrões" para gerar.</p>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{padroesComposicao.data?.total} padrões encontrados</p>
                <div className="space-y-2">
                  {padroesComposicao.data?.items?.map((item: any) => {
                    const isExpanded = expandedItem === item.id;
                    const itensAssoc = Array.isArray(item.itensAssociados) ? item.itensAssociados : (typeof item.itensAssociados === "string" ? JSON.parse(item.itensAssociados) : []);
                    return (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="p-4 cursor-pointer" onClick={() => setExpandedItem(isExpanded ? null : item.id)}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">{item.codigoProcedimentoPrincipal}</Badge>
                                <Badge variant={item.status === "ativo" ? "default" : "secondary"} className="text-xs">{item.status}</Badge>
                              </div>
                              <p className="text-sm font-medium truncate">{item.descricaoProcedimentoPrincipal || "Sem descrição"}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <p className="text-lg font-bold text-purple-400">{itensAssoc.length} itens</p>
                                <p className="text-xs text-muted-foreground">{item.totalOcorrencias} contas</p>
                              </div>
                              {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                            </div>
                          </div>
                          {item.valorMedioConta && (
                            <p className="text-sm text-muted-foreground mt-1">Valor médio da conta: <span className="font-medium text-green-400">{formatCurrency(item.valorMedioConta)}</span></p>
                          )}
                        </div>
                        {isExpanded && itensAssoc.length > 0 && (
                          <div className="border-t border-border px-4 pb-4 pt-3 bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground mb-3">Itens frequentemente associados:</p>
                            <div className="space-y-2">
                              {itensAssoc.map((assoc: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 text-sm">
                                  <div className="w-12 shrink-0">
                                    <Progress value={assoc.frequencia} className="h-2" />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-10 shrink-0">{assoc.frequencia}%</span>
                                  <Badge variant="outline" className="text-xs shrink-0">{assoc.codigo}</Badge>
                                  <span className="truncate flex-1">{assoc.descricao}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">Qtd: {assoc.quantidadeMedia}</span>
                                  <span className="text-xs text-green-400 shrink-0">{formatCurrency(assoc.valorMedio)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
                <Pagination page={pageComp} totalPages={padroesComposicao.data?.totalPages || 1} setPage={setPageComp} />
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
