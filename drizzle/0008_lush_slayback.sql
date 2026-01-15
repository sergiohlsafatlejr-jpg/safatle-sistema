ALTER TABLE `arquivos` MODIFY COLUMN `status` enum('pendente','processado','erro','processando') NOT NULL DEFAULT 'pendente';--> statement-breakpoint
ALTER TABLE `arquivos` ADD `progresso` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `arquivos` ADD `totalItens` int;--> statement-breakpoint
ALTER TABLE `arquivos` ADD `itensProcessados` int DEFAULT 0;