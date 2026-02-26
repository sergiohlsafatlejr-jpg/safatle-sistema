import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Eye, TableIcon, X, GripVertical } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface TabelasTabProps {
  estabelecimentoId: number;
}

const TIPOS_COLUNA = [
  { value: "varchar", label: "Texto (VARCHAR)" },
  { value: "int", label: "Inteiro (INT)" },
  { value: "bigint", label: "Inteiro Grande (BIGINT)" },
  { value: "decimal", label: "Decimal" },
  { value: "text", label: "Texto Longo (TEXT)" },
  { value: "date", label: "Data" },
  { value: "datetime", label: "Data e Hora" },
  { value: "boolean", label: "Sim/Não (BOOLEAN)" },
];

interface ColunaForm {
  nome: string;
  nomeExibicao: string;
  tipo: string;
  tamanho?: number;
  precisao?: number;
  obrigatorio: string;
  chaveUnica: string;
  valorPadrao?: string;
}

export function TabelasTab({ estabelecimentoId }: TabelasTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [showDados, setShowDados] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [nomeTabela, setNomeTabela] = useState("");
  const [nomeExibicao, setNomeExibicao] = useState("");
  const [descricao, setDescricao] = useState("");
  const [colunas, setColunas] = useState<ColunaForm[]>([
    { nome: "", nomeExibicao: "", tipo: "varchar", tamanho: 255, obrigatorio: "nao", chaveUnica: "nao" },
  ]);

  const tabelas = trpc.integradorDados.tabelas.listar.useQuery({ estabelecimentoId });

  const dadosTabela = trpc.integradorDados.tabelas.consultarDados.useQuery(
    { id: showDados || 0, limite: 100, offset: 0 },
    { enabled: !!showDados }
  );

  const tabelaDetalhe = trpc.integradorDados.tabelas.obter.useQuery(
    { id: showDados || 0 },
    { enabled: !!showDados }
  );

  const criarTabela = trpc.integradorDados.tabelas.criar.useMutation({
    onSuccess: () => {
      toast.success("Tabela criada com sucesso");
      resetForm();
      tabelas.refetch();
    },
    onError: (e) => toast.error("Erro ao criar tabela", { description: e.message }),
  });

  const excluirTabela = trpc.integradorDados.tabelas.excluir.useMutation({
    onSuccess: () => {
      toast.success("Tabela excluída");
      setDeleteId(null);
      tabelas.refetch();
    },
    onError: (e) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const resetForm = () => {
    setShowForm(false);
    setNomeTabela("");
    setNomeExibicao("");
    setDescricao("");
    setColunas([{ nome: "", nomeExibicao: "", tipo: "varchar", tamanho: 255, obrigatorio: "nao", chaveUnica: "nao" }]);
  };

  const adicionarColuna = () => {
    setColunas([...colunas, { nome: "", nomeExibicao: "", tipo: "varchar", tamanho: 255, obrigatorio: "nao", chaveUnica: "nao" }]);
  };

  const removerColuna = (idx: number) => {
    if (colunas.length <= 1) return;
    setColunas(colunas.filter((_, i) => i !== idx));
  };

  const atualizarColuna = (idx: number, campo: keyof ColunaForm, valor: any) => {
    const novas = [...colunas];
    (novas[idx] as any)[campo] = valor;
    // Auto-gerar nome técnico a partir do nome de exibição
    if (campo === "nomeExibicao") {
      novas[idx].nome = valor
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    }
    setColunas(novas);
  };

  const handleSubmit = () => {
    if (!nomeTabela || !nomeExibicao) {
      toast.error("Nome da tabela e nome de exibição são obrigatórios");
      return;
    }
    const colunasValidas = colunas.filter((c) => c.nome && c.nomeExibicao && c.tipo);
    if (colunasValidas.length === 0) {
      toast.error("Adicione pelo menos uma coluna");
      return;
    }

    criarTabela.mutate({
      nome: nomeTabela,
      nomeExibicao,
      descricao,
      estabelecimentoId,
      colunas: colunasValidas.map((c) => ({
        nome: c.nome,
        nomeExibicao: c.nomeExibicao,
        tipo: c.tipo as any,
        tamanho: c.tamanho,
        precisao: c.precisao,
        obrigatorio: c.obrigatorio as any,
        chaveUnica: c.chaveUnica as any,
        valorPadrao: c.valorPadrao,
      })),
    });
  };

  const autoNomeTabela = (exibicao: string) => {
    setNomeExibicao(exibicao);
    setNomeTabela(
      exibicao
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tabelas de Destino</h3>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie tabelas para armazenar os dados sincronizados
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Tabela
        </Button>
      </div>

      {tabelas.data && tabelas.data.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nome Técnico</TableHead>
                <TableHead>Colunas</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabelas.data.map((tab: any) => (
                <TableRow key={tab.id}>
                  <TableCell className="font-medium">{tab.nomeExibicao}</TableCell>
                  <TableCell className="text-sm font-mono text-muted-foreground">integ_{tab.nome}</TableCell>
                  <TableCell>{tab.totalColunas || 0}</TableCell>
                  <TableCell>{tab.totalRegistros?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    {tab.criadaNoBanco === "sim" ? (
                      <Badge className="bg-green-600">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tab.criadaEm ? new Date(tab.criadaEm).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowDados(tab.id)}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteId(tab.id)} className="text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <TableIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma tabela cadastrada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Nova Tabela" para criar uma tabela de destino para os dados
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Criação de Tabela */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Tabela</DialogTitle>
            <DialogDescription>
              Defina o nome e as colunas da tabela que será criada no banco de dados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Info da Tabela */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome de Exibição *</Label>
                <Input
                  value={nomeExibicao}
                  onChange={(e) => autoNomeTabela(e.target.value)}
                  placeholder="Ex: Faturamento IPASGO"
                />
              </div>
              <div>
                <Label>Nome Técnico (auto-gerado)</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground font-mono">integ_</span>
                  <Input
                    value={nomeTabela}
                    onChange={(e) => setNomeTabela(e.target.value)}
                    className="font-mono"
                    placeholder="faturamento_ipasgo"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional da tabela" />
              </div>
            </div>

            {/* Colunas */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Colunas</Label>
                <Button variant="outline" size="sm" onClick={adicionarColuna}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar Coluna
                </Button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                  <div className="col-span-3">Nome Exibição</div>
                  <div className="col-span-2">Nome Técnico</div>
                  <div className="col-span-2">Tipo</div>
                  <div className="col-span-1">Tam.</div>
                  <div className="col-span-1">Obrig.</div>
                  <div className="col-span-1">Único</div>
                  <div className="col-span-1">Padrão</div>
                  <div className="col-span-1"></div>
                </div>

                {colunas.map((col, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <Input
                        value={col.nomeExibicao}
                        onChange={(e) => atualizarColuna(idx, "nomeExibicao", e.target.value)}
                        placeholder="Nome do campo"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={col.nome}
                        onChange={(e) => atualizarColuna(idx, "nome", e.target.value)}
                        placeholder="campo"
                        className="text-sm font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <Select value={col.tipo} onValueChange={(v) => atualizarColuna(idx, "tipo", v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_COLUNA.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        value={col.tamanho || ""}
                        onChange={(e) => atualizarColuna(idx, "tamanho", Number(e.target.value) || undefined)}
                        placeholder="255"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Select value={col.obrigatorio} onValueChange={(v) => atualizarColuna(idx, "obrigatorio", v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao">Não</SelectItem>
                          <SelectItem value="sim">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Select value={col.chaveUnica} onValueChange={(v) => atualizarColuna(idx, "chaveUnica", v)}>
                        <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nao">Não</SelectItem>
                          <SelectItem value="sim">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Input
                        value={col.valorPadrao || ""}
                        onChange={(e) => atualizarColuna(idx, "valorPadrao", e.target.value)}
                        placeholder="-"
                        className="text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removerColuna(idx)}
                        disabled={colunas.length <= 1}
                        className="text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={criarTabela.isPending}>
                {criarTabela.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Tabela
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Visualização de Dados */}
      <Dialog open={showDados !== null} onOpenChange={(open) => { if (!open) setShowDados(null); }}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Dados da Tabela: {tabelaDetalhe.data?.nomeExibicao || "..."}
            </DialogTitle>
            <DialogDescription>
              {dadosTabela.data?.total || 0} registros encontrados
            </DialogDescription>
          </DialogHeader>
          {dadosTabela.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : dadosTabela.data?.dados && dadosTabela.data.dados.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(dadosTabela.data.dados[0]).map((col) => (
                      <TableHead key={col} className="text-xs whitespace-nowrap">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosTabela.data.dados.map((row: any, idx: number) => (
                    <TableRow key={idx}>
                      {Object.values(row).map((val: any, cidx: number) => (
                        <TableCell key={cidx} className="text-xs whitespace-nowrap max-w-[200px] truncate">
                          {val === null ? <span className="text-muted-foreground italic">NULL</span> : String(val)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado encontrado nesta tabela
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tabela</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tabela? Todos os dados armazenados nela serão perdidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && excluirTabela.mutate({ id: deleteId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
