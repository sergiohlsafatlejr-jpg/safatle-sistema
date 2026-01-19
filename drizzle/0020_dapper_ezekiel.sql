CREATE TABLE `gruposServico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`cor` varchar(20) DEFAULT 'bg-gray-500',
	`icone` varchar(50) DEFAULT 'Users',
	`permissoesPadrao` json,
	`estabelecimentoId` int,
	`sistemaGrupo` enum('sim','nao') NOT NULL DEFAULT 'nao',
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`criadoPor` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gruposServico_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `logAuditoriaPermissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`usuarioId` int NOT NULL,
	`usuarioNome` varchar(255),
	`usuarioAfetadoId` int NOT NULL,
	`usuarioAfetadoNome` varchar(255),
	`estabelecimentoId` int,
	`estabelecimentoNome` varchar(255),
	`tipoAcao` enum('criar_permissao','alterar_permissao','remover_permissao','criar_usuario','alterar_grupo','criar_grupo','excluir_grupo') NOT NULL,
	`descricao` text,
	`valoresAnteriores` json,
	`valoresNovos` json,
	`ipUsuario` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `logAuditoriaPermissoes_id` PRIMARY KEY(`id`)
);
