import { Route, Switch } from "wouter";
import ConfiguracoesGeral from "./ConfiguracoesGeral";
import ConfiguracoesIntegracao from "./ConfiguracoesIntegracao";
import ConfiguracoesUsuarios from "./ConfiguracoesUsuarios";
import ConfiguracoesNotificacoes from "./ConfiguracoesNotificacoes";
import ConfiguracoesBackup from "./ConfiguracoesBackup";

export default function Configuracoes() {
  return (
    <Switch>
      <Route path="/configuracoes/geral" component={ConfiguracoesGeral} />
      <Route path="/configuracoes/integracao" component={ConfiguracoesIntegracao} />
      <Route path="/configuracoes/usuarios" component={ConfiguracoesUsuarios} />
      <Route path="/configuracoes/notificacoes" component={ConfiguracoesNotificacoes} />
      <Route path="/configuracoes/backup" component={ConfiguracoesBackup} />
      <Route component={ConfiguracoesGeral} />
    </Switch>
  );
}
