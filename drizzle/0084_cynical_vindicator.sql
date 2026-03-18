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
CREATE INDEX `idx_fat_ext_estab` ON `faturamento_externo` (`estabelecimento_id`);--> statement-breakpoint
CREATE INDEX `idx_fat_ext_convenio` ON `faturamento_externo` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_fat_ext_mes_ano` ON `faturamento_externo` (`mes_ano`);