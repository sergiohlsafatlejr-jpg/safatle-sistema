CREATE TABLE `log_analise_comparacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(50) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`padraoId` int,
	`padraoNome` varchar(500),
	`padraoTipo` varchar(50),
	`isGabarito` int DEFAULT 0,
	`convenioNome` varchar(255),
	`setorPadrao` varchar(255),
	`procedimentosConta` text,
	`totalItensAnalisados` int DEFAULT 0,
	`totalDivergencias` int DEFAULT 0,
	`divergenciasCritico` int DEFAULT 0,
	`divergenciasAlerta` int DEFAULT 0,
	`divergenciasAviso` int DEFAULT 0,
	`divergenciasInfo` int DEFAULT 0,
	`scoreMatch` int DEFAULT 0,
	`motivoSelecao` text,
	`statusGeral` varchar(30),
	`duracaoMs` int,
	`usuarioId` int,
	`usuarioNome` varchar(255),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `log_analise_comparacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_lac_conta` ON `log_analise_comparacao` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_lac_padrao` ON `log_analise_comparacao` (`padraoId`);--> statement-breakpoint
CREATE INDEX `idx_lac_criado` ON `log_analise_comparacao` (`criadoEm`);