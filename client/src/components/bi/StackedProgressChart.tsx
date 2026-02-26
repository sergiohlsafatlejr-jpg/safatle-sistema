import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StackedProgressChartProps {
  data: Array<{
    chave: string;
    valorFaturado: number;
    valorRecebido: number;
    valorGlosado: number;
  }>;
}

export function StackedProgressChart({ data }: StackedProgressChartProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle>Taxa de Recebimento por Convênio</CardTitle>
        <CardDescription>Proporção de valores recebidos vs faturados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.slice(0, 8).map((item, idx) => {
          const taxa = item.valorFaturado > 0 ? (item.valorRecebido / item.valorFaturado) * 100 : 0;
          return (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.chave}</span>
                <span className="text-muted-foreground">{taxa.toFixed(1)}%</span>
              </div>
              <Progress value={taxa} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
