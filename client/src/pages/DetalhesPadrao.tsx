import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ChevronLeft, Loader2, Package, Eye, Edit3,
  ThumbsUp, ThumbsDown, AlertTriangle, Info, XCircle, BookOpen,
  CheckCircle2, Clock, Hash, DollarSign, BarChart3, FileText
} from "lucide-react";

export default function DetalhesPadrao() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/detalhes-padrao/:id");
  const padraoId = params?.id ? Number(params.id) : null;

  // Buscar detalhes do padrão
  const padraoDetalhes = trpc.padroesCobranca.getPadraoDetalhes.useQuery(
    { id: padraoId! },
    { enabled: !!padraoId }
  );

  // Mutation para validar
  const validarPadrao = trpc.padroesCobranca.validarPadrao.useMutation({
    onSuccess: () => {
      toast.success("Ação realizada com sucesso!");
      padraoDetalhes.refetch();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handleVoltar = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/padroes-cobranca");
    }
  };

  const formatCurrency = (val: string | number | null) => {
    const num = parseFloat(String(val || "0"));
    return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const padrao = padraoDetalhes.data?.padrao;
  const feedbacks = padraoDetalhes.data?.feedbacks || [];

  const statusBadge = (status: string, isGabarito?: number) => {
    if (isGabarito === 1) return <Badge className="bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-500/30 gap-1"><BookOpen className="h-3 w-3" />Gabarito</Badge>;
    const config: Record<string, { label: string; className: string; icon: any }> = {
      ativo: { label: "Aprovado", className: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30", icon: CheckCircle2 },
      aprendendo: { label: "Aprendendo", className: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30", icon: Clock },
      revisao: { label: "Em Revisão", className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", icon: Eye },
      inativo: { label: "Rejeitado", className: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30", icon: XCircle },
    };
    const c = config[status] || config.aprendendo;
    const Icon = c.icon;
    return <Badge variant="outline" className={`${c.className} gap-1`}><Icon className="h-3 w-3" />{c.label}</Badge>;
  };

  const confiancaBadge = (valor: number) => {
    if (valor >= 85) return <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 gap-1"><BarChart3 className="h-3 w-3" />{valor}%</Badge>;
    if (valor >= 55) return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 gap-1"><BarChart3 className="h-3 w-3" />{valor}%</Badge>;
    return <Badge variant="outline" className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30 gap-1"><BarChart3 className="h-3 w-3" />{valor}%</Badge>;
  };

  const tipoLabel = (tipo: string) => {
    const map: Record<string, { label: string; className: string }> = {
      MAT_MED: { label: "Mat/Med", className: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30" },
      PROCEDIMENTO: { label: "Procedimento", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" },
      TAXA: { label: "Taxa", className: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30" },
      DIARIA: { label: "Diária", className: "bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30" },
    };
    const m = map[tipo] || map.MAT_MED;
    return <Badge variant="outline" className={m.className}>{m.label}</Badge>;
  };

  if (padraoDetalhes.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!padrao) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <p className="text-lg">Padrão não encontrado</p>
          <Button variant="outline" onClick={handleVoltar}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Parse itens
  const itens = Array.isArray(padrao.itensAssociados)
    ? padrao.itensAssociados
    : (typeof padrao.itensAssociados === "string" ? JSON.parse(padrao.itensAssociados as string) : []);

  const observacoes = (padrao as any).observacoes || padrao.observacoesValidacao || "";

  // Calcular totais
  const totalValor = itens.reduce((sum: number, i: any) => sum + (parseFloat(i.valorMedio) || 0), 0);
  const totalItens = itens.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleVoltar}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Eye className="h-6 w-6 text-primary" />
              Detalhes do Padrão
            </h1>
            <p className="text-muted-foreground">Visualização completa do padrão de cobrança e seus itens associados.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1" onClick={() => setLocation(`/editar-padrao/${padraoId}`)}>
              <Edit3 className="h-4 w-4" /> Editar
            </Button>
            <Button variant="outline" className="gap-1 text-green-600 dark:text-green-400" onClick={() => validarPadrao.mutate({ id: padraoId!, acao: "aprovar" })} disabled={validarPadrao.isPending}>
              <ThumbsUp className="h-4 w-4" /> Aprovar
            </Button>
            <Button variant="outline" className="gap-1 text-yellow-600 dark:text-yellow-400" onClick={() => validarPadrao.mutate({ id: padraoId!, acao: "revisao" })} disabled={validarPadrao.isPending}>
              <Eye className="h-4 w-4" /> Revisão
            </Button>
            <Button variant="outline" className="gap-1 text-red-600 dark:text-red-400" onClick={() => validarPadrao.mutate({ id: padraoId!, acao: "rejeitar" })} disabled={validarPadrao.isPending}>
              <ThumbsDown className="h-4 w-4" /> Rejeitar
            </Button>
          </div>
        </div>

        {/* Informações do Padrão */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card principal */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações do Procedimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-xs text-muted-foreground">Código do Procedimento</Label>
                  <p className="font-mono font-bold text-lg mt-1">{padrao.codigoProcedimentoPrincipal}</p>
                  {padrao.codigoProcedimentoPrincipal.includes("+") && (
                    <Badge variant="outline" className="mt-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30">
                      Padrão Combinado ({padrao.codigoProcedimentoPrincipal.split("+").length} procedimentos)
                    </Badge>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Descrição</Label>
                  <p className="font-medium text-base mt-1">{padrao.descricaoProcedimentoPrincipal || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="mt-1">{padrao.tipoProcedimentoPrincipal || "-"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Convênio</Label>
                  <p className="mt-1">{(padrao as any).convenioNome || "Todos"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de métricas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Métricas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {statusBadge(padrao.status, padrao.isGabarito)}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Confiança</span>
                {confiancaBadge(padrao.confianca || 0)}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ocorrências</span>
                <span className="font-semibold">{padrao.totalOcorrencias || 0}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor Médio da Conta</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(padrao.valorMedioConta)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Itens</span>
                <span className="font-semibold">{totalItens}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor Total dos Itens</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(totalValor)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Itens */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens do Padrão ({totalItens})
                </CardTitle>
                <CardDescription>Lista completa dos itens associados a este padrão de cobrança.</CardDescription>
              </div>
              <Button variant="outline" className="gap-1" onClick={() => setLocation(`/editar-padrao/${padraoId}`)}>
                <Edit3 className="h-4 w-4" /> Editar Itens
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              {/* Header da tabela */}
              <div className="grid grid-cols-[minmax(140px,1.5fr)_minmax(250px,4fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(100px,1.5fr)] gap-3 p-3 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                <div>Código</div>
                <div>Descrição</div>
                <div>Tipo</div>
                <div className="text-center">Freq %</div>
                <div className="text-center">Qtd Mín</div>
                <div className="text-center">Qtd Máx</div>
                <div className="text-right">Valor Médio</div>
              </div>
              {/* Linhas dos itens */}
              <div className="divide-y divide-border">
                {itens.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum item associado a este padrão.</p>
                  </div>
                ) : (
                  itens.map((item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-[minmax(140px,1.5fr)_minmax(250px,4fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(100px,1.5fr)] gap-3 items-center p-3 hover:bg-muted/20 transition-colors">
                      <div>
                        <Badge variant="outline" className="font-mono text-xs">{item.codigo}</Badge>
                      </div>
                      <div className="text-sm">{item.descricao || "-"}</div>
                      <div>{tipoLabel(item.tipo || "MAT_MED")}</div>
                      <div className="text-center">
                        <span className="text-sm font-medium">{item.frequencia != null ? `${item.frequencia}%` : "-"}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium">{item.quantidadeMin ?? item.quantidadeMedia ?? "-"}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium">{item.quantidadeMax ?? item.quantidadeMedia ?? "-"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {item.valorMedio ? formatCurrency(item.valorMedio) : "-"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Footer com totais */}
              {itens.length > 0 && (
                <div className="grid grid-cols-[minmax(140px,1.5fr)_minmax(250px,4fr)_minmax(100px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(80px,1fr)_minmax(100px,1.5fr)] gap-3 p-3 bg-muted/30 border-t font-semibold text-sm">
                  <div></div>
                  <div className="text-muted-foreground">Total ({totalItens} itens)</div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div className="text-right text-green-600 dark:text-green-400">{formatCurrency(totalValor)}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feedbacks Anteriores */}
        {feedbacks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Feedbacks Anteriores ({feedbacks.length})
              </CardTitle>
              <CardDescription>Histórico de decisões e justificativas sobre este padrão.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {feedbacks.map((fb: any) => (
                  <div key={fb.id} className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={
                        fb.decisao === "aceitar" ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" :
                        fb.decisao === "rejeitar" ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30" :
                        "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30"
                      }>
                        {fb.decisao}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{fb.tipoDivergencia}</span>
                      <span className="text-sm text-muted-foreground ml-auto">{fb.usuarioNome}</span>
                    </div>
                    {fb.justificativa && <p className="text-sm italic text-muted-foreground mt-1">{fb.justificativa}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        {observacoes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{observacoes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pb-8">
          <Button variant="outline" onClick={handleVoltar}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-1" onClick={() => setLocation(`/editar-padrao/${padraoId}`)}>
              <Edit3 className="h-4 w-4" /> Editar Padrão
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
