ALTER TABLE `recebimento_tiss` ADD `estabelecimento_id` int;--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `data_pagamento` timestamp;--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `codigo_prestador_pagamento` varchar(20);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `nome_prestador_pagamento` varchar(150);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `codigo_prestador_executante` varchar(20);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `nome_prestador_executante` varchar(150);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `nome_beneficiario` varchar(150);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `hora_execucao` varchar(10);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `tipo_lancamento` varchar(50);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `situacao_item` varchar(20);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `codigo_solicitante` varchar(20);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `nome_solicitante` varchar(150);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `acomodacao_internacao` varchar(50);--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `data_inicio_internacao` timestamp;--> statement-breakpoint
ALTER TABLE `recebimento_tiss` ADD `data_fim_internacao` timestamp;