CREATE TABLE `regrasConciliacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int NOT NULL,
	`itensNaoEncontrados` enum('glosado','pago','divergente') NOT NULL DEFAULT 'glosado',
	`toleranciaValor` decimal(10,2) DEFAULT '0.00',
	`toleranciaPercentual` decimal(5,2) DEFAULT '0.00',
	`usarCodigo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`usarGuia` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`usarData` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`usarPaciente` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`formatoRetorno` enum('excel_completo','excel_glosas','xml_tiss','csv','pdf') NOT NULL DEFAULT 'excel_completo',
	`prazoRecursoDias` int DEFAULT 30,
	`observacoes` text,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regrasConciliacao_id` PRIMARY KEY(`id`),
	CONSTRAINT `regrasConciliacao_convenioId_unique` UNIQUE(`convenioId`)
);
