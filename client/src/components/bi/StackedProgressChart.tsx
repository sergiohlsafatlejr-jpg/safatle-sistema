import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StackedProgressChartProps {
  data: Array<{
    chave: string;
    valorFaturado: number;
    valorRecebido: number;
    valorGlosado: number;
  }>;
}

const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function StackedProgressChart({ data }: StackedProgressChartProps) {
  // Sort by faturado descending
  const sorted = [...data]
    .filter((d) => d.valorFaturado > 0)
    .sort((a, b) => b.valorFaturado - a.valorFaturado)
    .slice(0, 8);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>Taxa de Recebimento por Convênio</CardTitle>
        <CardDescription>Proporção de valores recebidos vs glosados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {sorted.length > 0 ? (
          <>
            {sorted.map((item, idx) => {
              const taxaRecebido = item.valorFaturado > 0
                ? (item.valorRecebido / item.valorFaturado) * 100
                : 0;
              const taxaGlosado = item.valorFaturado > 0
                ? (item.valorGlosado / item.valorFaturado) * 100
                : 0;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground truncate mr-2">{item.chave}</span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {fmtCurrency(item.valorFaturado)}
                    </span>
                  </div>
                  {/* Stacked bar */}
                  <div className="w-full h-6 bg-muted/50 rounded-full overflow-hidden flex">
                    {/* Recebido (green) */}
                    <div
                      className="h-full bg-green-500 dark:bg-green-600 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${Math.max(taxaRecebido, 0)}%` }}
                    >
                      {taxaRecebido >= 15 && (
                        <span className="text-[10px] font-bold text-white">
                          {Math.round(taxaRecebido)}%
                        </span>
                      )}
                    </div>
                    {/* Glosado (red) */}
                    <div
                      className="h-full bg-red-500 dark:bg-red-600 flex items-center justify-center transition-all duration-500"
                      style={{ width: `${Math.max(taxaGlosado, 0)}%` }}
                    >
                      {taxaGlosado >= 10 && (
                        <span className="text-[10px] font-bold text-white">
                          {Math.round(taxaGlosado)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Recebido</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Glosado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <span className="text-xs text-muted-foreground">Largura = Faturado</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
