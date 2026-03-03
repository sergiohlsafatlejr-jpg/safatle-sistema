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
	`origemSistema` varchar(50),
	`valorFaturado` decimal(12,4),
	`quantidade` decimal(12,4),
	`recebimentoId` int,
	`recebimentoOrigem` varchar(20),
	`valorPago` decimal(12,4) DEFAULT '0',
	`valorGlosa` decimal(12,4) DEFAULT '0',
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
CREATE INDEX `idx_conc_auto_faturamento` ON `conciliados_automatico` (`faturamentoUnificadoId`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_estab` ON `conciliados_automatico` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_status` ON `conciliados_automatico` (`statusConciliacao`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_competencia` ON `conciliados_automatico` (`competencia`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_convenio` ON `conciliados_automatico` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_guia` ON `conciliados_automatico` (`numeroGuia`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_codigo` ON `conciliados_automatico` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_conc_auto_metodo` ON `conciliados_automatico` (`metodoConciliacao`);