import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Database, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface IntegracaoStatus {
  nome: string;
  status: "conectado" | "desconectado" | "sincronizando";
  ultimaSincronizacao?: string;
  proximaSincronizacao?: string;
  registros: number;
}

export default function ConfiguracoesIntegracao() {
  const [integracoes, setIntegracoes] = useState<IntegracaoStatus[]>([
    {
      nome: "WARLEINE",
      status: "conectado",
      ultimaSincronizacao: "2026-02-24 23:15",
      proximaSincronizacao: "2026-02-25 00:15",
      registros: 1250,
    },
    {
      nome: "TASY",
      status: "desconectado",
      registros: 0,
    },
    {
      nome: "OMNI",
      status: "desconectado",
      registros: 0,
    },
    {
      nome: "GESTHOR",
      status: "desconectado",
      registros: 0,
    },
  ]);

  const handleSincronizar = (nome: string) => {
    setIntegracoes(prev =>
      prev.map(int =>
        int.nome === nome
          ? { ...int, status: "sincronizando" }
          : int
      )
    );

    setTimeout(() => {
      setIntegracoes(prev =>
        prev.map(int =>
          int.nome === nome
            ? {
                ...int,
                status: "conectado",
                ultimaSincronizacao: new Date().toLocaleString("pt-BR"),
                registros: Math.floor(Math.random() * 2000),
              }
            : int
        )
      );
      toast.success(`${nome} sincronizado com sucesso!`);
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "conectado":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "desconectado":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "sincronizando":
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "conectado":
        return "Conectado";
      case "desconectado":
        return "Desconectado";
      case "sincronizando":
        return "Sincronizando...";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "conectado":
        return "bg-green-100 text-green-800";
      case "desconectado":
        return "bg-red-100 text-red-800";
      case "sincronizando":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Integração de Dados
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerencie as conexões com sistemas hospitalares
        </p>
      </div>

      <div className="grid gap-4">
        {integracoes.map((integracao) => (
          <Card key={integracao.nome}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <div>
                    <CardTitle>{integracao.nome}</CardTitle>
                    <CardDescription>
                      {integracao.registros} registros sincronizados
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(integracao.status)}
                  <Badge className={getStatusColor(integracao.status)}>
                    {getStatusLabel(integracao.status)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {integracao.ultimaSincronizacao && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">Última Sincronização</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {integracao.ultimaSincronizacao}
                    </p>
                  </div>
                  {integracao.proximaSincronizacao && (
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Próxima Sincronização</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {integracao.proximaSincronizacao}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => handleSincronizar(integracao.nome)}
                  disabled={integracao.status === "sincronizando" || integracao.status === "desconectado"}
                  variant="outline"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Sincronizar Agora
                </Button>
                <Button
                  variant="outline"
                  disabled={integracao.status === "desconectado"}
                >
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Adicionar Nova Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-800 dark:text-blue-200 mb-4">
            Para adicionar uma nova integração, entre em contato com o administrador do sistema.
          </p>
          <Button variant="outline" className="border-blue-300 dark:border-blue-700">
            Solicitar Nova Integração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
