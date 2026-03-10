import { motion } from "framer-motion";
import { ArrowRight, AlertTriangle, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import CustomTooltip from "./CustomTooltip";

interface TaxaConversaoProps {
  data: {
    totalEmergencias: number;
    totalConvertidos: number;
    taxa: number;
    evolucaoMensal: Array<{
      mesAno: string;
      emergencias: number;
      convertidos: number;
      taxa: number;
    }>;
  };
}

export function TaxaConversaoEmergencia({ data }: TaxaConversaoProps) {
  const evolucaoFormatada = data.evolucaoMensal.map((item) => {
    const [ano, mes] = item.mesAno.split("-");
    const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return {
      ...item,
      label: `${meses[parseInt(mes, 10) - 1]}/${ano.slice(2)}`,
      taxaLabel: `${item.taxa}%`,
      detalhe: `${item.convertidos}/${item.emergencias}`,
    };
  });

  const taxaColor = data.taxa >= 25 ? "#ef4444" : data.taxa >= 15 ? "#f59e0b" : "#22c55e";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-xl border border-border/50 bg-card p-6 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-6">
        <ArrowRight className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Taxa de Conversão Emergência → Internação</h3>
      </div>

      {/* Funil visual */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {/* Emergências */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center"
        >
          <AlertTriangle className="h-6 w-6 text-amber-500 mb-1" />
          <span className="text-3xl font-bold text-foreground">{data.totalEmergencias.toLocaleString("pt-BR")}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Emergências</span>
        </motion.div>

        {/* Seta */}
        <div className="flex items-center gap-1">
          <div className="h-px w-8 bg-muted-foreground/30" />
          <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
          <div className="h-px w-8 bg-muted-foreground/30" />
        </div>

        {/* Internados */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <TrendingUp className="h-6 w-6 text-blue-500 mb-1" />
          <span className="text-3xl font-bold text-foreground">{data.totalConvertidos.toLocaleString("pt-BR")}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Internados</span>
        </motion.div>

        {/* Seta */}
        <div className="flex items-center gap-1">
          <div className="h-px w-8 bg-muted-foreground/30" />
          <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
        </div>

        {/* Taxa */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center"
        >
          <span className="text-4xl font-bold" style={{ color: taxaColor }}>{data.taxa}%</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Taxa Conversão</span>
        </motion.div>
      </div>

      {/* Evolução mensal */}
      {evolucaoFormatada.length > 0 && (
        <>
          <div className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Evolução Mensal</div>
          <div className="space-y-2">
            {evolucaoFormatada.slice(-6).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 shrink-0">{item.label}</span>
                <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(item.taxa * 2, 100)}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: item.taxa >= 25 ? "#ef4444" : item.taxa >= 15 ? "#f59e0b" : "#3b82f6" }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-10 text-right">{item.taxa}%</span>
                <span className="text-[10px] text-muted-foreground w-14 text-right">{item.detalhe}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
