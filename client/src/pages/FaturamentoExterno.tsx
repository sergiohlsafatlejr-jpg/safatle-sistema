import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, Trash2, Loader2, CheckCircle2,
  AlertCircle, DollarSign, Calendar, ArrowUpRight,
  BarChart3, FileText, RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

function formatCurrency(value: number | null | undefined): string {
  if (value == null || value === 0) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MESES_NOMES: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro",
};

interface DadoPreview {
  convenio: string;
  mesAno: string;
  valorFaturado: number;
  valorRecebido: number;
}

export default function FaturamentoExterno() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 0;
  const anoCorrente = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState(anoCorrente);

  // Upload state
  const [dadosPreview, setDadosPreview] = useState<DadoPreview[]>([]);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const utils = trpc.useUtils();
  const { data: dadosImportados, isLoading } = trpc.faturamentoExterno.listar.useQuery(
    { estabelecimentoId, ano: anoSelecionado },
    { enabled: estabelecimentoId > 0 }
  );

  const importarMutation = trpc.faturamentoExterno.importar.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Importação concluída: ${result.inseridos} inseridos, ${result.atualizados} atualizados`,
        { duration: 5000 }
      );
      if (result.erros.length > 0) {
        toast.warning(`${result.erros.length} erro(s) durante importação`, { duration: 5000 });
      }
      setDadosPreview([]);
      setNomeArquivo("");
      utils.faturamentoExterno.listar.invalidate();
    },
    onError: (err) => {
      toast.error(`Erro na importação: ${err.message}`);
    },
  });

  const excluirMutation = trpc.faturamentoExterno.excluir.useMutation({
    onSuccess: () => {
      toast.success("Registro excluído com sucesso");
      utils.faturamentoExterno.listar.invalidate();
      setDeleteId(null);
    },
    onError: (err) => {
      toast.error(`Erro ao excluir: ${err.message}`);
    },
  });

  // Parse Excel file
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const parsed: DadoPreview[] = [];
        for (const row of jsonData as any[]) {
          // Find columns by common names
          const convenioKey = Object.keys(row).find(k =>
            k.toLowerCase().includes("convenio") || k.toLowerCase().includes("convênio")
          );
          const mesAnoKey = Object.keys(row).find(k =>
            k.toLowerCase().includes("mês") || k.toLowerCase().includes("mes") || k.toLowerCase().includes("ano")
          );
          const faturadoKey = Object.keys(row).find(k =>
            k.toLowerCase().includes("faturado") || k.toLowerCase().includes("faturamento")
          );
          const recebidoKey = Object.keys(row).find(k =>
            k.toLowerCase().includes("recebido") || k.toLowerCase().includes("recebimento")
          );

          if (!convenioKey || !mesAnoKey) continue;

          const convenio = String(row[convenioKey] || "").trim();
          if (!convenio) continue;

          // Parse date - handle Date objects and strings
          let mesAno = "";
          const rawDate = row[mesAnoKey];
          if (rawDate instanceof Date) {
            const year = rawDate.getFullYear();
            const month = String(rawDate.getMonth() + 1).padStart(2, "0");
            mesAno = `${year}/${month}`;
          } else {
            const dateStr = String(rawDate || "").trim();
            // Try YYYY-MM-DD, YYYY/MM, MM/YYYY formats
            const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
            const slashMatch = dateStr.match(/^(\d{4})\/(\d{2})/);
            const brMatch = dateStr.match(/^(\d{2})\/(\d{4})/);
            if (isoMatch) {
              mesAno = `${isoMatch[1]}/${isoMatch[2]}`;
            } else if (slashMatch) {
              mesAno = `${slashMatch[1]}/${slashMatch[2]}`;
            } else if (brMatch) {
              mesAno = `${brMatch[2]}/${brMatch[1]}`;
            }
          }

          if (!mesAno) continue;

          const valorFaturado = parseFloat(String(faturadoKey ? row[faturadoKey] : 0).replace(",", ".")) || 0;
          const valorRecebido = parseFloat(String(recebidoKey ? row[recebidoKey] : 0).replace(",", ".")) || 0;

          parsed.push({ convenio, mesAno, valorFaturado, valorRecebido });
        }

        if (parsed.length === 0) {
          toast.error("Nenhum dado válido encontrado na planilha. Verifique se as colunas estão corretas (CONVENIO, MÊS ANO, VALOR FATURADO, VALOR RECEBIDO).");
          return;
        }

        setDadosPreview(parsed);
        toast.success(`${parsed.length} registros encontrados na planilha`);
      } catch (err: any) {
        toast.error(`Erro ao ler planilha: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    e.target.value = "";
  }, []);

  const handleConfirmImport = () => {
    if (estabelecimentoId <= 0) {
      toast.error("Selecione um estabelecimento primeiro");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleImportar = () => {
    setShowConfirmDialog(false);
    setImportando(true);
    importarMutation.mutate(
      {
        estabelecimentoId,
        dados: dadosPreview,
        arquivoOrigem: nomeArquivo,
      },
      { onSettled: () => setImportando(false) }
    );
  };

  // Totals
  const totais = useMemo(() => {
    if (!dadosImportados?.length) return { faturado: 0, recebido: 0, registros: 0 };
    return {
      faturado: dadosImportados.reduce((acc, d) => acc + d.valorFaturado, 0),
      recebido: dadosImportados.reduce((acc, d) => acc + d.valorRecebido, 0),
      registros: dadosImportados.length,
    };
  }, [dadosImportados]);

  const previewTotais = useMemo(() => {
    if (!dadosPreview.length) return { faturado: 0, recebido: 0 };
    return {
      faturado: dadosPreview.reduce((acc, d) => acc + d.valorFaturado, 0),
      recebido: dadosPreview.reduce((acc, d) => acc + d.valorRecebido, 0),
    };
  }, [dadosPreview]);

  const anosDisponiveis = useMemo(() => {
    const anos = [];
    for (let a = anoCorrente; a >= anoCorrente - 5; a--) anos.push(a);
    return anos;
  }, [anoCorrente]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-card-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Faturamento Externo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Importação de dados de faturamento e recebimento via planilha Excel
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map(a => (<SelectItem key={a} value={String(a)}>{a}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Faturado</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totais.faturado)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Recebido</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totais.recebido)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registros</p>
                  <p className="text-2xl font-bold mt-1">{totais.registros}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="importar" className="space-y-6">
          <TabsList>
            <TabsTrigger value="importar" className="gap-2">
              <Upload className="h-4 w-4" /> Importar Excel
            </TabsTrigger>
            <TabsTrigger value="dados" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Dados Importados
              {totais.registros > 0 && (
                <Badge variant="secondary" className="ml-1">{totais.registros}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ========== ABA IMPORTAR ========== */}
          <TabsContent value="importar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload de Planilha
                </CardTitle>
                <CardDescription>
                  Selecione um arquivo Excel (.xlsx) com as colunas: CONVENIO, MÊS ANO, VALOR FATURADO, VALOR RECEBIDO.
                  Os dados existentes para o mesmo convênio/mês serão atualizados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Drop zone */}
                  <label
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">
                      Clique ou arraste um arquivo Excel aqui
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls</p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>

                  {nomeArquivo && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-muted-foreground">Arquivo:</span>
                      <span className="font-medium">{nomeArquivo}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preview dos dados */}
            {dadosPreview.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Preview dos Dados ({dadosPreview.length} registros)
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Total Faturado: {formatCurrency(previewTotais.faturado)} | Total Recebido: {formatCurrency(previewTotais.recebido)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setDadosPreview([]); setNomeArquivo(""); }}>
                        Cancelar
                      </Button>
                      <Button onClick={handleConfirmImport} disabled={importando || estabelecimentoId <= 0}>
                        {importando ? (
                          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importando...</>
                        ) : (
                          <><Upload className="h-4 w-4 mr-2" /> Importar {dadosPreview.length} registros</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Convênio</TableHead>
                          <TableHead>Mês/Ano</TableHead>
                          <TableHead className="text-right">Valor Faturado</TableHead>
                          <TableHead className="text-right">Valor Recebido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dadosPreview.map((d, i) => {
                          const mesNum = d.mesAno.split("/")[1] || "";
                          const mesNome = MESES_NOMES[mesNum] || mesNum;
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{d.convenio}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{mesNome}/{d.mesAno.split("/")[0]}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(d.valorFaturado)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.valorRecebido)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== ABA DADOS IMPORTADOS ========== */}
          <TabsContent value="dados" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Dados Importados - {anoSelecionado}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => utils.faturamentoExterno.listar.invalidate()}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : !dadosImportados?.length ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-lg font-medium">Nenhum dado importado para {anoSelecionado}</p>
                    <p className="text-sm mt-1">Use a aba "Importar Excel" para adicionar dados</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Convênio</TableHead>
                          <TableHead>Mês/Ano</TableHead>
                          <TableHead className="text-right">Valor Faturado</TableHead>
                          <TableHead className="text-right">Valor Recebido</TableHead>
                          <TableHead className="text-right">Diferença</TableHead>
                          <TableHead className="text-center">Importado por</TableHead>
                          <TableHead className="text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dadosImportados.map((d) => {
                          const mesNum = d.mesAno.split("/")[1] || "";
                          const mesNome = MESES_NOMES[mesNum] || mesNum;
                          const diferenca = d.valorFaturado - d.valorRecebido;
                          return (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium">{d.convenio}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{mesNome}/{d.mesAno.split("/")[0]}</Badge>
                              </TableCell>
                              <TableCell className="text-right">{formatCurrency(d.valorFaturado)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(d.valorRecebido)}</TableCell>
                              <TableCell className="text-right">
                                {diferenca === 0 ? (
                                  <Badge variant="secondary">Igual</Badge>
                                ) : diferenca > 0 ? (
                                  <span className="text-amber-500">{formatCurrency(diferenca)}</span>
                                ) : (
                                  <span className="text-emerald-500">{formatCurrency(Math.abs(diferenca))}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-sm text-muted-foreground">
                                {d.importadoPorNome || "-"}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                  onClick={() => setDeleteId(d.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {/* Totals row */}
                        <TableRow className="bg-muted/30 font-bold">
                          <TableCell>TOTAL</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">{formatCurrency(totais.faturado)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totais.recebido)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totais.faturado - totais.recebido)}</TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Confirm Import Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Importação</DialogTitle>
              <DialogDescription>
                Você está prestes a importar {dadosPreview.length} registros de faturamento externo
                para o estabelecimento {estabelecimentoAtual?.nome || ""}.
                Registros existentes para o mesmo convênio/mês serão atualizados.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Faturado:</span>
                <span className="font-medium">{formatCurrency(previewTotais.faturado)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Recebido:</span>
                <span className="font-medium">{formatCurrency(previewTotais.recebido)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Arquivo:</span>
                <span className="font-medium">{nomeArquivo}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancelar</Button>
              <Button onClick={handleImportar}>Confirmar Importação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir este registro de faturamento externo? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteId) {
                    excluirMutation.mutate({ id: deleteId, estabelecimentoId });
                  }
                }}
                disabled={excluirMutation.isPending}
              >
                {excluirMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
