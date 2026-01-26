CREATE TABLE `convenioEstabelecimentoPrestador` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`codigoPrestador` varchar(50) NOT NULL,
	`nomePrestador` varchar(255),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `convenioEstabelecimentoPrestador_id` PRIMARY KEY(`id`)
);
