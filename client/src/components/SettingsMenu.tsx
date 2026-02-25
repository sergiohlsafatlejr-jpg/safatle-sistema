import { useState } from "react";
import {
  ChevronDown,
  Settings,
  Sliders,
  Database,
  Users,
  Bell,
  Download,
  Cog,
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
};

const settingsMenuItems: SettingsMenuItem[] = [
  {
    icon: Cog,
    label: "Configurações Gerais",
    path: "/configuracoes/geral",
    description: "Nome, logo, tema",
  },
  {
    icon: Database,
    label: "Integração de Dados",
    path: "/configuracoes/integracao",
    description: "WARLEINE, TASY, OMNI, GESTHOR",
  },
  {
    icon: Users,
    label: "Usuários e Permissões",
    path: "/configuracoes/usuarios",
    description: "Gerenciar usuários, roles e permissões",
  },
  {
    icon: Bell,
    label: "Notificações",
    path: "/configuracoes/notificacoes",
    description: "Alertas e canais de notificação",
  },
  {
    icon: Download,
    label: "Backup e Dados",
    path: "/configuracoes/backup",
    description: "Exportar, importar, limpar",
  },
];

export function SettingsMenu() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isSettingsActive = location.startsWith("/configuracoes");
  const currentSettingsItem = settingsMenuItems.find(
    (item) => item.path === location
  );

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
            {settingsMenuItems.map((item) => {
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
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
