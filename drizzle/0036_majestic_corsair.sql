CREATE TABLE `apiKeys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`keyHash` varchar(255) NOT NULL,
	`keyPrefix` varchar(20) NOT NULL,
	`estabelecimentosPermitidos` json,
	`permissoes` json,
	`ultimoUso` timestamp,
	`totalUsos` int DEFAULT 0,
	`expiraEm` timestamp,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `apiKeys_id` PRIMARY KEY(`id`)
);
