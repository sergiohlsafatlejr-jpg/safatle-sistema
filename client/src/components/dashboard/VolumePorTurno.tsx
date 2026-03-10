import { motion } from "framer-motion";
import { Clock, Sun, Sunset, Moon, CloudMoon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import CustomTooltip from "./CustomTooltip";

interface VolumePorTurnoProps {
  data: {
    manha: number;
    tarde: number;
    noite: number;
    madrugada: number;
    total: number;
  };
}

const TURNO_CONFIG = [
  { key: "manha", label: "MANHÃ", icon: Sun, color: "#f59e0b", gradient: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/30", textColor: "text-amber-400", hours: "06h-12h" },
  { key: "tarde", label: "TARDE", icon: Sunset, color: "#f97316", gradient: "from-orange-500/20 to-orange-600/10", border: "border-orange-500/30", textColor: "text-orange-400", hours: "12h-18h" },
  { key: "noite", label: "NOITE", icon: Moon, color: "#6366f1", gradient: "from-indigo-500/20 to-indigo-600/10", border: "border-indigo-500/30", textColor: "text-indigo-400", hours: "18h-00h" },
  { key: "madrugada", label: "MADRUGADA", icon: CloudMoon, color: "#8b5cf6", gradient: "from-violet-500/20 to-violet-600/10", border: "border-violet-500/30", textColor: "text-violet-400", hours: "00h-06h" },
];

export function VolumePorTurno({ data }: VolumePorTurnoProps) {
  const chartData = TURNO_CONFIG.map((t) => ({
    name: t.label,
    value: data[t.key as keyof typeof data] as number,
    color: t.color,
  }));

  const maxTurno = TURNO_CONFIG.reduce((max, t) => {
    const val = data[t.key as keyof typeof data] as number;
    return val > max.val ? { key: t.key, val } : max;
  }, { key: "", val: 0 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border/50 bg-card p-6 shadow-lg"
    >
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Volume por Turno</h3>
      </div>

      {/* Gráfico de barras */}
      <div className="h-[220px] mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Atendimentos">
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cards de turno */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {TURNO_CONFIG.map((turno) => {
          const val = data[turno.key as keyof typeof data] as number;
          const perc = data.total > 0 ? ((val / data.total) * 100).toFixed(0) : "0";
          const isPico = turno.key === maxTurno.key;
          const Icon = turno.icon;

          return (
            <motion.div
              key={turno.key}
              whileHover={{ scale: 1.03 }}
              className={`relative rounded-lg border ${turno.border} bg-gradient-to-br ${turno.gradient} p-3 text-center transition-all ${isPico ? "ring-2 ring-primary/50" : ""}`}
            >
              <Icon className={`h-4 w-4 mx-auto mb-1 ${turno.textColor}`} />
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{turno.label}</div>
              <div className="text-xl font-bold text-foreground mt-1">{val.toLocaleString("pt-BR")}</div>
              <div className="text-xs text-muted-foreground">{perc}%</div>
              {isPico && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  PICO
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
