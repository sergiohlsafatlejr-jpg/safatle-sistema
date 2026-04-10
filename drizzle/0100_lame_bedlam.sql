ALTER TABLE `fin_recebiveis` ADD `notaFiscalKey` varchar(255);--> statement-breakpoint
ALTER TABLE `fin_recebiveis` ADD `emailEnviado` enum('sim','nao') DEFAULT 'nao' NOT NULL;