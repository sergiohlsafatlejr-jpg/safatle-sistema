import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, Search, Check,
  Wallet, CreditCard, BarChart3, PiggyBank, Trash2, Building2, Users,
  ArrowUpDown, Calendar, FileText, Download, ChevronDown, ChevronRight,
  Banknote, Receipt, CircleDollarSign, Percent, ArrowDownRight, ArrowUpRight,
  Clock, CheckCircle, XCircle, Eye, Landmark, List
} from "lucide-react";

// ==================== HELPERS ====================
function formatCurrency(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDate(d: string | Date | null | undefined) {
  if (!d) return "-";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return String(d); }
}

const MONTHS = [
  { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" }, { value: "03", label: "Março" },
  { value: "04", label: "Abril" }, { value: "05", label: "Maio" }, { value: "06", label: "Junho" },
  { value: "07", label: "Julho" }, { value: "08", label: "Agosto" }, { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" }, { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

// ==================== DASHBOARD ====================
function FinDashboard() {
  const now = new Date();
  const [mes, setMes] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const dashboard = trpc.financeiro.dashboard.resumo.useQuery({ mes });
  const d = dashboard.data;

  const [ano, mesNum] = mes.split("-");
  const mesLabel = MONTHS[Number(mesNum) - 1]?.label || mesNum;

  const saldo = d ? Number(d.receitasRecebido) - Number(d.despesasPago) : 0;
  const totalDespesas = d ? Number(d.despesasPago) + Number(d.despesasPendente) : 0;
  const totalReceitas = d ? Number(d.receitasRecebido) + Number(d.receitasPendente) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Dashboard Financeiro</h2>
          <p className="text-sm text-muted-foreground">{mesLabel} {ano}</p>
        </div>
        <div className="flex gap-2">
          <Select value={mesNum} onValueChange={v => setMes(`${ano}-${v}`)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={ano} onValueChange={v => setMes(`${v}-${mesNum}`)}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>{[2024, 2025, 2026, 2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {dashboard.isLoading ? <div className="text-center py-12 text-muted-foreground">Carregando...</div> : d ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingDown className="h-4 w-4" /> Despesas Pagas</div>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(d.despesasPago)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" /> Despesas Pendentes</div>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(d.despesasPendente)}</p>
                {Number(d.despesasVencido) > 0 && <p className="text-xs text-red-500 mt-1 font-medium">Vencidas: {formatCurrency(d.despesasVencido)}</p>}
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><TrendingUp className="h-4 w-4" /> Receitas Recebidas</div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(d.receitasRecebido)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Clock className="h-4 w-4" /> Receitas Pendentes</div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(d.receitasPendente)}</p>
              </CardContent>
            </Card>
            <Card className={cn("border-l-4", saldo >= 0 ? "border-l-emerald-500" : "border-l-red-500")}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Percent className="h-4 w-4" /> Saldo do Mês</div>
                <p className={cn("text-2xl font-bold", saldo >= 0 ? "text-emerald-600" : "text-red-600")}>{formatCurrency(saldo)}</p>
              </CardContent>
            </Card>
          </div>

          {/* DRE Simplificado */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5 text-primary" /> DRE Gerencial — {mesLabel}/{ano}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0"><tr>
                    <th className="text-left p-3 font-semibold">Conta</th>
                    <th className="text-right p-3 font-semibold">Valor</th>
                    <th className="text-right p-3 font-semibold">% Receita</th>
                  </tr></thead>
                  <tbody>
                    {[
                      { label: "Receita Bruta (Recebimentos)", value: totalReceitas, highlight: true, bold: true },
                      { label: "  Recebido", value: Number(d.receitasRecebido), indent: 1 },
                      { label: "  A Receber", value: Number(d.receitasPendente), indent: 1 },
                      { label: "(-) Despesas Totais", value: -totalDespesas, highlight: true, bold: true },
                      { label: "  Pagas", value: -Number(d.despesasPago), indent: 1 },
                      { label: "  Pendentes", value: -Number(d.despesasPendente), indent: 1 },
                      { label: "  Vencidas", value: -Number(d.despesasVencido), indent: 1, warn: true },
                      { label: "Resultado do Período", value: saldo, highlight: true, bold: true, total: true },
                    ].map((row, i) => (
                      <tr key={i} className={cn("border-t border-border/50 transition-colors hover:bg-muted/30",
                        row.highlight && "bg-muted/20", row.total && "bg-primary/5")}>
                        <td className="p-3" style={{ paddingLeft: row.indent ? `${12 + row.indent * 24}px` : undefined }}>
                          <span className={cn(row.bold && "font-semibold", row.warn && "text-red-500")}>{row.label}</span>
                        </td>
                        <td className={cn("p-3 text-right tabular-nums whitespace-nowrap font-medium",
                          row.total && row.value >= 0 && "text-emerald-600 font-bold",
                          row.total && row.value < 0 && "text-red-600 font-bold",
                          !row.total && row.value < 0 && "text-red-500/80",
                          row.warn && "text-red-500")}>
                          {row.value !== 0 ? formatCurrency(row.value) : "—"}
                        </td>
                        <td className="p-3 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                          {totalReceitas > 0 && row.value !== 0 ? `${(Math.abs(row.value) / totalReceitas * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Evolução 6 meses */}
          {d.evolucao && d.evolucao.length > 0 && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-lg">Evolução — Últimos 6 Meses</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-2">
                  {d.evolucao.map((e: any, i: number) => (
                    <div key={i} className="text-center rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-2">{e.mes}</p>
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(e.receitas)}</p>
                      <p className="text-sm font-semibold text-red-500">{formatCurrency(e.despesas)}</p>
                      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", e.receitas >= e.despesas ? "bg-green-500" : "bg-red-500")}
                          style={{ width: `${Math.min(100, e.receitas > 0 ? (Math.min(e.receitas, e.despesas) / Math.max(e.receitas, e.despesas)) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}

// ==================== CONTAS A PAGAR ====================
function ContasPagar() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const lista = trpc.financeiro.transacoes.listar.useQuery({
    busca: busca || undefined,
    pago: filtroStatus === "todos" ? undefined : filtroStatus as any,
    limit: 200,
  });
  const empresas = trpc.financeiro.empresas.listar.useQuery();
  const categorias = trpc.financeiro.categorias.listar.useQuery();
  const bancos = trpc.financeiro.bancos.listar.useQuery();

  const criar = trpc.financeiro.transacoes.criar.useMutation({
    onSuccess: () => { utils.financeiro.invalidate(); toast.success("Conta criada!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const marcarPago = trpc.financeiro.transacoes.marcarPago.useMutation({
    onSuccess: () => { utils.financeiro.invalidate(); toast.success("Marcado como pago!"); },
  });
  const excluir = trpc.financeiro.transacoes.excluir.useMutation({
    onSuccess: () => { utils.financeiro.invalidate(); toast.success("Conta excluída!"); },
  });

  const items = lista.data?.items || [];
  const hoje = new Date().toISOString().slice(0, 10);

  const totalPendente = items.filter((t: any) => t.pago === "nao").reduce((s: number, t: any) => s + Number(t.valor), 0);
  const totalVencido = items.filter((t: any) => t.pago === "nao" && t.dataVencimento && new Date(t.dataVencimento) < new Date(hoje)).reduce((s: number, t: any) => s + Number(t.valor), 0);

  const handleCriar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    criar.mutate({
      descricao: fd.get("descricao") as string,
      valor: fd.get("valor") as string,
      dataVencimento: fd.get("dataVencimento") as string,
      empresaId: fd.get("empresaId") ? Number(fd.get("empresaId")) : undefined,
      categoriaId: fd.get("categoriaId") ? Number(fd.get("categoriaId")) : undefined,
      bancoId: fd.get("bancoId") ? Number(fd.get("bancoId")) : undefined,
      observacoes: (fd.get("observacoes") as string) || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Contas a Pagar</h2>
          <div className="flex gap-4 mt-1">
            <span className="text-sm text-muted-foreground">Pendente: <span className="font-semibold text-amber-600">{formatCurrency(totalPendente)}</span></span>
            {totalVencido > 0 && <span className="text-sm text-red-500 font-medium">Vencido: {formatCurrency(totalVencido)}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 w-48" /></div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="nao">Pendentes</SelectItem><SelectItem value="sim">Pagos</SelectItem></SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle><DialogDescription>Registre uma nova despesa.</DialogDescription></DialogHeader>
              <form onSubmit={handleCriar} className="space-y-3">
                <div><Label>Descrição *</Label><Input name="descricao" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor *</Label><Input name="valor" type="number" step="0.01" min="0" required /></div>
                  <div><Label>Vencimento *</Label><Input name="dataVencimento" type="date" required /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Empresa</Label><select name="empresaId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-</option>{(empresas.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
                  <div><Label>Categoria</Label><select name="categoriaId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-</option>{(categorias.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                  <div><Label>Banco</Label><select name="bancoId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-</option>{(bancos.data || []).map((b: any) => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></div>
                </div>
                <div><Label>Observações</Label><Textarea name="observacoes" rows={2} /></div>
                <DialogFooter><Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {lista.isLoading ? <div className="py-12 text-center text-muted-foreground">Carregando...</div> : items.length === 0 ? (
            <div className="py-12 text-center"><Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhuma conta encontrada</p></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="py-3 pl-4 pr-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                <th className="px-2 py-3 text-xs font-semibold text-muted-foreground text-right">Valor</th>
                <th className="px-2 py-3 text-xs font-semibold text-muted-foreground">Vencimento</th>
                <th className="px-2 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="py-3 pl-2 pr-4 text-xs font-semibold text-muted-foreground text-right">Ações</th>
              </tr></thead>
              <tbody>{items.map((t: any) => {
                const vencido = t.pago === "nao" && t.dataVencimento && new Date(t.dataVencimento) < new Date(hoje);
                return (
                  <tr key={t.id} className={cn("border-b border-border hover:bg-muted/30 transition-colors", vencido && "bg-red-50/50 dark:bg-red-900/10")}>
                    <td className="py-3 pl-4 pr-2"><p className="font-medium">{t.descricao}</p>{t.observacoes && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{t.observacoes}</p>}</td>
                    <td className="px-2 py-3 text-right font-semibold text-red-600">{formatCurrency(t.valor)}</td>
                    <td className="px-2 py-3"><span className={cn(vencido && "text-red-500 font-medium")}>{formatDate(t.dataVencimento)}</span></td>
                    <td className="px-2 py-3">{t.pago === "sim" ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-semibold text-green-600"><CheckCircle className="h-3 w-3" /> Pago</span> : vencido ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-semibold text-red-500"><AlertTriangle className="h-3 w-3" /> Vencido</span> : <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-semibold text-amber-600"><Clock className="h-3 w-3" /> Pendente</span>}</td>
                    <td className="py-3 pl-2 pr-4 text-right">
                      <div className="flex gap-1 justify-end">
                        {t.pago === "nao" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => marcarPago.mutate({ id: t.id })}><Check className="h-3 w-3 mr-1" /> Pagar</Button>}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => { if (confirm("Excluir?")) excluir.mutate({ id: t.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== CONTAS A RECEBER ====================
function ContasReceber() {
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const lista = trpc.financeiro.recebiveis.listar.useQuery({
    busca: busca || undefined,
    recebido: filtroStatus === "todos" ? undefined : filtroStatus as any,
    limit: 200,
  });
  const empresas = trpc.financeiro.empresas.listar.useQuery();
  const clientes = trpc.financeiro.clientes.listar.useQuery();
  const bancos = trpc.financeiro.bancos.listar.useQuery();

  const criar = trpc.financeiro.recebiveis.criar.useMutation({
    onSuccess: () => { utils.financeiro.invalidate(); toast.success("Recebível criado!"); setDialogOpen(false); },
    onError: (e) => toast.error(e.message),
  });
  const marcarRecebido = trpc.financeiro.recebiveis.marcarRecebido.useMutation({
    onSuccess: () => { utils.financeiro.invalidate(); toast.success("Marcado como recebido!"); },
  });
  const excluir = trpc.financeiro.recebiveis.excluir.useMutation({
    onSuccess: () => { utils.financeiro.invalidate(); toast.success("Recebível excluído!"); },
  });

  const items = lista.data?.items || [];
  const totalPendente = items.filter((r: any) => r.recebido === "nao").reduce((s: number, r: any) => s + Number(r.valor), 0);

  const handleCriar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    criar.mutate({
      descricao: fd.get("descricao") as string,
      valor: fd.get("valor") as string,
      dataVencimento: fd.get("dataVencimento") as string,
      empresaId: fd.get("empresaId") ? Number(fd.get("empresaId")) : undefined,
      clienteId: fd.get("clienteId") ? Number(fd.get("clienteId")) : undefined,
      bancoId: fd.get("bancoId") ? Number(fd.get("bancoId")) : undefined,
      observacoes: (fd.get("observacoes") as string) || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Contas a Receber</h2>
          <p className="text-sm text-muted-foreground mt-1">Pendente: <span className="font-semibold text-blue-600">{formatCurrency(totalPendente)}</span></p>
        </div>
        <div className="flex gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9 w-48" /></div>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="nao">Pendentes</SelectItem><SelectItem value="sim">Recebidos</SelectItem></SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Recebível</Button>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Novo Recebível</DialogTitle><DialogDescription>Registre uma nova receita a receber.</DialogDescription></DialogHeader>
              <form onSubmit={handleCriar} className="space-y-3">
                <div><Label>Descrição *</Label><Input name="descricao" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor *</Label><Input name="valor" type="number" step="0.01" min="0" required /></div>
                  <div><Label>Vencimento *</Label><Input name="dataVencimento" type="date" required /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Empresa</Label><select name="empresaId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-</option>{(empresas.data || []).map((e: any) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
                  <div><Label>Cliente</Label><select name="clienteId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-</option>{(clientes.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                  <div><Label>Banco</Label><select name="bancoId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-</option>{(bancos.data || []).map((b: any) => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></div>
                </div>
                <div><Label>Observações</Label><Textarea name="observacoes" rows={2} /></div>
                <DialogFooter><Button type="submit" disabled={criar.isPending}>{criar.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          {lista.isLoading ? <div className="py-12 text-center text-muted-foreground">Carregando...</div> : items.length === 0 ? (
            <div className="py-12 text-center"><Banknote className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhum recebível encontrado</p></div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b border-border bg-muted/30">
                <th className="py-3 pl-4 pr-2 text-xs font-semibold text-muted-foreground">Descrição</th>
                <th className="px-2 py-3 text-xs font-semibold text-muted-foreground text-right">Valor</th>
                <th className="px-2 py-3 text-xs font-semibold text-muted-foreground">Vencimento</th>
                <th className="px-2 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="py-3 pl-2 pr-4 text-xs font-semibold text-muted-foreground text-right">Ações</th>
              </tr></thead>
              <tbody>{items.map((r: any) => (
                <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                  <td className="py-3 pl-4 pr-2"><p className="font-medium">{r.descricao}</p></td>
                  <td className="px-2 py-3 text-right font-semibold text-green-600">{formatCurrency(r.valor)}</td>
                  <td className="px-2 py-3">{formatDate(r.dataVencimento)}</td>
                  <td className="px-2 py-3">{r.recebido === "sim" ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-semibold text-green-600"><CheckCircle className="h-3 w-3" /> Recebido</span> : <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs font-semibold text-blue-600"><Clock className="h-3 w-3" /> Pendente</span>}</td>
                  <td className="py-3 pl-2 pr-4 text-right">
                    <div className="flex gap-1 justify-end">
                      {r.recebido === "nao" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => marcarRecebido.mutate({ id: r.id })}><Check className="h-3 w-3 mr-1" /> Receber</Button>}
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => { if (confirm("Excluir?")) excluir.mutate({ id: r.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== BANCOS ====================
function BancosView() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = trpc.useUtils();
  const bancos = trpc.financeiro.bancos.listar.useQuery();
  const criar = trpc.financeiro.bancos.criar.useMutation({
    onSuccess: () => { utils.financeiro.bancos.invalidate(); toast.success("Banco criado!"); setDialogOpen(false); },
  });
  const excluir = trpc.financeiro.bancos.excluir.useMutation({
    onSuccess: () => { utils.financeiro.bancos.invalidate(); toast.success("Banco excluído!"); },
  });

  const handleCriar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    criar.mutate({ nome: fd.get("nome") as string, cor: (fd.get("cor") as string) || "#3b82f6", saldoInicial: (fd.get("saldoInicial") as string) || "0" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Contas Bancárias</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Banco</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Conta Bancária</DialogTitle></DialogHeader>
            <form onSubmit={handleCriar} className="space-y-3">
              <div><Label>Nome *</Label><Input name="nome" required placeholder="Ex: Banco do Brasil" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cor</Label><Input name="cor" type="color" defaultValue="#3b82f6" /></div>
                <div><Label>Saldo Inicial</Label><Input name="saldoInicial" type="number" step="0.01" defaultValue="0" /></div>
              </div>
              <DialogFooter><Button type="submit" disabled={criar.isPending}>Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bancos.isLoading ? <div className="col-span-3 text-center py-8 text-muted-foreground">Carregando...</div> : (bancos.data || []).length === 0 ? (
          <div className="col-span-3 text-center py-12"><Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhuma conta bancária cadastrada</p></div>
        ) : (bancos.data || []).map((b: any) => (
          <Card key={b.id} className="border-l-4" style={{ borderLeftColor: b.cor || "#3b82f6" }}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><Landmark className="h-4 w-4" style={{ color: b.cor || "#3b82f6" }} /><span className="font-semibold">{b.nome}</span></div>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => { if (confirm("Excluir?")) excluir.mutate({ id: b.id }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <p className="text-lg font-bold">{formatCurrency(b.saldoInicial)}</p>
              <p className="text-xs text-muted-foreground">Saldo inicial</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==================== CADASTROS ====================
function Cadastros() {
  const utils = trpc.useUtils();
  const empresas = trpc.financeiro.empresas.listar.useQuery();
  const categorias = trpc.financeiro.categorias.listar.useQuery();
  const clientes = trpc.financeiro.clientes.listar.useQuery();

  const [empDialog, setEmpDialog] = useState(false);
  const [catDialog, setCatDialog] = useState(false);
  const [cliDialog, setCliDialog] = useState(false);

  const criarEmpresa = trpc.financeiro.empresas.criar.useMutation({ onSuccess: () => { utils.financeiro.empresas.invalidate(); toast.success("Empresa criada!"); setEmpDialog(false); } });
  const criarCategoria = trpc.financeiro.categorias.criar.useMutation({ onSuccess: () => { utils.financeiro.categorias.invalidate(); toast.success("Categoria criada!"); setCatDialog(false); } });
  const criarCliente = trpc.financeiro.clientes.criar.useMutation({ onSuccess: () => { utils.financeiro.clientes.invalidate(); toast.success("Cliente criado!"); setCliDialog(false); } });
  const excluirEmpresa = trpc.financeiro.empresas.excluir.useMutation({ onSuccess: () => { utils.financeiro.empresas.invalidate(); toast.success("Empresa excluída!"); } });
  const excluirCategoria = trpc.financeiro.categorias.excluir.useMutation({ onSuccess: () => { utils.financeiro.categorias.invalidate(); toast.success("Categoria excluída!"); } });
  const excluirCliente = trpc.financeiro.clientes.excluir.useMutation({ onSuccess: () => { utils.financeiro.clientes.invalidate(); toast.success("Cliente excluído!"); } });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Cadastros</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Empresas */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Empresas</CardTitle>
              <Dialog open={empDialog} onOpenChange={setEmpDialog}><Button size="sm" variant="outline" onClick={() => setEmpDialog(true)}><Plus className="h-3.5 w-3.5" /></Button>
                <DialogContent><DialogHeader><DialogTitle>Nova Empresa</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); criarEmpresa.mutate({ nome: fd.get("nome") as string, cnpj: (fd.get("cnpj") as string) || undefined }); }} className="space-y-3"><div><Label>Nome *</Label><Input name="nome" required /></div><div><Label>CNPJ</Label><Input name="cnpj" /></div><DialogFooter><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-48 overflow-auto">
              {(empresas.data || []).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-2 border-b border-border hover:bg-muted/30">
                  <div><p className="text-sm font-medium">{e.nome}</p>{e.cnpj && <p className="text-xs text-muted-foreground">{e.cnpj}</p>}</div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => excluirEmpresa.mutate({ id: e.id })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {(empresas.data || []).length === 0 && <p className="text-center py-4 text-xs text-muted-foreground">Nenhuma empresa</p>}
            </div>
          </CardContent>
        </Card>

        {/* Categorias */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><List className="h-4 w-4" /> Categorias</CardTitle>
              <Dialog open={catDialog} onOpenChange={setCatDialog}><Button size="sm" variant="outline" onClick={() => setCatDialog(true)}><Plus className="h-3.5 w-3.5" /></Button>
                <DialogContent><DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); criarCategoria.mutate({ nome: fd.get("nome") as string }); }} className="space-y-3"><div><Label>Nome *</Label><Input name="nome" required /></div><DialogFooter><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-48 overflow-auto">
              {(categorias.data || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2 border-b border-border hover:bg-muted/30">
                  <p className="text-sm font-medium">{c.nome}</p>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => excluirCategoria.mutate({ id: c.id })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {(categorias.data || []).length === 0 && <p className="text-center py-4 text-xs text-muted-foreground">Nenhuma categoria</p>}
            </div>
          </CardContent>
        </Card>

        {/* Clientes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Clientes</CardTitle>
              <Dialog open={cliDialog} onOpenChange={setCliDialog}><Button size="sm" variant="outline" onClick={() => setCliDialog(true)}><Plus className="h-3.5 w-3.5" /></Button>
                <DialogContent><DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader><form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); criarCliente.mutate({ nome: fd.get("nome") as string, cnpj: (fd.get("cnpj") as string) || undefined, email: (fd.get("email") as string) || undefined }); }} className="space-y-3"><div><Label>Nome *</Label><Input name="nome" required /></div><div className="grid grid-cols-2 gap-3"><div><Label>CNPJ</Label><Input name="cnpj" /></div><div><Label>Email</Label><Input name="email" type="email" /></div></div><DialogFooter><Button type="submit">Salvar</Button></DialogFooter></form></DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-48 overflow-auto">
              {(clientes.data || []).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2 border-b border-border hover:bg-muted/30">
                  <div><p className="text-sm font-medium">{c.nome}</p>{c.cnpj && <p className="text-xs text-muted-foreground">{c.cnpj}</p>}</div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => excluirCliente.mutate({ id: c.id })}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {(clientes.data || []).length === 0 && <p className="text-center py-4 text-xs text-muted-foreground">Nenhum cliente</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ==================== MÓDULO PRINCIPAL ====================
export default function FinanceiroModule() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <CircleDollarSign className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Módulo Financeiro</h1>
          <p className="text-sm text-muted-foreground">Gestão Financeira Hospitalar</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="pagar"><Receipt className="h-4 w-4 mr-1" /> Contas a Pagar</TabsTrigger>
          <TabsTrigger value="receber"><Banknote className="h-4 w-4 mr-1" /> Contas a Receber</TabsTrigger>
          <TabsTrigger value="bancos"><Landmark className="h-4 w-4 mr-1" /> Bancos</TabsTrigger>
          <TabsTrigger value="cadastros"><Building2 className="h-4 w-4 mr-1" /> Cadastros</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><FinDashboard /></TabsContent>
        <TabsContent value="pagar"><ContasPagar /></TabsContent>
        <TabsContent value="receber"><ContasReceber /></TabsContent>
        <TabsContent value="bancos"><BancosView /></TabsContent>
        <TabsContent value="cadastros"><Cadastros /></TabsContent>
      </Tabs>
    </div>
  );
}
