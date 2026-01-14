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
  ArrowRight
} from "lucide-react";
import { useState } from "react";
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

export default function Comparacoes() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [arquivoEnviadoId, setArquivoEnviadoId] = useState<string>("");
  const [arquivoRetornadoId, setArquivoRetornadoId] = useState<string>("");
  const [filtroConvenio, setFiltroConvenio] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

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

  const formatCurrency = (value: string | null) => {
    if (!value) return "R$ 0,00";
    return `R$ ${parseFloat(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Comparações</h1>
          <p className="text-slate-500">
            Compare arquivos enviados e retornados para identificar divergências
          </p>
        </div>

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
