import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Search, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface BIFiltersProps {
  ano: string;
  setAno: (value: string) => void;
  mes: string;
  setMes: (value: string) => void;
  convenio: string;
  setConvenio: (value: string) => void;
  tipo: string;
  setTipo: (value: string) => void;
  prestador: string;
  setPrestador: (value: string) => void;
  convenios: string[];
  dataInicial?: Date;
  setDataInicial?: (value: Date | undefined) => void;
  dataFinal?: Date;
  setDataFinal?: (value: Date | undefined) => void;
}

export function BIFilters({
  ano,
  setAno,
  mes,
  setMes,
  convenio,
  setConvenio,
  tipo,
  setTipo,
  prestador,
  setPrestador,
  convenios,
}: BIFiltersProps) {
  const meses = [
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const tipos = [
    { value: "medicamento", label: "Medicamento" },
    { value: "material", label: "Material" },
    { value: "procedimento", label: "Procedimento" },
    { value: "diaria", label: "Diária" },
    { value: "taxa", label: "Taxa" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Ano */}
            <div className="space-y-2">
              <Label htmlFor="ano" className="text-sm font-medium">
                <Calendar className="w-4 h-4 inline mr-2" />
                Ano
              </Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger id="ano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mês */}
            <div className="space-y-2">
              <Label htmlFor="mes" className="text-sm font-medium">
                <Calendar className="w-4 h-4 inline mr-2" />
                Mês
              </Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger id="mes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Meses</SelectItem>
                  {meses.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Convênio */}
            <div className="space-y-2">
              <Label htmlFor="convenio" className="text-sm font-medium">
                Convênio
              </Label>
              <Select value={convenio} onValueChange={setConvenio}>
                <SelectTrigger id="convenio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Convênios</SelectItem>
                  {convenios.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="tipo" className="text-sm font-medium">
                Tipo
              </Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Tipos</SelectItem>
                  {tipos.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prestador */}
            <div className="space-y-2">
              <Label htmlFor="prestador" className="text-sm font-medium">
                Prestador/Médico
              </Label>
              <Input
                id="prestador"
                placeholder="Filtrar por prestador..."
                value={prestador}
                onChange={(e) => setPrestador(e.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
