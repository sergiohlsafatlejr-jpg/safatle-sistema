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
