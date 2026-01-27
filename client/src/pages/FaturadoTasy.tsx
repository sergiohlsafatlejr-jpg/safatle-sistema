import { useState, useCallback } from "react";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Search, Filter, TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart3, Download, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

export default function FaturadoTasy() {
  const { estabelecimentoAtual } = useEstabelecimento();
  const estabelecimentoId = estabelecimentoAtual?.id;
  const [activeTab, setActiveTab] = useState("visao-geral");
  const [filtroCompetencia, setFiltroCompetencia] = useState<string>("");
  const [filtroConvenio, setFiltroConvenio] = useState<string>("");
  const [filtroTipoItem, setFiltroTipoItem] = useState<string>("");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  // Queries
  const { data: estatisticas, isLoading: loadingEstatisticas, refetch: refetchEstatisticas } = trpc.faturadoTasy.estatisticas.useQuery(
    { estabelecimentoId: estabelecimentoId!, competencia: filtroCompetencia || undefined, convenio: filtroConvenio || undefined },
    { enabled: !!estabelecimentoId }
  );

  const { data: competencias } = trpc.faturadoTasy.competencias.useQuery(
    { estabelecimentoId: estabelecimentoId! },
    { enabled: !!estabelecimentoId }
  );

  const { data: convenios } = trpc.faturadoTasy.convenios.useQuery(
    { estabelecimentoId: estabelecimentoId! },
    { enabled: !!estabelecimentoId }
  );

  const { data: resumoPorTipo } = trpc.faturadoTasy.resumoPorTipo.useQuery(
    { estabelecimentoId: estabelecimentoId!, competencia: filtroCompetencia || undefined, convenio: filtroConvenio || undefined },
    { enabled: !!estabelecimentoId }
  );

  const { data: itensGlosados, isLoading: loadingGlosados } = trpc.faturadoTasy.itensGlosados.useQuery(
    { estabelecimentoId: estabelecimentoId!, competencia: filtroCompetencia || undefined, convenio: filtroConvenio || undefined, limite: 50 },
    { enabled: !!estabelecimentoId && activeTab === "glosas" }
  );

  const { data: dadosBI } = trpc.faturadoTasy.dadosBI.useQuery(
    { estabelecimentoId: estabelecimentoId!, competencia: filtroCompetencia || undefined, convenio: filtroConvenio || undefined },
    { enabled: !!estabelecimentoId && activeTab === "relatorio" }
  );

  const { data: todosItens } = trpc.faturadoTasy.list.useQuery(
    { 
      estabelecimentoId: estabelecimentoId!, 
      competencia: filtroCompetencia || undefined, 
      convenio: filtroConvenio || undefined,
      tipoItem: filtroTipoItem as any || undefined,
      descricao: filtroBusca || undefined,
      limite: 10000 // Para exportação
    },
    { enabled: !!estabelecimentoId }
  );

  const { data: listaItens, isLoading: loadingItens } = trpc.faturadoTasy.list.useQuery(
    { 
      estabelecimentoId: estabelecimentoId!, 
      competencia: filtroCompetencia || undefined, 
      convenio: filtroConvenio || undefined,
      tipoItem: filtroTipoItem as any || undefined,
      descricao: filtroBusca || undefined,
      limite: 100 
    },
    { enabled: !!estabelecimentoId && activeTab === "itens" }
  );

  // Mutations
  const importarMutation = trpc.faturadoTasy.importar.useMutation({
    onSuccess: (result) => {
      toast.success(`Importação concluída: ${result.inseridos} registros importados`);
      refetchEstatisticas();
    },
    onError: (error) => {
      toast.error(`Erro na importação: ${error.message}`);
    },
  });

  const criarImportacaoMutation = trpc.importacaoTasy.criar.useMutation();

  // Função de importação de Excel
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !estabelecimentoId) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Criar registro de importação
      const importacao = await criarImportacaoMutation.mutateAsync({
        estabelecimentoId,
        nomeArquivo: file.name,
        tamanhoArquivo: file.size,
      });

      setImportProgress(10);

      // Ler arquivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      setImportProgress(30);

      // Encontrar cabeçalho
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.some((cell: any) => 
          typeof cell === 'string' && 
          (cell.toLowerCase().includes('sequencia') || 
           cell.toLowerCase().includes('convenio') ||
           cell.toLowerCase().includes('competencia') ||
           cell.toLowerCase().includes('tipo_item'))
        )) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = jsonData[headerRowIndex] as string[];
      const dataRows = jsonData.slice(headerRowIndex + 1);

      setImportProgress(40);

      // Mapear colunas
      const colMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        if (!h) return;
        const normalized = String(h).toLowerCase().trim().replace(/\s+/g, '_');
        colMap[normalized] = i;
      });

      // Processar dados
      const registros: any[] = [];
      for (const row of dataRows) {
        if (!row || row.length === 0) continue;

        const getValue = (keys: string[]): string | undefined => {
          for (const key of keys) {
            if (colMap[key] !== undefined && row[colMap[key]] !== undefined && row[colMap[key]] !== null && row[colMap[key]] !== '') {
              return String(row[colMap[key]]);
            }
          }
          return undefined;
        };

        const getNumber = (keys: string[]): number | undefined => {
          const val = getValue(keys);
          if (!val) return undefined;
          const num = parseFloat(String(val).replace(/[^\d.,-]/g, '').replace(',', '.'));
          return isNaN(num) ? undefined : num;
        };

        const tipoItemRaw = getValue(['tipo_item', 'tipoitem', 'tipo']);
        let tipoItem: 'PROC/TAXA' | 'MAT/MED' = 'PROC/TAXA';
        if (tipoItemRaw) {
          const normalized = tipoItemRaw.toUpperCase();
          if (normalized.includes('MAT') || normalized.includes('MED')) {
            tipoItem = 'MAT/MED';
          }
        }

        registros.push({
          sequencia: getValue(['sequencia', 'seq', 'nr_sequencia']),
          convenio: getValue(['convenio', 'ds_convenio', 'nome_convenio']),
          competencia: getValue(['competencia', 'mes_ano', 'mesano', 'dt_competencia']),
          protocolo: getValue(['protocolo', 'nr_protocolo', 'num_protocolo']),
          setor: getValue(['setor', 'ds_setor', 'setor_atendimento']),
          atend: getValue(['atend', 'atendimento', 'nr_atendimento']),
          conta: getValue(['conta', 'nr_conta', 'num_conta']),
          profExec: getValue(['prof_exec', 'profexec', 'profissional_executor', 'medico']),
          cdMotivoExcConta: getValue(['cd_motivo_exc_conta', 'motivo_exclusao']),
          dsComplMotivoExcon: getValue(['ds_compl_motivo_excon', 'descricao_motivo']),
          tipoItem,
          cdItem: getValue(['cd_item', 'cditem', 'codigo_item', 'codigo']),
          cdItemTuss: getValue(['cd_item_tuss', 'cditemtuss', 'codigo_tuss', 'tuss']),
          dtItem: getValue(['dt_item', 'dtitem', 'data_item', 'data']),
          descricao: getValue(['descricao', 'ds_item', 'nome_item', 'ds_procedimento', 'ds_material']),
          qtd: getNumber(['qtd', 'quantidade', 'qt_item']),
          vlFaturado: getNumber(['vl_faturado', 'vlfaturado', 'valor_faturado', 'vl_total']),
          aReceber: getNumber(['a_receber', 'areceber', 'valor_a_receber']),
          vlPago: getNumber(['vl_pago', 'vlpago', 'valor_pago']),
          vlGlosa: getNumber(['vl_glosa', 'vlglosa', 'valor_glosa', 'glosa']),
          motivoGlosa: getValue(['motivo_glosa', 'motivoglosa', 'ds_motivo_glosa']),
          retorno: getValue(['retorno', 'nr_retorno', 'num_retorno']),
          dtPgto: getValue(['dt_pgto', 'dtpgto', 'data_pagamento', 'data_pgto']),
        });
      }

      setImportProgress(60);

      // Importar em lotes
      const BATCH_SIZE = 500;
      let totalImportados = 0;

      for (let i = 0; i < registros.length; i += BATCH_SIZE) {
        const batch = registros.slice(i, i + BATCH_SIZE);
        const result = await importarMutation.mutateAsync({
          estabelecimentoId,
          dados: batch,
          importacaoId: importacao.id,
        });
        totalImportados += result.inseridos;
        setImportProgress(60 + Math.round((i / registros.length) * 40));
      }

      setImportProgress(100);
      toast.success(`Importação concluída: ${totalImportados} registros importados de ${registros.length} processados`);

    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      event.target.value = '';
    }
  }, [estabelecimentoId, criarImportacaoMutation, importarMutation, refetchEstatisticas]);

  // Função de exportação Excel
  const handleExportExcel = useCallback(() => {
    if (!todosItens?.length) {
      toast.error('Não há dados para exportar');
      return;
    }

    try {
      const dadosExport = todosItens.map(item => ({
        'Sequência': item.sequencia || '',
        'Convênio': item.convenio || '',
        'Competência': item.competencia || '',
        'Protocolo': item.protocolo || '',
        'Setor': item.setor || '',
        'Atendimento': item.atend || '',
        'Conta': item.conta || '',
        'Profissional': item.profExec || '',
        'Tipo Item': item.tipoItem || '',
        'Código Item': item.cdItem || '',
        'Código TUSS': item.cdItemTuss || '',
        'Data Item': item.dtItem || '',
        'Descrição': item.descricao || '',
        'Quantidade': item.qtd || 0,
        'Valor Faturado': item.vlFaturado || 0,
        'A Receber': item.aReceber || 0,
        'Valor Pago': item.vlPago || 0,
        'Valor Glosa': item.vlGlosa || 0,
        'Motivo Glosa': item.motivoGlosa || '',
        'Retorno': item.retorno || '',
        'Data Pagamento': item.dtPgto || '',
      }));

      const ws = XLSX.utils.json_to_sheet(dadosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Faturado Tasy');
      
      // Ajustar largura das colunas
      const colWidths = Object.keys(dadosExport[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
      ws['!cols'] = colWidths;

      const fileName = `faturado_tasy_${filtroCompetencia || 'todos'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exportado ${todosItens.length} registros para ${fileName}`);
    } catch (error: any) {
      toast.error(`Erro na exportação: ${error.message}`);
    }
  }, [todosItens, filtroCompetencia]);

  // Formatadores
  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || value === null) return '0,00%';
    return `${value.toFixed(2)}%`;
  };

  if (!estabelecimentoId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione um estabelecimento para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Faturado Tasy</h1>
          <p className="text-muted-foreground">Importação e análise de dados de faturamento do Tasy</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={!todosItens?.length}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={() => refetchEstatisticas()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <Button asChild disabled={isImporting}>
              <span>
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? `Importando... ${importProgress}%` : 'Importar Excel'}
              </span>
            </Button>
          </Label>
          <Input
            id="file-upload"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isImporting}
          />
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Competência</Label>
              <Select value={filtroCompetencia || "__all__"} onValueChange={(v) => setFiltroCompetencia(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {competencias?.map((c) => (
                    <SelectItem key={c.competencia} value={c.competencia}>
                      {c.competencia} ({c.totalRegistros} itens)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Convênio</Label>
              <Select value={filtroConvenio || "__all__"} onValueChange={(v) => setFiltroConvenio(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {convenios?.map((c) => (
                    <SelectItem key={c.convenio} value={c.convenio}>
                      {c.convenio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de Item</Label>
              <Select value={filtroTipoItem || "__all__"} onValueChange={(v) => setFiltroTipoItem(v === "__all__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="PROC/TAXA">Procedimentos/Taxas</SelectItem>
                  <SelectItem value="MAT/MED">Materiais/Medicamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Descrição..."
                  value={filtroBusca}
                  onChange={(e) => setFiltroBusca(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Registros</span>
            </div>
            <p className="text-2xl font-bold mt-1">{estatisticas?.totalRegistros?.toLocaleString() || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Faturado</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(estatisticas?.valorFaturado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Pago</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(estatisticas?.valorPago)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Glosa</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(estatisticas?.valorGlosa)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">A Receber</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(estatisticas?.valorAReceber)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Convênios</span>
            </div>
            <p className="text-2xl font-bold mt-1">{estatisticas?.totalConvenios || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="itens">Itens</TabsTrigger>
          <TabsTrigger value="glosas">Glosas</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório BI</TabsTrigger>
        </TabsList>

        <TabsContent value="visao-geral" className="space-y-4">
          {/* Resumo por Tipo */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Tipo de Item</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="text-right">Faturado</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Glosa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumoPorTipo?.map((item) => (
                    <TableRow key={item.tipoItem}>
                      <TableCell>
                        <Badge variant={item.tipoItem === 'PROC/TAXA' ? 'default' : 'secondary'}>
                          {item.tipoItem}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.totalRegistros.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorFaturado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorPago)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(item.valorGlosa)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Resumo por Convênio */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo por Convênio</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Convênio</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="text-right">Faturado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {convenios?.slice(0, 10).map((item) => (
                    <TableRow key={item.convenio}>
                      <TableCell>{item.convenio}</TableCell>
                      <TableCell className="text-right">{item.totalRegistros.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.valorFaturado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itens">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Itens</CardTitle>
              <CardDescription>
                {loadingItens ? 'Carregando...' : `${listaItens?.length || 0} itens encontrados`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Faturado</TableHead>
                      <TableHead className="text-right">Pago</TableHead>
                      <TableHead className="text-right">Glosa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listaItens?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.competencia}</TableCell>
                        <TableCell>
                          <Badge variant={item.tipoItem === 'PROC/TAXA' ? 'default' : 'secondary'} className="text-xs">
                            {item.tipoItem}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.cdItem}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.descricao}>
                          {item.descricao}
                        </TableCell>
                        <TableCell className="text-right">{item.qtd}</TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(item.vlFaturado || '0'))}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(parseFloat(item.vlPago || '0'))}</TableCell>
                        <TableCell className="text-right text-red-600">{formatCurrency(parseFloat(item.vlGlosa || '0'))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="glosas">
          <Card>
            <CardHeader>
              <CardTitle>Itens Glosados</CardTitle>
              <CardDescription>
                {loadingGlosados ? 'Carregando...' : `${itensGlosados?.length || 0} itens com glosa`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competência</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Faturado</TableHead>
                      <TableHead className="text-right">Glosa</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensGlosados?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.competencia}</TableCell>
                        <TableCell className="font-mono text-xs">{item.cdItem}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.descricao}>
                          {item.descricao}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(parseFloat(item.vlFaturado || '0'))}</TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">
                          {formatCurrency(parseFloat(item.vlGlosa || '0'))}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.motivoGlosa}>
                          {item.motivoGlosa || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorio" className="space-y-4">
          {/* KPIs do Relatório */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Faturado</p>
                <p className="text-xl font-bold">{formatCurrency(dadosBI?.resumo.totalFaturado)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(dadosBI?.resumo.totalPago)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Total Glosa</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(dadosBI?.resumo.totalGlosa)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold">{formatCurrency(dadosBI?.resumo.ticketMedio)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Taxa de Glosa</p>
                <p className="text-xl font-bold text-orange-600">{formatPercent(dadosBI?.resumo.taxaGlosa)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela por Competência */}
          <Card>
            <CardHeader>
              <CardTitle>Análise por Competência</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="text-right">Faturado</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Glosa</TableHead>
                    <TableHead className="text-right">% Glosa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosBI?.porCompetencia.map((item) => (
                    <TableRow key={item.competencia}>
                      <TableCell className="font-medium">{item.competencia}</TableCell>
                      <TableCell className="text-right">{item.totalRegistros.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.totalFaturado)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(item.totalPago)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(item.totalGlosa)}</TableCell>
                      <TableCell className="text-right">
                        {item.totalFaturado > 0 ? formatPercent((item.totalGlosa / item.totalFaturado) * 100) : '0%'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
