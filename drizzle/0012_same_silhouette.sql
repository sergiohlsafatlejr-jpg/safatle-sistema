CREATE TABLE `importacoesTabela` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`userId` int NOT NULL,
	`tipo` enum('diarias','mat_med','taxas','procedimentos') NOT NULL,
	`nomeArquivo` varchar(255) NOT NULL,
	`formatoArquivo` enum('excel','csv','dbf') NOT NULL,
	`totalItens` int DEFAULT 0,
	`itensImportados` int DEFAULT 0,
	`itensAtualizados` int DEFAULT 0,
	`itensErro` int DEFAULT 0,
	`status` enum('processando','concluido','erro') NOT NULL DEFAULT 'processando',
	`mensagemErro` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importacoesTabela_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tabelasPreco` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`tipo` enum('diarias','mat_med','taxas','procedimentos') NOT NULL,
	`codigo` varchar(50) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`valor` decimal(12,2) NOT NULL,
	`vigenciaInicio` timestamp NOT NULL,
	`vigenciaFim` timestamp,
	`unidade` varchar(50),
	`observacao` text,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tabelasPreco_id` PRIMARY KEY(`id`)
);
