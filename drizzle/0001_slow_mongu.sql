CREATE TABLE `arquivos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipoArquivo` enum('xml','excel','pdf') NOT NULL,
	`direcao` enum('enviado','retornado') NOT NULL,
	`convenioId` int NOT NULL,
	`userId` int NOT NULL,
	`s3Key` varchar(512) NOT NULL,
	`s3Url` text NOT NULL,
	`tamanho` int,
	`status` enum('pendente','processado','erro') NOT NULL DEFAULT 'pendente',
	`dataReferencia` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `arquivos_id` PRIMARY KEY(`id`)
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
CREATE TABLE `convenios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`codigo` varchar(50),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convenios_id` PRIMARY KEY(`id`)
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
	`resolvido` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `divergencias_id` PRIMARY KEY(`id`)
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
CREATE TABLE `procedimentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoId` int NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`descricao` text,
	`quantidade` int DEFAULT 1,
	`valorUnitario` decimal(10,2),
	`valorTotal` decimal(10,2),
	`dataExecucao` timestamp,
	`pacienteNome` varchar(255),
	`pacienteCarteirinha` varchar(100),
	`guiaNumero` varchar(100),
	`dadosExtras` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `procedimentos_id` PRIMARY KEY(`id`)
);
