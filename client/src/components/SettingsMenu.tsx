import { useState } from "react";
import {
  ChevronDown,
  Settings,
  Database,
  Users,
  Bell,
  Download,
  Cog,
  Building2,
  Shield,
  DollarSign,
  FileText,
  ArrowLeftRight,
  Megaphone,
  Settings2,
  BookOpen,
  Brain,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type SettingsMenuItem = {
  icon: any;
  label: string;
  path: string;
  description?: string;
  section?: string;
  adminOnly?: boolean;
};

const settingsMenuItems: SettingsMenuItem[] = [
  // Cadastros
  {
    icon: Building2,
    label: "Estabelecimentos",
    path: "/estabelecimentos",
    description: "Gerenciar unidades e filiais",
    section: "Cadastros",
  },
  {
    icon: FileText,
    label: "Convênios",
    path: "/convenios",
    description: "Gerenciar convênios e planos",
    section: "Cadastros",
  },
  {
    icon: DollarSign,
    label: "Tabelas de Preço",
    path: "/tabelas-preco",
    description: "Gerenciar tabelas de preços",
    section: "Cadastros",
  },
  // Acesso
  {
    icon: Users,
    label: "Usuários e Permissões",
    path: "/gerenciar-permissoes",
    description: "Gerenciar usuários, roles e permissões",
    section: "Acesso",
  },
  // Integrações
  {
    icon: Database,
    label: "Integrador de Dados",
    path: "/integracao",
    description: "WARLEINE, TASY, OMNI, GESTHOR",
    section: "Integrações",
    adminOnly: true,
  },
  {
    icon: ArrowLeftRight,
    label: "Mapeamento Convênios",
    path: "/mapeamento-convenios",
    description: "Mapear códigos entre convênios",
    section: "Integrações",
    adminOnly: true,
  },
  // IA e Regras
  {
    icon: Brain,
    label: "Regras de IA",
    path: "/regras-ia",
    description: "Configurar regras de inteligência artificial",
    section: "IA e Regras",
    adminOnly: true,
  },
  {
    icon: BookOpen,
    label: "Dicionário de Glosas",
    path: "/dicionario-glosas",
    description: "Gerenciar dicionário de glosas",
    section: "IA e Regras",
  },
  // Comunicação
  {
    icon: Megaphone,
    label: "Avisos Internos",
    path: "/gerenciar-avisos",
    description: "Gerenciar avisos e comunicados",
    section: "Comunicação",
    adminOnly: true,
  },
  {
    icon: Bell,
    label: "Notificações",
    path: "/configuracoes/notificacoes",
    description: "Alertas e canais de notificação",
    section: "Comunicação",
  },
  // Sistema
  {
    icon: Download,
    label: "Backup e Dados",
    path: "/configuracoes/backup",
    description: "Exportar, importar, limpar",
    section: "Sistema",
  },
];

// Agrupar itens por seção
const sections = [
  { label: "Cadastros", items: settingsMenuItems.filter(i => i.section === "Cadastros") },
  { label: "Acesso", items: settingsMenuItems.filter(i => i.section === "Acesso") },
  { label: "Integrações", items: settingsMenuItems.filter(i => i.section === "Integrações") },
  { label: "IA e Regras", items: settingsMenuItems.filter(i => i.section === "IA e Regras") },
  { label: "Comunicação", items: settingsMenuItems.filter(i => i.section === "Comunicação") },
  { label: "Sistema", items: settingsMenuItems.filter(i => i.section === "Sistema") },
];

export function SettingsMenu() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Verificar se alguma rota de configurações está ativa
  const allPaths = settingsMenuItems.map(i => i.path);
  const isSettingsActive = allPaths.some(p => location === p || location.startsWith("/configuracoes"));

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={isSettingsActive}
            tooltip="Configurações"
            className={`h-10 transition-all font-normal text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent ${
              isSettingsActive
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : ""
            }`}
          >
            <Settings
              className={`h-4 w-4 ${
                isSettingsActive
                  ? "text-primary-foreground"
                  : "text-sidebar-foreground/60"
              }`}
            />
            <span>Configurações</span>
            <ChevronDown
              className={`ml-auto h-4 w-4 shrink-0 text-sidebar-foreground/60 transition-transform group-data-[state=open]/collapsible:rotate-180 ${
                isSettingsActive ? "text-primary-foreground" : ""
              }`}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {sections.map((section) => (
              <div key={section.label}>
                <div className="px-3 py-1.5 mt-1.5 first:mt-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/40">
                    {section.label}
                  </span>
                </div>
                {section.items.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <SidebarMenuSubItem key={item.path}>
                      <SidebarMenuSubButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        className={`transition-all font-normal text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : ""
                        }`}
                      >
                        <item.icon
                          className={`h-4 w-4 ${
                            isActive
                              ? "text-primary"
                              : "text-sidebar-foreground/50"
                          }`}
                        />
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </div>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
