CREATE TABLE `historicoValidacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoId` int NOT NULL,
	`convenioId` int NOT NULL,
	`userId` int NOT NULL,
	`totalItens` int DEFAULT 0,
	`divergenciasPreco` int DEFAULT 0,
	`violacoesRegras` int DEFAULT 0,
	`sugestoesIA` int DEFAULT 0,
	`valorDiferenca` decimal(12,2),
	`status` enum('concluida','erro') NOT NULL DEFAULT 'concluida',
	`detalhes` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoValidacoes_id` PRIMARY KEY(`id`)
);
