CREATE TABLE `dashboardsSalvos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`configuracao` text NOT NULL,
	`comparativoAtivo` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`periodo1Mes` int,
	`periodo1Ano` int,
	`periodo2Mes` int,
	`periodo2Ano` int,
	`favorito` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`ultimoAcesso` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dashboardsSalvos_id` PRIMARY KEY(`id`)
);
