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
ALTER TABLE `contas_convenio_resumo` ADD `scoreRisco` int;--> statement-breakpoint
ALTER TABLE `contas_convenio_resumo` ADD `detalhesRisco` json;--> statement-breakpoint
ALTER TABLE `contas_convenio_resumo` ADD `isOutlierValor` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `padroesCobranca` ADD `profissionalExecutante` varchar(255);--> statement-breakpoint
CREATE INDEX `idx_cbhpm_codigo` ON `tabelaCbhpm` (`codigoProcedimento`);--> statement-breakpoint
CREATE INDEX `idx_cbhpm_porte` ON `tabelaCbhpm` (`porte`);--> statement-breakpoint
CREATE INDEX `idx_cbhpm_porte_anest` ON `tabelaCbhpm` (`porteAnestesico`);--> statement-breakpoint
CREATE INDEX `idx_porte_conv_estab` ON `tabelaPorteConvenio` (`estabelecimentoId`,`convenio`);--> statement-breakpoint
CREATE INDEX `idx_porte_conv_codigo` ON `tabelaPorteConvenio` (`codigoProcedimento`);--> statement-breakpoint
CREATE INDEX `idx_porte_conv_conv_codigo` ON `tabelaPorteConvenio` (`convenio`,`codigoProcedimento`);