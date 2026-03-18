CREATE TABLE `nfse_convenios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`codigo` varchar(50),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfse_convenios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nfse_hospitais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int,
	`nome` varchar(255) NOT NULL,
	`cnpj` varchar(20),
	`cpfNf` varchar(20),
	`senhaNf` varchar(255),
	`endereco` text,
	`telefone` varchar(20),
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfse_hospitais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nfse_notas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hospitalId` int NOT NULL,
	`convenioId` int,
	`numeroNf` varchar(50) NOT NULL,
	`dataEmissao` date NOT NULL,
	`dataFaturamento` date,
	`valorBruto` decimal(15,2) NOT NULL DEFAULT '0',
	`valorLiquido` decimal(15,2) NOT NULL DEFAULT '0',
	`xmlDemonstrativoEmitido` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`nfEmitida` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`observacoes` text,
	`pdfUrl` text,
	`pdfKey` varchar(512),
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nfse_notas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_nfse_hosp_estab` ON `nfse_hospitais` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_hospital` ON `nfse_notas` (`hospitalId`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_convenio` ON `nfse_notas` (`convenioId`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_emissao` ON `nfse_notas` (`dataEmissao`);--> statement-breakpoint
CREATE INDEX `idx_nfse_nota_emitida` ON `nfse_notas` (`nfEmitida`);