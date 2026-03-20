import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { formatDateBR } from "@/lib/dateUtils";
import {
  FileText, Plus, Search, Pencil, Trash2, AlertTriangle, Clock, CheckCircle2,
  XCircle, RefreshCw, BarChart3, ArrowLeft, Printer, FileDown, ChevronRight,
  Eye, Download
} from "lucide-react";

// ==================== TIPOS ====================
interface ContractData {
  contratanteNome: string; contratanteCNPJ: string; contratanteEndereco: string;
  contratanteCidade: string; contratanteEstado: string; contratanteRepresentante: string; contratanteCargo: string;
  contratadaNome: string; contratadaCNPJ: string; contratanteEnderecoCon: string;
  contratadaCidade: string; contratadaEstado: string; contratadaRepresentante: string; contratadaCargo: string;
  servicos: string[]; descricaoServicos: string;
  modelosCobranca: string[]; valorMensal: string; valorHora: string;
  valorPercentualConvenio: string; descricaoPercentualConvenio: string;
  formaPagamento: string; diaVencimento: string; prazoContrato: string;
  dataInicio: string; dataFim: string; localAssinatura: string; dataAssinatura: string;
  multaRescisao: string; prazoAviso: string; multaRescisaoPercent: string;
  dominiosSLA: string; slaDisponibilidade: string; slaDescontoPorQueda: string; slaHorasQueda: string;
  secaoFaturamento: boolean; secaoAuditoria: boolean; secaoConsultoria: boolean; secaoBI: boolean;
  secaoSLA: boolean; secaoSigilo: boolean; secaoReajuste: boolean; secaoGlosas: boolean;
  secaoInfraContratante: boolean; secaoRegistroCartorio: boolean; secaoTituloExecutivo: boolean;
  horasConsultoriaSemanal: string; horasGerenciaSemanal: string;
  responsavelConsultoria: string; responsavelGerencia: string;
  indiceReajuste: string; prazoSigiloMeses: string;
  percentPassivoTrabalhista: string; percentMultaVincendas: string;
  multaInadimplencia: string; jurosMora: string; prazoInadimplencia: string;
  foroComarca: string;
}

const servicosDisponiveis = [
  "Auditoria de prontuários e registros hospitalares",
  "Codificação de procedimentos (CID/TUSS)",
  "Revisão e otimização de glosas",
  "Treinamento de equipe de faturamento",
  "Implantação de fluxo de faturamento",
  "Consultoria em contratos com operadoras",
  "Análise de produção e indicadores",
  "Regularização junto a convênios e ANS",
  "Elaboração de relatórios gerenciais",
  "Acompanhamento de auditorias externas",
  "Consultoria de sistemas de gestão hospitalar",
  "Serviço de Business Intelligence (BI)",
  "Faturamento de contas hospitalares",
  "Auditoria médica e de enfermagem",
  "Recurso de glosas junto a convênios",
  "Gerência de setor de faturamento",
];

const defaultContractData: ContractData = {
  contratanteNome: "", contratanteCNPJ: "", contratanteEndereco: "",
  contratanteCidade: "", contratanteEstado: "", contratanteRepresentante: "", contratanteCargo: "",
  contratadaNome: "", contratadaCNPJ: "", contratanteEnderecoCon: "",
  contratadaCidade: "", contratadaEstado: "", contratadaRepresentante: "", contratadaCargo: "",
  servicos: [], descricaoServicos: "",
  modelosCobranca: ["fixo"], valorMensal: "", valorHora: "",
  valorPercentualConvenio: "", descricaoPercentualConvenio: "",
  formaPagamento: "Transferência bancária (TED/PIX)", diaVencimento: "10",
  prazoContrato: "12", dataInicio: "", dataFim: "", localAssinatura: "",
  dataAssinatura: new Date().toLocaleDateString("pt-BR"),
  multaRescisao: "3", prazoAviso: "30", multaRescisaoPercent: "100",
  dominiosSLA: "easyvision.com.br e bi.easyvision.com.br",
  slaDisponibilidade: "99", slaDescontoPorQueda: "5", slaHorasQueda: "4",
  secaoFaturamento: false, secaoAuditoria: false, secaoConsultoria: true, secaoBI: false,
  secaoSLA: false, secaoSigilo: true, secaoReajuste: true, secaoGlosas: false,
  secaoInfraContratante: true, secaoRegistroCartorio: false, secaoTituloExecutivo: false,
  horasConsultoriaSemanal: "5", horasGerenciaSemanal: "40",
  responsavelConsultoria: "", responsavelGerencia: "",
  indiceReajuste: "IGPM", prazoSigiloMeses: "12",
  percentPassivoTrabalhista: "50", percentMultaVincendas: "20",
  multaInadimplencia: "2", jurosMora: "1", prazoInadimplencia: "30",
  foroComarca: "Goiânia/GO",
};

function formatCurrency(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatDateContract(dateStr: string) {
  if (!dateStr) return "___/___/______";
  try { const d = new Date(dateStr + "T00:00:00"); return formatDateBR(d); } catch { return dateStr; }
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  rascunho: { label: "Rascunho", color: "bg-gray-500", icon: FileText },
  ativo: { label: "Ativo", color: "bg-green-600", icon: CheckCircle2 },
  suspenso: { label: "Suspenso", color: "bg-amber-500", icon: Clock },
  encerrado: { label: "Encerrado", color: "bg-red-500", icon: XCircle },
  renovacao: { label: "Renovação", color: "bg-blue-500", icon: RefreshCw },
};

// ==================== COMPONENTES DE FORMULÁRIO ====================
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-sm font-semibold tracking-widest uppercase text-muted-foreground px-2">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ToggleSection({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-center justify-between gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
      checked ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"
    }`}>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

// ==================== FORMULÁRIO COMPLETO ====================
function ContractForm({ onGenerate, initialData, isEditing }: {
  onGenerate: (data: ContractData) => void; initialData?: ContractData; isEditing?: boolean;
}) {
  const [data, setData] = useState<ContractData>(initialData || defaultContractData);
  const set = (field: keyof ContractData, value: string | string[] | boolean) => {
    setData(prev => ({ ...prev, [field]: value }));
  };
  const toggleServico = (servico: string) => {
    const current = data.servicos;
    if (current.includes(servico)) set("servicos", current.filter(s => s !== servico));
    else set("servicos", [...current, servico]);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onGenerate(data); }} className="space-y-2">
      {/* Módulos do Contrato */}
      <Section title="Módulos do Contrato">
        <div className="md:col-span-2">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Ative ou desative as seções que deseja incluir no contrato:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleSection label="Consultoria" description="Consultoria em faturamento com horas semanais" checked={data.secaoConsultoria} onChange={v => set("secaoConsultoria", v)} />
            <ToggleSection label="Faturamento" description="Faturamento completo de contas hospitalares" checked={data.secaoFaturamento} onChange={v => set("secaoFaturamento", v)} />
            <ToggleSection label="Auditoria Médica" description="Auditoria médica e de enfermagem" checked={data.secaoAuditoria} onChange={v => set("secaoAuditoria", v)} />
            <ToggleSection label="Recurso de Glosas" description="Revisão e recurso de glosas junto a convênios" checked={data.secaoGlosas} onChange={v => set("secaoGlosas", v)} />
            <ToggleSection label="Business Intelligence" description="Serviço de BI e dashboards" checked={data.secaoBI} onChange={v => set("secaoBI", v)} />
            <ToggleSection label="SLA / Disponibilidade" description="Garantia de uptime e multa por indisponibilidade" checked={data.secaoSLA} onChange={v => set("secaoSLA", v)} />
            <ToggleSection label="Reajuste Anual" description="Cláusula de reajuste por índice (IGPM/IPCA)" checked={data.secaoReajuste} onChange={v => set("secaoReajuste", v)} />
            <ToggleSection label="Sigilo Pós-Contrato" description="Obrigação de sigilo após encerramento" checked={data.secaoSigilo} onChange={v => set("secaoSigilo", v)} />
            <ToggleSection label="Infraestrutura do Contratante" description="Obrigação de fornecer equipamentos e ambiente" checked={data.secaoInfraContratante} onChange={v => set("secaoInfraContratante", v)} />
            <ToggleSection label="Registro em Cartório" description="Registro do contrato em Cartório de Títulos" checked={data.secaoRegistroCartorio} onChange={v => set("secaoRegistroCartorio", v)} />
            <ToggleSection label="Título Executivo" description="Contrato válido como título executivo extrajudicial" checked={data.secaoTituloExecutivo} onChange={v => set("secaoTituloExecutivo", v)} />
          </div>
        </div>
      </Section>

      {/* Contratante */}
      <Section title="Dados do Contratante">
        <Field label="Razão Social / Nome" className="md:col-span-2">
          <Input value={data.contratanteNome} onChange={e => set("contratanteNome", e.target.value)} placeholder="Hospital / Clínica XYZ Ltda." required />
        </Field>
        <Field label="CNPJ"><Input value={data.contratanteCNPJ} onChange={e => set("contratanteCNPJ", e.target.value)} placeholder="00.000.000/0001-00" /></Field>
        <Field label="Endereço completo"><Input value={data.contratanteEndereco} onChange={e => set("contratanteEndereco", e.target.value)} placeholder="Rua, nº, Bairro, CEP" /></Field>
        <Field label="Cidade"><Input value={data.contratanteCidade} onChange={e => set("contratanteCidade", e.target.value)} placeholder="São Paulo" /></Field>
        <Field label="Estado"><Input value={data.contratanteEstado} onChange={e => set("contratanteEstado", e.target.value)} placeholder="SP" /></Field>
        <Field label="Representante Legal"><Input value={data.contratanteRepresentante} onChange={e => set("contratanteRepresentante", e.target.value)} placeholder="Nome completo" /></Field>
        <Field label="Cargo / Função"><Input value={data.contratanteCargo} onChange={e => set("contratanteCargo", e.target.value)} placeholder="Diretor Administrativo" /></Field>
      </Section>

      {/* Contratada */}
      <Section title="Dados da Contratada">
        <Field label="Razão Social / Nome" className="md:col-span-2">
          <Input value={data.contratadaNome} onChange={e => set("contratadaNome", e.target.value)} placeholder="Consultoria em Faturamento Ltda." required />
        </Field>
        <Field label="CNPJ"><Input value={data.contratadaCNPJ} onChange={e => set("contratadaCNPJ", e.target.value)} placeholder="00.000.000/0001-00" /></Field>
        <Field label="Endereço completo"><Input value={data.contratanteEnderecoCon} onChange={e => set("contratanteEnderecoCon", e.target.value)} placeholder="Rua, nº, Bairro, CEP" /></Field>
        <Field label="Cidade"><Input value={data.contratadaCidade} onChange={e => set("contratadaCidade", e.target.value)} placeholder="São Paulo" /></Field>
        <Field label="Estado"><Input value={data.contratadaEstado} onChange={e => set("contratadaEstado", e.target.value)} placeholder="SP" /></Field>
        <Field label="Representante Legal"><Input value={data.contratadaRepresentante} onChange={e => set("contratadaRepresentante", e.target.value)} placeholder="Nome completo" /></Field>
        <Field label="Cargo / Função"><Input value={data.contratadaCargo} onChange={e => set("contratadaCargo", e.target.value)} placeholder="Sócia-Consultora" /></Field>
      </Section>

      {/* Serviços */}
      <Section title="Escopo de Serviços">
        <div className="md:col-span-2">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Selecione os serviços que serão prestados:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {servicosDisponiveis.map(servico => (
              <label key={servico} className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                data.servicos.includes(servico) ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"
              }`}>
                <Checkbox checked={data.servicos.includes(servico)} onCheckedChange={() => toggleServico(servico)} className="mt-0.5" />
                <span className="text-sm leading-snug">{servico}</span>
              </label>
            ))}
          </div>
        </div>
        <Field label="Descrição adicional dos serviços" className="md:col-span-2">
          <Textarea value={data.descricaoServicos} onChange={e => set("descricaoServicos", e.target.value)} placeholder="Descreva serviços adicionais ou detalhes específicos do escopo..." rows={3} />
        </Field>
      </Section>

      {/* Carga Horária */}
      {(data.secaoConsultoria || data.secaoFaturamento) && (
        <Section title="Carga Horária">
          {data.secaoConsultoria && (<>
            <Field label="Horas de Consultoria (semanal)"><Input value={data.horasConsultoriaSemanal} onChange={e => set("horasConsultoriaSemanal", e.target.value)} placeholder="5" /></Field>
            <Field label="Responsável pela Consultoria"><Input value={data.responsavelConsultoria} onChange={e => set("responsavelConsultoria", e.target.value)} placeholder="Nome do responsável" /></Field>
          </>)}
          {data.secaoFaturamento && (<>
            <Field label="Horas de Gerência (semanal)"><Input value={data.horasGerenciaSemanal} onChange={e => set("horasGerenciaSemanal", e.target.value)} placeholder="40" /></Field>
            <Field label="Responsável pela Gerência"><Input value={data.responsavelGerencia} onChange={e => set("responsavelGerencia", e.target.value)} placeholder="Nome do responsável" /></Field>
          </>)}
        </Section>
      )}

      {/* Valores */}
      <Section title="Valores e Pagamento">
        <div className="md:col-span-2">
          <Label className="text-sm font-semibold text-foreground mb-3 block">Modelo de Cobrança</Label>
          <div className="flex flex-wrap gap-4">
            {[{ key: "fixo", label: "Valor Fixo Mensal" }, { key: "hora", label: "Valor por Hora" }, { key: "percentual", label: "% sobre Convênios" }].map(modelo => (
              <label key={modelo.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={data.modelosCobranca?.includes(modelo.key) ?? (modelo.key === "fixo")} onCheckedChange={checked => {
                  const current = data.modelosCobranca ?? ["fixo"];
                  const updated = checked ? [...current, modelo.key] : current.filter(m => m !== modelo.key);
                  set("modelosCobranca", updated.length > 0 ? updated : ["fixo"]);
                }} />
                <span className="text-sm">{modelo.label}</span>
              </label>
            ))}
          </div>
        </div>
        {(data.modelosCobranca ?? ["fixo"]).includes("fixo") && (
          <Field label="Valor Mensal (R$)"><Input value={data.valorMensal} onChange={e => set("valorMensal", e.target.value)} placeholder="5.000,00" /></Field>
        )}
        {(data.modelosCobranca ?? ["fixo"]).includes("hora") && (
          <Field label="Valor por Hora (R$)"><Input value={data.valorHora} onChange={e => set("valorHora", e.target.value)} placeholder="150,00" /></Field>
        )}
        {(data.modelosCobranca ?? ["fixo"]).includes("percentual") && (<>
          <Field label="% sobre Recebimento dos Convênios"><Input value={data.valorPercentualConvenio} onChange={e => set("valorPercentualConvenio", e.target.value)} placeholder="Ex: 5" /></Field>
          <Field label="Descrição da cobrança por %" className="md:col-span-2"><Input value={data.descricaoPercentualConvenio} onChange={e => set("descricaoPercentualConvenio", e.target.value)} placeholder="Ex: sobre o valor líquido recebido dos convênios de saúde" /></Field>
        </>)}
        <Field label="Forma de Pagamento"><Input value={data.formaPagamento} onChange={e => set("formaPagamento", e.target.value)} placeholder="Transferência bancária (TED/PIX)" /></Field>
        <Field label="Dia de Vencimento"><Input value={data.diaVencimento} onChange={e => set("diaVencimento", e.target.value)} placeholder="10" /></Field>
        <Field label="Multa por Inadimplência (%)"><Input value={data.multaInadimplencia} onChange={e => set("multaInadimplencia", e.target.value)} placeholder="2" /></Field>
        <Field label="Juros de Mora (%/mês)"><Input value={data.jurosMora} onChange={e => set("jurosMora", e.target.value)} placeholder="1" /></Field>
        <Field label="Prazo Inadimplência p/ Rescisão (dias)"><Input value={data.prazoInadimplencia} onChange={e => set("prazoInadimplencia", e.target.value)} placeholder="30" /></Field>
        <Field label="Prazo do Contrato (meses)"><Input value={data.prazoContrato} onChange={e => set("prazoContrato", e.target.value)} placeholder="12" /></Field>
        <Field label="Data de Início"><Input type="date" value={data.dataInicio} onChange={e => set("dataInicio", e.target.value)} /></Field>
        <Field label="Data de Término"><Input type="date" value={data.dataFim} onChange={e => set("dataFim", e.target.value)} /></Field>
      </Section>

      {/* Reajuste */}
      {data.secaoReajuste && (
        <Section title="Reajuste Anual">
          <Field label="Índice de Reajuste"><Input value={data.indiceReajuste} onChange={e => set("indiceReajuste", e.target.value)} placeholder="IGPM" /></Field>
        </Section>
      )}

      {/* Rescisão */}
      <Section title="Rescisão e Penalidades">
        <Field label="Multa por rescisão antecipada (meses)"><Input value={data.multaRescisao} onChange={e => set("multaRescisao", e.target.value)} placeholder="3" /></Field>
        <Field label="Prazo de aviso prévio (dias)"><Input value={data.prazoAviso} onChange={e => set("prazoAviso", e.target.value)} placeholder="30" /></Field>
        <Field label="Multa SaaS – % das parcelas vincendas"><Input value={data.multaRescisaoPercent} onChange={e => set("multaRescisaoPercent", e.target.value)} placeholder="100" /></Field>
        <Field label="% Passivo Trabalhista (rescisão Contratante)"><Input value={data.percentPassivoTrabalhista} onChange={e => set("percentPassivoTrabalhista", e.target.value)} placeholder="50" /></Field>
        <Field label="% Multa sobre Vincendas"><Input value={data.percentMultaVincendas} onChange={e => set("percentMultaVincendas", e.target.value)} placeholder="20" /></Field>
      </Section>

      {/* Sigilo */}
      {data.secaoSigilo && (
        <Section title="Sigilo">
          <Field label="Prazo de sigilo após encerramento (meses)"><Input value={data.prazoSigiloMeses} onChange={e => set("prazoSigiloMeses", e.target.value)} placeholder="12" /></Field>
        </Section>
      )}

      {/* SLA */}
      {data.secaoSLA && (
        <Section title="Nível de Serviço (SLA)">
          <Field label="Domínios / Plataformas" className="md:col-span-2"><Input value={data.dominiosSLA} onChange={e => set("dominiosSLA", e.target.value)} placeholder="easyvision.com.br e bi.easyvision.com.br" /></Field>
          <Field label="Disponibilidade garantida (%)"><Input value={data.slaDisponibilidade} onChange={e => set("slaDisponibilidade", e.target.value)} placeholder="99" /></Field>
          <Field label="Desconto por queda extra (%)"><Input value={data.slaDescontoPorQueda} onChange={e => set("slaDescontoPorQueda", e.target.value)} placeholder="5" /></Field>
          <Field label="Horas de queda para acionar desconto"><Input value={data.slaHorasQueda} onChange={e => set("slaHorasQueda", e.target.value)} placeholder="4" /></Field>
        </Section>
      )}

      {/* Foro e Assinatura */}
      <Section title="Foro e Assinatura">
        <Field label="Foro da Comarca"><Input value={data.foroComarca} onChange={e => set("foroComarca", e.target.value)} placeholder="Goiânia/GO" /></Field>
        <Field label="Local de Assinatura"><Input value={data.localAssinatura} onChange={e => set("localAssinatura", e.target.value)} placeholder="Goiânia, GO" /></Field>
        <Field label="Data de Assinatura"><Input value={data.dataAssinatura} onChange={e => set("dataAssinatura", e.target.value)} placeholder="18 de fevereiro de 2026" /></Field>
      </Section>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg" className="gap-2">
          <FileText className="w-4 h-4" />
          {isEditing ? "Salvar Alterações" : "Gerar Contrato"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

// ==================== VISUALIZADOR DE CONTRATO ====================
function Clause({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="font-semibold text-base mb-2 text-primary">{number} – {title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}

function ContractViewer({ data, onBack, onSave }: { data: ContractData; onBack: () => void; onSave: (data: ContractData) => void }) {
  const handlePrint = () => window.print();
  const handleExportDocx = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
      const { saveAs } = await import("file-saver");
      const children: any[] = [];
      const heading = (text: string) => new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text, bold: true, size: 24, font: "Arial" })] });
      const para = (text: string) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text, size: 22, font: "Arial" })] });

      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "CONTRATO COMERCIAL", bold: true, size: 20, font: "Arial" })] }));
      const subtitles: string[] = [];
      if (data.secaoConsultoria) subtitles.push("Consultoria");
      if (data.secaoFaturamento) subtitles.push("Faturamento");
      if (data.secaoAuditoria) subtitles.push("Auditoria");
      if (data.secaoBI) subtitles.push("Business Intelligence");
      const subtitle = subtitles.length > 0 ? subtitles.join(", ") + " Hospitalar" : "Serviços Hospitalares";
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Contrato de Prestação de Serviços", bold: true, size: 28, font: "Arial" })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: subtitle, bold: true, size: 24, font: "Arial" })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `${data.localAssinatura || "_____"}, ${data.dataAssinatura || "_____"}`, size: 20, font: "Arial", italics: true })] }));

      // Partes
      children.push(heading("I – DAS PARTES CONTRATANTES"));
      children.push(para(`1. ${data.contratanteNome || "[CONTRATANTE]"}, CNPJ ${data.contratanteCNPJ || "[CNPJ]"}, ${data.contratanteEndereco || "[ENDEREÇO]"}, ${data.contratanteCidade || "[CIDADE]"} – ${data.contratanteEstado || "[UF]"}${data.contratanteRepresentante ? `, representada por ${data.contratanteRepresentante}` : ""}, doravante CONTRATANTE;`));
      children.push(para(`2. ${data.contratadaNome || "[CONTRATADA]"}, CNPJ ${data.contratadaCNPJ || "[CNPJ]"}, ${data.contratanteEnderecoCon || "[ENDEREÇO]"}, ${data.contratadaCidade || "[CIDADE]"} – ${data.contratadaEstado || "[UF]"}${data.contratadaRepresentante ? `, representada por ${data.contratadaRepresentante}` : ""}, doravante CONTRATADA;`));

      let clauseNum = 0;
      const nextClause = () => { clauseNum++; return `CLÁUSULA ${clauseNum}ª`; };

      // Objeto
      children.push(heading(`${nextClause()} – DO OBJETO`));
      children.push(para("O presente contrato tem por objetivo a prestação dos seguintes serviços:"));
      (data.servicos.length > 0 ? data.servicos : ["Serviços conforme acordado"]).forEach(s => children.push(para(`  › ${s}`)));

      // Obrigações
      children.push(heading(`${nextClause()} – DAS OBRIGAÇÕES DA CONTRATADA`));
      children.push(para("a) Prestar os serviços descritos com técnica, ética e zelo profissional;"));
      if (data.secaoFaturamento) children.push(para("b) Realizar análise de documentos, conferência de guias e emissão de faturas;"));
      if (data.secaoGlosas) children.push(para("c) Proceder à verificação e recurso de glosas junto aos convênios;"));

      children.push(heading(`${nextClause()} – DA INDEPENDÊNCIA DAS PARTES`));
      children.push(para("A CONTRATADA é responsável pela contratação de pessoal, sem vínculo empregatício com o CONTRATANTE."));

      children.push(heading(`${nextClause()} – DAS OBRIGAÇÕES DO CONTRATANTE`));
      children.push(para("Fornecer acesso a documentos e sistemas necessários; efetuar pagamentos conforme estabelecido."));

      // Valor
      children.push(heading(`${nextClause()} – DO VALOR DOS SERVIÇOS`));
      if (data.valorMensal) children.push(para(`Valor mensal: R$ ${data.valorMensal}, via ${data.formaPagamento}, vencimento dia ${data.diaVencimento}.`));
      if (data.valorHora) children.push(para(`Valor por hora técnica: R$ ${data.valorHora}.`));
      if (data.valorPercentualConvenio) children.push(para(`Remuneração variável: ${data.valorPercentualConvenio}% ${data.descricaoPercentualConvenio || "sobre convênios"}.`));

      // Vigência
      children.push(heading(`${nextClause()} – DA VIGÊNCIA`));
      children.push(para(`Vigência de ${data.prazoContrato || "12"} meses, a contar de ${formatDateContract(data.dataInicio)}.`));

      // Rescisão
      children.push(heading(`${nextClause()} – DA RESCISÃO`));
      children.push(para(`Aviso prévio de ${data.prazoAviso || "30"} dias. Multa: ${data.multaRescisao || "3"} mensalidade(s).`));

      if (data.secaoReajuste) { children.push(heading(`${nextClause()} – DO REAJUSTE`)); children.push(para(`Reajuste anual pelo ${data.indiceReajuste || "IGPM"}.`)); }
      if (data.secaoSLA) { children.push(heading(`${nextClause()} – DO SLA`)); children.push(para(`Disponibilidade de ${data.slaDisponibilidade || "99"}% para ${data.dominiosSLA}.`)); }
      if (data.secaoSigilo) { children.push(heading(`${nextClause()} – DO SIGILO`)); children.push(para(`Sigilo por ${data.prazoSigiloMeses || "12"} meses após encerramento.`)); }

      children.push(heading(`${nextClause()} – DO FORO`));
      children.push(para(`Foro da Comarca de ${data.foroComarca || "Goiânia/GO"}.`));

      // Assinaturas
      children.push(new Paragraph({ spacing: { before: 600 } }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "________________________________________", size: 22, font: "Arial" })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.contratanteNome || "[CONTRATANTE]", bold: true, size: 22, font: "Arial" })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "CONTRATANTE", size: 18, font: "Arial" })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "________________________________________", size: 22, font: "Arial" })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: data.contratadaNome || "[CONTRATADA]", bold: true, size: 22, font: "Arial" })] }));
      children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "CONTRATADA", size: 18, font: "Arial" })] }));

      const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Contrato_${(data.contratanteNome || "Documento").replace(/\s+/g, "_")}.docx`);
      toast.success("Contrato exportado para Word!");
    } catch (err) {
      toast.error("Erro ao exportar DOCX");
      console.error(err);
    }
  };

  const servicosList = data.servicos.length > 0 ? data.servicos : ["Serviços conforme acordado entre as partes"];
  let clauseNum = 0;
  const nextClause = () => { clauseNum++; return `CLÁUSULA ${clauseNum}ª`; };
  const subtitles: string[] = [];
  if (data.secaoConsultoria) subtitles.push("Consultoria");
  if (data.secaoFaturamento) subtitles.push("Faturamento");
  if (data.secaoAuditoria) subtitles.push("Auditoria");
  if (data.secaoBI) subtitles.push("Business Intelligence");
  const subtitle = subtitles.length > 0 ? subtitles.join(", ") + " Hospitalar" : "Serviços Hospitalares";

  return (
    <div>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap print:hidden">
        <Button variant="outline" onClick={onBack} className="gap-2"><ArrowLeft className="w-4 h-4" /> Editar Dados</Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onSave(data)} className="gap-2"><Download className="w-4 h-4" /> Salvar no Sistema</Button>
          <Button variant="outline" onClick={handleExportDocx} className="gap-2"><FileDown className="w-4 h-4" /> Exportar Word</Button>
          <Button onClick={handlePrint} className="gap-2"><Printer className="w-4 h-4" /> Imprimir / PDF</Button>
        </div>
      </div>

      {/* Contract Document */}
      <div className="bg-card rounded-lg border border-border shadow-lg p-8 md:p-14 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 pb-8 border-b-2 border-primary">
          <div className="inline-block bg-primary px-6 py-2 rounded mb-4">
            <p className="text-primary-foreground text-xs font-semibold tracking-widest uppercase">Contrato Comercial</p>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary leading-tight">Contrato de Prestação de Serviços</h1>
          <h2 className="text-lg md:text-xl font-semibold text-muted-foreground mt-1">{subtitle}</h2>
          <p className="text-sm text-muted-foreground mt-3">{data.localAssinatura || "_____________________"}, {data.dataAssinatura || "_____________________"}</p>
        </div>

        {/* I – DAS PARTES */}
        <div className="mb-8">
          <h3 className="font-semibold text-base mb-3 text-primary">I – DAS PARTES CONTRATANTES</h3>
          <div className="bg-secondary rounded-md p-5 text-sm leading-relaxed">
            <p>1. <strong>{data.contratanteNome || "[NOME DO CONTRATANTE]"}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>{data.contratanteCNPJ || "[CNPJ]"}</strong>, com sede em <strong>{data.contratanteEndereco || "[ENDEREÇO]"}, {data.contratanteCidade || "[CIDADE]"} – {data.contratanteEstado || "[UF]"}</strong>{data.contratanteRepresentante && <>, neste ato representada por <strong>{data.contratanteRepresentante}</strong>{data.contratanteCargo && <>, {data.contratanteCargo}</>}</>}, doravante denominado(a) <strong>CONTRATANTE</strong>;</p>
            <p className="mt-4">2. <strong>{data.contratadaNome || "[NOME DA CONTRATADA]"}</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <strong>{data.contratadaCNPJ || "[CNPJ]"}</strong>, com sede em <strong>{data.contratanteEnderecoCon || "[ENDEREÇO]"}, {data.contratadaCidade || "[CIDADE]"} – {data.contratadaEstado || "[UF]"}</strong>{data.contratadaRepresentante && <>, neste ato representada por <strong>{data.contratadaRepresentante}</strong>{data.contratadaCargo && <>, {data.contratadaCargo}</>}</>}, doravante denominada <strong>CONTRATADA</strong>;</p>
            <p className="mt-4">As partes acima descritas têm entre si justas e contratadas o presente Contrato de prestação de serviços que se regerá pelas cláusulas e condições a seguir descritas.</p>
          </div>
        </div>

        {/* DO OBJETO */}
        <Clause number={nextClause()} title="DO OBJETO">
          <p>O presente contrato tem por objetivo a prestação, por parte da CONTRATADA, dos seguintes serviços:</p>
          <ul className="list-none space-y-1 mt-2 pl-4 border-l-2 border-primary">
            {servicosList.map((s, i) => (<li key={i} className="flex gap-2"><span className="text-primary font-bold mt-0.5">›</span><span>{s}</span></li>))}
          </ul>
          {data.descricaoServicos && <p className="mt-3 bg-muted rounded p-3 text-sm"><strong>Detalhes adicionais:</strong> {data.descricaoServicos}</p>}
          {data.secaoConsultoria && <p className="mt-2">Parágrafo Primeiro – Entende-se por consultoria todas as ações e procedimentos relevantes à análise dos prontuários, rotatividade de pacientes e valores das tabelas.</p>}
          {data.secaoFaturamento && <p className="mt-2">{data.secaoConsultoria ? "Parágrafo Segundo" : "Parágrafo Primeiro"} – Entende-se por faturamento todas as ações relevantes à confecção de documento final para ser apresentado aos clientes particulares e/ou convênios saúde.</p>}
        </Clause>

        {/* OBRIGAÇÕES DA CONTRATADA */}
        <Clause number={nextClause()} title="DAS OBRIGAÇÕES DA CONTRATADA">
          <p>São responsabilidades da CONTRATADA:</p>
          <p>a) Prestar os serviços descritos com técnica, ética e zelo profissional, observando as normas legais;</p>
          {data.secaoFaturamento && <p>b) Quando da entrega do prontuário, realizar a análise de todos os documentos: conferindo evolução, prescrição, emissão de faturas, conferência de guias e autorizações;</p>}
          {data.secaoGlosas && <p>{data.secaoFaturamento ? "c" : "b"}) Proceder à verificação, análise e apresentação de recursos tempestivos contra os convênios, nos casos de glosa;</p>}
          <p>Cumprir as disposições da LGPD (Lei nº 13.709/2018) no tratamento de dados pessoais e sensíveis.</p>
        </Clause>

        {/* INDEPENDÊNCIA */}
        <Clause number={nextClause()} title="DA INDEPENDÊNCIA DAS PARTES">
          <p>É de responsabilidade da CONTRATADA a contratação de pessoal para execução dos serviços, bem como os pagamentos dos honorários profissionais, descaracterizando-se qualquer vínculo empregatício com o CONTRATANTE.</p>
        </Clause>

        {/* OBRIGAÇÕES DO CONTRATANTE */}
        <Clause number={nextClause()} title="DAS OBRIGAÇÕES DO CONTRATANTE">
          <p>O CONTRATANTE compromete-se a:</p>
          <p>a) Fornecer à CONTRATADA acesso a todos os documentos, sistemas e informações necessários;</p>
          <p>b) Efetuar o pagamento dos honorários nas condições estabelecidas;</p>
          <p>c) Designar interlocutor responsável para acompanhamento dos serviços;</p>
          {data.secaoInfraContratante && <p className="mt-2">Parágrafo Primeiro – O CONTRATANTE disponibilizará área interna ou acesso remoto para uso da CONTRATADA, com mobiliário adequado, computadores e impressoras.</p>}
        </Clause>

        {/* CARGA HORÁRIA */}
        {(data.secaoConsultoria || data.secaoFaturamento) && (
          <Clause number={nextClause()} title="DO TEMPO DE TRABALHO">
            {data.secaoConsultoria && <p>A CONTRATADA realizará o serviço de consultoria no período de <strong>{data.horasConsultoriaSemanal || "5"} horas por semana</strong>{data.responsavelConsultoria && <>, sendo a responsável <strong>{data.responsavelConsultoria}</strong></>}.</p>}
            {data.secaoFaturamento && <p>A CONTRATADA realizará o serviço de gerência do faturamento no período de <strong>{data.horasGerenciaSemanal || "40"} horas por semana</strong>{data.responsavelGerencia && <>, sendo a responsável <strong>{data.responsavelGerencia}</strong></>}.</p>}
          </Clause>
        )}

        {/* VALOR */}
        <Clause number={nextClause()} title="DO VALOR DOS SERVIÇOS E PAGAMENTO">
          {(data.modelosCobranca ?? ["fixo"]).includes("fixo") && <p>O CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>R$ {data.valorMensal || "___________"}</strong>, mediante <strong>{data.formaPagamento || "transferência bancária"}</strong>, com vencimento todo dia <strong>{data.diaVencimento || "10"}</strong> do mês seguinte.</p>}
          {(data.modelosCobranca ?? ["fixo"]).includes("hora") && data.valorHora && <p>Serviços avulsos serão remunerados à razão de <strong>R$ {data.valorHora}</strong> por hora técnica.</p>}
          {(data.modelosCobranca ?? ["fixo"]).includes("percentual") && data.valorPercentualConvenio && <p>Remuneração variável de <strong>{data.valorPercentualConvenio}%</strong> {data.descricaoPercentualConvenio || "sobre o valor líquido dos convênios"}.</p>}
          <p>Multa de <strong>{data.multaInadimplencia || "2"}%</strong> + juros de <strong>{data.jurosMora || "1"}%</strong>/mês em caso de atraso.</p>
          <p>Inadimplência superior a <strong>{data.prazoInadimplencia || "30"} dias</strong> dará direito à rescisão.</p>
        </Clause>

        {/* REAJUSTE */}
        {data.secaoReajuste && (
          <Clause number={nextClause()} title="DO REAJUSTE ANUAL">
            <p>Os valores serão reajustados anualmente pelo <strong>{data.indiceReajuste || "IGPM"}</strong>, mediante comunicação prévia de 30 dias.</p>
          </Clause>
        )}

        {/* VIGÊNCIA */}
        <Clause number={nextClause()} title="DA VIGÊNCIA">
          <p>Vigência de <strong>{data.prazoContrato || "12"} meses</strong>, a contar de <strong>{formatDateContract(data.dataInicio)}</strong>{data.dataFim && <> com término em <strong>{formatDateContract(data.dataFim)}</strong></>}, podendo ser renovado mediante acordo escrito com antecedência de <strong>{data.prazoAviso || "30"} dias</strong>.</p>
        </Clause>

        {/* RESCISÃO */}
        <Clause number={nextClause()} title="DA RESCISÃO E PENALIDADES">
          <p>Rescisão mediante notificação com antecedência de <strong>{data.prazoAviso || "30"} dias</strong>.</p>
          <p>§1º Rescisão antecipada: <strong>{data.percentPassivoTrabalhista || "50"}%</strong> do passivo trabalhista + multa de <strong>{data.percentMultaVincendas || "20"}%</strong> das parcelas vincendas.</p>
          <p>§2º Multa adicional de <strong>{data.multaRescisao || "3"} mensalidade(s)</strong>.</p>
          <p>§3º Fidelidade: multa de <strong>{data.multaRescisaoPercent || "100"}%</strong> das parcelas vincendas.</p>
        </Clause>

        {/* SLA */}
        {data.secaoSLA && (
          <Clause number={nextClause()} title="DO NÍVEL DE SERVIÇO (SLA)">
            <p>Disponibilidade de <strong>{data.slaDisponibilidade || "99"}%</strong> para <strong>{data.dominiosSLA}</strong>.</p>
            <p>§1º Desconto de <strong>{data.slaDescontoPorQueda || "5"}%</strong> por cada <strong>{data.slaHorasQueda || "4"} horas</strong> de queda adicional.</p>
          </Clause>
        )}

        {/* SIGILO */}
        {data.secaoSigilo && (
          <Clause number={nextClause()} title="DO SIGILO">
            <p>As partes manterão sigilo por <strong>{data.prazoSigiloMeses || "12"} meses</strong> após o encerramento do contrato.</p>
          </Clause>
        )}

        {/* LGPD */}
        <Clause number={nextClause()} title="DA CONFIDENCIALIDADE E LGPD">
          <p>A CONTRATADA declara conformidade com a LGPD (Lei nº 13.709/2018), garantindo criptografia e acesso restrito aos dados.</p>
        </Clause>

        {/* PROPRIEDADE INTELECTUAL */}
        <Clause number={nextClause()} title="DA PROPRIEDADE INTELECTUAL">
          <p>Relatórios e documentos produzidos serão de propriedade do CONTRATANTE.</p>
        </Clause>

        {/* REGISTRO */}
        {data.secaoRegistroCartorio && (
          <Clause number={nextClause()} title="DO REGISTRO">
            <p>Este contrato deverá ser registrado no Cartório de Registro de Títulos e Documentos.</p>
          </Clause>
        )}

        {/* TÍTULO EXECUTIVO */}
        {data.secaoTituloExecutivo && (
          <Clause number={nextClause()} title="DO TÍTULO EXECUTIVO">
            <p>O presente instrumento é válido como título executivo extrajudicial.</p>
          </Clause>
        )}

        {/* FORO */}
        <Clause number={nextClause()} title="DO FORO">
          <p>Foro da Comarca de <strong>{data.foroComarca || "Goiânia/GO"}</strong>, com renúncia de qualquer outro.</p>
        </Clause>

        {/* Assinaturas */}
        <div className="mt-12 pt-8 border-t-2 border-primary text-center">
          <p className="text-sm mb-8">Assim, justos e contratados, firmam o presente instrumento em 2 (duas) vias de igual teor.</p>
          <p className="font-semibold mb-8">{data.localAssinatura || "_____________________"}, {data.dataAssinatura || "_____________________"}</p>
          <div className="grid grid-cols-2 gap-12 mt-12">
            <div>
              <div className="border-t border-foreground pt-2 mx-8">
                <p className="font-bold">{data.contratanteNome || "[CONTRATANTE]"}</p>
                {data.contratanteRepresentante && <p className="text-sm text-muted-foreground">{data.contratanteRepresentante}</p>}
                <p className="text-xs text-muted-foreground mt-1">CONTRATANTE</p>
              </div>
            </div>
            <div>
              <div className="border-t border-foreground pt-2 mx-8">
                <p className="font-bold">{data.contratadaNome || "[CONTRATADA]"}</p>
                {data.contratadaRepresentante && <p className="text-sm text-muted-foreground">{data.contratadaRepresentante}</p>}
                <p className="text-xs text-muted-foreground mt-1">CONTRATADA</p>
              </div>
            </div>
          </div>
          <div className="mt-12">
            <p className="text-xs font-semibold text-muted-foreground mb-6">TESTEMUNHAS</p>
            <div className="grid grid-cols-2 gap-12">
              {[1, 2].map(i => (
                <div key={i} className="border-t border-foreground pt-2 mx-8">
                  <p className="text-sm">Nome: _______________________</p>
                  <p className="text-sm">CPF: ______________________</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================
function ContratosDashboard() {
  const dashboard = trpc.contratos.dashboard.useQuery();
  const d = dashboard.data;
  return (
    <div className="space-y-6">
      {dashboard.isLoading ? <div className="text-muted-foreground">Carregando...</div> : d ? (<>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500"><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Ativos</div><div className="text-3xl font-bold text-green-500">{d.ativos}</div></CardContent></Card>
          <Card className="border-l-4 border-l-amber-500"><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Vencendo em 30 dias</div><div className="text-3xl font-bold text-amber-500">{d.vencendoEm30}</div></CardContent></Card>
          <Card className="border-l-4 border-l-red-500"><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Vencidos</div><div className="text-3xl font-bold text-red-500">{d.vencidos}</div></CardContent></Card>
          <Card className="border-l-4 border-l-blue-500"><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Valor Mensal Total</div><div className="text-2xl font-bold text-blue-500">{formatCurrency(d.valorTotalMensal)}</div></CardContent></Card>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total</div><div className="text-2xl font-bold">{d.total}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Rascunhos</div><div className="text-2xl font-bold text-gray-500">{d.rascunhos}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Suspensos</div><div className="text-2xl font-bold text-amber-500">{d.suspensos}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Encerrados</div><div className="text-2xl font-bold text-red-500">{d.encerrados}</div></CardContent></Card>
        </div>
        {d.alertas && d.alertas.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Alertas de Vencimento</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {d.alertas.map((a: any, i: number) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${a.tipo === "vencido" ? "bg-red-500/10" : "bg-amber-500/10"}`}>
                    {a.tipo === "vencido" ? <XCircle className="h-5 w-5 text-red-500" /> : <Clock className="h-5 w-5 text-amber-500" />}
                    <div><span className="font-medium">{a.contrato.contratanteNome}</span><span className="text-sm text-muted-foreground ml-2">{a.tipo === "vencido" ? "Vencido" : "Vence"} em {formatDateBR(a.contrato.dataFim)}</span></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </>) : null}
    </div>
  );
}

// ==================== LISTA DE CONTRATOS ====================
function ListaContratos({ onEditContract }: { onEditContract: (data: ContractData, id: number) => void }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("");
  const utils = trpc.useUtils();
  const lista = trpc.contratos.listar.useQuery({ busca: busca || undefined, status: status && status !== "todos" ? (status as any) : undefined, limit: 100 });
  const excluir = trpc.contratos.excluir.useMutation({ onSuccess: () => { utils.contratos.invalidate(); toast.success("Contrato excluído!"); } });
  const alterarStatus = trpc.contratos.alterarStatus.useMutation({ onSuccess: () => { utils.contratos.invalidate(); toast.success("Status alterado!"); } });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar contratante..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contratante</TableHead>
                <TableHead>Contratada</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead className="text-right">Valor Mensal</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !lista.data?.items.length ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum contrato encontrado</TableCell></TableRow>
              ) : lista.data.items.map((c: any) => {
                const sc = statusConfig[c.status] || statusConfig.rascunho;
                const servicos = Array.isArray(c.servicos) ? c.servicos : [];
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.contratanteNome}</TableCell>
                    <TableCell className="text-sm">{c.contratadaNome || "-"}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{servicos.length > 0 ? `${servicos.length} serviço(s)` : "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.valorMensal)}</TableCell>
                    <TableCell>{formatDateBR(c.dataInicio)}</TableCell>
                    <TableCell>{formatDateBR(c.dataFim)}</TableCell>
                    <TableCell><Badge className={sc.color}>{sc.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" title="Editar" onClick={() => {
                          const dados = c.dadosCompletos || defaultContractData;
                          onEditContract({ ...defaultContractData, ...dados }, c.id);
                        }}><Pencil className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" title="Visualizar" onClick={() => {
                          const dados = c.dadosCompletos || defaultContractData;
                          onEditContract({ ...defaultContractData, ...dados, _viewOnly: true } as any, c.id);
                        }}><Eye className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" className="text-red-500" onClick={() => { if (confirm("Excluir contrato?")) excluir.mutate({ id: c.id }); }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== MÓDULO PRINCIPAL ====================
export default function ContratosModule() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [formMode, setFormMode] = useState<"list" | "form" | "view">("list");
  const [editingData, setEditingData] = useState<ContractData | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const criar = trpc.contratos.criar.useMutation({
    onSuccess: () => { utils.contratos.invalidate(); toast.success("Contrato salvo!"); setFormMode("list"); setEditingData(null); setEditingId(null); },
    onError: (e) => toast.error(e.message),
  });
  const atualizar = trpc.contratos.atualizar.useMutation({
    onSuccess: () => { utils.contratos.invalidate(); toast.success("Contrato atualizado!"); setFormMode("list"); setEditingData(null); setEditingId(null); },
    onError: (e) => toast.error(e.message),
  });

  const handleGenerate = (data: ContractData) => {
    setEditingData(data);
    setFormMode("view");
  };

  const handleSave = (data: ContractData) => {
    const payload = {
      contratanteNome: data.contratanteNome,
      contratanteCnpj: data.contratanteCNPJ,
      contratadaNome: data.contratadaNome,
      contratadaCnpj: data.contratadaCNPJ,
      servicos: data.servicos,
      modelosCobranca: data.modelosCobranca,
      valorMensal: data.valorMensal,
      valorHora: data.valorHora,
      valorPercentualConvenio: data.valorPercentualConvenio,
      prazoContrato: Number(data.prazoContrato) || undefined,
      dataInicio: data.dataInicio || undefined,
      dataFim: data.dataFim || undefined,
      status: "rascunho" as const,
      dadosCompletos: data,
    };
    if (editingId) {
      atualizar.mutate({ id: editingId, ...payload });
    } else {
      criar.mutate(payload);
    }
  };

  const handleEditContract = (data: ContractData, id: number) => {
    const viewOnly = (data as any)._viewOnly;
    if (viewOnly) {
      delete (data as any)._viewOnly;
      setEditingData(data);
      setEditingId(id);
      setFormMode("view");
    } else {
      setEditingData(data);
      setEditingId(id);
      setFormMode("form");
    }
    setActiveTab("novo");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <FileText className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Módulo de Contratos</h1>
          <p className="text-sm text-muted-foreground">Gestão completa de contratos hospitalares com 16 serviços e seções ativáveis</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "novo" && formMode === "list") { setFormMode("form"); setEditingData(null); setEditingId(null); } }}>
        <TabsList>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" /> Dashboard</TabsTrigger>
          <TabsTrigger value="contratos"><FileText className="h-4 w-4 mr-1" /> Contratos</TabsTrigger>
          <TabsTrigger value="novo"><Plus className="h-4 w-4 mr-1" /> {editingId ? "Editar" : "Novo"} Contrato</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard"><ContratosDashboard /></TabsContent>
        <TabsContent value="contratos"><ListaContratos onEditContract={handleEditContract} /></TabsContent>
        <TabsContent value="novo">
          {formMode === "view" && editingData ? (
            <ContractViewer data={editingData} onBack={() => setFormMode("form")} onSave={handleSave} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Editar Contrato" : "Novo Contrato"}</CardTitle>
              </CardHeader>
              <CardContent>
                <ContractForm onGenerate={handleGenerate} initialData={editingData || undefined} isEditing={!!editingId} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
