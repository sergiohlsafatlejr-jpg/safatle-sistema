import { Ban, FileCode, CheckCircle2, DollarSign, CheckSquare, Clock, Package, FileDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AbaXmlRecursoProps {
  guiasGlosadas: any[];
  isLoadingGuiasGlosadas: boolean;
  xmlsGerados: any;
  isLoadingXmlsGerados: boolean;
  filtroPrestador: string;
  guiasSelecionadasXml: Set<string>;
  setGuiasSelecionadasXml: (val: Set<string>) => void;
  setModalXmlAberto: (val: boolean) => void;
  formatarMoeda: (valor: number) => string;
  formatarCompetencia: (comp: string) => string;
  formatDateTimeBR: (data: string) => string;
  isTerceiro: (guia: any) => boolean;
}

export function AbaXmlRecurso({
  guiasGlosadas,
  isLoadingGuiasGlosadas,
  xmlsGerados,
  isLoadingXmlsGerados,
  filtroPrestador,
  guiasSelecionadasXml,
  setGuiasSelecionadasXml,
  setModalXmlAberto,
  formatarMoeda,
  formatarCompetencia,
  formatDateTimeBR,
  isTerceiro
}: AbaXmlRecursoProps) {
  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
          <CardContent className="p-4 text-center">
            <Ban className="w-6 h-6 mx-auto text-purple-600 mb-1" />
            <p className="text-xs text-muted-foreground">Total de Guias</p>
            <p className="text-2xl font-bold text-purple-600">{guiasGlosadas?.length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200">
          <CardContent className="p-4 text-center">
            <FileCode className="w-6 h-6 mx-auto text-orange-600 mb-1" />
            <p className="text-xs text-muted-foreground">Pendentes XML</p>
            <p className="text-2xl font-bold text-orange-600">{guiasGlosadas?.filter((g: any) => !Number(g.xmlGerado)).length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-green-600 mb-1" />
            <p className="text-xs text-muted-foreground">XML Gerados</p>
            <p className="text-2xl font-bold text-green-600">{guiasGlosadas?.filter((g: any) => Number(g.xmlGerado)).length || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto text-blue-600 mb-1" />
            <p className="text-xs text-muted-foreground">Valor Total Faturado</p>
            <p className="text-lg font-bold text-blue-600">{formatarMoeda(guiasGlosadas?.reduce((sum: number, g: any) => sum + Number(g.valorFaturado || 0), 0) || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Ações em lote */}
      {guiasSelecionadasXml.size > 0 && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="font-medium">{guiasSelecionadasXml.size} guia(s) selecionada(s)</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setGuiasSelecionadasXml(new Set())}
              >
                Limpar Seleção
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setModalXmlAberto(true)}
              >
                <FileCode className="w-4 h-4 mr-2" />
                Gerar XML em Lote ({guiasSelecionadasXml.size} guias)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de guias glosadas */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ban className="w-5 h-5 text-purple-600" />
              Guias Disponíveis para XML
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const naoGeradas = guiasGlosadas?.filter((g: any) => !Number(g.xmlGerado)).map((g: any) => String(g.numeroGuia)) || [];
                  setGuiasSelecionadasXml(new Set(naoGeradas));
                }}
              >
                Selecionar Todas Pendentes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const todas = guiasGlosadas?.map((g: any) => String(g.numeroGuia)) || [];
                  setGuiasSelecionadasXml(new Set(todas));
                }}
              >
                Selecionar Todas
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingGuiasGlosadas ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : guiasGlosadas && guiasGlosadas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 w-10">
                      <Checkbox
                        checked={guiasSelecionadasXml.size > 0 && guiasSelecionadasXml.size === guiasGlosadas.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            const todas = guiasGlosadas.map((g: any) => String(g.numeroGuia));
                            setGuiasSelecionadasXml(new Set(todas));
                          } else {
                            setGuiasSelecionadasXml(new Set());
                          }
                        }}
                      />
                    </th>
                    <th className="text-left p-2 font-medium">Guia</th>
                    <th className="text-left p-2 font-medium">Convênio</th>
                    <th className="text-left p-2 font-medium">Competência</th>
                    <th className="text-left p-2 font-medium">Lote</th>
                    <th className="text-left p-2 font-medium">Protocolo</th>
                    <th className="text-center p-2 font-medium">Itens</th>
                    <th className="text-right p-2 font-medium">Valor Faturado</th>
                    <th className="text-right p-2 font-medium">Valor Recebido</th>
                    <th className="text-right p-2 font-medium">Valor Glosado</th>
                    <th className="text-center p-2 font-medium">XML</th>
                    <th className="text-center p-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {guiasGlosadas.filter((g: any) => {
                    if (filtroPrestador === 'todos') return true;
                    const terceiro = isTerceiro(g);
                    return filtroPrestador === 'terceiro' ? terceiro : !terceiro;
                  }).map((guia: any) => {
                    const xmlGerado = Number(guia.xmlGerado) > 0;
                    const guiaKey = String(guia.numeroGuia);
                    const terceiro = isTerceiro(guia);
                    return (
                      <tr key={guiaKey} className={`border-b hover:bg-muted/30 ${terceiro ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''} ${xmlGerado ? 'bg-green-50/50 dark:bg-green-950/20' : ''}`}>
                        <td className="p-2">
                          <Checkbox
                            checked={guiasSelecionadasXml.has(guiaKey)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(guiasSelecionadasXml);
                              if (checked) newSet.add(guiaKey);
                              else newSet.delete(guiaKey);
                              setGuiasSelecionadasXml(newSet);
                            }}
                          />
                        </td>
                        <td className="p-2 font-mono text-sm font-medium">
                          {guia.numeroGuia}
                          {terceiro && (
                            <Badge variant="outline" className="ml-1 text-[10px] bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-300">Terceiro</Badge>
                          )}
                        </td>
                        <td className="p-2 text-sm">{guia.convenio || '-'}</td>
                        <td className="p-2 text-sm">{formatarCompetencia(guia.competencia)}</td>
                        <td className="p-2 text-sm font-mono">{guia.loteXml || guia.loteRetorno || '-'}</td>
                        <td className="p-2 text-sm font-mono">{guia.protocoloXml || guia.protocoloRetorno || '-'}</td>
                        <td className="p-2 text-center">{guia.totalItens}</td>
                        <td className="p-2 text-right text-blue-600 font-medium">{formatarMoeda(Number(guia.valorFaturado))}</td>
                        <td className="p-2 text-right text-green-600 font-medium">{formatarMoeda(Number(guia.valorPago))}</td>
                        <td className="p-2 text-right text-red-600 font-medium">{formatarMoeda(Number(guia.valorGlosa))}</td>
                        <td className="p-2 text-center">
                          {xmlGerado ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Gerado
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <Clock className="w-3 h-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className={xmlGerado ? "text-blue-600 border-blue-300 hover:bg-blue-50" : "text-purple-600 border-purple-300 hover:bg-purple-50"}
                            onClick={() => {
                              setGuiasSelecionadasXml(new Set([guiaKey]));
                              setModalXmlAberto(true);
                            }}
                          >
                            <FileCode className="w-3 h-3 mr-1" />
                            {xmlGerado ? 'Regerar' : 'Gerar XML'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Ban className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma guia conciliada encontrada.</p>
              <p className="text-sm">Execute a conciliação automática primeiro.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de XMLs gerados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-green-600" />
            Histórico de XMLs Gerados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingXmlsGerados ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : xmlsGerados && xmlsGerados.registros.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Arquivo</th>
                    <th className="text-left p-2 font-medium">Convênio</th>
                    <th className="text-left p-2 font-medium">Tipo</th>
                    <th className="text-center p-2 font-medium">Guias</th>
                    <th className="text-center p-2 font-medium">Itens</th>
                    <th className="text-right p-2 font-medium">Valor Glosado</th>
                    <th className="text-left p-2 font-medium">Data Geração</th>
                    <th className="text-center p-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {xmlsGerados.registros.map((xml: any) => (
                    <tr key={xml.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 text-sm font-mono">{xml.nomeArquivo}</td>
                      <td className="p-2 text-sm">{xml.convenioNome || '-'}</td>
                      <td className="p-2">
                        <Badge variant="outline" className="text-xs">
                          {xml.tipo === 'lote' ? 'Lote' : 'Individual'}
                        </Badge>
                      </td>
                      <td className="p-2 text-center">{xml.totalGuias}</td>
                      <td className="p-2 text-center">{xml.totalItens}</td>
                      <td className="p-2 text-right text-red-600 font-medium">{formatarMoeda(Number(xml.valorTotalGlosado))}</td>
                      <td className="p-2 text-sm">{xml.createdAt ? formatDateTimeBR(xml.createdAt) : '-'}</td>
                      <td className="p-2 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (xml.xmlUrl) window.open(xml.xmlUrl, '_blank');
                          }}
                        >
                          <FileDown className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum XML gerado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
