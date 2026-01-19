CREATE TABLE `motivosGlosa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigo` varchar(20) NOT NULL,
	`grupo` varchar(100) NOT NULL,
	`descricao` text NOT NULL,
	`descricaoSimplificada` varchar(255) NOT NULL,
	`argumentoContestacao` text,
	`acoesRecomendadas` json,
	`documentosSugeridos` json,
	`dificuldadeReversao` int DEFAULT 3,
	`probabilidadeSucesso` int DEFAULT 50,
	`tipoOrigem` enum('tiss','personalizado') NOT NULL DEFAULT 'personalizado',
	`estabelecimentoId` int,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `motivosGlosa_id` PRIMARY KEY(`id`)
);
