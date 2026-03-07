CREATE TABLE `ajustes_auditoria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`tipoAjuste` enum('ALTERAR_QUANTIDADE','ALTERAR_VALOR','ADICIONAR_ITEM','REMOVER_ITEM') NOT NULL,
	`itemId` int,
	`codigoItem` varchar(50),
	`descricaoItem` text,
	`quantidadeOriginal` decimal(12,4),
	`valorOriginal` decimal(14,2),
	`quantidadeAjustada` decimal(12,4),
	`valorAjustado` decimal(14,2),
	`tipoItemAdicionado` varchar(50),
	`justificativa` text,
	`statusAjuste` enum('pendente','aplicado','revertido') NOT NULL DEFAULT 'pendente',
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ajustes_auditoria_id` PRIMARY KEY(`id`)
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
CREATE INDEX `idx_aa_conta` ON `ajustes_auditoria` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_aa_tipo` ON `ajustes_auditoria` (`tipoAjuste`);--> statement-breakpoint
CREATE INDEX `idx_aa_item` ON `ajustes_auditoria` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_aa_status` ON `ajustes_auditoria` (`statusAjuste`);--> statement-breakpoint
CREATE INDEX `idx_aprd_estab_tipo` ON `aprendizado_auditoria` (`estabelecimentoId`,`tipoAprendizado`);--> statement-breakpoint
CREATE INDEX `idx_aprd_convenio` ON `aprendizado_auditoria` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_aprd_codigo` ON `aprendizado_auditoria` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_aprd_confianca` ON `aprendizado_auditoria` (`confianca`);--> statement-breakpoint
CREATE INDEX `idx_aprd_ativo` ON `aprendizado_auditoria` (`ativo`);--> statement-breakpoint
CREATE INDEX `idx_fp_conta` ON `falhas_prontuario` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_fp_categoria` ON `falhas_prontuario` (`categoriaFalha`);--> statement-breakpoint
CREATE INDEX `idx_fp_status` ON `falhas_prontuario` (`statusFalha`);