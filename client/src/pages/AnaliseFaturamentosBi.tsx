import React, { useState } from "react";
import { trpc } from "../utils/trpc";
import { formatCurrency } from "../utils/formatters";
import { useEstabelecimento } from "../contexts/EstabelecimentoContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ScrollArea } from "../components/ui/scroll-area";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { DollarSign, AlertCircle, TrendingDown, Clock, Search, ChevronRight, Wand2 } from "lucide-react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

export default function AnaliseFaturamentosBi() {
  const { estabelecimentoId } = useEstabelecimento();
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string>("todas");
  const [convenioSelecionado, setConvenioSelecionado] = useState<string>("todos");
  const [buscaItem, setBuscaItem] = useState("");

  const { data, isLoading } = trpc.tasy.getFaturamentoItensBi.useQuery({
    estabelecimentoId: estabelecimentoId || 0,
  }, {
    enabled: !!estabelecimentoId && estabelecimentoId > 0,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Extraindo e processando dados a nível de item no TASY...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.resumo || {
    totalProduzido: 0,
    totalRecebido: 0,
    totalGlosado: 0,
    totalAReceber: 0,
    qtdTotalItens: 0
  };

  const pctRecebido = kpis.totalProduzido > 0 ? (kpis.totalRecebido / kpis.totalProduzido) * 100 : 0;
  const pctGlosado = kpis.totalProduzido > 0 ? (kpis.totalGlosado / kpis.totalProduzido) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Faturamento Geral (Por Item)</h1>
        <p className="text-muted-foreground">Análise detalhada de faturamento, recebimentos e glosas nível item.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-2">
        {/* Futuros filtros */}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Faturado (Produzido)</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalProduzido)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.qtdTotalItens} itens processados
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Recebido</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(kpis.totalRecebido)}</div>
            <div className="mt-2 flex items-center text-xs text-muted-foreground">
              <Progress value={pctRecebido} className="h-1.5 flex-1 mr-2 bg-emerald-100 [&>div]:bg-emerald-500" />
              <span>{pctRecebido.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Glosado (Perdas)</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(kpis.totalGlosado)}</div>
             <div className="mt-2 flex items-center text-xs text-muted-foreground">
              <Progress value={pctGlosado} className="h-1.5 flex-1 mr-2 bg-rose-100 [&>div]:bg-rose-500" />
              <span>{pctGlosado.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salto A Receber (Pendente)</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(kpis.totalAReceber)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Diferença aguardando liquidação
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-7">
        {/* Motivos de Glosa Ranking */}
        <Card className="md:col-span-3 shadow-md border-0">
          <CardHeader className="bg-slate-50/80 border-b">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              <CardTitle>Top Motivos de Glosa</CardTitle>
            </div>
            <CardDescription>Hierarquia financeira das perdas no período</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo Retornado</TableHead>
                    <TableHead className="text-right">Valor Glosado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topMotivos?.map((m: any, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium">
                         <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-slate-500">{m.qtd_glosada}x</Badge>
                          <span className="truncate max-w-[200px]" title={m.motivo}>{m.motivo}</span>
                         </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600">
                        {formatCurrency(m.vl_glosa)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.topMotivos || data.topMotivos.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                        Nenhum motivo de glosa registrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Itens Glosados detalhados (Alimentador da IA) */}
        <Card className="md:col-span-4 shadow-md border-0">
          <CardHeader className="bg-slate-50/80 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Análise de Itens Glosados</CardTitle>
                <CardDescription>Reconhecimento de padrões nível item/procedimento</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar procedimento..." 
                  className="pl-8 bg-white"
                  value={buscaItem}
                  onChange={(e) => setBuscaItem(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item / Serviço</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead className="text-right">Glosa(R$)</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topGlosas?.filter((t: any) => t.descricao.toLowerCase().includes(buscaItem.toLowerCase())).map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-medium truncate max-w-[200px]" title={item.descricao}>{item.descricao}</div>
                        <div className="text-xs text-muted-foreground flex gap-2">
                          <span>{item.codigo}</span>
                          <span className="text-slate-400">•</span>
                          <span className="truncate max-w-[100px]">{item.setor}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-100">{item.convenio}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-600">
                        {formatCurrency(item.vl_glosa)}
                        <div className="text-xs font-normal text-muted-foreground">({item.qtd_glosada}x)</div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                          title="Criar Padrão de IA Inteligente para evitar esta glosa"
                          onClick={() => window.location.href = '#/sistema/motor/regras'}
                        >
                          <Wand2 className="h-4 w-4 mr-1" />
                          Padrão
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!data?.topGlosas || data.topGlosas.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        Nenhum item com glosa.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
