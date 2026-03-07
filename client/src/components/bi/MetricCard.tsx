import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "danger" | "warning" | "info";
  delay?: number;
  trend?: { value: number; label: string };
  breakdown?: Array<{ nome: string; valor: number }>;
  active?: boolean;
  onClick?: () => void;
}

const variantBorder = {
  primary: "border-blue-500",
  success: "border-green-500",
  danger: "border-red-500",
  warning: "border-amber-500",
  info: "border-cyan-500",
};

const variantBg = {
  primary: "hover:bg-blue-50 dark:hover:bg-blue-950/30",
  success: "hover:bg-green-50 dark:hover:bg-green-950/30",
  danger: "hover:bg-red-50 dark:hover:bg-red-950/30",
  warning: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
  info: "hover:bg-cyan-50 dark:hover:bg-cyan-950/30",
};

const variantActiveBg = {
  primary: "bg-blue-50/50 dark:bg-blue-950/20",
  success: "bg-green-50/50 dark:bg-green-950/20",
  danger: "bg-red-50/50 dark:bg-red-950/20",
  warning: "bg-amber-50/50 dark:bg-amber-950/20",
  info: "bg-cyan-50/50 dark:bg-cyan-950/20",
};

const iconBg = {
  primary: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  success: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400",
  danger: "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400",
  warning: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  info: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400",
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "primary",
  delay = 0,
  trend,
  breakdown,
  active = true,
  onClick,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      onClick={onClick}
      className={cn(onClick && "cursor-pointer")}
    >
      <Card
        className={cn(
          "border-l-4 transition-all duration-200 overflow-hidden",
          variantBorder[variant],
          variantBg[variant],
          active && variantActiveBg[variant],
          active ? "ring-2 ring-offset-1 ring-offset-background" : "ring-0 opacity-60",
          onClick && "hover:shadow-lg"
        )}
        style={{
          borderLeftColor: active ? undefined : "transparent",
        }}
      >
        <CardContent className="p-4 sm:p-5">
          {/* Top row: title + icon */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                {title}
              </p>
              <div className="text-2xl font-bold text-foreground leading-tight">
                {value}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div
              className={cn(
                "flex-shrink-0 ml-3 w-10 h-10 rounded-lg flex items-center justify-center",
                iconBg[variant]
              )}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>

          {/* Trend */}
          {trend && (
            <div className="flex items-center gap-1.5 mt-3 text-xs">
              <span
                className={cn(
                  "font-semibold",
                  trend.value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"
                )}
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}

          {/* Breakdown mini-list */}
          {breakdown && breakdown.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border/50 pt-2">
              {breakdown.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground truncate mr-2">{item.nome}</span>
                  <span className="font-medium text-foreground whitespace-nowrap">
                    R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {breakdown.length > 3 && (
                <div className="text-[10px] text-muted-foreground italic">
                  +{breakdown.length - 3} mais
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
