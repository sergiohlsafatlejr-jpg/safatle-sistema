import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const queryConfigSchema = z.object({
  estabelecimentoId: z.number().min(1, "Estabelecimento é obrigatório"),
  sistema: z.enum(["warleine", "tasy", "omni", "gesthor"]),
  tipoDados: z.enum(["atendimentos", "faturamento", "procedimentos", "pacientes"]),
  querySql: z.string().min(10, "Query deve ter pelo menos 10 caracteres"),
  descricao: z.string().optional(),
  frequencia: z.enum(["tempo_real", "1x_dia", "1x_semana"]).default("tempo_real"),
  conexaoConfig: z
    .object({
      host: z.string().min(1, "Host é obrigatório"),
      port: z.number().min(1, "Porta é obrigatória"),
      database: z.string().min(1, "Banco de dados é obrigatório"),
      user: z.string().min(1, "Usuário é obrigatório"),
      password: z.string().min(1, "Senha é obrigatória"),
    })
    .optional(),
});

type QueryConfig = z.infer<typeof queryConfigSchema>;

interface Estabelecimento {
  id: number;
  nome: string;
  cnpj?: string;
  endereco?: string;
  ativo?: string;
}

interface QueryConfigFormProps {
  onSuccess?: () => void;
  initialData?: Partial<QueryConfig>;
}

export function QueryConfigForm({
  onSuccess,
  initialData,
}: QueryConfigFormProps) {
  const defaultFormData: QueryConfig = {
    estabelecimentoId: 0,
    sistema: "warleine",
    tipoDados: "atendimentos",
    querySql: "",
    descricao: "",
    frequencia: "tempo_real",
    conexaoConfig: {
      host: "hup.safatle.net.br",
      port: 55333,
      database: "db1",
      user: "TI",
      password: "",
    },
  };

  const [formData, setFormData] = useState<QueryConfig>({
    ...defaultFormData,
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    sucesso: boolean;
    mensagem: string;
    totalRegistros?: number;
  } | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar estabelecimentos
  const { data: estabelecimentosData, isLoading: isLoadingEstabelecimentos } =
    trpc.integradorDados.listarEstabelecimentos.useQuery();

  const estabelecimentos: Estabelecimento[] = estabelecimentosData?.estabelecimentos || [];

  const testarConexao = trpc.integradorDados.testarConexaoWarleine.useMutation();
  const salvarConfiguracao = trpc.integradorDados.salvarConfiguracao.useMutation();

  const handleInputChange = (
    field: keyof QueryConfig,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleConnectionConfigChange = (
    field: keyof NonNullable<QueryConfig["conexaoConfig"]>,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      conexaoConfig: {
        ...prev.conexaoConfig,
        [field]: value,
      },
    }));
  };

  const handleTestConnection = async () => {
    if (!formData.conexaoConfig) {
      setTestResult({
        sucesso: false,
        mensagem: "Configure a conexão antes de testar",
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testarConexao.mutateAsync({
        ...formData.conexaoConfig,
        querySql: formData.querySql,
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        sucesso: false,
        mensagem: error instanceof Error ? error.message : "Erro ao testar conexão",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar formulário
    try {
      queryConfigSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join(".");
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await salvarConfiguracao.mutateAsync(formData);
      if (result.sucesso) {
        setFormData(defaultFormData);
        setErrors({});
        onSuccess?.();
      }
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Erro ao salvar",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração Básica</CardTitle>
          <CardDescription>
            Configure o estabelecimento e tipo de dados para sincronizar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estabelecimento">Estabelecimento *</Label>
              <Select
                value={String(formData.estabelecimentoId)}
                onValueChange={(value) =>
                  handleInputChange("estabelecimentoId", parseInt(value))
                }
              >
                <SelectTrigger id="estabelecimento">
                  <SelectValue placeholder="Selecione um estabelecimento" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingEstabelecimentos ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Carregando estabelecimentos...
                    </div>
                  ) : estabelecimentos.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhum estabelecimento encontrado
                    </div>
                  ) : (
                    estabelecimentos.map((est) => (
                      <SelectItem key={est.id} value={String(est.id)}>
                        {est.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.estabelecimentoId && (
                <p className="text-sm text-red-500 mt-1">{errors.estabelecimentoId}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sistema">Sistema *</Label>
              <Select
                value={formData.sistema}
                onValueChange={(value) =>
                  handleInputChange("sistema", value as QueryConfig["sistema"])
                }
              >
                <SelectTrigger id="sistema">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warleine">WARLEINE (PostgreSQL)</SelectItem>
                  <SelectItem value="tasy">TASY (Oracle)</SelectItem>
                  <SelectItem value="omni">OMNI (Firebird)</SelectItem>
                  <SelectItem value="gesthor">GESTHOR (Firebird)</SelectItem>
                </SelectContent>
              </Select>
              {errors.sistema && (
                <p className="text-sm text-red-500 mt-1">{errors.sistema}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipoDados">Tipo de Dados *</Label>
              <Select
                value={formData.tipoDados}
                onValueChange={(value) =>
                  handleInputChange("tipoDados", value as QueryConfig["tipoDados"])
                }
              >
                <SelectTrigger id="tipoDados">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="atendimentos">Atendimentos</SelectItem>
                  <SelectItem value="faturamento">Faturamento</SelectItem>
                  <SelectItem value="procedimentos">Procedimentos</SelectItem>
                  <SelectItem value="pacientes">Pacientes</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoDados && (
                <p className="text-sm text-red-500 mt-1">{errors.tipoDados}</p>
              )}
            </div>

            <div>
              <Label htmlFor="frequencia">Frequência de Sincronização *</Label>
              <Select
                value={formData.frequencia}
                onValueChange={(value) =>
                  handleInputChange("frequencia", value as QueryConfig["frequencia"])
                }
              >
                <SelectTrigger id="frequencia">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tempo_real">Tempo Real (5 min)</SelectItem>
                  <SelectItem value="1x_dia">Uma vez ao dia (02:00 AM)</SelectItem>
                  <SelectItem value="1x_semana">Uma vez por semana (seg 02:00 AM)</SelectItem>
                </SelectContent>
              </Select>
              {errors.frequencia && (
                <p className="text-sm text-red-500 mt-1">{errors.frequencia}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="descricao">Descrição (Opcional)</Label>
            <Textarea
              id="descricao"
              placeholder="Ex: Query para sincronizar atendimentos dos últimos 30 dias"
              value={formData.descricao || ""}
              onChange={(e) => handleInputChange("descricao", e.target.value)}
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuração de Conexão</CardTitle>
          <CardDescription>
            Configure os dados de conexão com o banco de dados externo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="host">Host *</Label>
              <Input
                id="host"
                value={formData.conexaoConfig?.host || ""}
                onChange={(e) => handleConnectionConfigChange("host", e.target.value)}
                placeholder="hup.safatle.net.br"
              />
              {errors["conexaoConfig.host"] && (
                <p className="text-sm text-red-500 mt-1">{errors["conexaoConfig.host"]}</p>
              )}
            </div>

            <div>
              <Label htmlFor="port">Porta *</Label>
              <Input
                id="port"
                type="number"
                value={formData.conexaoConfig?.port || ""}
                onChange={(e) =>
                  handleConnectionConfigChange("port", parseInt(e.target.value))
                }
                placeholder="55333"
              />
              {errors["conexaoConfig.port"] && (
                <p className="text-sm text-red-500 mt-1">{errors["conexaoConfig.port"]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="database">Banco de Dados *</Label>
              <Input
                id="database"
                value={formData.conexaoConfig?.database || ""}
                onChange={(e) =>
                  handleConnectionConfigChange("database", e.target.value)
                }
                placeholder="db1"
              />
              {errors["conexaoConfig.database"] && (
                <p className="text-sm text-red-500 mt-1">
                  {errors["conexaoConfig.database"]}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="user">Usuário *</Label>
              <Input
                id="user"
                value={formData.conexaoConfig?.user || ""}
                onChange={(e) => handleConnectionConfigChange("user", e.target.value)}
                placeholder="TI"
              />
              {errors["conexaoConfig.user"] && (
                <p className="text-sm text-red-500 mt-1">{errors["conexaoConfig.user"]}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={formData.conexaoConfig?.password || ""}
              onChange={(e) =>
                handleConnectionConfigChange("password", e.target.value)
              }
              placeholder="••••••••"
            />
            {errors["conexaoConfig.password"] && (
              <p className="text-sm text-red-500 mt-1">
                {errors["conexaoConfig.password"]}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="w-full"
          >
            {isTestingConnection && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Testar Conexão
          </Button>

          {testResult && (
            <Alert className={testResult.sucesso ? "bg-green-50" : "bg-red-50"}>
              <div className="flex items-start gap-3">
                {testResult.sucesso ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">
                    {testResult.sucesso ? "Conexão bem-sucedida!" : "Erro na conexão"}
                  </p>
                  <AlertDescription>{testResult.mensagem}</AlertDescription>
                  {testResult.totalRegistros !== undefined && (
                    <AlertDescription className="mt-2">
                      Total de registros: {testResult.totalRegistros}
                    </AlertDescription>
                  )}
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Query SQL</CardTitle>
          <CardDescription>
            Cole a query SQL que será executada para extrair os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.querySql}
            onChange={(e) => handleInputChange("querySql", e.target.value)}
            placeholder="SELECT * FROM atendimentos WHERE data >= ?"
            className="font-mono text-sm min-h-32"
          />
          {errors.querySql && (
            <p className="text-sm text-red-500 mt-2">{errors.querySql}</p>
          )}
        </CardContent>
      </Card>

      {errors.submit && (
        <Alert className="bg-red-50">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <AlertDescription>{errors.submit}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Salvar Configuração
      </Button>
    </div>
  );
}
