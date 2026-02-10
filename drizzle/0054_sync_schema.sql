CREATE TABLE `conciliacaoTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`processadoPor` int,
	`dataProcessamento` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `conciliacaoTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contasPagasTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `contasPagasTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contasTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `contasTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dadosTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `dadosTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `demonstrativoItens` (
	`id` int NOT NULL AUTO_INCREMENT,
	`estabelecimentoId` int NOT NULL,
	`arquivoId` int NOT NULL,
	`convenioId` int NOT NULL,
	`codigo` varchar(50),
	`descricao` text,
	`quantidade` decimal(10,4) DEFAULT 1,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `demonstrativoItens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `faturamento_tiss` ADD `valor_total_item` decimal(12,2);
--> statement-breakpoint
ALTER TABLE `faturamento_tiss` ADD `estabelecimento_id` int;
--> statement-breakpoint
CREATE TABLE `itensConciliacaoTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `itensConciliacaoTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensContaTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `itensContaTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensPagosTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `itensPagosTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matMedTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `matMedTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `procedimentosTasy` (
	`id` int NOT NULL AUTO_INCREMENT,
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
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `procedimentosTasy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `estabelecimento_id` int;
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `codigo_prestador_pagamento` varchar(20);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `nome_prestador_pagamento` varchar(150);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `codigo_prestador_executante` varchar(20);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `nome_prestador_executante` varchar(150);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `hora_execucao` varchar(10);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `codigo_procedimento` varchar(15);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `descricao_procedimento` varchar(255);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `tipo_lancamento` varchar(50);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `qtd_executada` int;
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `situacao_item` varchar(20);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `codigo_solicitante` varchar(20);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `nome_solicitante` varchar(150);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `acomodacao_internacao` varchar(50);
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `data_inicio_internacao` timestamp;
--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `data_fim_internacao` timestamp;
