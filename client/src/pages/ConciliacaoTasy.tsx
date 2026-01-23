import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  FileSearch, 
  Download, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Database,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  DollarSign,
  FileText,
  Search
} from "lucide-react";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";

// Interface para item de conciliação
interface ItemConciliacao {
  guia: string;
  atendimento: string;
  paciente: string;
  medico: string;
  setor: string;
  codigo: string;
  descricao: string;
  valorTasy: number;
  valorXmlInformado: number;
  valorXmlLiberado: number;
  diferenca: number;
  motivoGlosa: string;
  codigoGlosa: string;
  status: 'ok' | 'glosa' | 'divergencia' | 'nao_encontrado';
}

export default function ConciliacaoTasy() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [convenioId, setConvenioId] = useState<string>("");
  const [arquivoId, setArquivoId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [conciliando, setConciliando] = useState(false);
  const pageSize = 50;

  // Buscar convênios
  const { data: convenios } = trpc.convenios.list.useQuery({});

  // Buscar arquivos do convênio selecionado (apenas XMLs de retorno)
  const { data: arquivos } = trpc.arquivos.list.useQuery(
    { 
      convenioId: convenioId ? parseInt(convenioId) : undefined,
      direcao: 'retornado' // Filtrar apenas arquivos de retorno
    },
    { enabled: true }
  );

  // Buscar dados do Tasy para conciliação
  const { data: dadosTasy, isLoading: loadingTasy } = trpc.importacaoTasy.dados.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      limite: 10000,
    },
    { enabled: !!estabelecimentoAtual }
  );

  // Buscar procedimentos do arquivo XML selecionado
  const { data: procedimentosXML, isLoading: loadingXML } = trpc.procedimentos.list.useQuery(
    {
      arquivoId: arquivoId ? parseInt(arquivoId) : undefined,
      estabelecimentoId: estabelecimentoAtual?.id,
      page: 1,
      pageSize: 10000,
    },
    { enabled: !!arquivoId && !!estabelecimentoAtual }
  );

  // Realizar conciliação entre Tasy e XML
  const itensConciliacao = useMemo(() => {
    if (!dadosTasy || !procedimentosXML?.items) return [];

    const itens: ItemConciliacao[] = [];
    const tasyPorGuia = new Map<string, any[]>();

    // Agrupar dados do Tasy por guia
    for (const item of dadosTasy) {
      const guia = item.guia || '';
      if (!tasyPorGuia.has(guia)) {
        tasyPorGuia.set(guia, []);
      }
      tasyPorGuia.get(guia)!.push(item);
    }

    // Processar cada item do XML
    for (const procXML of procedimentosXML.items) {
      const guia = procXML.guiaNumero || '';
      const itensTasy = tasyPorGuia.get(guia) || [];
      
      // Buscar item correspondente no Tasy pelo código
      const itemTasy = itensTasy.find(t => 
        t.codigo === procXML.codigo || 
        t.codigoConvenio === procXML.codigo
      );

      const valorTasy = itemTasy ? parseFloat(itemTasy.valorTotal || '0') : 0;
      const dadosExtras = procXML.dadosExtras as Record<string, unknown> | undefined;
      const valorXmlInformado = parseFloat(String(dadosExtras?.valorInformado || procXML.valorTotal || '0'));
      const valorXmlLiberado = parseFloat(String(dadosExtras?.valorLiberado || procXML.valorTotal || '0'));
      const diferenca = valorTasy - valorXmlLiberado;
      const valorGlosado = parseFloat(procXML.valorGlosado || '0');
      const motivoGlosa = procXML.motivoGlosa || '';
      const codigoGlosa = String(dadosExtras?.codigoGlosa || '');

      // Determinar status
      let status: ItemConciliacao['status'] = 'ok';
      if (!itemTasy) {
        status = 'nao_encontrado';
      } else if (valorGlosado > 0 || motivoGlosa) {
        status = 'glosa';
      } else if (Math.abs(diferenca) > 0.01) {
        status = 'divergencia';
      }

      itens.push({
        guia,
        atendimento: itemTasy?.atendimento || String(dadosExtras?.atendimento || '-'),
        paciente: itemTasy?.paciente || procXML.pacienteNome || '-',
        medico: itemTasy?.medico || procXML.nomeMedico || '-',
        setor: itemTasy?.setor || '-',
        codigo: procXML.codigo || '-',
        descricao: procXML.descricao || itemTasy?.descricao || '-',
        valorTasy,
        valorXmlInformado,
        valorXmlLiberado,
        diferenca,
        motivoGlosa,
        codigoGlosa: String(codigoGlosa),
        status,
      });
    }

    return itens;
  }, [dadosTasy, procedimentosXML]);

  // Filtrar itens
  const itensFiltrados = useMemo(() => {
    let filtrados = [...itensConciliacao];

    // Filtrar por status
    if (statusFiltro !== 'all') {
      filtrados = filtrados.filter(i => i.status === statusFiltro);
    }

    // Filtrar por busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      filtrados = filtrados.filter(i => 
        i.guia.toLowerCase().includes(termo) ||
        i.paciente.toLowerCase().includes(termo) ||
        i.codigo.toLowerCase().includes(termo) ||
        i.descricao.toLowerCase().includes(termo)
      );
    }

    return filtrados;
  }, [itensConciliacao, statusFiltro, searchTerm]);

  // Paginação
  const totalItens = itensFiltrados.length;
  const totalPages = Math.ceil(totalItens / pageSize);
  const itensPaginados = itensFiltrados.slice((page - 1) * pageSize, page * pageSize);

  // Estatísticas
  const estatisticas = useMemo(() => {
    const total = itensConciliacao.length;
    const ok = itensConciliacao.filter(i => i.status === 'ok').length;
    const glosas = itensConciliacao.filter(i => i.status === 'glosa').length;
    const divergencias = itensConciliacao.filter(i => i.status === 'divergencia').length;
    const naoEncontrados = itensConciliacao.filter(i => i.status === 'nao_encontrado').length;
    
    const valorTotalTasy = itensConciliacao.reduce((acc, i) => acc + i.valorTasy, 0);
    const valorTotalXmlInformado = itensConciliacao.reduce((acc, i) => acc + i.valorXmlInformado, 0);
    const valorTotalXmlLiberado = itensConciliacao.reduce((acc, i) => acc + i.valorXmlLiberado, 0);
    const valorTotalGlosado = valorTotalXmlInformado - valorTotalXmlLiberado;
    const valorTotalDiferenca = valorTotalTasy - valorTotalXmlLiberado;

    return {
      total,
      ok,
      glosas,
      divergencias,
      naoEncontrados,
      valorTotalTasy,
      valorTotalXmlInformado,
      valorTotalXmlLiberado,
      valorTotalGlosado,
      valorTotalDiferenca,
      percentualGlosa: valorTotalXmlInformado > 0 ? (valorTotalGlosado / valorTotalXmlInformado) * 100 : 0,
    };
  }, [itensConciliacao]);

  const handleExportExcel = () => {
    if (!itensFiltrados.length) return;

    const excelData = itensFiltrados.map((item) => ({
      "Guia": item.guia,
      "Atendimento": item.atendimento,
      "Paciente": item.paciente,
      "Médico": item.medico,
      "Setor": item.setor,
      "Código": item.codigo,
      "Descrição": item.descricao,
      "Valor Tasy": item.valorTasy,
      "Valor XML Informado": item.valorXmlInformado,
      "Valor XML Liberado": item.valorXmlLiberado,
      "Diferença": item.diferenca,
      "Código Glosa": item.codigoGlosa,
      "Motivo Glosa": item.motivoGlosa,
      "Status": item.status === 'ok' ? 'OK' : 
                item.status === 'glosa' ? 'GLOSA' : 
                item.status === 'divergencia' ? 'DIVERGÊNCIA' : 'NÃO ENCONTRADO',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = [
      { wch: 15 },  // Guia
      { wch: 15 },  // Atendimento
      { wch: 30 },  // Paciente
      { wch: 25 },  // Médico
      { wch: 20 },  // Setor
      { wch: 15 },  // Código
      { wch: 40 },  // Descrição
      { wch: 15 },  // Valor Tasy
      { wch: 18 },  // Valor XML Informado
      { wch: 18 },  // Valor XML Liberado
      { wch: 15 },  // Diferença
      { wch: 15 },  // Código Glosa
      { wch: 40 },  // Motivo Glosa
      { wch: 15 },  // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Conciliação");
    XLSX.writeFile(wb, `conciliacao_tasy_xml_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getStatusBadge = (status: ItemConciliacao['status']) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />OK</Badge>;
      case 'glosa':
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Glosa</Badge>;
      case 'divergencia':
        return <Badge className="bg-yellow-100 text-yellow-700"><AlertTriangle className="h-3 w-3 mr-1" />Divergência</Badge>;
      case 'nao_encontrado':
        return <Badge className="bg-gray-100 text-gray-700"><Search className="h-3 w-3 mr-1" />Não Encontrado</Badge>;
    }
  };

  const isLoading = loadingTasy || loadingXML;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="h-8 w-8" />
              Conciliação Tasy x XML
            </h1>
            <p className="text-muted-foreground">
              Compare os dados faturados no Tasy com os retornos dos convênios
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button onClick={handleExportExcel} disabled={!itensFiltrados.length}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Seleção de Arquivo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Selecione o Arquivo de Retorno
            </CardTitle>
            <CardDescription>
              Escolha o convênio e o arquivo XML de retorno para conciliar com os dados do Tasy
            </CardDescription>
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
                    <SelectValue placeholder="Selecione o convênio" />
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
                <label className="text-sm font-medium">Arquivo de Retorno</label>
                <Select value={arquivoId} onValueChange={(value) => {
                  setArquivoId(value === "all" ? "" : value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o arquivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Selecione um arquivo</SelectItem>
                    {arquivos?.map((a: any) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Filtrar por Status</label>
                <Select value={statusFiltro} onValueChange={(value) => {
                  setStatusFiltro(value);
                  setPage(1);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ok">OK</SelectItem>
                    <SelectItem value="glosa">Glosas</SelectItem>
                    <SelectItem value="divergencia">Divergências</SelectItem>
                    <SelectItem value="nao_encontrado">Não Encontrados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <Input
                  placeholder="Guia, paciente, código..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        {arquivoId && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">{estatisticas.total}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Total de Itens</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div className="text-2xl font-bold text-green-600">{estatisticas.ok}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Itens OK</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <div className="text-2xl font-bold text-red-600">{estatisticas.glosas}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Glosas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <div className="text-2xl font-bold text-yellow-600">{estatisticas.divergencias}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Divergências</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-gray-500" />
                    <div className="text-2xl font-bold text-gray-600">{estatisticas.naoEncontrados}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Não Encontrados</p>
                </CardContent>
              </Card>
            </div>

            {/* Resumo de Valores */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div className="text-xl font-bold">{formatCurrency(estatisticas.valorTotalTasy)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Valor Total Tasy</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div className="text-xl font-bold">{formatCurrency(estatisticas.valorTotalXmlInformado)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Valor Informado (XML)</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <div className="text-xl font-bold text-green-600">{formatCurrency(estatisticas.valorTotalXmlLiberado)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Valor Liberado (XML)</p>
                </CardContent>
              </Card>
              <Card className={estatisticas.valorTotalGlosado > 0 ? "border-red-200 bg-red-50" : ""}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <div className="text-xl font-bold text-red-600">{formatCurrency(estatisticas.valorTotalGlosado)}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor Glosado ({estatisticas.percentualGlosa.toFixed(1)}%)
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Alerta de Divergência */}
            {estatisticas.valorTotalDiferenca !== 0 && (
              <Alert variant={estatisticas.valorTotalDiferenca > 0 ? "default" : "destructive"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Divergência Detectada</AlertTitle>
                <AlertDescription>
                  {estatisticas.valorTotalDiferenca > 0 
                    ? `O valor faturado no Tasy é ${formatCurrency(estatisticas.valorTotalDiferenca)} maior que o valor liberado pelo convênio.`
                    : `O valor liberado pelo convênio é ${formatCurrency(Math.abs(estatisticas.valorTotalDiferenca))} maior que o valor faturado no Tasy.`
                  }
                </AlertDescription>
              </Alert>
            )}

            {/* Tabela de Conciliação */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5" />
                  Resultado da Conciliação
                </CardTitle>
                <CardDescription>
                  Itens com diferença maior que zero estão destacados em vermelho
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : itensPaginados.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {arquivoId ? "Nenhum item encontrado para conciliação" : "Selecione um arquivo de retorno para iniciar a conciliação"}
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Guia</TableHead>
                            <TableHead>Atendimento</TableHead>
                            <TableHead>Paciente</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor Tasy</TableHead>
                            <TableHead className="text-right">Valor Informado</TableHead>
                            <TableHead className="text-right">Valor Liberado</TableHead>
                            <TableHead className="text-right">Diferença</TableHead>
                            <TableHead>Motivo Glosa</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {itensPaginados.map((item, index) => (
                            <TableRow 
                              key={`${item.guia}-${item.codigo}-${index}`}
                              className={item.diferenca > 0.01 ? "bg-red-50" : ""}
                            >
                              <TableCell className="font-mono font-medium">
                                {item.guia}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {item.atendimento}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate" title={item.paciente}>
                                {item.paciente}
                              </TableCell>
                              <TableCell className="font-mono">
                                {item.codigo}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={item.descricao}>
                                {item.descricao}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.valorTasy)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.valorXmlInformado)}
                              </TableCell>
                              <TableCell className="text-right text-green-600 font-medium">
                                {formatCurrency(item.valorXmlLiberado)}
                              </TableCell>
                              <TableCell className={`text-right font-bold ${item.diferenca > 0.01 ? 'text-red-600' : item.diferenca < -0.01 ? 'text-yellow-600' : ''}`}>
                                {formatCurrency(item.diferenca)}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate text-xs text-red-600" title={item.motivoGlosa}>
                                {item.motivoGlosa || '-'}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(item.status)}
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
                          Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalItens)} de {totalItens} itens
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            Página {page} de {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
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

        {/* Mensagem quando não há arquivo selecionado */}
        {!arquivoId && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Selecione um arquivo de retorno</h3>
                <p className="text-sm">
                  Escolha um convênio e um arquivo XML de retorno para iniciar a conciliação com os dados do Tasy.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
