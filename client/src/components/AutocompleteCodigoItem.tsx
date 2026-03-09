import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Package, Hash } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface ItemSugestao {
  codigo: string;
  descricao: string;
  tipo: string;
  totalOcorrencias: number;
  quantidadeMedia: number;
  valorMedio: number;
}

interface AutocompleteCodigoItemProps {
  estabelecimentoId: number;
  value: string;
  onChange: (item: ItemSugestao) => void;
  onChangeRaw?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AutocompleteCodigoItem({
  estabelecimentoId,
  value,
  onChange,
  onChangeRaw,
  placeholder = "Código ou descrição...",
  className = "",
}: AutocompleteCodigoItemProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Debounce search
  const handleInputChange = useCallback((val: string) => {
    setInputValue(val);
    onChangeRaw?.(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (val.length >= 2) {
        setDebouncedSearch(val);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    }, 300);
  }, [onChangeRaw]);

  // Query
  const { data: sugestoes, isLoading } = trpc.padroesCobranca.autocompleteCodigos.useQuery(
    { estabelecimentoId, busca: debouncedSearch },
    { enabled: debouncedSearch.length >= 2 && showDropdown }
  );

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectItem = (item: ItemSugestao) => {
    setInputValue(item.codigo);
    setShowDropdown(false);
    onChange(item);
  };

  // Auto-selecionar quando o usuário digita um código exato e sai do campo
  const handleBlur = useCallback(() => {
    // Delay para permitir click no dropdown
    setTimeout(() => {
      if (sugestoes && sugestoes.length > 0 && inputValue.trim()) {
        // Se há um resultado com código exato, seleciona automaticamente
        const exactMatch = sugestoes.find((s: ItemSugestao) => s.codigo === inputValue.trim());
        if (exactMatch) {
          onChange(exactMatch);
        }
      }
      setShowDropdown(false);
    }, 200);
  }, [sugestoes, inputValue, onChange]);

  const tipoLabel = (tipo: string) => {
    const map: Record<string, { label: string; color: string }> = {
      "PROCEDIMENTO": { label: "Proc", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      "MAT_MED": { label: "M/M", color: "bg-green-500/20 text-green-400 border-green-500/30" },
      "TAXA": { label: "Taxa", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      "DIARIA": { label: "Diária", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    };
    const t = tipo?.toUpperCase() || "";
    for (const [key, val] of Object.entries(map)) {
      if (t.includes(key)) return val;
    }
    return { label: tipo || "?", color: "bg-muted text-muted-foreground" };
  };

  const formatCurrency = (v: number) =>
    v > 0 ? `R$ ${v.toFixed(2).replace(".", ",")}` : "";

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (debouncedSearch.length >= 2) setShowDropdown(true);
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="h-8 text-xs pr-7"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : (
            <Search className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl max-h-[320px] overflow-y-auto">
          {isLoading ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
              Buscando códigos...
            </div>
          ) : sugestoes && sugestoes.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                {sugestoes.length} resultado{sugestoes.length > 1 ? "s" : ""} encontrado{sugestoes.length > 1 ? "s" : ""}
              </div>
              {sugestoes.map((item: ItemSugestao) => {
                const tp = tipoLabel(item.tipo);
                return (
                  <button
                    key={item.codigo}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors cursor-pointer border-b border-border/50 last:border-0"
                    onClick={() => selectItem(item)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${tp.color}`}>
                        {tp.label}
                      </Badge>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Hash className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span className="text-xs font-mono font-semibold text-cyan-400">{item.codigo}</span>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-foreground/80 truncate pl-1">
                      {item.descricao}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground pl-1">
                      <span className="flex items-center gap-1">
                        <Package className="h-2.5 w-2.5" />
                        {item.totalOcorrencias}x
                      </span>
                      <span>Qtd média: {item.quantidadeMedia}</span>
                      {item.valorMedio > 0 && (
                        <span className="text-green-400">{formatCurrency(item.valorMedio)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : debouncedSearch.length >= 2 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              Nenhum código encontrado para "{debouncedSearch}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
