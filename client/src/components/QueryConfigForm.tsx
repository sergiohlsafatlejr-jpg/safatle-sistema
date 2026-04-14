import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const connectionSchema = z.object({
  sistema: z.enum(["warleine", "tasy", "omni", "gesthor"]),
  host: z.string().min(1, "Host é obrigatório"),
  port: z.coerce.number().min(1, "Port deve ser um número válido"),
  database: z.string().min(1, "Database é obrigatório"),
  user: z.string().min(1, "Usuário é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const querySchema = z.object({
  querySql: z.string().min(10, "Query deve ter pelo menos 10 caracteres"),
});

const configSchema = z.object({
  estabelecimentoId: z.number().min(1, "Estabelecimento é obrigatório"),
  tipoDados: z.enum(["atendimentos", "faturamento", "procedimentos", "pacientes", "busca_conta", "bi_relatorio", "prontuario_prescricoes", "prontuario_evolucoes"]),
  frequencia: z.enum(["tempo_real", "1x_dia", "1x_semana"]),
  descricao: z.string().optional(),
  tabelaDestinoBi: z.string().optional(),
});

type ConnectionFormData = z.infer<typeof connectionSchema>;
type QueryFormData = z.infer<typeof querySchema>;
type ConfigFormData = z.infer<typeof configSchema>;

interface QueryConfigFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QueryConfigForm({ onSuccess, onCancel }: QueryConfigFormProps) {
  const [step, setStep] = useState<"connection" | "query" | "config">("connection");
  const [connectionData, setConnectionData] = useState<ConnectionFormData | null>(null);
  const [queryData, setQueryData] = useState<QueryFormData | null>(null);
  const [connectionTested, setConnectionTested] = useState(false);
  const [queryTested, setQueryTested] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingQuery, setTestingQuery] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const connectionForm = useForm<ConnectionFormData>({
    resolver: zodResolver(connectionSchema),
    defaultValues: {
      sistema: "tasy",
      host: "hup.safatle.net.br",
      port: 1521,
      database: "db1",
      user: "TI",
      password: "",
    },
  });

  // Carregar última conexão do LocalStorage
  useEffect(() => {
    const cached = localStorage.getItem("@safatle_last_connection");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        connectionForm.reset(parsed);
      } catch (e) { }
    }
  }, []);

  const queryForm = useForm<QueryFormData>({
    resolver: zodResolver(querySchema),
  });

  const configForm = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
  });

  const testarConexaoMutation = trpc.integradorDados.testarConexao.useMutation();
  const salvarConfigMutation = trpc.integradorDados.salvarConfiguracao.useMutation();
  const { data: estabelecimentos } = trpc.integradorDados.listarEstabelecimentos.useQuery();

  const handleTestConnection = async (data: ConnectionFormData) => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      const querySql = data.sistema === "tasy" ? "SELECT 1 FROM DUAL" : "SELECT 1";
      const result = await testarConexaoMutation.mutateAsync({
        ...data,
        querySql,
      });

      if (result.sucesso) {
        setConnectionTested(true);
        setConnectionData(data);
        setTestResult({
          success: true,
          message: "Conexão testada com sucesso!",
        });
        toast.success("Conexão validada!");
        setStep("query");
      } else {
        setTestResult({
          success: false,
          message: result.mensagem || "Erro ao conectar",
        });
        toast.error("Erro na conexão: " + result.mensagem);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      setTestResult({
        success: false,
        message: errorMessage,
      });
      toast.error("Erro: " + errorMessage);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestQuery = async (data: QueryFormData) => {
    if (!connectionData) {
      toast.error("Teste a conexão primeiro!");
      return;
    }

    setTestingQuery(true);
    setTestResult(null);

    try {
      const result = await testarConexaoMutation.mutateAsync({
        ...connectionData,
        querySql: data.querySql,
      });

      if (result.sucesso) {
        setQueryTested(true);
        setQueryData(data);
        setTestResult({
          success: true,
          message: `Query testada com sucesso! ${result.totalRegistros || 0} registros encontrados.`,
        });
        toast.success("Query validada!");
        setStep("config");
      } else {
        setTestResult({
          success: false,
          message: result.mensagem || "Erro ao executar query",
        });
        toast.error("Erro na query: " + result.mensagem);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      setTestResult({
        success: false,
        message: errorMessage,
      });
      toast.error("Erro: " + errorMessage);
    } finally {
      setTestingQuery(false);
    }
  };

  const handleSaveConfig = async (data: ConfigFormData) => {
    if (!connectionData || !queryData) {
      toast.error("Complete os testes de conexão e query primeiro!");
      return;
    }

    setSavingConfig(true);

    try {
      const result = await salvarConfigMutation.mutateAsync({
        ...data,
        sistema: connectionData.sistema,
        querySql: queryData.querySql,
        conexaoConfig: {
          host: connectionData.host,
          port: connectionData.port,
          database: connectionData.database,
          user: connectionData.user,
          password: connectionData.password,
          tabelaDestinoBi: data.tabelaDestinoBi,
        },
      });

      if (result.sucesso) {
        // Salva a ultima conexao com sucesso no cache (secreta apenas localmente)
        localStorage.setItem("@safatle_last_connection", JSON.stringify({
          sistema: connectionData.sistema,
          host: connectionData.host,
          port: connectionData.port,
          database: connectionData.database,
          user: connectionData.user,
          password: connectionData.password
        }));

        toast.success("Configuração salva com sucesso!");
        onSuccess?.();
      } else {
        toast.error("Erro ao salvar: " + result.mensagem);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro: " + errorMessage);
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Tabs value={step} onValueChange={(v) => setStep(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connection" disabled={!connectionTested && step !== "connection"}>
            1. Conexão
          </TabsTrigger>
          <TabsTrigger value="query" disabled={!queryTested && step !== "query"}>
            2. Query
          </TabsTrigger>
          <TabsTrigger value="config" disabled={!queryTested && step !== "config"}>
            3. Configuração
          </TabsTrigger>
        </TabsList>

        {/* STEP 1: CONNECTION */}
        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Conexão</CardTitle>
              <CardDescription>Configure os dados de conexão com o banco de dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Sistema / Banco de Dados</label>
                <Select
                  value={connectionForm.watch("sistema") || ""}
                  onValueChange={(v) => connectionForm.setValue("sistema", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warleine">WARLEINE (PostgreSQL)</SelectItem>
                    <SelectItem value="tasy">TASY (Oracle)</SelectItem>
                    <SelectItem value="omni">OMNI (Firebird)</SelectItem>
                    <SelectItem value="gesthor">GESTHOR (Firebird)</SelectItem>
                  </SelectContent>
                </Select>
                {connectionForm.formState.errors.sistema && (
                  <p className="text-xs text-red-500 mt-1">{connectionForm.formState.errors.sistema.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Host</label>
                  <Input {...connectionForm.register("host")} placeholder="localhost" />
                  {connectionForm.formState.errors.host && (
                    <p className="text-xs text-red-500 mt-1">{connectionForm.formState.errors.host.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Port</label>
                  <Input {...connectionForm.register("port")} type="number" placeholder="5432" />
                  {connectionForm.formState.errors.port && (
                    <p className="text-xs text-red-500 mt-1">{connectionForm.formState.errors.port.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Database</label>
                <Input {...connectionForm.register("database")} placeholder="db1" />
                {connectionForm.formState.errors.database && (
                  <p className="text-xs text-red-500 mt-1">{connectionForm.formState.errors.database.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Usuário</label>
                  <Input {...connectionForm.register("user")} placeholder="TI" />
                  {connectionForm.formState.errors.user && (
                    <p className="text-xs text-red-500 mt-1">{connectionForm.formState.errors.user.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Senha</label>
                  <Input {...connectionForm.register("password")} type="password" placeholder="••••••••" />
                  {connectionForm.formState.errors.password && (
                    <p className="text-xs text-red-500 mt-1">{connectionForm.formState.errors.password.message}</p>
                  )}
                </div>
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}

              {connectionTested && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Conexão validada com sucesso!</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-end">
                {onCancel && <Button variant="outline" onClick={onCancel}>Cancelar</Button>}
                <Button
                  onClick={connectionForm.handleSubmit(handleTestConnection as any)}
                  disabled={testingConnection || connectionTested}
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : connectionTested ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Testado
                    </>
                  ) : (
                    "Testar Conexão"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 2: QUERY */}
        <TabsContent value="query" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Query</CardTitle>
              <CardDescription>Defina a query SQL para extrair dados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Query SQL</label>
                <Textarea
                  {...queryForm.register("querySql")}
                  placeholder="SELECT * FROM atendimentos WHERE data >= NOW() - INTERVAL '60 days'"
                  className="font-mono text-xs"
                  rows={10}
                />
                {queryForm.formState.errors.querySql && (
                  <p className="text-xs text-red-500 mt-1">{queryForm.formState.errors.querySql.message}</p>
                )}
              </div>

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{testResult.message}</AlertDescription>
                </Alert>
              )}

              {queryTested && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">Query validada com sucesso!</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStep("connection")}>
                  Voltar
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setQueryData({ querySql: queryForm.getValues("querySql") });
                    setQueryTested(true);
                    setStep("config");
                    toast.info("Teste pulado. Verifique se a sintaxe da query está correta!");
                  }}
                  title="Pule o teste se a query for muito demorada e você tiver certeza que está correta"
                >
                  Pular Teste
                </Button>
                <Button
                  onClick={queryForm.handleSubmit(handleTestQuery as any)}
                  disabled={testingQuery || queryTested}
                >
                  {testingQuery ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : queryTested ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Testada
                    </>
                  ) : (
                    "Testar Query"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STEP 3: CONFIG */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Salvar Configuração</CardTitle>
              <CardDescription>Configure os detalhes da sincronização</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Estabelecimento</label>
                <Select
                  value={configForm.watch("estabelecimentoId")?.toString() || ""}
                  onValueChange={(v) => configForm.setValue("estabelecimentoId", parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {(estabelecimentos as any[])?.map((e: any) => (
                      <SelectItem key={e.id} value={e.id.toString()}>
                        {e.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Dados</label>
                <Select
                  value={configForm.watch("tipoDados") || ""}
                  onValueChange={(v) => configForm.setValue("tipoDados", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atendimentos">Atendimentos</SelectItem>
                    <SelectItem value="faturamento">Faturamento</SelectItem>
                    <SelectItem value="procedimentos">Procedimentos</SelectItem>
                    <SelectItem value="pacientes">Pacientes</SelectItem>
                    <SelectItem value="busca_conta">Busca Conta (por nº conta)</SelectItem>
                    <SelectItem value="prontuario_prescricoes">Prescrições (por atendimento)</SelectItem>
                    <SelectItem value="prontuario_evolucoes">Evoluções (por atendimento)</SelectItem>
                    <SelectItem value="bi_relatorio">Relatório Customizado (BI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {configForm.watch("tipoDados") === "bi_relatorio" && (
                <div>
                  <label className="text-sm font-medium">Nome da Tabela de Destino</label>
                  <p className="text-xs text-muted-foreground mb-2">A tabela será criada automaticamente no MySQL.</p>
                  <Input 
                    {...configForm.register("tabelaDestinoBi")} 
                    placeholder="Ex: bi_relatorio_tasy_financeiro" 
                    onChange={(e) => {
                      // Remove special chars and spaces, keeping only snake_case alphanumeric
                      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      e.target.value = val;
                      configForm.setValue("tabelaDestinoBi", val);
                    }}
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Frequência de Sincronização</label>
                <Select
                  value={configForm.watch("frequencia") || ""}
                  onValueChange={(v) => configForm.setValue("frequencia", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tempo_real">Tempo Real (a cada 5 minutos)</SelectItem>
                    <SelectItem value="1x_dia">1x ao Dia (02:00 AM)</SelectItem>
                    <SelectItem value="1x_semana">1x por Semana (Segunda 02:00 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição (Opcional)</label>
                <Input {...configForm.register("descricao")} placeholder="Ex: Query para sincronizar atendimentos dos últimos 60 dias" />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setStep("query")}>
                  Voltar
                </Button>
                <Button
                  onClick={configForm.handleSubmit(handleSaveConfig as any)}
                  disabled={savingConfig}
                >
                  {savingConfig ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Configuração"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
