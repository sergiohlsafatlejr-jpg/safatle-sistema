CREATE TABLE `decisoesGlosa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`codigoGlosa` varchar(20) NOT NULL,
	`codigoProcedimento` varchar(50),
	`tipoProcedimento` varchar(50),
	`decisao` enum('aceitar','recursar') NOT NULL,
	`resultadoRecurso` enum('pendente','deferido','deferido_parcial','indeferido'),
	`valorGlosado` decimal(10,2),
	`valorRecuperado` decimal(10,2),
	`motivoDecisao` text,
	`procedimentoId` int,
	`recursoId` int,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decisoesGlosa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `procedimentos` ADD `classificacaoGlosa` enum('pendente','aceitar','recursar','auto_aceitar','auto_recursar') DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `procedimentos` ADD `classificacaoConfianca` int;--> statement-breakpoint
ALTER TABLE `procedimentos` ADD `classificacaoMotivo` text;