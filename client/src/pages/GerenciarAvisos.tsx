import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  Megaphone,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDateBR, safeParseDate } from "@/lib/dateUtils";

type AvisoTipo = "informacao" | "alerta" | "urgente";

const TIPO_CONFIG: Record<AvisoTipo, { label: string; icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
  informacao: {
    label: "Informação",
    icon: <Info className="h-4 w-4" />,
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  alerta: {
    label: "Alerta",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  urgente: {
    label: "Urgente",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

export default function GerenciarAvisos() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState<AvisoTipo>("informacao");
  const [expiraEm, setExpiraEm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: avisos, isLoading } = trpc.avisosInternos.listarTodos.useQuery();

  const criarMutation = trpc.avisosInternos.criar.useMutation({
    onSuccess: () => {
      toast.success("Aviso criado com sucesso!");
      utils.avisosInternos.listarTodos.invalidate();
      utils.avisosInternos.listarAtivos.invalidate();
      resetForm();
    },
    onError: (err) => toast.error("Erro ao criar aviso: " + err.message),
  });

  const editarMutation = trpc.avisosInternos.editar.useMutation({
    onSuccess: () => {
      toast.success("Aviso atualizado com sucesso!");
      utils.avisosInternos.listarTodos.invalidate();
      utils.avisosInternos.listarAtivos.invalidate();
      resetForm();
    },
    onError: (err) => toast.error("Erro ao editar aviso: " + err.message),
  });

  const excluirMutation = trpc.avisosInternos.excluir.useMutation({
    onSuccess: () => {
      toast.success("Aviso excluído com sucesso!");
      utils.avisosInternos.listarTodos.invalidate();
      utils.avisosInternos.listarAtivos.invalidate();
      setDeleteDialogOpen(false);
      setDeletingId(null);
    },
    onError: (err) => toast.error("Erro ao excluir aviso: " + err.message),
  });

  const toggleAtivoMutation = trpc.avisosInternos.editar.useMutation({
    onSuccess: () => {
      toast.success("Status do aviso atualizado!");
      utils.avisosInternos.listarTodos.invalidate();
      utils.avisosInternos.listarAtivos.invalidate();
    },
    onError: (err) => toast.error("Erro ao atualizar status: " + err.message),
  });

  function resetForm() {
    setDialogOpen(false);
    setEditingId(null);
    setTitulo("");
    setConteudo("");
    setTipo("informacao");
    setExpiraEm("");
  }

  function handleEdit(aviso: any) {
    setEditingId(aviso.id);
    setTitulo(aviso.titulo);
    setConteudo(aviso.conteudo);
    setTipo(aviso.tipo);
    setExpiraEm(aviso.expiraEm ? new Date(aviso.expiraEm).toISOString().slice(0, 16) : "");
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!titulo.trim() || !conteudo.trim()) {
      toast.error("Preencha título e conteúdo");
      return;
    }

    if (editingId) {
      editarMutation.mutate({
        id: editingId,
        titulo,
        conteudo,
        tipo,
        expiraEm: expiraEm || null,
      });
    } else {
      criarMutation.mutate({
        titulo,
        conteudo,
        tipo,
        expiraEm: expiraEm || null,
      });
    }
  }

  function toggleAtivo(aviso: any) {
    toggleAtivoMutation.mutate({
      id: aviso.id,
      ativo: aviso.ativo === "sim" ? "nao" : "sim",
    });
  }

  const avisosAtivos = avisos?.filter((a) => a.ativo === "sim").length || 0;
  const avisosInativos = avisos?.filter((a) => a.ativo === "nao").length || 0;
  const avisosUrgentes = avisos?.filter((a) => a.tipo === "urgente" && a.ativo === "sim").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" />
              Gerenciar Avisos Internos
            </h1>
            <p className="text-sm text-muted-foreground">
              Crie e gerencie comunicados que serão exibidos para todos os usuários ao acessar o sistema.
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Aviso
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Avisos</p>
                <p className="text-2xl font-bold">{avisos?.length || 0}</p>
              </div>
              <Megaphone className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{avisosAtivos}</p>
              </div>
              <ToggleRight className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-gray-400">{avisosInativos}</p>
              </div>
              <ToggleLeft className="h-8 w-8 text-gray-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Urgentes</p>
                <p className="text-2xl font-bold text-red-600">{avisosUrgentes}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Avisos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !avisos || avisos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum aviso cadastrado</p>
            <p className="text-sm text-muted-foreground mb-4">Crie o primeiro aviso para comunicar seus usuários.</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Aviso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {avisos.map((aviso) => {
            const config = TIPO_CONFIG[aviso.tipo as AvisoTipo] || TIPO_CONFIG.informacao;
            const isExpirado = aviso.expiraEm && new Date(aviso.expiraEm) < new Date();
            return (
              <Card
                key={aviso.id}
                className={`border-l-4 ${config.borderColor} ${aviso.ativo === "nao" ? "opacity-50" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`${config.bgColor} ${config.color} border-0 gap-1`}>
                          {config.icon}
                          {config.label}
                        </Badge>
                        {aviso.ativo === "sim" ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-400 border-gray-200">
                            Inativo
                          </Badge>
                        )}
                        {isExpirado && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                            Expirado
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-base">{aviso.titulo}</h3>
                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{aviso.conteudo}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Criado por: {aviso.criadoPorNome || "Admin"}</span>
                        <span>Em: {formatDateBR(aviso.createdAt)}</span>
                        {aviso.expiraEm && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expira: {safeParseDate(aviso.expiraEm)?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) || "-"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleAtivo(aviso)}
                        title={aviso.ativo === "sim" ? "Desativar" : "Ativar"}
                      >
                        {aviso.ativo === "sim" ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(aviso)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => { setDeletingId(aviso.id); setDeleteDialogOpen(true); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Criar/Editar */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Aviso" : "Novo Aviso Interno"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título</label>
              <Input
                placeholder="Ex: Manutenção programada dia 15/02"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Conteúdo</label>
              <Textarea
                placeholder="Descreva o aviso com detalhes..."
                value={conteudo}
                onChange={(e) => setConteudo(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo</label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as AvisoTipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informacao">
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-600" />
                        Informação
                      </span>
                    </SelectItem>
                    <SelectItem value="alerta">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Alerta
                      </span>
                    </SelectItem>
                    <SelectItem value="urgente">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Urgente
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Expira em (opcional)</label>
                <Input
                  type="datetime-local"
                  value={expiraEm}
                  onChange={(e) => setExpiraEm(e.target.value)}
                />
              </div>
            </div>
            {/* Preview */}
            {titulo && (
              <div>
                <label className="text-sm font-medium mb-1 block">Pré-visualização</label>
                <div className={`p-3 rounded-lg border-l-4 ${TIPO_CONFIG[tipo].borderColor} ${TIPO_CONFIG[tipo].bgColor}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={TIPO_CONFIG[tipo].color}>{TIPO_CONFIG[tipo].icon}</span>
                    <span className={`font-semibold text-sm ${TIPO_CONFIG[tipo].color}`}>{titulo}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{conteudo || "..."}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={criarMutation.isPending || editarMutation.isPending}
            >
              {(criarMutation.isPending || editarMutation.isPending) && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              {editingId ? "Salvar Alterações" : "Criar Aviso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este aviso? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && excluirMutation.mutate({ id: deletingId })}
              disabled={excluirMutation.isPending}
            >
              {excluirMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
