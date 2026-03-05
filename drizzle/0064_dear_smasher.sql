CREATE TABLE `feedback_divergencias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`codigoItem` varchar(50),
	`padraoId` int,
	`tipoDivergencia` varchar(50) NOT NULL,
	`decisao` enum('aceitar','rejeitar','ignorar') NOT NULL,
	`justificativa` text,
	`dadosDivergencia` json,
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feedback_divergencias_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_fd_padrao` ON `feedback_divergencias` (`padraoId`);--> statement-breakpoint
CREATE INDEX `idx_fd_estab` ON `feedback_divergencias` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_fd_decisao` ON `feedback_divergencias` (`decisao`);