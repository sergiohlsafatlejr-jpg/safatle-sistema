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
CREATE INDEX `idx_pgc_estab_conv_item` ON `padraoGlosaConvenio` (`estabelecimentoId`,`convenio`,`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_pgc_convenio` ON `padraoGlosaConvenio` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_pgc_risco` ON `padraoGlosaConvenio` (`nivelRisco`);--> statement-breakpoint
CREATE INDEX `idx_ppc_estab_conv_item` ON `padraoPrecoConvenio` (`estabelecimentoId`,`convenio`,`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_ppc_convenio` ON `padraoPrecoConvenio` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_pqi_estab_conv_item` ON `padraoQuantidadeItem` (`estabelecimentoId`,`convenio`,`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_pqi_setor` ON `padraoQuantidadeItem` (`setor`);