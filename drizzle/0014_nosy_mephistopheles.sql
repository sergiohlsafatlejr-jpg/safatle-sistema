CREATE TABLE `alertasDivergencia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arquivoId` int NOT NULL,
	`procedimentoId` int,
	`regraId` int,
	`tipoAlerta` enum('valor_divergente','item_faltante','item_nao_permitido','quantidade_incorreta','codigo_invalido','regra_negocio','sugestao_ia') NOT NULL,
	`severidade` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`titulo` varchar(255) NOT NULL,
	`descricao` text NOT NULL,
	`valorCobrado` decimal(12,2),
	`valorEsperado` decimal(12,2),
	`diferenca` decimal(12,2),
	`codigoItem` varchar(50),
	`descricaoItem` varchar(255),
	`guiaNumero` varchar(100),
	`sugestaoCorrecao` text,
	`status` enum('pendente','analisando','corrigido','ignorado','aceito') NOT NULL DEFAULT 'pendente',
	`resolvidoPor` int,
	`dataResolucao` timestamp,
	`observacaoResolucao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `alertasDivergencia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `itensRegraNegocio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`regraId` int NOT NULL,
	`codigoItem` varchar(50) NOT NULL,
	`descricaoItem` varchar(255),
	`tipoItem` enum('procedimento','taxa','material','medicamento','diaria','outros') NOT NULL,
	`quantidadeMinima` int DEFAULT 1,
	`quantidadeMaxima` int,
	`valorEsperado` decimal(12,2),
	`toleranciaValor` decimal(10,2) DEFAULT '0.00',
	`obrigatorio` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `itensRegraNegocio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `padroesContas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int,
	`estabelecimentoId` int,
	`codigoProcedimentoPrincipal` varchar(50) NOT NULL,
	`descricaoProcedimentoPrincipal` varchar(255),
	`itensAssociados` json,
	`totalOcorrencias` int DEFAULT 0,
	`valorMedioConta` decimal(12,2),
	`ultimaAtualizacao` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `padroesContas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `regrasNegocio` (
	`id` int AUTO_INCREMENT NOT NULL,
	`convenioId` int,
	`estabelecimentoId` int,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`codigoProcedimentoPrincipal` varchar(50) NOT NULL,
	`descricaoProcedimentoPrincipal` varchar(255),
	`tipoVerificacao` enum('deve_conter','nao_deve_conter','pode_conter','quantidade_minima','quantidade_maxima') NOT NULL DEFAULT 'deve_conter',
	`acaoInconsistencia` enum('alerta','bloquear','sugerir_adicao','sugerir_remocao') NOT NULL DEFAULT 'alerta',
	`prioridade` int DEFAULT 5,
	`ativo` enum('sim','nao') NOT NULL DEFAULT 'sim',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `regrasNegocio_id` PRIMARY KEY(`id`)
);
