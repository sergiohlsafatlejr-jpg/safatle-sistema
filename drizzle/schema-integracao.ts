import { pgTable, text, integer, timestamp, boolean, decimal, json, uniqueIndex, index, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * CAMADA 1: CONFIGURAÇÃO DE QUERIES
 * Armazena as configurações de queries para cada sistema/estabelecimento
 */
export const queryConfiguracoes = pgTable(
  "query_configuracoes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    sistema: varchar({ length: 50 }).notNull(), // warleine, tasy, omni, gesthor
    tipoDados: varchar({ length: 50 }).notNull(), // atendimentos, faturamento, procedimentos, pacientes
    querySql: text().notNull(),
    descricao: text(),
    
    // Configuração de conexão (para sistemas que não usam credenciais globais)
    conexaoConfig: json(), // { host, port, database, user, password }
    
    // Frequência de sincronização
    frequencia: varchar({ length: 50 }).notNull().default("tempo_real"), // tempo_real, 1x_dia, 1x_semana
    
    // Status
    ativo: boolean().notNull().default(true),
    
    // Rastreamento
    ultimaSincronizacao: timestamp(),
    proximaSincronizacao: timestamp(),
    totalRegistrosSincronizados: integer().default(0),
    
    criadoEm: timestamp().defaultNow(),
    atualizadoEm: timestamp().defaultNow(),
  },
  (table) => ({
    estabelecimentoSistemaIdx: index("idx_query_config_estab_sistema").on(table.estabelecimentoId, table.sistema),
    sistemaIdx: index("idx_query_config_sistema").on(table.sistema),
  })
);

/**
 * CAMADA 2: STAGING - DADOS BRUTOS DE CADA SISTEMA
 */

// WARLEINE - Atendimentos (Staging)
export const warleineAtendimentosStaging = pgTable(
  "warleine_atendimentos_staging",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Dados brutos da query
    numatend: varchar({ length: 50 }).notNull(), // Número do atendimento
    codtipsai: varchar({ length: 50 }), // Código tipo saída
    nomeplaco: varchar({ length: 255 }), // Nome do local
    nomepac: varchar({ length: 255 }), // Nome do paciente
    carater: varchar({ length: 50 }), // Caráter (UR, EL, etc)
    datatend: timestamp(), // Data do atendimento
    datasai: timestamp(), // Data de saída
    tipoatend: varchar({ length: 50 }), // Tipo atendimento (I, E, A)
    tipoatendimentodescricao: varchar({ length: 255 }), // Descrição (INTERNAÇÃO, EXAME, AMBULATORIO)
    codserv: varchar({ length: 255 }), // Código do serviço
    procprin: varchar({ length: 50 }), // Procedimento principal
    codccDestino: varchar({ length: 50 }), // Centro de custo destino
    
    // Metadados
    dadosBrutos: json(), // JSON com todos os dados originais
    sincronizadoEm: timestamp().defaultNow(),
    processado: boolean().default(false),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_warleine_staging_estab").on(table.estabelecimentoId),
    numatendIdx: index("idx_warleine_staging_numatend").on(table.numatend),
    processadoIdx: index("idx_warleine_staging_processado").on(table.processado),
  })
);

// TASY - Atendimentos (Staging)
export const tasyAtendimentosStaging = pgTable(
  "tasy_atendimentos_staging",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Dados brutos do Oracle
    dadosBrutos: json().notNull(),
    
    // Metadados
    sincronizadoEm: timestamp().defaultNow(),
    processado: boolean().default(false),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_tasy_staging_estab").on(table.estabelecimentoId),
    processadoIdx: index("idx_tasy_staging_processado").on(table.processado),
  })
);

// OMNI - Atendimentos (Staging)
export const omniAtendimentosStaging = pgTable(
  "omni_atendimentos_staging",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Dados brutos do Firebird
    dadosBrutos: json().notNull(),
    
    // Metadados
    sincronizadoEm: timestamp().defaultNow(),
    processado: boolean().default(false),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_omni_staging_estab").on(table.estabelecimentoId),
    processadoIdx: index("idx_omni_staging_processado").on(table.processado),
  })
);

// GESTHOR - Atendimentos (Staging)
export const gesthorAtendimentosStaging = pgTable(
  "gesthor_atendimentos_staging",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Dados brutos do Firebird
    dadosBrutos: json().notNull(),
    
    // Metadados
    sincronizadoEm: timestamp().defaultNow(),
    processado: boolean().default(false),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_gesthor_staging_estab").on(table.estabelecimentoId),
    processadoIdx: index("idx_gesthor_staging_processado").on(table.processado),
  })
);

/**
 * CAMADA 3: DADOS UNIFICADOS
 */

// Atendimentos Unificados
export const atendimentosUnificados = pgTable(
  "atendimentos_unificados",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Rastreamento de origem
    origemSistema: varchar({ length: 50 }).notNull(), // warleine, tasy, omni, gesthor
    origemId: varchar({ length: 100 }).notNull(), // ID original do sistema
    
    // Dados normalizados
    dataAtendimento: timestamp().notNull(),
    dataSaida: timestamp(),
    tipoAtendimento: varchar({ length: 50 }), // INTERNACAO, EXAME, AMBULATORIO
    nomePaciente: varchar({ length: 255 }),
    codigoProcedimento: varchar({ length: 50 }),
    nomeServico: varchar({ length: 255 }),
    carater: varchar({ length: 50 }),
    
    // Metadados
    sincronizadoEm: timestamp().defaultNow(),
    atualizadoEm: timestamp().defaultNow(),
    
    // Dados brutos para referência
    dadosOriginais: json(),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_atend_unif_estab").on(table.estabelecimentoId),
    origemIdx: index("idx_atend_unif_origem").on(table.origemSistema, table.origemId),
    dataAtendimentoIdx: index("idx_atend_unif_data").on(table.dataAtendimento),
  })
);

// Faturamento Unificado
export const faturamentoUnificado = pgTable(
  "faturamento_unificado",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Rastreamento de origem
    origemSistema: varchar({ length: 50 }).notNull(),
    origemId: varchar({ length: 100 }).notNull(),
    
    // Dados normalizados
    dataFaturamento: timestamp().notNull(),
    numeroGuia: varchar({ length: 50 }),
    codigoItem: varchar({ length: 50 }),
    descricaoItem: varchar({ length: 255 }),
    tipoItem: varchar({ length: 50 }), // medicamento, material, taxa, diaria, procedimento
    quantidade: decimal({ precision: 10, scale: 2 }),
    valorUnitario: decimal({ precision: 12, scale: 2 }),
    valorTotal: decimal({ precision: 12, scale: 2 }),
    
    // Metadados
    sincronizadoEm: timestamp().defaultNow(),
    atualizadoEm: timestamp().defaultNow(),
    dadosOriginais: json(),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_fat_unif_estab").on(table.estabelecimentoId),
    origemIdx: index("idx_fat_unif_origem").on(table.origemSistema, table.origemId),
    dataFaturamentoIdx: index("idx_fat_unif_data").on(table.dataFaturamento),
  })
);

// Procedimentos Unificados
export const procedimentosUnificados = pgTable(
  "procedimentos_unificados",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Rastreamento de origem
    origemSistema: varchar({ length: 50 }).notNull(),
    origemId: varchar({ length: 100 }).notNull(),
    
    // Dados normalizados
    codigoProcedimento: varchar({ length: 50 }).notNull(),
    descricao: varchar({ length: 255 }),
    tipo: varchar({ length: 50 }),
    
    // Metadados
    sincronizadoEm: timestamp().defaultNow(),
    atualizadoEm: timestamp().defaultNow(),
    dadosOriginais: json(),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_proc_unif_estab").on(table.estabelecimentoId),
    origemIdx: index("idx_proc_unif_origem").on(table.origemSistema, table.origemId),
  })
);

// Pacientes Unificados
export const pacientesUnificados = pgTable(
  "pacientes_unificados",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    // Rastreamento de origem
    origemSistema: varchar({ length: 50 }).notNull(),
    origemId: varchar({ length: 100 }).notNull(),
    
    // Dados normalizados
    nome: varchar({ length: 255 }).notNull(),
    cpf: varchar({ length: 20 }),
    dataNascimento: timestamp(),
    
    // Metadados
    sincronizadoEm: timestamp().defaultNow(),
    atualizadoEm: timestamp().defaultNow(),
    dadosOriginais: json(),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_pac_unif_estab").on(table.estabelecimentoId),
    origemIdx: index("idx_pac_unif_origem").on(table.origemSistema, table.origemId),
    cpfIdx: index("idx_pac_unif_cpf").on(table.cpf),
  })
);

/**
 * CAMADA 4: AUDITORIA E HISTÓRICO
 */

// Log de Sincronização
export const sincronizacaoLog = pgTable(
  "sincronizacao_log",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    estabelecimentoId: integer().notNull(),
    
    sistema: varchar({ length: 50 }).notNull(),
    tipoDados: varchar({ length: 50 }).notNull(),
    
    status: varchar({ length: 50 }).notNull(), // sucesso, erro, parcial
    registrosSincronizados: integer().default(0),
    registrosErro: integer().default(0),
    
    mensagemErro: text(),
    detalhesErro: json(),
    
    inicioSincronizacao: timestamp().defaultNow(),
    fimSincronizacao: timestamp(),
    duracao: integer(), // em segundos
    
    criadoEm: timestamp().defaultNow(),
  },
  (table) => ({
    estabelecimentoIdx: index("idx_sync_log_estab").on(table.estabelecimentoId),
    sistemaIdx: index("idx_sync_log_sistema").on(table.sistema),
    statusIdx: index("idx_sync_log_status").on(table.status),
  })
);

// Histórico de Atendimentos
export const atendimentosHistorico = pgTable(
  "atendimentos_historico",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    atendimentoId: integer().notNull(),
    
    campoAlterado: varchar({ length: 100 }).notNull(),
    valorAnterior: text(),
    valorNovo: text(),
    
    alteradoEm: timestamp().defaultNow(),
    alteradoPor: varchar({ length: 255 }),
  },
  (table) => ({
    atendimentoIdx: index("idx_hist_atend_id").on(table.atendimentoId),
  })
);
