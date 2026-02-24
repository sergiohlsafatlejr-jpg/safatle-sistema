import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { Cog, Save } from "lucide-react";

export default function ConfiguracoesGeral() {
  const [appName, setAppName] = useState("Safatle");
  const [appDescription, setAppDescription] = useState("Sistema de Gerenciamento Hospitalar");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Aqui você faria a chamada para salvar as configurações
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Configurações salvas com sucesso!");
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
          Configurações Gerais
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Personalize as configurações básicas do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            Informações da Aplicação
          </CardTitle>
          <CardDescription>
            Configure o nome e descrição da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="appName">Nome da Aplicação</Label>
            <Input
              id="appName"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Ex: Safatle"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appDescription">Descrição</Label>
            <Input
              id="appDescription"
              value={appDescription}
              onChange={(e) => setAppDescription(e.target.value)}
              placeholder="Ex: Sistema de Gerenciamento Hospitalar"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Logo da Aplicação</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <img 
                  src="/safatle-logo.png" 
                  alt="Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
              <Button variant="outline">
                Alterar Logo
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="favicon">Favicon</Label>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <img 
                  src="/safatle-logo.png" 
                  alt="Favicon" 
                  className="w-8 h-8 object-contain"
                />
              </div>
              <Button variant="outline">
                Alterar Favicon
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>
            Configure o tema visual da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 bg-white border-2 border-slate-300 rounded-lg"></div>
              <span>Tema Claro</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <div className="w-12 h-12 bg-slate-900 border-2 border-slate-700 rounded-lg"></div>
              <span>Tema Escuro</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
