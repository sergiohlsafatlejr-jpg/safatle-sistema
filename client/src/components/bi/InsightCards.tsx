import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertCircle } from "lucide-react";

interface InsightCardsProps {
  convenios: Array<{ chave: string; valorFaturado: number; valorRecebido: number; valorGlosado: number; quantidade: number }>;
  meses: Array<{ mes: string; faturado?: number; recebido?: number; glosado?: number }>;
}

export function InsightCards({ convenios, meses }: InsightCardsProps) {
  const insights = [];

  // Insight 1: Convênio com maior glosa
  if (convenios.length > 0) {
    const maioresGlosas = [...convenios].sort((a, b) => b.valorGlosado - a.valorGlosado);
    if (maioresGlosas[0].valorGlosado > 0) {
      const taxa = (maioresGlosas[0].valorGlosado / maioresGlosas[0].valorFaturado) * 100;
      insights.push({
        icon: AlertCircle,
        title: "Maior Taxa de Glosa",
        description: `${maioresGlosas[0].chave} com ${taxa.toFixed(1)}% de glosa`,
        color: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
        iconColor: "text-red-600",
      });
    }
  }

  // Insight 2: Melhor desempenho
  if (convenios.length > 0) {
    const melhorDesempenho = [...convenios].sort((a, b) => {
      const taxaA = a.valorFaturado > 0 ? (a.valorRecebido / a.valorFaturado) * 100 : 0;
      const taxaB = b.valorFaturado > 0 ? (b.valorRecebido / b.valorFaturado) * 100 : 0;
      return taxaB - taxaA;
    });
    if (melhorDesempenho[0]) {
      const taxa = melhorDesempenho[0].valorFaturado > 0 ? (melhorDesempenho[0].valorRecebido / melhorDesempenho[0].valorFaturado) * 100 : 0;
      insights.push({
        icon: TrendingUp,
        title: "Melhor Desempenho",
        description: `${melhorDesempenho[0].chave} com ${taxa.toFixed(1)}% de recebimento`,
        color: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
        iconColor: "text-green-600",
      });
    }
  }

  // Insight 3: Recomendação
  insights.push({
    icon: Lightbulb,
    title: "Recomendação",
    description: "Analise os motivos de glosa para identificar padrões e oportunidades de melhoria",
    color: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
    iconColor: "text-blue-600",
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {insights.map((insight, idx) => {
        const Icon = insight.icon;
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={`${insight.color} border`}>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Icon className={`w-5 h-5 ${insight.iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
