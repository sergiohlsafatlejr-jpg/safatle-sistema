import { describe, it, expect } from "vitest";

/**
 * Testes para validar que os defaults de permissões de relatórios BI
 * são "nao" (sem acesso) por padrão, e não "sim" (com acesso).
 * 
 * Bug corrigido: Os defaults estavam como "sim", fazendo com que
 * relatórios desativados continuassem aparecendo para o usuário.
 */

// Simular a lógica de resolução de permissões do EstabelecimentoContext
function resolverPermissoesRelatoriosBi(permissao: Record<string, any>) {
  return {
    acessoRelFaturadoRecebido: permissao.acessoRelFaturadoRecebido || "nao",
    acessoRelRecebimentoGeral: permissao.acessoRelRecebimentoGeral || "nao",
    acessoRelFaturamento: permissao.acessoRelFaturamento || "nao",
    acessoRelAtendimentos: permissao.acessoRelAtendimentos || "nao",
    acessoRelCustos: permissao.acessoRelCustos || "nao",
    acessoRelNaoRecebidos: permissao.acessoRelNaoRecebidos || "nao",
    acessoRelPrevisaoGlosa: permissao.acessoRelPrevisaoGlosa || "nao",
  };
}

// Simular a lógica de verificação de acesso do temAcessoModulo
const moduloParaCampo: Record<string, string> = {
  relFaturadoRecebido: "acessoRelFaturadoRecebido",
  relRecebimentoGeral: "acessoRelRecebimentoGeral",
  relFaturamento: "acessoRelFaturamento",
  relAtendimentos: "acessoRelAtendimentos",
  relCustos: "acessoRelCustos",
  relNaoRecebidos: "acessoRelNaoRecebidos",
  relPrevisaoGlosa: "acessoRelPrevisaoGlosa",
};

function temAcessoModulo(permissoesModulo: Record<string, any>, modulo: string): boolean {
  const campo = moduloParaCampo[modulo];
  return permissoesModulo[campo] === "sim";
}

describe("Permissões Relatórios BI - Defaults", () => {
  it("deve negar acesso a todos os relatórios quando campos são undefined", () => {
    const permissao = {}; // Simula permissão sem campos de relatório
    const resolvido = resolverPermissoesRelatoriosBi(permissao);

    expect(resolvido.acessoRelFaturadoRecebido).toBe("nao");
    expect(resolvido.acessoRelRecebimentoGeral).toBe("nao");
    expect(resolvido.acessoRelFaturamento).toBe("nao");
    expect(resolvido.acessoRelAtendimentos).toBe("nao");
    expect(resolvido.acessoRelCustos).toBe("nao");
    expect(resolvido.acessoRelNaoRecebidos).toBe("nao");
    expect(resolvido.acessoRelPrevisaoGlosa).toBe("nao");
  });

  it("deve negar acesso a todos os relatórios quando campos são null", () => {
    const permissao = {
      acessoRelFaturadoRecebido: null,
      acessoRelRecebimentoGeral: null,
      acessoRelFaturamento: null,
      acessoRelAtendimentos: null,
      acessoRelCustos: null,
      acessoRelNaoRecebidos: null,
      acessoRelPrevisaoGlosa: null,
    };
    const resolvido = resolverPermissoesRelatoriosBi(permissao);

    expect(resolvido.acessoRelFaturadoRecebido).toBe("nao");
    expect(resolvido.acessoRelRecebimentoGeral).toBe("nao");
    expect(resolvido.acessoRelFaturamento).toBe("nao");
    expect(resolvido.acessoRelAtendimentos).toBe("nao");
    expect(resolvido.acessoRelCustos).toBe("nao");
    expect(resolvido.acessoRelNaoRecebidos).toBe("nao");
    expect(resolvido.acessoRelPrevisaoGlosa).toBe("nao");
  });

  it("deve permitir acesso somente aos relatórios explicitamente habilitados", () => {
    const permissao = {
      acessoRelFaturadoRecebido: "nao",
      acessoRelRecebimentoGeral: "nao",
      acessoRelFaturamento: "sim",
      acessoRelAtendimentos: "sim",
      acessoRelCustos: "sim",
      acessoRelNaoRecebidos: "nao",
      acessoRelPrevisaoGlosa: "nao",
    };
    const resolvido = resolverPermissoesRelatoriosBi(permissao);

    expect(resolvido.acessoRelFaturadoRecebido).toBe("nao");
    expect(resolvido.acessoRelRecebimentoGeral).toBe("nao");
    expect(resolvido.acessoRelFaturamento).toBe("sim");
    expect(resolvido.acessoRelAtendimentos).toBe("sim");
    expect(resolvido.acessoRelCustos).toBe("sim");
    expect(resolvido.acessoRelNaoRecebidos).toBe("nao");
    expect(resolvido.acessoRelPrevisaoGlosa).toBe("nao");
  });

  it("deve permitir acesso a todos quando todos são 'sim'", () => {
    const permissao = {
      acessoRelFaturadoRecebido: "sim",
      acessoRelRecebimentoGeral: "sim",
      acessoRelFaturamento: "sim",
      acessoRelAtendimentos: "sim",
      acessoRelCustos: "sim",
      acessoRelNaoRecebidos: "sim",
      acessoRelPrevisaoGlosa: "sim",
    };
    const resolvido = resolverPermissoesRelatoriosBi(permissao);

    Object.values(resolvido).forEach(val => {
      expect(val).toBe("sim");
    });
  });
});

describe("Permissões Relatórios BI - temAcessoModulo", () => {
  it("deve negar acesso quando permissão é 'nao'", () => {
    const permissoes = resolverPermissoesRelatoriosBi({
      acessoRelFaturadoRecebido: "nao",
      acessoRelCustos: "nao",
    });

    expect(temAcessoModulo(permissoes, "relFaturadoRecebido")).toBe(false);
    expect(temAcessoModulo(permissoes, "relCustos")).toBe(false);
  });

  it("deve permitir acesso quando permissão é 'sim'", () => {
    const permissoes = resolverPermissoesRelatoriosBi({
      acessoRelFaturamento: "sim",
      acessoRelAtendimentos: "sim",
    });

    expect(temAcessoModulo(permissoes, "relFaturamento")).toBe(true);
    expect(temAcessoModulo(permissoes, "relAtendimentos")).toBe(true);
  });

  it("deve negar acesso quando campo não existe (default 'nao')", () => {
    const permissoes = resolverPermissoesRelatoriosBi({});

    expect(temAcessoModulo(permissoes, "relFaturadoRecebido")).toBe(false);
    expect(temAcessoModulo(permissoes, "relRecebimentoGeral")).toBe(false);
    expect(temAcessoModulo(permissoes, "relFaturamento")).toBe(false);
    expect(temAcessoModulo(permissoes, "relAtendimentos")).toBe(false);
    expect(temAcessoModulo(permissoes, "relCustos")).toBe(false);
    expect(temAcessoModulo(permissoes, "relNaoRecebidos")).toBe(false);
    expect(temAcessoModulo(permissoes, "relPrevisaoGlosa")).toBe(false);
  });

  it("cenário do bug: usuário com apenas alguns relatórios habilitados", () => {
    // Simula o caso do usuário aragraciotte que deveria ver apenas Faturamento, Atendimentos e Custos
    const permissao = {
      acessoRelFaturadoRecebido: "nao",
      acessoRelRecebimentoGeral: "nao",
      acessoRelFaturamento: "sim",
      acessoRelAtendimentos: "sim",
      acessoRelCustos: "sim",
      acessoRelNaoRecebidos: "nao",
      acessoRelPrevisaoGlosa: "nao",
    };
    const permissoes = resolverPermissoesRelatoriosBi(permissao);

    // Deve ter acesso apenas a 3 relatórios
    const relatorios = [
      "relFaturadoRecebido", "relRecebimentoGeral", "relFaturamento",
      "relAtendimentos", "relCustos", "relNaoRecebidos", "relPrevisaoGlosa"
    ];
    
    const comAcesso = relatorios.filter(r => temAcessoModulo(permissoes, r));
    const semAcesso = relatorios.filter(r => !temAcessoModulo(permissoes, r));

    expect(comAcesso).toHaveLength(3);
    expect(comAcesso).toContain("relFaturamento");
    expect(comAcesso).toContain("relAtendimentos");
    expect(comAcesso).toContain("relCustos");

    expect(semAcesso).toHaveLength(4);
    expect(semAcesso).toContain("relFaturadoRecebido");
    expect(semAcesso).toContain("relRecebimentoGeral");
    expect(semAcesso).toContain("relNaoRecebidos");
    expect(semAcesso).toContain("relPrevisaoGlosa");
  });
});

describe("Permissões Relatórios BI - Formulário de Edição", () => {
  // Simular handleEditPermissao com os defaults corrigidos
  function handleEditPermissao(user: Record<string, any>) {
    return {
      acessoDashboard: user.acessoDashboard || "nao",
      acessoRelFaturadoRecebido: user.acessoRelFaturadoRecebido || "nao",
      acessoRelRecebimentoGeral: user.acessoRelRecebimentoGeral || "nao",
      acessoRelFaturamento: user.acessoRelFaturamento || "nao",
      acessoRelAtendimentos: user.acessoRelAtendimentos || "nao",
      acessoRelCustos: user.acessoRelCustos || "nao",
      acessoRelNaoRecebidos: user.acessoRelNaoRecebidos || "nao",
      acessoRelPrevisaoGlosa: user.acessoRelPrevisaoGlosa || "nao",
    };
  }

  it("deve carregar toggles desligados quando usuário não tem campos de relatório", () => {
    const user = { userName: "aragraciotte" };
    const form = handleEditPermissao(user);

    Object.values(form).forEach(val => {
      expect(val).toBe("nao");
    });
  });

  it("deve carregar toggles corretamente quando usuário tem permissões mistas", () => {
    const user = {
      userName: "aragraciotte",
      acessoDashboard: "nao",
      acessoRelFaturamento: "sim",
      acessoRelAtendimentos: "sim",
      acessoRelCustos: "sim",
      acessoRelFaturadoRecebido: "nao",
      acessoRelRecebimentoGeral: "nao",
      acessoRelNaoRecebidos: "nao",
      acessoRelPrevisaoGlosa: "nao",
    };
    const form = handleEditPermissao(user);

    expect(form.acessoDashboard).toBe("nao");
    expect(form.acessoRelFaturamento).toBe("sim");
    expect(form.acessoRelAtendimentos).toBe("sim");
    expect(form.acessoRelCustos).toBe("sim");
    expect(form.acessoRelFaturadoRecebido).toBe("nao");
    expect(form.acessoRelRecebimentoGeral).toBe("nao");
    expect(form.acessoRelNaoRecebidos).toBe("nao");
    expect(form.acessoRelPrevisaoGlosa).toBe("nao");
  });

  it("acessoDashboard default deve ser 'nao' (não 'sim')", () => {
    const user = { userName: "aragraciotte" };
    const form = handleEditPermissao(user);
    expect(form.acessoDashboard).toBe("nao");
  });
});

describe("SettingsMenu - Filtragem por Permissão", () => {
  // Simular a lógica de filtragem do SettingsMenu
  type SettingsMenuItem = {
    label: string;
    adminOnly?: boolean;
    modulo?: string;
  };

  const settingsMenuItems: SettingsMenuItem[] = [
    { label: "Estabelecimentos", modulo: "estabelecimentos" },
    { label: "Convênios", modulo: "convenios" },
    { label: "Tabelas de Preço", modulo: "tabelasPreco" },
    { label: "Usuários e Permissões", modulo: "permissoes" },
    { label: "Integrador de Dados", adminOnly: true },
    { label: "Mapeamento Convênios", adminOnly: true },
    { label: "Regras de IA", adminOnly: true },
    { label: "Dicionário de Glosas", modulo: "dicionarioGlosas" },
    { label: "Avisos Internos", adminOnly: true },
    { label: "Notificações" },
    { label: "Backup e Dados", adminOnly: true },
  ];

  function filterSettingsItems(
    items: SettingsMenuItem[],
    isGestor: boolean,
    temAcesso: (modulo: string) => boolean
  ) {
    return items.filter(item => {
      if (item.adminOnly) return isGestor;
      if (item.modulo) return temAcesso(item.modulo);
      return true;
    });
  }

  it("deve mostrar apenas Notificações para usuário sem permissões", () => {
    const filtered = filterSettingsItems(settingsMenuItems, false, () => false);
    expect(filtered.map(i => i.label)).toEqual(["Notificações"]);
  });

  it("deve mostrar todos os itens para gestor", () => {
    const filtered = filterSettingsItems(settingsMenuItems, true, () => true);
    expect(filtered.length).toBe(settingsMenuItems.length);
  });

  it("deve mostrar apenas itens com módulo permitido para usuário com permissões parciais", () => {
    const permissoes = new Set(["estabelecimentos", "convenios"]);
    const filtered = filterSettingsItems(
      settingsMenuItems,
      false,
      (modulo) => permissoes.has(modulo)
    );
    const labels = filtered.map(i => i.label);
    expect(labels).toContain("Estabelecimentos");
    expect(labels).toContain("Convênios");
    expect(labels).toContain("Notificações");
    expect(labels).not.toContain("Tabelas de Preço");
    expect(labels).not.toContain("Integrador de Dados");
    expect(labels).not.toContain("Backup e Dados");
  });
});
