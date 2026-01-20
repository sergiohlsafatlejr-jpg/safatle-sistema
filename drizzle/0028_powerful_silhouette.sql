CREATE TABLE `historicoPrecos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tabelaPrecoId` int NOT NULL,
	`userId` int NOT NULL,
	`tipoAlteracao` enum('criacao','edicao','exclusao','importacao') NOT NULL,
	`valorAnterior` decimal(12,2),
	`vigenciaInicioAnterior` timestamp,
	`vigenciaFimAnterior` timestamp,
	`nomeAnterior` varchar(255),
	`codigoAnterior` varchar(50),
	`valorNovo` decimal(12,2),
	`vigenciaInicioNovo` timestamp,
	`vigenciaFimNovo` timestamp,
	`nomeNovo` varchar(255),
	`codigoNovo` varchar(50),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoPrecos_id` PRIMARY KEY(`id`)
);
