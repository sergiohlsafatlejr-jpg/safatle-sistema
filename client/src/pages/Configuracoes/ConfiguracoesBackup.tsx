import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Download, Upload, Trash2, Clock, AlertCircle, CheckCircle2 } from "lucide-react";

interface Backup {
  id: number;
  data: string;
  tamanho: string;
  status: "completo" | "incompleto";
}

export default function ConfiguracoesBackup() {
  const [backups, setBackups] = useState<Backup[]>([
    {
      id: 1,
      data: "2026-02-24 23:00",
      tamanho: "2.5 GB",
      status: "completo",
    },
    {
      id: 2,
      data: "2026-02-23 23:00",
      tamanho: "2.4 GB",
      status: "completo",
    },
    {
      id: 3,
      data: "2026-02-22 23:00",
      tamanho: "2.3 GB",
      status: "completo",
    },
  ]);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExportarDados = async () => {
    setIsExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Dados exportados com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportarDados = async () => {
    setIsImporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success("Dados importados com sucesso!");
    } catch (error) {
      toast.error("Erro ao importar dados");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteBackup = (id: number) => {
    setBackups(backups.filter(b => b.id !== id));
    toast.success("Backup removido!");
  };

  const handleDownloadBackup = (id: number) => {
    toast.success("Download iniciado!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Backup e Dados
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Gerencie backups, importe e exporte dados do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Exporte ou importe dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleExportarDados}
              disabled={isExporting}
              className="gap-2 h-20 flex flex-col"
            >
              <Download className="w-5 h-5" />
              {isExporting ? "Exportando..." : "Exportar Dados"}
            </Button>
            <Button
              onClick={handleImportarDados}
              disabled={isImporting}
              variant="outline"
              className="gap-2 h-20 flex flex-col"
            >
              <Upload className="w-5 h-5" />
              {isImporting ? "Importando..." : "Importar Dados"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Backups Automáticos
          </CardTitle>
          <CardDescription>
            Backups realizados automaticamente todos os dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    {backup.status === "completo" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {backup.data}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {backup.tamanho}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      backup.status === "completo"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {backup.status === "completo" ? "Completo" : "Incompleto"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadBackup(backup.id)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBackup(backup.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-800 dark:text-red-200">
            Estas ações são irreversíveis. Use com cuidado!
          </p>
          <Button
            variant="destructive"
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Dados de Atendimentos
          </Button>
          <p className="text-xs text-red-700 dark:text-red-300">
            Esta ação removerá todos os dados de atendimentos do sistema. Certifique-se de ter um backup antes de prosseguir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
