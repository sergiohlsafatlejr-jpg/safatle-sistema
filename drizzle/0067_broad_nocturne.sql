ALTER TABLE `padraoPrecoConvenio` ADD `setor` varchar(255);--> statement-breakpoint
CREATE INDEX `idx_ppc_setor` ON `padraoPrecoConvenio` (`setor`);