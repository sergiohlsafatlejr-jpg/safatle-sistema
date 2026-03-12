CREATE TABLE `geocoding_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cep` varchar(20) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`endereco_formatado` text,
	`bairro` varchar(255),
	`cidade` varchar(255),
	`estado` varchar(2),
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `geocoding_cache_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_geocoding_cache_cep` UNIQUE(`cep`)
);
