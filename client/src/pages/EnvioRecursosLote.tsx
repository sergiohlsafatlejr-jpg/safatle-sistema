import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Building2, 
  Package, 
  DollarSign, 
  FileText, 
  Send, 
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Loader2
} from "lucide-react";

const formatCurrency = (value: number | string | null | undefined) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!num && num !== 0) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
};

export default function EnvioRecursosLote() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const utils = trpc.useUtils();
  
  const [convenioExpandido, setConvenioExpandido] = useState<number | null>(null);
  const [recursosSelecionados, setRecursosSelecionados] = useState<Set<number>>(new Set());
  const [dialogEnvio, setDialogEnvio] = useState(false);
  const [convenioParaEnvio, setConvenioParaEnvio] = useState<{ id: number; nome: string } | null>(null);
  const [protocoloEnvio, setProtocoloEnvio] = useState("");
  const [busca, setBusca] = useState("");

  // Buscar recursos agrupados por convênio
  const { data: recursosAgrupados, isLoading, refetch } = trpc.recursos.agrupadosPorConvenio.useQuery({
    estabelecimentoId: estabelecimentoAtual?.id,
  });

  // Buscar recursos de um convênio específico
  const { data: recursosConvenio, isLoading: loadingRecursos } = trpc.recursos.recursosDoConvenio.useQuery(
    {
      convenioId: convenioExpandido!,
      estabelecimentoId: estabelecimentoAtual?.id,
      apenasNaoEnviados: true,
    },
    { enabled: !!convenioExpandido }
  );

  // Mutation para criar lote
  const criarLoteMutation = trpc.recursos.criarLote.useMutation({
    onSuccess: (data) => {
      toast.success(`Lote ${data.numeroLote} criado com sucesso!`);
      // Agora enviar o lote
      enviarLoteMutation.mutate({
        loteId: data.loteId,
        protocoloEnvio: protocoloEnvio || undefined,
      });
    },
    onError: (error) => toast.error("Erro ao criar lote: " + error.message),
  });

  // Mutation para enviar lote
  const enviarLoteMutation = trpc.recursos.enviarLote.useMutation({
    onSuccess: () => {
      toast.success("Lote enviado com sucesso!");
      setDialogEnvio(false);
      setProtocoloEnvio("");
      setRecursosSelecionados(new Set());
      setConvenioParaEnvio(null);
      refetch();
      utils.recursos.agrupadosPorConvenio.invalidate();
    },
    onError: (error) => toast.error("Erro ao enviar lote: " + error.message),
  });

  const handleExpandirConvenio = (convenioId: number) => {
    if (convenioExpandido === convenioId) {
      setConvenioExpandido(null);
      setRecursosSelecionados(new Set());
    } else {
      setConvenioExpandido(convenioId);
      setRecursosSelecionados(new Set());
    }
  };

  const handleSelecionarRecurso = (recursoId: number, checked: boolean) => {
    const novos = new Set(recursosSelecionados);
    if (checked) {
      novos.add(recursoId);
    } else {
      novos.delete(recursoId);
    }
    setRecursosSelecionados(novos);
  };

  const handleSelecionarTodos = (recursos: any[], checked: boolean) => {
    if (checked) {
      setRecursosSelecionados(new Set(recursos.map(r => r.id)));
    } else {
      setRecursosSelecionados(new Set());
    }
  };

  const handleAbrirEnvio = (convenioId: number, convenioNome: string) => {
    if (recursosSelecionados.size === 0) {
      toast.error("Selecione pelo menos um recurso para enviar");
      return;
    }
    setConvenioParaEnvio({ id: convenioId, nome: convenioNome });
    setDialogEnvio(true);
  };

  const handleEnviarLote = () => {
    if (!convenioParaEnvio || !estabelecimentoAtual) return;

    criarLoteMutation.mutate({
      convenioId: convenioParaEnvio.id,
      estabelecimentoId: estabelecimentoAtual.id,
      recursosIds: Array.from(recursosSelecionados),
      descricao: `Lote de recursos - ${convenioParaEnvio.nome}`,
    });
  };

  const handleEnviarTodosConvenio = (convenioId: number, convenioNome: string, recursos: any[]) => {
    if (recursos.length === 0) {
      toast.error("Não há recursos para enviar");
      return;
    }
    setRecursosSelecionados(new Set(recursos.map(r => r.id)));
    setConvenioParaEnvio({ id: convenioId, nome: convenioNome });
    setDialogEnvio(true);
  };

  if (!user) return null;

  const totalRecursosPendentes = recursosAgrupados?.reduce((sum, g) => sum + g.totalRecursos, 0) || 0;
  const valorTotalPendente = recursosAgrupados?.reduce((sum, g) => sum + g.valorTotalGlosado, 0) || 0;

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Envio de Recursos em Lote</h1>
          <p className="text-muted-foreground">
            Agrupe e envie recursos de glosa por convênio de forma rápida
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convênios com Recursos</CardTitle>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recursosAgrupados?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando envio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Recursos</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecursosPendentes}</div>
            <p className="text-xs text-muted-foreground">
              Itens pendentes de envio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(valorTotalPendente)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor glosado a recursar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por convênio..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de Convênios */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos por Convênio</CardTitle>
          <CardDescription>
            Clique em um convênio para ver os recursos e selecionar itens para envio em lote
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !recursosAgrupados || recursosAgrupados.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum recurso pendente</h3>
              <p className="text-muted-foreground">
                Todos os recursos foram enviados ou não há recursos criados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recursosAgrupados
                .filter(g => !busca || g.convenioNome.toLowerCase().includes(busca.toLowerCase()))
                .map((grupo) => (
                <div key={grupo.convenioId} className="border rounded-lg overflow-hidden">
                  {/* Cabeçalho do Convênio */}
                  <div
                    className="p-4 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between"
                    onClick={() => handleExpandirConvenio(grupo.convenioId)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{grupo.convenioNome}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {grupo.totalRecursos} recursos
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {formatCurrency(grupo.valorTotalGlosado)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnviarTodosConvenio(grupo.convenioId, grupo.convenioNome, grupo.recursos);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Enviar Todos
                      </Button>
                      {convenioExpandido === grupo.convenioId ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Recursos do Convênio (Expandido) */}
                  {convenioExpandido === grupo.convenioId && (
                    <div className="p-4 border-t">
                      {loadingRecursos ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : !recursosConvenio || recursosConvenio.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Nenhum recurso encontrado
                        </div>
                      ) : (
                        <>
                          {/* Barra de ações */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={recursosSelecionados.size === recursosConvenio.length}
                                onCheckedChange={(checked) => handleSelecionarTodos(recursosConvenio, !!checked)}
                              />
                              <span className="text-sm text-muted-foreground">
                                Selecionar todos ({recursosConvenio.length})
                              </span>
                            </div>
                            {recursosSelecionados.size > 0 && (
                              <Button
                                size="sm"
                                onClick={() => handleAbrirEnvio(grupo.convenioId, grupo.convenioNome)}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                Enviar Selecionados ({recursosSelecionados.size})
                              </Button>
                            )}
                          </div>

                          {/* Tabela de Recursos */}
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12"></TableHead>
                                  <TableHead>Guia</TableHead>
                                  <TableHead>Código</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Paciente</TableHead>
                                  <TableHead className="text-right">Vl. Glosado</TableHead>
                                  <TableHead>Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {recursosConvenio.map((recurso) => (
                                  <TableRow key={recurso.id}>
                                    <TableCell>
                                      <Checkbox
                                        checked={recursosSelecionados.has(recurso.id)}
                                        onCheckedChange={(checked) => handleSelecionarRecurso(recurso.id, !!checked)}
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium">{recurso.guiaNumero || "-"}</TableCell>
                                    <TableCell>{recurso.codigoProcedimento || "-"}</TableCell>
                                    <TableCell className="max-w-[200px] truncate">
                                      {recurso.descricaoProcedimento || "-"}
                                    </TableCell>
                                    <TableCell>{recurso.pacienteNome || "-"}</TableCell>
                                    <TableCell className="text-right text-red-600 font-medium">
                                      {formatCurrency(recurso.valorGlosado)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                        {recurso.status === "rascunho" ? "Rascunho" : "Pendente"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Envio */}
      <Dialog open={dialogEnvio} onOpenChange={setDialogEnvio}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Recursos em Lote</DialogTitle>
            <DialogDescription>
              Você está prestes a criar um lote e enviar {recursosSelecionados.size} recursos para {convenioParaEnvio?.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Convênio:</span>
                <span className="font-medium">{convenioParaEnvio?.nome}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Recursos selecionados:</span>
                <span className="font-medium">{recursosSelecionados.size}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor total:</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(
                    recursosConvenio
                      ?.filter(r => recursosSelecionados.has(r.id))
                      .reduce((sum, r) => sum + parseFloat(r.valorGlosado || "0"), 0) || 0
                  )}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Protocolo de Envio (opcional)</label>
              <Input
                placeholder="Ex: 2024-001234"
                value={protocoloEnvio}
                onChange={(e) => setProtocoloEnvio(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Informe o protocolo se já tiver enviado ao convênio
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogEnvio(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEnviarLote}
              disabled={criarLoteMutation.isPending || enviarLoteMutation.isPending}
            >
              {(criarLoteMutation.isPending || enviarLoteMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando lote...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Criar Lote e Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  );
}
