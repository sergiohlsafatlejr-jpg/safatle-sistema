import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "primary" | "success" | "danger" | "warning";
  delay?: number;
  trend?: { value: number; label: string };
  breakdown?: Array<{ nome: string; valor: number }>;
  active?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  primary: "border-l-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20",
  success: "border-l-green-500 hover:bg-green-50 dark:hover:bg-green-950/20",
  danger: "border-l-red-500 hover:bg-red-50 dark:hover:bg-red-950/20",
  warning: "border-l-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20",
};

const iconColors = {
  primary: "text-blue-500",
  success: "text-green-500",
  danger: "text-red-500",
  warning: "text-amber-500",
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
          "border-l-4 transition-all duration-200",
          variantStyles[variant],
          active ? "ring-2 ring-offset-2" : "ring-0",
          onClick && "hover:shadow-lg"
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Icon className={cn("w-4 h-4", iconColors[variant])} />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className={trend.value >= 0 ? "text-green-600" : "text-red-600"}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
          {breakdown && breakdown.length > 0 && (
            <div className="mt-3 space-y-1 border-t pt-2">
              {breakdown.slice(0, 3).map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.nome}</span>
                  <span className="font-medium">R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
              {breakdown.length > 3 && (
                <div className="text-xs text-muted-foreground italic">+{breakdown.length - 3} mais</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
