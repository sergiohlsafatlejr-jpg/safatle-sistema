import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { trpc } from "@/lib/trpc";
import { useEstabelecimento } from "@/contexts/EstabelecimentoContext";
import { 
  FileSearch, 
  Download, 
  ArrowLeft,
  FileSpreadsheet,
  DollarSign,
  FileText,
  User,
  Hash,
  Stethoscope,
  Package,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  X
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import * as XLSX from "xlsx";

// Interface para item do Tasy
interface ItemTasy {
  id: number;
  atendimento: string;
  nrInternoConta: string | null;
  guia: string | null;
  convenio: string | null;
  paciente: string | null;
  dataFaturado: Date | string | null;
  dataConta: Date | string | null;
  codigo: string | null;
  codigoConvenio: string | null;
  descricao: string | null;
  quantidade: string | null;
  unidade: string | null;
  valorUnitario: string | null;
  valorTotal: string | null;
  setor: string | null;
  protocolo: string | null;
  statusProtocolo: string | null;
  tipo: 'MATERIAL' | 'HONORARIO';
  medico: string | null;
  funcaoMedico: string | null;
  crm: string | null;
  valorMedico: string | null;
}

type SortField = 'codigo' | 'descricao' | 'tipo' | 'quantidade' | 'valorUnitario' | 'valorTotal' | 'medico';
type SortDirection = 'asc' | 'desc';

export default function DetalheContaTasy() {
  const { user } = useAuth();
  const { estabelecimentoAtual } = useEstabelecimento();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/contas-tasy/:atendimento");
  const atendimento = params?.atendimento;

  // Estados para busca e filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("all");
  
  // Estados para ordenação
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Buscar dados do Tasy para este atendimento
  const { data: dadosTasy, isLoading } = trpc.importacaoTasy.dados.useQuery(
    {
      estabelecimentoId: estabelecimentoAtual?.id || 0,
      limite: 50000,
    },
    { enabled: !!estabelecimentoAtual && !!atendimento }
  );

  // Filtrar itens do atendimento específico
  const itensDaConta = useMemo(() => {
    if (!dadosTasy || !atendimento) return [];
    return dadosTasy.filter((item: any) => item.atendimento === atendimento);
  }, [dadosTasy, atendimento]);

  // Informações da conta
  const infoConta = useMemo(() => {
    if (!itensDaConta.length) return null;
    const primeiro = itensDaConta[0];
    return {
      atendimento: primeiro.atendimento || '-',
      nrInternoConta: primeiro.nrInternoConta || '-',
      guia: primeiro.guia || '-',
      convenio: primeiro.convenio || '-',
      paciente: primeiro.paciente || '-',
      dataFaturado: primeiro.dataFaturado,
      setor: primeiro.setor || '-',
      protocolo: primeiro.protocolo || '-',
      statusProtocolo: primeiro.statusProtocolo || '-',
    };
  }, [itensDaConta]);

  // Calcular totais
  const totais = useMemo(() => {
    let materiais = 0;
    let honorarios = 0;
    let valorMateriais = 0;
    let valorHonorarios = 0;
    let valorTotal = 0;

    for (const item of itensDaConta) {
      const valor = parseFloat(item.valorTotal || '0');
      valorTotal += valor;
      
      if (item.tipo === 'MATERIAL') {
        materiais++;
        valorMateriais += valor;
      } else {
        honorarios++;
        valorHonorarios += valor;
      }
    }

    return { materiais, honorarios, valorMateriais, valorHonorarios, valorTotal, total: itensDaConta.length };
  }, [itensDaConta]);

  // Filtrar e ordenar itens
  const itensFiltrados = useMemo(() => {
    let resultado = [...itensDaConta];

    // Aplicar filtro de tipo
    if (tipoFiltro !== 'all') {
      resultado = resultado.filter((item: any) => item.tipo === tipoFiltro);
    }

    // Aplicar busca
    if (searchTerm) {
      const termo = searchTerm.toLowerCase();
      resultado = resultado.filter((item: any) => 
        (item.codigo || '').toLowerCase().includes(termo) ||
        (item.codigoConvenio || '').toLowerCase().includes(termo) ||
        (item.descricao || '').toLowerCase().includes(termo) ||
        (item.medico || '').toLowerCase().includes(termo) ||
        (item.crm || '').toLowerCase().includes(termo)
      );
    }

    // Aplicar ordenação
    resultado.sort((a: any, b: any) => {
      let valorA: any;
      let valorB: any;

      switch (sortField) {
        case 'codigo':
          valorA = a.codigo || '';
          valorB = b.codigo || '';
          break;
        case 'descricao':
          valorA = a.descricao || '';
          valorB = b.descricao || '';
          break;
        case 'tipo':
          valorA = a.tipo || '';
          valorB = b.tipo || '';
          break;
        case 'quantidade':
          valorA = parseFloat(a.quantidade || '0');
          valorB = parseFloat(b.quantidade || '0');
          break;
        case 'valorUnitario':
          valorA = parseFloat(a.valorUnitario || '0');
          valorB = parseFloat(b.valorUnitario || '0');
          break;
        case 'valorTotal':
          valorA = parseFloat(a.valorTotal || '0');
          valorB = parseFloat(b.valorTotal || '0');
          break;
        case 'medico':
          valorA = a.medico || '';
          valorB = b.medico || '';
          break;
        default:
          valorA = a.codigo || '';
          valorB = b.codigo || '';
      }

      if (typeof valorA === 'string') {
        const comparacao = valorA.localeCompare(valorB);
        return sortDirection === 'asc' ? comparacao : -comparacao;
      } else {
        return sortDirection === 'asc' ? valorA - valorB : valorB - valorA;
      }
    });

    return resultado;
  }, [itensDaConta, tipoFiltro, searchTerm, sortField, sortDirection]);

  // Função para alternar ordenação
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ícone de ordenação
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 text-primary" />
      : <ArrowDown className="h-4 w-4 ml-1 text-primary" />;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Exportar para Excel
  const handleExportExcel = () => {
    if (!itensFiltrados.length) return;

    const excelData = itensFiltrados.map((item: any) => ({
      "Código": item.codigo || '-',
      "Código Convênio": item.codigoConvenio || '-',
      "Descrição": item.descricao || '-',
      "Tipo": item.tipo,
      "Quantidade": item.quantidade || 1,
      "Unidade": item.unidade || '-',
      "Valor Unitário": parseFloat(item.valorUnitario || '0'),
      "Valor Total": parseFloat(item.valorTotal || '0'),
      "Médico": item.medico || '-',
      "CRM": item.crm || '-',
      "Função": item.funcaoMedico || '-',
      "Setor": item.setor || '-',
      "Data Conta": item.dataConta ? formatDate(item.dataConta) : '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    ws["!cols"] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 50 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Itens da Conta");
    XLSX.writeFile(wb, `conta_${atendimento}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (!estabelecimentoAtual) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground">Selecione um estabelecimento para continuar</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setLocation('/contas-tasy')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <FileSearch className="h-8 w-8 text-primary" />
                Detalhes da Conta
              </h1>
              <p className="text-muted-foreground">
                Atendimento: <span className="font-mono font-bold text-primary">{atendimento}</span>
              </p>
            </div>
          </div>
          <Button onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : !infoConta ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-xl">Conta não encontrada</p>
            <Button variant="outline" className="mt-4" onClick={() => setLocation('/contas-tasy')}>
              Voltar para Contas Tasy
            </Button>
          </div>
        ) : (
          <>
            {/* Informações da Conta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informações da Conta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Paciente
                    </p>
                    <p className="text-lg font-semibold">{infoConta.paciente}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Convênio
                    </p>
                    <p className="text-lg font-semibold">{infoConta.convenio}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Guia
                    </p>
                    <p className="text-lg font-mono font-semibold">{infoConta.guia}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Nr Interno Conta
                    </p>
                    <p className="text-lg font-mono font-semibold">{infoConta.nrInternoConta}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Data Faturado</p>
                    <p className="text-lg font-semibold">{formatDate(infoConta.dataFaturado)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Setor</p>
                    <p className="text-lg font-semibold">{infoConta.setor}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Protocolo</p>
                    <p className="text-lg font-mono font-semibold">{infoConta.protocolo}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-lg font-semibold">{infoConta.statusProtocolo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-4xl font-bold">{totais.total}</div>
                  <p className="text-sm text-muted-foreground mt-2">Total de Itens</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-4xl font-bold text-blue-600">{totais.materiais}</div>
                  <p className="text-sm text-blue-600/70 mt-2">Materiais</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-4xl font-bold text-purple-600">{totais.honorarios}</div>
                  <p className="text-sm text-purple-600/70 mt-2">Honorários</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-xl font-bold text-blue-600">{formatCurrency(totais.valorMateriais)}</div>
                  <p className="text-sm text-blue-600/70 mt-2">Valor Materiais</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-xl font-bold text-purple-600">{formatCurrency(totais.valorHonorarios)}</div>
                  <p className="text-sm text-purple-600/70 mt-2">Valor Honorários</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="text-xl font-bold text-green-600">{formatCurrency(totais.valorTotal)}</div>
                  <p className="text-sm text-green-600/70 mt-2">Valor Total</p>
                </CardContent>
              </Card>
            </div>

            {/* Filtros e Busca */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens da Conta
                  <Badge variant="secondary" className="ml-2">
                    {itensFiltrados.length} itens
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Lista completa de materiais e honorários desta conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Barra de Filtros */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por código, descrição, médico ou CRM..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {searchTerm && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchTerm("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Tipos</SelectItem>
                        <SelectItem value="MATERIAL">Materiais</SelectItem>
                        <SelectItem value="HONORARIO">Honorários</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tabela de Itens */}
                <div className="rounded-xl border overflow-hidden">
                  <div className="max-h-[600px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
                        <TableRow className="hover:bg-transparent">
                          <TableHead 
                            className="font-bold cursor-pointer select-none"
                            onClick={() => toggleSort('codigo')}
                          >
                            <div className="flex items-center">
                              Código
                              <SortIcon field="codigo" />
                            </div>
                          </TableHead>
                          <TableHead>Cód. Convênio</TableHead>
                          <TableHead 
                            className="font-bold cursor-pointer select-none min-w-[300px]"
                            onClick={() => toggleSort('descricao')}
                          >
                            <div className="flex items-center">
                              Descrição
                              <SortIcon field="descricao" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-bold cursor-pointer select-none"
                            onClick={() => toggleSort('tipo')}
                          >
                            <div className="flex items-center">
                              Tipo
                              <SortIcon field="tipo" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-bold cursor-pointer select-none text-right"
                            onClick={() => toggleSort('quantidade')}
                          >
                            <div className="flex items-center justify-end">
                              Qtd
                              <SortIcon field="quantidade" />
                            </div>
                          </TableHead>
                          <TableHead>Unid.</TableHead>
                          <TableHead 
                            className="font-bold cursor-pointer select-none text-right"
                            onClick={() => toggleSort('valorUnitario')}
                          >
                            <div className="flex items-center justify-end">
                              Valor Unit.
                              <SortIcon field="valorUnitario" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-bold cursor-pointer select-none text-right"
                            onClick={() => toggleSort('valorTotal')}
                          >
                            <div className="flex items-center justify-end">
                              Valor Total
                              <SortIcon field="valorTotal" />
                            </div>
                          </TableHead>
                          <TableHead 
                            className="font-bold cursor-pointer select-none min-w-[180px]"
                            onClick={() => toggleSort('medico')}
                          >
                            <div className="flex items-center">
                              Médico
                              <SortIcon field="medico" />
                            </div>
                          </TableHead>
                          <TableHead>CRM</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensFiltrados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                              Nenhum item encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          itensFiltrados.map((item: any, index: number) => (
                            <TableRow key={`${item.id}-${index}`} className="hover:bg-muted/50">
                              <TableCell className="font-mono">
                                {item.codigo || '-'}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {item.codigoConvenio || '-'}
                              </TableCell>
                              <TableCell title={item.descricao || ''}>
                                <span className="line-clamp-2">{item.descricao || '-'}</span>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={item.tipo === 'MATERIAL' ? 'default' : 'secondary'}
                                  className="text-sm"
                                >
                                  {item.tipo === 'MATERIAL' ? 'Material' : 'Honorário'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {item.quantidade || 1}
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.unidade || '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(parseFloat(item.valorUnitario || '0'))}
                              </TableCell>
                              <TableCell className="text-right font-bold text-green-600">
                                {formatCurrency(parseFloat(item.valorTotal || '0'))}
                              </TableCell>
                              <TableCell title={item.medico || ''}>
                                <span className="line-clamp-1">{item.medico || '-'}</span>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {item.crm || '-'}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
