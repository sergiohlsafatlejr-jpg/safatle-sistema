import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  gradient: "blue" | "emerald" | "violet" | "amber";
  trend?: {
    value: number;
    label: string;
  };
  delay?: number;
}

const gradientMap = {
  blue: "kpi-icon-blue",
  emerald: "kpi-icon-emerald",
  violet: "kpi-icon-violet",
  amber: "kpi-icon-amber",
};

export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend,
  delay = 0,
}: KpiCardProps) {
  const trendColor =
    trend && trend.value > 0
      ? "text-emerald-500"
      : trend && trend.value < 0
        ? "text-red-500"
        : "text-muted-foreground";

  const TrendIcon =
    trend && trend.value > 0
      ? TrendingUp
      : trend && trend.value < 0
        ? TrendingDown
        : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="kpi-card"
    >
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-card-foreground">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl ${gradientMap[gradient]}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>

        {trend && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              <span>
                {trend.value > 0 ? "+" : ""}
                {trend.value.toFixed(1)}%
              </span>
              <span className="text-muted-foreground font-normal">{trend.label}</span>
            </div>
          </div>
        )}
      </div>

      {/* Decorative gradient bar */}
      <div
        className={`h-1 w-full ${gradientMap[gradient]}`}
        style={{ opacity: 0.6 }}
      />
    </motion.div>
  );
}
