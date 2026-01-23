CREATE TABLE `regrasIA` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int,
	`codigo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`categoria` enum('outlier','padrao_erro','risco_glosa','tendencia','comparacao') NOT NULL,
	`tipoAlerta` enum('critico','alerta','info') NOT NULL DEFAULT 'alerta',
	`parametros` json,
	`prioridade` int DEFAULT 100,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`atualizadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regrasIA_id` PRIMARY KEY(`id`)
);
