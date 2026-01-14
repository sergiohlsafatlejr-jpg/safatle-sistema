import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Upload as UploadIcon, FileText, CheckCircle2, AlertCircle, Plus, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Upload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoArquivo, setTipoArquivo] = useState<"xml" | "excel" | "pdf">("xml");
  const [direcao, setDirecao] = useState<"enviado" | "retornado">("enviado");
  const [convenioId, setConvenioId] = useState<string>("");
  const [dataReferencia, setDataReferencia] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [novoConvenioNome, setNovoConvenioNome] = useState("");
  const [novoConvenioCodigo, setNovoConvenioCodigo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: convenios, refetch: refetchConvenios } = trpc.convenios.list.useQuery({ ativo: "sim" });
  const uploadMutation = trpc.arquivos.upload.useMutation();
  const criarConvenioMutation = trpc.convenios.create.useMutation();
  const utils = trpc.useUtils();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Auto-detect file type
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xml") {
        setTipoArquivo("xml");
      } else if (ext === "xlsx" || ext === "xls") {
        setTipoArquivo("excel");
      } else if (ext === "pdf") {
        setTipoArquivo("pdf");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !convenioId) {
      toast.error("Por favor, selecione um arquivo e um convênio");
      return;
    }

    setIsUploading(true);

    try {
      // Convert file to base64
      const buffer = await selectedFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      await uploadMutation.mutateAsync({
        nome: selectedFile.name,
        tipoArquivo,
        direcao,
        convenioId: parseInt(convenioId),
        conteudo: base64,
        dataReferencia: dataReferencia || undefined,
      });

      toast.success("Arquivo enviado com sucesso!");
      
      // Reset form
      setSelectedFile(null);
      setDataReferencia("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Invalidate queries
      utils.arquivos.list.invalidate();
      utils.arquivos.stats.invalidate();
      utils.dashboard.resumo.invalidate();
      utils.dashboard.ultimosArquivos.invalidate();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCriarConvenio = async () => {
    if (!novoConvenioNome.trim()) {
      toast.error("Por favor, informe o nome do convênio");
      return;
    }

    try {
      const result = await criarConvenioMutation.mutateAsync({
        nome: novoConvenioNome,
        codigo: novoConvenioCodigo || undefined,
      });

      toast.success("Convênio criado com sucesso!");
      setConvenioId(result.id.toString());
      setNovoConvenioNome("");
      setNovoConvenioCodigo("");
      setDialogOpen(false);
      refetchConvenios();
    } catch (error) {
      toast.error("Erro ao criar convênio");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Upload de Arquivos</h1>
          <p className="text-slate-500">
            Envie arquivos XML, Excel ou PDF para processamento
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Form */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Enviar Arquivo</CardTitle>
              <CardDescription>
                Selecione o arquivo e preencha as informações necessárias
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                  selectedFile 
                    ? "border-green-300 bg-green-50" 
                    : "border-slate-200 hover:border-primary hover:bg-slate-50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,.xlsx,.xls,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-12 w-12 text-green-500" />
                    <div>
                      <p className="font-medium text-slate-900">{selectedFile.name}</p>
                      <p className="text-sm text-slate-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <UploadIcon className="h-12 w-12 text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-900">Clique para selecionar</p>
                      <p className="text-sm text-slate-500">ou arraste o arquivo aqui</p>
                    </div>
                    <p className="text-xs text-slate-400">XML, Excel (.xlsx) ou PDF</p>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="tipoArquivo">Tipo de Arquivo</Label>
                  <Select value={tipoArquivo} onValueChange={(v) => setTipoArquivo(v as typeof tipoArquivo)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direcao">Direção</Label>
                  <Select value={direcao} onValueChange={(v) => setDirecao(v as typeof direcao)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enviado">Enviado ao Convênio</SelectItem>
                      <SelectItem value="retornado">Retornado do Convênio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="convenio">Convênio</Label>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Novo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Convênio</DialogTitle>
                        <DialogDescription>
                          Adicione um novo convênio ao sistema
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="nomeConvenio">Nome do Convênio</Label>
                          <Input
                            id="nomeConvenio"
                            value={novoConvenioNome}
                            onChange={(e) => setNovoConvenioNome(e.target.value)}
                            placeholder="Ex: Unimed, Bradesco Saúde..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="codigoConvenio">Código (opcional)</Label>
                          <Input
                            id="codigoConvenio"
                            value={novoConvenioCodigo}
                            onChange={(e) => setNovoConvenioCodigo(e.target.value)}
                            placeholder="Ex: 001, UNI..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleCriarConvenio} disabled={criarConvenioMutation.isPending}>
                          {criarConvenioMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Criar Convênio
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Select value={convenioId} onValueChange={setConvenioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    {convenios?.map((conv) => (
                      <SelectItem key={conv.id} value={conv.id.toString()}>
                        {conv.nome} {conv.codigo ? `(${conv.codigo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataReferencia">Data de Referência (opcional)</Label>
                <Input
                  id="dataReferencia"
                  type="date"
                  value={dataReferencia}
                  onChange={(e) => setDataReferencia(e.target.value)}
                />
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleUpload}
                disabled={!selectedFile || !convenioId || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Enviar Arquivo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <div className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Instruções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-blue-600">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Selecione o arquivo</p>
                    <p className="text-sm text-slate-500">
                      Formatos aceitos: XML (TISS), Excel (.xlsx) e PDF
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-blue-600">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Informe a direção</p>
                    <p className="text-sm text-slate-500">
                      Indique se o arquivo foi enviado ou retornado do convênio
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-blue-600">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Selecione o convênio</p>
                    <p className="text-sm text-slate-500">
                      Escolha o convênio relacionado ao arquivo
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Processamento automático</p>
                    <p className="text-sm text-slate-500">
                      O sistema extrairá automaticamente os procedimentos do arquivo
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-900">Dica</p>
                    <p className="text-sm text-amber-700">
                      Para melhor extração de dados, utilize arquivos XML no formato TISS 
                      ou planilhas Excel com colunas padronizadas (código, descrição, quantidade, valor).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
