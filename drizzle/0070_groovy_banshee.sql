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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `snapshot_auditoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_cc_snapshot` ON `conferencia_correcao` (`snapshotId`);--> statement-breakpoint
CREATE INDEX `idx_cc_conta_estab` ON `conferencia_correcao` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_cc_status` ON `conferencia_correcao` (`statusCorrecao`);--> statement-breakpoint
CREATE INDEX `idx_sa_conta_estab` ON `snapshot_auditoria` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_sa_status` ON `snapshot_auditoria` (`statusSnapshot`);--> statement-breakpoint
CREATE INDEX `idx_sa_auditor` ON `snapshot_auditoria` (`auditorId`);