import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { FileSearch, Download, Filter, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export default function ItensImportados() {
  const { user } = useAuth();
  const [convenioId, setConvenioId] = useState<string>("");
  const [arquivoId, setArquivoId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Buscar convênios
  const { data: convenios } = trpc.convenios.list.useQuery({});

  // Buscar arquivos do convênio selecionado
  const { data: arquivos } = trpc.arquivos.list.useQuery(
    { convenioId: convenioId ? parseInt(convenioId) : undefined },
    { enabled: true }
  );

  // Buscar procedimentos
  const { data: procedimentosData, isLoading, refetch } = trpc.procedimentos.list.useQuery(
    {
      arquivoId: arquivoId ? parseInt(arquivoId) : undefined,
      convenioId: convenioId ? parseInt(convenioId) : undefined,
      search: searchTerm || undefined,
      page,
      pageSize,
    },
    { enabled: true }
  );

  const procedimentos = procedimentosData?.items || [];
  const totalItems = procedimentosData?.total || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const handleExportCSV = () => {
    if (!procedimentos.length) return;

    const headers = ["Código", "Descrição", "Quantidade", "Valor Unitário", "Valor Total", "Médico", "CRM", "Guia", "Arquivo"];
    const rows = procedimentos.map((p: any) => [
      p.codigo,
      p.descricao || "",
      p.quantidade,
      p.valorUnitario || "",
      p.valorTotal || "",
      p.nomeMedico || "",
      p.crmMedico || "",
      p.guiaNumero || "",
      p.arquivoNome || "",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `itens_importados_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Itens Importados</h1>
            <p className="text-muted-foreground">
              Visualize todos os procedimentos extraídos dos arquivos por convênio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportCSV} disabled={!procedimentos.length}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>Filtre os itens por convênio, arquivo ou busca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioId} onValueChange={(value) => {
                  setConvenioId(value === "all" ? "" : value);
                  setArquivoId("");
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os convênios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os convênios</SelectItem>
                    {convenios?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Arquivo</label>
                <Select value={arquivoId} onValueChange={(value) => {
                  setArquivoId(value === "all" ? "" : value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os arquivos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os arquivos</SelectItem>
                    {arquivos?.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">&nbsp;</label>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setConvenioId("");
                    setArquivoId("");
                    setSearchTerm("");
                    setPage(1);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Total de itens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {procedimentos.reduce((acc: number, p: any) => acc + (p.quantidade || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">Quantidade total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                R$ {procedimentos.reduce((acc: number, p: any) => acc + parseFloat(p.valorTotal || "0"), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">Valor total (página atual)</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Itens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5" />
              Procedimentos Importados
            </CardTitle>
            <CardDescription>
              {totalItems} item(ns) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : procedimentos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item encontrado</p>
                <p className="text-sm">Importe arquivos para ver os procedimentos aqui</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Qtd</TableHead>
                        <TableHead className="text-right">Valor Unit.</TableHead>
                        <TableHead className="text-right">Valor Total</TableHead>
                        <TableHead>Médico</TableHead>
                        <TableHead>CRM</TableHead>
                        <TableHead>Guia</TableHead>
                        <TableHead>Arquivo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedimentos.map((proc: any) => (
                        <TableRow key={proc.id}>
                          <TableCell className="font-mono text-sm">
                            {proc.codigo}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={proc.descricao || "-"}>
                            {proc.descricao || <span className="text-muted-foreground italic">Sem descrição</span>}
                          </TableCell>
                          <TableCell className="text-center">{proc.quantidade}</TableCell>
                          <TableCell className="text-right">
                            {proc.valorUnitario ? `R$ ${parseFloat(proc.valorUnitario).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {proc.valorTotal ? `R$ ${parseFloat(proc.valorTotal).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={proc.nomeMedico || "-"}>
                            {proc.nomeMedico || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {proc.crmMedico || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {proc.guiaNumero || "-"}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={proc.arquivoNome || "-"}>
                            {proc.arquivoNome || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Página {page} de {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
