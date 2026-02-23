import { useState } from "react";
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

interface QueryConfigFormProps {
  estabelecimentos: Array<{ id: number; nome: string }>;
  onSuccess?: () => void;
  initialData?: Partial<QueryConfig>;
}

export function QueryConfigForm({
  estabelecimentos,
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

  const testarConexao = trpc.integradorDados.testarConexaoWarleine.useMutation();
  const cadastrarQuery = trpc.integradorDados.cadastrarQueryConfig.useMutation();

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

  const handleConexaoChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      conexaoConfig: {
        ...prev.conexaoConfig,
        [field]: field === "port" ? parseInt(value) : value,
      },
    }));
  };

  const handleTestConnection = async () => {
    if (!formData.conexaoConfig) {
      setTestResult({
        sucesso: false,
        mensagem: "Configuração de conexão não preenchida",
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const resultado = await testarConexao.mutateAsync({
        host: formData.conexaoConfig.host,
        port: formData.conexaoConfig.port,
        database: formData.conexaoConfig.database,
        user: formData.conexaoConfig.user,
        password: formData.conexaoConfig.password,
        querySql: formData.querySql || "SELECT 1",
      });

      setTestResult(resultado);
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
    setErrors({});

    try {
      const validatedData = queryConfigSchema.parse(formData);

      setIsSubmitting(true);

      await cadastrarQuery.mutateAsync({
        estabelecimentoId: validatedData.estabelecimentoId,
        sistema: validatedData.sistema,
        tipoDados: validatedData.tipoDados,
        querySql: validatedData.querySql,
        descricao: validatedData.descricao,
        frequencia: validatedData.frequencia,
        conexaoConfig: validatedData.conexaoConfig,
      });

      setFormData(defaultFormData);
      setTestResult(null);
      onSuccess?.();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        (error as any).errors.forEach((err: any) => {
          const path = err.path.join(".");
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      } else {
        setErrors({
          submit: error instanceof Error ? error.message : "Erro ao salvar configuração",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Cadastro de Query para Sincronização</CardTitle>
        <CardDescription>
          Configure uma query para sincronizar dados de um sistema externo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção 1: Configuração Básica */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-sm font-semibold text-foreground">Configuração Básica</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Estabelecimento */}
              <div className="space-y-2">
                <Label htmlFor="estabelecimento">Estabelecimento *</Label>
                <Select
                  value={formData.estabelecimentoId.toString()}
                  onValueChange={(value) =>
                    handleInputChange("estabelecimentoId", parseInt(value))
                  }
                >
                  <SelectTrigger id="estabelecimento">
                    <SelectValue placeholder="Selecione um estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {estabelecimentos.map((est) => (
                      <SelectItem key={est.id} value={est.id.toString()}>
                        {est.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.estabelecimentoId && (
                  <p className="text-sm text-destructive">{errors.estabelecimentoId}</p>
                )}
              </div>

              {/* Sistema */}
              <div className="space-y-2">
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
                  <p className="text-sm text-destructive">{errors.sistema}</p>
                )}
              </div>

              {/* Tipo de Dados */}
              <div className="space-y-2">
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
                  <p className="text-sm text-destructive">{errors.tipoDados}</p>
                )}
              </div>

              {/* Frequência */}
              <div className="space-y-2">
                <Label htmlFor="frequencia">Frequência de Sincronização</Label>
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
                    <SelectItem value="tempo_real">Tempo Real</SelectItem>
                    <SelectItem value="1x_dia">1x ao Dia</SelectItem>
                    <SelectItem value="1x_semana">1x por Semana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição (Opcional)</Label>
              <Input
                id="descricao"
                placeholder="Ex: Query para sincronizar atendimentos dos últimos 30 dias"
                value={formData.descricao || ""}
                onChange={(e) => handleInputChange("descricao", e.target.value)}
              />
            </div>
          </div>

          {/* Seção 2: Configuração de Conexão */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-sm font-semibold text-foreground">Configuração de Conexão</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host *</Label>
                <Input
                  id="host"
                  type="text"
                  placeholder="hup.safatle.net.br"
                  value={formData.conexaoConfig?.host || ""}
                  onChange={(e) => handleConexaoChange("host", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">Porta *</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="55333"
                  value={formData.conexaoConfig?.port || ""}
                  onChange={(e) => handleConexaoChange("port", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="database">Banco de Dados *</Label>
                <Input
                  id="database"
                  type="text"
                  placeholder="db1"
                  value={formData.conexaoConfig?.database || ""}
                  onChange={(e) => handleConexaoChange("database", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user">Usuário *</Label>
                <Input
                  id="user"
                  type="text"
                  placeholder="TI"
                  value={formData.conexaoConfig?.user || ""}
                  onChange={(e) => handleConexaoChange("user", e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.conexaoConfig?.password || ""}
                  onChange={(e) => handleConexaoChange("password", e.target.value)}
                />
              </div>
            </div>

            {/* Botão de Teste */}
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTestingConnection || !formData.conexaoConfig?.host}
              className="w-full"
            >
              {isTestingConnection && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isTestingConnection ? "Testando Conexão..." : "Testar Conexão"}
            </Button>

            {/* Resultado do Teste */}
            {testResult && (
              <Alert variant={testResult.sucesso ? "default" : "destructive"}>
                <div className="flex items-start gap-3">
                  {testResult.sucesso ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{testResult.mensagem}</p>
                    {testResult.totalRegistros !== undefined && (
                      <p className="text-sm mt-1">
                        Registros encontrados: {testResult.totalRegistros}
                      </p>
                    )}
                  </div>
                </div>
              </Alert>
            )}
          </div>

          {/* Seção 3: Query SQL */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Query SQL</h3>

            <div className="space-y-2">
              <Label htmlFor="querySql">Query *</Label>
              <Textarea
                id="querySql"
                placeholder="SELECT * FROM atendimentos WHERE data >= CURRENT_DATE - INTERVAL '60 days'"
                value={formData.querySql}
                onChange={(e) => handleInputChange("querySql", e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              {errors.querySql && (
                <p className="text-sm text-destructive">{errors.querySql}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Dica: Use placeholders como ? para parâmetros dinâmicos
              </p>
            </div>
          </div>

          {/* Erros Gerais */}
          {errors.submit && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.submit}</AlertDescription>
            </Alert>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting || !testResult?.sucesso}
              className="flex-1"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Salvando..." : "Salvar Configuração"}
            </Button>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </div>

          {!testResult?.sucesso && (
            <p className="text-xs text-muted-foreground text-center">
              ℹ️ Teste a conexão antes de salvar a configuração
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
