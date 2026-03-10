import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Filter } from "lucide-react";

interface FunilItem {
  nome: string;
  total: number;
  cor: string;
}

interface FunilStatusAtendimentosProps {
  dados: FunilItem[];
  delay?: number;
}

export default function FunilStatusAtendimentos({
  dados,
  delay = 0,
}: FunilStatusAtendimentosProps) {
  if (!dados.length) return null;

  const maxTotal = Math.max(...dados.map((d) => d.total));
  const totalGeral = dados.reduce((acc, d) => acc + d.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
    >
      <Card className="chart-card h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-card-foreground">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Filter className="h-3.5 w-3.5 text-primary" />
            </div>
            Funil — Tipos de Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-1 py-4">
            {dados.map((item, idx) => {
              const widthPct = Math.max((item.total / maxTotal) * 100, 25);
              const pctOfTotal = ((item.total / totalGeral) * 100).toFixed(1);

              return (
                <motion.div
                  key={item.nome}
                  initial={{ opacity: 0, scaleX: 0.5 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.4, delay: delay + idx * 0.08 }}
                  className="w-full flex flex-col items-center"
                >
                  <div
                    className="relative rounded-lg flex items-center justify-between px-4 py-3 text-white font-semibold text-sm transition-all hover:brightness-110 cursor-default"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: item.cor,
                      minHeight: 44,
                    }}
                  >
                    <span className="truncate">{item.nome}</span>
                    <span className="flex items-center gap-2 text-xs font-bold whitespace-nowrap">
                      {item.total.toLocaleString("pt-BR")}
                      <span className="opacity-75 font-normal">
                        ({pctOfTotal}%)
                      </span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Total geral:{" "}
              <span className="font-bold text-card-foreground">
                {totalGeral.toLocaleString("pt-BR")}
              </span>{" "}
              atendimentos
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
