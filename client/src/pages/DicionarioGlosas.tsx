import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  BookOpen, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ChevronRight,
  Target,
  FileCheck,
  TrendingUp,
  Info
} from "lucide-react";
import { 
  GLOSAS_TISS, 
  GlosaInfo, 
  listarGruposGlosa, 
  listarGlosasPorGrupo,
  buscarGlosas,
  obterEstatisticasPorGrupo
} from "../../../shared/glossaryGlosas";
import { toast } from "sonner";

export default function DicionarioGlosas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrupo, setSelectedGrupo] = useState<string>("all");
  const [selectedGlosa, setSelectedGlosa] = useState<GlosaInfo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const grupos = useMemo(() => listarGruposGlosa(), []);
  const estatisticas = useMemo(() => obterEstatisticasPorGrupo(), []);

  const glosasFiltradas = useMemo(() => {
    let resultado: GlosaInfo[] = [];
    
    if (searchTerm.trim()) {
      resultado = buscarGlosas(searchTerm);
    } else if (selectedGrupo && selectedGrupo !== "all") {
      resultado = listarGlosasPorGrupo(selectedGrupo);
    } else {
      resultado = Object.values(GLOSAS_TISS);
    }
    
    return resultado.sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [searchTerm, selectedGrupo]);

  const totalGlosas = Object.keys(GLOSAS_TISS).length;

  const handleCopyArgumento = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success("Argumento copiado para a área de transferência");
  };

  const handleOpenDetails = (glosa: GlosaInfo) => {
    setSelectedGlosa(glosa);
    setDialogOpen(true);
  };

  const getDificuldadeColor = (nivel?: number) => {
    if (!nivel) return "bg-gray-100 text-gray-700";
    if (nivel <= 2) return "bg-green-100 text-green-700";
    if (nivel <= 3) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getDificuldadeLabel = (nivel?: number) => {
    if (!nivel) return "Não avaliado";
    if (nivel === 1) return "Muito Fácil";
    if (nivel === 2) return "Fácil";
    if (nivel === 3) return "Moderado";
    if (nivel === 4) return "Difícil";
    return "Muito Difícil";
  };

  const getProbabilidadeColor = (prob?: number) => {
    if (!prob) return "text-gray-500";
    if (prob >= 80) return "text-green-600";
    if (prob >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dicionário de Glosas TISS</h1>
          <p className="text-muted-foreground">
            Consulte códigos de glosa, descrições e sugestões de contestação
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Códigos</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGlosas}</div>
              <p className="text-xs text-muted-foreground">códigos catalogados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Grupos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{grupos.length}</div>
              <p className="text-xs text-muted-foreground">categorias de glosa</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Argumentos</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(GLOSAS_TISS).filter(g => g.argumentoContestacao).length}
              </div>
              <p className="text-xs text-muted-foreground">com sugestões de contestação</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resultados</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{glosasFiltradas.length}</div>
              <p className="text-xs text-muted-foreground">glosas encontradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Glosas</CardTitle>
            <CardDescription>
              Pesquise por código, descrição ou argumento de contestação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o código ou descrição da glosa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
                <SelectTrigger className="w-full md:w-[250px]">
                  <SelectValue placeholder="Filtrar por grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo} value={grupo}>
                      {grupo} ({estatisticas[grupo]?.total || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Glosas */}
        <Card>
          <CardHeader>
            <CardTitle>Códigos de Glosa</CardTitle>
            <CardDescription>
              Clique em uma glosa para ver detalhes e sugestões de contestação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {glosasFiltradas.map((glosa) => (
                  <div
                    key={glosa.codigo}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleOpenDetails(glosa)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {glosa.codigo}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {glosa.grupo}
                        </Badge>
                        {glosa.argumentoContestacao && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Com argumento
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm font-medium truncate">
                        {glosa.descricaoSimplificada}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {glosa.descricao}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      {glosa.probabilidadeSucesso && (
                        <div className="text-right">
                          <p className={`text-sm font-bold ${getProbabilidadeColor(glosa.probabilidadeSucesso)}`}>
                            {glosa.probabilidadeSucesso}%
                          </p>
                          <p className="text-xs text-muted-foreground">sucesso</p>
                        </div>
                      )}
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                ))}
                {glosasFiltradas.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma glosa encontrada</p>
                    <p className="text-sm">Tente ajustar os filtros de busca</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedGlosa && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                      {selectedGlosa.codigo}
                    </Badge>
                    <Badge variant="secondary">{selectedGlosa.grupo}</Badge>
                  </div>
                  <DialogTitle className="text-xl mt-2">
                    {selectedGlosa.descricaoSimplificada}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedGlosa.descricao}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Métricas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Target className="h-4 w-4" />
                        Dificuldade de Reversão
                      </div>
                      <Badge className={getDificuldadeColor(selectedGlosa.dificuldadeReversao)}>
                        {getDificuldadeLabel(selectedGlosa.dificuldadeReversao)}
                      </Badge>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        Probabilidade de Sucesso
                      </div>
                      <span className={`text-2xl font-bold ${getProbabilidadeColor(selectedGlosa.probabilidadeSucesso)}`}>
                        {selectedGlosa.probabilidadeSucesso || "N/A"}%
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Argumento de Contestação */}
                  {selectedGlosa.argumentoContestacao && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Sugestão de Argumento para Contestação
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyArgumento(selectedGlosa.argumentoContestacao!)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar
                        </Button>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                        <p className="text-sm text-blue-900 leading-relaxed">
                          {selectedGlosa.argumentoContestacao}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ações Recomendadas */}
                  {selectedGlosa.acoesRecomendadas && selectedGlosa.acoesRecomendadas.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4" />
                        Ações Recomendadas
                      </h4>
                      <div className="space-y-2">
                        {selectedGlosa.acoesRecomendadas.map((acao, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200"
                          >
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white text-sm flex items-center justify-center">
                              {index + 1}
                            </span>
                            <p className="text-sm text-green-900">{acao}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documentos Sugeridos */}
                  {selectedGlosa.documentosSugeridos && selectedGlosa.documentosSugeridos.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <FileCheck className="h-4 w-4" />
                        Documentos Sugeridos para Anexar
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedGlosa.documentosSugeridos.map((doc, index) => (
                          <Badge key={index} variant="outline" className="py-1.5">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dica */}
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">Dica</p>
                        <p className="text-sm text-amber-800">
                          Personalize o argumento com os dados específicos do atendimento antes de enviar a contestação. 
                          Substitua os campos entre colchetes [CAMPO] pelas informações reais.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
