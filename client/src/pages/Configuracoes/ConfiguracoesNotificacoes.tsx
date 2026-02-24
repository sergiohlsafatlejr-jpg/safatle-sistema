import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Mail, AlertCircle, Save } from "lucide-react";

export default function ConfiguracoesNotificacoes() {
  const [notificacoes, setNotificacoes] = useState({
    sincronizacao: true,
    erros: true,
    alertas: true,
    relatorios: false,
    email: true,
    push: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (key: keyof typeof notificacoes) => {
    setNotificacoes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Configurações de notificações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Notificações
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Configure os alertas e canais de notificação
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Tipos de Notificações
          </CardTitle>
          <CardDescription>
            Escolha quais eventos deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium text-slate-900 dark:text-white">
                  Sincronização de Dados
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Receba alertas quando sincronizações forem concluídas
                </p>
              </div>
              <Switch
                checked={notificacoes.sincronizacao}
                onCheckedChange={() => handleToggle("sincronizacao")}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium text-slate-900 dark:text-white">
                  Erros do Sistema
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Receba alertas sobre erros críticos
                </p>
              </div>
              <Switch
                checked={notificacoes.erros}
                onCheckedChange={() => handleToggle("erros")}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium text-slate-900 dark:text-white">
                  Alertas de Atendimentos
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Receba alertas sobre atendimentos parados
                </p>
              </div>
              <Switch
                checked={notificacoes.alertas}
                onCheckedChange={() => handleToggle("alertas")}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="font-medium text-slate-900 dark:text-white">
                  Relatórios Disponíveis
                </Label>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Receba notificações quando relatórios forem gerados
                </p>
              </div>
              <Switch
                checked={notificacoes.relatorios}
                onCheckedChange={() => handleToggle("relatorios")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>
            Escolha como deseja receber as notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-medium text-slate-900 dark:text-white">
                Email
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Receba notificações por email
              </p>
            </div>
            <Switch
              checked={notificacoes.email}
              onCheckedChange={() => handleToggle("email")}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="font-medium text-slate-900 dark:text-white">
                Notificações Push
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Receba notificações no navegador
              </p>
            </div>
            <Switch
              checked={notificacoes.push}
              onCheckedChange={() => handleToggle("push")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Importante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-800 dark:text-amber-200">
            As notificações críticas (erros do sistema) serão enviadas independentemente das configurações acima.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
