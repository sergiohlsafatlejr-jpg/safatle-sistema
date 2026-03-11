import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Loader2, ChevronDown, ChevronUp, Database, ArrowUpDown,
} from "lucide-react";

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CustosPorConvenioProps {
  estabelecimentoId: number;
}

export default function CustosPorConvenio({ estabelecimentoId }: CustosPorConvenioProps) {
  const [convenio, setConvenio] = useState<string>("");
  const [tipoItem, setTipoItem] = useState<string>("");
  const [competencia, setCompetencia] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"itens" | "resumo" | "prejuizo" | "lucro">("resumo");

  const queryInput = useMemo(() => ({
    estabelecimentoId,
    convenio: convenio && convenio !== "todos" ? convenio : undefined,
    tipoItem: tipoItem && tipoItem !== "todos" ? tipoItem : undefined,
    competencia: competencia && competencia !== "todos" ? competencia : undefined,
    busca: busca || undefined,
  }), [estabelecimentoId, convenio, tipoItem, competencia, busca]);

  const { data, isLoading, error } = trpc.relatorioCustos.custosPorConvenio.useQuery(queryInput, {
    staleTime: 5 * 60 * 1000,
  });

  const handleBusca = () => {
    setBusca(buscaInput);
  };

  const limparFiltros = () => {
    setConvenio("");
    setTipoItem("");
    setCompetencia("");
    setBusca("");
    setBuscaInput("");
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>Erro ao carregar dados: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho explicativo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Custos por Convênio</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Dados diretos do sistema Warleine (PostgreSQL). Cruza a tabela de <strong>lançamentos</strong> (itens cobrados)
            com o <strong>cadastro de produtos</strong> (custo de estoque) e o <strong>cadastro de convênios</strong>,
            mostrando se cada item dá <span className="text-green-600 font-medium">lucro</span> ou{" "}
            <span className="text-red-600 font-medium">prejuízo</span> em cada convênio.
          </p>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[180px]">
              <label className="text-xs text-muted-foreground mb-1 block">Convênio</label>
              <Select value={convenio} onValueChange={setConvenio}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {data?.conveniosDisponiveis.map((c) => (
                    <SelectItem key={c.codplaco} value={c.codplaco}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
              <Select value={tipoItem} onValueChange={setTipoItem}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="P">Produto (Mat/Med)</SelectItem>
                  <SelectItem value="S">Serviço/Procedimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[140px]">
              <label className="text-xs text-muted-foreground mb-1 block">Competência</label>
              <Select value={competencia} onValueChange={setCompetencia}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Últimos 12 meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Últimos 12 meses</SelectItem>
                  {data?.competenciasDisponiveis.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Buscar item</label>
              <div className="flex gap-2">
                <Input
                  className="h-9"
                  placeholder="Nome ou código do produto..."
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBusca()}
                />
                <Button size="sm" className="h-9" onClick={handleBusca}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button variant="outline" size="sm" className="h-9" onClick={limparFiltros}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Faturado</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(data.kpis.valorFaturadoTotal)}</p>
                <p className="text-xs text-muted-foreground">{data.kpis.totalConvenios} convênios</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(data.kpis.custoTotal)}</p>
                <p className="text-xs text-muted-foreground">{data.kpis.totalItensAnalisados} itens</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Margem Total</p>
                <p className={`text-xl font-bold ${data.kpis.margemTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.kpis.margemTotal)}
                </p>
                <p className="text-xs text-muted-foreground">{data.kpis.margemMediaPercent.toFixed(1)}% média</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Itens sem Custo</p>
                <p className="text-xl font-bold text-yellow-600">{data.kpis.totalItensSemCusto}</p>
                <p className="text-xs text-muted-foreground">sem custo cadastrado</p>
              </CardContent>
            </Card>
          </div>

          {/* Abas */}
          <div className="flex gap-1 border-b">
            {[
              { key: "resumo" as const, label: "Resumo por Convênio" },
              { key: "itens" as const, label: "Itens Detalhados" },
              { key: "prejuizo" as const, label: "Top Prejuízo" },
              { key: "lucro" as const, label: "Top Lucro" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Conteúdo das abas */}
          {activeTab === "resumo" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumo por Convênio</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Quanto o hospital faturou e quanto custou para cada convênio. Margem positiva = lucro, negativa = prejuízo.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Convênio</TableHead>
                        <TableHead className="text-right">Lançamentos</TableHead>
                        <TableHead className="text-right">Total Faturado</TableHead>
                        <TableHead className="text-right">Total Custo</TableHead>
                        <TableHead className="text-right">Margem (R$)</TableHead>
                        <TableHead className="text-right">Margem (%)</TableHead>
                        <TableHead className="text-center">Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.resumoPorConvenio.map((conv) => (
                        <TableRow key={conv.codplaco}>
                          <TableCell className="font-medium">
                            <div>
                              <span>{conv.convenio}</span>
                              <span className="text-xs text-muted-foreground ml-2">({conv.codplaco})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{conv.totalLancamentos.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(conv.totalFaturado)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(conv.totalCusto)}</TableCell>
                          <TableCell className={`text-right font-bold ${conv.margem >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(conv.margem)}
                          </TableCell>
                          <TableCell className={`text-right ${conv.margemPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {conv.margemPercent.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={conv.resultado === "lucro" ? "default" : conv.resultado === "prejuizo" ? "destructive" : "secondary"}>
                              {conv.resultado === "lucro" ? (
                                <><TrendingUp className="h-3 w-3 mr-1" />Lucro</>
                              ) : conv.resultado === "prejuizo" ? (
                                <><TrendingDown className="h-3 w-3 mr-1" />Prejuízo</>
                              ) : "Empate"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {data.resumoPorConvenio.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum dado encontrado para os filtros selecionados
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "itens" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Itens Detalhados por Convênio</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Cada produto/material com seu custo de estoque e o valor cobrado em cada convênio.
                  Clique em um item para expandir e ver os valores por convênio.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-right">Custo Estoque (un.)</TableHead>
                        <TableHead className="text-right">Convênios</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.itens.map((item) => (
                        <>
                          <TableRow
                            key={item.codprod}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedItem(expandedItem === item.codprod ? null : item.codprod)}
                          >
                            <TableCell>
                              {expandedItem === item.codprod ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.codprod}</TableCell>
                            <TableCell className="font-medium max-w-[300px] truncate">{item.descricao}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {item.tipoItem === "P" ? "Produto" : "Serviço"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(item.custoEstoque)}</TableCell>
                            <TableCell className="text-right">{item.convenios.length}</TableCell>
                          </TableRow>
                          {expandedItem === item.codprod && (
                            <TableRow key={`${item.codprod}-detail`}>
                              <TableCell colSpan={6} className="bg-muted/30 p-0">
                                <div className="p-3">
                                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                                    Valores por convênio para: {item.descricao}
                                  </p>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Convênio</TableHead>
                                        <TableHead className="text-right">Qtd</TableHead>
                                        <TableHead className="text-right">Valor Cobrado</TableHead>
                                        <TableHead className="text-right">Custo Total</TableHead>
                                        <TableHead className="text-right">Margem</TableHead>
                                        <TableHead className="text-center">Resultado</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {item.convenios.map((conv, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="font-medium">{conv.convenio}</TableCell>
                                          <TableCell className="text-right">{formatNumber(conv.quantidade)}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(conv.valorCobrado)}</TableCell>
                                          <TableCell className="text-right">{formatCurrency(conv.custoTotal)}</TableCell>
                                          <TableCell className={`text-right font-bold ${conv.margem >= 0 ? "text-green-600" : "text-red-600"}`}>
                                            {formatCurrency(conv.margem)}
                                          </TableCell>
                                          <TableCell className="text-center">
                                            {conv.resultado === "lucro" ? (
                                              <Badge variant="default" className="text-xs"><TrendingUp className="h-3 w-3 mr-1" />Lucro</Badge>
                                            ) : conv.resultado === "prejuizo" ? (
                                              <Badge variant="destructive" className="text-xs"><TrendingDown className="h-3 w-3 mr-1" />Prejuízo</Badge>
                                            ) : (
                                              <Badge variant="secondary" className="text-xs">Empate</Badge>
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
                        </>
                      ))}
                      {data.itens.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum item encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {data.totalItens > data.itens.length && (
                  <p className="text-xs text-muted-foreground p-3 text-center">
                    Exibindo {data.itens.length} de {data.totalItens} itens. Use os filtros para refinar a busca.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "prejuizo" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Top 20 Itens com Maior Prejuízo
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Itens onde o hospital gasta mais do que recebe do convênio. Margem negativa = o convênio paga menos que o custo.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor Cobrado</TableHead>
                        <TableHead className="text-right">Custo Total</TableHead>
                        <TableHead className="text-right">Prejuízo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topItensPrejuizo.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.descricao}</span>
                              <span className="text-xs text-muted-foreground ml-2">({item.codprod})</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.convenio}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.quantidade)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorCobrado)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.custoTotal)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">{formatCurrency(item.margem)}</TableCell>
                        </TableRow>
                      ))}
                      {data.topItensPrejuizo.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-green-600 py-8">
                            Nenhum item com prejuízo encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "lucro" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top 20 Itens com Maior Lucro
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Itens onde o hospital recebe mais do que gasta. Margem positiva = o convênio paga mais que o custo.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Convênio</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor Cobrado</TableHead>
                        <TableHead className="text-right">Custo Total</TableHead>
                        <TableHead className="text-right">Lucro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topItensLucro.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{item.descricao}</span>
                              <span className="text-xs text-muted-foreground ml-2">({item.codprod})</span>
                            </div>
                          </TableCell>
                          <TableCell>{item.convenio}</TableCell>
                          <TableCell className="text-right">{formatNumber(item.quantidade)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.valorCobrado)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.custoTotal)}</TableCell>
                          <TableCell className="text-right font-bold text-green-600">{formatCurrency(item.margem)}</TableCell>
                        </TableRow>
                      ))}
                      {data.topItensLucro.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum item com lucro encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fonte dos dados */}
          <p className="text-xs text-muted-foreground text-center">
            Fonte: PostgreSQL Warleine (tabelas lancamen + contas + cadplaco + tabprod) | {data.fonte}
          </p>
        </>
      ) : null}
    </div>
  );
}
