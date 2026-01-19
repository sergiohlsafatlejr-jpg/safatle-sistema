CREATE TABLE `permissoesEstabelecimento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`podeVisualizar` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`podeEditar` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`podeExcluir` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`podeGerenciar` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoesEstabelecimento_id` PRIMARY KEY(`id`)
);
