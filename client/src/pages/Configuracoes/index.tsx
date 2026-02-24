import { useLocation } from "wouter";
import ConfiguracoesGeral from "./ConfiguracoesGeral";
import ConfiguracoesIntegracao from "./ConfiguracoesIntegracao";
import ConfiguracoesUsuarios from "./ConfiguracoesUsuarios";
import ConfiguracoesNotificacoes from "./ConfiguracoesNotificacoes";
import ConfiguracoesBackup from "./ConfiguracoesBackup";

export default function Configuracoes() {
  const [location] = useLocation();

  switch (location) {
    case "/configuracoes/geral":
      return <ConfiguracoesGeral />;
    case "/configuracoes/integracao":
      return <ConfiguracoesIntegracao />;
    case "/configuracoes/usuarios":
      return <ConfiguracoesUsuarios />;
    case "/configuracoes/notificacoes":
      return <ConfiguracoesNotificacoes />;
    case "/configuracoes/backup":
      return <ConfiguracoesBackup />;
    default:
      return <ConfiguracoesGeral />;
  }
}
