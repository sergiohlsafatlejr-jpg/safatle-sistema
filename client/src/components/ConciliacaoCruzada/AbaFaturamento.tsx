import { DollarSign, TrendingUp, TrendingDown, FileText, Download, Eye, Link2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AbaFaturamentoProps {
  isLoading: boolean;
  resumo: any;
  dadosGuias: any;
  contas: any[];
  exportarFaturamentoExcel: () => void;
  abrirDetalhes: (conta: any) => void;
  abrirVinculacao: (conta: any) => void;
  paginaAtual: number;
  setPaginaAtual: React.Dispatch<React.SetStateAction<number>>;
  totalPaginas: number;
  formatarMoeda: (valor: number) => string;
  formatarCompetencia: (comp: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
}

export function AbaFaturamento({
  isLoading,
  resumo,
  dadosGuias,
  contas,
  exportarFaturamentoExcel,
  abrirDetalhes,
  abrirVinculacao,
  paginaAtual,
  setPaginaAtual,
  totalPaginas,
  formatarMoeda,
  formatarCompetencia,
  getStatusBadge
}: AbaFaturamentoProps) {
  return (
    <div className="space-y-4">
      {/* Cards de Resumo do Faturamento */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-32" /></CardContent></Card>
          ))}
        </div>
      ) : resumo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Faturado</p>
                  <p className="text-2xl font-bold">{formatarMoeda(Number(resumo.totalFaturado))}</p>
                  <p className="text-xs opacity-70">{resumo.totalContas} guias / {resumo.totalItens} itens</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Pago</p>
                  <p className="text-2xl font-bold">{formatarMoeda(Number(resumo.totalPago))}</p>
                  <p className="text-xs opacity-70">
                    {Number(resumo.totalFaturado) > 0 
                      ? ((Number(resumo.totalPago) / Number(resumo.totalFaturado)) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Glosado</p>
                  <p className="text-2xl font-bold">{formatarMoeda(Number(resumo.totalGlosado))}</p>
                  <p className="text-xs opacity-70">
                    {Number(resumo.totalFaturado) > 0 
                      ? ((Number(resumo.totalGlosado) / Number(resumo.totalFaturado)) * 100).toFixed(1) 
                      : 0}%
                  </p>
                </div>
                <TrendingDown className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Status</p>
                  <div className="flex gap-2 mt-1 text-xs flex-wrap">
                    <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensConciliados} OK</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensDivergentes} Div.</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs flex-wrap">
                    <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensPendentes} Pend.</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded">{resumo.itensNaoRecebidos} N/R</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Guias */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">
            Guias / Contas ({dadosGuias?.total || 0})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={exportarFaturamentoExcel} disabled={!contas.length}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : contas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma guia encontrada.</p>
              <p className="text-sm mt-2">Clique em "Popular Dados" para importar do Warleine e XML TISS.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Guia/Conta</th>
                      <th className="text-left p-3 font-medium">Paciente</th>
                      <th className="text-left p-3 font-medium">Convênio</th>
                      <th className="text-left p-3 font-medium">Comp.</th>
                      <th className="text-center p-3 font-medium">Origem</th>
                      <th className="text-center p-3 font-medium">Itens</th>
                      <th className="text-right p-3 font-medium">Faturado</th>
                      <th className="text-right p-3 font-medium">Pago</th>
                      <th className="text-right p-3 font-medium">Glosado</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contas.map((conta: any, index: number) => (
                      <tr key={`${conta.contaNumero || conta.numeroGuia}-${index}`} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="font-medium font-mono text-sm">{conta.contaNumero || conta.numeroGuia || '-'}</div>
                        </td>
                        <td className="p-3 text-sm max-w-[200px] truncate" title={conta.pacienteNome}>
                          {conta.pacienteNome || '-'}
                        </td>
                        <td className="p-3 text-sm max-w-[150px] truncate" title={conta.convenio}>
                          {conta.convenio || '-'}
                        </td>
                        <td className="p-3 text-sm">{formatarCompetencia(conta.competencia)}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className="text-xs">
                            {conta.origemSistema === 'WARLEINE' ? 'Warleine' : 'XML'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">{conta.totalItens || 0}</td>
                        <td className="p-3 text-right font-medium text-blue-600">{formatarMoeda(Number(conta.valorFaturado))}</td>
                        <td className="p-3 text-right font-medium text-green-600">{formatarMoeda(Number(conta.valorPago))}</td>
                        <td className="p-3 text-right font-medium text-red-600">{formatarMoeda(Number(conta.valorGlosa))}</td>
                        <td className="p-3 text-center">{getStatusBadge(conta.statusConciliacao || 'pendente')}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => abrirDetalhes(conta)} title="Ver detalhes">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => abrirVinculacao(conta)} title="Vincular com recebimento">
                              <Link2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {paginaAtual + 1} de {totalPaginas} ({dadosGuias?.total} guias)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => Math.max(0, p - 1))} disabled={paginaAtual === 0}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPaginaAtual(p => Math.min(totalPaginas - 1, p + 1))} disabled={paginaAtual >= totalPaginas - 1}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
