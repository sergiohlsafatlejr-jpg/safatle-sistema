ALTER TABLE `permissoesEstabelecimento` ADD `acessoPainelExecutivo` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoVisaoGeral` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoFinanceiro` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoContratos` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoPropostas` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoAtendimentosConsolidados` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoNfseConsolidado` enum('sim','nao') DEFAULT 'nao' NOT NULL;