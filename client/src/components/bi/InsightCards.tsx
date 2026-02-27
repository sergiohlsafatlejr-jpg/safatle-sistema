import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightCardsProps {
  convenios: Array<{
    chave: string;
    valorFaturado: number;
    valorRecebido: number;
    valorGlosado: number;
    quantidade: number;
  }>;
  meses: Array<{
    mes: string;
    faturado?: number;
    recebido?: number;
    glosado?: number;
  }>;
}

const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function InsightCards({ convenios, meses }: InsightCardsProps) {
  // ---- Convênio Mais Crítico ----
  const convenioCritico = (() => {
    if (!convenios || convenios.length === 0) return null;
    const sorted = [...convenios]
      .filter((c) => c.valorFaturado > 0 && c.valorGlosado > 0)
      .sort((a, b) => {
        const taxaA = a.valorFaturado > 0 ? (a.valorGlosado / a.valorFaturado) * 100 : 0;
        const taxaB = b.valorFaturado > 0 ? (b.valorGlosado / b.valorFaturado) * 100 : 0;
        return taxaB - taxaA;
      });
    if (sorted.length === 0) return null;
    const c = sorted[0];
    const taxa = c.valorFaturado > 0 ? (c.valorGlosado / c.valorFaturado) * 100 : 0;
    return {
      nome: c.chave,
      taxa,
      glosado: c.valorGlosado,
      faturado: c.valorFaturado,
    };
  })();

  // ---- Variação Mensal ----
  const variacaoMensal = (() => {
    if (!meses || meses.length < 2) return null;
    const sorted = [...meses].filter(
      (m) => (m.faturado || 0) > 0 || (m.glosado || 0) > 0
    );
    if (sorted.length < 2) return null;
    const penultimo = sorted[sorted.length - 2];
    const ultimo = sorted[sorted.length - 1];
    const fatAnterior = penultimo.faturado || 0;
    const fatAtual = ultimo.faturado || 0;
    const glosAnterior = penultimo.glosado || 0;
    const glosAtual = ultimo.glosado || 0;
    const varFat = fatAnterior > 0 ? ((fatAtual - fatAnterior) / fatAnterior) * 100 : 0;
    const varGlos = glosAnterior > 0 ? ((glosAtual - glosAnterior) / glosAnterior) * 100 : 0;

    // Find worst month by glosa rate
    const piorMes = sorted.reduce<{ mes: string; taxa: number }>(
      (worst, m) => {
        const fat = m.faturado || 0;
        const glos = m.glosado || 0;
        const taxa = fat > 0 ? (glos / fat) * 100 : 0;
        if (taxa > worst.taxa) return { mes: m.mes, taxa };
        return worst;
      },
      { mes: "", taxa: 0 }
    );

    return {
      mesAnterior: penultimo.mes,
      mesAtual: ultimo.mes,
      faturamento: fatAtual,
      glosa: glosAtual,
      varFaturamento: varFat,
      varGlosa: varGlos,
      piorMes: piorMes.mes,
      piorMesTaxa: piorMes.taxa,
    };
  })();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Convênio Mais Crítico */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-red-500/30 bg-red-50/50 dark:bg-red-950/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <span className="text-amber-500">⚠</span> Convênio Mais Crítico
                </p>
                {convenioCritico ? (
                  <>
                    <p className="text-lg font-bold text-foreground mt-1">
                      {convenioCritico.nome}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        Taxa de glosa:{" "}
                        <span className="font-semibold text-red-500">
                          {convenioCritico.taxa.toFixed(1)}%
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Glosado:{" "}
                        <span className="font-semibold text-red-500">
                          {fmtCurrency(convenioCritico.glosado)}
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Faturado:{" "}
                      <span className="font-semibold text-foreground">
                        {fmtCurrency(convenioCritico.faturado)}
                      </span>
                    </p>
                    {/* Progress bar */}
                    <div className="mt-3 w-full h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600"
                        style={{ width: `${Math.min(convenioCritico.taxa, 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhum convênio com glosa identificado
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Variação Mensal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <span>📊</span> Variação Mensal
                  {variacaoMensal && (
                    <span className="text-muted-foreground/70">
                      ({variacaoMensal.mesAnterior} → {variacaoMensal.mesAtual})
                    </span>
                  )}
                </p>
                {variacaoMensal ? (
                  <>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Faturamento</p>
                        <p className="text-lg font-bold text-foreground">
                          {fmtCurrency(variacaoMensal.faturamento)}
                        </p>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            variacaoMensal.varFaturamento >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-500 dark:text-red-400"
                          )}
                        >
                          {variacaoMensal.varFaturamento >= 0 ? "↗" : "↘"}{" "}
                          {variacaoMensal.varFaturamento >= 0 ? "+" : ""}
                          {variacaoMensal.varFaturamento.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Glosa</p>
                        <p className="text-lg font-bold text-foreground">
                          {fmtCurrency(variacaoMensal.glosa)}
                        </p>
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            variacaoMensal.varGlosa <= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-500 dark:text-red-400"
                          )}
                        >
                          {variacaoMensal.varGlosa >= 0 ? "↗" : "↘"}{" "}
                          {variacaoMensal.varGlosa >= 0 ? "+" : ""}
                          {variacaoMensal.varGlosa.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    {variacaoMensal.piorMes && (
                      <p className="text-xs text-muted-foreground mt-3">
                        Pior mês:{" "}
                        <span className="font-semibold text-red-500">
                          {variacaoMensal.piorMes}
                        </span>{" "}
                        com {variacaoMensal.piorMesTaxa.toFixed(1)}% de glosa
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    Dados insuficientes para comparação mensal
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
