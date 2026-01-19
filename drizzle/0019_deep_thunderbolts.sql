ALTER TABLE `permissoesEstabelecimento` ADD `grupoServico` enum('administrador','faturista','recurso_glosa','gestor','visualizador') DEFAULT 'visualizador' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoDashboard` enum('sim','nao') DEFAULT 'sim' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoArquivos` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoComparacoes` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoFaturamento` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoTabelasPreco` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoAnaliseGlosa` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoDicionarioGlosas` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoRecursosGlosa` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoConvenios` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoRegrasNegocio` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoProdutividade` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoEstabelecimentos` enum('sim','nao') DEFAULT 'nao' NOT NULL;--> statement-breakpoint
ALTER TABLE `permissoesEstabelecimento` ADD `acessoPermissoes` enum('sim','nao') DEFAULT 'nao' NOT NULL;