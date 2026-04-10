import { 
  ArrowLeft, FileText, Ban, CheckSquare, Undo2, Loader2, 
  CheckCircle2, AlertCircle, XCircle, ExternalLink, DollarSign, 
  Download, ListChecks, Eye, ChevronRight 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AbaConciliadosProps {
  guiaConciliadaSelecionada: any;
  setGuiaConciliadaSelecionada: (val: any) => void;
  itensConciliadosGuia: any[];
  isLoadingItensConciliados: boolean;
  modoGlosa: 'selecionados' | 'todos';
  setModoGlosa: (val: 'selecionados' | 'todos') => void;
  setModalGlosaAberto: (val: boolean) => void;
  itensSelecionadosGlosa: Set<number>;
  setItensSelecionadosGlosa: (val: Set<number>) => void;
  reverterGlosaMut: any;
  resumoConciliados: any;
  dadosGuiasConciliadas: any;
  guiasConciliadas: any[];
  isLoadingGuiasConciliadas: boolean;
  exportarConciliadosExcel: () => void;
  paginaConciliados: number;
  setPaginaConciliados: React.Dispatch<React.SetStateAction<number>>;
  totalPaginasConciliados: number;
  estabelecimentoId: number;
  formatarMoeda: (valor: number) => string;
  formatarCompetencia: (comp: string) => string;
  formatDateBR: (data: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  getMetodoBadge: (metodo: string) => React.ReactNode;
  isTerceiro: (guia: any) => boolean;
}

export function AbaConciliados({
  guiaConciliadaSelecionada, setGuiaConciliadaSelecionada,
  itensConciliadosGuia, isLoadingItensConciliados,
  modoGlosa, setModoGlosa, setModalGlosaAberto,
  itensSelecionadosGlosa, setItensSelecionadosGlosa,
  reverterGlosaMut, resumoConciliados,
  dadosGuiasConciliadas, guiasConciliadas, isLoadingGuiasConciliadas,
  exportarConciliadosExcel, paginaConciliados, setPaginaConciliados,
  totalPaginasConciliados, estabelecimentoId,
  formatarMoeda, formatarCompetencia, formatDateBR,
  getStatusBadge, getMetodoBadge, isTerceiro
}: AbaConciliadosProps) {
  return (
    <div className="space-y-4">
      {/* Se tem guia selecionada, mostra tela de detalhes */}
      {guiaConciliadaSelecionada ? (
        <div className="space-y-4">
          {/* Botão Voltar + Resumo da Guia */}
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setGuiaConciliadaSelecionada(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Lista
            </Button>
            <div>
              <h2 className="text-lg font-bold">
                Guia: {guiaConciliadaSelecionada.guia || guiaConciliadaSelecionada.numeroGuia || guiaConciliadaSelecionada.contaNumero}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {guiaConciliadaSelecionada.pacienteNome || '-'} | {guiaConciliadaSelecionada.convenio || `Convênio ${guiaConciliadaSelecionada.convenioId}`} | {formatarCompetencia(guiaConciliadaSelecionada.competencia)}
                </p>
                {Number(guiaConciliadaSelecionada.totalContas) > 1 && (
                  <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300" title="Esta guia aparece em múltiplos lotes/contas (Alta Administrativa)">
                    Alta Administrativa ({guiaConciliadaSelecionada.totalContas} contas)
                  </Badge>
                )}
                {Number(guiaConciliadaSelecionada.itensAgrupados) > 0 && (
                  <Badge variant="outline" className="text-xs bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-300" title="Itens duplicados foram agrupados para conciliação">
                    {guiaConciliadaSelecionada.itensAgrupados} itens agrupados
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Cards resumo da guia */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Faturado</p>
                <p className="text-lg font-bold text-blue-600">{formatarMoeda(Number(guiaConciliadaSelecionada.valorFaturado))}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-950 border-green-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Recebido</p>
                <p className="text-lg font-bold text-green-600">{formatarMoeda(Number(guiaConciliadaSelecionada.valorPago))}</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-950 border-red-200">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Glosado</p>
                <p className="text-lg font-bold text-red-600">{formatarMoeda(Number(guiaConciliadaSelecionada.valorGlosa))}</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${Number(guiaConciliadaSelecionada.diferenca) !== 0 ? 'bg-orange-50 dark:bg-orange-950 border-orange-300' : 'bg-gray-50 dark:bg-gray-950 border-gray-200'}`}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Diferença</p>
                <p className={`text-lg font-bold ${Number(guiaConciliadaSelecionada.diferenca) !== 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                  {Number(guiaConciliadaSelecionada.diferenca) !== 0 ? formatarMoeda(Number(guiaConciliadaSelecionada.diferenca)) : '-'}
                </p>
              </CardContent>
            </Card>
            <Card className="border-2">
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(guiaConciliadaSelecionada.statusGuia)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {guiaConciliadaSelecionada.totalItens} itens
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de itens detalhados */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Itens da Guia ({itensConciliadosGuia?.length || 0})
                </CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Botões de ação de glosa */}
                  {itensConciliadosGuia && itensConciliadosGuia.some((i: any) => i.statusConciliacao === 'nao_recebido' || i.statusConciliacao === 'divergente') && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-purple-600 border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
                        onClick={() => {
                          setModoGlosa('todos');
                          setModalGlosaAberto(true);
                        }}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Glosar Não Recebidos/Divergentes
                      </Button>
                      {itensSelecionadosGlosa.size > 0 && (
                        <Button
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            setModoGlosa('selecionados');
                            setModalGlosaAberto(true);
                          }}
                        >
                          <CheckSquare className="w-4 h-4 mr-1" />
                          Glosar Selecionados ({itensSelecionadosGlosa.size})
                        </Button>
                      )}
                    </>
                  )}
                  {/* Botão reverter glosa */}
                  {itensConciliadosGuia && itensConciliadosGuia.some((i: any) => i.statusConciliacao === 'glosado') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
                      onClick={() => {
                        const glosadoIds = itensConciliadosGuia
                          .filter((i: any) => i.statusConciliacao === 'glosado' && (itensSelecionadosGlosa.size === 0 || itensSelecionadosGlosa.has(i.id)))
                          .map((i: any) => i.id)
                          .filter(Boolean);
                        if (!glosadoIds.length) { toast.error('Nenhum item glosado para reverter'); return; }
                        if (!confirm(`Reverter ${glosadoIds.length} item(ns) glosado(s) para "Não Recebido"?`)) return;
                        reverterGlosaMut.mutate({ ids: glosadoIds, estabelecimentoId });
                      }}
                      disabled={reverterGlosaMut.isPending}
                    >
                      {reverterGlosaMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Undo2 className="w-4 h-4 mr-1" />}
                      Reverter Glosa
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingItensConciliados ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : itensConciliadosGuia && itensConciliadosGuia.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 w-10">
                          <Checkbox
                            checked={itensConciliadosGuia.filter((i: any) => i.statusConciliacao === 'nao_recebido' || i.statusConciliacao === 'glosado' || i.statusConciliacao === 'divergente').length > 0 && itensConciliadosGuia.filter((i: any) => i.statusConciliacao === 'nao_recebido' || i.statusConciliacao === 'glosado' || i.statusConciliacao === 'divergente').every((i: any) => itensSelecionadosGlosa.has(i.id))}
                            onCheckedChange={(checked) => {
                              const novos = new Set(itensSelecionadosGlosa);
                              itensConciliadosGuia.filter((i: any) => i.statusConciliacao === 'nao_recebido' || i.statusConciliacao === 'glosado' || i.statusConciliacao === 'divergente').forEach((i: any) => {
                                if (checked) novos.add(i.id); else novos.delete(i.id);
                              });
                              setItensSelecionadosGlosa(novos);
                            }}
                          />
                        </th>
                        <th className="text-left p-3 font-medium">Código</th>
                        <th className="text-left p-3 font-medium min-w-[200px]">Descrição</th>
                        <th className="text-center p-3 font-medium">Tipo</th>
                        <th className="text-center p-3 font-medium">Data Exec.</th>
                        <th className="text-center p-3 font-medium">Qtd</th>
                        <th className="text-right p-3 font-medium">Faturado</th>
                        <th className="text-right p-3 font-medium">Recebido</th>
                        <th className="text-right p-3 font-medium">Glosa</th>
                        <th className="text-left p-3 font-medium min-w-[150px]">Motivo Glosa</th>
                        <th className="text-right p-3 font-medium">Diferença</th>
                        <th className="text-center p-3 font-medium">Status</th>
                        <th className="text-center p-3 font-medium">Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensConciliadosGuia.map((item: any, index: number) => (
                        <tr key={item.id || index} className={`border-b hover:bg-muted/50 ${
                          item.statusConciliacao === 'divergente' ? 'bg-yellow-50/50 dark:bg-yellow-950/20' :
                          item.statusConciliacao === 'nao_recebido' ? 'bg-red-50/50 dark:bg-red-950/20' :
                          item.statusConciliacao === 'glosado' ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''
                        }`}>
                          <td className="p-3">
                            {(item.statusConciliacao === 'nao_recebido' || item.statusConciliacao === 'glosado' || item.statusConciliacao === 'divergente') && item.id ? (
                              <Checkbox
                                checked={itensSelecionadosGlosa.has(item.id)}
                                onCheckedChange={(checked) => {
                                  const novos = new Set(itensSelecionadosGlosa);
                                  if (checked) novos.add(item.id); else novos.delete(item.id);
                                  setItensSelecionadosGlosa(novos);
                                }}
                              />
                            ) : null}
                          </td>
                          <td className="p-3 font-mono text-sm">{item.codigoItem || '-'}</td>
                          <td className="p-3 text-sm max-w-[200px] truncate" title={item.descricaoItem}>{item.descricaoItem || '-'}</td>
                          <td className="p-3 text-center">
                            {item.tipoItem ? (
                              <Badge variant="outline" className="text-xs">{item.tipoItem}</Badge>
                            ) : '-'}
                          </td>
                          <td className="p-3 text-center text-xs text-muted-foreground">
                            {item.dataExecucao ? formatDateBR(item.dataExecucao) : '-'}
                          </td>
                          <td className="p-3 text-center">{Number(item.quantidade) || 1}</td>
                          <td className="p-3 text-right font-medium text-blue-600">{formatarMoeda(Number(item.valorFaturado))}</td>
                          <td className="p-3 text-right font-medium text-green-600">{formatarMoeda(Number(item.valorPago))}</td>
                          <td className="p-3 text-right font-medium text-red-600">{formatarMoeda(Number(item.valorGlosa))}</td>
                          <td className="p-3 text-sm max-w-[250px]" title={item.codigoGlosa ? `Cód: ${item.codigoGlosa}${item.motivoGlosa ? ' - ' + item.motivoGlosa : ''}${item.grupoGlosa ? ' [' + item.grupoGlosa + ']' : ''}` : ''}>
                            {item.codigoGlosa ? (
                              <div className="text-red-600">
                                <span className="font-mono text-xs bg-red-100 dark:bg-red-950 px-1 py-0.5 rounded">{item.codigoGlosa}</span>
                                {item.motivoGlosa && (
                                  <p className="text-xs mt-0.5 leading-tight line-clamp-2">{item.motivoGlosa}</p>
                                )}
                                {item.grupoGlosa && (
                                  <span className="text-[10px] text-muted-foreground">[{item.grupoGlosa}]</span>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td className={`p-3 text-right font-medium ${Number(item.diferenca) > 0 ? 'text-red-600' : Number(item.diferenca) < 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                            {Number(item.diferenca) !== 0 ? formatarMoeda(Number(item.diferenca)) : '-'}
                          </td>
                          <td className="p-3 text-center">{getStatusBadge(item.statusConciliacao)}</td>
                          <td className="p-3 text-center">{getMetodoBadge(item.metodoConciliacao)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-medium">
                      <tr className="border-t-2">
                        <td className="p-3"></td>
                        <td className="p-3" colSpan={4}>Total</td>
                        <td className="p-3 text-center">{itensConciliadosGuia.reduce((s: number, i: any) => s + (Number(i.quantidade) || 1), 0)}</td>
                        <td className="p-3 text-right text-blue-600">{formatarMoeda(itensConciliadosGuia.reduce((s: number, i: any) => s + Number(i.valorFaturado || 0), 0))}</td>
                        <td className="p-3 text-right text-green-600">{formatarMoeda(itensConciliadosGuia.reduce((s: number, i: any) => s + Number(i.valorPago || 0), 0))}</td>
                        <td className="p-3 text-right text-red-600">{formatarMoeda(itensConciliadosGuia.reduce((s: number, i: any) => s + Number(i.valorGlosa || 0), 0))}</td>
                        <td></td>
                        <td className="p-3 text-right">{formatarMoeda(itensConciliadosGuia.reduce((s: number, i: any) => s + Number(i.diferenca || 0), 0))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum item encontrado para esta guia.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Lista de guias agrupadas */
        <>
          {/* Cards de Resumo da Conciliação */}
          {resumoConciliados && (resumoConciliados.totalConciliados + resumoConciliados.totalDivergentes + resumoConciliados.totalNaoRecebidos + (resumoConciliados.totalTerceiros || 0)) > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Conciliados</p>
                        <p className="text-2xl font-bold">{resumoConciliados.totalConciliados}</p>
                        <p className="text-xs opacity-70">{formatarMoeda(resumoConciliados.valorTotalPago)}</p>
                      </div>
                      <CheckCircle2 className="w-10 h-10 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Divergentes</p>
                        <p className="text-2xl font-bold">{resumoConciliados.totalDivergentes}</p>
                        <p className="text-xs opacity-70">{formatarMoeda(resumoConciliados.valorTotalDiferenca)} diferença</p>
                      </div>
                      <AlertCircle className="w-10 h-10 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Não Recebidos</p>
                        <p className="text-2xl font-bold">{resumoConciliados.totalNaoRecebidos}</p>
                        <p className="text-xs opacity-70">Sem retorno do convênio</p>
                      </div>
                      <XCircle className="w-10 h-10 opacity-50" />
                    </div>
                  </CardContent>
                </Card>

                {(resumoConciliados.totalTerceiros || 0) > 0 && (
                  <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-80">Terceiros</p>
                          <p className="text-2xl font-bold">{resumoConciliados.totalTerceiros}</p>
                          <p className="text-xs opacity-70">Pago direto ao terceiro</p>
                        </div>
                        <ExternalLink className="w-10 h-10 opacity-50" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-80">Total Faturado</p>
                        <p className="text-2xl font-bold">{formatarMoeda(resumoConciliados.valorTotalFaturado)}</p>
                        <p className="text-xs opacity-70">Glosa: {formatarMoeda(resumoConciliados.valorTotalGlosa)}</p>
                      </div>
                      <DollarSign className="w-10 h-10 opacity-50" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Barra de progresso */}
              {(() => {
                const total = resumoConciliados.totalConciliados + resumoConciliados.totalDivergentes + resumoConciliados.totalNaoRecebidos + (resumoConciliados.totalTerceiros || 0);
                if (total === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="flex h-6 rounded-full overflow-hidden bg-muted">
                      {resumoConciliados.totalConciliados > 0 && (
                        <div className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${(resumoConciliados.totalConciliados / total) * 100}%` }}>
                          {((resumoConciliados.totalConciliados / total) * 100).toFixed(0)}%
                        </div>
                      )}
                      {resumoConciliados.totalDivergentes > 0 && (
                        <div className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${(resumoConciliados.totalDivergentes / total) * 100}%` }}>
                          {((resumoConciliados.totalDivergentes / total) * 100).toFixed(0)}%
                        </div>
                      )}
                      {resumoConciliados.totalNaoRecebidos > 0 && (
                        <div className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${(resumoConciliados.totalNaoRecebidos / total) * 100}%` }}>
                          {((resumoConciliados.totalNaoRecebidos / total) * 100).toFixed(0)}%
                        </div>
                      )}
                      {(resumoConciliados.totalTerceiros || 0) > 0 && (
                        <div className="bg-orange-500 flex items-center justify-center text-white text-xs font-medium"
                          style={{ width: `${((resumoConciliados.totalTerceiros || 0) / total) * 100}%` }}>
                          {(((resumoConciliados.totalTerceiros || 0) / total) * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Conciliado</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Divergente</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Não Recebido</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500 inline-block" /> Terceiro</span>
                    </div>
                  </div>
                );
              })()}
            </>
          ) : null}

          {/* Tabela de Guias Agrupadas */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">
                Guias Conciliadas ({dadosGuiasConciliadas?.total || 0})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={exportarConciliadosExcel} disabled={!guiasConciliadas.length}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingGuiasConciliadas ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : guiasConciliadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum resultado de conciliação encontrado.</p>
                  <p className="text-sm mt-2">Clique em "Conciliar Automaticamente" para executar o cruzamento.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Guia</th>
                          <th className="text-left p-3 font-medium max-w-[200px]">Paciente</th>
                          <th className="text-left p-3 font-medium">Comp.</th>
                          <th className="text-left p-3 font-medium">Lote</th>
                          <th className="text-left p-3 font-medium">Protocolo</th>
                          <th className="text-center p-3 font-medium">Itens</th>
                          <th className="text-right p-3 font-medium">Faturado</th>
                          <th className="text-right p-3 font-medium">Recebido</th>
                          <th className="text-right p-3 font-medium">Glosado</th>
                          <th className="text-right p-3 font-medium">Diferença</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-center p-3 font-medium">Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guiasConciliadas.map((guia: any, index: number) => (
                          <tr key={`${guia.guia}-${index}`} className={`border-b hover:bg-muted/50 cursor-pointer ${
                            guia.statusGuia === 'terceiro' ? 'bg-orange-50/50 dark:bg-orange-950/20' :
                            guia.statusGuia === 'divergente' ? 'bg-yellow-50/50 dark:bg-yellow-950/20' :
                            guia.statusGuia === 'nao_recebido' || guia.statusGuia === 'glosado' ? 'bg-red-50/50 dark:bg-red-950/20' : ''
                          }`} onClick={() => setGuiaConciliadaSelecionada(guia)}>
                            <td className="p-3 font-mono text-sm font-medium">{guia.guia || '-'}</td>
                            <td className="p-3 text-sm max-w-[200px] truncate" title={guia.pacienteNome}>
                              <span>{guia.pacienteNome || '-'}</span>
                              {Number(guia.totalContas) > 1 && (
                                <Badge variant="outline" className="ml-1 text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300">Alta Adm.</Badge>
                              )}
                              {Number(guia.itensAgrupados) > 0 && (
                                <Badge variant="outline" className="ml-1 text-[10px] bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-300">{guia.itensAgrupados} agrup.</Badge>
                              )}
                              {isTerceiro(guia) && (
                                <Badge variant="outline" className="ml-1 text-[10px] bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300">Terceiro</Badge>
                              )}
                            </td>
                            <td className="p-3 text-sm">{formatarCompetencia(guia.competencia)}</td>
                            <td className="p-3 text-sm font-mono">
                              {guia.loteXml || guia.loteRetorno || '-'}
                            </td>
                            <td className="p-3 text-sm font-mono">
                              {guia.protocoloXml || guia.protocoloRetorno || '-'}
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-sm">{guia.totalItens}</span>
                              {(Number(guia.itensDivergentes) > 0 || Number(guia.itensNaoRecebidos) > 0 || Number(guia.itensTerceiros) > 0 || Number(guia.itensGlosados) > 0) && (
                                <div className="flex gap-1 justify-center mt-0.5">
                                  {Number(guia.itensConciliados) > 0 && <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title={`${guia.itensConciliados} OK`} />}
                                  {Number(guia.itensDivergentes) > 0 && <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" title={`${guia.itensDivergentes} div.`} />}
                                  {Number(guia.itensNaoRecebidos) > 0 && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title={`${guia.itensNaoRecebidos} N/R`} />}
                                  {Number(guia.itensTerceiros) > 0 && <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" title={`${guia.itensTerceiros} terceiro(s)`} />}
                                  {Number(guia.itensGlosados) > 0 && <span className="w-2 h-2 rounded-full bg-red-700 inline-block" title={`${guia.itensGlosados} glosado(s)`} />}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right font-medium text-blue-600">{formatarMoeda(Number(guia.valorFaturado))}</td>
                            <td className="p-3 text-right font-medium text-green-600">{formatarMoeda(Number(guia.valorPago))}</td>
                            <td className="p-3 text-right font-medium text-red-600">{formatarMoeda(Number(guia.valorGlosa))}</td>
                            <td className={`p-3 text-right font-medium ${Number(guia.diferenca) > 0 ? 'text-red-600' : Number(guia.diferenca) < 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                              {Number(guia.diferenca) !== 0 ? formatarMoeda(Number(guia.diferenca)) : '-'}
                            </td>
                            <td className="p-3 text-center">{getStatusBadge(guia.statusGuia)}</td>
                            <td className="p-3 text-center">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setGuiaConciliadaSelecionada(guia); }}>
                                <Eye className="w-4 h-4 mr-1" />
                                <ChevronRight className="w-3 h-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {totalPaginasConciliados > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {paginaConciliados + 1} de {totalPaginasConciliados} ({dadosGuiasConciliadas?.total} guias)
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPaginaConciliados(p => Math.max(0, p - 1))} disabled={paginaConciliados === 0}>
                          Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPaginaConciliados(p => Math.min(totalPaginasConciliados - 1, p + 1))} disabled={paginaConciliados >= totalPaginasConciliados - 1}>
                          Próxima
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
