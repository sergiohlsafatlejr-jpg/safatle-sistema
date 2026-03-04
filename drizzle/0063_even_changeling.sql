CREATE TABLE `contas_convenio_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`origem` enum('XML','BANCO_CLIENTE') NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`numeroGuia` varchar(100),
	`numeroGuiaOperadora` varchar(100),
	`numeroLote` varchar(50),
	`senha` varchar(50),
	`protocolo` varchar(100),
	`pacienteNome` varchar(255),
	`carteiraBeneficiario` varchar(100),
	`convenio` varchar(255),
	`convenioId` int,
	`estabelecimentoId` int NOT NULL,
	`tipoItem` varchar(50),
	`codigoItem` varchar(50),
	`codigoItemTuss` varchar(50),
	`descricaoItem` text,
	`codigoTabela` varchar(10),
	`quantidade` decimal(12,4),
	`valorUnitario` decimal(12,4),
	`valorTotal` decimal(14,2),
	`dataExecucao` timestamp,
	`dataReferencia` timestamp,
	`competencia` varchar(20),
	`profissionalExecutante` varchar(255),
	`setor` varchar(255),
	`arquivoId` int,
	`statusAnalise` enum('pendente','conforme','divergente','revisado') NOT NULL DEFAULT 'pendente',
	`divergencias` json,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_convenio_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_convenio_resumo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numeroConta` varchar(100) NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`origem` enum('XML','BANCO_CLIENTE') NOT NULL,
	`convenio` varchar(255),
	`convenioId` int,
	`pacienteNome` varchar(255),
	`carteiraBeneficiario` varchar(100),
	`totalItens` int NOT NULL DEFAULT 0,
	`valorTotal` decimal(14,2) DEFAULT '0',
	`dataInternacao` timestamp,
	`dataAlta` timestamp,
	`competencia` varchar(20),
	`statusAnaliseResumo` enum('pendente','conforme','divergente','revisado') NOT NULL DEFAULT 'pendente',
	`totalDivergencias` int DEFAULT 0,
	`totalAlertas` int DEFAULT 0,
	`dataBusca` timestamp NOT NULL DEFAULT (now()),
	`buscadoPor` int,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	`atualizadoEm` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_convenio_resumo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_cci_numconta` ON `contas_convenio_itens` (`numeroConta`);--> statement-breakpoint
CREATE INDEX `idx_cci_convenio` ON `contas_convenio_itens` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_cci_estab` ON `contas_convenio_itens` (`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_cci_origem` ON `contas_convenio_itens` (`origem`);--> statement-breakpoint
CREATE INDEX `idx_cci_status` ON `contas_convenio_itens` (`statusAnalise`);--> statement-breakpoint
CREATE INDEX `idx_cci_competencia` ON `contas_convenio_itens` (`competencia`);--> statement-breakpoint
CREATE INDEX `idx_cci_codigo_item` ON `contas_convenio_itens` (`codigoItem`);--> statement-breakpoint
CREATE INDEX `idx_cci_guia` ON `contas_convenio_itens` (`numeroGuia`);--> statement-breakpoint
CREATE INDEX `idx_ccr_numconta_estab` ON `contas_convenio_resumo` (`numeroConta`,`estabelecimentoId`);--> statement-breakpoint
CREATE INDEX `idx_ccr_convenio` ON `contas_convenio_resumo` (`convenio`);--> statement-breakpoint
CREATE INDEX `idx_ccr_status` ON `contas_convenio_resumo` (`statusAnaliseResumo`);