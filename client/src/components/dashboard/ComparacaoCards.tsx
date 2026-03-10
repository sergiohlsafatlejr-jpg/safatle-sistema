import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComparacaoItem {
  label: string;
  valorAtual: number;
  valorAnterior: number;
  icon: React.ElementType;
}

interface ComparacaoCardsProps {
  periodoAtual: string;
  periodoAnterior: string;
  items: ComparacaoItem[];
  delay?: number;
}

export default function ComparacaoCards({
  periodoAtual,
  periodoAnterior,
  items,
  delay = 0,
}: ComparacaoCardsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="chart-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-card-foreground">
            Comparativo de Períodos
          </h3>
          <Badge variant="outline" className="text-[10px] gap-1">
            {periodoAnterior}
            <ArrowRight className="h-2.5 w-2.5" />
            {periodoAtual}
          </Badge>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((item, idx) => {
            const diff =
              item.valorAnterior > 0
                ? ((item.valorAtual - item.valorAnterior) / item.valorAnterior) * 100
                : 0;
            const isPositive = diff > 0;
            const isNeutral = diff === 0;
            const Icon = item.icon;

            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: delay + idx * 0.05 }}
                className="p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-extrabold text-card-foreground">
                      {item.valorAtual.toLocaleString("pt-BR")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ant: {item.valorAnterior.toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div
                    className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isNeutral
                        ? "bg-muted text-muted-foreground"
                        : isPositive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isNeutral ? (
                      <Minus className="h-2.5 w-2.5" />
                    ) : isPositive ? (
                      <TrendingUp className="h-2.5 w-2.5" />
                    ) : (
                      <TrendingDown className="h-2.5 w-2.5" />
                    )}
                    {isPositive ? "+" : ""}
                    {diff.toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
