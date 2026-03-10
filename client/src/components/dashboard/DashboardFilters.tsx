import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Filter, X, Search, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DashboardFiltersState {
  dataInicio: Date;
  dataFim: Date;
  tipoAtendimento: string;
  convenio: string;
  medico: string;
  servico: string;
  cid: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface DashboardFiltersProps {
  filters: DashboardFiltersState;
  onFiltersChange: (filters: DashboardFiltersState) => void;
  tiposOptions?: FilterOption[];
  conveniosOptions?: FilterOption[];
  medicosOptions?: FilterOption[];
  servicosOptions?: FilterOption[];
  cidsOptions?: FilterOption[];
  onApply: () => void;
  isLoading?: boolean;
  onSync?: () => void;
  isSyncing?: boolean;
  syncStatus?: string;
}

export default function DashboardFilters({
  filters,
  onFiltersChange,
  tiposOptions = [],
  conveniosOptions = [],
  medicosOptions = [],
  servicosOptions = [],
  cidsOptions = [],
  onApply,
  isLoading,
  onSync,
  isSyncing,
  syncStatus,
}: DashboardFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (partial: Partial<DashboardFiltersState>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const activeCount = [
    filters.tipoAtendimento,
    filters.convenio,
    filters.medico,
    filters.servico,
    filters.cid,
  ].filter(Boolean).length;

  const clearAll = () => {
    onFiltersChange({
      ...filters,
      tipoAtendimento: "",
      convenio: "",
      medico: "",
      servico: "",
      cid: "",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="chart-card"
    >
      <div className="p-5">
        {/* Row 1: Period + Quick filters + Apply */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Date Start */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Período Início
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-left font-normal h-9 text-sm",
                    !filters.dataInicio && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {filters.dataInicio
                    ? format(filters.dataInicio, "dd/MM/yyyy")
                    : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataInicio}
                  onSelect={(d) => d && update({ dataInicio: d })}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date End */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Período Fim
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[160px] justify-start text-left font-normal h-9 text-sm",
                    !filters.dataFim && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {filters.dataFim
                    ? format(filters.dataFim, "dd/MM/yyyy")
                    : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dataFim}
                  onSelect={(d) => d && update({ dataFim: d })}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Tipo Atendimento
            </label>
            <Select
              value={filters.tipoAtendimento || "all"}
              onValueChange={(v) =>
                update({ tipoAtendimento: v === "all" ? "" : v })
              }
            >
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tiposOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Convênio */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Convênio
            </label>
            <Select
              value={filters.convenio || "all"}
              onValueChange={(v) =>
                update({ convenio: v === "all" ? "" : v })
              }
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {conveniosOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Apply */}
          <Button onClick={onApply} className="h-9 px-5" disabled={isLoading}>
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Carregar
          </Button>

          {/* Sync button */}
          {onSync && (
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onSync}
              disabled={isSyncing}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5 mr-1.5", isSyncing && "animate-spin")}
              />
              {isSyncing ? "Sincronizando..." : "Sincronizar"}
            </Button>
          )}

          {/* Advanced toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Mais Filtros
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] px-1.5 py-0 h-4 rounded-full"
              >
                {activeCount}
              </Badge>
            )}
          </Button>

          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-destructive"
              onClick={clearAll}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {/* Row 2: Advanced filters */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-border">
                {/* Médico */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Médico
                  </label>
                  <Select
                    value={filters.medico || "all"}
                    onValueChange={(v) =>
                      update({ medico: v === "all" ? "" : v })
                    }
                  >
                    <SelectTrigger className="w-[200px] h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {medicosOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Serviço */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Serviço
                  </label>
                  <Select
                    value={filters.servico || "all"}
                    onValueChange={(v) =>
                      update({ servico: v === "all" ? "" : v })
                    }
                  >
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {servicosOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CID */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    CID
                  </label>
                  <Select
                    value={filters.cid || "all"}
                    onValueChange={(v) =>
                      update({ cid: v === "all" ? "" : v })
                    }
                  >
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {cidsOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {filters.tipoAtendimento && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                Tipo: {filters.tipoAtendimento}
                <button
                  onClick={() => update({ tipoAtendimento: "" })}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.convenio && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                Convênio: {filters.convenio}
                <button
                  onClick={() => update({ convenio: "" })}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.medico && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                Médico: {filters.medico}
                <button
                  onClick={() => update({ medico: "" })}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.servico && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                Serviço: {filters.servico}
                <button
                  onClick={() => update({ servico: "" })}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.cid && (
              <Badge variant="secondary" className="text-xs gap-1 pr-1">
                CID: {filters.cid}
                <button
                  onClick={() => update({ cid: "" })}
                  className="ml-0.5 hover:bg-muted rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Sync status */}
        {syncStatus && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground">{syncStatus}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
