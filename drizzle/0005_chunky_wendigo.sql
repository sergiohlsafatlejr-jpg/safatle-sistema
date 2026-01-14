CREATE TABLE `argumentosConvenio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`codigoGlosa` varchar(20) NOT NULL,
	`argumentoCustomizado` text NOT NULL,
	`vezesUtilizado` int DEFAULT 0,
	`vezesDeferido` int DEFAULT 0,
	`vezesIndeferido` int DEFAULT 0,
	`taxaSucesso` decimal(5,2),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `argumentosConvenio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoContestacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recursoId` int,
	`convenioId` int NOT NULL,
	`userId` int NOT NULL,
	`codigoGlosa` varchar(20) NOT NULL,
	`descricaoGlosa` text,
	`codigoProcedimento` varchar(50),
	`descricaoProcedimento` text,
	`valorGlosado` decimal(10,2),
	`valorRecuperado` decimal(10,2),
	`argumentoUtilizado` text NOT NULL,
	`argumentoOrigem` enum('dicionario','ia_sugestao','manual','historico') NOT NULL DEFAULT 'manual',
	`documentosAnexados` json,
	`resultado` enum('pendente','deferido','deferido_parcial','indeferido') NOT NULL DEFAULT 'pendente',
	`argumentoEfetivo` enum('sim','nao','parcial'),
	`feedbackUsuario` text,
	`taxaSucessoCalculada` decimal(5,2),
	`dataContestacao` timestamp NOT NULL DEFAULT (now()),
	`dataResultado` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `historicoContestacoes_id` PRIMARY KEY(`id`)
);
