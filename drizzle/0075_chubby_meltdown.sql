CREATE TABLE `custos_produtos_sync_meta` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimento_id` int NOT NULL,
	`status` varchar(50) NOT NULL DEFAULT 'pendente',
	`ultima_sincronizacao` timestamp,
	`total_registros` int DEFAULT 0,
	`duracao_segundos` int DEFAULT 0,
	`mensagem_erro` text,
	`executado_por` int,
	`executado_por_nome` varchar(255),
	`criado_em` timestamp DEFAULT (now()),
	`atualizado_em` timestamp DEFAULT (now()),
	CONSTRAINT `custos_produtos_sync_meta_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_custos_sync_meta_estab` UNIQUE(`estabelecimento_id`)
);
--> statement-breakpoint
CREATE TABLE `custos_produtos_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`estabelecimento_id` int NOT NULL,
	`codprod` varchar(50) NOT NULL,
	`descricao` varchar(500),
	`tipoprod` varchar(10),
	`capacidade_estoque` decimal(18,6),
	`mult_estoque` decimal(18,6),
	`unidade_estoque` varchar(50),
	`custo_estoque` decimal(18,6),
	`codtbmm` varchar(20) NOT NULL,
	`mult_faturas` decimal(18,6),
	`unidade_faturas` varchar(50),
	`custo_mult_fat` decimal(18,6),
	`valormm` decimal(18,6),
	`prevenbras` decimal(18,6),
	`prefabsimp` decimal(18,6),
	`sincronizado_em` timestamp DEFAULT (now()),
	CONSTRAINT `custos_produtos_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_custos_cache_codprod_tbmm` UNIQUE(`estabelecimento_id`,`codprod`,`codtbmm`)
);
--> statement-breakpoint
CREATE INDEX `idx_custos_cache_estab` ON `custos_produtos_cache` (`estabelecimento_id`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_codprod` ON `custos_produtos_cache` (`codprod`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_tipoprod` ON `custos_produtos_cache` (`tipoprod`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_codtbmm` ON `custos_produtos_cache` (`codtbmm`);