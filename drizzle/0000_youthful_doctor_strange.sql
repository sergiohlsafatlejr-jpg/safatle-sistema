CREATE TABLE `ajustes_auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`tipoAjuste` enum('ALTERAR_QUANTIDADE','ALTERAR_VALOR','ADICIONAR_ITEM','REMOVER_ITEM','ALTERAR_SETOR') NOT NULL,
	`itemId` int,
	`codigoItem` varchar(50),
	`descricaoItem` text,
	`quantidadeOriginal` decimal(12,4),
	`valorOriginal` decimal(14,2),
	`quantidadeAjustada` decimal(12,4),
	`valorAjustado` decimal(14,2),
	`tipoItemAdicionado` varchar(50),
	`setorOriginal` varchar(255),
	`setorAjustado` varchar(255),
	`justificativa` text,
	`statusAjuste` enum('pendente','aplicado','revertido') NOT NULL DEFAULT 'pendente',
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ajustes_auditoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alertasDivergencia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoId` int NOT NULL,
	`procedimentoId` int,
	`regraId` int,
	`tipoAlerta` enum('valor_divergente','item_faltante','item_nao_permitido','quantidade_incorreta','codigo_invalido','regra_negocio','sugestao_ia') NOT NULL,
	`severidade` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`titulo` varchar(255) NOT NULL,
	`descricao` text NOT NULL,
	`valorCobrado` decimal(12,2),
	`valorEsperado` decimal(12,2),
	`diferenca` decimal(12,2),
	`codigoItem` varchar(50),
	`descricaoItem` varchar(255),
	`guiaNumero` varchar(100),
	`sugestaoCorrecao` text,
	`status` enum('pendente','analisando','corrigido','ignorado','aceito') NOT NULL DEFAULT 'pendente',
	`resolvidoPor` int,
	`dataResolucao` timestamp,
	`observacaoResolucao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertasDivergencia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `alertasVariacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipoAlerta` enum('queda','aumento','ambos') NOT NULL DEFAULT 'queda',
	`percentualLimite` int NOT NULL DEFAULT 20,
	`metrica` enum('faturamento','quantidade','glosa') NOT NULL DEFAULT 'faturamento',
	`agrupamento` varchar(50) DEFAULT 'convenio',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`notificarEmail` enum('sim','nao') DEFAULT 'nao',
	`ultimaVerificacao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertasVariacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`keyHash` varchar(255) NOT NULL,
	`keyPrefix` varchar(20) NOT NULL,
	`estabelecimentosPermitidos` json,
	`permissoes` json,
	`ultimoUso` timestamp,
	`totalUsos` int DEFAULT 0,
	`expiraEm` timestamp,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aprendizado_auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`tipoAprendizado` enum('FALHA_PRONTUARIO','AJUSTE_QUANTIDADE','AJUSTE_VALOR','ITEM_FALTANTE','DECISAO_DIVERGENCIA') NOT NULL,
	`convenio` varchar(255),
	`tipoProcedimento` varchar(100),
	`codigoItem` varchar(50),
	`descricaoItem` varchar(500),
	`setor` varchar(255),
	`dadosAprendizado` json NOT NULL,
	`totalOcorrencias` int NOT NULL DEFAULT 1,
	`confianca` decimal(5,2) DEFAULT '0.50',
	`ativo` int NOT NULL DEFAULT 1,
	`minimoOcorrencias` int DEFAULT 3,
	`ultimaAtualizacao` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `aprendizado_auditoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `argumentosConvenio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`codigoGlosa` varchar(20) NOT NULL,
	`argumentoCustomizado` text NOT NULL,
	`vezesUtilizado` int DEFAULT 0,
	`vezesDeferido` int DEFAULT 0,
	`vezesIndeferido` int DEFAULT 0,
	`taxaSucesso` decimal(5,2),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `argumentosConvenio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `arquivos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipoArquivo` enum('xml','excel','pdf','csv') NOT NULL,
	`direcao` enum('enviado','retornado') NOT NULL,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int,
	`userId` int NOT NULL,
	`s3Key` varchar(512) NOT NULL,
	`s3Url` text NOT NULL,
	`tamanho` int,
	`status` enum('pendente','processado','erro','processando') NOT NULL DEFAULT 'pendente',
	`progresso` int DEFAULT 0,
	`totalItens` int,
	`itensProcessados` int DEFAULT 0,
	`dataReferencia` timestamp,
	`dataPagamento` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `arquivos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atendimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL,
	`origemId` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`pacienteId` varchar(100),
	`pacienteNome` varchar(255),
	`numeroAtendimento` varchar(100),
	`dataAdmissao` timestamp,
	`dataAlta` timestamp,
	`dataAtendimento` timestamp,
	`tipoAtendimento` varchar(50),
	`tipoSaida` varchar(50),
	`local` varchar(100),
	`carater` varchar(100),
	`servico` varchar(100),
	`procedimentoPrincipal` varchar(255),
	`centroCusto` varchar(100),
	`dadosBrutos` json,
	`sincronizadoEm` timestamp NOT NULL DEFAULT (now()),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `atendimentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tabela` varchar(100) NOT NULL,
	`registroId` int NOT NULL,
	`tipoAcao` varchar(20) NOT NULL,
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`valoresAnteriores` json,
	`valoresNovos` json,
	`estabelecimentoId` int,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `auditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `avisosInternos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`conteudo` text NOT NULL,
	`tipo` enum('informacao','alerta','urgente') NOT NULL DEFAULT 'informacao',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPorId` int NOT NULL,
	`criadoPorNome` varchar(255),
	`expiraEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `avisosInternos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `camposComparacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`campoOrigem` varchar(100) NOT NULL,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`obrigatorio` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`tolerancia` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `camposComparacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `codigosProcedimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`descricao` text NOT NULL,
	`valorReferencia` decimal(10,2),
	`categoria` varchar(100),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `codigosProcedimentos_id` PRIMARY KEY(`id`),
	CONSTRAINT `codigosProcedimentos_codigo_unique` UNIQUE(`codigo`)
);
--> statement-breakpoint
CREATE TABLE `comparacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoEnviadoId` int NOT NULL,
	`arquivoRetornadoId` int NOT NULL,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int,
	`userId` int NOT NULL,
	`status` enum('pendente','concluida','erro') NOT NULL DEFAULT 'pendente',
	`totalItensEnviados` int DEFAULT 0,
	`totalItensRetornados` int DEFAULT 0,
	`totalDivergencias` int DEFAULT 0,
	`valorTotalEnviado` decimal(12,2),
	`valorTotalRetornado` decimal(12,2),
	`diferencaValor` decimal(12,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comparacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compartilhamentosDashboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dashboardId` int NOT NULL,
	`compartilhadoPorId` int NOT NULL,
	`compartilhadoComId` int NOT NULL,
	`permissao` enum('visualizar','editar') NOT NULL DEFAULT 'visualizar',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compartilhamentosDashboard_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conciliacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`mesReferencia` int NOT NULL,
	`anoReferencia` int NOT NULL,
	`convenioId` int,
	`dadoTasyId` int,
	`demonstrativoItemId` int,
	`guiaTasy` varchar(100),
	`atendimentoTasy` varchar(50),
	`codigoTasy` varchar(50),
	`descricaoTasy` text,
	`quantidadeTasy` decimal(10,4),
	`valorTasy` decimal(12,4),
	`dataTasy` timestamp,
	`pacienteTasy` varchar(255),
	`guiaDemo` varchar(100),
	`codigoDemo` varchar(50),
	`descricaoDemo` text,
	`quantidadeDemo` decimal(10,4),
	`valorPagoDemo` decimal(12,4),
	`valorGlosadoDemo` decimal(12,4),
	`motivoGlosaDemo` text,
	`dataDemo` timestamp,
	`pacienteDemo` varchar(255),
	`statusConciliacao` enum('conciliado','divergencia_valor','divergencia_quantidade','nao_encontrado_demo','nao_encontrado_tasy','glosado','pago_parcial') NOT NULL DEFAULT 'conciliado',
	`diferencaValor` decimal(12,4),
	`diferencaQuantidade` decimal(10,4),
	`observacao` text,
	`receberHospital` varchar(1),
	`vinculacaoId` int,
	`metodoMatch` enum('codigo_direto','vinculacao','manual') DEFAULT 'codigo_direto',
	`arquivoDemoId` int,
	`pendenteVinculacao` enum('sim','nao') DEFAULT 'nao',
	`processadoPor` int,
	`dataProcessamento` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conciliacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conferencia_correcao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`snapshotId` int NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`codigoItem` varchar(50),
	`descricaoItem` text,
	`tipoItem` varchar(50),
	`tipoApontamento` enum('divergencia_aceita','falha_prontuario','ajuste_auditoria') NOT NULL,
	`valorAntes` decimal(14,2),
	`quantidadeAntes` decimal(12,4),
	`detalhesAntes` json,
	`valorDepois` decimal(14,2),
	`quantidadeDepois` decimal(12,4),
	`detalhesDepois` json,
	`statusCorrecao` enum('corrigido','parcialmente_corrigido','nao_corrigido','novo_problema','item_removido','item_adicionado') NOT NULL,
	`descricaoMudanca` text,
	`impactoFinanceiro` decimal(14,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conferencia_correcao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_convenio_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origem` enum('XML','BANCO_CLIENTE') NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`numeroGuia` varchar(100),
	`numeroGuiaOperadora` varchar(100),
	`numeroLote` varchar(50),
	`senha` varchar(50),
	`protocolo` varchar(100),
	`pacienteNome` varchar(255),
	`carteiraBeneficiario` varchar(100),
	`convenio` varchar(255),
	`convenioId` int,
	`estabelecimentoId` int NOT NULL,
	`tipoItem` varchar(50),
	`codigoItem` varchar(50),
	`codigoItemTuss` varchar(50),
	`descricaoItem` text,
	`codigoTabela` varchar(10),
	`quantidade` decimal(12,4),
	`valorUnitario` decimal(12,4),
	`valorTotal` decimal(14,2),
	`dataExecucao` timestamp,
	`dataReferencia` timestamp,
	`competencia` varchar(20),
	`profissionalExecutante` varchar(255),
	`setor` varchar(255),
	`arquivoId` int,
	`statusAnalise` enum('pendente','conforme','divergente','revisado') NOT NULL DEFAULT 'pendente',
	`divergencias` json,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_convenio_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_convenio_resumo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`origem` enum('XML','BANCO_CLIENTE') NOT NULL,
	`convenio` varchar(255),
	`convenioId` int,
	`pacienteNome` varchar(255),
	`carteiraBeneficiario` varchar(100),
	`totalItens` int NOT NULL DEFAULT 0,
	`valorTotal` decimal(14,2) DEFAULT '0',
	`dataInternacao` timestamp,
	`dataAlta` timestamp,
	`competencia` varchar(20),
	`statusAnaliseResumo` enum('pendente','conforme','divergente','revisado') NOT NULL DEFAULT 'pendente',
	`totalDivergencias` int DEFAULT 0,
	`totalAlertas` int DEFAULT 0,
	`scoreRisco` int,
	`detalhesRisco` json,
	`isOutlierValor` int DEFAULT 0,
	`divergenciasGerais` json,
	`dataBusca` timestamp NOT NULL DEFAULT (now()),
	`buscadoPor` int,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_convenio_resumo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contasPagasTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`importacaoId` int NOT NULL,
	`dataRetorno` timestamp,
	`seqRetornoGeral` varchar(50),
	`titulo` varchar(255),
	`guia` varchar(100),
	`nrSeqConta` varchar(50),
	`nrConta` varchar(50),
	`convenio` varchar(255),
	`nrProtocolo` varchar(100),
	`dataRecebimento` timestamp,
	`pagoConta` decimal(12,4),
	`glosaConta` decimal(12,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contasPagasTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contasTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`importacaoId` int NOT NULL,
	`nrInternoConta` varchar(50) NOT NULL,
	`guia` varchar(100),
	`atendimento` varchar(50),
	`dataFaturado` timestamp,
	`convenio` varchar(255),
	`paciente` varchar(255),
	`dataConta` timestamp,
	`setor` varchar(255),
	`protocolo` varchar(100),
	`statusProtocolo` varchar(50),
	`totalProcedimentos` int DEFAULT 0,
	`valorTotalProcedimentos` decimal(15,4),
	`totalMatMed` int DEFAULT 0,
	`valorTotalMatMed` decimal(15,4),
	`valorTotalConta` decimal(15,4),
	`status` enum('aberta','faturada','paga','glosada','parcial') DEFAULT 'faturada',
	`valorPago` decimal(15,4),
	`valorGlosado` decimal(15,4),
	`dataPagamento` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contasTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contratos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int,
	`contratanteNome` varchar(255) NOT NULL,
	`contratanteCnpj` varchar(20),
	`contratadaNome` varchar(255),
	`contratadaCnpj` varchar(20),
	`servicos` json,
	`modelosCobranca` json,
	`valorMensal` decimal(15,2),
	`valorHora` decimal(15,2),
	`valorPercentualConvenio` decimal(5,2),
	`prazoContrato` int,
	`dataInicio` date,
	`dataFim` date,
	`status` enum('rascunho','ativo','suspenso','encerrado','renovacao') NOT NULL DEFAULT 'rascunho',
	`dadosCompletos` json,
	`docxUrl` text,
	`docxKey` varchar(512),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contratos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contratos_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contratoId` int NOT NULL,
	`tipo` enum('criacao','alteracao','reajuste','renovacao','suspensao','encerramento') NOT NULL,
	`descricao` text,
	`valorAnterior` decimal(15,2),
	`valorNovo` decimal(15,2),
	`indiceReajuste` varchar(50),
	`percentualReajuste` decimal(5,2),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contratos_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convenioEstabelecimentoPrestador` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`codigoPrestador` varchar(50) NOT NULL,
	`nomePrestador` varchar(255),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convenioEstabelecimentoPrestador_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convenio_mapeamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`nome_origem` varchar(255) NOT NULL,
	`codigo_origem` varchar(50),
	`convenioId` int NOT NULL,
	`fonte` enum('tasy','integracao','xml','excel','manual') NOT NULL DEFAULT 'manual',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`metodo_match` enum('automatico','manual') NOT NULL DEFAULT 'manual',
	`confianca` decimal(5,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convenio_mapeamento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `convenios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`codigo` varchar(50),
	`estabelecimentoId` int,
	`prazoRecursoGlosa` int DEFAULT 30,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convenios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dadosTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`importacaoId` int NOT NULL,
	`atendimento` varchar(50) NOT NULL,
	`nrInternoConta` varchar(50),
	`sequencia` varchar(50),
	`dataFaturado` timestamp,
	`guia` varchar(100),
	`convenio` varchar(255),
	`paciente` varchar(255),
	`dataConta` timestamp,
	`codigo` varchar(50),
	`codigoConvenio` varchar(50),
	`descricao` text,
	`quantidade` decimal(10,4),
	`unidade` varchar(20),
	`valorUnitario` decimal(12,4),
	`valorTotal` decimal(12,4),
	`setor` varchar(255),
	`protocolo` varchar(100),
	`statusProtocolo` varchar(50),
	`tipo` enum('MATERIAL','HONORARIO') NOT NULL,
	`medico` varchar(255),
	`funcaoMedico` varchar(100),
	`crm` varchar(50),
	`valorMedico` decimal(12,4),
	`processado` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`procedimentoId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dadosTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dashboardsSalvos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`configuracao` text NOT NULL,
	`comparativoAtivo` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`periodo1Mes` int,
	`periodo1Ano` int,
	`periodo2Mes` int,
	`periodo2Ano` int,
	`favorito` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`ultimoAcesso` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboardsSalvos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decisoesGlosa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`codigoGlosa` varchar(20) NOT NULL,
	`codigoProcedimento` varchar(50),
	`tipoProcedimento` varchar(50),
	`decisao` enum('aceitar','recursar') NOT NULL,
	`resultadoRecurso` enum('pendente','deferido','deferido_parcial','indeferido'),
	`valorGlosado` decimal(10,2),
	`valorRecuperado` decimal(10,2),
	`motivoDecisao` text,
	`procedimentoId` int,
	`recursoId` int,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decisoesGlosa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demonstrativo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivo_id` int NOT NULL,
	`origem_tipo` enum('xml','excel') NOT NULL,
	`convenio_id` int,
	`numero_guia` varchar(50),
	`protocolo` varchar(50),
	`lote_prestador` varchar(50),
	`data_pagamento` date,
	`carteira_beneficiario` varchar(50),
	`nome_beneficiario` varchar(255),
	`sequencial_item` int,
	`codigo_item` varchar(50),
	`descricao_item` text,
	`data_execucao` date,
	`quantidade` decimal(12,3),
	`valor_informado` decimal(12,2) DEFAULT '0.00',
	`valor_pago` decimal(12,2) DEFAULT '0.00',
	`valor_glosa` decimal(12,2) DEFAULT '0.00',
	`codigo_glosa` varchar(500),
	`situacao_item` varchar(100),
	`tipo_lancamento` varchar(100),
	`erro_tiss` varchar(255),
	`data_referencia` date,
	`estabelecimentoId` int,
	`classificacao_glosa` enum('pendente','aceitar','recursar','auto_aceitar','auto_recursar') DEFAULT 'pendente',
	`classificacao_confianca` int,
	`classificacao_motivo` text,
	`motivo_aceite` text,
	`data_aceite` timestamp,
	`recurso_status` enum('sem_recurso','recurso_criado','recurso_enviado','recurso_deferido','recurso_indeferido') DEFAULT 'sem_recurso',
	`recurso_id` int,
	`data_importacao_sistema` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demonstrativo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demonstrativoItens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`arquivoId` int NOT NULL,
	`convenioId` int NOT NULL,
	`codigo` varchar(50),
	`descricao` text,
	`quantidade` decimal(10,4) DEFAULT '1',
	`valorUnitario` decimal(12,4),
	`valorTotal` decimal(12,4),
	`valorPago` decimal(12,4),
	`valorGlosado` decimal(12,4),
	`motivoGlosa` text,
	`codigoGlosa` varchar(20),
	`status` enum('pago','glosado','pago_parcial') NOT NULL DEFAULT 'pago',
	`guiaNumero` varchar(100),
	`dataExecucao` timestamp,
	`dataReferencia` timestamp,
	`pacienteNome` varchar(255),
	`pacienteCarteirinha` varchar(100),
	`nomeMedico` varchar(255),
	`crmMedico` varchar(50),
	`tipoDespesa` enum('gas','medicamento','material','diaria','taxa','procedimento','outros') DEFAULT 'procedimento',
	`dadosExtras` json,
	`procedimentoOrigemId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `demonstrativoItens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `detalhesItensConciliacaoTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemConciliacaoId` int NOT NULL,
	`tipoItem` enum('procedimento','material','medicamento') NOT NULL,
	`codigo` varchar(50),
	`descricao` text,
	`quantidadeTasy` decimal(10,4),
	`valorUnitarioTasy` decimal(12,4),
	`valorTotalTasy` decimal(12,4),
	`quantidadePaga` decimal(10,4),
	`valorUnitarioPago` decimal(12,4),
	`valorTotalPago` decimal(12,4),
	`valorGlosado` decimal(12,4),
	`codigoGlosa` varchar(50),
	`motivoGlosa` text,
	`statusItem` enum('ok','pago','glosado','parcial','nao_encontrado') DEFAULT 'nao_encontrado',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `detalhesItensConciliacaoTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `divergencias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`comparacaoId` int NOT NULL,
	`tipo` enum('valor','quantidade','ausente_retorno','ausente_envio','dados') NOT NULL,
	`procedimentoEnviadoId` int,
	`procedimentoRetornadoId` int,
	`campo` varchar(100),
	`valorEnviado` text,
	`valorRetornado` text,
	`diferenca` decimal(10,2),
	`descricao` text,
	`motivoGlosa` varchar(255),
	`categoriaGlosa` enum('valor_divergente','procedimento_nao_autorizado','documentacao_incompleta','prazo_excedido','duplicidade','codigo_invalido','quantidade_excedente','paciente_nao_elegivel','outros'),
	`resolvido` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `divergencias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `estabelecimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`endereco` text,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estabelecimentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `falhas_prontuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`tipoFalha` varchar(100) NOT NULL,
	`categoriaFalha` varchar(50) NOT NULL,
	`descricao` text,
	`severidade` enum('leve','moderada','grave','critica') NOT NULL DEFAULT 'moderada',
	`statusFalha` enum('aberta','corrigida','justificada') NOT NULL DEFAULT 'aberta',
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `falhas_prontuario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faturadoTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`importacaoId` int NOT NULL,
	`sequencia` varchar(50),
	`convenio` varchar(255),
	`competencia` varchar(20),
	`protocolo` varchar(100),
	`setor` varchar(255),
	`atend` varchar(50),
	`conta` varchar(50),
	`profExec` varchar(255),
	`cdMotivoExcConta` varchar(50),
	`dsComplMotivoExcon` text,
	`tipoItem` enum('PROC/TAXA','MAT/MED') NOT NULL,
	`cdItem` varchar(50),
	`cdItemTuss` varchar(50),
	`dtItem` timestamp,
	`descricao` text,
	`qtd` decimal(10,4),
	`vlFaturado` decimal(12,4),
	`aReceber` decimal(12,4),
	`vlPago` decimal(12,4),
	`vlGlosa` decimal(12,4),
	`motivoGlosa` text,
	`retorno` varchar(50),
	`dtPgto` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faturadoTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `faturamento_tiss` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero_lote` varchar(20),
	`sequencial_transacao` varchar(20),
	`data_registro` timestamp,
	`registro_ans` varchar(10),
	`numero_guia_prestador` varchar(20),
	`numero_guia_operadora` varchar(20),
	`senha` varchar(20),
	`carteira_beneficiario` varchar(20),
	`tipo_item` varchar(20),
	`sequencial_item` int,
	`data_execucao` timestamp,
	`codigo_tabela` varchar(5),
	`codigo_item` varchar(20),
	`descricao_item` varchar(255),
	`quantidade` decimal(10,3),
	`valor_unitario` decimal(12,2),
	`valor_faturado` decimal(12,2),
	`nome_prof` varchar(150),
	`conselho_prof` varchar(20),
	`valor_total_geral_guia` decimal(12,2),
	`estabelecimentoId` int,
	`arquivo_id` int,
	`convenioId` int,
	`data_referencia` timestamp,
	`data_importacao` timestamp NOT NULL DEFAULT (now()),
	`codigo_prestador_executante` varchar(50),
	`valor_total_item` decimal(12,2),
	`estabelecimento_id` int,
	CONSTRAINT `faturamento_tiss_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feedback_divergencias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`codigoItem` varchar(50),
	`padraoId` int,
	`tipoDivergencia` varchar(50) NOT NULL,
	`decisao` enum('aceitar','rejeitar','ignorar') NOT NULL,
	`justificativa` text,
	`dadosDivergencia` json,
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_divergencias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_bancos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`cor` varchar(20) DEFAULT '#3b82f6',
	`saldoInicial` decimal(15,2) DEFAULT '0',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_bancos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_categorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_categorias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_centros_custo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`responsavel` varchar(255),
	`orcamentoMensal` decimal(15,2),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_centros_custo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`email` varchar(320),
	`telefone` varchar(20),
	`valorContrato` decimal(15,2),
	`cep` varchar(10),
	`endereco` text,
	`numero` varchar(20),
	`complemento` varchar(255),
	`bairro` varchar(100),
	`cidade` varchar(100),
	`uf` varchar(2),
	`cnpjSafatle` varchar(20) DEFAULT '24.785.393/0001-54',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_custos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoriaId` int,
	`descricao` varchar(255) NOT NULL,
	`valor` decimal(15,2) NOT NULL DEFAULT '0',
	`tipo` enum('fixo','variavel') NOT NULL DEFAULT 'fixo',
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_custos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_empresas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_empresas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_extratos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bancoId` int NOT NULL,
	`data` date NOT NULL,
	`descricao` varchar(500) NOT NULL,
	`valor` decimal(15,2) NOT NULL DEFAULT '0',
	`tipo` enum('credito','debito') NOT NULL,
	`conciliado` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`transacaoId` int,
	`recebivelId` int,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_extratos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_previsao_receita` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int,
	`dataPrevisao` date NOT NULL,
	`valorPrevisto` decimal(15,2) NOT NULL DEFAULT '0',
	`valorRealizado` decimal(15,2),
	`descricao` varchar(500),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_previsao_receita_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_recebiveis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int,
	`clienteId` int,
	`tipoId` int,
	`bancoId` int,
	`descricao` varchar(500) NOT NULL,
	`valor` decimal(15,2) NOT NULL DEFAULT '0',
	`dataVencimento` date NOT NULL,
	`dataRecebimento` date,
	`recebido` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`tipoServico` varchar(255),
	`descricaoServico` text,
	`observacoes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_recebiveis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_tipos_pagamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`categoriaId` int,
	`custoId` int,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_tipos_pagamento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_tipos_recebivel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`descricao` varchar(255) NOT NULL,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fin_tipos_recebivel_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fin_transacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int,
	`categoriaId` int,
	`tipoId` int,
	`custoId` int,
	`bancoId` int,
	`centroCustoId` int,
	`descricao` varchar(500) NOT NULL,
	`valor` decimal(15,2) NOT NULL DEFAULT '0',
	`dataVencimento` date NOT NULL,
	`dataPagamento` date,
	`pago` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`observacoes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fin_transacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gruposServico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`cor` varchar(20) DEFAULT 'bg-gray-500',
	`icone` varchar(50) DEFAULT 'Users',
	`permissoesPadrao` json,
	`estabelecimentoId` int,
	`sistemaGrupo` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gruposServico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoAlertasVariacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertaId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`periodoAnterior` varchar(20) NOT NULL,
	`periodoAtual` varchar(20) NOT NULL,
	`valorAnterior` decimal(15,2) NOT NULL,
	`valorAtual` decimal(15,2) NOT NULL,
	`percentualVariacao` decimal(10,2) NOT NULL,
	`detalhes` text,
	`visualizado` enum('sim','nao') DEFAULT 'nao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoAlertasVariacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoContestacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recursoId` int,
	`convenioId` int NOT NULL,
	`userId` int NOT NULL,
	`codigoGlosa` varchar(20) NOT NULL,
	`descricaoGlosa` text,
	`codigoProcedimento` varchar(50),
	`descricaoProcedimento` text,
	`valorGlosado` decimal(10,2),
	`valorRecuperado` decimal(10,2),
	`argumentoUtilizado` text NOT NULL,
	`argumentoOrigem` enum('dicionario','ia_sugestao','manual','historico') NOT NULL DEFAULT 'manual',
	`documentosAnexados` json,
	`resultado` enum('pendente','deferido','deferido_parcial','indeferido') NOT NULL DEFAULT 'pendente',
	`argumentoEfetivo` enum('sim','nao','parcial'),
	`feedbackUsuario` text,
	`taxaSucessoCalculada` decimal(5,2),
	`dataContestacao` timestamp NOT NULL DEFAULT (now()),
	`dataResultado` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `historicoContestacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoPrecos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tabelaPrecoId` int NOT NULL,
	`userId` int NOT NULL,
	`tipoAlteracao` enum('criacao','edicao','exclusao','importacao') NOT NULL,
	`valorAnterior` decimal(12,2),
	`vigenciaInicioAnterior` timestamp,
	`nomeAnterior` varchar(255),
	`codigoAnterior` varchar(50),
	`valorNovo` decimal(12,2),
	`vigenciaInicioNovo` timestamp,
	`nomeNovo` varchar(255),
	`codigoNovo` varchar(50),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoPrecos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoRecursos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recursoId` int NOT NULL,
	`userId` int NOT NULL,
	`tipo` enum('criacao','edicao','envio','resposta_convenio','anexo_adicionado','status_alterado','comentario','lembrete') NOT NULL,
	`statusAnterior` varchar(50),
	`statusNovo` varchar(50),
	`descricao` text NOT NULL,
	`dadosExtras` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoRecursos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoValidacaoXml` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`dataProcessamento` timestamp NOT NULL,
	`totalContas` int NOT NULL DEFAULT 0,
	`contasValidas` int NOT NULL DEFAULT 0,
	`contasInvalidas` int NOT NULL DEFAULT 0,
	`scoreConformidadeMedio` decimal(5,2) DEFAULT '0',
	`resultadoCompleto` json,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoValidacaoXml_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoValidacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoId` int NOT NULL,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int,
	`userId` int NOT NULL,
	`totalItens` int DEFAULT 0,
	`divergenciasPreco` int DEFAULT 0,
	`violacoesRegras` int DEFAULT 0,
	`sugestoesIA` int DEFAULT 0,
	`valorDiferenca` decimal(12,2),
	`status` enum('concluida','erro') NOT NULL DEFAULT 'concluida',
	`detalhes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoValidacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importacoesTabela` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`userId` int NOT NULL,
	`tipo` enum('diarias','mat_med','taxas','procedimentos') NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`formatoArquivo` enum('excel','csv','dbf') NOT NULL,
	`totalItens` int DEFAULT 0,
	`itensImportados` int DEFAULT 0,
	`itensAtualizados` int DEFAULT 0,
	`itensErro` int DEFAULT 0,
	`status` enum('processando','concluido','erro') NOT NULL DEFAULT 'processando',
	`mensagemErro` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importacoesTabela_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importacoesTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`userId` int NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`tamanhoArquivo` int,
	`totalRegistros` int DEFAULT 0,
	`registrosImportados` int DEFAULT 0,
	`registrosIgnorados` int DEFAULT 0,
	`registrosErro` int DEFAULT 0,
	`totalMateriais` int DEFAULT 0,
	`totalHonorarios` int DEFAULT 0,
	`dataInicio` timestamp,
	`dataFim` timestamp,
	`status` enum('aguardando','processando','concluido','concluido_parcial','erro') NOT NULL DEFAULT 'aguardando',
	`progresso` int DEFAULT 0,
	`mensagemErro` text,
	`logProcessamento` json,
	`s3Key` varchar(512),
	`s3Url` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `importacoesTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insightsIA` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoId` int NOT NULL,
	`comparacaoId` int,
	`estabelecimentoId` int,
	`convenioId` int,
	`tipoInsight` enum('item_faltante','quantidade_baixa','quantidade_alta','valor_divergente','item_incomum','padrao_incompleto','oportunidade_cobranca') NOT NULL,
	`severidade` enum('baixa','media','alta') NOT NULL DEFAULT 'media',
	`titulo` varchar(255) NOT NULL,
	`descricao` text NOT NULL,
	`guiaNumero` varchar(100),
	`codigoProcedimento` varchar(50),
	`descricaoProcedimento` varchar(255),
	`codigoItemSugerido` varchar(50),
	`descricaoItemSugerido` varchar(255),
	`quantidadeSugerida` decimal(10,2),
	`valorEstimado` decimal(12,2),
	`quantidadeAtual` decimal(10,2),
	`quantidadeEsperada` decimal(10,2),
	`valorAtual` decimal(12,2),
	`valorEsperado` decimal(12,2),
	`confianca` int DEFAULT 50,
	`padraoId` int,
	`status` enum('pendente','aceito','rejeitado','ignorado') NOT NULL DEFAULT 'pendente',
	`feedbackUsuario` text,
	`processadoPor` int,
	`dataProcessamento` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `insightsIA_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integracao_colunas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tabelaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`nomeExibicao` varchar(255) NOT NULL,
	`tipo` enum('varchar','int','bigint','decimal','text','date','datetime','boolean') NOT NULL,
	`tamanho` int,
	`precisao` int,
	`obrigatorio` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`chaveUnica` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`valorPadrao` varchar(255),
	`ordem` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integracao_colunas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integracao_conexoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`tipo` enum('postgresql','mysql','sqlserver','oracle') NOT NULL,
	`host` varchar(255) NOT NULL,
	`porta` int NOT NULL,
	`banco` varchar(255) NOT NULL,
	`usuario` varchar(255) NOT NULL,
	`senhaEncriptada` text NOT NULL,
	`ssl` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`estabelecimentoId` int,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`ultimoTesteConexao` timestamp,
	`statusConexao` enum('ok','erro','nao_testado') NOT NULL DEFAULT 'nao_testado',
	`erroConexao` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integracao_conexoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integracao_mapeamento_campos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mapeamentoId` int NOT NULL,
	`colunaOrigemNome` varchar(255) NOT NULL,
	`colunaDestinoId` int NOT NULL,
	`transformacao` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `integracao_mapeamento_campos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integracao_mapeamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`conexaoOrigemId` int NOT NULL,
	`tabelaDestinoId` int NOT NULL,
	`queryOrigem` text NOT NULL,
	`campoChave` varchar(255),
	`frequencia` enum('manual','5min','15min','30min','1hora','6horas','12horas','diario') NOT NULL DEFAULT 'manual',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`estabelecimentoId` int,
	`modoImportacao` enum('completa','incremental') NOT NULL DEFAULT 'completa',
	`colunaControle` varchar(255),
	`ultimoValorControle` text,
	`ultimaSincronizacao` timestamp,
	`totalRegistrosImportados` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integracao_mapeamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integracao_sincronizacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mapeamentoId` int NOT NULL,
	`status` enum('executando','sucesso','erro','cancelado') NOT NULL,
	`registrosLidos` int NOT NULL DEFAULT 0,
	`registrosInseridos` int NOT NULL DEFAULT 0,
	`registrosAtualizados` int NOT NULL DEFAULT 0,
	`registrosErro` int NOT NULL DEFAULT 0,
	`erroMensagem` text,
	`iniciadoEm` timestamp NOT NULL DEFAULT (now()),
	`finalizadoEm` timestamp,
	`duracaoMs` int,
	`executadoPor` varchar(255),
	CONSTRAINT `integracao_sincronizacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integracao_tabelas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`nomeExibicao` varchar(255) NOT NULL,
	`descricao` text,
	`estabelecimentoId` int,
	`criadaNoBanco` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`totalRegistros` int NOT NULL DEFAULT 0,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integracao_tabelas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensConciliacaoTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resultadoConciliacaoId` int NOT NULL,
	`contaTasyId` int NOT NULL,
	`nrInternoConta` varchar(50),
	`guia` varchar(50),
	`paciente` varchar(255),
	`dataInternacao` timestamp,
	`valorTasy` decimal(15,2),
	`valorPago` decimal(15,2),
	`valorGlosado` decimal(15,2),
	`valorDiferenca` decimal(15,2),
	`statusConciliacao` enum('ok','glosa','divergente','nao_encontrado') NOT NULL,
	`totalProcedimentos` int DEFAULT 0,
	`totalMatMed` int DEFAULT 0,
	`demonstrativoItemId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensConciliacaoTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensContaTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contaTasyId` int NOT NULL,
	`tipoItem` enum('procedimento','material','medicamento') NOT NULL,
	`itemOriginalId` int NOT NULL,
	`codigo` varchar(50),
	`descricao` text,
	`quantidade` decimal(10,4),
	`valorUnitario` decimal(12,4),
	`valorTotal` decimal(12,4),
	`medico` varchar(255),
	`crm` varchar(50),
	`statusPagamento` enum('pendente','pago','glosado','parcial') DEFAULT 'pendente',
	`valorPago` decimal(12,4),
	`valorGlosado` decimal(12,4),
	`motivoGlosa` text,
	`codigoGlosa` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensContaTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensManuals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoId` int,
	`comparacaoId` int,
	`userId` int NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`descricao` text,
	`quantidade` int DEFAULT 1,
	`valorUnitario` decimal(10,2),
	`valorTotal` decimal(10,2),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensManuals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensPagosTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`importacaoId` int NOT NULL,
	`titulo` varchar(255),
	`guia` varchar(100),
	`nrSeqConta` varchar(50),
	`conta` varchar(50),
	`nrProtocolo` varchar(100),
	`dataRecebimento` timestamp,
	`glosaItem` decimal(12,4),
	`qndGlosaItem` decimal(10,4),
	`motivoGlosa` text,
	`procedimento` varchar(255),
	`material` varchar(255),
	`setor` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensPagosTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensRegraNegocio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regraId` int NOT NULL,
	`codigoItem` varchar(50) NOT NULL,
	`descricaoItem` varchar(255),
	`tipoItem` enum('procedimento','taxa','material','medicamento','diaria','outros') NOT NULL,
	`quantidadeMinima` int DEFAULT 1,
	`quantidadeMaxima` int,
	`valorEsperado` decimal(12,2),
	`toleranciaValor` decimal(10,2) DEFAULT '0.00',
	`obrigatorio` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`tabelaPrecoCodigo` varchar(50),
	`tolerancia_percentual` varchar(10),
	`tolerancia_absoluta` decimal(12,2),
	`ordem` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensRegraNegocio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `log_analise_comparacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(50) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`padraoId` int,
	`padraoNome` varchar(500),
	`padraoTipo` varchar(50),
	`isGabarito` int DEFAULT 0,
	`convenioNome` varchar(255),
	`setorPadrao` varchar(255),
	`procedimentosConta` text,
	`totalItensAnalisados` int DEFAULT 0,
	`totalDivergencias` int DEFAULT 0,
	`divergenciasCritico` int DEFAULT 0,
	`divergenciasAlerta` int DEFAULT 0,
	`divergenciasAviso` int DEFAULT 0,
	`divergenciasInfo` int DEFAULT 0,
	`scoreMatch` int DEFAULT 0,
	`motivoSelecao` text,
	`statusGeral` varchar(30),
	`duracaoMs` int,
	`usuarioId` int,
	`usuarioNome` varchar(255),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `log_analise_comparacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logAuditoriaPermissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`usuarioAfetadoId` int NOT NULL,
	`usuarioAfetadoNome` varchar(255),
	`estabelecimentoId` int,
	`estabelecimentoNome` varchar(255),
	`tipoAcao` enum('criar_permissao','alterar_permissao','remover_permissao','criar_usuario','alterar_grupo','criar_grupo','excluir_grupo','editar_estabelecimentos') NOT NULL,
	`descricao` text,
	`valoresAnteriores` json,
	`valoresNovos` json,
	`ipUsuario` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logAuditoriaPermissoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lotesRecurso` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`userId` int NOT NULL,
	`numeroLote` varchar(50) NOT NULL,
	`descricao` text,
	`valorTotalGlosado` decimal(12,2) DEFAULT '0',
	`valorTotalRecursado` decimal(12,2) DEFAULT '0',
	`valorTotalRecuperado` decimal(12,2) DEFAULT '0',
	`valorTotalRecebido` decimal(12,2) DEFAULT '0',
	`quantidadeItens` int DEFAULT 0,
	`status` enum('rascunho','pendente_envio','enviado','em_analise','respondido','finalizado') NOT NULL DEFAULT 'rascunho',
	`dataEnvio` timestamp,
	`dataPrazoPagamento` timestamp,
	`dataPrazoResposta` timestamp,
	`dataResposta` timestamp,
	`protocoloEnvio` varchar(100),
	`anexoPdfUrl` text,
	`anexoPdfKey` varchar(512),
	`xmlUrl` text,
	`xmlKey` varchar(512),
	`xmlGeradoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lotesRecurso_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matMedTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`importacaoId` int NOT NULL,
	`atendimento` varchar(50) NOT NULL,
	`nrInternoConta` varchar(50),
	`guia` varchar(100),
	`sequencia` varchar(50),
	`dataFaturado` timestamp,
	`convenio` varchar(255),
	`paciente` varchar(255),
	`dataConta` timestamp,
	`codigo` varchar(50),
	`codigoConvenio` varchar(50),
	`descricao` text,
	`quantidade` decimal(10,4),
	`unidade` varchar(20),
	`valorUnitario` decimal(12,4),
	`valorTotal` decimal(12,4),
	`setor` varchar(255),
	`protocolo` varchar(100),
	`statusProtocolo` varchar(50),
	`tipoItem` enum('material','medicamento') DEFAULT 'material',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matMedTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `motivosGlosa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(20) NOT NULL,
	`grupo` varchar(100) NOT NULL,
	`descricao` text NOT NULL,
	`descricaoSimplificada` varchar(255) NOT NULL,
	`argumentoContestacao` text,
	`acoesRecomendadas` json,
	`documentosSugeridos` json,
	`dificuldadeReversao` int DEFAULT 3,
	`probabilidadeSucesso` int DEFAULT 50,
	`tipoOrigem` enum('tiss','personalizado') NOT NULL DEFAULT 'personalizado',
	`estabelecimentoId` int,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `motivosGlosa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nfse_convenios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`codigo` varchar(50),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfse_convenios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nfse_hospitais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`cpfNf` varchar(20),
	`senhaNf` varchar(255),
	`endereco` text,
	`telefone` varchar(20),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfse_hospitais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nfse_notas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hospitalId` int NOT NULL,
	`convenioId` int,
	`numeroNf` varchar(50) NOT NULL,
	`dataEmissao` date NOT NULL,
	`dataFaturamento` date,
	`valorBruto` decimal(15,2) NOT NULL DEFAULT '0',
	`valorLiquido` decimal(15,2) NOT NULL DEFAULT '0',
	`xmlDemonstrativoEmitido` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`nfEmitida` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`observacoes` text,
	`pdfUrl` text,
	`pdfKey` varchar(512),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfse_notas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificacoes_atendimento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numatend` varchar(100) NOT NULL,
	`estabelecimentoId` int,
	`observacao` text NOT NULL DEFAULT (''),
	`usuario` varchar(255),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificacoes_atendimento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificacoes_atendimento_item` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificacaoId` int NOT NULL,
	`motivo` varchar(255) NOT NULL,
	`setor` varchar(255) NOT NULL DEFAULT '',
	`medico` varchar(255) NOT NULL DEFAULT '',
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificacoes_atendimento_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `padraoGlosaConvenio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`convenio` varchar(255) NOT NULL,
	`codigoItem` varchar(50) NOT NULL,
	`descricaoItem` varchar(500),
	`tipoItem` varchar(50),
	`totalFaturado` int NOT NULL DEFAULT 0,
	`totalGlosado` int NOT NULL DEFAULT 0,
	`taxaGlosa` decimal(5,2) DEFAULT '0',
	`valorTotalFaturado` decimal(14,2) DEFAULT '0',
	`valorTotalGlosado` decimal(14,2) DEFAULT '0',
	`valorTotalPago` decimal(14,2) DEFAULT '0',
	`codigosGlosaFrequentes` json,
	`nivelRisco` enum('baixo','medio','alto','critico') NOT NULL DEFAULT 'baixo',
	`competenciaInicio` varchar(7),
	`competenciaFim` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `padraoGlosaConvenio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `padraoPrecoConvenio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`convenio` varchar(255) NOT NULL,
	`setor` varchar(255),
	`codigoItem` varchar(50) NOT NULL,
	`descricaoItem` varchar(500),
	`tipoItem` varchar(50),
	`mediaUnitario` decimal(12,4),
	`minUnitario` decimal(12,4),
	`maxUnitario` decimal(12,4),
	`desvioUnitario` decimal(12,4),
	`mediaFaturado` decimal(12,4),
	`minFaturado` decimal(12,4),
	`maxFaturado` decimal(12,4),
	`desvioFaturado` decimal(12,4),
	`totalOcorrencias` int NOT NULL DEFAULT 0,
	`totalContas` int NOT NULL DEFAULT 0,
	`confianca` int NOT NULL DEFAULT 0,
	`competenciaInicio` varchar(7),
	`competenciaFim` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `padraoPrecoConvenio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `padraoQuantidadeItem` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`convenio` varchar(255),
	`setor` varchar(255),
	`codigoItem` varchar(50) NOT NULL,
	`descricaoItem` varchar(500),
	`tipoItem` varchar(50),
	`mediaQuantidade` decimal(10,4),
	`minQuantidade` decimal(10,4),
	`maxQuantidade` decimal(10,4),
	`desvioQuantidade` decimal(10,4),
	`medianaQuantidade` decimal(10,4),
	`totalOcorrencias` int NOT NULL DEFAULT 0,
	`totalContas` int NOT NULL DEFAULT 0,
	`limiteInferior` decimal(10,4),
	`limiteSuperior` decimal(10,4),
	`confianca` int NOT NULL DEFAULT 0,
	`competenciaInicio` varchar(7),
	`competenciaFim` varchar(7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `padraoQuantidadeItem_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `padroesCobranca` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int,
	`estabelecimentoId` int,
	`setor` varchar(255),
	`profissionalExecutante` varchar(255),
	`codigoProcedimentoPrincipal` varchar(50) NOT NULL,
	`descricaoProcedimentoPrincipal` varchar(255),
	`tipoProcedimentoPrincipal` varchar(50),
	`itensAssociados` json NOT NULL,
	`totalOcorrencias` int NOT NULL DEFAULT 1,
	`valorMedioConta` decimal(12,2),
	`valorMinConta` decimal(12,2),
	`valorMaxConta` decimal(12,2),
	`confianca` int DEFAULT 50,
	`status` enum('aprendendo','ativo','revisao','inativo') NOT NULL DEFAULT 'aprendendo',
	`isGabarito` int NOT NULL DEFAULT 0,
	`validadoPor` int,
	`dataValidacao` timestamp,
	`observacoesValidacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `padroesCobranca_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `padroesContas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int,
	`estabelecimentoId` int,
	`codigoProcedimentoPrincipal` varchar(50) NOT NULL,
	`descricaoProcedimentoPrincipal` varchar(255),
	`itensAssociados` json,
	`totalOcorrencias` int DEFAULT 0,
	`valorMedioConta` decimal(12,2),
	`ultimaAtualizacao` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `padroesContas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissoesEstabelecimento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`grupoServico` enum('administrador','faturista','recurso_glosa','gestor','visualizador','usuario_tasy') NOT NULL DEFAULT 'visualizador',
	`podeVisualizar` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`podeEditar` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`podeExcluir` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`podeGerenciar` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoDashboard` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`acessoArquivos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoComparacoes` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoFaturamento` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoTabelasPreco` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoAnaliseGlosa` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoDicionarioGlosas` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRecursosGlosa` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoConvenios` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRegrasNegocio` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoProdutividade` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoEstabelecimentos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoPermissoes` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoImportacaoTasy` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoContasFaturadas` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelatoriosTasy` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelatoriosBi` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoConciliacaoContasPagas` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRecebimentosXml` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRecebimentosExcel` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoDemonstrativo` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoContaConvenio` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRecursos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoAtendimentos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoAtendimentosFaturar` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelFaturadoRecebido` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelRecebimentoGeral` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelFaturamento` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelAtendimentos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelCustos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelNaoRecebidos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoRelPrevisaoGlosa` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoFaturamentoExterno` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`acessoPainelExecutivo` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoVisaoGeral` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoFinanceiro` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoContratos` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoPropostas` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoAtendimentosConsolidados` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`acessoNfseConsolidado` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoesEstabelecimento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procedimentosTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`importacaoId` int NOT NULL,
	`atendimento` varchar(50) NOT NULL,
	`nrInternoConta` varchar(50),
	`guia` varchar(100),
	`sequencia` varchar(50),
	`dataFaturado` timestamp,
	`convenio` varchar(255),
	`paciente` varchar(255),
	`dataConta` timestamp,
	`codigo` varchar(50),
	`codigoConvenio` varchar(50),
	`descricao` text,
	`quantidade` decimal(10,4),
	`unidade` varchar(20),
	`valorUnitario` decimal(12,4),
	`valorTotal` decimal(12,4),
	`setor` varchar(255),
	`protocolo` varchar(100),
	`statusProtocolo` varchar(50),
	`medico` varchar(255),
	`funcaoMedico` varchar(100),
	`crm` varchar(50),
	`valorMedico` decimal(12,4),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procedimentosTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposta_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propostaId` int NOT NULL,
	`codigo` varchar(50),
	`descricao` varchar(500) NOT NULL,
	`categoria` varchar(100),
	`unidade` varchar(50) DEFAULT 'Unidade',
	`quantidade` int NOT NULL DEFAULT 1,
	`precoUnitario` decimal(15,2) NOT NULL DEFAULT '0',
	`desconto` decimal(5,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposta_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `propostas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int,
	`numero` varchar(50) NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`cliente` varchar(255) NOT NULL,
	`tipoCliente` enum('hospital','clinica','laboratorio','plano_saude','governo') NOT NULL DEFAULT 'hospital',
	`responsavel` varchar(255),
	`status` enum('rascunho','aguardando','aprovada','recusada','negociando') NOT NULL DEFAULT 'rascunho',
	`valorTotal` decimal(15,2) NOT NULL DEFAULT '0',
	`condicoesPagamento` varchar(255),
	`validadeDias` int DEFAULT 30,
	`dataExpiracao` date,
	`observacoes` text,
	`contratoId` int,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `propostas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recebimento_geral` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sincronizado` timestamp,
	`atualizado` timestamp,
	`estabelecimentoId` int NOT NULL,
	`convenioId` int,
	`convenio` varchar(255),
	`mes_producao` varchar(20),
	`fatura` varchar(100),
	`codigo_recurso` varchar(100),
	`tipo_procedimento` varchar(255),
	`protocolo` varchar(100),
	`numero_conta` varchar(100),
	`guia_cobranca` varchar(100),
	`guia_operadora` varchar(100),
	`descricao_item` text,
	`carteirinha` varchar(100),
	`data_conta` varchar(20),
	`data_internacao` varchar(20),
	`data_saida` varchar(20),
	`codigo_convenio` varchar(50),
	`codigo_sistema` varchar(50),
	`tipo_descricao` varchar(255),
	`funcao_tiss` varchar(255),
	`receber_hospital` varchar(1),
	`codigo_setor` varchar(50),
	`nome_setor` varchar(255),
	`prestador_executante` varchar(255),
	`nome_prestador` varchar(255),
	`quantidade_item` decimal(15,4),
	`vl_unitario` decimal(15,2),
	`vl_faturado` decimal(15,2),
	`vl_recebido` decimal(15,2),
	`vl_receb_a_maior` decimal(15,2),
	`vl_total_recebido` decimal(15,2),
	`vl_aberto` decimal(15,2),
	`vl_glosas` decimal(15,2),
	`vl_recurso` decimal(15,2),
	`gl_aceita` decimal(15,2),
	`gl_analise` decimal(15,2),
	`gl_recuperado` decimal(15,2),
	`codigo_tiss` varchar(50),
	`descricao_motivo` text,
	`complemento_recurso` text,
	`tipo_atendimento` varchar(255),
	CONSTRAINT `recebimento_geral_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recebimento_tiss` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivo_id` int NOT NULL,
	`registro_ans` varchar(6),
	`numero_demonstrativo` varchar(50),
	`nome_operadora` varchar(150),
	`cnpj_operadora` varchar(20),
	`data_emissao` date,
	`cnes` varchar(7),
	`codigo_prestador_operadora` varchar(14),
	`nome_contratado` varchar(70),
	`numero_lote_prestador` varchar(50),
	`numero_protocolo` varchar(50),
	`data_protocolo` date,
	`valor_protocolo` decimal(12,2),
	`valor_glosa_protocolo` decimal(12,2),
	`glosa_protocolo_codigo` varchar(20),
	`glosa_protocolo_descricao` text,
	`situacao_protocolo` varchar(10),
	`valor_informado_protocolo` decimal(12,2),
	`valor_processado_protocolo` decimal(12,2),
	`valor_liberado_protocolo` decimal(12,2),
	`valor_glosa_protocolo_total` decimal(12,2),
	`numero_guia_prestador` varchar(50),
	`numero_guia_operadora` varchar(50),
	`senha` varchar(50),
	`numero_carteira` varchar(50),
	`nome_beneficiario` varchar(150),
	`data_inicio_fat` date,
	`data_fim_fat` date,
	`situacao_guia` varchar(10),
	`motivo_glosa_guia_codigo` varchar(20),
	`motivo_glosa_guia_descricao` text,
	`valor_informado_guia` decimal(12,2),
	`valor_processado_guia` decimal(12,2),
	`valor_liberado_guia` decimal(12,2),
	`valor_glosa_guia` decimal(12,2),
	`sequencial_item` int,
	`data_realizacao` date,
	`codigo_tabela` varchar(10),
	`codigo_item` varchar(20),
	`descricao_item` varchar(255),
	`grau_participacao` varchar(5),
	`quantidade_executada` decimal(10,4),
	`valor_informado` decimal(12,2),
	`valor_processado` decimal(12,2),
	`valor_liberado` decimal(12,2),
	`valor_glosado` decimal(12,2) GENERATED ALWAYS AS (`valor_informado` - `valor_liberado`) VIRTUAL,
	`codigo_glosa` varchar(20),
	`descricao_glosa` text,
	`data_pagamento` date,
	`forma_pagamento` varchar(20),
	`banco` varchar(4),
	`agencia` varchar(7),
	`valor_informado_geral` decimal(12,2),
	`valor_processado_geral` decimal(12,2),
	`valor_liberado_geral` decimal(12,2),
	`valor_glosa_geral` decimal(12,2),
	`valor_final_receber` decimal(12,2),
	`origem_dado` enum('xml','excel') NOT NULL,
	`data_importacao` timestamp NOT NULL DEFAULT (now()),
	`convenioId` int,
	`data_referencia` date,
	`estabelecimentoId` int,
	`estabelecimento_id` int,
	`codigo_prestador_pagamento` varchar(50),
	`nome_prestador_pagamento` varchar(255),
	`codigo_prestador_executante` varchar(50),
	`nome_prestador_executante` varchar(255),
	`hora_execucao` varchar(20),
	`codigo_procedimento` varchar(20),
	`descricao_procedimento` varchar(255),
	`tipo_lancamento` varchar(50),
	`qtd_executada` decimal(10,4),
	`situacao_item` varchar(20),
	`codigo_solicitante` varchar(50),
	`nome_solicitante` varchar(255),
	`acomodacao_internacao` varchar(50),
	`data_inicio_internacao` date,
	`data_fim_internacao` date,
	CONSTRAINT `recebimento_tiss_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recebimentos_excel` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivo_id` int,
	`data_pagto` timestamp,
	`processado` decimal(12,2),
	`protocolo_tiss` varchar(50),
	`lote_prestador` varchar(50),
	`codigo_prestador_pagamento` varchar(50),
	`nome_prestador_pagamento` varchar(255),
	`numero_guia` varchar(50),
	`seq` int,
	`beneficiario` varchar(50),
	`nome_beneficiario` varchar(255),
	`data_execucao` timestamp,
	`hora_execucao` varchar(20),
	`item` varchar(50),
	`item_desc` varchar(500),
	`quantidade` int,
	`valor_pagamento` decimal(12,2),
	`tipo_lancamento` varchar(100),
	`erro_tiss` varchar(500),
	`situacao_item` varchar(50),
	`tipo_item` varchar(30),
	`valor_glosa` decimal(12,2),
	`codigo_glosa` varchar(500),
	`valor_informado` decimal(12,2),
	`codigo_solicitante` varchar(50),
	`nome_solicitante` varchar(255),
	`acomodacao_internacao` varchar(100),
	`data_inicio_faturamento_internacao` timestamp,
	`data_fim_faturamento_internacao` timestamp,
	`codigo_prestador` varchar(50),
	`nome_prestador` varchar(255),
	`prestador_executante` varchar(50),
	`nome_prestador_executante` varchar(255),
	`convenioId` int,
	`data_referencia` date,
	`data_pagamento` date,
	`estabelecimentoId` int,
	`data_importacao` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recebimentos_excel_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recursosGlosa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`divergenciaId` int,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int,
	`loteId` int,
	`userId` int NOT NULL,
	`codigoProcedimento` varchar(50),
	`descricaoProcedimento` text,
	`guiaNumero` varchar(100),
	`pacienteNome` varchar(255),
	`pacienteCarteirinha` varchar(100),
	`valorCobrado` decimal(10,2),
	`valorGlosado` decimal(10,2),
	`valorRecuperado` decimal(10,2),
	`motivoGlosaConvenio` text,
	`justificativaRecurso` text NOT NULL,
	`documentosAnexos` json,
	`status` enum('rascunho','pendente_envio','enviado','em_analise','deferido','deferido_parcial','indeferido','cancelado') NOT NULL DEFAULT 'rascunho',
	`prioridade` enum('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
	`dataGlosa` timestamp,
	`dataEnvioRecurso` timestamp,
	`dataPrazoResposta` timestamp,
	`dataResposta` timestamp,
	`protocoloRecurso` varchar(100),
	`respostaConvenio` text,
	`valorRecebido` decimal(10,2),
	`dataPagamento` timestamp,
	`observacoesPagamento` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `recursosGlosa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regrasConciliacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`itensNaoEncontrados` enum('glosado','pago','divergente') NOT NULL DEFAULT 'glosado',
	`toleranciaValor` decimal(10,2) DEFAULT '0.00',
	`toleranciaPercentual` decimal(5,2) DEFAULT '0.00',
	`usarCodigo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`usarGuia` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`usarData` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`usarPaciente` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`formatoRetorno` enum('excel_completo','excel_glosas','xml_tiss','csv','pdf') NOT NULL DEFAULT 'excel_completo',
	`prazoRecursoDias` int DEFAULT 30,
	`observacoes` text,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regrasConciliacao_id` PRIMARY KEY(`id`),
	CONSTRAINT `regrasConciliacao_convenioId_unique` UNIQUE(`convenioId`)
);
--> statement-breakpoint
CREATE TABLE `regrasIA` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int,
	`codigo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`categoria` enum('outlier','padrao_erro','risco_glosa','tendencia','comparacao') NOT NULL,
	`tipoAlerta` enum('critico','alerta','info') NOT NULL DEFAULT 'alerta',
	`parametros` json,
	`prioridade` int DEFAULT 100,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`atualizadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regrasIA_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regrasNegocio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int,
	`estabelecimentoId` int,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`codigoProcedimentoPrincipal` varchar(50) NOT NULL,
	`descricaoProcedimentoPrincipal` varchar(255),
	`tipoVerificacao` enum('deve_conter','nao_deve_conter','pode_conter','quantidade_minima','quantidade_maxima') NOT NULL DEFAULT 'deve_conter',
	`acaoInconsistencia` enum('alerta','bloquear','sugerir_adicao','sugerir_remocao') NOT NULL DEFAULT 'alerta',
	`prioridade` int DEFAULT 5,
	`tipoRegra` enum('validacao_geral','padrao_procedimento') DEFAULT 'validacao_geral',
	`codigoProcedimento` varchar(50),
	`nomeProcedimento` varchar(255),
	`tolerancia_percentual` varchar(10),
	`tolerancia_absoluta` decimal(12,2),
	`diaria_obrigatoria` int DEFAULT 0,
	`diaria_esperada_por_dia` int,
	`score_minimo_aceitavel` int DEFAULT 70,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regrasNegocio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resultadosConciliacaoTasy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`convenioId` int,
	`mesReferencia` int,
	`anoReferencia` int,
	`totalContas` int DEFAULT 0,
	`contasOk` int DEFAULT 0,
	`contasComGlosa` int DEFAULT 0,
	`contasDivergentes` int DEFAULT 0,
	`contasNaoEncontradas` int DEFAULT 0,
	`valorTotalTasy` decimal(15,2),
	`valorTotalPago` decimal(15,2),
	`valorTotalGlosado` decimal(15,2),
	`valorDiferenca` decimal(15,2),
	`percentualGlosa` decimal(5,2),
	`percentualRecebido` decimal(5,2),
	`userId` int NOT NULL,
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resultadosConciliacaoTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resumoConciliacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`mesReferencia` int NOT NULL,
	`anoReferencia` int NOT NULL,
	`convenioId` int,
	`totalItensTasy` int DEFAULT 0,
	`valorTotalTasy` decimal(15,2),
	`totalItensDemo` int DEFAULT 0,
	`valorTotalPago` decimal(15,2),
	`valorTotalGlosado` decimal(15,2),
	`itensConciliados` int DEFAULT 0,
	`itensDivergentes` int DEFAULT 0,
	`itensNaoEncontradosDemo` int DEFAULT 0,
	`itensNaoEncontradosTasy` int DEFAULT 0,
	`itensGlosados` int DEFAULT 0,
	`valorDiferenca` decimal(15,2),
	`percentualRecebido` decimal(5,2),
	`percentualGlosado` decimal(5,2),
	`dataProcessamento` timestamp,
	`processadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resumoConciliacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retorno_tiss_unificado` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivo_id` int NOT NULL,
	`numero_demonstrativo` varchar(50),
	`nome_operadora` varchar(150),
	`cnpj_operadora` varchar(20),
	`data_emissao` date,
	`numero_lote_prestador` varchar(50),
	`numero_protocolo` varchar(50),
	`situacao_protocolo` varchar(10),
	`numero_guia_prestador` varchar(50),
	`numero_guia_operadora` varchar(50),
	`senha` varchar(50),
	`numero_carteira` varchar(50),
	`nome_beneficiario` varchar(150),
	`situacao_guia` varchar(10),
	`sequencial_item` int,
	`data_realizacao` date,
	`codigo_tabela` varchar(10),
	`codigo_item` varchar(20),
	`descricao_item` varchar(255),
	`quantidade_executada` decimal(10,3),
	`valor_informado` decimal(12,2),
	`valor_processado` decimal(12,2),
	`valor_liberado` decimal(12,2),
	`codigo_glosa` varchar(20),
	`descricao_glosa` text,
	`origem_dado` enum('xml','excel') NOT NULL,
	`data_importacao` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `retorno_tiss_unificado_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `snapshot_auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`convenio` varchar(255),
	`convenioId` int,
	`pacienteNome` varchar(255),
	`itensSnapshot` json NOT NULL,
	`divergenciasAceitas` json,
	`falhasAbertas` json,
	`ajustesAplicados` json,
	`totalItens` int DEFAULT 0,
	`valorTotal` decimal(14,2),
	`totalDivergenciasAceitas` int DEFAULT 0,
	`totalFalhasAbertas` int DEFAULT 0,
	`totalAjustes` int DEFAULT 0,
	`auditorId` int NOT NULL,
	`auditorNome` varchar(255),
	`statusSnapshot` enum('aguardando_correcao','reimportado','conferido','aprovado','reprovado') NOT NULL DEFAULT 'aguardando_correcao',
	`dataCorrecao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `snapshot_auditoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tabelaCbhpm` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoProcedimento` varchar(20) NOT NULL,
	`descricaoProcedimento` varchar(500),
	`porte` varchar(10),
	`porteAnestesico` varchar(10),
	`custoOperacional` decimal(14,2),
	`numAuxiliares` int DEFAULT 0,
	`incidencia` decimal(5,2),
	`filmeRadiologico` int DEFAULT 0,
	`grupo` varchar(100),
	`subgrupo` varchar(100),
	`versao` varchar(20) DEFAULT '6a',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tabelaCbhpm_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tabelaPorteConvenio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`convenio` varchar(255) NOT NULL,
	`codigoProcedimento` varchar(20) NOT NULL,
	`descricaoProcedimento` varchar(500),
	`porte` varchar(10),
	`porteAnestesico` varchar(10),
	`valorTaxaSala` decimal(14,2),
	`valorHonorarioAnestesico` decimal(14,2),
	`custoOperacional` decimal(14,2),
	`vigenciaInicio` timestamp,
	`vigenciaFim` timestamp,
	`origem` varchar(50) DEFAULT 'manual',
	`observacoes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tabelaPorteConvenio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tabelasPreco` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int,
	`tipo` enum('diarias','mat_med','taxas','procedimentos') NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`vigenciaInicio` timestamp NOT NULL,
	`unidade` varchar(50),
	`observacao` text,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tabelasPreco_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
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
	`data_entrada` timestamp,
	`data_saida` timestamp,
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
	`dtEntrega` timestamp,
	`protStatus` varchar(50),
	`titulo` varchar(100),
	`dtTitulo` timestamp,
	`dataVencimento` timestamp,
	`dsSetorEntrada` varchar(255),
	`dsSetorLeito` varchar(255),
	`etapaConta` varchar(255),
	`setorEtapa` varchar(255),
	`dtEtapa` timestamp,
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
--> statement-breakpoint
CREATE TABLE `atendimentos_a_faturar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`origemSistema` varchar(50) NOT NULL DEFAULT 'EASYVISION',
	`numatend` varchar(100) NOT NULL,
	`nomeplaco` varchar(255),
	`nomepac` varchar(255),
	`carater` varchar(50),
	`datatend` timestamp,
	`datasai` timestamp,
	`tipoatend` varchar(10),
	`tipoatendimentodescricao` varchar(100),
	`codserv` varchar(255),
	`procprin` varchar(100),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `atendimentos_a_faturar_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atendimentos_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`atendimentoId` int NOT NULL,
	`campoAlterado` varchar(100) NOT NULL,
	`valorAnterior` text,
	`valorNovo` text,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `atendimentos_historico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `atendimentos_sem_conta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`origemSistema` varchar(50) NOT NULL DEFAULT 'EASYVISION',
	`numatend` varchar(100) NOT NULL,
	`nomeplaco` varchar(255),
	`nomepac` varchar(255),
	`carater` varchar(50),
	`datatend` timestamp,
	`datasai` timestamp,
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
--> statement-breakpoint
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
	`dataExecucao` timestamp,
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
--> statement-breakpoint
CREATE TABLE `custos_produtos_sync_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimento_id` int NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pendente',
	`ultima_sincronizacao` timestamp,
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
--> statement-breakpoint
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
--> statement-breakpoint
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
	`dataExecucao` timestamp,
	`quantidade` decimal(12,4),
	`valorUnitario` decimal(12,4),
	`valorFaturado` decimal(12,4),
	`valorPago` decimal(12,4),
	`valorGlosa` decimal(12,4),
	`motivoGlosa` text,
	`codigoGlosa` varchar(50),
	`retorno` varchar(50),
	`dataPagamento` timestamp,
	`codigoPrestadorExecutante` varchar(50),
	`statusConciliacao` varchar(50) DEFAULT 'pendente',
	`recebimentoVinculadoId` int,
	`recebimentoOrigem` varchar(20),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `faturamento_unificado_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
	`data` timestamp,
	`dataint` timestamp,
	`datasai` timestamp,
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
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `gesthor_atendimentos_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configuracaoId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	`atendimentoId` varchar(100),
	`pacienteId` varchar(100),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`dataAtendimento` timestamp,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `gesthor_atendimentos_staging_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`data` timestamp,
	`dataint` timestamp,
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
	`_sincronizado_em` timestamp,
	`_atualizado_em` timestamp,
	CONSTRAINT `integ_faturado__id` PRIMARY KEY(`_id`)
);
--> statement-breakpoint
CREATE TABLE `omni_atendimentos_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configuracaoId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	`atendimentoId` varchar(100),
	`pacienteId` varchar(100),
	`dataSincronizacao` timestamp DEFAULT (now()),
	`dataAtendimento` timestamp,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `omni_atendimentos_staging_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pacientes_unificados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origemSistema` varchar(50) NOT NULL,
	`origemId` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`cpf` varchar(20),
	`nome` varchar(255),
	`dataNascimento` timestamp,
	`dataSincronizacao` timestamp DEFAULT (now()),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `pacientes_unificados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
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
	`ultimaSincronizacao` timestamp,
	`proximaSincronizacao` timestamp,
	`totalRegistrosSincronizados` int DEFAULT 0,
	`ultimoErro` text,
	`ultimaTentativa` timestamp,
	`criadoEm` timestamp DEFAULT (now()),
	`atualizadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `query_configuracoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
	`data_atendimento` timestamp,
	`data_saida` timestamp,
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
--> statement-breakpoint
CREATE TABLE `relatorio_atendimentos_sync_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`ultimaSincronizacao` timestamp,
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
--> statement-breakpoint
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
	`finalizadoEm` timestamp,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `sincronizacao_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Tasy_maternidadeela_atendimentos_stagion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int,
	`numeroAtendimento` varchar(50),
	`tipoSaida` varchar(100),
	`local` varchar(255),
	`paciente` varchar(255),
	`carater` varchar(50),
	`dataAdmissao` timestamp,
	`dataAlta` timestamp,
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
	`dtEntrega` timestamp,
	`protStatus` varchar(50),
	`titulo` varchar(100),
	`dtTitulo` timestamp,
	`dataVencimento` timestamp,
	`dsSetorEntrada` varchar(255),
	`dsSetorLeito` varchar(255),
	`etapaConta` varchar(255),
	`setorEtapa` varchar(255),
	`dtEtapa` timestamp,
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
--> statement-breakpoint
CREATE TABLE `TASY_hemolabor_atendimentos_stagion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int,
	`numeroAtendimento` varchar(50),
	`tipoSaida` varchar(100),
	`local` varchar(255),
	`paciente` varchar(255),
	`carater` varchar(50),
	`dataAdmissao` timestamp,
	`dataAlta` timestamp,
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
	`dtEntrega` timestamp,
	`protStatus` varchar(50),
	`titulo` varchar(100),
	`dtTitulo` timestamp,
	`dataVencimento` timestamp,
	`dsSetorEntrada` varchar(255),
	`dsSetorLeito` varchar(255),
	`etapaConta` varchar(255),
	`setorEtapa` varchar(255),
	`dtEtapa` timestamp,
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
--> statement-breakpoint
CREATE TABLE `warleine_atendimentos_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	CONSTRAINT `warleine_atendimentos_staging_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `warleine_faturamento_staging` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`configId` int NOT NULL,
	`dadosBrutos` json NOT NULL,
	CONSTRAINT `warleine_faturamento_staging_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_aa_conta` ON `ajustes_auditoria` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_aa_tipo` ON `ajustes_auditoria` (`tipoAjuste`);--> statement-breakpoint
CREATE INDEX `idx_aa_item` ON `ajustes_auditoria` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_aa_status` ON `ajustes_auditoria` (`statusAjuste`);--> statement-breakpoint
CREATE INDEX `idx_aprd_estab_tipo` ON `aprendizado_auditoria` (`estabelecimentoId`,`tipoAprendizado`);--> statement-breakpoint
CREATE INDEX `idx_aprd_convenio` ON `aprendizado_auditoria` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_aprd_codigo` ON `aprendizado_auditoria` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_aprd_confianca` ON `aprendizado_auditoria` (`confianca`);--> statement-breakpoint
CREATE INDEX `idx_aprd_ativo` ON `aprendizado_auditoria` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_atend_origem` ON `atendimentos` (`origemSistema`,`origemId`);--> statement-breakpoint
CREATE INDEX `idx_atend_paciente` ON `atendimentos` (`pacienteId`);--> statement-breakpoint
CREATE INDEX `idx_atend_estabelecimento` ON `atendimentos` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_atend_data` ON `atendimentos` (`dataAtendimento`);--> statement-breakpoint
CREATE INDEX `idx_cc_snapshot` ON `conferencia_correcao` (`snapshotId`);--> statement-breakpoint
CREATE INDEX `idx_cc_conta_estab` ON `conferencia_correcao` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_cc_status` ON `conferencia_correcao` (`statusCorrecao`);--> statement-breakpoint
CREATE INDEX `idx_cci_numconta` ON `contas_convenio_itens` (`numeroConta`);--> statement-breakpoint
CREATE INDEX `idx_cci_convenio` ON `contas_convenio_itens` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_cci_estab` ON `contas_convenio_itens` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_cci_origem` ON `contas_convenio_itens` (`origem`);--> statement-breakpoint
CREATE INDEX `idx_cci_status` ON `contas_convenio_itens` (`statusAnalise`);--> statement-breakpoint
CREATE INDEX `idx_cci_competencia` ON `contas_convenio_itens` (`competencia`);--> statement-breakpoint
CREATE INDEX `idx_cci_codigo_item` ON `contas_convenio_itens` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_cci_guia` ON `contas_convenio_itens` (`numeroGuia`);--> statement-breakpoint
CREATE INDEX `idx_ccr_numconta_estab` ON `contas_convenio_resumo` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_ccr_convenio` ON `contas_convenio_resumo` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_ccr_status` ON `contas_convenio_resumo` (`statusAnaliseResumo`);--> statement-breakpoint
CREATE INDEX `idx_contrato_estab` ON `contratos` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_contrato_status` ON `contratos` (`status`);--> statement-breakpoint
CREATE INDEX `idx_contrato_data_fim` ON `contratos` (`dataFim`);--> statement-breakpoint
CREATE INDEX `idx_contrato_hist_contrato` ON `contratos_historico` (`contratoId`);--> statement-breakpoint
CREATE INDEX `idx_conv_map_estab` ON `convenio_mapeamento` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_conv_map_nome_origem` ON `convenio_mapeamento` (`nome_origem`);--> statement-breakpoint
CREATE INDEX `idx_conv_map_convenio_id` ON `convenio_mapeamento` (`convenioId`);--> statement-breakpoint
CREATE INDEX `idx_conv_map_unique` ON `convenio_mapeamento` (`estabelecimentoId`,`nome_origem`,`codigo_origem`);--> statement-breakpoint
CREATE INDEX `idx_fp_conta` ON `falhas_prontuario` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_fp_categoria` ON `falhas_prontuario` (`categoriaFalha`);--> statement-breakpoint
CREATE INDEX `idx_fp_status` ON `falhas_prontuario` (`statusFalha`);--> statement-breakpoint
CREATE INDEX `idx_fd_padrao` ON `feedback_divergencias` (`padraoId`);--> statement-breakpoint
CREATE INDEX `idx_fd_estab` ON `feedback_divergencias` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_fd_decisao` ON `feedback_divergencias` (`decisao`);--> statement-breakpoint
CREATE INDEX `idx_fin_cc_codigo` ON `fin_centros_custo` (`codigo`);--> statement-breakpoint
CREATE INDEX `idx_fin_cc_ativo` ON `fin_centros_custo` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_fin_cliente_empresa` ON `fin_clientes` (`empresaId`);--> statement-breakpoint
CREATE INDEX `idx_fin_empresa_estab` ON `fin_empresas` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_fin_extrato_banco` ON `fin_extratos` (`bancoId`);--> statement-breakpoint
CREATE INDEX `idx_fin_extrato_data` ON `fin_extratos` (`data`);--> statement-breakpoint
CREATE INDEX `idx_fin_extrato_conciliado` ON `fin_extratos` (`conciliado`);--> statement-breakpoint
CREATE INDEX `idx_fin_previsao_empresa` ON `fin_previsao_receita` (`empresaId`);--> statement-breakpoint
CREATE INDEX `idx_fin_previsao_data` ON `fin_previsao_receita` (`dataPrevisao`);--> statement-breakpoint
CREATE INDEX `idx_fin_recebivel_empresa` ON `fin_recebiveis` (`empresaId`);--> statement-breakpoint
CREATE INDEX `idx_fin_recebivel_cliente` ON `fin_recebiveis` (`clienteId`);--> statement-breakpoint
CREATE INDEX `idx_fin_recebivel_vencimento` ON `fin_recebiveis` (`dataVencimento`);--> statement-breakpoint
CREATE INDEX `idx_fin_recebivel_recebido` ON `fin_recebiveis` (`recebido`);--> statement-breakpoint
CREATE INDEX `idx_fin_transacao_empresa` ON `fin_transacoes` (`empresaId`);--> statement-breakpoint
CREATE INDEX `idx_fin_transacao_categoria` ON `fin_transacoes` (`categoriaId`);--> statement-breakpoint
CREATE INDEX `idx_fin_transacao_vencimento` ON `fin_transacoes` (`dataVencimento`);--> statement-breakpoint
CREATE INDEX `idx_fin_transacao_pago` ON `fin_transacoes` (`pago`);--> statement-breakpoint
CREATE INDEX `idx_integ_coluna_tabela` ON `integracao_colunas` (`tabelaId`);--> statement-breakpoint
CREATE INDEX `idx_integ_conexao_estab` ON `integracao_conexoes` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_integ_mapcampo_map` ON `integracao_mapeamento_campos` (`mapeamentoId`);--> statement-breakpoint
CREATE INDEX `idx_integ_map_conexao` ON `integracao_mapeamentos` (`conexaoOrigemId`);--> statement-breakpoint
CREATE INDEX `idx_integ_map_tabela` ON `integracao_mapeamentos` (`tabelaDestinoId`);--> statement-breakpoint
CREATE INDEX `idx_integ_map_estab` ON `integracao_mapeamentos` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_integ_sync_map` ON `integracao_sincronizacoes` (`mapeamentoId`);--> statement-breakpoint
CREATE INDEX `idx_integ_sync_status` ON `integracao_sincronizacoes` (`status`);--> statement-breakpoint
CREATE INDEX `idx_integ_sync_inicio` ON `integracao_sincronizacoes` (`iniciadoEm`);--> statement-breakpoint
CREATE INDEX `idx_integ_tabela_nome` ON `integracao_tabelas` (`nome`);--> statement-breakpoint
CREATE INDEX `idx_integ_tabela_estab` ON `integracao_tabelas` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_lac_conta` ON `log_analise_comparacao` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_lac_padrao` ON `log_analise_comparacao` (`padraoId`);--> statement-breakpoint
CREATE INDEX `idx_lac_criado` ON `log_analise_comparacao` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_nfse_hosp_estab` ON `nfse_hospitais` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_hospital` ON `nfse_notas` (`hospitalId`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_convenio` ON `nfse_notas` (`convenioId`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_emissao` ON `nfse_notas` (`dataEmissao`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_emitida` ON `nfse_notas` (`nfEmitida`);--> statement-breakpoint
CREATE INDEX `idx_notif_atend_numatend` ON `notificacoes_atendimento` (`numatend`);--> statement-breakpoint
CREATE INDEX `idx_notif_atend_estab` ON `notificacoes_atendimento` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_notif_atend_criado` ON `notificacoes_atendimento` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_notif_item_notificacao` ON `notificacoes_atendimento_item` (`notificacaoId`);--> statement-breakpoint
CREATE INDEX `idx_notif_item_motivo` ON `notificacoes_atendimento_item` (`motivo`);--> statement-breakpoint
CREATE INDEX `idx_pgc_estab_conv_item` ON `padraoGlosaConvenio` (`estabelecimentoId`,`convenio`,`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_pgc_convenio` ON `padraoGlosaConvenio` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_pgc_risco` ON `padraoGlosaConvenio` (`nivelRisco`);--> statement-breakpoint
CREATE INDEX `idx_ppc_estab_conv_item` ON `padraoPrecoConvenio` (`estabelecimentoId`,`convenio`,`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_ppc_convenio` ON `padraoPrecoConvenio` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_ppc_setor` ON `padraoPrecoConvenio` (`setor`);--> statement-breakpoint
CREATE INDEX `idx_pqi_estab_conv_item` ON `padraoQuantidadeItem` (`estabelecimentoId`,`convenio`,`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_pqi_setor` ON `padraoQuantidadeItem` (`setor`);--> statement-breakpoint
CREATE INDEX `idx_proposta_item_proposta` ON `proposta_itens` (`propostaId`);--> statement-breakpoint
CREATE INDEX `idx_proposta_estab` ON `propostas` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_proposta_status` ON `propostas` (`status`);--> statement-breakpoint
CREATE INDEX `idx_proposta_cliente` ON `propostas` (`cliente`);--> statement-breakpoint
CREATE INDEX `idx_receb_geral_estab` ON `recebimento_geral` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_receb_geral_convenio` ON `recebimento_geral` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_receb_geral_mes` ON `recebimento_geral` (`mes_producao`);--> statement-breakpoint
CREATE INDEX `idx_receb_geral_protocolo` ON `recebimento_geral` (`protocolo`);--> statement-breakpoint
CREATE INDEX `idx_receb_geral_conta` ON `recebimento_geral` (`numero_conta`);--> statement-breakpoint
CREATE INDEX `idx_receb_geral_convenio_id` ON `recebimento_geral` (`convenioId`);--> statement-breakpoint
CREATE INDEX `idx_sa_conta_estab` ON `snapshot_auditoria` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_sa_status` ON `snapshot_auditoria` (`statusSnapshot`);--> statement-breakpoint
CREATE INDEX `idx_sa_auditor` ON `snapshot_auditoria` (`auditorId`);--> statement-breakpoint
CREATE INDEX `idx_cbhpm_codigo` ON `tabelaCbhpm` (`codigoProcedimento`);--> statement-breakpoint
CREATE INDEX `idx_cbhpm_porte` ON `tabelaCbhpm` (`porte`);--> statement-breakpoint
CREATE INDEX `idx_cbhpm_porte_anest` ON `tabelaCbhpm` (`porteAnestesico`);--> statement-breakpoint
CREATE INDEX `idx_porte_conv_estab` ON `tabelaPorteConvenio` (`estabelecimentoId`,`convenio`);--> statement-breakpoint
CREATE INDEX `idx_porte_conv_codigo` ON `tabelaPorteConvenio` (`codigoProcedimento`);--> statement-breakpoint
CREATE INDEX `idx_porte_conv_conv_codigo` ON `tabelaPorteConvenio` (`convenio`,`codigoProcedimento`);--> statement-breakpoint
CREATE INDEX `idx_vinc_cod_estab` ON `vinculacao_codigos` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_vinc_cod_hospital` ON `vinculacao_codigos` (`codigoHospital`);--> statement-breakpoint
CREATE INDEX `idx_vinc_cod_convenio` ON `vinculacao_codigos` (`codigoConvenio`);--> statement-breakpoint
CREATE INDEX `idx_vinc_unique` ON `vinculacao_codigos` (`estabelecimentoId`,`convenioId`,`codigoHospital`,`codigoConvenio`);--> statement-breakpoint
CREATE INDEX `idx_atend_origem_sistema` ON `atendimentos_unificados` (`origemSistema`);--> statement-breakpoint
CREATE INDEX `idx_atend_origem_id` ON `atendimentos_unificados` (`origemId`);--> statement-breakpoint
CREATE INDEX `idx_atend_estab` ON `atendimentos_unificados` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_atend_data_entrada` ON `atendimentos_unificados` (`data_entrada`);--> statement-breakpoint
CREATE INDEX `idx_atend_faturar_estab` ON `atendimentos_a_faturar` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_atend_faturar_numatend` ON `atendimentos_a_faturar` (`numatend`);--> statement-breakpoint
CREATE INDEX `idx_atend_faturar_tipo` ON `atendimentos_a_faturar` (`tipoatend`);--> statement-breakpoint
CREATE INDEX `idx_atend_faturar_datatend` ON `atendimentos_a_faturar` (`datatend`);--> statement-breakpoint
CREATE INDEX `idx_atend_hist_atend` ON `atendimentos_historico` (`atendimentoId`);--> statement-breakpoint
CREATE INDEX `idx_atend_sem_conta_estab` ON `atendimentos_sem_conta` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_atend_sem_conta_numatend` ON `atendimentos_sem_conta` (`numatend`);--> statement-breakpoint
CREATE INDEX `idx_atend_sem_conta_tipo` ON `atendimentos_sem_conta` (`tipoatend`);--> statement-breakpoint
CREATE INDEX `idx_atend_sem_conta_datatend` ON `atendimentos_sem_conta` (`datatend`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_faturamento` ON `conciliados_automatico` (`faturamentoUnificadoId`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_estab` ON `conciliados_automatico` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_status` ON `conciliados_automatico` (`statusConciliacao`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_competencia` ON `conciliados_automatico` (`competencia`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_convenio` ON `conciliados_automatico` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_guia` ON `conciliados_automatico` (`numeroGuia`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_codigo` ON `conciliados_automatico` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_metodo` ON `conciliados_automatico` (`metodoConciliacao`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_estab` ON `custos_produtos_cache` (`estabelecimento_id`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_codprod` ON `custos_produtos_cache` (`codprod`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_tipoprod` ON `custos_produtos_cache` (`tipoprod`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_codtbmm` ON `custos_produtos_cache` (`codtbmm`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_codplaco` ON `custos_produtos_cache` (`codplaco`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_nome_convenio` ON `custos_produtos_cache` (`nome_convenio`);--> statement-breakpoint
CREATE INDEX `idx_fatur_origem_sistema` ON `faturamento_unificado` (`origemSistema`);--> statement-breakpoint
CREATE INDEX `idx_fatur_estab` ON `faturamento_unificado` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_fatur_conta` ON `faturamento_unificado` (`contaNumero`);--> statement-breakpoint
CREATE INDEX `idx_fatur_guia` ON `faturamento_unificado` (`numeroGuia`);--> statement-breakpoint
CREATE INDEX `idx_fatur_convenio` ON `faturamento_unificado` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_fatur_competencia` ON `faturamento_unificado` (`competencia`);--> statement-breakpoint
CREATE INDEX `idx_fatur_codigo_item` ON `faturamento_unificado` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_fatur_status_conciliacao` ON `faturamento_unificado` (`statusConciliacao`);--> statement-breakpoint
CREATE INDEX `idx_fatur_paciente` ON `faturamento_unificado` (`pacienteNome`);--> statement-breakpoint
CREATE INDEX `idx_fat_ext_estab` ON `faturamento_externo` (`estabelecimento_id`);--> statement-breakpoint
CREATE INDEX `idx_fat_ext_convenio` ON `faturamento_externo` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_fat_ext_mes_ano` ON `faturamento_externo` (`mes_ano`);--> statement-breakpoint
CREATE INDEX `idx_fatur_geral_estab` ON `faturamento_geral` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_fatur_geral_numconta` ON `faturamento_geral` (`numconta`);--> statement-breakpoint
CREATE INDEX `idx_fatur_geral_nomeconv` ON `faturamento_geral` (`nomeconv`);--> statement-breakpoint
CREATE INDEX `idx_fatur_geral_mesprod` ON `faturamento_geral` (`mesprod`);--> statement-breakpoint
CREATE INDEX `idx_fatur_geral_config` ON `faturamento_geral` (`configId`);--> statement-breakpoint
CREATE INDEX `idx_gesthor_atend_estab` ON `gesthor_atendimentos_staging` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_gesthor_atend_config` ON `gesthor_atendimentos_staging` (`configuracaoId`);--> statement-breakpoint
CREATE INDEX `idx_integ_fatur_estab` ON `integ_faturado` (`estabelecimento_id`);--> statement-breakpoint
CREATE INDEX `idx_integ_fatur_guia` ON `integ_faturado` (`guiacobra`);--> statement-breakpoint
CREATE INDEX `idx_integ_fatur_proc` ON `integ_faturado` (`procdisco`);--> statement-breakpoint
CREATE INDEX `idx_integ_fatur_mesprod` ON `integ_faturado` (`mesprod`);--> statement-breakpoint
CREATE INDEX `idx_integ_fatur_numconta` ON `integ_faturado` (`numconta`);--> statement-breakpoint
CREATE INDEX `idx_integ_fatur_nomeconv` ON `integ_faturado` (`nomeconv`);--> statement-breakpoint
CREATE INDEX `idx_omni_atend_estab` ON `omni_atendimentos_staging` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_omni_atend_config` ON `omni_atendimentos_staging` (`configuracaoId`);--> statement-breakpoint
CREATE INDEX `idx_pac_cpf` ON `pacientes_unificados` (`cpf`);--> statement-breakpoint
CREATE INDEX `idx_pac_origem_sistema` ON `pacientes_unificados` (`origemSistema`);--> statement-breakpoint
CREATE INDEX `idx_proc_codigo` ON `procedimentos_unificados` (`codigo`);--> statement-breakpoint
CREATE INDEX `idx_proc_origem_sistema` ON `procedimentos_unificados` (`origemSistema`);--> statement-breakpoint
CREATE INDEX `idx_query_config_estab_sistema` ON `query_configuracoes` (`estabelecimentoId`,`sistema`);--> statement-breakpoint
CREATE INDEX `idx_query_config_sistema` ON `query_configuracoes` (`sistema`);--> statement-breakpoint
CREATE INDEX `idx_query_config_ativo` ON `query_configuracoes` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_estab` ON `relatorio_atendimentos_cache` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_numatend` ON `relatorio_atendimentos_cache` (`numatend`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_data` ON `relatorio_atendimentos_cache` (`data_atendimento`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_codserv` ON `relatorio_atendimentos_cache` (`codserv`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_codplaco` ON `relatorio_atendimentos_cache` (`codplaco`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_codprest` ON `relatorio_atendimentos_cache` (`codprest`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_codcc` ON `relatorio_atendimentos_cache` (`codcc`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_tipo` ON `relatorio_atendimentos_cache` (`tipoatend`);--> statement-breakpoint
CREATE INDEX `idx_rel_atend_cache_estab_data` ON `relatorio_atendimentos_cache` (`estabelecimentoId`,`data_atendimento`);--> statement-breakpoint
CREATE INDEX `idx_sync_log_config` ON `sincronizacao_log` (`configuracaoId`);--> statement-breakpoint
CREATE INDEX `idx_sync_log_sistema` ON `sincronizacao_log` (`sistema`);--> statement-breakpoint
CREATE INDEX `idx_sync_log_status` ON `sincronizacao_log` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sync_log_data` ON `sincronizacao_log` (`criadoEm`);--> statement-breakpoint
CREATE INDEX `idx_tasy_matela_estab` ON `Tasy_maternidadeela_atendimentos_stagion` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_tasy_matela_config` ON `Tasy_maternidadeela_atendimentos_stagion` (`configId`);--> statement-breakpoint
CREATE INDEX `idx_tasy_hemolabor_estab` ON `TASY_hemolabor_atendimentos_stagion` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_tasy_hemolabor_config` ON `TASY_hemolabor_atendimentos_stagion` (`configId`);--> statement-breakpoint
CREATE INDEX `idx_warleine_atend_estab` ON `warleine_atendimentos_staging` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_warleine_atend_config` ON `warleine_atendimentos_staging` (`configId`);--> statement-breakpoint
CREATE INDEX `idx_warleine_fatur_estab` ON `warleine_faturamento_staging` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_warleine_fatur_config` ON `warleine_faturamento_staging` (`configId`);