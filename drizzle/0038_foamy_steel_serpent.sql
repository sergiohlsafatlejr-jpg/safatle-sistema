CREATE TABLE `alertasVariacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`userId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipoAlerta` enum('queda','aumento','ambos') NOT NULL DEFAULT 'queda',
	`percentualLimite` int NOT NULL DEFAULT 20,
	`metrica` enum('faturamento','quantidade','glosa') NOT NULL DEFAULT 'faturamento',
	`agrupamento` varchar(50) DEFAULT 'convenio',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`notificarEmail` enum('sim','nao') DEFAULT 'nao',
	`ultimaVerificacao` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertasVariacao_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compartilhamentosDashboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dashboardId` int NOT NULL,
	`compartilhadoPorId` int NOT NULL,
	`compartilhadoComId` int NOT NULL,
	`permissao` enum('visualizar','editar') NOT NULL DEFAULT 'visualizar',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `compartilhamentosDashboard_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historicoAlertasVariacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`alertaId` int NOT NULL,
	`estabelecimentoId` int NOT NULL,
	`periodoAnterior` varchar(20) NOT NULL,
	`periodoAtual` varchar(20) NOT NULL,
	`valorAnterior` decimal(15,2) NOT NULL,
	`valorAtual` decimal(15,2) NOT NULL,
	`percentualVariacao` decimal(10,2) NOT NULL,
	`detalhes` text,
	`visualizado` enum('sim','nao') DEFAULT 'nao',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historicoAlertasVariacao_id` PRIMARY KEY(`id`)
);
