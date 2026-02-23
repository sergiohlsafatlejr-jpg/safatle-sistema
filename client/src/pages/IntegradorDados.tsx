import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Play, RefreshCw, Plus, AlertCircle } from "lucide-react";
import { QueryConfigForm } from "@/components/QueryConfigForm";
import { trpc } from "@/lib/trpc";

// Mock de estabelecimentos - substituir por dados reais
const MOCK_ESTABELECIMENTOS = [
  { id: 1, nome: "Pronto Socorro Infantil" },
  { id: 2, nome: "Maternidade Ela" },
  { id: 3, nome: "Hospital Central" },
];

const SISTEMA_LABELS: Record<string, string> = {
  warleine: "WARLEINE",
  tasy: "TASY",
  omni: "OMNI",
  gesthor: "GESTHOR",
};

const TIPO_DADOS_LABELS: Record<string, string> = {
  atendimentos: "Atendimentos",
  faturamento: "Faturamento",
  procedimentos: "Procedimentos",
  pacientes: "Pacientes",
};

const FREQUENCIA_LABELS: Record<string, string> = {
  tempo_real: "Tempo Real",
  "1x_dia": "1x ao Dia",
  "1x_semana": "1x por Semana",
};

const SISTEMA_FREQUENCIA: Record<string, string> = {
  warleine: "tempo_real",
  tasy: "tempo_real",
  omni: "tempo_real",
  gesthor: "1x_dia",
};

export function IntegradorDados() {
  const [showForm, setShowForm] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);
  const [syncingConfig, setSyncingConfig] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);

  const listarConfiguracoes = trpc.integradorDados.listarConfiguracoes.useQuery({
    estabelecimentoId: 1, // TODO: Obter do contexto do usuário
  });

  const obterStatus = trpc.integradorDados.obterStatus.useQuery();
  const obterLogs = trpc.integradorDados.obterLogs.useQuery({
    estabelecimentoId: 1,
    limite: 50,
  });

  const sincronizar = trpc.integradorDados.sincronizar.useMutation({
    onSuccess: () => {
      setSyncingConfig(null);
      // Recarregar status e logs
      obterStatus.refetch();
      obterLogs.refetch();
    },
  });

  const deletarConfiguracao = trpc.integradorDados.deletarConfiguracao.useMutation({
    onSuccess: () => {
      setDeleteConfirmation(null);
      listarConfiguracoes.refetch();
    },
  });

  const handleSync = async (configId: string) => {
    setSyncingConfig(configId);
    // TODO: Implementar sincronização
  };

  const handleDelete = async (configId: string) => {
    await deletarConfiguracao.mutateAsync({ configId: parseInt(configId) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrador de Dados</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as integrações de dados de múltiplos sistemas
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Configuração
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="configuracoes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuracoes">Configurações</TabsTrigger>
          <TabsTrigger value="monitoramento">Monitoramento</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Tab 1: Configurações */}
        <TabsContent value="configuracoes" className="space-y-4">
          {showForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Nova Configuração de Query</CardTitle>
              </CardHeader>
              <CardContent>
                <QueryConfigForm
                  estabelecimentos={MOCK_ESTABELECIMENTOS}
                  onSuccess={() => {
                    setShowForm(false);
                    listarConfiguracoes.refetch();
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {listarConfiguracoes.isLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : listarConfiguracoes.data?.configuracoes.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Nenhuma configuração cadastrada</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Clique em "Nova Configuração" para começar
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Configurações de Query</CardTitle>
                    <CardDescription>
                      Total: {listarConfiguracoes.data?.total} configuração(ões)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sistema</TableHead>
                            <TableHead>Tipo de Dados</TableHead>
                            <TableHead>Frequência</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Última Sincronização</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listarConfiguracoes.data?.configuracoes.map((config) => (
                            <TableRow key={config.chave}>
                              <TableCell className="font-medium">
                                {SISTEMA_LABELS[config.sistema]}
                              </TableCell>
                              <TableCell>
                                {TIPO_DADOS_LABELS[config.tipoDados]}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {FREQUENCIA_LABELS[config.sistema]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">Ativo</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                -
                              </TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSync(config.chave)}
                                  disabled={syncingConfig === config.chave}
                                >
                                  {syncingConfig === config.chave ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteConfirmation(config.chave)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 2: Monitoramento */}
        <TabsContent value="monitoramento" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status de Sincronização</CardTitle>
              <CardDescription>
                Acompanhe o status das sincronizações em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              {obterStatus.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-muted">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Total de Configurações</p>
                          <p className="text-3xl font-bold">
                            {obterStatus.data?.totalConfigs || 0}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Sincronização em Andamento</p>
                          <p className="text-3xl font-bold">
                            {obterStatus.data?.isRunning ? "Sim" : "Não"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Próxima Sincronização</p>
                          <p className="text-lg font-bold">-</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {obterStatus.data?.isRunning && (
                    <Alert>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <AlertDescription>
                        Uma sincronização está em andamento. Aguarde a conclusão.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Sincronizações</CardTitle>
              <CardDescription>
                Últimas 50 sincronizações realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {obterLogs.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : obterLogs.data?.logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum log disponível</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Sistema</TableHead>
                        <TableHead>Tipo de Dados</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Duração</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* TODO: Implementar renderização de logs */}
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhum log disponível
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteConfirmation} onOpenChange={() => setDeleteConfirmation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Configuração</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta configuração? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmation && handleDelete(deleteConfirmation)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
