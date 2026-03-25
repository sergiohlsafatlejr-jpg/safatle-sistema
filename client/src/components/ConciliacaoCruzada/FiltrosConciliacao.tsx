import { Filter, Search, Check, ChevronsUpDown } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FiltrosConciliacaoProps {
  competenciasAtivas: any[];
  conveniosAtivos: any[];
  lotesXml: any[];
  lotesRetorno: any[];
  competenciaFiltro: string;
  setCompetenciaFiltro: (val: string) => void;
  convenioFiltro: string;
  setConvenioFiltro: (val: string) => void;
  statusFiltro: string;
  setStatusFiltro: (val: string) => void;
  loteXmlFiltro: string;
  setLoteXmlFiltro: (val: string) => void;
  loteXmlOpen: boolean;
  setLoteXmlOpen: (val: boolean) => void;
  loteRetornoFiltro: string;
  setLoteRetornoFiltro: (val: string) => void;
  loteRetornoOpen: boolean;
  setLoteRetornoOpen: (val: boolean) => void;
  buscaInput: string;
  setBuscaInput: (val: string) => void;
  filtroPrestador: string;
  setFiltroPrestador: (val: any) => void;
  setPaginaAtual: (val: number) => void;
  setPaginaConciliados: (val: number) => void;
  setGuiaConciliadaSelecionada: (val: any) => void;
  abaAtiva: string;
  formatarCompetencia: (comp: string) => string;
}

export function FiltrosConciliacao({
  competenciasAtivas, conveniosAtivos, lotesXml, lotesRetorno,
  competenciaFiltro, setCompetenciaFiltro,
  convenioFiltro, setConvenioFiltro,
  statusFiltro, setStatusFiltro,
  loteXmlFiltro, setLoteXmlFiltro, loteXmlOpen, setLoteXmlOpen,
  loteRetornoFiltro, setLoteRetornoFiltro, loteRetornoOpen, setLoteRetornoOpen,
  buscaInput, setBuscaInput,
  filtroPrestador, setFiltroPrestador,
  setPaginaAtual, setPaginaConciliados, setGuiaConciliadaSelecionada,
  abaAtiva, formatarCompetencia
}: FiltrosConciliacaoProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <div>
            <Label className="font-semibold text-primary">Competência</Label>
            <Select value={competenciaFiltro} onValueChange={(v) => { setCompetenciaFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
              <SelectTrigger className="border-primary">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {competenciasAtivas?.map((c: any) => (
                  <SelectItem key={c.competencia} value={c.competencia}>
                    {formatarCompetencia(c.competencia)} ({c.total} itens)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Convênio</Label>
            <Select value={convenioFiltro} onValueChange={(v) => { setConvenioFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {conveniosAtivos?.map((c: any) => (
                  <SelectItem key={String(c.convenioId || c.convenio)} value={String(c.convenioId || c.convenio)}>
                    {c.convenio || `Convênio ${c.convenioId}`} ({c.total})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status Conciliação</Label>
            <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="conciliado">Conciliado</SelectItem>
                <SelectItem value="divergente">Divergente</SelectItem>
                <SelectItem value="nao_recebido">Não Recebido</SelectItem>
                <SelectItem value="glosado">Glosado</SelectItem>
                <SelectItem value="terceiro">Terceiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Lote XML (Enviado)</Label>
            <Popover open={loteXmlOpen} onOpenChange={setLoteXmlOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={loteXmlOpen} className="w-full justify-between font-normal h-9 bg-transparent">
                  {loteXmlFiltro === "todos" ? "Todos" : `Lote ${loteXmlFiltro}`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar lote..." />
                  <CommandList>
                    <CommandEmpty>Nenhum lote encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="todos" onSelect={() => { setLoteXmlFiltro("todos"); setLoteXmlOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                        <Check className={cn("mr-2 h-4 w-4", loteXmlFiltro === "todos" ? "opacity-100" : "opacity-0")} />
                        Todos
                      </CommandItem>
                      {lotesXml?.map((l: any) => (
                        <CommandItem key={l.lote} value={`lote ${l.lote} ${l.total} itens`} onSelect={() => { setLoteXmlFiltro(l.lote); setLoteXmlOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                          <Check className={cn("mr-2 h-4 w-4", loteXmlFiltro === l.lote ? "opacity-100" : "opacity-0")} />
                          Lote {l.lote} ({l.total} itens)
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Lote Retorno (Convênio)</Label>
            <Popover open={loteRetornoOpen} onOpenChange={setLoteRetornoOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={loteRetornoOpen} className="w-full justify-between font-normal h-9 bg-transparent">
                  {loteRetornoFiltro === "todos" ? "Todos" : (() => { const found = lotesRetorno?.find((l: any) => l.lote === loteRetornoFiltro); return found?.protocolo ? `Lote ${loteRetornoFiltro} (Prot. ${found.protocolo})` : `Lote ${loteRetornoFiltro}`; })()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar lote ou protocolo..." />
                  <CommandList>
                    <CommandEmpty>Nenhum lote encontrado.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem value="todos" onSelect={() => { setLoteRetornoFiltro("todos"); setLoteRetornoOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                        <Check className={cn("mr-2 h-4 w-4", loteRetornoFiltro === "todos" ? "opacity-100" : "opacity-0")} />
                        Todos
                      </CommandItem>
                      {lotesRetorno?.map((l: any) => (
                        <CommandItem key={l.lote} value={`lote ${l.lote} protocolo ${l.protocolo || ''} ${l.total} itens`} onSelect={() => { setLoteRetornoFiltro(l.lote); setLoteRetornoOpen(false); setPaginaAtual(0); setPaginaConciliados(0); setGuiaConciliadaSelecionada(null); }}>
                          <Check className={cn("mr-2 h-4 w-4", loteRetornoFiltro === l.lote ? "opacity-100" : "opacity-0")} />
                          Lote {l.lote} {l.protocolo ? `(Prot. ${l.protocolo})` : ''} ({l.total} itens)
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="lg:col-span-2 xl:col-span-1">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Guia, conta, paciente..."
                value={buscaInput}
                onChange={(e) => { setBuscaInput(e.target.value); setPaginaAtual(0); setPaginaConciliados(0); }}
                className="pl-9"
              />
            </div>
          </div>
          {(abaAtiva === 'conciliados' || abaAtiva === 'xml_recurso') && (
            <div>
              <Label>Prestador</Label>
              <Select value={filtroPrestador} onValueChange={(v) => setFiltroPrestador(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="proprio">Próprio</SelectItem>
                  <SelectItem value="terceiro">Terceiros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
