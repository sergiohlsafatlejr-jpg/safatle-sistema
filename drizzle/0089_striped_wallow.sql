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
ALTER TABLE `fin_transacoes` ADD `centroCustoId` int;--> statement-breakpoint
CREATE INDEX `idx_fin_cc_codigo` ON `fin_centros_custo` (`codigo`);--> statement-breakpoint
CREATE INDEX `idx_fin_cc_ativo` ON `fin_centros_custo` (`ativo`);