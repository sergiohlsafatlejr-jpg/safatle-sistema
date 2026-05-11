import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, Building2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function FolhaPagamento() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const [competenciaSelecionada, setCompetenciaSelecionada] = useState<string>("todos");

  const { data: competencias = [] } = trpc.rh.competencias.useQuery(
    { estabelecimentoId: estabelecimentoAtual?.id },
    { enabled: !!estabelecimentoAtual }
  );

  const { data: folhaData = [], isLoading } = trpc.rh.listFolha.useQuery(
    { 
      estabelecimentoId: estabelecimentoAtual?.id,
      competencia: competenciaSelecionada !== "todos" ? competenciaSelecionada : undefined 
    },
    { enabled: !!estabelecimentoAtual }
  );

  const formatCurrency = (val: string | null | undefined) => {
    if (!val) return "R$ 0,00";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(val));
  };

  const totalSalarioBruto = folhaData.reduce((acc, row) => acc + (parseFloat(row.salarioBruto || "0") || 0), 0);
  const totalBeneficios = folhaData.reduce((acc, row) => acc + (parseFloat(row.somaBeneficios || "0") || 0), 0);
  const totalDescUnimed = folhaData.reduce((acc, row) => acc + (parseFloat(row.unimed || "0") || 0), 0);
  const totalDescontos = folhaData.reduce((acc, row) => acc + (parseFloat(row.descontoFixo || "0") || 0) + (parseFloat(row.descontosVariaveis || "0") || 0), 0);

  if (!estabelecimentoAtual) {
    return (
      <div className="flex h-[calc(100vh-100px)] items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Selecione um Estabelecimento</h2>
          <p className="text-muted-foreground">Você precisa selecionar um estabelecimento (ex: Safatle) no canto superior direito para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-8 overflow-hidden">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Folha de Pagamento - RH</h1>
          <p className="text-muted-foreground mt-1">
            Gestão e análise da folha de pagamento por competência.
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <Select 
            value={competenciaSelecionada} 
            onValueChange={setCompetenciaSelecionada}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Competência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Competências</SelectItem>
              {competencias.map(c => c.competencia && (
                <SelectItem key={c.competencia} value={c.competencia}>
                  {c.competencia}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 shrink-0">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{folhaData.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Salário Bruto</CardTitle>
            <Building2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(String(totalSalarioBruto))}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Benefícios</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(String(totalBeneficios))}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border mt-2">
        <div className="p-1 border-b bg-muted/20 flex justify-between items-center px-4 py-2 shrink-0">
          <h2 className="font-semibold">Detalhamento por Colaborador</h2>
        </div>
        <ScrollArea className="flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salário Bruto</TableHead>
                <TableHead className="text-right">Benefícios</TableHead>
                <TableHead className="text-right">Desc. Unimed</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Carregando dados...
                  </TableCell>
                </TableRow>
              ) : folhaData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhum colaborador encontrado para a competência selecionada.
                  </TableCell>
                </TableRow>
              ) : (
                folhaData.map((row) => {
                  const descTotal = (parseFloat(row.descontoFixo || "0") || 0) + (parseFloat(row.descontosVariaveis || "0") || 0);
                  
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <div>{row.colaboradorNome}</div>
                        <div className="text-xs text-muted-foreground">{row.cpf}</div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={row.unidade || ""}>{row.unidade}</div>
                        <div className="text-xs text-muted-foreground truncate" title={row.empresa || ""}>{row.empresa}</div>
                      </TableCell>
                      <TableCell>{row.cargo}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.salarioBruto)}</TableCell>
                      <TableCell className="text-right text-emerald-500">{formatCurrency(row.somaBeneficios)}</TableCell>
                      <TableCell className="text-right text-red-400">{formatCurrency(row.unimed)}</TableCell>
                      <TableCell className="text-right text-red-500">{formatCurrency(String(descTotal))}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold text-muted-foreground">Totais:</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(String(totalSalarioBruto))}</TableCell>
                <TableCell className="text-right text-emerald-500 font-bold">{formatCurrency(String(totalBeneficios))}</TableCell>
                <TableCell className="text-right text-red-400 font-bold">{formatCurrency(String(totalDescUnimed))}</TableCell>
                <TableCell className="text-right text-red-500 font-bold">{formatCurrency(String(totalDescontos))}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}
