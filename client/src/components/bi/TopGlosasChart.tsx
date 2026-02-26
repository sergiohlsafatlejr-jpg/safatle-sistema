import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface TopGlosasChartProps {
  data: Array<{
    chave: string;
    quantidade: number;
    valor: number;
    percentual: number;
  }>;
}

const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function TopGlosasChart({ data }: TopGlosasChartProps) {
  const sorted = [...data].sort((a, b) => b.valor - a.valor).slice(0, 10);
  const maxValor = sorted.length > 0 ? sorted[0].valor : 1;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Top 10 Motivos de Glosa
        </CardTitle>
        <CardDescription>
          Maiores valores glosados por motivo — passe o mouse para detalhes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length > 0 ? (
          <div className="space-y-4">
            {sorted.map((item, idx) => {
              const barWidth = maxValor > 0 ? (item.valor / maxValor) * 100 : 0;
              return (
                <div key={idx} className="group" title={`${item.chave}: ${fmtCurrency(item.valor)} (${item.quantidade} itens)`}>
                  {/* Row: number + name + value + percentage */}
                  <div className="flex items-center gap-3 mb-1.5">
                    {/* Numbered badge */}
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        idx < 3
                          ? "bg-red-500"
                          : "bg-muted-foreground/40"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    {/* Name */}
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {item.chave}
                    </span>
                    {/* Value in red */}
                    <span className="text-sm font-bold text-red-500 whitespace-nowrap">
                      {fmtCurrency(item.valor)}
                    </span>
                    {/* Percentage */}
                    <span className="text-xs text-muted-foreground w-14 text-right whitespace-nowrap">
                      {item.percentual.toFixed(1)}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="ml-10 w-[calc(100%-2.5rem)] h-2 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 dark:bg-red-600 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhum dado de glosa disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
}
