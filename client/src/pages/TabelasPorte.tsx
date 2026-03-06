import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Search, Plus, Trash2, Database, FileSpreadsheet, Building2, Loader2, ChevronLeft, ChevronRight, BookOpen, AlertTriangle } from "lucide-react";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";

export default function TabelasPorte() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id || 1;

  const [activeTab, setActiveTab] = useState("resumo");
  const [buscaCbhpm, setBuscaCbhpm] = useState("");
  const [buscaConvenio, setBuscaConvenio] = useState("");
  const [selectedConvenioFilter, setSelectedConvenioFilter] = useState("");
  const [pageCbhpm, setPageCbhpm] = useState(1);
  const [pageConvenio, setPageConvenio] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<"cbhpm" | "convenio">("cbhpm");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state para adicionar manualmente
  const [formConvenio, setFormConvenio] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formPorte, setFormPorte] = useState("");
  const [formPorteAnest, setFormPorteAnest] = useState("");
  const [formValorTaxa, setFormValorTaxa] = useState("");
  const [formValorHonorario, setFormValorHonorario] = useState("");
  const [formObs, setFormObs] = useState("");

  // Queries
  const resumo = trpc.cbhpm.resumo.useQuery({ estabelecimentoId });

  const cbhpmList = trpc.cbhpm.listarCbhpm.useQuery(
    { busca: buscaCbhpm || undefined, page: pageCbhpm },
    { enabled: activeTab === "cbhpm" }
  );

  const convenioList = trpc.cbhpm.listarPorteConvenio.useQuery(
    { estabelecimentoId, convenio: selectedConvenioFilter || undefined, busca: buscaConvenio || undefined, page: pageConvenio },
    { enabled: activeTab === "convenio" }
  );

  // Mutations
  const importarCbhpm = trpc.cbhpm.importarCbhpm.useMutation({
    onSuccess: (data) => { toast.success(data.message); cbhpmList.refetch(); resumo.refetch(); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const importarConvenio = trpc.cbhpm.importarPorteConvenio.useMutation({
    onSuccess: (data) => { toast.success(data.message); convenioList.refetch(); resumo.refetch(); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const adicionarPorte = trpc.cbhpm.adicionarPorteConvenio.useMutation({
    onSuccess: () => { toast.success("Registro adicionado!"); setShowAddDialog(false); convenioList.refetch(); resumo.refetch(); resetForm(); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const excluirPorte = trpc.cbhpm.excluirPorteConvenio.useMutation({
    onSuccess: () => { toast.success("Registro excluído!"); convenioList.refetch(); resumo.refetch(); },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const resetForm = () => {
    setFormConvenio(""); setFormCodigo(""); setFormDescricao("");
    setFormPorte(""); setFormPorteAnest(""); setFormValorTaxa("");
    setFormValorHonorario(""); setFormObs("");
  };

  // Handler de importação CSV
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast.error("Arquivo vazio ou sem dados"); return; }

    const headers = lines[0].split(";").map(h => h.trim().toLowerCase().replace(/"/g, ""));

    const dados = lines.slice(1).map(line => {
      const cols = line.split(";").map(c => c.trim().replace(/"/g, ""));
      const obj: any = {};
      headers.forEach((h, i) => {
        if (h.includes("codigo") || h.includes("código") || h === "cod") obj.codigoProcedimento = cols[i];
        else if (h.includes("descri")) obj.descricaoProcedimento = cols[i];
        else if (h === "porte" || h.includes("porte_proc")) obj.porte = cols[i];
        else if (h.includes("anest")) obj.porteAnestesico = cols[i];
        else if (h.includes("custo") || h === "co") obj.custoOperacional = cols[i];
        else if (h.includes("auxiliar")) obj.numAuxiliares = parseInt(cols[i]) || 0;
        else if (h.includes("incid")) obj.incidencia = cols[i];
        else if (h.includes("grupo") && !h.includes("sub")) obj.grupo = cols[i];
        else if (h.includes("subgrupo")) obj.subgrupo = cols[i];
        else if (h.includes("taxa") || h.includes("valor_taxa")) obj.valorTaxaSala = cols[i];
        else if (h.includes("honorario") || h.includes("valor_honor")) obj.valorHonorarioAnestesico = cols[i];
      });
      return obj;
    }).filter((d: any) => d.codigoProcedimento);

    if (dados.length === 0) { toast.error("Nenhum dado válido encontrado. Verifique o formato do CSV (separador ;)"); return; }

    if (importType === "cbhpm") {
      importarCbhpm.mutate({ dados, versao: "6a", substituirExistentes: true });
    } else {
      const convenioName = prompt("Informe o nome do convênio para esta tabela:");
      if (!convenioName) return;
      importarConvenio.mutate({ estabelecimentoId, convenio: convenioName, dados, substituirExistentes: true });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tabelas de Porte</h1>
        <p className="text-muted-foreground">CBHPM e tabelas específicas por convênio para validação de taxas e portes</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="cbhpm">CBHPM</TabsTrigger>
          <TabsTrigger value="convenio">Por Convênio</TabsTrigger>
        </TabsList>

        {/* ============ RESUMO ============ */}
        <TabsContent value="resumo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CBHPM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{resumo.data?.totalCbhpm || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">procedimentos cadastrados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tabelas de Convênio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{resumo.data?.totalPorteConvenio || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">registros específicos por convênio</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Convênios com Tabela Própria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mt-1">
                  {resumo.data?.conveniosComTabela?.length ? (
                    resumo.data.conveniosComTabela.map(c => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum convênio importado ainda</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>O sistema utiliza uma hierarquia de prioridade para determinar o porte correto de cada procedimento:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge className="bg-green-600/20 text-green-400 border-green-500/30 shrink-0">1a</Badge>
                  <span><strong className="text-foreground">Tabela do Convênio</strong> — Se o convênio (ex: Unimed, Ipasgo) tem tabela própria importada, usa o porte específico do convênio.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30 shrink-0">2a</Badge>
                  <span><strong className="text-foreground">CBHPM</strong> — Caso não haja tabela específica do convênio, usa a Classificação Brasileira Hierarquizada de Procedimentos Médicos como referência padrão.</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Para importar, prepare um arquivo CSV com separador <strong className="text-foreground">;</strong> (ponto e vírgula) contendo pelo menos as colunas: <code>codigo</code>, <code>descricao</code>, <code>porte</code>, <code>porteAnestesico</code></span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CBHPM ============ */}
        <TabsContent value="cbhpm" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={buscaCbhpm}
                onChange={(e) => { setBuscaCbhpm(e.target.value); setPageCbhpm(1); }}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2" onClick={() => { setImportType("cbhpm"); setShowImportDialog(true); }}>
              <Upload className="h-4 w-4" /> Importar CBHPM
            </Button>
          </div>

          {cbhpmList.isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : cbhpmList.data?.items?.length === 0 ? (
            <Card className="py-12 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum procedimento CBHPM cadastrado.</p>
              <p className="text-sm text-muted-foreground mt-1">Importe a tabela CBHPM para começar a validar portes.</p>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{cbhpmList.data?.total} procedimentos encontrados</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Código</th>
                      <th className="text-left p-3 font-medium">Descrição</th>
                      <th className="text-center p-3 font-medium">Porte</th>
                      <th className="text-center p-3 font-medium">Porte Anest.</th>
                      <th className="text-right p-3 font-medium">Custo Op.</th>
                      <th className="text-center p-3 font-medium">Aux.</th>
                      <th className="text-left p-3 font-medium">Grupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cbhpmList.data?.items?.map((item: any) => (
                      <tr key={item.id} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{item.codigoProcedimento}</td>
                        <td className="p-3 max-w-[300px] truncate">{item.descricaoProcedimento || "-"}</td>
                        <td className="p-3 text-center"><Badge variant="outline">{item.porte || "-"}</Badge></td>
                        <td className="p-3 text-center"><Badge variant="secondary">{item.porteAnestesico || "-"}</Badge></td>
                        <td className="p-3 text-right font-mono">{item.custoOperacional ? `R$ ${Number(item.custoOperacional).toFixed(2)}` : "-"}</td>
                        <td className="p-3 text-center">{item.numAuxiliares || 0}</td>
                        <td className="p-3 text-xs text-muted-foreground truncate max-w-[150px]">{item.grupo || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Paginação */}
              {(cbhpmList.data?.totalPages || 1) > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={pageCbhpm <= 1} onClick={() => setPageCbhpm(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Página {pageCbhpm} de {cbhpmList.data?.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={pageCbhpm >= (cbhpmList.data?.totalPages || 1)} onClick={() => setPageCbhpm(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ============ POR CONVÊNIO ============ */}
        <TabsContent value="convenio" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou descrição..."
                value={buscaConvenio}
                onChange={(e) => { setBuscaConvenio(e.target.value); setPageConvenio(1); }}
                className="pl-10"
              />
            </div>
            <Select value={selectedConvenioFilter} onValueChange={(v) => { setSelectedConvenioFilter(v === "todos" ? "" : v); setPageConvenio(1); }}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os convênios" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os convênios</SelectItem>
                {convenioList.data?.convenios?.map((c: string) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => { setImportType("convenio"); setShowImportDialog(true); }}>
              <Upload className="h-4 w-4" /> Importar Tabela
            </Button>
            <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4" /> Adicionar Manual
            </Button>
          </div>

          {convenioList.isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : convenioList.data?.items?.length === 0 ? (
            <Card className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma tabela de convênio cadastrada.</p>
              <p className="text-sm text-muted-foreground mt-1">Importe as tabelas de Unimed, Ipasgo ou outros convênios.</p>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{convenioList.data?.total} registros encontrados</p>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Convênio</th>
                      <th className="text-left p-3 font-medium">Código</th>
                      <th className="text-left p-3 font-medium">Descrição</th>
                      <th className="text-center p-3 font-medium">Porte</th>
                      <th className="text-center p-3 font-medium">Porte Anest.</th>
                      <th className="text-right p-3 font-medium">Taxa Sala</th>
                      <th className="text-right p-3 font-medium">Hon. Anest.</th>
                      <th className="text-center p-3 font-medium">Origem</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convenioList.data?.items?.map((item: any) => (
                      <tr key={item.id} className="border-t hover:bg-muted/30">
                        <td className="p-3"><Badge variant="secondary">{item.convenio}</Badge></td>
                        <td className="p-3 font-mono text-xs">{item.codigoProcedimento}</td>
                        <td className="p-3 max-w-[250px] truncate">{item.descricaoProcedimento || "-"}</td>
                        <td className="p-3 text-center"><Badge variant="outline">{item.porte || "-"}</Badge></td>
                        <td className="p-3 text-center"><Badge variant="secondary">{item.porteAnestesico || "-"}</Badge></td>
                        <td className="p-3 text-right font-mono">{item.valorTaxaSala ? `R$ ${Number(item.valorTaxaSala).toFixed(2)}` : "-"}</td>
                        <td className="p-3 text-right font-mono">{item.valorHonorarioAnestesico ? `R$ ${Number(item.valorHonorarioAnestesico).toFixed(2)}` : "-"}</td>
                        <td className="p-3 text-center"><Badge variant="outline" className="text-xs">{item.origem || "manual"}</Badge></td>
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Excluir este registro?")) excluirPorte.mutate({ id: item.id }); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(convenioList.data?.totalPages || 1) > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={pageConvenio <= 1} onClick={() => setPageConvenio(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Página {pageConvenio} de {convenioList.data?.totalPages}</span>
                  <Button variant="outline" size="sm" disabled={pageConvenio >= (convenioList.data?.totalPages || 1)} onClick={() => setPageConvenio(p => p + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de Importação */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar {importType === "cbhpm" ? "Tabela CBHPM" : "Tabela de Convênio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
              <p className="font-medium">Formato esperado: CSV com separador ; (ponto e vírgula)</p>
              <p className="text-muted-foreground">Colunas esperadas:</p>
              {importType === "cbhpm" ? (
                <code className="text-xs block bg-background p-2 rounded">codigo;descricao;porte;porteAnestesico;custoOperacional;numAuxiliares;grupo;subgrupo</code>
              ) : (
                <code className="text-xs block bg-background p-2 rounded">codigo;descricao;porte;porteAnestesico;valorTaxaSala;valorHonorarioAnestesico</code>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileImport}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {(importarCbhpm.isPending || importarConvenio.isPending) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Importando...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Adição Manual */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Porte de Convênio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Convênio *</Label>
              <Input value={formConvenio} onChange={e => setFormConvenio(e.target.value)} placeholder="Ex: UNIMED, IPASGO" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código Procedimento *</Label>
                <Input value={formCodigo} onChange={e => setFormCodigo(e.target.value)} placeholder="Ex: 31102050" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Descrição do procedimento" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Porte</Label>
                <Input value={formPorte} onChange={e => setFormPorte(e.target.value)} placeholder="Ex: 6" />
              </div>
              <div>
                <Label>Porte Anestésico</Label>
                <Input value={formPorteAnest} onChange={e => setFormPorteAnest(e.target.value)} placeholder="Ex: 5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Taxa de Sala</Label>
                <Input value={formValorTaxa} onChange={e => setFormValorTaxa(e.target.value)} placeholder="Ex: 471.99" />
              </div>
              <div>
                <Label>Valor Honorário Anestésico</Label>
                <Input value={formValorHonorario} onChange={e => setFormValorHonorario(e.target.value)} placeholder="Ex: 350.00" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Observações opcionais" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button
              disabled={!formConvenio || !formCodigo || adicionarPorte.isPending}
              onClick={() => adicionarPorte.mutate({
                estabelecimentoId,
                convenio: formConvenio,
                codigoProcedimento: formCodigo,
                descricaoProcedimento: formDescricao || undefined,
                porte: formPorte || undefined,
                porteAnestesico: formPorteAnest || undefined,
                valorTaxaSala: formValorTaxa || undefined,
                valorHonorarioAnestesico: formValorHonorario || undefined,
                observacoes: formObs || undefined,
              })}
            >
              {adicionarPorte.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
