interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Record<string, any>;
    value: number;
    name: string;
    color?: string;
    dataKey?: string;
  }>;
  label?: string;
  formatter?: (value: number, name: string) => string;
}

export default function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xl">
      {label && (
        <p className="text-xs font-semibold text-card-foreground mb-2 border-b border-border pb-1.5">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || "hsl(var(--primary))" }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-bold text-card-foreground">
              {formatter
                ? formatter(entry.value, entry.name)
                : entry.value?.toLocaleString("pt-BR")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simplified tooltip for single-value charts
export function SimpleTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold text-card-foreground">
        {d.nomeCompleto || d.nome || d.name || d.label}
      </p>
      <p className="text-muted-foreground">
        Total:{" "}
        <span className="font-bold text-card-foreground">
          {(d.total || d.value || payload[0].value)?.toLocaleString("pt-BR")}
        </span>
      </p>
    </div>
  );
}
