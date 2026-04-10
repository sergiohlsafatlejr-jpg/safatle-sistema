# Manual de Documentação do Sistema Safatle Gerenciamento Hospitalar

**Versão:** 1.0  
**Data:** 06 de Março de 2026  
**Autor:** Manus AI  

---

## 1. Visão Geral do Sistema

O **Safatle Gerenciamento Hospitalar** (Hospital File Manager) é uma plataforma web desenvolvida para automatizar e gerenciar processos de faturamento hospitalar. O sistema centraliza o controle de arquivos XML enviados aos convênios de saúde e os retornos recebidos (Excel, PDF, XML), permitindo comparação automática, detecção de divergências, gestão de recursos de glosa e análise inteligente de padrões de cobrança.

A arquitetura é composta por um **backend Node.js/TypeScript** com Express e tRPC, um **frontend React** com Wouter e TanStack Query, e um banco de dados **MySQL** gerenciado via Drizzle ORM. O sistema se conecta opcionalmente a bancos externos (PostgreSQL do Warleine/Tasy) para sincronização de dados hospitalares.

---

## 2. Arquitetura de Módulos

O sistema está organizado em **12 módulos funcionais** principais, cada um com suas tabelas, routers e páginas correspondentes. A tabela abaixo apresenta a visão consolidada:

| # | Módulo | Descrição | Rota Sidebar |
|---|--------|-----------|--------------|
| 1 | Upload de Contas | Upload e processamento de XMLs TISS de faturamento | Upload Contas |
| 2 | Conta Convênio | Gestão operacional de contas por convênio com análise de padrões | Upload Contas > Conta Convênio |
| 3 | Recebimentos | Upload de XMLs e Excels de retorno dos convênios (demonstrativos) | Recebimentos |
| 4 | Demonstrativo | Visualização unificada dos demonstrativos de pagamento | Recebimentos > Demonstrativo |
| 5 | Regras de Contas | Comparação de contas, motor de regras e padrões de cobrança | Regras de Contas |
| 6 | Recurso de Glosa | Análise de glosas, criação de recursos e envio em lote | Recurso de Glosa |
| 7 | Conciliações | Cruzamento entre faturado e recebido (Conciliação Cruzada) | Conciliações |
| 8 | Relatórios BI | Dashboards analíticos, relatórios e previsão de glosa | Relatórios BI |
| 9 | Integrador de Dados | Conexões externas, sincronização e mapeamento de dados | Integração |
| 10 | Configurações | Convênios, estabelecimentos, tabelas de preço, permissões | Menu Configurações |
| 11 | Padrões de Cobrança | Gabaritos, padrões aprendidos, análise de preço/glosa/quantidade | Regras de Contas > Padrões |
| 12 | Atendimentos | Gestão de atendimentos consolidados e notificações | Relatórios BI > Atendimentos |

---

## 3. Mapeamento de Tabelas por Módulo

### 3.1. Módulo: Upload de Contas

Este módulo gerencia o upload de arquivos XML TISS enviados aos convênios. Ao processar um XML, os dados são extraídos e armazenados na tabela `staging_faturamento_xml`, e automaticamente migrados para `contas_convenio_itens` e `contas_convenio_resumo` para uso na tela de Conta Convênio.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `arquivos` | Metadados de cada arquivo enviado/retornado (nome, tipo, S3 URL, status, progresso) | INSERT, UPDATE, SELECT, DELETE |
| `staging_faturamento_xml` | Dados detalhados extraídos dos XMLs TISS (itens, valores, guias, profissionais) | INSERT (batch), SELECT, DELETE |
| `contas_convenio_itens` | Itens operacionais migrados do XML para gestão por convênio | INSERT (migração automática) |
| `contas_convenio_resumo` | Resumo por guia/conta (totais, paciente, competência) | INSERT (migração automática) |

**Páginas do Frontend:**
- `Upload.tsx` — Tela de upload com seleção de convênio, estabelecimento e data de referência
- `Arquivos.tsx` — Listagem de todos os arquivos com filtros e status de processamento

**Routers Backend:**
- `arquivos.upload` — Upload do arquivo para S3 e processamento do XML
- `arquivos.list` / `arquivos.get` — Listagem e detalhes de arquivos
- `faturamentoTiss.listar` / `faturamentoTiss.resumo` — Consulta dos dados TISS extraídos

**Fluxo de Dados:**
```
Arquivo XML → S3 (armazenamento) → arquivos (metadados)
                                  → staging_faturamento_xml (parsing XML)
                                  → contas_convenio_itens (migração automática)
                                  → contas_convenio_resumo (migração automática)
```

---

### 3.2. Módulo: Conta Convênio

Módulo operacional central que permite visualizar, filtrar e analisar contas por convênio. As contas podem vir de duas fontes: **XML importado** ou **busca direta no banco do cliente** (Warleine). Inclui comparação automática contra padrões de cobrança (gabaritos) e registro de divergências.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `contas_convenio_itens` | Itens individuais de cada conta (código, descrição, valor, quantidade) | INSERT, SELECT, UPDATE |
| `contas_convenio_resumo` | Cabeçalho/resumo de cada conta (totais, paciente, status de análise) | INSERT, SELECT, UPDATE |
| `padroesCobranca` | Padrões/gabaritos usados na comparação automática | SELECT (leitura) |
| `feedback_divergencias` | Decisões do auditor sobre divergências encontradas | INSERT, SELECT |
| `staging_faturamento_xml` | Fonte de dados para migração XML → contas_convenio | SELECT (leitura) |

**Páginas do Frontend:**
- `ContaConvenio.tsx` — Listagem de contas com filtros persistentes na URL (ano, mês, convênio, estabelecimento)
- `ContaConvenioDetalhes.tsx` — Detalhes de uma conta específica com itens e divergências

**Routers Backend (contasConvenioRouter):**
- `buscarConta` — Busca conta no banco externo (Warleine) e salva localmente
- `listarContas` — Listagem paginada com filtros de competência, convênio e estabelecimento
- `listarItens` — Itens de uma conta específica
- `compararComPadroes` — Compara conta contra gabaritos e retorna divergências
- `getDivergencias` — Lista divergências encontradas para uma conta
- `registrarFeedback` — Registra decisão do auditor (aceitar/rejeitar divergência)
- `migrarDadosXml` — Migra dados do staging_faturamento_xml para contas_convenio_itens
- `importarDeXml` — Importa XMLs específicos para a tabela operacional

**Fluxo de Dados:**
```
Fonte 1: staging_faturamento_xml ──migração──→ contas_convenio_itens + contas_convenio_resumo
Fonte 2: Banco Warleine ──buscarConta──→ contas_convenio_itens + contas_convenio_resumo

contas_convenio_itens ──comparação──→ padroesCobranca
                                    → divergências (JSON no item)
                                    → feedback_divergencias (decisões do auditor)
```

---

### 3.3. Módulo: Recebimentos (XML e Excel)

Gerencia os arquivos de retorno dos convênios (demonstrativos de pagamento). Suporta dois formatos: **XML TISS de retorno** e **Excel de retorno** (formato Unimed e outros). Os dados são parseados e armazenados em tabelas específicas por formato, além de uma tabela unificada (`demonstrativo`).

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `arquivos` | Metadados do arquivo de retorno (direção = "retornado") | INSERT, UPDATE, SELECT |
| `recebimento_tiss` | Dados detalhados do XML de retorno (guias, itens, valores pagos/glosados) | INSERT (batch), SELECT, DELETE |
| `recebimentos_excel` | Dados do Excel de retorno (formato Unimed: guia, item, valor pago, glosa) | INSERT (batch), SELECT, DELETE |
| `retorno_tiss_unificado` | Tabela unificada de retorno (XML + Excel) para consultas padronizadas | INSERT, SELECT |
| `demonstrativo` | Tabela consolidada de demonstrativos (XML + Excel) com classificação de glosa | INSERT (batch), SELECT, UPDATE, DELETE |

**Páginas do Frontend:**
- `RecebimentosXml.tsx` — Upload e listagem de XMLs de retorno
- `RecebimentosExcel.tsx` — Upload e listagem de Excels de retorno
- `Demonstrativo.tsx` — Visualização consolidada dos demonstrativos
- `DemonstrativoDetalhes.tsx` — Detalhes de um demonstrativo específico

**Routers Backend:**
- `recebimentoTiss.listar` / `recebimentoTiss.stats` — Consulta de dados de retorno XML
- `recebimentosExcel.listar` / `recebimentosExcel.resumo` — Consulta de dados de retorno Excel
- `demonstrativo.listarContas` / `demonstrativo.itensPorGuia` — Demonstrativo unificado

**Fluxo de Dados:**
```
XML Retorno → S3 → arquivos → recebimento_tiss → demonstrativo
Excel Retorno → S3 → arquivos → recebimentos_excel → demonstrativo
```

---

### 3.4. Módulo: Regras de Contas e Comparações

Módulo de validação que compara contas faturadas contra tabelas de preço, regras de negócio e padrões aprendidos. Gera alertas de divergência e insights de IA.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `comparacoes` | Registro de comparações entre arquivo enviado e retornado | INSERT, SELECT, UPDATE |
| `divergencias` | Divergências encontradas nas comparações (valor, quantidade, ausência) | INSERT, SELECT, UPDATE |
| `regrasNegocio` | Regras de composição de contas (procedimento X deve conter item Y) | INSERT, SELECT, UPDATE, DELETE |
| `itensRegraNegocio` | Itens obrigatórios/proibidos de cada regra de negócio | INSERT, SELECT, DELETE |
| `alertasDivergencia` | Alertas gerados pela validação (preço, regra, IA) | INSERT, SELECT, UPDATE |
| `historicoValidacoes` | Histórico de validações executadas | INSERT, SELECT |
| `historicoValidacaoXml` | Histórico de validações de XML com score de conformidade | INSERT, SELECT |
| `insightsIA` | Sugestões geradas pela análise de padrões (itens faltantes, outliers) | INSERT, SELECT, UPDATE |

**Páginas do Frontend:**
- `Comparacoes.tsx` — Listagem de comparações entre arquivos
- `DashboardMotorRegras.tsx` — Dashboard do motor de regras
- `RegrasNegocio.tsx` — CRUD de regras de negócio
- `HistoricoValidacaoXml.tsx` — Histórico de validações de XML

**Routers Backend:**
- `comparacoes.list` / `comparacoes.create` — Gestão de comparações
- `regrasNegocio.list` / `regrasNegocio.create` — CRUD de regras
- `alertas.pendentes` / `alertas.updateStatus` — Gestão de alertas
- `insightsIA.list` / `insightsIA.updateStatus` — Insights de IA
- `motorRegras.*` — Motor de regras automatizado

---

### 3.5. Módulo: Padrões de Cobrança (Gabaritos)

Módulo de aprendizado e definição de padrões. Analisa os XMLs importados para identificar quais itens normalmente acompanham cada procedimento, gerando padrões automáticos. Permite também criar **gabaritos manuais** (padrões definidos pelo auditor) com suporte a múltiplos procedimentos combinados e faixas de quantidade (Mín/Máx).

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `padroesCobranca` | Padrões aprendidos e gabaritos manuais (procedimento + itens esperados) | INSERT, SELECT, UPDATE, DELETE |
| `padraoPrecoConvenio` | Estatísticas de preço por item e convênio (média, min, max, desvio) | INSERT, SELECT, UPDATE |
| `padraoGlosaConvenio` | Taxa de glosa histórica por item e convênio | INSERT, SELECT, UPDATE |
| `padraoQuantidadeItem` | Estatísticas de quantidade por item (média, min, max, desvio) | INSERT, SELECT, UPDATE |
| `feedback_divergencias` | Feedback do auditor que refina os padrões ao longo do tempo | INSERT, SELECT |
| `faturamento_unificado`* | Fonte de dados para geração de padrões e autocomplete de códigos | SELECT (leitura) |

> *A tabela `faturamento_unificado` é uma tabela física (não uma view) populada pelo serviço `faturamentoUnificadoService.ts` a partir de três fontes: Warleine (`integ_faturado`), Tasy (`dadosTasy`) e XML TISS (`staging_faturamento_xml`).

**Páginas do Frontend:**
- `PadroesCobranca.tsx` — Listagem de padrões com filtros e navegação
- `CriarGabarito.tsx` — Tela dedicada para criação de gabaritos manuais com autocomplete
- `EditarPadrao.tsx` — Tela dedicada para edição de padrões existentes
- `DetalhesPadrao.tsx` — Tela dedicada de visualização (somente leitura) de detalhes

**Componentes Especiais:**
- `AutocompleteCodigoItem.tsx` — Componente de autocomplete que busca códigos no `faturamento_unificado`

**Routers Backend (padroesCobrancaRouter):**
- `gerarPadroesPreco` — Gera padrões de preço a partir do faturamento_unificado
- `gerarPadroesComposicao` — Gera padrões de composição (quais itens acompanham cada procedimento)
- `gerarPadroesGlosa` — Gera padrões de glosa por convênio
- `gerarPadroesQuantidade` — Gera padrões de quantidade por item
- `criarGabarito` — Cria gabarito manual com múltiplos procedimentos e itens
- `editarPadrao` — Edita padrão existente (itens, quantidades, status)
- `validarPadrao` — Aprova/rejeita/coloca em revisão um padrão
- `getPadraoDetalhes` — Retorna detalhes completos de um padrão
- `autocompleteCodigos` — Busca códigos no faturamento_unificado para autocomplete
- `registrarFeedback` — Registra feedback do auditor sobre divergências
- `estatisticasFeedback` — Estatísticas de feedbacks por padrão

**Fluxo de Dados:**
```
faturamento_unificado ──análise──→ padroesCobranca (padrões aprendidos)
                                 → padraoPrecoConvenio (estatísticas de preço)
                                 → padraoGlosaConvenio (taxas de glosa)
                                 → padraoQuantidadeItem (estatísticas de quantidade)

Auditor ──gabarito manual──→ padroesCobranca (isGabarito = 1)

contas_convenio_itens ──comparação──→ padroesCobranca
                                    → divergências
                                    → feedback_divergencias ──refina──→ padroesCobranca
```

---

### 3.6. Módulo: Recurso de Glosa

Módulo completo para gestão de recursos de glosa, desde a análise inicial até o envio em lote e acompanhamento de resultados. Inclui sugestão de argumentos por IA e dicionário de glosas TISS.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `recursosGlosa` | Recursos individuais de contestação de glosa | INSERT, SELECT, UPDATE, DELETE |
| `lotesRecurso` | Agrupamento de recursos para envio em lote (com XML TISS gerado) | INSERT, SELECT, UPDATE |
| `historicoRecursos` | Histórico de interações de cada recurso (criação, envio, resposta) | INSERT, SELECT |
| `historicoContestacoes` | Argumentos usados e resultados para aprendizado de IA | INSERT, SELECT |
| `argumentosConvenio` | Argumentos personalizados por convênio com taxa de sucesso | INSERT, SELECT, UPDATE |
| `decisoesGlosa` | Histórico de decisões (aceitar/recursar) para aprendizado automático | INSERT, SELECT |
| `motivosGlosa` | Dicionário de motivos de glosa (TISS + personalizados) | INSERT, SELECT, UPDATE, DELETE |
| `demonstrativo` | Fonte de dados para identificação de itens glosados | SELECT (leitura) |
| `regrasConciliacao` | Regras específicas por convênio (tolerância, formato retorno) | SELECT (leitura) |

**Páginas do Frontend:**
- `AnaliseGlosa.tsx` — Análise de itens glosados com classificação automática
- `RecursosGlosa.tsx` — Listagem de recursos criados
- `EnvioRecursosLote.tsx` — Criação e envio de lotes de recursos (com geração de XML TISS)
- `AcompanhamentoRecursos.tsx` — Acompanhamento de status dos recursos enviados
- `DicionarioGlosas.tsx` — Dicionário de motivos de glosa TISS e personalizados
- `HistoricoContestacoes.tsx` — Histórico de contestações com argumentos e resultados

**Routers Backend:**
- `glosa.porConvenio` / `glosa.porProcedimento` — Análise de glosas
- `recursos.create` / `recursos.update` / `recursos.list` — CRUD de recursos
- `recursos.criarLote` / `recursos.enviarLote` — Gestão de lotes
- `recursos.gerarXml` — Geração de XML TISS de recurso
- `ia.sugerirArgumento` — Sugestão de argumento por IA
- `motivosGlosa.list` / `motivosGlosa.create` — Dicionário de glosas

---

### 3.7. Módulo: Conciliações

Cruzamento entre dados faturados (Tasy/XML) e dados recebidos (demonstrativos) para identificar divergências de valor, itens não encontrados e glosas.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `conciliacao` | Resultado item a item da conciliação (faturado vs pago) | INSERT, SELECT, UPDATE |
| `resumoConciliacao` | Totais consolidados por período/convênio | INSERT, SELECT, UPDATE |
| `resultadosConciliacaoTasy` | Resultados de conciliação Tasy (totais por execução) | INSERT, SELECT, DELETE |
| `itensConciliacaoTasy` | Detalhes de cada conta conciliada | INSERT, SELECT |
| `detalhesItensConciliacaoTasy` | Detalhes de cada item dentro de uma conta conciliada | INSERT, SELECT |
| `vinculacaoCodigos` | De-para entre códigos do hospital e do convênio | INSERT, SELECT, UPDATE |
| `contasTasy` | Contas unificadas do Tasy (procedimentos + mat/med) | SELECT (leitura) |
| `demonstrativo` | Dados de retorno para cruzamento | SELECT (leitura) |
| `recebimento_geral` | Dados consolidados de recebimento para conciliação | SELECT (leitura) |

**Páginas do Frontend:**
- `ConciliacaoCruzada.tsx` — Tela principal de conciliação cruzada
- `ConciliacaoDetalhes.tsx` — Detalhes de uma conciliação específica
- `ConciliacaoContasFaturadas.tsx` — Contas faturadas do Tasy
- `ConciliacaoContasPagas.tsx` — Contas pagas (demonstrativo)
- `NaoRecebidos.tsx` — Itens faturados mas não recebidos

**Routers Backend:**
- `conciliacao.porConvenio` / `conciliacao.agrupadaPorConta` — Consultas de conciliação
- `conciliacao.itensNaoRecebidos` — Itens não encontrados no retorno
- `historicoConciliacao.listar` / `historicoConciliacao.detalhes` — Histórico

---

### 3.8. Módulo: Relatórios BI e Dashboards

Módulo analítico que consolida dados de múltiplas fontes para gerar dashboards, relatórios e previsões.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `recebimento_geral` | Dados consolidados de recebimento de todos os convênios | INSERT, SELECT |
| `faturamento_unificado`* | Dados unificados de faturamento para análise | SELECT (leitura) |
| `padroesContas` | Padrões de conta para sugestões de IA | SELECT (leitura) |
| `regrasIA` | Regras configuráveis para geração de alertas de IA | INSERT, SELECT, UPDATE, DELETE |
| `demonstrativo` | Dados de demonstrativo para relatórios | SELECT (leitura) |
| `staging_faturamento_xml` | Dados TISS para relatórios de faturamento | SELECT (leitura) |

**Páginas do Frontend:**
- `Home.tsx` (Dashboard) — Dashboard principal com métricas resumidas
- `DashboardConsolidado.tsx` — Dashboard consolidado multi-estabelecimento (admin)
- `DashboardIA.tsx` — Dashboard de inteligência artificial
- `DashboardProdutividade.tsx` — Métricas de produtividade por usuário
- `RelatoriosBI.tsx` — Relatórios de Business Intelligence
- `RelatorioRecebimentoGeral.tsx` — Relatório de recebimento geral
- `Tendencias.tsx` — Análise de tendências de glosa
- `PrevisaoGlosa.tsx` — Previsão de glosa por IA
- `Repasse.tsx` — Relatório de repasse médico

**Routers Backend:**
- `dashboard.resumo` — Métricas do dashboard principal
- `dashboardConsolidado.dados` — Dados consolidados multi-estabelecimento
- `relatoriosBI.dados` — Dados para relatórios BI
- `recebimentoGeral.listar` — Recebimento geral
- `tendencias.glosa` / `tendencias.geral` — Análise de tendências
- `regrasIA.list` / `regrasIA.create` — Regras de IA configuráveis

---

### 3.9. Módulo: Integrador de Dados

Módulo de infraestrutura que permite conectar bancos de dados externos (PostgreSQL, MySQL, SQL Server, Oracle), criar tabelas dinâmicas, definir mapeamentos de campos e executar sincronizações automáticas ou manuais.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `integracao_conexoes` | Configurações de conexões a bancos externos | INSERT, SELECT, UPDATE, DELETE |
| `integracao_tabelas` | Tabelas criadas dinamicamente pelo integrador | INSERT, SELECT, UPDATE, DELETE |
| `integracao_colunas` | Colunas das tabelas dinâmicas | INSERT, SELECT, DELETE |
| `integracao_mapeamentos` | Mapeamentos de campos (origem → destino) para sincronização | INSERT, SELECT, UPDATE, DELETE |
| `integracao_mapeamento_campos` | Mapeamento individual de cada coluna | INSERT, SELECT, DELETE |
| `integracao_sincronizacoes` | Log de sincronizações executadas (status, registros, duração) | INSERT, SELECT |

Além das tabelas de metadados acima, o integrador cria **tabelas dinâmicas** no banco (prefixo `integ_`) conforme configuração do usuário. As principais tabelas dinâmicas existentes são:

| Tabela Dinâmica | Origem | Finalidade |
|-----------------|--------|-----------|
| `integ_faturado` | Banco Warleine | Dados de faturamento do hospital |
| `integ_faturado_x_recebido` | Banco Warleine | Cruzamento faturado vs recebido |

**Páginas do Frontend:**
- `IntegradorDados.tsx` — Tela completa com abas: Conexões, Tabelas, Mapeamentos, Sincronizações
- `MapeamentoConvenios.tsx` — Mapeamento de nomes de convênios (de-para)

**Routers Backend (integradorDadosRouter):**
- `conexoes.listar` / `conexoes.criar` / `conexoes.testar` — Gestão de conexões
- `tabelas.listar` / `tabelas.criar` / `tabelas.criarAPartirDeQuery` — Gestão de tabelas
- `mapeamentos.listar` / `mapeamentos.criar` / `mapeamentos.executar` — Sincronização
- `sincronizar` — Sincronização manual de dados
- `transformarParaAtendimentos` — Transforma dados sincronizados em atendimentos

---

### 3.10. Módulo: Configurações e Administração

Módulo de configuração do sistema, incluindo gestão de convênios, estabelecimentos, tabelas de preço, permissões de usuário e avisos internos.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `users` | Usuários do sistema (autenticação, roles) | INSERT, SELECT, UPDATE, DELETE |
| `convenios` | Cadastro de convênios de saúde | INSERT, SELECT, UPDATE |
| `convenioEstabelecimentoPrestador` | Códigos de prestador por convênio/estabelecimento | INSERT, SELECT, UPDATE, DELETE |
| `estabelecimentos` | Cadastro de hospitais/clínicas | INSERT, SELECT, UPDATE, DELETE |
| `tabelasPreco` | Tabelas de preço por convênio (diárias, mat/med, taxas, procedimentos) | INSERT, SELECT, UPDATE, DELETE |
| `importacoesTabela` | Histórico de importações de tabelas de preço | INSERT, SELECT, UPDATE |
| `historicoPrecos` | Rastreamento de alterações em itens de tabelas de preço | INSERT, SELECT |
| `permissoesEstabelecimento` | Permissões de acesso por usuário e estabelecimento | INSERT, SELECT, UPDATE, DELETE |
| `gruposServico` | Grupos de serviço personalizados (roles expandidas) | INSERT, SELECT, UPDATE, DELETE |
| `logAuditoriaPermissoes` | Log de auditoria de alterações de permissões | INSERT, SELECT |
| `regrasConciliacao` | Regras de conciliação específicas por convênio | INSERT, SELECT, UPDATE, DELETE |
| `avisosInternos` | Banners de comunicados internos da empresa | INSERT, SELECT, UPDATE, DELETE |
| `convenioMapeamento` | De-para de nomes de convênios (hospital → sistema) | INSERT, SELECT, UPDATE |
| `auditLog` | Log geral de auditoria do sistema | INSERT, SELECT |

**Páginas do Frontend:**
- `Convenios.tsx` — CRUD de convênios
- `Estabelecimentos.tsx` — CRUD de estabelecimentos
- `TabelasPreco.tsx` — Gestão de tabelas de preço com importação Excel
- `GerenciarPermissoes.tsx` — Gestão de permissões por usuário/estabelecimento
- `RegrasConciliacao.tsx` — Regras de conciliação por convênio
- `GerenciarAvisos.tsx` — Gestão de avisos internos
- `MapeamentoConvenios.tsx` — Mapeamento de nomes de convênios
- `AlterarSenha.tsx` — Alteração de senha do usuário
- `AuditDashboard.tsx` — Dashboard de auditoria
- `SelecionarEstabelecimento.tsx` — Seleção de estabelecimento ativo

**Routers Backend:**
- `convenios.list` / `convenios.create` / `convenios.update` — CRUD convênios
- `estabelecimentos.list` / `estabelecimentos.create` — CRUD estabelecimentos
- `tabelasPreco.list` / `tabelasPreco.importar` — Tabelas de preço
- `permissoes.listar` / `permissoes.upsert` — Gestão de permissões
- `regrasConciliacao.list` / `regrasConciliacao.upsert` — Regras de conciliação
- `avisosInternos.listar` / `avisosInternos.criar` — Avisos internos
- `convenioMapeamento.listar` / `convenioMapeamento.criar` — Mapeamento de convênios

---

### 3.11. Módulo: Atendimentos

Gestão de atendimentos consolidados de múltiplos sistemas (Warleine, Tasy) com rastreabilidade de origem, notificações e identificação de atendimentos a faturar.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `atendimentos` | Atendimentos consolidados de múltiplos sistemas | INSERT, SELECT, UPDATE |
| `notificacoes_atendimento` | Notificações registradas para cada atendimento | INSERT, SELECT |
| `notificacoes_atendimento_item` | Itens de cada notificação (motivo, setor, médico) | INSERT, SELECT |

**Páginas do Frontend:**
- `Atendimentos.tsx` — Listagem de atendimentos com filtros
- `AtendimentosFaturar.tsx` — Atendimentos pendentes de faturamento
- `AtendimentosParadosUnificados.tsx` — Atendimentos parados (sem movimentação)

**Routers Backend:**
- `atendimentos.listar` / `atendimentos.buscar` — Consulta de atendimentos
- `atendimentosFaturar.listar` — Atendimentos a faturar
- `integradorDados.transformarParaAtendimentos` — Importação de atendimentos

---

### 3.12. Módulo: Importação Tasy

Módulo específico para importação de dados do sistema Tasy (procedimentos, materiais/medicamentos) e geração de contas unificadas.

| Tabela | Finalidade | Operações |
|--------|-----------|-----------|
| `importacoesTasy` | Registro de importações do Tasy (arquivo, status, totais) | INSERT, SELECT, UPDATE |
| `dadosTasy` | Dados brutos importados do Tasy | INSERT, SELECT, DELETE |
| `procedimentosTasy` | Procedimentos/honorários exportados do Tasy | INSERT, SELECT |
| `matMedTasy` | Materiais e medicamentos exportados do Tasy | INSERT, SELECT |
| `contasTasy` | Contas unificadas (junção de procedimentos + mat/med) | INSERT, SELECT, UPDATE |
| `itensContaTasy` | Itens detalhados de cada conta Tasy | INSERT, SELECT |
| `faturadoTasy`* | Dados faturados do Tasy (tabela dinâmica) | INSERT, SELECT, DELETE |

**Routers Backend:**
- `importacaoTasy.importar` / `importacaoTasy.listar` — Importação de dados
- `faturadoTasy.listar` / `faturadoTasy.estatisticas` — Consulta de dados faturados

---

## 4. Tabela Faturamento Unificado — Hub Central de Dados

A tabela `faturamento_unificado` é o **hub central** do sistema, consolidando dados de faturamento de três fontes distintas em um formato padronizado. Ela não é definida no schema Drizzle (é criada e populada via SQL raw pelo serviço `faturamentoUnificadoService.ts`).

| Campo | Descrição |
|-------|-----------|
| `origemSistema` | Fonte dos dados: `WARLEINE`, `TASY` ou `XML_TISS` |
| `origemId` | ID único no sistema de origem |
| `estabelecimentoId` | Estabelecimento de origem |
| `convenio` | Nome do convênio |
| `numeroConta` | Número da conta |
| `numeroGuia` | Número da guia |
| `codigoItem` | Código do item (TUSS ou interno) |
| `descricaoItem` | Descrição do item |
| `tipoItem` | Tipo: PROCEDIMENTO, DIARIA, MAT_MED, TAXA, etc. |
| `quantidade` | Quantidade faturada |
| `valorUnitario` | Valor unitário |
| `valorTotal` | Valor total |
| `competencia` | Competência (YYYY/MM) |
| `dataExecucao` | Data de execução |

**Fontes de Dados:**

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   integ_faturado    │     │     dadosTasy         │     │  staging_faturamento_xml   │
│  (Banco Warleine)   │     │   (Importação Tasy)   │     │   (Upload XML)      │
└────────┬────────────┘     └──────────┬───────────┘     └──────────┬──────────┘
         │                             │                            │
         │  popularDeWarleine()        │  popularDeTasy()           │  popularDeXml()
         │                             │                            │
         └─────────────────┬───────────┴────────────────────────────┘
                           │
                    ┌──────▼──────────────┐
                    │ faturamento_unificado│
                    │   (Hub Central)      │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────────┐
              │            │                │
     ┌────────▼───┐  ┌────▼──────┐  ┌──────▼────────┐
     │ Padrões de │  │Autocomplete│  │ Relatórios BI │
     │ Cobrança   │  │ de Códigos │  │               │
     └────────────┘  └───────────┘  └───────────────┘
```

---

## 5. Fluxo Completo de Dados do Sistema

O diagrama abaixo ilustra o fluxo completo de dados desde a entrada até os relatórios finais:

```
                         ┌─────────────────────────────────┐
                         │     FONTES DE DADOS EXTERNAS     │
                         └─────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
            ┌───────▼──────┐   ┌────────▼───────┐  ┌───────▼──────┐
            │ Banco Warleine│   │  Sistema Tasy  │  │  Arquivos    │
            │ (PostgreSQL)  │   │  (Importação)  │  │  XML/Excel   │
            └───────┬──────┘   └────────┬───────┘  └───────┬──────┘
                    │                   │                   │
            ┌───────▼──────┐   ┌────────▼───────┐  ┌───────▼──────┐
            │integ_faturado│   │  dadosTasy      │  │faturamento   │
            │(sincronização│   │  procedimentos  │  │_tiss (XML)   │
            │  periódica)  │   │  matMedTasy     │  │recebimento   │
            └───────┬──────┘   └────────┬───────┘  │_tiss (XML)   │
                    │                   │          │recebimentos  │
                    │                   │          │_excel        │
                    │                   │          └───────┬──────┘
                    │                   │                  │
                    └───────────┬───────┘                  │
                                │                          │
                    ┌───────────▼──────────┐               │
                    │faturamento_unificado │               │
                    │  (Hub Central)       │               │
                    └───────────┬──────────┘               │
                                │                          │
              ┌─────────────────┼──────────────┐           │
              │                 │              │           │
     ┌────────▼───────┐ ┌──────▼──────┐ ┌─────▼────┐     │
     │ Padrões de     │ │ Padrões de  │ │Padrões de│     │
     │ Preço/Convenio │ │ Composição  │ │Glosa     │     │
     └────────────────┘ └─────────────┘ └──────────┘     │
                                │                         │
                    ┌───────────▼──────────┐              │
                    │ contas_convenio_itens │◄─────────────┘
                    │ contas_convenio_resumo│   (migração automática)
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │  COMPARAÇÃO AUTOMÁTICA│
                    │  (conta vs gabarito)  │
                    └───────────┬──────────┘
                                │
              ┌─────────────────┼──────────────┐
              │                 │              │
     ┌────────▼───────┐ ┌──────▼──────┐ ┌─────▼──────────┐
     │ Divergências   │ │ Alertas     │ │ Insights IA    │
     │ (feedback)     │ │             │ │                │
     └────────────────┘ └─────────────┘ └────────────────┘
                                │
                    ┌───────────▼──────────┐
                    │   demonstrativo      │◄── Retornos XML/Excel
                    │   (pagamentos)       │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │   CONCILIAÇÃO        │
                    │ (faturado vs pago)   │
                    └───────────┬──────────┘
                                │
              ┌─────────────────┼──────────────┐
              │                 │              │
     ┌────────▼───────┐ ┌──────▼──────┐ ┌─────▼──────────┐
     │ Glosas         │ │ Recursos    │ │ Relatórios BI  │
     │ identificadas  │ │ de Glosa    │ │ e Dashboards   │
     └────────────────┘ └─────────────┘ └────────────────┘
```

---

## 6. Catálogo Completo de Tabelas

A tabela abaixo lista todas as **52 tabelas** definidas no schema do sistema, organizadas por categoria funcional:

### 6.1. Tabelas Core (Autenticação e Estrutura)

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `users` | 7-18 | Usuários do sistema com roles (user, admin, tasy_user) |
| `estabelecimentos` | 26-34 | Hospitais e clínicas cadastrados |
| `convenios` | 42-51 | Convênios de saúde (planos) |
| `convenioEstabelecimentoPrestador` | 60-69 | Códigos de prestador por convênio/estabelecimento |

### 6.2. Tabelas de Arquivos e Faturamento

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `arquivos` | 77-96 | Metadados de arquivos enviados/retornados (S3) |
| `staging_faturamento_xml` | 2132-2184 | Dados extraídos dos XMLs TISS de faturamento |
| `faturamento_unificado` | (dinâmica) | Hub central unificando Warleine + Tasy + XML |

### 6.3. Tabelas de Recebimento e Demonstrativo

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `recebimento_tiss` | 2192-2308 | Dados de retorno XML dos convênios |
| `recebimentos_excel` | 2318-2428 | Dados de retorno Excel dos convênios |
| `retorno_tiss_unificado` | 2437-2486 | Retorno unificado (XML + Excel) |
| `demonstrativo` | 2493-2561 | Demonstrativo consolidado com classificação de glosa |
| `recebimento_geral` | 2894-2949 | Recebimento geral consolidado |

### 6.4. Tabelas de Comparação e Divergências

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `comparacoes` | 106-122 | Comparações entre arquivos enviados e retornados |
| `divergencias` | 130-158 | Divergências encontradas nas comparações |
| `alertasDivergencia` | 764-828 | Alertas gerados pela validação |

### 6.5. Tabelas de Regras e Padrões

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `regrasNegocio` | 662-714 | Regras de composição de contas |
| `itensRegraNegocio` | 719-759 | Itens de cada regra de negócio |
| `padroesCobranca` | 1105-1151 | Padrões aprendidos e gabaritos manuais |
| `padroesContas` | 833-857 | Padrões de conta para sugestões de IA |
| `padraoPrecoConvenio` | 3039-3079 | Estatísticas de preço por item/convênio |
| `padraoGlosaConvenio` | 3085-3123 | Taxa de glosa histórica por item/convênio |
| `padraoQuantidadeItem` | 3129-3169 | Estatísticas de quantidade por item |
| `regrasConciliacao` | 450-497 | Regras de conciliação por convênio |
| `regrasIA` | 1229-1300 | Regras de IA configuráveis para alertas |

### 6.6. Tabelas de Glosa e Recursos

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `lotesRecurso` | 219-266 | Lotes de recursos de glosa para envio |
| `recursosGlosa` | 268-325 | Recursos individuais de contestação |
| `historicoRecursos` | 330-356 | Histórico de interações dos recursos |
| `historicoContestacoes` | 362-417 | Argumentos e resultados para aprendizado |
| `argumentosConvenio` | 422-445 | Argumentos personalizados por convênio |
| `decisoesGlosa` | 502-540 | Decisões de aceitar/recursar glosas |
| `motivosGlosa` | 963-1010 | Dicionário de motivos de glosa |

### 6.7. Tabelas de Conciliação

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `conciliacao` | 1704-1778 | Resultado item a item da conciliação |
| `resumoConciliacao` | 1785-1824 | Totais consolidados por período |
| `resultadosConciliacaoTasy` | 2011-2046 | Resultados de conciliação Tasy |
| `itensConciliacaoTasy` | 2052-2088 | Detalhes de contas conciliadas |
| `detalhesItensConciliacaoTasy` | 2094-2125 | Detalhes de itens conciliados |
| `vinculacaoCodigos` | 3000-3032 | De-para de códigos hospital/convênio |

### 6.8. Tabelas de Tabelas de Preço

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `tabelasPreco` | 546-581 | Itens de tabelas de preço por convênio |
| `importacoesTabela` | 586-618 | Histórico de importações de tabelas |
| `historicoPrecos` | 623-656 | Rastreamento de alterações de preço |
| `codigosProcedimentos` | 163-175 | Códigos de procedimentos de referência |
| `camposComparacao` | 180-191 | Campos de comparação configuráveis |

### 6.9. Tabelas Tasy

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `importacoesTasy` | (1228+) | Registro de importações do Tasy |
| `procedimentosTasy` | 1831-1874 | Procedimentos exportados do Tasy |
| `matMedTasy` | 1880-1920 | Materiais/medicamentos do Tasy |
| `contasTasy` | 1926-1969 | Contas unificadas do Tasy |
| `itensContaTasy` | 1975-2005 | Itens de cada conta Tasy |

### 6.10. Tabelas Operacionais (Conta Convênio)

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `contas_convenio_itens` | 3185-3258 | Itens operacionais de contas por convênio |
| `contas_convenio_resumo` | 3267-3315 | Resumo/cabeçalho de contas por convênio |
| `feedback_divergencias` | 3321-3361 | Feedback do auditor sobre divergências |

### 6.11. Tabelas de Integração e Infraestrutura

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `integracao_conexoes` | 2748-2771 | Conexões a bancos externos |
| `integracao_tabelas` | 2776-2792 | Tabelas dinâmicas do integrador |
| `integracao_colunas` | 2797-2815 | Colunas das tabelas dinâmicas |
| `integracao_mapeamentos` | 2820-2846 | Mapeamentos de sincronização |
| `integracao_mapeamento_campos` | 2851-2863 | Campos individuais dos mapeamentos |
| `integracao_sincronizacoes` | 2868-2888 | Log de sincronizações |
| `convenio_mapeamento` | 2958-2992 | De-para de nomes de convênios |

### 6.12. Tabelas de Administração e Auditoria

| Tabela | Linhas Schema | Descrição |
|--------|:------------:|-----------|
| `permissoesEstabelecimento` | 899-956 | Permissões por usuário/estabelecimento |
| `gruposServico` | 1017-1051 | Grupos de serviço personalizados |
| `logAuditoriaPermissoes` | 1057-1098 | Log de auditoria de permissões |
| `auditLog` | 2622-2633 | Log geral de auditoria |
| `avisosInternos` | 2568-2582 | Banners de comunicados internos |
| `historicoValidacoes` | 864-892 | Histórico de validações |
| `historicoValidacaoXml` | 2589-2619 | Histórico de validações XML |
| `atendimentos` | 2641-2689 | Atendimentos consolidados |
| `notificacoes_atendimento` | 2699-2716 | Notificações de atendimentos |
| `notificacoes_atendimento_item` | 2718-2733 | Itens de notificações |
| `itensManuals` | 196-211 | Itens manuais adicionados pelo usuário |
| `insightsIA` | 1156-1223 | Insights gerados pela IA |

---

## 7. Procedures do Backend — Referência Rápida

### 7.1. Routers Principais (server/routers.ts)

O arquivo principal `routers.ts` (7.348 linhas) contém **42 routers** de nível superior. Os routers mais complexos foram extraídos para arquivos separados em `server/routers/`:

| Router | Arquivo | Procedures Principais |
|--------|---------|----------------------|
| `auth` | routers.ts | `me`, `logout`, `hasPassword`, `changePassword`, `setInitialPassword` |
| `convenios` | routers.ts | `list`, `get`, `create`, `update`, `listarPrestadores`, `upsertPrestador` |
| `estabelecimentos` | routers.ts | `list`, `get`, `create`, `update`, `delete` |
| `arquivos` | routers.ts | `list`, `get`, `upload`, `delete`, `stats` |
| `comparacoes` | routers.ts | `list`, `get`, `create`, `stats` |
| `glosa` | routers.ts | `porConvenio`, `porProcedimento`, `tendencia`, `resumo` |
| `recursos` | routers.ts | `create`, `update`, `list`, `delete`, `exportar`, `criarLote`, `enviarLote` |
| `conciliacao` | routers.ts | `porConvenio`, `agrupadaPorConta`, `itensNaoRecebidos`, `resumo` |
| `tabelasPreco` | routers.ts | `list`, `get`, `create`, `update`, `delete`, `importar` |
| `regrasNegocio` | routers.ts | `list`, `get`, `create`, `update`, `delete` |
| `permissoes` | routers.ts | `listar`, `upsert`, `delete`, `usuarios` |
| `faturamentoTiss` | routers.ts | `listar`, `resumo`, `itensGuia`, `guiasMultiplosLotes` |
| `demonstrativo` | routers.ts | `listarContas`, `itensPorGuia`, `itensGlosados`, `resumo` |
| `recebimentosExcel` | routers.ts | `listar`, `resumo` |
| `atendimentos` | routers.ts | `listar`, `buscar`, `notificacoes` |
| `recebimentoGeral` | routers.ts | `listar`, `importar` |
| `avisosInternos` | routers.ts | `listar`, `criar`, `editar`, `excluir` |
| `convenioMapeamento` | routers.ts | `listar`, `criar`, `atualizar`, `excluir`, `sugerir` |

### 7.2. Routers Extraídos (server/routers/)

| Router | Arquivo | Procedures Principais |
|--------|---------|----------------------|
| `padroesCobranca` | padroesCobrancaRouter.ts | `gerarPadroesPreco`, `gerarPadroesComposicao`, `gerarPadroesGlosa`, `gerarPadroesQuantidade`, `criarGabarito`, `editarPadrao`, `validarPadrao`, `autocompleteCodigos`, `registrarFeedback` |
| `contasConvenio` | contasConvenioRouter.ts | `buscarConta`, `listarContas`, `listarItens`, `compararComPadroes`, `getDivergencias`, `registrarFeedback`, `migrarDadosXml`, `importarDeXml` |
| `integradorDados` | integradorDadosRouter.ts | `conexoes.*`, `tabelas.*`, `mapeamentos.*`, `sincronizar`, `transformarParaAtendimentos` |
| `faturamentoUnificado` | faturamentoUnificadoRouter.ts | `popular`, `consultar`, `estatisticas` |
| `motorRegras` | motorRegrasRouter.ts | Validação automática de contas contra regras |
| `padroesProcedimentos` | padroesProcedimentosRouter.ts | Padrões de procedimentos TUSS |

---

## 8. Helpers do Banco de Dados (server/db.ts)

O arquivo `db.ts` (18.187 linhas) contém **339 funções exportadas** que encapsulam toda a lógica de acesso ao banco. As funções estão organizadas por domínio:

| Domínio | Funções Principais | Linhas Aprox. |
|---------|-------------------|:------------:|
| Arquivos | `createArquivo`, `getArquivos`, `updateArquivoStatus`, `deleteArquivo` | 280-490 |
| Procedimentos | `getProcedimentosByArquivoId`, `getProcedimentosPaginated` | 496-820 |
| Comparações | `createComparacao`, `getComparacoes`, `createDivergencias` | 826-990 |
| Faturamento | `getFaturamentoPorConvenio`, `getFaturamentoPorMes`, `getResumoGeral` | 1137-1575 |
| Glosa | `getGlosaPorConvenio`, `getGlosaPorProcedimento`, `getTendenciaGlosa` | 1576-1850 |
| Recursos | `createRecursoGlosa`, `updateRecursoGlosa`, `getRecursosGlosa` | 1853-2235 |
| Conciliação | `getConciliacaoPorConvenio`, `getConciliacaoAgrupadaPorConta` | 2236-3030 |
| Tendências | `getTendenciasGlosa`, `getTendenciaGeral` | 3031-3360 |
| Repasse | `getRepasseData` | 3360-3545 |
| Contestações | `registrarHistoricoContestacao`, `sugerirArgumentoComIA` | 3548-3835 |
| Estabelecimentos | `getEstabelecimentos`, `createEstabelecimento` | 3836-3920 |
| Regras Conciliação | `getRegrasConciliacao`, `createRegraConciliacao` | 3921-3980 |
| Tabelas Preço | `getTabelasPreco`, `importarTabelaPreco`, `getPrecoItem` | 3980-5310 |
| Regras Negócio | `createRegraNegocio`, `getRegrasNegocio`, `verificarRegrasNegocio` | 5437-5910 |
| Padrões Contas | `atualizarPadroesContas`, `sugerirItensFaltantes` | 5914-6150 |
| Validações | `salvarHistoricoValidacao`, `salvarHistoricoValidacaoXml` | 6149-6395 |
| Permissões | `getPermissoesUsuario`, `upsertPermissaoEstabelecimento` | 6395-6730 |
| Dashboard | `getDadosConsolidados`, `getComparativoGlosasEstabelecimentos` | 6734-6930 |
| Produtividade | `getMetricasProdutividade` | 6932-7160 |
| Motivos Glosa | `getMotivosGlosa`, `criarMotivoGlosa`, `getMotivoGlosaCombinado` | 7162-7435 |
| Usuários | `listarTodosUsuarios`, `criarUsuario`, `changeUserPassword` | 7760-8190 |
| Lotes Recurso | `listarLotesRecurso`, `criarLoteRecurso`, `gerarXmlRecursoGlosa` | 8288-10260 |
| Padrões Cobrança | `analisarPadroesCobranca`, `salvarPadraoCobranca`, `getPadroesCobranca` | 8583-8900 |
| Insights IA | `salvarInsightIA`, `gerarInsightsContaIA`, `getMetricasAcuraciaIA` | 8821-9400 |
| Detalhes Conta | `getDetalhesConta` | 10294-10480 |
| Estatísticas IA | `getEstatisticasPorCodigo`, `getContasOutliers`, `calcularRiscoGlosa` | 10481-10835 |
| Regras IA | `getRegrasIA`, `createRegraIA`, `inicializarRegrasPadrao` | 11006-11225 |
| Importação Tasy | `createImportacaoTasy`, `insertDadosTasyBatch`, `getDadosTasy` | 11228-14800 |
| Contas Tasy | `gerarContasTasyUnificadas`, `getContasTasy`, `getItensContaTasy` | 14401-14730 |
| Conciliação Tasy | `salvarResultadoConciliacao`, `listarHistoricoConciliacoes` | 14820-15150 |
| Prestadores | `listarPrestadoresExecutantes`, `upsertPrestadorConvenioEstabelecimento` | 15149-15400 |
| Faturado Tasy | `insertFaturadoTasyBatch`, `getFaturadoTasy`, `getDadosBIFaturadoTasy` | 15399-16400 |
| Recebimento TISS | `insertRecebimentoTiss`, `getRecebimentoTiss` | 16397-16745 |
| Faturamento TISS | `getFaturamentoTiss`, `insertFaturamentoTissBatch` | 16748-17095 |
| Recebimentos Excel | `insertRecebimentosExcelBatch`, `getRecebimentosExcel` | 17096-17345 |
| Demonstrativo | `insertDemonstrativoBatch`, `getDemonstrativoContas` | 17346-17835 |
| Avisos | `listarAvisosInternos`, `criarAvisoInterno` | 17836-17915 |
| Relatórios | `getRelatorioFaturamento`, `getRelatorioDemonstrativo` | 17915-17985 |
| Notificações | `salvarNotificacaoAtendimento`, `buscarNotificacoesAtendimento` | 17985-18165 |

---

## 9. Serviços Auxiliares

Além do `db.ts` e dos routers, o sistema possui serviços especializados:

| Serviço | Arquivo | Responsabilidade |
|---------|---------|-----------------|
| Faturamento Unificado | `server/faturamentoUnificadoService.ts` | Popula e mantém a tabela `faturamento_unificado` a partir de 3 fontes |
| Recebimento Geral | `server/db-recebimentoGeral.ts` | Importa dados de `integ_faturado_x_recebido` para `recebimento_geral` |
| Mapeamento Convênios | `server/db-convenioMapeamento.ts` | Busca nomes de convênios em múltiplas tabelas para sugestão automática |
| Comparador de Padrões | `server/db.ts` (função `comparadorPadroes`) | Compara conta contra gabaritos e retorna divergências |
| Gerador XML Recurso | `server/db.ts` (função `gerarXmlRecursoGlosa`) | Gera XML TISS de recurso de glosa |
| Sugestão IA | `server/db.ts` (função `sugerirArgumentoComIA`) | Sugere argumentos de contestação usando LLM |

---

## 10. Componentes do Frontend — Referência

### 10.1. Páginas Principais (66 arquivos em client/src/pages/)

| Grupo | Páginas | Descrição |
|-------|---------|-----------|
| **Início** | `Home.tsx`, `Inicio.tsx`, `SelecionarEstabelecimento.tsx` | Dashboard, tela inicial e seleção de estabelecimento |
| **Upload** | `Upload.tsx`, `Arquivos.tsx` | Upload e listagem de arquivos |
| **Conta Convênio** | `ContaConvenio.tsx`, `ContaConvenioDetalhes.tsx` | Gestão operacional de contas |
| **Padrões** | `PadroesCobranca.tsx`, `CriarGabarito.tsx`, `EditarPadrao.tsx`, `DetalhesPadrao.tsx` | Gabaritos e padrões de cobrança |
| **Recebimentos** | `RecebimentosXml.tsx`, `RecebimentosExcel.tsx` | Upload de retornos |
| **Demonstrativo** | `Demonstrativo.tsx`, `DemonstrativoDetalhes.tsx`, `ContasDemonstrativo.tsx`, `ContaDetalhesDemonstrativo.tsx` | Demonstrativos de pagamento |
| **Glosa** | `AnaliseGlosa.tsx`, `RecursosGlosa.tsx`, `EnvioRecursosLote.tsx`, `AcompanhamentoRecursos.tsx`, `DicionarioGlosas.tsx`, `HistoricoContestacoes.tsx` | Gestão de glosas e recursos |
| **Conciliação** | `ConciliacaoCruzada.tsx`, `ConciliacaoDetalhes.tsx`, `ConciliacaoContasFaturadas.tsx`, `ConciliacaoContasPagas.tsx`, `NaoRecebidos.tsx` | Conciliação cruzada |
| **Comparações** | `Comparacoes.tsx`, `Divergencias.tsx` | Comparações e divergências |
| **Relatórios** | `RelatoriosBI.tsx`, `RelatorioRecebimentoGeral.tsx`, `Relatorios.tsx`, `RelatorioContas.tsx` | Relatórios analíticos |
| **Dashboards** | `DashboardConsolidado.tsx`, `DashboardIA.tsx`, `DashboardMotorRegras.tsx`, `DashboardProdutividade.tsx` | Dashboards especializados |
| **Tasy** | `Contas.tsx`, `ContaDetalhes.tsx`, `DetalhesContaFaturada.tsx`, `Faturamento.tsx`, `Conciliacao.tsx` | Módulo Tasy |
| **Atendimentos** | `Atendimentos.tsx`, `AtendimentosFaturar.tsx`, `AtendimentosParadosUnificados.tsx` | Gestão de atendimentos |
| **Configurações** | `Convenios.tsx`, `Estabelecimentos.tsx`, `TabelasPreco.tsx`, `GerenciarPermissoes.tsx`, `RegrasConciliacao.tsx`, `RegrasNegocio.tsx`, `RegrasIA.tsx` | Configurações do sistema |
| **Integração** | `IntegradorDados.tsx`, `MapeamentoConvenios.tsx` | Integrador de dados |
| **Outros** | `Tendencias.tsx`, `PrevisaoGlosa.tsx`, `Repasse.tsx`, `GerenciarAvisos.tsx`, `AuditDashboard.tsx`, `CacheDashboard.tsx`, `AlterarSenha.tsx` | Funcionalidades auxiliares |

### 10.2. Componentes Reutilizáveis

| Componente | Descrição |
|-----------|-----------|
| `AutocompleteCodigoItem.tsx` | Autocomplete de códigos com busca no faturamento_unificado |
| `DashboardLayout.tsx` | Layout principal com sidebar, navegação e controle de permissões |
| `DashboardLayoutSkeleton.tsx` | Loading skeleton do dashboard |

---

## 11. Sistema de Permissões

O sistema implementa controle de acesso granular baseado em **grupos de serviço** e **permissões por módulo**:

| Grupo de Serviço | Módulos Acessíveis |
|-------------------|-------------------|
| `administrador` | Acesso total a todas as funcionalidades |
| `faturista` | Dashboard, Arquivos, Comparações, Faturamento, Tabelas de Preço |
| `recurso_glosa` | Análise de Glosa, Dicionário de Glosas, Recursos de Glosa |
| `gestor` | Dashboard Consolidado, Relatórios, Produtividade |
| `visualizador` | Somente leitura em todos os módulos permitidos |
| `usuario_tasy` | Importação Tasy, Contas Faturadas, Relatórios Tasy, Relatórios BI, Conciliação |

As permissões são armazenadas na tabela `permissoesEstabelecimento` com campos booleanos (`sim`/`nao`) para cada módulo, permitindo controle granular por usuário e estabelecimento.

---

## 12. Bancos de Dados Externos

O sistema se conecta opcionalmente a bancos externos para sincronização de dados:

| Banco | Tipo | Variáveis de Ambiente | Finalidade |
|-------|------|----------------------|-----------|
| PostgreSQL Warleine | PostgreSQL | `WARLEINE_DB_*` | Dados de faturamento do hospital (integ_faturado) |
| PostgreSQL Atendimentos | PostgreSQL | `PG_ATENDIMENTOS_*` | Dados de atendimentos hospitalares |

As conexões são configuradas via variáveis de ambiente e também podem ser gerenciadas dinamicamente pelo **Integrador de Dados** (tabela `integracao_conexoes`).

---

## 13. Variáveis de Ambiente

| Variável | Finalidade |
|----------|-----------|
| `DATABASE_URL` | Conexão com o banco MySQL principal |
| `JWT_SECRET` | Assinatura de tokens de sessão |
| `VITE_APP_ID` | ID da aplicação OAuth |
| `OAUTH_SERVER_URL` | URL do servidor OAuth |
| `WARLEINE_DB_HOST/PORT/USER/PASSWORD/NAME` | Conexão com banco Warleine |
| `PG_ATENDIMENTOS_HOST/PORT/USER/PASSWORD/DATABASE` | Conexão com banco de atendimentos |
| `REDIS_URL` | Cache Redis |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Configuração de e-mail |
| `ENABLE_MODULO_FATURAMENTO` | Habilita módulo de faturamento |
| `ENABLE_MODULO_GLOSA` | Habilita módulo de glosa |

---

*Este documento foi gerado automaticamente com base na análise do código-fonte do sistema (schema.ts: 3.361 linhas, routers.ts: 7.348 linhas, db.ts: 18.187 linhas, 66 páginas frontend, 22 arquivos de routers).*
