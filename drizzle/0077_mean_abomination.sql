ALTER TABLE `custos_produtos_cache` DROP INDEX `idx_custos_cache_codprod_tbmm`;--> statement-breakpoint
ALTER TABLE `custos_produtos_cache` ADD `codplaco` varchar(50);--> statement-breakpoint
ALTER TABLE `custos_produtos_cache` ADD `nome_convenio` varchar(255);--> statement-breakpoint
ALTER TABLE `custos_produtos_cache` ADD `nome_plano` varchar(255);--> statement-breakpoint
ALTER TABLE `custos_produtos_cache` ADD CONSTRAINT `idx_custos_cache_codprod_tbmm` UNIQUE(`estabelecimento_id`,`codprod`,`codtbmm`,`codplaco`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_codplaco` ON `custos_produtos_cache` (`codplaco`);--> statement-breakpoint
CREATE INDEX `idx_custos_cache_nome_convenio` ON `custos_produtos_cache` (`nome_convenio`);