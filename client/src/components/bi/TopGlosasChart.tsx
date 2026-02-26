import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface TopGlosasChartProps {
  data: Array<{
    chave: string;
    quantidade: number;
    valor: number;
    percentual: number;
  }>;
}

export function TopGlosasChart({ data }: TopGlosasChartProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Top 10 Motivos de Glosa
        </CardTitle>
        <CardDescription>Motivos mais frequentes de glosa</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="flex-1">
                <p className="font-medium text-sm truncate">{item.chave}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantidade} itens • R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Badge variant="destructive" className="ml-2">
                {item.percentual}%
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
