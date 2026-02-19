import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PadraoRecebimento {
  codigoItem: string;
  descricaoItem: string;
  totalFaturado: number;
  totalRecebido: number;
  totalGlosado: number;
  taxaGlosa: number;
  taxaRecebimento: number;
  valorMedioFaturado: number;
  valorMedioRecebido: number;
  valorMedioGlosado: number;
  motivosGlosaFrequentes: Array<{
    codigo: string;
    descricao: string;
    frequencia: number;
    percentual: number;
  }>;
  risco: "baixo" | "medio" | "alto" | "critico";
}

interface ItemRisco {
  codigoItem: string;
  descricaoItem: string;
  quantidade: number;
  valorFaturado: number;
  riscoPrevisto: "baixo" | "medio" | "alto" | "critico";
  taxaGlosaEsperada: number;
  motivosGlosaProvaveis: string[];
}

interface AnaliseRiscoConta {
  numeroGuia: string;
  convenioId: number;
  valorFaturado: number;
  itens: ItemRisco[];
  riscoConta: "baixo" | "medio" | "alto" | "critico";
  scoreRisco: number;
  motivosAlerta: string[];
}

export function PrevisaoGlosa() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<number | null>(null);
  const [convenioId, setConvenioId] = useState<number | null>(null);
  const [mesesHistorico, setMesesHistorico] = useState(12);
  const [numeroGuia, setNumeroGuia] = useState("");
  const [arquivoId, setArquivoId] = useState<number | null>(null);
  const [limiteRisco, setLimiteRisco] = useState<"alto" | "critico">("alto");

  // Queries
  const padroesMutation = trpc.motorRegras.analisarPadroesRecebimento.useQuery(
    {
      estabelecimentoId: estabelecimentoId || 0,
      convenioId: convenioId || undefined,
      mesesHistorico,
    },
    { enabled: !!estabelecimentoId }
  );

  const riscoConta = trpc.motorRegras.analisarRiscoConta.useQuery(
    {
      estabelecimentoId: estabelecimentoId || 0,
      convenioId: convenioId || 0,
      numeroGuia,
      itens: [],
      mesesHistorico,
    },
    { enabled: !!estabelecimentoId && !!convenioId && numeroGuia.length > 0 }
  );

  const contasComRisco = trpc.motorRegras.identificarContasComRisco.useQuery(
    {
      estabelecimentoId: estabelecimentoId || 0,
      convenioId: convenioId || 0,
      arquivoId: arquivoId || 0,
      limiteRisco,
    },
    { enabled: !!estabelecimentoId && !!convenioId && !!arquivoId }
  );

  const getRiscoBadgeColor = (risco: string) => {
    switch (risco) {
      case "critico":
        return "bg-red-600 text-white";
      case "alto":
        return "bg-orange-500 text-white";
      case "medio":
        return "bg-yellow-500 text-white";
      case "baixo":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getRiscoIcon = (risco: string) => {
    switch (risco) {
      case "critico":
      case "alto":
        return <AlertTriangle className="w-4 h-4" />;
      case "medio":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <TrendingUp className="w-4 h-4" />;
    }
  };

  // Dados para gráficos
  const dadosPadroes = padroesMutation.data?.padroes || [];
  const distribuicaoRisco = [
    { name: "Crítico", value: dadosPadroes.filter((p) => p.risco === "critico").length },
    { name: "Alto", value: dadosPadroes.filter((p) => p.risco === "alto").length },
    { name: "Médio", value: dadosPadroes.filter((p) => p.risco === "medio").length },
    { name: "Baixo", value: dadosPadroes.filter((p) => p.risco === "baixo").length },
  ];

  const coresPizza = ["#dc2626", "#f97316", "#eab308", "#22c55e"];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Previsão de Risco de Glosa</h1>
          <p className="text-gray-600 mt-2">
            Analise padrões de recebimento e identifique contas com risco de glosa
          </p>
        </div>

        {/* SEÇÃO 1: PADRÕES DE RECEBIMENTO */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Padrões de Recebimento
            </CardTitle>
            <CardDescription>
              Análise de taxa de glosa por item baseada em histórico de faturamento e recebimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Convênio</label>
                <Select value={convenioId?.toString() || ""} onValueChange={(v) => setConvenioId(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Unimed</SelectItem>
                    <SelectItem value="2">Bradesco Saúde</SelectItem>
                    <SelectItem value="3">Amil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Período (meses)</label>
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={mesesHistorico}
                  onChange={(e) => setMesesHistorico(parseInt(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => padroesMutation.refetch()}
                  disabled={!convenioId || padroesMutation.isLoading}
                  className="w-full"
                >
                  {padroesMutation.isLoading ? "Analisando..." : "Analisar Padrões"}
                </Button>
              </div>
            </div>

            {padroesMutation.data && (
              <div className="space-y-4">
                {/* Gráfico de Distribuição de Risco */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold mb-4">Distribuição de Risco</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distribuicaoRisco}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {coresPizza.map((cor, index) => (
                            <Cell key={`cell-${index}`} fill={cor} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-4 rounded-lg border">
                    <h3 className="font-semibold mb-4">Taxa de Glosa por Item</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dadosPadroes.slice(0, 5)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="codigoItem" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="taxaGlosa" fill="#f97316" name="Taxa Glosa (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tabela de Padrões */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Código</th>
                        <th className="px-4 py-2 text-left">Descrição</th>
                        <th className="px-4 py-2 text-right">Taxa Glosa</th>
                        <th className="px-4 py-2 text-right">Total Faturado</th>
                        <th className="px-4 py-2 text-right">Total Glosado</th>
                        <th className="px-4 py-2">Risco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosPadroes.map((padrao) => (
                        <tr key={padrao.codigoItem} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono">{padrao.codigoItem}</td>
                          <td className="px-4 py-2 text-gray-700">{padrao.descricaoItem}</td>
                          <td className="px-4 py-2 text-right font-semibold">{padrao.taxaGlosa.toFixed(2)}%</td>
                          <td className="px-4 py-2 text-right">{padrao.totalFaturado}</td>
                          <td className="px-4 py-2 text-right text-red-600">{padrao.totalGlosado}</td>
                          <td className="px-4 py-2">
                            <Badge className={getRiscoBadgeColor(padrao.risco)}>
                              {getRiscoIcon(padrao.risco)}
                              <span className="ml-1">{padrao.risco.toUpperCase()}</span>
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 2: ANÁLISE DE CONTA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Análise de Risco de Conta
            </CardTitle>
            <CardDescription>Analise o risco de glosa de uma guia/conta específica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Número da Guia</label>
                <Input
                  placeholder="Ex: 12345678"
                  value={numeroGuia}
                  onChange={(e) => setNumeroGuia(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => riscoConta.refetch()}
                  disabled={!numeroGuia || riscoConta.isLoading}
                  className="w-full"
                >
                  {riscoConta.isLoading ? "Analisando..." : "Analisar Risco"}
                </Button>
              </div>
            </div>

            {riscoConta.data && (
              <div className="space-y-4">
                {/* Score de Risco */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-4xl font-bold text-blue-600">{riscoConta.data.scoreRisco}</div>
                        <div className="text-sm text-blue-700 mt-2">Score de Risco (0-100)</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`bg-gradient-to-br border-2 ${
                    riscoConta.data.riscoConta === "critico"
                      ? "from-red-50 to-red-100 border-red-300"
                      : riscoConta.data.riscoConta === "alto"
                      ? "from-orange-50 to-orange-100 border-orange-300"
                      : riscoConta.data.riscoConta === "medio"
                      ? "from-yellow-50 to-yellow-100 border-yellow-300"
                      : "from-green-50 to-green-100 border-green-300"
                  }`}>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Badge className={getRiscoBadgeColor(riscoConta.data.riscoConta)}>
                          {riscoConta.data.riscoConta.toUpperCase()}
                        </Badge>
                        <div className="text-sm text-gray-700 mt-2">Classificação</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {riscoConta.data.itens.length}
                        </div>
                        <div className="text-sm text-purple-700 mt-2">Itens Analisados</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Alertas */}
                {riscoConta.data.motivosAlerta.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-2">⚠️ Alertas</h4>
                    <ul className="space-y-1 text-red-800 text-sm">
                      {riscoConta.data.motivosAlerta.map((alerta, idx) => (
                        <li key={idx}>• {alerta}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tabela de Itens */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2 text-left">Código</th>
                        <th className="px-4 py-2 text-left">Descrição</th>
                        <th className="px-4 py-2 text-right">Qtd</th>
                        <th className="px-4 py-2 text-right">Valor</th>
                        <th className="px-4 py-2 text-right">Taxa Glosa</th>
                        <th className="px-4 py-2">Risco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riscoConta.data.itens.map((item) => (
                        <tr key={item.codigoItem} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono">{item.codigoItem}</td>
                          <td className="px-4 py-2 text-gray-700">{item.descricaoItem}</td>
                          <td className="px-4 py-2 text-right">{item.quantidade}</td>
                          <td className="px-4 py-2 text-right">R$ {item.valorFaturado.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-semibold">{item.taxaGlosaEsperada.toFixed(2)}%</td>
                          <td className="px-4 py-2">
                            <Badge className={getRiscoBadgeColor(item.riscoPrevisto)}>
                              {item.riscoPrevisto.toUpperCase()}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEÇÃO 3: CONTAS COM RISCO (PÓS-IMPORTAÇÃO) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Contas com Risco (Arquivo Importado)
            </CardTitle>
            <CardDescription>Identifique contas de risco em um arquivo XML recém-importado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">ID do Arquivo</label>
                <Input
                  type="number"
                  placeholder="Ex: 123"
                  value={arquivoId || ""}
                  onChange={(e) => setArquivoId(e.target.value ? parseInt(e.target.value) : null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Limite de Risco</label>
                <Select value={limiteRisco} onValueChange={(v) => setLimiteRisco(v as "alto" | "critico")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alto">Alto e Crítico</SelectItem>
                    <SelectItem value="critico">Apenas Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => contasComRisco.refetch()}
                  disabled={!arquivoId || contasComRisco.isLoading}
                  className="w-full"
                >
                  {contasComRisco.isLoading ? "Identificando..." : "Identificar Contas"}
                </Button>
              </div>
            </div>

            {contasComRisco.data && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-lg font-semibold text-blue-900">
                    {contasComRisco.data.total} conta(s) com risco identificada(s)
                  </div>
                </div>

                {contasComRisco.data.contas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left">Guia</th>
                          <th className="px-4 py-2 text-right">Score</th>
                          <th className="px-4 py-2">Classificação</th>
                          <th className="px-4 py-2 text-right">Valor</th>
                          <th className="px-4 py-2 text-right">Itens Risco</th>
                          <th className="px-4 py-2">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contasComRisco.data.contas.map((conta) => (
                          <tr key={conta.numeroGuia} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-mono">{conta.numeroGuia}</td>
                            <td className="px-4 py-2 text-right font-semibold">{conta.scoreRisco}/100</td>
                            <td className="px-4 py-2">
                              <Badge className={getRiscoBadgeColor(conta.riscoConta)}>
                                {conta.riscoConta.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right">R$ {conta.valorFaturado.toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">
                              {conta.itens.filter((i) => i.riscoPrevisto === "alto" || i.riscoPrevisto === "critico").length}
                            </td>
                            <td className="px-4 py-2">
                              <Button size="sm" variant="outline">
                                Revisar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma conta com risco encontrada neste arquivo
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
