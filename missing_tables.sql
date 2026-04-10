CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin','tasy_user') NOT NULL DEFAULT 'user',
	`passwordHash` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

CREATE TABLE `vinculacao_codigos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`convenioId` int,
	`codigoHospital` varchar(50) NOT NULL,
	`descricaoHospital` text,
	`codigoConvenio` varchar(50) NOT NULL,
	`descricaoConvenio` text,
	`tipoItem` enum('medicamento','material','procedimento','taxa','diaria','gas','outros') DEFAULT 'outros',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`metodo_match` enum('automatico','manual') NOT NULL DEFAULT 'manual',
	`confianca` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vinculacao_codigos_id` PRIMARY KEY(`id`)
);

CREATE TABLE `atendimentos_unificados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL,
	`origemId` varchar(255) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`numero_atendimento` varchar(100),
	`codigo_saida` varchar(50),
	`convenio` varchar(255),
	`paciente` varchar(255),
	`caracter_atendimento` varchar(50),
	`data_entrada` datetime,
	`data_saida` datetime,
	`tipo_atendimento` varchar(50),
	`descricao_atendimento` varchar(255),
	`codigo_servico` varchar(100),
	`codigo_procedimento` varchar(500),
	`destino_conta` varchar(100),
	`dsCategoria` varchar(255),
	`dsPlano` varchar(255),
	`competencia` varchar(20),
	`referencia` varchar(20),
	`protTasy` varchar(50),
	`nomeProtocolo` varchar(255),
	`protConv` varchar(100),
	`dtEntrega` datetime,
	`protStatus` varchar(50),
	`titulo` varchar(100),
	`dtTitulo` datetime,
	`dataVencimento` datetime,
	`dsSetorEntrada` varchar(255),
	`dsSetorLeito` varchar(255),
	`etapaConta` varchar(255),
	`setorEtapa` varchar(255),
	`dtEtapa` datetime,
	`userEtapa` varchar(100),
	`motivoDevolucao` text,
	`conta` varchar(50),
	`autorizacao` varchar(100),
	`valorConta` decimal(15,2),
	`matricula` varchar(100),
	`sexo` varchar(10),
	`idade` varchar(50),
	`medicoResp` varchar(255),
	`crm` varchar(50),
	`dsMotivoAlta` varchar(255),
	`dataInicio` varchar(20),
	`dataFim` varchar(20),
	`codServico` varchar(50),
	`centroCusto` varchar(100),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `atendimentos_unificados_id` PRIMARY KEY(`id`)
);

CREATE TABLE `atendimentos_a_faturar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`origemSistema` varchar(50) NOT NULL DEFAULT 'EASYVISION',
	`numatend` varchar(100) NOT NULL,
	`nomeplaco` varchar(255),
	`nomepac` varchar(255),
	`carater` varchar(50),
	`datatend` datetime,
	`datasai` datetime,
	`tipoatend` varchar(10),
	`tipoatendimentodescricao` varchar(100),
	`codserv` varchar(255),
	`procprin` varchar(100),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `atendimentos_a_faturar_id` PRIMARY KEY(`id`)
);

CREATE TABLE `atendimentos_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`atendimentoId` int NOT NULL,
	`campoAlterado` varchar(100) NOT NULL,
	`valorAnterior` text,
	`valorNovo` text,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `atendimentos_historico_id` PRIMARY KEY(`id`)
);

CREATE TABLE `atendimentos_sem_conta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`origemSistema` varchar(50) NOT NULL DEFAULT 'EASYVISION',
	`numatend` varchar(100) NOT NULL,
	`nomeplaco` varchar(255),
	`nomepac` varchar(255),
	`carater` varchar(50),
	`datatend` datetime,
	`datasai` datetime,
	`tipoatend` varchar(10),
	`tipoatendimentodescricao` varchar(100),
	`codserv` varchar(255),
	`procprin` varchar(100),
	`codcc_destino` varchar(100),
	`motivo` text,
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `atendimentos_sem_conta_id` PRIMARY KEY(`id`)
);

CREATE TABLE `conciliados_automatico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`faturamentoUnificadoId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`contaNumero` varchar(100),
	`numeroGuia` varchar(50),
	`pacienteNome` varchar(255),
	`convenio` varchar(255),
	`convenioId` int,
	`competencia` varchar(20),
	`codigoItem` varchar(50),
	`codigoItemTuss` varchar(50),
	`descricaoItem` text,
	`tipoItem` varchar(50),
	`origemSistema` varchar(50),
	`dataExecucao` datetime,
	`codigoPrestadorExecutante` varchar(50),
	`valorFaturado` decimal(12,4),
	`quantidade` decimal(12,4),
	`recebimentoId` int,
	`recebimentoOrigem` varchar(20),
	`valorPago` decimal(12,4) DEFAULT '0',
	`valorGlosa` decimal(12,4) DEFAULT '0',
	`codigoGlosa` varchar(20),
	`motivoGlosa` text,
	`statusConciliacao` varchar(50) NOT NULL,
	`metodoConciliacao` varchar(50),
	`diferenca` decimal(12,4),
	`percentualDiferenca` decimal(8,4),
	`toleranciaUsada` decimal(5,2),
	`executadoPor` int,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `conciliados_automatico_id` PRIMARY KEY(`id`)
);

CREATE TABLE `custos_produtos_sync_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimento_id` int NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pendente',
	`ultima_sincronizacao` datetime,
	`total_registros` int DEFAULT 0,
	`duracao_segundos` int DEFAULT 0,
	`mensagem_erro` text,
	`executado_por` int,
	`executado_por_nome` varchar(255),
	`criado_em` timestamp DEFAULT (now()),
	`atualizado_em` timestamp DEFAULT (now()),
	CONSTRAINT `custos_produtos_sync_meta_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_custos_sync_meta_estab` UNIQUE(`estabelecimento_id`)
);

CREATE TABLE `custos_produtos_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimento_id` int NOT NULL,
	`codprod` varchar(50) NOT NULL,
	`descricao` varchar(500),
	`tipoprod` varchar(10),
	`capacidade_estoque` decimal(18,6),
	`mult_estoque` decimal(18,6),
	`unidade_estoque` varchar(50),
	`custo_estoque` decimal(18,6),
	`codplaco` varchar(50),
	`nome_convenio` varchar(255),
	`nome_plano` varchar(255),
	`codtbmm` varchar(20) NOT NULL,
	`mult_faturas` decimal(18,6),
	`unidade_faturas` varchar(50),
	`custo_mult_fat` decimal(18,6),
	`valormm` decimal(18,6),
	`prevenbras` decimal(18,6),
	`prefabsimp` decimal(18,6),
	`sincronizado_em` timestamp DEFAULT (now()),
	CONSTRAINT `custos_produtos_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_custos_cache_codprod_tbmm` UNIQUE(`estabelecimento_id`,`codprod`,`codtbmm`,`codplaco`)
);

CREATE TABLE `faturamento_unificado` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL,
	`origemId` varchar(100),
	`estabelecimentoId` int NOT NULL,
	`contaNumero` varchar(100),
	`numeroGuia` varchar(50),
	`numeroGuiaOperadora` varchar(50),
	`senha` varchar(50),
	`protocolo` varchar(100),
	`lotePrestador` varchar(50),
	`atendimento` varchar(100),
	`pacienteNome` varchar(255),
	`carteiraBeneficiario` varchar(50),
	`convenio` varchar(255),
	`convenioId` int,
	`competencia` varchar(20),
	`profissionalExecutante` varchar(255),
	`setor` varchar(255),
	`tipoItem` varchar(50),
	`codigoItem` varchar(50),
	`codigoItemTuss` varchar(50),
	`descricaoItem` text,
	`dataExecucao` datetime,
	`quantidade` decimal(12,4),
	`valorUnitario` decimal(12,4),
	`valorFaturado` decimal(12,4),
	`valorPago` decimal(12,4),
	`valorGlosa` decimal(12,4),
	`motivoGlosa` text,
	`codigoGlosa` varchar(50),
	`retorno` varchar(50),
	`dataPagamento` datetime,
	`codigoPrestadorExecutante` varchar(50),
	`statusConciliacao` varchar(50) DEFAULT 'pendente',
	`recebimentoVinculadoId` int,
	`recebimentoOrigem` varchar(20),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `faturamento_unificado_id` PRIMARY KEY(`id`)
);

CREATE TABLE `faturamento_externo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimento_id` int NOT NULL,
	`convenio` varchar(255) NOT NULL,
	`mes_ano` varchar(10) NOT NULL,
	`valor_faturado` decimal(14,2) DEFAULT '0',
	`valor_recebido` decimal(14,2) DEFAULT '0',
	`arquivo_origem` varchar(500),
	`importado_por` int,
	`importado_por_nome` varchar(255),
	`criado_em` timestamp DEFAULT (now()),
	`atualizado_em` timestamp DEFAULT (now()),
	CONSTRAINT `faturamento_externo_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_fat_ext_unique` UNIQUE(`estabelecimento_id`,`convenio`,`mes_ano`)
);

CREATE TABLE `faturamento_geral` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL DEFAULT 'WARLEINE',
	`estabelecimentoId` int NOT NULL,
	`configId` int,
	`aihguia` varchar(100),
	`codcc` varchar(50),
	`codconv` varchar(50),
	`codgrufi` varchar(50),
	`codproprio` varchar(100),
	`codrecur` varchar(100),
	`codtiss` varchar(100),
	`complrecur` text,
	`data` datetime,
	`dataint` datetime,
	`datasai` datetime,
	`descmotivo` text,
	`descricao` text,
	`funcaotiss` varchar(50),
	`gl_aceita` varchar(50),
	`gl_analise` varchar(50),
	`gl_recuperada` varchar(50),
	`gl_recurso` varchar(50),
	`guiacobra` varchar(100),
	`matricula` varchar(100),
	`mesprod` varchar(20),
	`nomecc` varchar(255),
	`nomeconv` varchar(255),
	`nomeprest` varchar(255),
	`numconta` varchar(100),
	`numfatura` varchar(100),
	`prestexe` varchar(255),
	`procdisco` varchar(100),
	`protocolo` varchar(100),
	`quantidade` varchar(50),
	`receber` varchar(50),
	`tipoatend` varchar(50),
	`tipoproc` varchar(100),
	`vl_aberto` varchar(50),
	`vl_faturado` varchar(50),
	`vl_glosas` varchar(50),
	`vl_receb_a_maior` varchar(50),
	`vl_recebido` varchar(50),
	`vl_total_recebido` varchar(50),
	`vl_unitario` varchar(50),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `faturamento_geral_id` PRIMARY KEY(`id`)
);

CREATE TABLE `geocoding_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cep` varchar(20) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`endereco_formatado` text,
	`bairro` varchar(255),
	`cidade` varchar(255),
	`estado` varchar(2),
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `geocoding_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_geocoding_cache_cep` UNIQUE(`cep`)
);

CREATE TABLE `gesthor_atendimentos_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configuracaoId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	`atendimentoId` varchar(100),
	`pacienteId` varchar(100),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`dataAtendimento` datetime,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `gesthor_atendimentos_staging_id` PRIMARY KEY(`id`)
);

CREATE TABLE `integ_faturado` (
	`_id` int NOT NULL,
	`estabelecimento_id` int,
	`nomeconv` varchar(255),
	`codconv` varchar(255),
	`mesprod` varchar(255),
	`numfatura` varchar(255),
	`codrecur` varchar(500),
	`tipoproc` varchar(255),
	`protocolo` varchar(255),
	`numconta` varchar(255),
	`guiacobra` varchar(255),
	`aihguia` varchar(255),
	`descricao` varchar(255),
	`matricula` varchar(255),
	`data` datetime,
	`dataint` datetime,
	`datasai` varchar(500),
	`procdisco` varchar(255),
	`codproprio` varchar(255),
	`codgrufi` varchar(255),
	`funcaotiss` varchar(255),
	`receber` varchar(255),
	`codcc` varchar(255),
	`nomecc` varchar(255),
	`prestexe` varchar(255),
	`nomeprest` varchar(255),
	`medsolic` varchar(255),
	`nomemedsolic` varchar(255),
	`codtiss` varchar(500),
	`descmotivo` varchar(500),
	`complrecur` varchar(500),
	`tipoatend` varchar(255),
	`databaixa` varchar(500),
	`codplaco` varchar(255),
	`nomeplaco` varchar(255),
	`vl_unitario` varchar(255),
	`quantidade` varchar(255),
	`vl_faturado` varchar(255),
	`_sincronizado_em` datetime,
	`_atualizado_em` datetime,
	CONSTRAINT `integ_faturado__id` PRIMARY KEY(`_id`)
);

CREATE TABLE `omni_atendimentos_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configuracaoId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	`atendimentoId` varchar(100),
	`pacienteId` varchar(100),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`dataAtendimento` datetime,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `omni_atendimentos_staging_id` PRIMARY KEY(`id`)
);

CREATE TABLE `pacientes_unificados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL,
	`origemId` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`cpf` varchar(20),
	`nome` varchar(255),
	`dataNascimento` datetime,
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `pacientes_unificados_id` PRIMARY KEY(`id`)
);

CREATE TABLE `procedimentos_unificados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL,
	`origemId` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`codigo` varchar(100) NOT NULL,
	`descricao` text,
	`valor` varchar(20),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `procedimentos_unificados_id` PRIMARY KEY(`id`)
);

CREATE TABLE `query_configuracoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`sistema` varchar(50) NOT NULL,
	`tipoDados` varchar(50) NOT NULL,
	`querySql` text NOT NULL,
	`descricao` text,
	`conexaoConfig` json,
	`frequencia` varchar(50) NOT NULL DEFAULT 'tempo_real',
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimaSincronizacao` datetime,
	`proximaSincronizacao` datetime,
	`totalRegistrosSincronizados` int DEFAULT 0,
	`ultimoErro` text,
	`ultimaTentativa` datetime,
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `query_configuracoes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `relatorio_atendimentos_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL DEFAULT 'WARLEINE',
	`estabelecimentoId` int NOT NULL,
	`numatend` varchar(100) NOT NULL,
	`tipoatend` varchar(10),
	`tipoatend_descricao` varchar(100),
	`codserv` varchar(50),
	`nomeserv` varchar(255),
	`codplaco` varchar(50),
	`nomeplaco` varchar(255),
	`codproven` varchar(50),
	`nomeproven` varchar(255),
	`data_atendimento` datetime,
	`data_saida` datetime,
	`censo` varchar(100),
	`codcc` varchar(50),
	`nomecc` varchar(255),
	`codprest` varchar(50),
	`nomeprest` varchar(255),
	`procprin` varchar(100),
	`dsprocprin` varchar(500),
	`cidprin` varchar(20),
	`descrcid` varchar(500),
	`carater` varchar(10),
	`carater_descricao` varchar(100),
	`codpac` varchar(50),
	`nomepac` varchar(255),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	`codesp` varchar(50),
	`especialidade` varchar(255),
	`opecad` varchar(50),
	`operador_cadastro` varchar(255),
	`codcbo` varchar(50),
	`descricao_cbo` varchar(500),
	`sexo_paciente` varchar(20),
	`cep_paciente` varchar(20),
	CONSTRAINT `relatorio_atendimentos_cache_id` PRIMARY KEY(`id`)
);

CREATE TABLE `relatorio_atendimentos_sync_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`ultimaSincronizacao` datetime,
	`totalRegistros` int DEFAULT 0,
	`duracaoSegundos` int DEFAULT 0,
	`status` varchar(50) NOT NULL DEFAULT 'pendente',
	`mensagemErro` text,
	`dataInicioPeriodo` varchar(20),
	`dataFimPeriodo` varchar(20),
	`usuarioId` int,
	`usuarioNome` varchar(255),
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `relatorio_atendimentos_sync_meta_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_rel_sync_meta_estab` UNIQUE(`estabelecimentoId`)
);

CREATE TABLE `sincronizacao_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configuracaoId` int NOT NULL,
	`sistema` varchar(50) NOT NULL,
	`tipoDados` varchar(50) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`registrosSincronizados` int DEFAULT 0,
	`registrosErro` int DEFAULT 0,
	`duracao` int,
	`mensagemErro` text,
	`stackTrace` text,
	`iniciadoEm` timestamp DEFAULT (now()),
	`finalizadoEm` datetime,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `sincronizacao_log_id` PRIMARY KEY(`id`)
);

CREATE TABLE `Tasy_maternidadeela_atendimentos_stagion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int,
	`numeroAtendimento` varchar(50),
	`tipoSaida` varchar(100),
	`local` varchar(255),
	`paciente` varchar(255),
	`carater` varchar(50),
	`dataAdmissao` datetime,
	`dataAlta` datetime,
	`tipoAtendimento` varchar(100),
	`servico` varchar(255),
	`procedimentoPrincipal` varchar(255),
	`centroCusto` varchar(100),
	`dadosBrutos` json,
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	`convenio` varchar(255),
	`dsCategoria` varchar(255),
	`dsPlano` varchar(255),
	`competencia` varchar(20),
	`referencia` varchar(20),
	`protTasy` varchar(50),
	`nomeProtocolo` varchar(255),
	`protConv` varchar(100),
	`dtEntrega` datetime,
	`protStatus` varchar(50),
	`titulo` varchar(100),
	`dtTitulo` datetime,
	`dataVencimento` datetime,
	`dsSetorEntrada` varchar(255),
	`dsSetorLeito` varchar(255),
	`etapaConta` varchar(255),
	`setorEtapa` varchar(255),
	`dtEtapa` datetime,
	`userEtapa` varchar(100),
	`motivoDevolucao` text,
	`conta` varchar(50),
	`autorizacao` varchar(100),
	`matricula` varchar(100),
	`sexo` varchar(10),
	`idade` varchar(50),
	`codServico` varchar(50),
	`procedimentoPrincipal2` varchar(500),
	`dataInicio` varchar(20),
	`dataFim` varchar(20),
	`dsMotivoAlta` varchar(255),
	`medicoResp` varchar(255),
	`crm` varchar(50),
	`valorConta` decimal(15,2),
	CONSTRAINT `Tasy_maternidadeela_atendimentos_stagion_id` PRIMARY KEY(`id`)
);

CREATE TABLE `TASY_hemolabor_atendimentos_stagion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int,
	`numeroAtendimento` varchar(50),
	`tipoSaida` varchar(100),
	`local` varchar(255),
	`paciente` varchar(255),
	`carater` varchar(50),
	`dataAdmissao` datetime,
	`dataAlta` datetime,
	`tipoAtendimento` varchar(100),
	`servico` varchar(255),
	`procedimentoPrincipal` varchar(255),
	`centroCusto` varchar(100),
	`dadosBrutos` json,
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	`convenio` varchar(255),
	`dsCategoria` varchar(255),
	`dsPlano` varchar(255),
	`competencia` varchar(20),
	`referencia` varchar(20),
	`protTasy` varchar(50),
	`nomeProtocolo` varchar(255),
	`protConv` varchar(100),
	`dtEntrega` datetime,
	`protStatus` varchar(50),
	`titulo` varchar(100),
	`dtTitulo` datetime,
	`dataVencimento` datetime,
	`dsSetorEntrada` varchar(255),
	`dsSetorLeito` varchar(255),
	`etapaConta` varchar(255),
	`setorEtapa` varchar(255),
	`dtEtapa` datetime,
	`userEtapa` varchar(100),
	`motivoDevolucao` text,
	`conta` varchar(50),
	`autorizacao` varchar(100),
	`matricula` varchar(100),
	`sexo` varchar(10),
	`idade` varchar(50),
	`codServico` varchar(50),
	`procedimentoPrincipal2` varchar(500),
	`dataInicio` varchar(20),
	`dataFim` varchar(20),
	`dsMotivoAlta` varchar(255),
	`medicoResp` varchar(255),
	`crm` varchar(50),
	`valorConta` decimal(15,2),
	CONSTRAINT `TASY_hemolabor_atendimentos_stagion_id` PRIMARY KEY(`id`)
);

CREATE TABLE `warleine_atendimentos_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	CONSTRAINT `warleine_atendimentos_staging_id` PRIMARY KEY(`id`)
);

CREATE TABLE `warleine_faturamento_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	CONSTRAINT `warleine_faturamento_staging_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_aa_conta` ON `ajustes_auditoria` (`numeroConta`,`estabelecimentoId`);
CREATE INDEX `idx_aa_tipo` ON `ajustes_auditoria` (`tipoAjuste`);
CREATE INDEX `idx_aa_item` ON `ajustes_auditoria` (`codigoItem`);
CREATE INDEX `idx_aa_status` ON `ajustes_auditoria` (`statusAjuste`);
CREATE INDEX `idx_aprd_estab_tipo` ON `aprendizado_auditoria` (`estabelecimentoId`,`tipoAprendizado`);
CREATE INDEX `idx_aprd_convenio` ON `aprendizado_auditoria` (`convenio`);
CREATE INDEX `idx_aprd_codigo` ON `aprendizado_auditoria` (`codigoItem`);
CREATE INDEX `idx_aprd_confianca` ON `aprendizado_auditoria` (`confianca`);
CREATE INDEX `idx_aprd_ativo` ON `aprendizado_auditoria` (`ativo`);
CREATE INDEX `idx_atend_origem` ON `atendimentos` (`origemSistema`,`origemId`);
CREATE INDEX `idx_atend_paciente` ON `atendimentos` (`pacienteId`);
CREATE INDEX `idx_atend_estabelecimento` ON `atendimentos` (`estabelecimentoId`);
CREATE INDEX `idx_atend_data` ON `atendimentos` (`dataAtendimento`);
CREATE INDEX `idx_cc_snapshot` ON `conferencia_correcao` (`snapshotId`);
CREATE INDEX `idx_cc_conta_estab` ON `conferencia_correcao` (`numeroConta`,`estabelecimentoId`);
CREATE INDEX `idx_cc_status` ON `conferencia_correcao` (`statusCorrecao`);
CREATE INDEX `idx_cci_numconta` ON `contas_convenio_itens` (`numeroConta`);
CREATE INDEX `idx_cci_convenio` ON `contas_convenio_itens` (`convenio`);
CREATE INDEX `idx_cci_estab` ON `contas_convenio_itens` (`estabelecimentoId`);
CREATE INDEX `idx_cci_origem` ON `contas_convenio_itens` (`origem`);
CREATE INDEX `idx_cci_status` ON `contas_convenio_itens` (`statusAnalise`);
CREATE INDEX `idx_cci_competencia` ON `contas_convenio_itens` (`competencia`);
CREATE INDEX `idx_cci_codigo_item` ON `contas_convenio_itens` (`codigoItem`);
CREATE INDEX `idx_cci_guia` ON `contas_convenio_itens` (`numeroGuia`);
CREATE INDEX `idx_ccr_numconta_estab` ON `contas_convenio_resumo` (`numeroConta`,`estabelecimentoId`);
CREATE INDEX `idx_ccr_convenio` ON `contas_convenio_resumo` (`convenio`);
CREATE INDEX `idx_ccr_status` ON `contas_convenio_resumo` (`statusAnaliseResumo`);
CREATE INDEX `idx_contrato_estab` ON `contratos` (`estabelecimentoId`);
CREATE INDEX `idx_contrato_status` ON `contratos` (`status`);
CREATE INDEX `idx_contrato_data_fim` ON `contratos` (`dataFim`);
CREATE INDEX `idx_contrato_hist_contrato` ON `contratos_historico` (`contratoId`);
CREATE INDEX `idx_conv_map_estab` ON `convenio_mapeamento` (`estabelecimentoId`);
CREATE INDEX `idx_conv_map_nome_origem` ON `convenio_mapeamento` (`nome_origem`);
CREATE INDEX `idx_conv_map_convenio_id` ON `convenio_mapeamento` (`convenioId`);
CREATE INDEX `idx_conv_map_unique` ON `convenio_mapeamento` (`estabelecimentoId`,`nome_origem`,`codigo_origem`);
CREATE INDEX `idx_fp_conta` ON `falhas_prontuario` (`numeroConta`,`estabelecimentoId`);
CREATE INDEX `idx_fp_categoria` ON `falhas_prontuario` (`categoriaFalha`);
CREATE INDEX `idx_fp_status` ON `falhas_prontuario` (`statusFalha`);
CREATE INDEX `idx_fd_padrao` ON `feedback_divergencias` (`padraoId`);
CREATE INDEX `idx_fd_estab` ON `feedback_divergencias` (`estabelecimentoId`);
CREATE INDEX `idx_fd_decisao` ON `feedback_divergencias` (`decisao`);
CREATE INDEX `idx_fin_cc_codigo` ON `fin_centros_custo` (`codigo`);
CREATE INDEX `idx_fin_cc_ativo` ON `fin_centros_custo` (`ativo`);
CREATE INDEX `idx_fin_cliente_empresa` ON `fin_clientes` (`empresaId`);
CREATE INDEX `idx_fin_empresa_estab` ON `fin_empresas` (`estabelecimentoId`);
CREATE INDEX `idx_fin_extrato_banco` ON `fin_extratos` (`bancoId`);
CREATE INDEX `idx_fin_extrato_data` ON `fin_extratos` (`data`);
CREATE INDEX `idx_fin_extrato_conciliado` ON `fin_extratos` (`conciliado`);
CREATE INDEX `idx_fin_previsao_empresa` ON `fin_previsao_receita` (`empresaId`);
CREATE INDEX `idx_fin_previsao_data` ON `fin_previsao_receita` (`dataPrevisao`);
CREATE INDEX `idx_fin_recebivel_empresa` ON `fin_recebiveis` (`empresaId`);
CREATE INDEX `idx_fin_recebivel_cliente` ON `fin_recebiveis` (`clienteId`);
CREATE INDEX `idx_fin_recebivel_vencimento` ON `fin_recebiveis` (`dataVencimento`);
CREATE INDEX `idx_fin_recebivel_recebido` ON `fin_recebiveis` (`recebido`);
CREATE INDEX `idx_fin_transacao_empresa` ON `fin_transacoes` (`empresaId`);
CREATE INDEX `idx_fin_transacao_categoria` ON `fin_transacoes` (`categoriaId`);
CREATE INDEX `idx_fin_transacao_vencimento` ON `fin_transacoes` (`dataVencimento`);
CREATE INDEX `idx_fin_transacao_pago` ON `fin_transacoes` (`pago`);
CREATE INDEX `idx_integ_coluna_tabela` ON `integracao_colunas` (`tabelaId`);
CREATE INDEX `idx_integ_conexao_estab` ON `integracao_conexoes` (`estabelecimentoId`);
CREATE INDEX `idx_integ_mapcampo_map` ON `integracao_mapeamento_campos` (`mapeamentoId`);
CREATE INDEX `idx_integ_map_conexao` ON `integracao_mapeamentos` (`conexaoOrigemId`);
CREATE INDEX `idx_integ_map_tabela` ON `integracao_mapeamentos` (`tabelaDestinoId`);
CREATE INDEX `idx_integ_map_estab` ON `integracao_mapeamentos` (`estabelecimentoId`);
CREATE INDEX `idx_integ_sync_map` ON `integracao_sincronizacoes` (`mapeamentoId`);
CREATE INDEX `idx_integ_sync_status` ON `integracao_sincronizacoes` (`status`);
CREATE INDEX `idx_integ_sync_inicio` ON `integracao_sincronizacoes` (`iniciadoEm`);
CREATE INDEX `idx_integ_tabela_nome` ON `integracao_tabelas` (`nome`);
CREATE INDEX `idx_integ_tabela_estab` ON `integracao_tabelas` (`estabelecimentoId`);
CREATE INDEX `idx_lac_conta` ON `log_analise_comparacao` (`numeroConta`,`estabelecimentoId`);
CREATE INDEX `idx_lac_padrao` ON `log_analise_comparacao` (`padraoId`);
CREATE INDEX `idx_lac_criado` ON `log_analise_comparacao` (`criadoEm`);
CREATE INDEX `idx_nfse_hosp_estab` ON `nfse_hospitais` (`estabelecimentoId`);
CREATE INDEX `idx_nfse_nota_hospital` ON `nfse_notas` (`hospitalId`);
CREATE INDEX `idx_nfse_nota_convenio` ON `nfse_notas` (`convenioId`);
CREATE INDEX `idx_nfse_nota_emissao` ON `nfse_notas` (`dataEmissao`);
CREATE INDEX `idx_nfse_nota_emitida` ON `nfse_notas` (`nfEmitida`);
CREATE INDEX `idx_notif_atend_numatend` ON `notificacoes_atendimento` (`numatend`);
CREATE INDEX `idx_notif_atend_estab` ON `notificacoes_atendimento` (`estabelecimentoId`);
CREATE INDEX `idx_notif_atend_criado` ON `notificacoes_atendimento` (`criadoEm`);
CREATE INDEX `idx_notif_item_notificacao` ON `notificacoes_atendimento_item` (`notificacaoId`);
CREATE INDEX `idx_notif_item_motivo` ON `notificacoes_atendimento_item` (`motivo`);
CREATE INDEX `idx_pgc_estab_conv_item` ON `padraoGlosaConvenio` (`estabelecimentoId`,`convenio`,`codigoItem`);
CREATE INDEX `idx_pgc_convenio` ON `padraoGlosaConvenio` (`convenio`);
CREATE INDEX `idx_pgc_risco` ON `padraoGlosaConvenio` (`nivelRisco`);
CREATE INDEX `idx_ppc_estab_conv_item` ON `padraoPrecoConvenio` (`estabelecimentoId`,`convenio`,`codigoItem`);
CREATE INDEX `idx_ppc_convenio` ON `padraoPrecoConvenio` (`convenio`);
CREATE INDEX `idx_ppc_setor` ON `padraoPrecoConvenio` (`setor`);
CREATE INDEX `idx_pqi_estab_conv_item` ON `padraoQuantidadeItem` (`estabelecimentoId`,`convenio`,`codigoItem`);
CREATE INDEX `idx_pqi_setor` ON `padraoQuantidadeItem` (`setor`);
CREATE INDEX `idx_proposta_item_proposta` ON `proposta_itens` (`propostaId`);
CREATE INDEX `idx_proposta_estab` ON `propostas` (`estabelecimentoId`);
CREATE INDEX `idx_proposta_status` ON `propostas` (`status`);
CREATE INDEX `idx_proposta_cliente` ON `propostas` (`cliente`);
CREATE INDEX `idx_receb_geral_estab` ON `recebimento_geral` (`estabelecimentoId`);
CREATE INDEX `idx_receb_geral_convenio` ON `recebimento_geral` (`convenio`);
CREATE INDEX `idx_receb_geral_mes` ON `recebimento_geral` (`mes_producao`);
CREATE INDEX `idx_receb_geral_protocolo` ON `recebimento_geral` (`protocolo`);
CREATE INDEX `idx_receb_geral_conta` ON `recebimento_geral` (`numero_conta`);
CREATE INDEX `idx_receb_geral_convenio_id` ON `recebimento_geral` (`convenioId`);
CREATE INDEX `idx_sa_conta_estab` ON `snapshot_auditoria` (`numeroConta`,`estabelecimentoId`);
CREATE INDEX `idx_sa_status` ON `snapshot_auditoria` (`statusSnapshot`);
CREATE INDEX `idx_sa_auditor` ON `snapshot_auditoria` (`auditorId`);
CREATE INDEX `idx_cbhpm_codigo` ON `tabelaCbhpm` (`codigoProcedimento`);
CREATE INDEX `idx_cbhpm_porte` ON `tabelaCbhpm` (`porte`);
CREATE INDEX `idx_cbhpm_porte_anest` ON `tabelaCbhpm` (`porteAnestesico`);
CREATE INDEX `idx_porte_conv_estab` ON `tabelaPorteConvenio` (`estabelecimentoId`,`convenio`);
CREATE INDEX `idx_porte_conv_codigo` ON `tabelaPorteConvenio` (`codigoProcedimento`);
CREATE INDEX `idx_porte_conv_conv_codigo` ON `tabelaPorteConvenio` (`convenio`,`codigoProcedimento`);
CREATE INDEX `idx_vinc_cod_estab` ON `vinculacao_codigos` (`estabelecimentoId`);
CREATE INDEX `idx_vinc_cod_hospital` ON `vinculacao_codigos` (`codigoHospital`);
CREATE INDEX `idx_vinc_cod_convenio` ON `vinculacao_codigos` (`codigoConvenio`);
CREATE INDEX `idx_vinc_unique` ON `vinculacao_codigos` (`estabelecimentoId`,`convenioId`,`codigoHospital`,`codigoConvenio`);
CREATE INDEX `idx_atend_origem_sistema` ON `atendimentos_unificados` (`origemSistema`);
CREATE INDEX `idx_atend_origem_id` ON `atendimentos_unificados` (`origemId`);
CREATE INDEX `idx_atend_estab` ON `atendimentos_unificados` (`estabelecimentoId`);
CREATE INDEX `idx_atend_data_entrada` ON `atendimentos_unificados` (`data_entrada`);
CREATE INDEX `idx_atend_faturar_estab` ON `atendimentos_a_faturar` (`estabelecimentoId`);
CREATE INDEX `idx_atend_faturar_numatend` ON `atendimentos_a_faturar` (`numatend`);
CREATE INDEX `idx_atend_faturar_tipo` ON `atendimentos_a_faturar` (`tipoatend`);
CREATE INDEX `idx_atend_faturar_datatend` ON `atendimentos_a_faturar` (`datatend`);
CREATE INDEX `idx_atend_hist_atend` ON `atendimentos_historico` (`atendimentoId`);
CREATE INDEX `idx_atend_sem_conta_estab` ON `atendimentos_sem_conta` (`estabelecimentoId`);
CREATE INDEX `idx_atend_sem_conta_numatend` ON `atendimentos_sem_conta` (`numatend`);
CREATE INDEX `idx_atend_sem_conta_tipo` ON `atendimentos_sem_conta` (`tipoatend`);
CREATE INDEX `idx_atend_sem_conta_datatend` ON `atendimentos_sem_conta` (`datatend`);
CREATE INDEX `idx_conc_auto_faturamento` ON `conciliados_automatico` (`faturamentoUnificadoId`);
CREATE INDEX `idx_conc_auto_estab` ON `conciliados_automatico` (`estabelecimentoId`);
CREATE INDEX `idx_conc_auto_status` ON `conciliados_automatico` (`statusConciliacao`);
CREATE INDEX `idx_conc_auto_competencia` ON `conciliados_automatico` (`competencia`);
CREATE INDEX `idx_conc_auto_convenio` ON `conciliados_automatico` (`convenio`);
CREATE INDEX `idx_conc_auto_guia` ON `conciliados_automatico` (`numeroGuia`);
CREATE INDEX `idx_conc_auto_codigo` ON `conciliados_automatico` (`codigoItem`);
CREATE INDEX `idx_conc_auto_metodo` ON `conciliados_automatico` (`metodoConciliacao`);
CREATE INDEX `idx_custos_cache_estab` ON `custos_produtos_cache` (`estabelecimento_id`);
CREATE INDEX `idx_custos_cache_codprod` ON `custos_produtos_cache` (`codprod`);
CREATE INDEX `idx_custos_cache_tipoprod` ON `custos_produtos_cache` (`tipoprod`);
CREATE INDEX `idx_custos_cache_codtbmm` ON `custos_produtos_cache` (`codtbmm`);
CREATE INDEX `idx_custos_cache_codplaco` ON `custos_produtos_cache` (`codplaco`);
CREATE INDEX `idx_custos_cache_nome_convenio` ON `custos_produtos_cache` (`nome_convenio`);
CREATE INDEX `idx_fatur_origem_sistema` ON `faturamento_unificado` (`origemSistema`);
CREATE INDEX `idx_fatur_estab` ON `faturamento_unificado` (`estabelecimentoId`);
CREATE INDEX `idx_fatur_conta` ON `faturamento_unificado` (`contaNumero`);
CREATE INDEX `idx_fatur_guia` ON `faturamento_unificado` (`numeroGuia`);
CREATE INDEX `idx_fatur_convenio` ON `faturamento_unificado` (`convenio`);
CREATE INDEX `idx_fatur_competencia` ON `faturamento_unificado` (`competencia`);
CREATE INDEX `idx_fatur_codigo_item` ON `faturamento_unificado` (`codigoItem`);
CREATE INDEX `idx_fatur_status_conciliacao` ON `faturamento_unificado` (`statusConciliacao`);
CREATE INDEX `idx_fatur_paciente` ON `faturamento_unificado` (`pacienteNome`);
CREATE INDEX `idx_fat_ext_estab` ON `faturamento_externo` (`estabelecimento_id`);
CREATE INDEX `idx_fat_ext_convenio` ON `faturamento_externo` (`convenio`);
CREATE INDEX `idx_fat_ext_mes_ano` ON `faturamento_externo` (`mes_ano`);
CREATE INDEX `idx_fatur_geral_estab` ON `faturamento_geral` (`estabelecimentoId`);
CREATE INDEX `idx_fatur_geral_numconta` ON `faturamento_geral` (`numconta`);
CREATE INDEX `idx_fatur_geral_nomeconv` ON `faturamento_geral` (`nomeconv`);
CREATE INDEX `idx_fatur_geral_mesprod` ON `faturamento_geral` (`mesprod`);
CREATE INDEX `idx_fatur_geral_config` ON `faturamento_geral` (`configId`);
CREATE INDEX `idx_gesthor_atend_estab` ON `gesthor_atendimentos_staging` (`estabelecimentoId`);
CREATE INDEX `idx_gesthor_atend_config` ON `gesthor_atendimentos_staging` (`configuracaoId`);
CREATE INDEX `idx_integ_fatur_estab` ON `integ_faturado` (`estabelecimento_id`);
CREATE INDEX `idx_integ_fatur_guia` ON `integ_faturado` (`guiacobra`);
CREATE INDEX `idx_integ_fatur_proc` ON `integ_faturado` (`procdisco`);
CREATE INDEX `idx_integ_fatur_mesprod` ON `integ_faturado` (`mesprod`);
CREATE INDEX `idx_integ_fatur_numconta` ON `integ_faturado` (`numconta`);
CREATE INDEX `idx_integ_fatur_nomeconv` ON `integ_faturado` (`nomeconv`);
CREATE INDEX `idx_omni_atend_estab` ON `omni_atendimentos_staging` (`estabelecimentoId`);
CREATE INDEX `idx_omni_atend_config` ON `omni_atendimentos_staging` (`configuracaoId`);
CREATE INDEX `idx_pac_cpf` ON `pacientes_unificados` (`cpf`);
CREATE INDEX `idx_pac_origem_sistema` ON `pacientes_unificados` (`origemSistema`);
CREATE INDEX `idx_proc_codigo` ON `procedimentos_unificados` (`codigo`);
CREATE INDEX `idx_proc_origem_sistema` ON `procedimentos_unificados` (`origemSistema`);
CREATE INDEX `idx_query_config_estab_sistema` ON `query_configuracoes` (`estabelecimentoId`,`sistema`);
CREATE INDEX `idx_query_config_sistema` ON `query_configuracoes` (`sistema`);
CREATE INDEX `idx_query_config_ativo` ON `query_configuracoes` (`ativo`);
CREATE INDEX `idx_rel_atend_cache_estab` ON `relatorio_atendimentos_cache` (`estabelecimentoId`);
CREATE INDEX `idx_rel_atend_cache_numatend` ON `relatorio_atendimentos_cache` (`numatend`);
CREATE INDEX `idx_rel_atend_cache_data` ON `relatorio_atendimentos_cache` (`data_atendimento`);
CREATE INDEX `idx_rel_atend_cache_codserv` ON `relatorio_atendimentos_cache` (`codserv`);
CREATE INDEX `idx_rel_atend_cache_codplaco` ON `relatorio_atendimentos_cache` (`codplaco`);
CREATE INDEX `idx_rel_atend_cache_codprest` ON `relatorio_atendimentos_cache` (`codprest`);
CREATE INDEX `idx_rel_atend_cache_codcc` ON `relatorio_atendimentos_cache` (`codcc`);
CREATE INDEX `idx_rel_atend_cache_tipo` ON `relatorio_atendimentos_cache` (`tipoatend`);
CREATE INDEX `idx_rel_atend_cache_estab_data` ON `relatorio_atendimentos_cache` (`estabelecimentoId`,`data_atendimento`);
CREATE INDEX `idx_sync_log_config` ON `sincronizacao_log` (`configuracaoId`);
CREATE INDEX `idx_sync_log_sistema` ON `sincronizacao_log` (`sistema`);
CREATE INDEX `idx_sync_log_status` ON `sincronizacao_log` (`status`);
CREATE INDEX `idx_sync_log_data` ON `sincronizacao_log` (`criadoEm`);
CREATE INDEX `idx_tasy_matela_estab` ON `Tasy_maternidadeela_atendimentos_stagion` (`estabelecimentoId`);
CREATE INDEX `idx_tasy_matela_config` ON `Tasy_maternidadeela_atendimentos_stagion` (`configId`);
CREATE INDEX `idx_tasy_hemolabor_estab` ON `TASY_hemolabor_atendimentos_stagion` (`estabelecimentoId`);
CREATE INDEX `idx_tasy_hemolabor_config` ON `TASY_hemolabor_atendimentos_stagion` (`configId`);
CREATE INDEX `idx_warleine_atend_estab` ON `warleine_atendimentos_staging` (`estabelecimentoId`);
CREATE INDEX `idx_warleine_atend_config` ON `warleine_atendimentos_staging` (`configId`);
CREATE INDEX `idx_warleine_fatur_estab` ON `warleine_faturamento_staging` (`estabelecimentoId`);
CREATE INDEX `idx_warleine_fatur_config` ON `warleine_faturamento_staging` (`configId`);
