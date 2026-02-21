import { Bell, AlertCircle, AlertTriangle, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useMotorRegrasNotifications } from "@/hooks/useMotorRegrasNotifications";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export function MotorRegrasNotificationBell() {
  const { alerts, unreadCount, markAsRead, refresh } = useMotorRegrasNotifications({
    enabled: true,
    intervalMs: 30000,
    showToast: true,
  });

  const [, setLocation] = useLocation();

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case "critico":
        return <AlertOctagon className="w-4 h-4 text-red-600" />;
      case "alto":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "medio":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAlertBgColor = (tipo: string) => {
    switch (tipo) {
      case "critico":
        return "bg-red-50 hover:bg-red-100";
      case "alto":
        return "bg-orange-50 hover:bg-orange-100";
      case "medio":
        return "bg-yellow-50 hover:bg-yellow-100";
      default:
        return "bg-blue-50 hover:bg-blue-100";
    }
  };

  const handleAlertClick = (alertId: string) => {
    markAsRead(alertId);
    setLocation("/motor-regras");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Alertas do Motor de Regras"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-600"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Alertas do Motor de Regras</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} novo{unreadCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {alerts.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum alerta no momento</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 cursor-pointer rounded-md",
                  getAlertBgColor(alert.tipo),
                  alert.lido ? "opacity-60" : ""
                )}
                onClick={() => handleAlertClick(alert.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  {getAlertIcon(alert.tipo)}
                  <span className="font-semibold text-sm flex-1">{alert.titulo}</span>
                  {!alert.lido && (
                    <div className="w-2 h-2 bg-red-600 rounded-full" />
                  )}
                </div>
                <p className="text-xs text-gray-600 ml-6">{alert.mensagem}</p>
                <p className="text-xs text-gray-500 ml-6">
                  {alert.timestamp.toLocaleTimeString("pt-BR")}
                </p>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-center justify-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
          onClick={() => setLocation("/motor-regras")}
        >
          Ver Dashboard Completo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default MotorRegrasNotificationBell;
