CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userNome` varchar(255),
	`acao` enum('CRIAR','EDITAR','EXCLUIR','ACESSO','SISTEMA') NOT NULL,
	`entidade` varchar(255) NOT NULL,
	`entidadeId` varchar(255),
	`detalhes` json,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `apiKeys` MODIFY COLUMN `expiraEm` timestamp;--> statement-breakpoint
ALTER TABLE `avisosInternos` MODIFY COLUMN `expiraEm` timestamp;