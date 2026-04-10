import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json, date, index } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "tasy_user"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }), // Senha criptografada com bcrypt
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Estabelecimentos (Hospitals/Clinics)
 */
export const estabelecimentos = mysqlTable("estabelecimentos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  endereco: text("endereco"),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Estabelecimento = typeof estabelecimentos.$inferSelect;
export type InsertEstabelecimento = typeof estabelecimentos.$inferInsert;

/**
 * ConvÃªnios (Insurance/Health Plans)
 */
export const convenios = mysqlTable("convenios", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 50 }),
  estabelecimentoId: int("estabelecimentoId"), // Null = convÃªnio disponÃ­vel para todos os estabelecimentos
  prazoRecursoGlosa: int("prazoRecursoGlosa").default(30), // Prazo em dias para recurso de glosa
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Convenio = typeof convenios.$inferSelect;
export type InsertConvenio = typeof convenios.$inferInsert;

/**
 * RelaÃ§Ã£o ConvÃªnio-Estabelecimento-Prestador
 * Permite associar cÃ³digos de prestador especÃ­ficos para cada combinaÃ§Ã£o de convÃªnio e estabelecimento
 */
export const convenioEstabelecimentoPrestador = mysqlTable("convenioEstabelecimentoPrestador", {
  id: int("id").autoincrement().primaryKey(),
  convenioId: int("convenioId").notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  codigoPrestador: varchar("codigoPrestador", { length: 50 }).notNull(), // CÃ³digo do prestador na operadora (CNPJ ou cÃ³digo interno)
  nomePrestador: varchar("nomePrestador", { length: 255 }), // Nome amigÃ¡vel do prestador (opcional)
  tipoPrestador: mysqlEnum("tipoPrestador", ["proprio", "terceiro"]).default("proprio").notNull(), // Tipo: prÃ³prio (hospital) ou terceiro (mÃ©dico/profissional externo)
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConvenioEstabelecimentoPrestador = typeof convenioEstabelecimentoPrestador.$inferSelect;
export type InsertConvenioEstabelecimentoPrestador = typeof convenioEstabelecimentoPrestador.$inferInsert;

/**
 * Arquivos enviados e recebidos
 */
export const arquivos = mysqlTable("arquivos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipoArquivo: mysqlEnum("tipoArquivo", ["xml", "excel", "pdf", "csv"]).notNull(),
  direcao: mysqlEnum("direcao", ["enviado", "retornado"]).notNull(),
  convenioId: int("convenioId").notNull(),
  estabelecimentoId: int("estabelecimentoId"),
  userId: int("userId").notNull(),
  s3Key: varchar("s3Key", { length: 512 }).notNull(),
  s3Url: text("s3Url").notNull(),
  tamanho: int("tamanho"),
  status: mysqlEnum("status", ["pendente", "processado", "erro", "processando"]).default("pendente").notNull(),
  progresso: int("progresso").default(0), // Percentual de progresso (0-100)
  totalItens: int("totalItens"), // Total de itens a processar
  itensProcessados: int("itensProcessados").default(0), // Itens jÃ¡ processados
  dataReferencia: timestamp("dataReferencia"),
  dataPagamento: timestamp("dataPagamento"), // Data de pagamento do convÃªnio (opcional, para calcular prazo de recurso)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Arquivo = typeof arquivos.$inferSelect;
export type InsertArquivo = typeof arquivos.$inferInsert;

// Tabela procedimentos REMOVIDA - dados agora sÃ£o armazenados em faturamentoTiss (envios) e demonstrativo (retornos)

/**
 * ComparaÃ§Ãµes entre arquivos enviados e retornados
 */
export const comparacoes = mysqlTable("comparacoes", {
  id: int("id").autoincrement().primaryKey(),
  arquivoEnviadoId: int("arquivoEnviadoId").notNull(),
  arquivoRetornadoId: int("arquivoRetornadoId").notNull(),
  convenioId: int("convenioId").notNull(),
  estabelecimentoId: int("estabelecimentoId"),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["pendente", "concluida", "erro"]).default("pendente").notNull(),
  totalItensEnviados: int("totalItensEnviados").default(0),
  totalItensRetornados: int("totalItensRetornados").default(0),
  totalDivergencias: int("totalDivergencias").default(0),
  valorTotalEnviado: decimal("valorTotalEnviado", { precision: 12, scale: 2 }),
  valorTotalRetornado: decimal("valorTotalRetornado", { precision: 12, scale: 2 }),
  diferencaValor: decimal("diferencaValor", { precision: 12, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Comparacao = typeof comparacoes.$inferSelect;
export type InsertComparacao = typeof comparacoes.$inferInsert;

/**
 * DivergÃªncias encontradas nas comparaÃ§Ãµes
 */
export const divergencias = mysqlTable("divergencias", {
  id: int("id").autoincrement().primaryKey(),
  comparacaoId: int("comparacaoId").notNull(),
  tipo: mysqlEnum("tipo", ["valor", "quantidade", "ausente_retorno", "ausente_envio", "dados"]).notNull(),
  procedimentoEnviadoId: int("procedimentoEnviadoId"),
  procedimentoRetornadoId: int("procedimentoRetornadoId"),
  campo: varchar("campo", { length: 100 }),
  valorEnviado: text("valorEnviado"),
  valorRetornado: text("valorRetornado"),
  diferenca: decimal("diferenca", { precision: 10, scale: 2 }),
  descricao: text("descricao"),
  motivoGlosa: varchar("motivoGlosa", { length: 255 }),
  categoriaGlosa: mysqlEnum("categoriaGlosa", [
    "valor_divergente",
    "procedimento_nao_autorizado",
    "documentacao_incompleta",
    "prazo_excedido",
    "duplicidade",
    "codigo_invalido",
    "quantidade_excedente",
    "paciente_nao_elegivel",
    "outros"
  ]),
  resolvido: mysqlEnum("resolvido", ["sim", "nao"]).default("nao").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Divergencia = typeof divergencias.$inferSelect;
export type InsertDivergencia = typeof divergencias.$inferInsert;

/**
 * CÃ³digos de procedimentos configurÃ¡veis (tabela de referÃªncia)
 */
export const codigosProcedimentos = mysqlTable("codigosProcedimentos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  descricao: text("descricao").notNull(),
  valorReferencia: decimal("valorReferencia", { precision: 10, scale: 2 }),
  categoria: varchar("categoria", { length: 100 }),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CodigoProcedimento = typeof codigosProcedimentos.$inferSelect;
export type InsertCodigoProcedimento = typeof codigosProcedimentos.$inferInsert;

/**
 * Campos de comparaÃ§Ã£o configurÃ¡veis
 */
export const camposComparacao = mysqlTable("camposComparacao", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  campoOrigem: varchar("campoOrigem", { length: 100 }).notNull(),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  obrigatorio: mysqlEnum("obrigatorio", ["sim", "nao"]).default("nao").notNull(),
  tolerancia: decimal("tolerancia", { precision: 5, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampoComparacao = typeof camposComparacao.$inferSelect;
export type InsertCampoComparacao = typeof camposComparacao.$inferInsert;

/**
 * Itens manuais adicionados pelo usuÃ¡rio
 */
export const itensManuals = mysqlTable("itensManuals", {
  id: int("id").autoincrement().primaryKey(),
  arquivoId: int("arquivoId"),
  comparacaoId: int("comparacaoId"),
  userId: int("userId").notNull(),
  codigo: varchar("codigo", { length: 50 }).notNull(),
  descricao: text("descricao"),
  quantidade: int("quantidade").default(1),
  valorUnitario: decimal("valorUnitario", { precision: 10, scale: 2 }),
  valorTotal: decimal("valorTotal", { precision: 10, scale: 2 }),
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemManual = typeof itensManuals.$inferSelect;
export type InsertItemManual = typeof itensManuals.$inferInsert;

/**
 * Recursos de Glosa - ContestaÃ§Ãµes enviadas aos convÃªnios
 */
/**
 * Lotes de Recursos de Glosa - Agrupamento de recursos enviados juntos
 */
export const lotesRecurso = mysqlTable("lotesRecurso", {
  id: int("id").autoincrement().primaryKey(),
  convenioId: int("convenioId").notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  userId: int("userId").notNull(),
  
  // IdentificaÃ§Ã£o do lote
  numeroLote: varchar("numeroLote", { length: 50 }).notNull(),
  descricao: text("descricao"),
  
  // Valores totalizados
  valorTotalGlosado: decimal("valorTotalGlosado", { precision: 12, scale: 2 }).default("0"),
  valorTotalRecursado: decimal("valorTotalRecursado", { precision: 12, scale: 2 }).default("0"),
  valorTotalRecuperado: decimal("valorTotalRecuperado", { precision: 12, scale: 2 }).default("0"),
  valorTotalRecebido: decimal("valorTotalRecebido", { precision: 12, scale: 2 }).default("0"),
  quantidadeItens: int("quantidadeItens").default(0),
  
  // Status e datas
  status: mysqlEnum("status", [
    "rascunho",
    "pendente_envio",
    "enviado",
    "em_analise",
    "respondido",
    "finalizado"
  ]).default("rascunho").notNull(),
  
  dataEnvio: timestamp("dataEnvio"),
  dataPrazoPagamento: timestamp("dataPrazoPagamento"),
  dataPrazoResposta: timestamp("dataPrazoResposta"), // Prazo para resposta do convÃªnio
  dataResposta: timestamp("dataResposta"),
  
  // Protocolo e anexos
  protocoloEnvio: varchar("protocoloEnvio", { length: 100 }),
  anexoPdfUrl: text("anexoPdfUrl"), // URL do PDF de envio do recurso
  anexoPdfKey: varchar("anexoPdfKey", { length: 512 }),
  
  // XML gerado
  xmlUrl: text("xmlUrl"), // URL do XML TISS gerado no S3
  xmlKey: varchar("xmlKey", { length: 512 }), // Chave do XML no S3
  xmlGeradoEm: timestamp("xmlGeradoEm"), // Data/hora da geraÃ§Ã£o do XML
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LoteRecurso = typeof lotesRecurso.$inferSelect;
export type InsertLoteRecurso = typeof lotesRecurso.$inferInsert;

export const recursosGlosa = mysqlTable("recursosGlosa", {
  id: int("id").autoincrement().primaryKey(),
  divergenciaId: int("divergenciaId"),
  convenioId: int("convenioId").notNull(),
  estabelecimentoId: int("estabelecimentoId"),
  loteId: int("loteId"), // ReferÃªncia ao lote de envio
  userId: int("userId").notNull(),
  
  // Dados do procedimento contestado
  codigoProcedimento: varchar("codigoProcedimento", { length: 50 }),
  descricaoProcedimento: text("descricaoProcedimento"),
  guiaNumero: varchar("guiaNumero", { length: 100 }),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  pacienteCarteirinha: varchar("pacienteCarteirinha", { length: 100 }),
  
  // Valores
  valorCobrado: decimal("valorCobrado", { precision: 10, scale: 2 }),
  valorGlosado: decimal("valorGlosado", { precision: 10, scale: 2 }),
  valorRecuperado: decimal("valorRecuperado", { precision: 10, scale: 2 }),
  
  // Justificativa e recurso
  motivoGlosaConvenio: text("motivoGlosaConvenio"),
  justificativaRecurso: text("justificativaRecurso").notNull(),
  documentosAnexos: json("documentosAnexos"),
  
  // Status e datas
  status: mysqlEnum("status", [
    "rascunho",
    "pendente_envio",
    "enviado",
    "em_analise",
    "deferido",
    "deferido_parcial",
    "indeferido",
    "cancelado"
  ]).default("rascunho").notNull(),
  
  prioridade: mysqlEnum("prioridade", ["baixa", "media", "alta", "urgente"]).default("media").notNull(),
  
  dataGlosa: timestamp("dataGlosa"),
  dataEnvioRecurso: timestamp("dataEnvioRecurso"),
  dataPrazoResposta: timestamp("dataPrazoResposta"),
  dataResposta: timestamp("dataResposta"),
  
  protocoloRecurso: varchar("protocoloRecurso", { length: 100 }),
  respostaConvenio: text("respostaConvenio"),
  
  // Campos de pagamento do recurso
  valorRecebido: decimal("valorRecebido", { precision: 10, scale: 2 }),
  dataPagamento: timestamp("dataPagamento"),
  observacoesPagamento: text("observacoesPagamento"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecursoGlosa = typeof recursosGlosa.$inferSelect;
export type InsertRecursoGlosa = typeof recursosGlosa.$inferInsert;

/**
 * HistÃ³rico de interaÃ§Ãµes dos recursos de glosa
 */
export const historicoRecursos = mysqlTable("historicoRecursos", {
  id: int("id").autoincrement().primaryKey(),
  recursoId: int("recursoId").notNull(),
  userId: int("userId").notNull(),
  
  tipo: mysqlEnum("tipo", [
    "criacao",
    "edicao",
    "envio",
    "resposta_convenio",
    "anexo_adicionado",
    "status_alterado",
    "comentario",
    "lembrete"
  ]).notNull(),
  
  statusAnterior: varchar("statusAnterior", { length: 50 }),
  statusNovo: varchar("statusNovo", { length: 50 }),
  
  descricao: text("descricao").notNull(),
  dadosExtras: json("dadosExtras"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoRecurso = typeof historicoRecursos.$inferSelect;
export type InsertHistoricoRecurso = typeof historicoRecursos.$inferInsert;

/**
 * HistÃ³rico de ContestaÃ§Ãµes de Glosa - Registra argumentos usados e resultados
 * para aprendizado de IA e sugestÃµes automÃ¡ticas
 */
export const historicoContestacoes = mysqlTable("historicoContestacoes", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncias
  recursoId: int("recursoId"),
  convenioId: int("convenioId").notNull(),
  userId: int("userId").notNull(),
  
  // CÃ³digo de glosa TISS
  codigoGlosa: varchar("codigoGlosa", { length: 20 }).notNull(),
  descricaoGlosa: text("descricaoGlosa"),
  
  // Dados do procedimento
  codigoProcedimento: varchar("codigoProcedimento", { length: 50 }),
  descricaoProcedimento: text("descricaoProcedimento"),
  
  // Valores envolvidos
  valorGlosado: decimal("valorGlosado", { precision: 10, scale: 2 }),
  valorRecuperado: decimal("valorRecuperado", { precision: 10, scale: 2 }),
  
  // Argumento utilizado
  argumentoUtilizado: text("argumentoUtilizado").notNull(),
  argumentoOrigem: mysqlEnum("argumentoOrigem", [
    "dicionario",      // Veio do dicionÃ¡rio padrÃ£o
    "ia_sugestao",     // Sugerido pela IA
    "manual",          // Digitado manualmente
    "historico"        // Copiado de outro recurso
  ]).default("manual").notNull(),
  
  // Documentos anexados
  documentosAnexados: json("documentosAnexados"),
  
  // Resultado da contestaÃ§Ã£o
  resultado: mysqlEnum("resultado", [
    "pendente",
    "deferido",
    "deferido_parcial",
    "indeferido"
  ]).default("pendente").notNull(),
  
  // Feedback para aprendizado
  argumentoEfetivo: mysqlEnum("argumentoEfetivo", ["sim", "nao", "parcial"]),
  feedbackUsuario: text("feedbackUsuario"),
  
  // MÃ©tricas para IA
  taxaSucessoCalculada: decimal("taxaSucessoCalculada", { precision: 5, scale: 2 }),
  
  dataContestacao: timestamp("dataContestacao").defaultNow().notNull(),
  dataResultado: timestamp("dataResultado"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HistoricoContestacao = typeof historicoContestacoes.$inferSelect;
export type InsertHistoricoContestacao = typeof historicoContestacoes.$inferInsert;

/**
 * Argumentos personalizados por convÃªnio - Argumentos que funcionaram melhor para cada convÃªnio
 */
export const argumentosConvenio = mysqlTable("argumentosConvenio", {
  id: int("id").autoincrement().primaryKey(),
  
  convenioId: int("convenioId").notNull(),
  codigoGlosa: varchar("codigoGlosa", { length: 20 }).notNull(),
  
  // Argumento customizado para este convÃªnio
  argumentoCustomizado: text("argumentoCustomizado").notNull(),
  
  // EstatÃ­sticas
  vezesUtilizado: int("vezesUtilizado").default(0),
  vezesDeferido: int("vezesDeferido").default(0),
  vezesIndeferido: int("vezesIndeferido").default(0),
  taxaSucesso: decimal("taxaSucesso", { precision: 5, scale: 2 }),
  
  // Ativo
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ArgumentoConvenio = typeof argumentosConvenio.$inferSelect;
export type InsertArgumentoConvenio = typeof argumentosConvenio.$inferInsert;

/**
 * Regras de ConciliaÃ§Ã£o por ConvÃªnio - ConfiguraÃ§Ãµes especÃ­ficas para cada convÃªnio
 */
export const regrasConciliacao = mysqlTable("regrasConciliacao", {
  id: int("id").autoincrement().primaryKey(),
  
  convenioId: int("convenioId").notNull().unique(),
  
  // Comportamento para itens nÃ£o encontrados no retorno
  itensNaoEncontrados: mysqlEnum("itensNaoEncontrados", [
    "glosado",      // Considerar como glosado (padrÃ£o)
    "pago",         // Considerar como pago (ex: Bradesco)
    "divergente"    // Marcar como divergente para anÃ¡lise manual
  ]).default("glosado").notNull(),
  
  // TolerÃ¢ncia de diferenÃ§a de valores (em reais)
  toleranciaValor: decimal("toleranciaValor", { precision: 10, scale: 2 }).default("0.00"),
  
  // TolerÃ¢ncia percentual de diferenÃ§a
  toleranciaPercentual: decimal("toleranciaPercentual", { precision: 5, scale: 2 }).default("0.00"),
  
  // Campos para comparaÃ§Ã£o (quais campos usar para match)
  usarCodigo: mysqlEnum("usarCodigo", ["sim", "nao"]).default("sim").notNull(),
  usarGuia: mysqlEnum("usarGuia", ["sim", "nao"]).default("sim").notNull(),
  usarData: mysqlEnum("usarData", ["sim", "nao"]).default("nao").notNull(),
  usarPaciente: mysqlEnum("usarPaciente", ["sim", "nao"]).default("nao").notNull(),
  
  // Formato do arquivo de retorno esperado
  formatoRetorno: mysqlEnum("formatoRetorno", [
    "excel_completo",    // Excel com todos os itens (pagos e glosados)
    "excel_glosas",      // Excel sÃ³ com glosas (ex: Bradesco)
    "xml_tiss",          // XML padrÃ£o TISS
    "csv",               // CSV
    "pdf"                // PDF
  ]).default("excel_completo").notNull(),
  
  // Prazo padrÃ£o para recurso (em dias)
  prazoRecursoDias: int("prazoRecursoDias").default(30),
  
  // ObservaÃ§Ãµes
  observacoes: text("observacoes"),
  
  // Ativo
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegraConciliacao = typeof regrasConciliacao.$inferSelect;
export type InsertRegraConciliacao = typeof regrasConciliacao.$inferInsert;

/**
 * DecisÃµes de Glosa - HistÃ³rico de decisÃµes (aceitar/recursar) para aprendizado automÃ¡tico
 */
export const decisoesGlosa = mysqlTable("decisoesGlosa", {
  id: int("id").autoincrement().primaryKey(),
  
  // Identificadores da glosa
  convenioId: int("convenioId").notNull(),
  codigoGlosa: varchar("codigoGlosa", { length: 20 }).notNull(),
  codigoProcedimento: varchar("codigoProcedimento", { length: 50 }),
  tipoProcedimento: varchar("tipoProcedimento", { length: 50 }), // mat_med, exames, procedimentos, outros
  
  // DecisÃ£o tomada
  decisao: mysqlEnum("decisao", ["aceitar", "recursar"]).notNull(),
  
  // Resultado (se foi recursado)
  resultadoRecurso: mysqlEnum("resultadoRecurso", [
    "pendente",
    "deferido",
    "deferido_parcial",
    "indeferido"
  ]),
  
  // Valores
  valorGlosado: decimal("valorGlosado", { precision: 10, scale: 2 }),
  valorRecuperado: decimal("valorRecuperado", { precision: 10, scale: 2 }),
  
  // Motivo da decisÃ£o (para aprendizado)
  motivoDecisao: text("motivoDecisao"),
  
  // ReferÃªncia ao procedimento original
  procedimentoId: int("procedimentoId"),
  recursoId: int("recursoId"),
  
  // UsuÃ¡rio que tomou a decisÃ£o
  userId: int("userId").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DecisaoGlosa = typeof decisoesGlosa.$inferSelect;
export type InsertDecisaoGlosa = typeof decisoesGlosa.$inferInsert;


/**
 * Tabelas de PreÃ§os por ConvÃªnio - DiÃ¡rias, Mat-Med, Taxas, Procedimentos
 */
export const tabelasPreco = mysqlTable("tabelasPreco", {
  id: int("id").autoincrement().primaryKey(),
  
  convenioId: int("convenioId").notNull(),
  estabelecimentoId: int("estabelecimentoId"), // Null = tabela disponÃ­vel para todos os estabelecimentos
  
  // Tipo da tabela
  tipo: mysqlEnum("tipo", [
    "diarias",       // DiÃ¡rias de apartamento, UTI, etc.
    "mat_med",       // Materiais e medicamentos
    "taxas",         // Taxas diversas
    "procedimentos"  // Procedimentos mÃ©dicos
  ]).notNull(),
  
  // Dados do item
  codigo: varchar("codigo", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  valor: decimal("valor", { precision: 12, scale: 2 }).notNull(),
  
  // VigÃªncia
  vigenciaInicio: timestamp("vigenciaInicio").notNull(),
  // Campo vigenciaFim removido conforme solicitaÃ§Ã£o do usuÃ¡rio
  
  // Dados adicionais
  unidade: varchar("unidade", { length: 50 }), // UN, ML, MG, etc.
  observacao: text("observacao"),
  
  // Controle
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TabelaPreco = typeof tabelasPreco.$inferSelect;
export type InsertTabelaPreco = typeof tabelasPreco.$inferInsert;

/**
 * ImportaÃ§Ãµes de Tabelas de PreÃ§os - HistÃ³rico de importaÃ§Ãµes
 */
export const importacoesTabela = mysqlTable("importacoesTabela", {
  id: int("id").autoincrement().primaryKey(),
  
  convenioId: int("convenioId").notNull(),
  userId: int("userId").notNull(),
  
  // Tipo da tabela importada
  tipo: mysqlEnum("tipo", [
    "diarias",
    "mat_med",
    "taxas",
    "procedimentos"
  ]).notNull(),
  
  // Arquivo importado
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  formatoArquivo: mysqlEnum("formatoArquivo", ["excel", "csv", "dbf"]).notNull(),
  
  // Resultado da importaÃ§Ã£o
  totalItens: int("totalItens").default(0),
  itensImportados: int("itensImportados").default(0),
  itensAtualizados: int("itensAtualizados").default(0),
  itensErro: int("itensErro").default(0),
  
  // Status
  status: mysqlEnum("status", ["processando", "concluido", "erro"]).default("processando").notNull(),
  mensagemErro: text("mensagemErro"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportacaoTabela = typeof importacoesTabela.$inferSelect;
export type InsertImportacaoTabela = typeof importacoesTabela.$inferInsert;

/**
 * HistÃ³rico de AlteraÃ§Ãµes de PreÃ§os - Rastreia todas as modificaÃ§Ãµes em itens de tabelas de preÃ§o
 */
export const historicoPrecos = mysqlTable("historicoPrecos", {
  id: int("id").autoincrement().primaryKey(),
  
  tabelaPrecoId: int("tabelaPrecoId").notNull(),
  userId: int("userId").notNull(),
  
  // Tipo de alteraÃ§Ã£o
  tipoAlteracao: mysqlEnum("tipoAlteracao", [
    "criacao",      // Item criado
    "edicao",       // Item editado
    "exclusao",     // Item excluÃ­do
    "importacao"    // Item importado via planilha
  ]).notNull(),
  
  // Valores anteriores (para ediÃ§Ã£o/exclusÃ£o)
  valorAnterior: decimal("valorAnterior", { precision: 12, scale: 2 }),
  vigenciaInicioAnterior: timestamp("vigenciaInicioAnterior"),
  nomeAnterior: varchar("nomeAnterior", { length: 255 }),
  codigoAnterior: varchar("codigoAnterior", { length: 50 }),
  
  // Valores novos (para criaÃ§Ã£o/ediÃ§Ã£o)
  valorNovo: decimal("valorNovo", { precision: 12, scale: 2 }),
  vigenciaInicioNovo: timestamp("vigenciaInicioNovo"),
  nomeNovo: varchar("nomeNovo", { length: 255 }),
  codigoNovo: varchar("codigoNovo", { length: 50 }),
  
  // ObservaÃ§Ã£o/motivo da alteraÃ§Ã£o
  observacao: text("observacao"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoPreco = typeof historicoPrecos.$inferSelect;
export type InsertHistoricoPreco = typeof historicoPrecos.$inferInsert;

/**
 * Regras de NegÃ³cio - ComposiÃ§Ã£o de contas
 * Ex: Procedimento X deve ter Taxa de Sala Y, OxigÃªnio Z, Taxa de VÃ­deo W
 */
export const regrasNegocio = mysqlTable("regrasNegocio", {
  id: int("id").autoincrement().primaryKey(),
  
  convenioId: int("convenioId"), // Null = regra geral para todos os convÃªnios
  estabelecimentoId: int("estabelecimentoId"), // Null = regra geral para todos os estabelecimentos
  
  // Nome da regra para identificaÃ§Ã£o
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  
  // Procedimento principal que dispara a regra
  codigoProcedimentoPrincipal: varchar("codigoProcedimentoPrincipal", { length: 50 }).notNull(),
  descricaoProcedimentoPrincipal: varchar("descricaoProcedimentoPrincipal", { length: 255 }),
  
  // Tipo de verificaÃ§Ã£o
  tipoVerificacao: mysqlEnum("tipoVerificacao", [
    "deve_conter",       // A conta DEVE conter os itens obrigatÃ³rios
    "nao_deve_conter",   // A conta NÃƒO deve conter os itens
    "pode_conter",       // A conta PODE conter (opcional, mas validar valor)
    "quantidade_minima", // Deve ter quantidade mÃ­nima do item
    "quantidade_maxima"  // NÃ£o pode exceder quantidade mÃ¡xima
  ]).default("deve_conter").notNull(),
  
  // AÃ§Ã£o quando a regra nÃ£o for atendida
  acaoInconsistencia: mysqlEnum("acaoInconsistencia", [
    "alerta",            // Apenas alertar
    "bloquear",          // Bloquear envio atÃ© correÃ§Ã£o
    "sugerir_adicao",    // Sugerir adiÃ§Ã£o do item faltante
    "sugerir_remocao"    // Sugerir remoÃ§Ã£o do item
  ]).default("alerta").notNull(),
  
  // Prioridade (1 = mais alta)
  prioridade: int("prioridade").default(5),
  
  // Campos para PadrÃµes de Procedimentos (FASE 1.5A)
  tipoRegra: mysqlEnum("tipoRegra", ["validacao_geral", "padrao_procedimento"]).default("validacao_geral"),
  codigoProcedimento: varchar("codigoProcedimento", { length: 50 }),
  nomeProcedimento: varchar("nomeProcedimento", { length: 255 }),
  tolerancia_percentual: varchar("tolerancia_percentual", { length: 10 }),
  tolerancia_absoluta: decimal("tolerancia_absoluta", { precision: 12, scale: 2 }),
  diaria_obrigatoria: int("diaria_obrigatoria").default(0),
  diaria_esperada_por_dia: int("diaria_esperada_por_dia"),
  score_minimo_aceitavel: int("score_minimo_aceitavel").default(70),
  
  // Controle
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegraNegocio = typeof regrasNegocio.$inferSelect;
export type InsertRegraNegocio = typeof regrasNegocio.$inferInsert;

/**
 * Itens das Regras de NegÃ³cio - Itens obrigatÃ³rios/proibidos para cada regra
 */
export const itensRegraNegocio = mysqlTable("itensRegraNegocio", {
  id: int("id").autoincrement().primaryKey(),
  
  regraId: int("regraId").notNull(),
  
  // Item obrigatÃ³rio/proibido
  codigoItem: varchar("codigoItem", { length: 50 }).notNull(),
  descricaoItem: varchar("descricaoItem", { length: 255 }),
  
  // Tipo do item
  tipoItem: mysqlEnum("tipoItem", [
    "procedimento",
    "taxa",
    "material",
    "medicamento",
    "diaria",
    "outros"
  ]).notNull(),
  
  // Quantidade esperada (para regras de quantidade)
  quantidadeMinima: int("quantidadeMinima").default(1),
  quantidadeMaxima: int("quantidadeMaxima"),
  
  // Valor esperado (para validaÃ§Ã£o de preÃ§o)
  valorEsperado: decimal("valorEsperado", { precision: 12, scale: 2 }),
  toleranciaValor: decimal("toleranciaValor", { precision: 10, scale: 2 }).default("0.00"),
  
  // Obrigatoriedade
  obrigatorio: mysqlEnum("obrigatorio", ["sim", "nao"]).default("sim").notNull(),
  
  // Campos para PadrÃµes de Procedimentos (FASE 1.5A)
  tabelaPrecoCodigo: varchar("tabelaPrecoCodigo", { length: 50 }),
  tolerancia_percentual: varchar("tolerancia_percentual", { length: 10 }),
  tolerancia_absoluta: decimal("tolerancia_absoluta", { precision: 12, scale: 2 }),
  ordem: int("ordem").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ItemRegraNegocio = typeof itensRegraNegocio.$inferSelect;
export type InsertItemRegraNegocio = typeof itensRegraNegocio.$inferInsert;

/**
 * Alertas de DivergÃªncia - DivergÃªncias encontradas nas contas
 */
export const alertasDivergencia = mysqlTable("alertasDivergencia", {
  id: int("id").autoincrement().primaryKey(),
  
  arquivoId: int("arquivoId").notNull(),
  procedimentoId: int("procedimentoId"), // Procedimento que gerou o alerta
  regraId: int("regraId"), // Regra de negÃ³cio violada (se aplicÃ¡vel)
  
  // Tipo de alerta
  tipoAlerta: mysqlEnum("tipoAlerta", [
    "valor_divergente",      // Valor cobrado diferente da tabela
    "item_faltante",         // Item obrigatÃ³rio nÃ£o encontrado
    "item_nao_permitido",    // Item que nÃ£o deveria estar na conta
    "quantidade_incorreta",  // Quantidade fora do esperado
    "codigo_invalido",       // CÃ³digo nÃ£o encontrado na tabela
    "regra_negocio",         // ViolaÃ§Ã£o de regra de negÃ³cio
    "sugestao_ia"            // SugestÃ£o da IA
  ]).notNull(),
  
  // Severidade
  severidade: mysqlEnum("severidade", [
    "baixa",
    "media",
    "alta",
    "critica"
  ]).default("media").notNull(),
  
  // Detalhes do alerta
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  
  // Valores para divergÃªncia de preÃ§o
  valorCobrado: decimal("valorCobrado", { precision: 12, scale: 2 }),
  valorEsperado: decimal("valorEsperado", { precision: 12, scale: 2 }),
  diferenca: decimal("diferenca", { precision: 12, scale: 2 }),
  
  // CÃ³digo e descriÃ§Ã£o do item relacionado
  codigoItem: varchar("codigoItem", { length: 50 }),
  descricaoItem: varchar("descricaoItem", { length: 255 }),
  
  // Guia relacionada
  guiaNumero: varchar("guiaNumero", { length: 100 }),
  
  // SugestÃ£o de correÃ§Ã£o
  sugestaoCorrecao: text("sugestaoCorrecao"),
  
  // Status do alerta
  status: mysqlEnum("status", [
    "pendente",      // Aguardando anÃ¡lise
    "analisando",    // Em anÃ¡lise
    "corrigido",     // Corrigido pelo usuÃ¡rio
    "ignorado",      // Ignorado (nÃ£o Ã© problema)
    "aceito"         // Aceito como estÃ¡
  ]).default("pendente").notNull(),
  
  // ResoluÃ§Ã£o
  resolvidoPor: int("resolvidoPor"),
  dataResolucao: timestamp("dataResolucao"),
  observacaoResolucao: text("observacaoResolucao"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlertaDivergencia = typeof alertasDivergencia.$inferSelect;
export type InsertAlertaDivergencia = typeof alertasDivergencia.$inferInsert;

/**
 * PadrÃµes de Conta - Aprendizado de padrÃµes para sugestÃµes da IA
 */
export const padroesContas = mysqlTable("padroesContas", {
  id: int("id").autoincrement().primaryKey(),
  
  convenioId: int("convenioId"),
  estabelecimentoId: int("estabelecimentoId"),
  
  // Procedimento principal
  codigoProcedimentoPrincipal: varchar("codigoProcedimentoPrincipal", { length: 50 }).notNull(),
  descricaoProcedimentoPrincipal: varchar("descricaoProcedimentoPrincipal", { length: 255 }),
  
  // Itens frequentemente associados (JSON array)
  itensAssociados: json("itensAssociados"), // [{codigo, descricao, frequencia, valorMedio}]
  
  // EstatÃ­sticas
  totalOcorrencias: int("totalOcorrencias").default(0),
  valorMedioConta: decimal("valorMedioConta", { precision: 12, scale: 2 }),
  
  // Ãšltima atualizaÃ§Ã£o do padrÃ£o
  ultimaAtualizacao: timestamp("ultimaAtualizacao").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PadraoConta = typeof padroesContas.$inferSelect;
export type InsertPadraoConta = typeof padroesContas.$inferInsert;


/**
 * HistÃ³rico de ValidaÃ§Ãµes de XML
 * Armazena os resultados das validaÃ§Ãµes executadas sob demanda
 */
export const historicoValidacoes = mysqlTable("historicoValidacoes", {
  id: int("id").autoincrement().primaryKey(),
  
  // Arquivo validado
  arquivoId: int("arquivoId").notNull(),
  convenioId: int("convenioId").notNull(),
  estabelecimentoId: int("estabelecimentoId"),
  
  // UsuÃ¡rio que executou a validaÃ§Ã£o
  userId: int("userId").notNull(),
  
  // Resumo da validaÃ§Ã£o
  totalItens: int("totalItens").default(0),
  divergenciasPreco: int("divergenciasPreco").default(0),
  violacoesRegras: int("violacoesRegras").default(0),
  sugestoesIA: int("sugestoesIA").default(0),
  valorDiferenca: decimal("valorDiferenca", { precision: 12, scale: 2 }),
  
  // Status
  status: mysqlEnum("status", ["concluida", "erro"]).default("concluida").notNull(),
  
  // Detalhes em JSON (alertas, sugestÃµes, etc.)
  detalhes: json("detalhes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoValidacao = typeof historicoValidacoes.$inferSelect;
export type InsertHistoricoValidacao = typeof historicoValidacoes.$inferInsert;


/**
 * PermissÃµes de usuÃ¡rio por estabelecimento
 * Define quais estabelecimentos cada usuÃ¡rio pode acessar
 */
export const permissoesEstabelecimento = mysqlTable("permissoesEstabelecimento", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Grupo de serviÃ§o do usuÃ¡rio neste estabelecimento
  grupoServico: mysqlEnum("grupoServico", [
    "administrador",  // Acesso total a todas as funcionalidades
    "faturista",      // Acesso a: Dashboard, Arquivos, ComparaÃ§Ãµes, Faturamento, Tabelas de PreÃ§o
    "recurso_glosa",  // Acesso a: AnÃ¡lise de Glosa, DicionÃ¡rio de Glosas, Recursos de Glosa
    "gestor",         // Acesso a: Dashboard Consolidado, RelatÃ³rios, Produtividade
    "visualizador",   // Acesso apenas para visualizaÃ§Ã£o (somente leitura)
    "usuario_tasy"    // Acesso a: ImportaÃ§Ã£o Tasy, Contas Faturadas, RelatÃ³rios Tasy, RelatÃ³rios BI, ConciliaÃ§Ã£o
  ]).default("visualizador").notNull(),
  
  // PermissÃµes especÃ­ficas (mantÃ©m para compatibilidade e controle granular)
  podeVisualizar: mysqlEnum("podeVisualizar", ["sim", "nao"]).default("sim").notNull(),
  podeEditar: mysqlEnum("podeEditar", ["sim", "nao"]).default("nao").notNull(),
  podeExcluir: mysqlEnum("podeExcluir", ["sim", "nao"]).default("nao").notNull(),
  podeGerenciar: mysqlEnum("podeGerenciar", ["sim", "nao"]).default("nao").notNull(), // Gerenciar usuÃ¡rios e permissÃµes
  
  // PermissÃµes por mÃ³dulo (controle granular por funcionalidade)
  acessoDashboard: mysqlEnum("acessoDashboard", ["sim", "nao"]).default("sim").notNull(),
  acessoArquivos: mysqlEnum("acessoArquivos", ["sim", "nao"]).default("nao").notNull(),
  acessoComparacoes: mysqlEnum("acessoComparacoes", ["sim", "nao"]).default("nao").notNull(),
  acessoFaturamento: mysqlEnum("acessoFaturamento", ["sim", "nao"]).default("nao").notNull(),
  acessoTabelasPreco: mysqlEnum("acessoTabelasPreco", ["sim", "nao"]).default("nao").notNull(),
  acessoAnaliseGlosa: mysqlEnum("acessoAnaliseGlosa", ["sim", "nao"]).default("nao").notNull(),
  acessoDicionarioGlosas: mysqlEnum("acessoDicionarioGlosas", ["sim", "nao"]).default("nao").notNull(),
  acessoRecursosGlosa: mysqlEnum("acessoRecursosGlosa", ["sim", "nao"]).default("nao").notNull(),
  acessoConvenios: mysqlEnum("acessoConvenios", ["sim", "nao"]).default("nao").notNull(),
  acessoRegrasNegocio: mysqlEnum("acessoRegrasNegocio", ["sim", "nao"]).default("nao").notNull(),
  acessoProdutividade: mysqlEnum("acessoProdutividade", ["sim", "nao"]).default("nao").notNull(),
  acessoEstabelecimentos: mysqlEnum("acessoEstabelecimentos", ["sim", "nao"]).default("nao").notNull(),
  acessoPermissoes: mysqlEnum("acessoPermissoes", ["sim", "nao"]).default("nao").notNull(),
  
  // MÃ³dulos Tasy
  acessoImportacaoTasy: mysqlEnum("acessoImportacaoTasy", ["sim", "nao"]).default("nao").notNull(),
  acessoContasFaturadas: mysqlEnum("acessoContasFaturadas", ["sim", "nao"]).default("nao").notNull(),
  acessoRelatoriosTasy: mysqlEnum("acessoRelatoriosTasy", ["sim", "nao"]).default("nao").notNull(),
  acessoRelatoriosBi: mysqlEnum("acessoRelatoriosBi", ["sim", "nao"]).default("nao").notNull(),
  acessoConciliacaoContasPagas: mysqlEnum("acessoConciliacaoContasPagas", ["sim", "nao"]).default("nao").notNull(),
  
  // MÃ³dulos de Recebimento e Demonstrativo
  acessoRecebimentosXml: mysqlEnum("acessoRecebimentosXml", ["sim", "nao"]).default("nao").notNull(),
  acessoRecebimentosExcel: mysqlEnum("acessoRecebimentosExcel", ["sim", "nao"]).default("nao").notNull(),
  acessoDemonstrativo: mysqlEnum("acessoDemonstrativo", ["sim", "nao"]).default("nao").notNull(),
  acessoContaConvenio: mysqlEnum("acessoContaConvenio", ["sim", "nao"]).default("nao").notNull(),
  acessoRecursos: mysqlEnum("acessoRecursos", ["sim", "nao"]).default("nao").notNull(),
  acessoAtendimentos: mysqlEnum("acessoAtendimentos", ["sim", "nao"]).default("nao").notNull(),
  acessoAtendimentosFaturar: mysqlEnum("acessoAtendimentosFaturar", ["sim", "nao"]).default("nao").notNull(),
  
  // PermissÃµes granulares por relatÃ³rio individual (dentro de RelatÃ³rios BI)
  acessoRelFaturadoRecebido: mysqlEnum("acessoRelFaturadoRecebido", ["sim", "nao"]).default("nao").notNull(),
  acessoRelRecebimentoGeral: mysqlEnum("acessoRelRecebimentoGeral", ["sim", "nao"]).default("nao").notNull(),
  acessoRelFaturamento: mysqlEnum("acessoRelFaturamento", ["sim", "nao"]).default("nao").notNull(),
  acessoRelAtendimentos: mysqlEnum("acessoRelAtendimentos", ["sim", "nao"]).default("nao").notNull(),
  acessoRelCustos: mysqlEnum("acessoRelCustos", ["sim", "nao"]).default("nao").notNull(),
  acessoRelNaoRecebidos: mysqlEnum("acessoRelNaoRecebidos", ["sim", "nao"]).default("nao").notNull(),
  acessoRelPrevisaoGlosa: mysqlEnum("acessoRelPrevisaoGlosa", ["sim", "nao"]).default("nao").notNull(),
  acessoFaturamentoExterno: mysqlEnum("acessoFaturamentoExterno", ["sim", "nao"]).default("sim").notNull(),
  
  // MÃ³dulos do Painel Executivo Safatle
  acessoPainelExecutivo: mysqlEnum("acessoPainelExecutivo", ["sim", "nao"]).default("nao").notNull(),
  acessoVisaoGeral: mysqlEnum("acessoVisaoGeral", ["sim", "nao"]).default("nao").notNull(),
  acessoFinanceiro: mysqlEnum("acessoFinanceiro", ["sim", "nao"]).default("nao").notNull(),
  acessoContratos: mysqlEnum("acessoContratos", ["sim", "nao"]).default("nao").notNull(),
  acessoPropostas: mysqlEnum("acessoPropostas", ["sim", "nao"]).default("nao").notNull(),
  acessoAtendimentosConsolidados: mysqlEnum("acessoAtendimentosConsolidados", ["sim", "nao"]).default("nao").notNull(),
  acessoNfseConsolidado: mysqlEnum("acessoNfseConsolidado", ["sim", "nao"]).default("nao").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PermissaoEstabelecimento = typeof permissoesEstabelecimento.$inferSelect;
export type InsertPermissaoEstabelecimento = typeof permissoesEstabelecimento.$inferInsert;


/**
 * Motivos de Glosa Personalizados
 * Permite cadastrar novos cÃ³digos de glosa alÃ©m dos padrÃµes TISS
 */
export const motivosGlosa = mysqlTable("motivosGlosa", {
  id: int("id").autoincrement().primaryKey(),
  
  // CÃ³digo Ãºnico do motivo (pode ser personalizado ou seguir padrÃ£o TISS)
  codigo: varchar("codigo", { length: 20 }).notNull(),
  
  // Grupo/categoria do motivo
  grupo: varchar("grupo", { length: 100 }).notNull(),
  
  // DescriÃ§Ã£o completa
  descricao: text("descricao").notNull(),
  
  // DescriÃ§Ã£o simplificada para exibiÃ§Ã£o rÃ¡pida
  descricaoSimplificada: varchar("descricaoSimplificada", { length: 255 }).notNull(),
  
  // SugestÃ£o de argumento para contestaÃ§Ã£o
  argumentoContestacao: text("argumentoContestacao"),
  
  // AÃ§Ãµes recomendadas (JSON array)
  acoesRecomendadas: json("acoesRecomendadas"),
  
  // Documentos sugeridos (JSON array)
  documentosSugeridos: json("documentosSugeridos"),
  
  // NÃ­vel de dificuldade para reverter (1-5)
  dificuldadeReversao: int("dificuldadeReversao").default(3),
  
  // Probabilidade estimada de sucesso (0-100%)
  probabilidadeSucesso: int("probabilidadeSucesso").default(50),
  
  // Se Ã© um cÃ³digo padrÃ£o TISS ou personalizado
  tipoOrigem: mysqlEnum("tipoOrigem", ["tiss", "personalizado"]).default("personalizado").notNull(),
  
  // Estabelecimento (null = disponÃ­vel para todos)
  estabelecimentoId: int("estabelecimentoId"),
  
  // Ativo
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  // UsuÃ¡rio que criou
  criadoPor: int("criadoPor"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MotivoGlosa = typeof motivosGlosa.$inferSelect;
export type InsertMotivoGlosa = typeof motivosGlosa.$inferInsert;


/**
 * Grupos de ServiÃ§o Personalizados
 * Permite criar novos grupos alÃ©m dos prÃ©-definidos
 */
export const gruposServico = mysqlTable("gruposServico", {
  id: int("id").autoincrement().primaryKey(),
  
  // Nome do grupo
  nome: varchar("nome", { length: 100 }).notNull(),
  
  // DescriÃ§Ã£o do grupo
  descricao: text("descricao"),
  
  // Cor do grupo (para exibiÃ§Ã£o visual)
  cor: varchar("cor", { length: 20 }).default("bg-gray-500"),
  
  // Ãcone do grupo (nome do Ã­cone Lucide)
  icone: varchar("icone", { length: 50 }).default("Users"),
  
  // PermissÃµes padrÃ£o do grupo (JSON)
  permissoesPadrao: json("permissoesPadrao"),
  
  // Estabelecimento (null = disponÃ­vel para todos)
  estabelecimentoId: int("estabelecimentoId"),
  
  // Se Ã© um grupo do sistema (nÃ£o pode ser excluÃ­do)
  sistemaGrupo: mysqlEnum("sistemaGrupo", ["sim", "nao"]).default("nao").notNull(),
  
  // Ativo
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  // UsuÃ¡rio que criou
  criadoPor: int("criadoPor"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type GrupoServico = typeof gruposServico.$inferSelect;
export type InsertGrupoServico = typeof gruposServico.$inferInsert;

/**
 * Log de Auditoria de PermissÃµes
 * Registra todas as alteraÃ§Ãµes de permissÃµes
 */
export const logAuditoriaPermissoes = mysqlTable("logAuditoriaPermissoes", {
  id: int("id").autoincrement().primaryKey(),
  
  // UsuÃ¡rio que fez a alteraÃ§Ã£o
  usuarioId: int("usuarioId").notNull(),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  
  // UsuÃ¡rio afetado pela alteraÃ§Ã£o
  usuarioAfetadoId: int("usuarioAfetadoId").notNull(),
  usuarioAfetadoNome: varchar("usuarioAfetadoNome", { length: 255 }),
  
  // Estabelecimento
  estabelecimentoId: int("estabelecimentoId"),
  estabelecimentoNome: varchar("estabelecimentoNome", { length: 255 }),
  
  // Tipo de aÃ§Ã£o
  tipoAcao: mysqlEnum("tipoAcao", [
    "criar_permissao",
    "alterar_permissao", 
    "remover_permissao",
    "criar_usuario",
    "alterar_grupo",
    "criar_grupo",
    "excluir_grupo",
    "editar_estabelecimentos"
  ]).notNull(),
  
  // DescriÃ§Ã£o da alteraÃ§Ã£o
  descricao: text("descricao"),
  
  // Valores anteriores (JSON)
  valoresAnteriores: json("valoresAnteriores"),
  
  // Valores novos (JSON)
  valoresNovos: json("valoresNovos"),
  
  // IP do usuÃ¡rio
  ipUsuario: varchar("ipUsuario", { length: 50 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LogAuditoriaPermissoes = typeof logAuditoriaPermissoes.$inferSelect;
export type InsertLogAuditoriaPermissoes = typeof logAuditoriaPermissoes.$inferInsert;

/**
 * PadrÃµes de CobranÃ§a Aprendidos - IA aprende com os XMLs importados
 * Identifica padrÃµes de itens que normalmente aparecem juntos
 */
export const padroesCobranca = mysqlTable("padroesCobranca", {
  id: int("id").autoincrement().primaryKey(),
  
  // Escopo do padrÃ£o
  convenioId: int("convenioId"),
  estabelecimentoId: int("estabelecimentoId"),
  setor: varchar("setor", { length: 255 }), // Setor de atendimento (ex: CENTRO CIRURGICO, POSTO I)
  profissionalExecutante: varchar("profissionalExecutante", { length: 255 }), // Profissional executante (mÃ©dico)
  
  // Procedimento principal que dispara o padrÃ£o
  codigoProcedimentoPrincipal: varchar("codigoProcedimentoPrincipal", { length: 50 }).notNull(),
  descricaoProcedimentoPrincipal: varchar("descricaoProcedimentoPrincipal", { length: 255 }),
  tipoProcedimentoPrincipal: varchar("tipoProcedimentoPrincipal", { length: 50 }), // procedimento, diaria, mat_med, etc.
  
  // Itens associados aprendidos (JSON array)
  // [{codigo, descricao, tipo, frequencia, quantidadeMedia, quantidadeMin, quantidadeMax, valorMedio}]
  itensAssociados: json("itensAssociados").notNull(),
  
  // EstatÃ­sticas do padrÃ£o
  totalOcorrencias: int("totalOcorrencias").default(1).notNull(),
  valorMedioConta: decimal("valorMedioConta", { precision: 12, scale: 2 }),
  valorMinConta: decimal("valorMinConta", { precision: 12, scale: 2 }),
  valorMaxConta: decimal("valorMaxConta", { precision: 12, scale: 2 }),
  
  // ConfianÃ§a do padrÃ£o (0-100)
  confianca: int("confianca").default(50),
  
  // Status do padrÃ£o
  status: mysqlEnum("status", [
    "aprendendo",    // Ainda coletando dados
    "ativo",         // PadrÃ£o confirmado e ativo
    "revisao",       // Precisa de revisÃ£o manual
    "inativo"        // Desativado
  ]).default("aprendendo").notNull(),
  
  // Gabarito manual (nÃ£o Ã© sobrescrito na regeneraÃ§Ã£o)
  isGabarito: int("isGabarito").default(0).notNull(),
  
  // ValidaÃ§Ã£o manual
  validadoPor: int("validadoPor"),
  dataValidacao: timestamp("dataValidacao"),
  observacoesValidacao: text("observacoesValidacao"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PadraoCobranca = typeof padroesCobranca.$inferSelect;
export type InsertPadraoCobranca = typeof padroesCobranca.$inferInsert;

/**
 * Insights de IA - SugestÃµes geradas pela anÃ¡lise de padrÃµes
 */
export const insightsIA = mysqlTable("insightsIA", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia
  arquivoId: int("arquivoId").notNull(),
  comparacaoId: int("comparacaoId"),
  estabelecimentoId: int("estabelecimentoId"),
  convenioId: int("convenioId"),
  
  // Tipo de insight
  tipoInsight: mysqlEnum("tipoInsight", [
    "item_faltante",           // Item que deveria estar na conta
    "quantidade_baixa",        // Quantidade abaixo do esperado
    "quantidade_alta",         // Quantidade acima do esperado
    "valor_divergente",        // Valor diferente do padrÃ£o
    "item_incomum",            // Item que nÃ£o costuma aparecer
    "padrao_incompleto",       // PadrÃ£o de cobranÃ§a incompleto
    "oportunidade_cobranca"    // PossÃ­vel item nÃ£o cobrado
  ]).notNull(),
  
  // Severidade
  severidade: mysqlEnum("severidade", ["baixa", "media", "alta"]).default("media").notNull(),
  
  // Detalhes do insight
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  
  // Procedimento/guia relacionado
  guiaNumero: varchar("guiaNumero", { length: 100 }),
  codigoProcedimento: varchar("codigoProcedimento", { length: 50 }),
  descricaoProcedimento: varchar("descricaoProcedimento", { length: 255 }),
  
  // Item sugerido (se aplicÃ¡vel)
  codigoItemSugerido: varchar("codigoItemSugerido", { length: 50 }),
  descricaoItemSugerido: varchar("descricaoItemSugerido", { length: 255 }),
  quantidadeSugerida: decimal("quantidadeSugerida", { precision: 10, scale: 2 }),
  valorEstimado: decimal("valorEstimado", { precision: 12, scale: 2 }),
  
  // Valores atuais vs esperados
  quantidadeAtual: decimal("quantidadeAtual", { precision: 10, scale: 2 }),
  quantidadeEsperada: decimal("quantidadeEsperada", { precision: 10, scale: 2 }),
  valorAtual: decimal("valorAtual", { precision: 12, scale: 2 }),
  valorEsperado: decimal("valorEsperado", { precision: 12, scale: 2 }),
  
  // ConfianÃ§a da sugestÃ£o (0-100)
  confianca: int("confianca").default(50),
  
  // PadrÃ£o que gerou o insight
  padraoId: int("padraoId"),
  
  // Status do insight
  status: mysqlEnum("status", [
    "pendente",      // Aguardando anÃ¡lise
    "aceito",        // UsuÃ¡rio aceitou a sugestÃ£o
    "rejeitado",     // UsuÃ¡rio rejeitou
    "ignorado"       // UsuÃ¡rio ignorou
  ]).default("pendente").notNull(),
  
  // Feedback do usuÃ¡rio
  feedbackUsuario: text("feedbackUsuario"),
  processadoPor: int("processadoPor"),
  dataProcessamento: timestamp("dataProcessamento"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InsightIA = typeof insightsIA.$inferSelect;
export type InsertInsightIA = typeof insightsIA.$inferInsert;


/**
 * Regras de IA configurÃ¡veis para geraÃ§Ã£o de alertas
 */
export const regrasIA = mysqlTable("regrasIA", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId"), // Null = regra global para todos os estabelecimentos
  
  // Identificador Ãºnico da regra
  codigo: varchar("codigo", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  
  // Categoria da regra
  categoria: mysqlEnum("categoria", [
    "outlier",           // DetecÃ§Ã£o de valores fora da mÃ©dia
    "padrao_erro",       // PadrÃµes de erro por funcionÃ¡rio
    "risco_glosa",       // Score de risco de glosa
    "tendencia",         // AnÃ¡lise de tendÃªncias
    "comparacao"         // ComparaÃ§Ã£o entre contas similares
  ]).notNull(),
  
  // Tipo de alerta gerado
  tipoAlerta: mysqlEnum("tipoAlerta", [
    "critico",    // Vermelho - requer aÃ§Ã£o imediata
    "alerta",     // Amarelo - atenÃ§Ã£o necessÃ¡ria
    "info"        // Azul - informativo
  ]).default("alerta").notNull(),
  
  // ParÃ¢metros configurÃ¡veis (JSON)
  parametros: json("parametros").$type<{
    // Para outliers
    limiteDesvioAbaixo?: number;     // Desvio padrÃ£o para valores abaixo da mÃ©dia (ex: 2)
    limiteDesvioAcima?: number;      // Desvio padrÃ£o para valores acima da mÃ©dia (ex: 2)
    minimoContasHistorico?: number;  // MÃ­nimo de contas para ter estatÃ­sticas (ex: 3)
    periodoAnalise?: number;         // Dias para anÃ¡lise (ex: 90)
    
    // Para padrÃµes de erro
    taxaGlosaMinima?: number;        // Taxa mÃ­nima de glosa para alerta (ex: 20)
    minimoProcedimentos?: number;    // MÃ­nimo de procedimentos para anÃ¡lise (ex: 50)
    periodoMeses?: number;           // PerÃ­odo em meses (ex: 6)
    
    // Para risco de glosa
    scoreRiscoMinimo?: number;       // Score mÃ­nimo para alerta (ex: 30)
    historicoMinimoContas?: number;  // MÃ­nimo de contas no histÃ³rico (ex: 5)
    
    // Para tendÃªncias
    variacaoMinima?: number;         // VariaÃ§Ã£o mÃ­nima percentual para alerta (ex: 10)
    periodoComparacao?: number;      // Meses para comparaÃ§Ã£o (ex: 3)
    
    // ConfiguraÃ§Ãµes gerais
    maxResultados?: number;          // MÃ¡ximo de resultados a exibir (ex: 10)
  }>(),
  
  // Prioridade para ordenaÃ§Ã£o (menor = mais importante)
  prioridade: int("prioridade").default(100),
  
  // Status da regra
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  // Auditoria
  criadoPor: int("criadoPor"),
  atualizadoPor: int("atualizadoPor"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegraIA = typeof regrasIA.$inferSelect;
export type InsertRegraIA = typeof regrasIA.$inferInsert;
export type FaturadoTasy = typeof faturadoTasy.$inferSelect;
export type DadoTasy = typeof dadosTasy.$inferSelect;
export type InsertDadoTasy = typeof dadosTasy.$inferInsert;
export type ImportacaoTasy = typeof importacoesTasy.$inferSelect;
export type InsertImportacaoTasy = typeof importacoesTasy.$inferInsert;


/**
 * Chaves de API para acesso externo
 * Permite que scripts externos (como o de exportaÃ§Ã£o do Tasy) acessem a API
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  
  // UsuÃ¡rio dono da chave
  userId: int("userId").notNull(),
  
  // Nome/descriÃ§Ã£o da chave
  nome: varchar("nome", { length: 255 }).notNull(),
  
  // Chave de API (hash)
  keyHash: varchar("keyHash", { length: 255 }).notNull(),
  
  // Prefixo da chave (para identificaÃ§Ã£o, ex: "sk_live_abc...")
  keyPrefix: varchar("keyPrefix", { length: 20 }).notNull(),
  
  // Estabelecimentos permitidos (JSON array de IDs, null = todos)
  estabelecimentosPermitidos: json("estabelecimentosPermitidos"),
  
  // PermissÃµes (JSON array de strings)
  permissoes: json("permissoes"),
  
  // Ãšltimo uso
  ultimoUso: timestamp("ultimoUso"),
  
  // Contador de uso
  totalUsos: int("totalUsos").default(0),
  
  // Data de expiraÃ§Ã£o (null = nÃ£o expira)
  expiraEm: timestamp("expiraEm"),
  
  // Status
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;


/**
 * Dashboards Salvos - ConfiguraÃ§Ãµes de relatÃ³rios personalizados
 */
export const dashboardsSalvos = mysqlTable("dashboardsSalvos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  // ConfiguraÃ§Ãµes do dashboard em JSON
  configuracao: text("configuracao").notNull(), // JSON com: tipoGrafico, agrupamento, colunasSelecionadas, filtros
  // ConfiguraÃ§Ãµes de comparativo
  comparativoAtivo: mysqlEnum("comparativoAtivo", ["sim", "nao"]).default("nao").notNull(),
  periodo1Mes: int("periodo1Mes"),
  periodo1Ano: int("periodo1Ano"),
  periodo2Mes: int("periodo2Mes"),
  periodo2Ano: int("periodo2Ano"),
  // Metadados
  favorito: mysqlEnum("favorito", ["sim", "nao"]).default("nao").notNull(),
  ultimoAcesso: timestamp("ultimoAcesso"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardSalvo = typeof dashboardsSalvos.$inferSelect;
export type InsertDashboardSalvo = typeof dashboardsSalvos.$inferInsert;


/**
 * Alertas de VariaÃ§Ã£o - ConfiguraÃ§Ã£o de alertas automÃ¡ticos quando variaÃ§Ã£o entre perÃ­odos ultrapassar percentual
 */
export const alertasVariacao = mysqlTable("alertasVariacao", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  userId: int("userId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  tipoAlerta: mysqlEnum("tipoAlerta", ["queda", "aumento", "ambos"]).default("queda").notNull(),
  percentualLimite: int("percentualLimite").default(20).notNull(), // Ex: 20 = 20%
  metrica: mysqlEnum("metrica", ["faturamento", "quantidade", "glosa"]).default("faturamento").notNull(),
  agrupamento: varchar("agrupamento", { length: 50 }).default("convenio"), // convenio, setor, medico, tipo
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  notificarEmail: mysqlEnum("notificarEmail", ["sim", "nao"]).default("nao"),
  ultimaVerificacao: timestamp("ultimaVerificacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlertaVariacao = typeof alertasVariacao.$inferSelect;
export type InsertAlertaVariacao = typeof alertasVariacao.$inferInsert;

/**
 * HistÃ³rico de Alertas Disparados
 */
export const historicoAlertasVariacao = mysqlTable("historicoAlertasVariacao", {
  id: int("id").autoincrement().primaryKey(),
  alertaId: int("alertaId").notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  periodoAnterior: varchar("periodoAnterior", { length: 20 }).notNull(), // Ex: "2025-01"
  periodoAtual: varchar("periodoAtual", { length: 20 }).notNull(), // Ex: "2025-02"
  valorAnterior: decimal("valorAnterior", { precision: 15, scale: 2 }).notNull(),
  valorAtual: decimal("valorAtual", { precision: 15, scale: 2 }).notNull(),
  percentualVariacao: decimal("percentualVariacao", { precision: 10, scale: 2 }).notNull(),
  detalhes: text("detalhes"), // JSON com detalhes do alerta
  visualizado: mysqlEnum("visualizado", ["sim", "nao"]).default("nao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoAlertaVariacao = typeof historicoAlertasVariacao.$inferSelect;
export type InsertHistoricoAlertaVariacao = typeof historicoAlertasVariacao.$inferInsert;

/**
 * Compartilhamento de Dashboards
 */
export const compartilhamentosDashboard = mysqlTable("compartilhamentosDashboard", {
  id: int("id").autoincrement().primaryKey(),
  dashboardId: int("dashboardId").notNull(),
  compartilhadoPorId: int("compartilhadoPorId").notNull(), // userId que compartilhou
  compartilhadoComId: int("compartilhadoComId").notNull(), // userId que recebeu
  permissao: mysqlEnum("permissao", ["visualizar", "editar"]).default("visualizar").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CompartilhamentoDashboard = typeof compartilhamentosDashboard.$inferSelect;
export type InsertCompartilhamentoDashboard = typeof compartilhamentosDashboard.$inferInsert;
export type ContaPagaTasy = typeof contasPagasTasy.$inferSelect;
export type InsertContaPagaTasy = typeof contasPagasTasy.$inferInsert;
export type ItemPagoTasy = typeof itensPagosTasy.$inferSelect;
export type InsertItemPagoTasy = typeof itensPagosTasy.$inferInsert;


/**
 * Itens do Demonstrativo de Retorno
 * Armazena os itens extraÃ­dos dos arquivos de demonstrativo de pagamento dos convÃªnios
 */
export const demonstrativoItens = mysqlTable("demonstrativoItens", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  arquivoId: int("arquivoId").notNull(), // ReferÃªncia ao arquivo de demonstrativo
  convenioId: int("convenioId").notNull(),
  
  // Dados do item
  codigo: varchar("codigo", { length: 50 }),
  descricao: text("descricao"),
  quantidade: decimal("quantidade", { precision: 10, scale: 4 }).default("1"),
  valorUnitario: decimal("valorUnitario", { precision: 12, scale: 4 }),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 4 }),
  
  // Dados de pagamento
  valorPago: decimal("valorPago", { precision: 12, scale: 4 }),
  valorGlosado: decimal("valorGlosado", { precision: 12, scale: 4 }),
  motivoGlosa: text("motivoGlosa"),
  codigoGlosa: varchar("codigoGlosa", { length: 20 }),
  
  // Status do item
  status: mysqlEnum("status", ["pago", "glosado", "pago_parcial"]).default("pago").notNull(),
  
  // Dados da guia/atendimento
  guiaNumero: varchar("guiaNumero", { length: 100 }),
  dataExecucao: timestamp("dataExecucao"),
  dataReferencia: timestamp("dataReferencia"), // MÃªs/ano de referÃªncia
  
  // Dados do paciente
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  pacienteCarteirinha: varchar("pacienteCarteirinha", { length: 100 }),
  
  // Dados do profissional
  nomeMedico: varchar("nomeMedico", { length: 255 }),
  crmMedico: varchar("crmMedico", { length: 50 }),
  
  // Tipo do item
  tipoDespesa: mysqlEnum("tipoDespesa", [
    "gas",
    "medicamento",
    "material",
    "diaria",
    "taxa",
    "procedimento",
    "outros"
  ]).default("procedimento"),
  
  // Dados extras em JSON
  dadosExtras: json("dadosExtras"),
  
  // ReferÃªncia ao procedimento original (se houver match)
  procedimentoOrigemId: int("procedimentoOrigemId"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DemonstrativoItem = typeof demonstrativoItens.$inferSelect;
export type InsertDemonstrativoItem = typeof demonstrativoItens.$inferInsert;


/**
 * ConciliaÃ§Ã£o Tasy - Resultado da conciliaÃ§Ã£o entre dados do Tasy e demonstrativos
 * Armazena o resultado da comparaÃ§Ã£o entre o que foi faturado (Tasy) e o que foi pago (demonstrativo)
 */
export const conciliacao = mysqlTable("conciliacao", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // PerÃ­odo da conciliaÃ§Ã£o
  mesReferencia: int("mesReferencia").notNull(), // 1-12
  anoReferencia: int("anoReferencia").notNull(), // Ex: 2025
  convenioId: int("convenioId"),
  
  // ReferÃªncias aos dados originais
  dadoTasyId: int("dadoTasyId"), // ReferÃªncia ao registro do Tasy (se houver)
  demonstrativoItemId: int("demonstrativoItemId"), // ReferÃªncia ao item do demonstrativo (se houver)
  
  // Dados do item faturado (Tasy)
  guiaTasy: varchar("guiaTasy", { length: 100 }),
  atendimentoTasy: varchar("atendimentoTasy", { length: 50 }),
  codigoTasy: varchar("codigoTasy", { length: 50 }),
  descricaoTasy: text("descricaoTasy"),
  quantidadeTasy: decimal("quantidadeTasy", { precision: 10, scale: 4 }),
  valorTasy: decimal("valorTasy", { precision: 12, scale: 4 }),
  dataTasy: timestamp("dataTasy"),
  pacienteTasy: varchar("pacienteTasy", { length: 255 }),
  
  // Dados do item pago (Demonstrativo)
  guiaDemo: varchar("guiaDemo", { length: 100 }),
  codigoDemo: varchar("codigoDemo", { length: 50 }),
  descricaoDemo: text("descricaoDemo"),
  quantidadeDemo: decimal("quantidadeDemo", { precision: 10, scale: 4 }),
  valorPagoDemo: decimal("valorPagoDemo", { precision: 12, scale: 4 }),
  valorGlosadoDemo: decimal("valorGlosadoDemo", { precision: 12, scale: 4 }),
  motivoGlosaDemo: text("motivoGlosaDemo"),
  dataDemo: timestamp("dataDemo"),
  pacienteDemo: varchar("pacienteDemo", { length: 255 }),
  
  // Resultado da conciliaÃ§Ã£o
  statusConciliacao: mysqlEnum("statusConciliacao", [
    "conciliado",           // Item encontrado e valores batem
    "divergencia_valor",    // Item encontrado mas valores diferentes
    "divergencia_quantidade", // Item encontrado mas quantidade diferente
    "nao_encontrado_demo",  // Item faturado mas nÃ£o encontrado no demonstrativo
    "nao_encontrado_tasy",  // Item no demonstrativo mas nÃ£o encontrado no Tasy
    "glosado",              // Item glosado pelo convÃªnio
    "pago_parcial"          // Item pago parcialmente
  ]).default("conciliado").notNull(),
  
  // Valores calculados
  diferencaValor: decimal("diferencaValor", { precision: 12, scale: 4 }),
  diferencaQuantidade: decimal("diferencaQuantidade", { precision: 10, scale: 4 }),
  
  // ObservaÃ§Ãµes
  observacao: text("observacao"),
  
  // Receber Hospital (S = hospital recebe, N = terceiros/mÃ©dicos)
  receberHospital: varchar("receberHospital", { length: 1 }),
  
  // VinculaÃ§Ã£o de cÃ³digos (de-para)
  vinculacaoId: int("vinculacaoId"), // FK para vinculacao_codigos se match foi por de-para
  metodoMatch: mysqlEnum("metodoMatch", ["codigo_direto", "vinculacao", "manual"]).default("codigo_direto"),
  
  // ReferÃªncia ao arquivo do demonstrativo
  arquivoDemoId: int("arquivoDemoId"),
  
  // Status de vinculaÃ§Ã£o pendente
  pendenteVinculacao: mysqlEnum("pendenteVinculacao", ["sim", "nao"]).default("nao"),
  
  // Controle
  processadoPor: int("processadoPor"), // userId que executou a conciliaÃ§Ã£o
  dataProcessamento: timestamp("dataProcessamento"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConciliacaoRecord = typeof conciliacao.$inferSelect;
export type InsertConciliacao = typeof conciliacao.$inferInsert;


/**
 * Resumo da ConciliaÃ§Ã£o Tasy - Totais por perÃ­odo/convÃªnio
 * Armazena os totais consolidados da conciliaÃ§Ã£o para relatÃ³rios
 */
export const resumoConciliacao = mysqlTable("resumoConciliacao", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // PerÃ­odo
  mesReferencia: int("mesReferencia").notNull(),
  anoReferencia: int("anoReferencia").notNull(),
  convenioId: int("convenioId"),
  
  // Totais do Tasy (faturado)
  totalItensTasy: int("totalItensTasy").default(0),
  valorTotalTasy: decimal("valorTotalTasy", { precision: 15, scale: 2 }),
  
  // Totais do Demonstrativo (pago)
  totalItensDemo: int("totalItensDemo").default(0),
  valorTotalPago: decimal("valorTotalPago", { precision: 15, scale: 2 }),
  valorTotalGlosado: decimal("valorTotalGlosado", { precision: 15, scale: 2 }),
  
  // Resultado da conciliaÃ§Ã£o
  itensConciliados: int("itensConciliados").default(0),
  itensDivergentes: int("itensDivergentes").default(0),
  itensNaoEncontradosDemo: int("itensNaoEncontradosDemo").default(0),
  itensNaoEncontradosTasy: int("itensNaoEncontradosTasy").default(0),
  itensGlosados: int("itensGlosados").default(0),
  
  // Valores
  valorDiferenca: decimal("valorDiferenca", { precision: 15, scale: 2 }),
  percentualRecebido: decimal("percentualRecebido", { precision: 5, scale: 2 }), // % do faturado que foi recebido
  percentualGlosado: decimal("percentualGlosado", { precision: 5, scale: 2 }), // % de glosa
  
  // Controle
  dataProcessamento: timestamp("dataProcessamento"),
  processadoPor: int("processadoPor"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ResumoConciliacaoRecord = typeof resumoConciliacao.$inferSelect;
export type InsertResumoConciliacao = typeof resumoConciliacao.$inferInsert;
export type ProcedimentoTasy = typeof procedimentosTasy.$inferSelect;
export type InsertProcedimentoTasy = typeof procedimentosTasy.$inferInsert;
export type MatMedTasy = typeof matMedTasy.$inferSelect;
export type ContaTasy = typeof contasTasy.$inferSelect;
export type InsertContaTasy = typeof contasTasy.$inferInsert;
export type ItemContaTasy = typeof itensContaTasy.$inferSelect;
export type InsertItemContaTasy = typeof itensContaTasy.$inferInsert;
export type ResultadoConciliacaoTasy = typeof resultadosConciliacaoTasy.$inferSelect;
export type InsertResultadoConciliacaoTasy = typeof resultadosConciliacaoTasy.$inferInsert;
export type ItemConciliacaoTasy = typeof itensConciliacaoTasy.$inferSelect;
export type InsertItemConciliacaoTasy = typeof itensConciliacaoTasy.$inferInsert;
export type DetalheItemConciliacaoTasy = typeof detalhesItensConciliacaoTasy.$inferSelect;
export type InsertDetalheItemConciliacaoTasy = typeof detalhesItensConciliacaoTasy.$inferInsert;


/**
 * Faturamento TISS - Dados extraÃ­dos dos arquivos XML TISS para faturamento
 * Armazena informaÃ§Ãµes detalhadas de cada item (procedimento ou despesa) para anÃ¡lise e conciliaÃ§Ã£o
 */
export const faturamentoTiss = mysqlTable("staging_faturamento_xml", {
  id: int("id").autoincrement().primaryKey(),
  
  // Dados do CabeÃ§alho e Lote
  numeroLote: varchar("numero_lote", { length: 20 }),
  sequencialTransacao: varchar("sequencial_transacao", { length: 20 }),
  dataRegistro: timestamp("data_registro"),
  registroAns: varchar("registro_ans", { length: 10 }),
  
  // Dados da Guia e BeneficiÃ¡rio
  numeroGuiaPrestador: varchar("numero_guia_prestador", { length: 20 }),
  numeroGuiaOperadora: varchar("numero_guia_operadora", { length: 20 }),
  senha: varchar("senha", { length: 20 }),
  carteiraBeneficiario: varchar("carteira_beneficiario", { length: 20 }),
  
  // Dados do Item (Pode ser Procedimento ou Despesa)
  tipoItem: varchar("tipo_item", { length: 20 }), // 'PROCEDIMENTO' ou 'DESPESA'
  sequencialItem: int("sequencial_item"),
  dataExecucao: timestamp("data_execucao"),
  codigoTabela: varchar("codigo_tabela", { length: 5 }),
  codigoItem: varchar("codigo_item", { length: 20 }),
  descricaoItem: varchar("descricao_item", { length: 255 }),
  quantidade: decimal("quantidade", { precision: 10, scale: 3 }),
  valorUnitario: decimal("valor_unitario", { precision: 12, scale: 2 }),
  valorFaturado: decimal("valor_faturado", { precision: 12, scale: 2 }),
  
  // Dados do Profissional (se houver)
  nomeProf: varchar("nome_prof", { length: 150 }),
  conselhoProf: varchar("conselho_prof", { length: 20 }),
  
  // Totais da Guia (para conferÃªncia)
  valorTotalGeralGuia: decimal("valor_total_geral_guia", { precision: 12, scale: 2 }),
  
  // Chave de estabelecimento para segregaÃ§Ã£o de dados
  estabelecimentoId: int("estabelecimentoId"),
  
  // ReferÃªncia ao arquivo de origem
  arquivoId: int("arquivo_id"),
  
  // ConvÃªnio e Data de ReferÃªncia (informados no upload)
  convenioId: int("convenioId"),
  dataReferencia: timestamp("data_referencia"),
  
  // Data de importaÃ§Ã£o
  dataImportacao: timestamp("data_importacao").defaultNow().notNull(),

  // CompetÃªncia no formato AAAA/MM (derivada da dataReferencia do arquivo)
  competencia: varchar("competencia", { length: 7 }),

  // CÃ³digo do prestador executante (codigoPrestadorNaOperadora do XML)
  codigoPrestadorExecutante: varchar("codigo_prestador_executante", { length: 50 }),

  // Colunas legadas (existem no banco, mantidas para compatibilidade)
  valorTotalItem: decimal("valor_total_item", { precision: 12, scale: 2 }),
  estabelecimento_id_legacy: int("estabelecimento_id"),
});

export type FaturamentoTiss = typeof faturamentoTiss.$inferSelect;
export type InsertFaturamentoTiss = typeof faturamentoTiss.$inferInsert;


/**
 * Tabela de Recebimento TISS Unificada
 * Armazena dados dos arquivos de retorno das operadoras (demonstrativos de pagamento - XML ou Excel)
 * Estrutura unificada para facilitar conciliaÃ§Ã£o e relatÃ³rios
 */
export const recebimentoTiss = mysqlTable("recebimento_tiss", {
  id: int("id").autoincrement().primaryKey(),
  
  // VÃ­nculo com a tabela 'arquivos'
  arquivoId: int("arquivo_id").notNull(),
  
  // ========== CABEÃ‡ALHO DO DEMONSTRATIVO (ct_demonstrativoCabecalho) ==========
  registroANS: varchar("registro_ans", { length: 6 }),
  numeroDemonstrativo: varchar("numero_demonstrativo", { length: 50 }),
  nomeOperadora: varchar("nome_operadora", { length: 150 }),
  cnpjOperadora: varchar("cnpj_operadora", { length: 20 }),
  dataEmissao: date("data_emissao"),
  
  // ========== DADOS DO PRESTADOR ==========
  cnes: varchar("cnes", { length: 7 }),
  codigoPrestadorOperadora: varchar("codigo_prestador_operadora", { length: 14 }),
  nomeContratado: varchar("nome_contratado", { length: 70 }),
  
  // ========== DADOS DO PROTOCOLO/LOTE (ct_contaMedicaResumo) ==========
  numeroLotePrestador: varchar("numero_lote_prestador", { length: 50 }),
  numeroProtocolo: varchar("numero_protocolo", { length: 50 }),
  dataProtocolo: date("data_protocolo"),
  valorProtocolo: decimal("valor_protocolo", { precision: 12, scale: 2 }),
  valorGlosaProtocolo: decimal("valor_glosa_protocolo", { precision: 12, scale: 2 }),
  glosaProtocoloCodigo: varchar("glosa_protocolo_codigo", { length: 20 }),
  glosaProtocoloDescricao: text("glosa_protocolo_descricao"),
  situacaoProtocolo: varchar("situacao_protocolo", { length: 10 }),
  
  // Totais do Protocolo
  valorInformadoProtocolo: decimal("valor_informado_protocolo", { precision: 12, scale: 2 }),
  valorProcessadoProtocolo: decimal("valor_processado_protocolo", { precision: 12, scale: 2 }),
  valorLiberadoProtocolo: decimal("valor_liberado_protocolo", { precision: 12, scale: 2 }),
  valorGlosaProtocoloTotal: decimal("valor_glosa_protocolo_total", { precision: 12, scale: 2 }),
  
  // ========== DADOS DA GUIA (relacaoGuias) ==========
  numeroGuiaPrestador: varchar("numero_guia_prestador", { length: 50 }),
  numeroGuiaOperadora: varchar("numero_guia_operadora", { length: 50 }),
  senha: varchar("senha", { length: 50 }),
  numeroCarteira: varchar("numero_carteira", { length: 50 }),
  nomeBeneficiario: varchar("nome_beneficiario", { length: 150 }),
  dataInicioFat: date("data_inicio_fat"),
  dataFimFat: date("data_fim_fat"),
  situacaoGuia: varchar("situacao_guia", { length: 10 }),
  
  // Glosa da Guia
  motivoGlosaGuiaCodigo: varchar("motivo_glosa_guia_codigo", { length: 20 }),
  motivoGlosaGuiaDescricao: text("motivo_glosa_guia_descricao"),
  
  // Totais da Guia
  valorInformadoGuia: decimal("valor_informado_guia", { precision: 12, scale: 2 }),
  valorProcessadoGuia: decimal("valor_processado_guia", { precision: 12, scale: 2 }),
  valorLiberadoGuia: decimal("valor_liberado_guia", { precision: 12, scale: 2 }),
  valorGlosaGuia: decimal("valor_glosa_guia", { precision: 12, scale: 2 }),
  
  // ========== DETALHES DO ITEM (detalhesGuia) ==========
  sequencialItem: int("sequencial_item"),
  dataRealizacao: date("data_realizacao"),
  codigoTabela: varchar("codigo_tabela", { length: 10 }),
  codigoItem: varchar("codigo_item", { length: 20 }),
  descricaoItem: varchar("descricao_item", { length: 255 }),
  grauParticipacao: varchar("grau_participacao", { length: 5 }),
  
  // Valores do Item (ConciliaÃ§Ã£o)
  quantidadeExecutada: decimal("quantidade_executada", { precision: 10, scale: 4 }),
  valorInformado: decimal("valor_informado", { precision: 12, scale: 2 }),
  valorProcessado: decimal("valor_processado", { precision: 12, scale: 2 }),
  valorLiberado: decimal("valor_liberado", { precision: 12, scale: 2 }),
  // valor_glosado Ã© VIRTUAL GENERATED no banco (= valor_informado - valor_liberado)
  // Marcado como generatedAlwaysAs para que Drizzle nÃ£o tente inserir valores nela
  valorGlosado: decimal("valor_glosado", { precision: 12, scale: 2 }).generatedAlwaysAs(sql`\`valor_informado\` - \`valor_liberado\``, { mode: 'virtual' }),
  
  // Motivos de Glosa do Item (relacaoGlosa)
  codigoGlosa: varchar("codigo_glosa", { length: 20 }),
  descricaoGlosa: text("descricao_glosa"),
  
  // ========== DADOS DE PAGAMENTO (ctm_demonstrativoPagamento) ==========
  dataPagamento: date("data_pagamento"),
  formaPagamento: varchar("forma_pagamento", { length: 20 }),
  banco: varchar("banco", { length: 4 }),
  agencia: varchar("agencia", { length: 7 }),
  
  // Totais Gerais do Demonstrativo
  valorInformadoGeral: decimal("valor_informado_geral", { precision: 12, scale: 2 }),
  valorProcessadoGeral: decimal("valor_processado_geral", { precision: 12, scale: 2 }),
  valorLiberadoGeral: decimal("valor_liberado_geral", { precision: 12, scale: 2 }),
  valorGlosaGeral: decimal("valor_glosa_geral", { precision: 12, scale: 2 }),
  valorFinalReceber: decimal("valor_final_receber", { precision: 12, scale: 2 }),
  
  // ========== METADADOS ==========
  origemDado: mysqlEnum("origem_dado", ["xml", "excel"]).notNull(),
  dataImportacao: timestamp("data_importacao").defaultNow().notNull(),
  
  // ConvÃªnio e Data de ReferÃªncia (informados no upload)
  convenioId: int("convenioId"),
  dataReferencia: date("data_referencia"),
  
  // Estabelecimento
  estabelecimentoId: int("estabelecimentoId"),

  // Colunas legadas (existem no banco, mantidas para compatibilidade)
  estabelecimento_id_legacy: int("estabelecimento_id"),
  codigoPrestadorPagamento: varchar("codigo_prestador_pagamento", { length: 50 }),
  nomePrestadorPagamento: varchar("nome_prestador_pagamento", { length: 255 }),
  codigoPrestadorExecutante: varchar("codigo_prestador_executante", { length: 50 }),
  nomePrestadorExecutante: varchar("nome_prestador_executante", { length: 255 }),
  horaExecucao: varchar("hora_execucao", { length: 20 }),
  codigoProcedimento: varchar("codigo_procedimento", { length: 20 }),
  descricaoProcedimento: varchar("descricao_procedimento", { length: 255 }),
  tipoLancamento: varchar("tipo_lancamento", { length: 50 }),
  qtdExecutada: decimal("qtd_executada", { precision: 10, scale: 4 }),
  situacaoItem: varchar("situacao_item", { length: 20 }),
  codigoSolicitante: varchar("codigo_solicitante", { length: 50 }),
  nomeSolicitante: varchar("nome_solicitante", { length: 255 }),
  acomodacaoInternacao: varchar("acomodacao_internacao", { length: 50 }),
  dataInicioInternacao: date("data_inicio_internacao"),
  dataFimInternacao: date("data_fim_internacao"),
});

export type RecebimentoTiss = typeof recebimentoTiss.$inferSelect;
export type InsertRecebimentoTiss = typeof recebimentoTiss.$inferInsert;


/**
 * Recebimentos Excel - Tabela para importaÃ§Ã£o de Excel de retorno dos convÃªnios
 * Campos mapeados exatamente como no Excel da Unimed
 */
export const recebimentosExcel = mysqlTable("recebimentos_excel", {
  id: int("id").autoincrement().primaryKey(),
  arquivoId: int("arquivo_id"), // ReferÃªncia ao arquivo de origem
  
  // Data Pagto
  dataPagto: timestamp("data_pagto"),
  
  // Processado (valor)
  processado: decimal("processado", { precision: 12, scale: 2 }),
  
  // Protocolo TISS
  protocoloTiss: varchar("protocolo_tiss", { length: 50 }),
  
  // Lote Prestador
  lotePrestador: varchar("lote_prestador", { length: 50 }),
  
  // CÃ³digo Prestador Pagamento
  codigoPrestadorPagamento: varchar("codigo_prestador_pagamento", { length: 50 }),
  
  // Nome Prestador Pagamento
  nomePrestadorPagamento: varchar("nome_prestador_pagamento", { length: 255 }),
  
  // NÃºmero Guia
  numeroGuia: varchar("numero_guia", { length: 50 }),
  
  // Seq (sequencial do item)
  seq: int("seq"),
  
  // BeneficiÃ¡rio (nÃºmero carteira)
  beneficiario: varchar("beneficiario", { length: 50 }),
  
  // Nome BeneficiÃ¡rio
  nomeBeneficiario: varchar("nome_beneficiario", { length: 255 }),
  
  // Data ExecuÃ§Ã£o
  dataExecucao: timestamp("data_execucao"),
  
  // Hora ExecuÃ§Ã£o
  horaExecucao: varchar("hora_execucao", { length: 20 }),
  
  // Item (cÃ³digo do procedimento)
  item: varchar("item", { length: 50 }),
  
  // Item Desc (descriÃ§Ã£o do procedimento)
  itemDesc: varchar("item_desc", { length: 500 }),
  
  // Quantidade
  quantidade: int("quantidade"),
  
  // Valor Pagamento
  valorPagamento: decimal("valor_pagamento", { precision: 12, scale: 2 }),
  
  // Tipo LanÃ§amento
  tipoLancamento: varchar("tipo_lancamento", { length: 100 }),
  
  // Erro TISS (cÃ³digo de glosa / observaÃ§Ã£o de glosa)
  erroTiss: varchar("erro_tiss", { length: 500 }),
  
  // SituaÃ§Ã£o Item (PAGO/GLOSADO/etc)
  situacaoItem: varchar("situacao_item", { length: 50 }),
  
  // Tipo de Item (PROCEDIMENTO, MEDICAMENTO, MATERIAL, DIÃRIA, TAXA, GÃS MEDICINAL)
  tipoItem: varchar("tipo_item", { length: 30 }),
  
  // Valor Glosa (especÃ­fico)
  valorGlosa: decimal("valor_glosa", { precision: 12, scale: 2 }),
  
  // CÃ³digo Glosa TISS (ampliado para suportar justificativas longas do IPASGO)
  codigoGlosa: varchar("codigo_glosa", { length: 500 }),
  
  // Valor Informado (valor cobrado original)
  valorInformado: decimal("valor_informado", { precision: 12, scale: 2 }),
  
  // CÃ³digo Solicitante
  codigoSolicitante: varchar("codigo_solicitante", { length: 50 }),
  
  // Nome Solicitante
  nomeSolicitante: varchar("nome_solicitante", { length: 255 }),
  
  // AcomodaÃ§Ã£o da InternaÃ§Ã£o
  acomodacaoInternacao: varchar("acomodacao_internacao", { length: 100 }),
  
  // Data Inicio Faturamento InternaÃ§Ã£o
  dataInicioFaturamentoInternacao: timestamp("data_inicio_faturamento_internacao"),
  
  // Data Fim Faturamento InternaÃ§Ã£o
  dataFimFaturamentoInternacao: timestamp("data_fim_faturamento_internacao"),
  
  // CÃ³digo Prestador (executante)
  codigoPrestador: varchar("codigo_prestador", { length: 50 }),
  
  // Nome Prestador (executante)
  nomePrestador: varchar("nome_prestador", { length: 255 }),
  
  // Prestador Executante (cÃ³digo)
  prestadorExecutante: varchar("prestador_executante", { length: 50 }),
  
  // Nome Prestador Executante
  nomePrestadorExecutante: varchar("nome_prestador_executante", { length: 255 }),
  
  // ConvÃªnio, Data de ReferÃªncia e Data de Pagamento (informados no upload)
  convenioId: int("convenioId"),
  dataReferencia: date("data_referencia"),
  dataPagamentoUpload: date("data_pagamento"),
  
  // Estabelecimento
  estabelecimentoId: int("estabelecimentoId"),
  
  // Data de importaÃ§Ã£o
  dataImportacao: timestamp("data_importacao").defaultNow().notNull(),
});

export type RecebimentoExcel = typeof recebimentosExcel.$inferSelect;
export type InsertRecebimentoExcel = typeof recebimentosExcel.$inferInsert;


/**
 * Retorno TISS Unificado - Tabela unificada para dados de retorno de XML e Excel
 */
export const retornoTissUnificado = mysqlTable("retorno_tiss_unificado", {
  id: int("id").autoincrement().primaryKey(),
  
  // VÃ­nculo com a tabela 'arquivos'
  arquivoId: int("arquivo_id").notNull(),
  
  // IdentificaÃ§Ã£o da Operadora/Demonstrativo
  numeroDemonstrativo: varchar("numero_demonstrativo", { length: 50 }),
  nomeOperadora: varchar("nome_operadora", { length: 150 }),
  cnpjOperadora: varchar("cnpj_operadora", { length: 20 }),
  dataEmissao: date("data_emissao"),
  
  // Dados do Protocolo/Lote
  numeroLotePrestador: varchar("numero_lote_prestador", { length: 50 }),
  numeroProtocolo: varchar("numero_protocolo", { length: 50 }),
  situacaoProtocolo: varchar("situacao_protocolo", { length: 10 }),
  
  // Dados da Guia e BeneficiÃ¡rio
  numeroGuiaPrestador: varchar("numero_guia_prestador", { length: 50 }),
  numeroGuiaOperadora: varchar("numero_guia_operadora", { length: 50 }),
  senha: varchar("senha", { length: 50 }),
  numeroCarteira: varchar("numero_carteira", { length: 50 }),
  nomeBeneficiario: varchar("nome_beneficiario", { length: 150 }),
  situacaoGuia: varchar("situacao_guia", { length: 10 }),
  
  // Detalhes do Item (Procedimento/Insumo)
  sequencialItem: int("sequencial_item"),
  dataRealizacao: date("data_realizacao"),
  codigoTabela: varchar("codigo_tabela", { length: 10 }),
  codigoItem: varchar("codigo_item", { length: 20 }),
  descricaoItem: varchar("descricao_item", { length: 255 }),
  
  // Valores de ConciliaÃ§Ã£o
  quantidadeExecutada: decimal("quantidade_executada", { precision: 10, scale: 3 }),
  valorInformado: decimal("valor_informado", { precision: 12, scale: 2 }),
  valorProcessado: decimal("valor_processado", { precision: 12, scale: 2 }),
  valorLiberado: decimal("valor_liberado", { precision: 12, scale: 2 }),
  // valor_glosado Ã© calculado automaticamente pelo banco (GENERATED ALWAYS AS)
  
  // Motivos de Glosa
  codigoGlosa: varchar("codigo_glosa", { length: 20 }),
  descricaoGlosa: text("descricao_glosa"),
  
  // Metadados
  origemDado: mysqlEnum("origem_dado", ["xml", "excel"]).notNull(),
  dataImportacao: timestamp("data_importacao").defaultNow().notNull(),
});

export type RetornoTissUnificado = typeof retornoTissUnificado.$inferSelect;
export type InsertRetornoTissUnificado = typeof retornoTissUnificado.$inferInsert;


// ============================================
// TABELA DEMONSTRATIVO - Unificada para XML e Excel de Retorno
// ============================================

export const demonstrativo = mysqlTable("demonstrativo", {
  id: int("id").primaryKey().autoincrement(),
  arquivoId: int("arquivo_id").notNull(),
  origemTipo: mysqlEnum("origem_tipo", ["xml", "excel"]).notNull(),
  convenioId: int("convenio_id"),
  
  // IdentificaÃ§Ã£o Principal
  numeroGuia: varchar("numero_guia", { length: 50 }),
  protocolo: varchar("protocolo", { length: 50 }),
  lotePrestador: varchar("lote_prestador", { length: 50 }),
  dataPagamento: date("data_pagamento"),
  
  // BeneficiÃ¡rio
  carteiraBeneficiario: varchar("carteira_beneficiario", { length: 50 }),
  nomeBeneficiario: varchar("nome_beneficiario", { length: 255 }),
  
  // Detalhes do Procedimento/Item
  sequencialItem: int("sequencial_item"),
  codigoItem: varchar("codigo_item", { length: 50 }),
  descricaoItem: text("descricao_item"),
  dataExecucao: date("data_execucao"),
  quantidade: decimal("quantidade", { precision: 12, scale: 3 }),
  
  // Valores Financeiros
  valorInformado: decimal("valor_informado", { precision: 12, scale: 2 }).default("0.00"),
  valorPago: decimal("valor_pago", { precision: 12, scale: 2 }).default("0.00"),
  valorGlosa: decimal("valor_glosa", { precision: 12, scale: 2 }).default("0.00"),
  
  // Status e Motivos
  codigoGlosa: varchar("codigo_glosa", { length: 500 }),
  situacaoItem: varchar("situacao_item", { length: 100 }),
  
  // Campos extras do Excel
  tipoLancamento: varchar("tipo_lancamento", { length: 100 }),
  erroTiss: varchar("erro_tiss", { length: 255 }),
  
  // Data de referÃªncia do arquivo
  dataReferencia: date("data_referencia"),
  
  // Estabelecimento
  estabelecimentoId: int("estabelecimentoId"),
  
  // ClassificaÃ§Ã£o de Glosa
  classificacaoGlosa: mysqlEnum("classificacao_glosa", [
    "pendente",
    "aceitar",
    "recursar",
    "auto_aceitar",
    "auto_recursar"
  ]).default("pendente"),
  classificacaoConfianca: int("classificacao_confianca"),
  classificacaoMotivo: text("classificacao_motivo"),
  motivoAceite: text("motivo_aceite"),
  dataAceite: timestamp("data_aceite"),
  recursoStatus: mysqlEnum("recurso_status", [
    "sem_recurso",
    "recurso_criado",
    "recurso_enviado",
    "recurso_deferido",
    "recurso_indeferido"
  ]).default("sem_recurso"),
  recursoId: int("recurso_id"),
  
  // Auditoria
  dataImportacaoSistema: timestamp("data_importacao_sistema").defaultNow().notNull(),
});

export type Demonstrativo = typeof demonstrativo.$inferSelect;
export type InsertDemonstrativo = typeof demonstrativo.$inferInsert;


/**
 * Avisos Internos (Banners de comunicados da empresa)
 * Gerenciados pelo administrador, exibidos na tela inicial apÃ³s login
 */
export const avisosInternos = mysqlTable("avisosInternos", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  conteudo: text("conteudo").notNull(),
  tipo: mysqlEnum("tipo", ["informacao", "alerta", "urgente"]).default("informacao").notNull(),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  criadoPorId: int("criadoPorId").notNull(),
  criadoPorNome: varchar("criadoPorNome", { length: 255 }),
  expiraEm: timestamp("expiraEm"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AvisoInterno = typeof avisosInternos.$inferSelect;
export type InsertAvisoInterno = typeof avisosInternos.$inferInsert;


/**
 * HistÃ³rico de ValidaÃ§Ãµes de Arquivos XML
 * PersistÃªncia de resultados de validaÃ§Ã£o de arquivos XML para anÃ¡lise de tendÃªncias
 */
export const historicoValidacaoXml = mysqlTable("historicoValidacaoXml", {
  id: int("id").autoincrement().primaryKey(),
  
  // Estabelecimento que realizou a validaÃ§Ã£o
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Nome do arquivo XML validado
  nomeArquivo: varchar("nomeArquivo", { length: 255 }).notNull(),
  
  // Data de processamento do arquivo
  dataProcessamento: timestamp("dataProcessamento").notNull(),
  
  // EstatÃ­sticas de contas processadas
  totalContas: int("totalContas").default(0).notNull(),
  contasValidas: int("contasValidas").default(0).notNull(),
  contasInvalidas: int("contasInvalidas").default(0).notNull(),
  
  // Score de conformidade mÃ©dio (0-100)
  scoreConformidadeMedio: decimal("scoreConformidadeMedio", { precision: 5, scale: 2 }).default("0"),
  
  // Resultado completo em JSON (divergÃªncias, violaÃ§Ãµes, etc.)
  resultadoCompleto: json("resultadoCompleto"),
  
  // UsuÃ¡rio que realizou a validaÃ§Ã£o
  usuarioId: int("usuarioId").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type HistoricoValidacaoXml = typeof historicoValidacaoXml.$inferSelect;
export type InsertHistoricoValidacaoXml = typeof historicoValidacaoXml.$inferInsert;

// Tabela de auditoria
export const auditLog = mysqlTable('auditLog', {
  id: int('id').primaryKey().autoincrement(),
  tabela: varchar('tabela', { length: 100 }).notNull(),
  registroId: int('registroId').notNull(),
  tipoAcao: varchar('tipoAcao', { length: 20 }).notNull(),
  usuarioId: int('usuarioId').notNull(),
  usuarioNome: varchar('usuarioNome', { length: 255 }),
  valoresAnteriores: json('valoresAnteriores'),
  valoresNovos: json('valoresNovos'),
  estabelecimentoId: int('estabelecimentoId'),
  criadoEm: timestamp('criadoEm').defaultNow(),
});
export type Atendimento = typeof atendimentos.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * NOTIFICAÃ‡Ã•ES DE ATENDIMENTOS
 * Armazena as notificaÃ§Ãµes registradas para cada atendimento (banco interno MySQL)
 */

export const notificacoesAtendimento = mysqlTable("notificacoes_atendimento", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia ao atendimento
  numatend: varchar("numatend", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId"),
  
  // Dados da notificaÃ§Ã£o
  observacao: text("observacao").notNull().default(""),
  usuario: varchar("usuario", { length: 255 }),
  
  // Metadados
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
}, (table) => ({
  numatendIdx: index("idx_notif_atend_numatend").on(table.numatend),
  estabelecimentoIdx: index("idx_notif_atend_estab").on(table.estabelecimentoId),
  criadoEmIdx: index("idx_notif_atend_criado").on(table.criadoEm),
}));

export const notificacoesAtendimentoItem = mysqlTable("notificacoes_atendimento_item", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia Ã  notificaÃ§Ã£o pai
  notificacaoId: int("notificacaoId").notNull(),
  
  // Dados do item
  motivo: varchar("motivo", { length: 255 }).notNull(),
  setor: varchar("setor", { length: 255 }).notNull().default(""),
  medico: varchar("medico", { length: 255 }).notNull().default(""),
  
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
}, (table) => ({
  notificacaoIdx: index("idx_notif_item_notificacao").on(table.notificacaoId),
  motivoIdx: index("idx_notif_item_motivo").on(table.motivo),
}));

export type NotificacaoAtendimento = typeof notificacoesAtendimento.$inferSelect;
export type InsertNotificacaoAtendimento = typeof notificacoesAtendimento.$inferInsert;
export type NotificacaoAtendimentoItem = typeof notificacoesAtendimentoItem.$inferSelect;
export type InsertNotificacaoAtendimentoItem = typeof notificacoesAtendimentoItem.$inferInsert;


// =====================================================
// INTEGRADOR DE DADOS - Metadados de ConfiguraÃ§Ã£o
// =====================================================

/**
 * ConexÃµes de banco de dados externas configuradas pelo admin
 */
export const integracaoConexoes = mysqlTable("integracao_conexoes", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: mysqlEnum("tipo", ["postgresql", "mysql", "sqlserver", "oracle"]).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  porta: int("porta").notNull(),
  banco: varchar("banco", { length: 255 }).notNull(),
  usuario: varchar("usuario", { length: 255 }).notNull(),
  senhaEncriptada: text("senhaEncriptada").notNull(),
  ssl: mysqlEnum("ssl", ["sim", "nao"]).default("nao").notNull(),
  estabelecimentoId: int("estabelecimentoId"),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  ultimoTesteConexao: timestamp("ultimoTesteConexao"),
  statusConexao: mysqlEnum("statusConexao", ["ok", "erro", "nao_testado"]).default("nao_testado").notNull(),
  erroConexao: text("erroConexao"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabIdx: index("idx_integ_conexao_estab").on(table.estabelecimentoId),
}));

export type IntegracaoConexao = typeof integracaoConexoes.$inferSelect;
export type InsertIntegracaoConexao = typeof integracaoConexoes.$inferInsert;

/**
 * Tabelas criadas dinamicamente pelo integrador
 */
export const integracaoTabelas = mysqlTable("integracao_tabelas", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  nomeExibicao: varchar("nomeExibicao", { length: 255 }).notNull(),
  descricao: text("descricao"),
  estabelecimentoId: int("estabelecimentoId"),
  criadaNoBanco: mysqlEnum("criadaNoBanco", ["sim", "nao"]).default("nao").notNull(),
  totalRegistros: int("totalRegistros").default(0).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nomeIdx: index("idx_integ_tabela_nome").on(table.nome),
  estabIdx: index("idx_integ_tabela_estab").on(table.estabelecimentoId),
}));

export type IntegracaoTabela = typeof integracaoTabelas.$inferSelect;
export type InsertIntegracaoTabela = typeof integracaoTabelas.$inferInsert;

/**
 * Colunas das tabelas criadas pelo integrador
 */
export const integracaoColunas = mysqlTable("integracao_colunas", {
  id: int("id").autoincrement().primaryKey(),
  tabelaId: int("tabelaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  nomeExibicao: varchar("nomeExibicao", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["varchar", "int", "bigint", "decimal", "text", "date", "datetime", "boolean"]).notNull(),
  tamanho: int("tamanho"), // Para varchar
  precisao: int("precisao"), // Para decimal
  obrigatorio: mysqlEnum("obrigatorio", ["sim", "nao"]).default("nao").notNull(),
  chaveUnica: mysqlEnum("chaveUnica", ["sim", "nao"]).default("nao").notNull(),
  valorPadrao: varchar("valorPadrao", { length: 255 }),
  ordem: int("ordem").default(0).notNull(),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
}, (table) => ({
  tabelaIdx: index("idx_integ_coluna_tabela").on(table.tabelaId),
}));

export type IntegracaoColuna = typeof integracaoColunas.$inferSelect;
export type InsertIntegracaoColuna = typeof integracaoColunas.$inferInsert;

/**
 * Mapeamentos de campos (origem â†’ destino) para sincronizaÃ§Ã£o
 */
export const integracaoMapeamentos = mysqlTable("integracao_mapeamentos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  conexaoOrigemId: int("conexaoOrigemId").notNull(),
  tabelaDestinoId: int("tabelaDestinoId").notNull(),
  queryOrigem: text("queryOrigem").notNull(), // SQL para buscar dados na origem
  campoChave: varchar("campoChave", { length: 255 }), // Campo usado como chave para upsert
  frequencia: mysqlEnum("frequencia", ["manual", "5min", "15min", "30min", "1hora", "6horas", "12horas", "diario"]).default("manual").notNull(),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  estabelecimentoId: int("estabelecimentoId"),
  // ImportaÃ§Ã£o incremental
  modoImportacao: mysqlEnum("modoImportacao", ["completa", "incremental"]).default("completa").notNull(),
  colunaControle: varchar("colunaControle", { length: 255 }), // Coluna usada para controle incremental (ex: id, updated_at)
  ultimoValorControle: text("ultimoValorControle"), // Ãšltimo valor importado da coluna de controle
  ultimaSincronizacao: timestamp("ultimaSincronizacao"), // Data/hora da Ãºltima sincronizaÃ§Ã£o bem-sucedida
  totalRegistrosImportados: int("totalRegistrosImportados").default(0).notNull(), // Total acumulado de registros importados
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  conexaoIdx: index("idx_integ_map_conexao").on(table.conexaoOrigemId),
  tabelaIdx: index("idx_integ_map_tabela").on(table.tabelaDestinoId),
  estabIdx: index("idx_integ_map_estab").on(table.estabelecimentoId),
}));

export type IntegracaoMapeamento = typeof integracaoMapeamentos.$inferSelect;
export type InsertIntegracaoMapeamento = typeof integracaoMapeamentos.$inferInsert;

/**
 * Mapeamento de campos individuais (coluna origem â†’ coluna destino)
 */
export const integracaoMapeamentoCampos = mysqlTable("integracao_mapeamento_campos", {
  id: int("id").autoincrement().primaryKey(),
  mapeamentoId: int("mapeamentoId").notNull(),
  colunaOrigemNome: varchar("colunaOrigemNome", { length: 255 }).notNull(),
  colunaDestinoId: int("colunaDestinoId").notNull(),
  transformacao: text("transformacao"), // ExpressÃ£o de transformaÃ§Ã£o opcional (ex: UPPER, TRIM, etc.)
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
}, (table) => ({
  mapIdx: index("idx_integ_mapcampo_map").on(table.mapeamentoId),
}));

export type IntegracaoMapeamentoCampo = typeof integracaoMapeamentoCampos.$inferSelect;
export type InsertIntegracaoMapeamentoCampo = typeof integracaoMapeamentoCampos.$inferInsert;

/**
 * Log de sincronizaÃ§Ãµes executadas
 */
export const integracaoSincronizacoes = mysqlTable("integracao_sincronizacoes", {
  id: int("id").autoincrement().primaryKey(),
  mapeamentoId: int("mapeamentoId").notNull(),
  status: mysqlEnum("status", ["executando", "sucesso", "erro", "cancelado"]).notNull(),
  registrosLidos: int("registrosLidos").default(0).notNull(),
  registrosInseridos: int("registrosInseridos").default(0).notNull(),
  registrosAtualizados: int("registrosAtualizados").default(0).notNull(),
  registrosErro: int("registrosErro").default(0).notNull(),
  erroMensagem: text("erroMensagem"),
  iniciadoEm: timestamp("iniciadoEm").defaultNow().notNull(),
  finalizadoEm: timestamp("finalizadoEm"),
  duracaoMs: int("duracaoMs"),
  executadoPor: varchar("executadoPor", { length: 255 }),
}, (table) => ({
  mapIdx: index("idx_integ_sync_map").on(table.mapeamentoId),
  statusIdx: index("idx_integ_sync_status").on(table.status),
  inicioIdx: index("idx_integ_sync_inicio").on(table.iniciadoEm),
}));

export type IntegracaoSincronizacao = typeof integracaoSincronizacoes.$inferSelect;
export type InsertIntegracaoSincronizacao = typeof integracaoSincronizacoes.$inferInsert;

/**
 * Tabela de Recebimento Geral
 * Consolida dados de recebimento de todos os convÃªnios e estabelecimentos
 */
export const recebimentoGeral = mysqlTable("recebimento_geral", {
  id: int("id").autoincrement().primaryKey(),
  sincronizado: timestamp("sincronizado"),
  atualizado: timestamp("atualizado"),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  convenioId: int("convenioId"),
  convenio: varchar("convenio", { length: 255 }),
  mesProducao: varchar("mes_producao", { length: 20 }),
  fatura: varchar("fatura", { length: 100 }),
  codigoRecurso: varchar("codigo_recurso", { length: 100 }),
  tipoProcedimento: varchar("tipo_procedimento", { length: 255 }),
  protocolo: varchar("protocolo", { length: 100 }),
  numeroConta: varchar("numero_conta", { length: 100 }),
  guiaCobranca: varchar("guia_cobranca", { length: 100 }),
  guiaOperadora: varchar("guia_operadora", { length: 100 }),
  descricaoItem: text("descricao_item"),
  carteirinha: varchar("carteirinha", { length: 100 }),
  dataConta: varchar("data_conta", { length: 20 }),
  dataInternacao: varchar("data_internacao", { length: 20 }),
  dataSaida: varchar("data_saida", { length: 20 }),
  codigoConvenio: varchar("codigo_convenio", { length: 50 }),
  codigoSistema: varchar("codigo_sistema", { length: 50 }),
  tipoDescricao: varchar("tipo_descricao", { length: 255 }),
  funcaoTiss: varchar("funcao_tiss", { length: 255 }),
  receberHospital: varchar("receber_hospital", { length: 1 }),
  codigoSetor: varchar("codigo_setor", { length: 50 }),
  nomeSetor: varchar("nome_setor", { length: 255 }),
  prestadorExecutante: varchar("prestador_executante", { length: 255 }),
  nomePrestador: varchar("nome_prestador", { length: 255 }),
  quantidadeItem: decimal("quantidade_item", { precision: 15, scale: 4 }),
  vlUnitario: decimal("vl_unitario", { precision: 15, scale: 2 }),
  vlFaturado: decimal("vl_faturado", { precision: 15, scale: 2 }),
  vlRecebido: decimal("vl_recebido", { precision: 15, scale: 2 }),
  vlRecebAMaior: decimal("vl_receb_a_maior", { precision: 15, scale: 2 }),
  vlTotalRecebido: decimal("vl_total_recebido", { precision: 15, scale: 2 }),
  vlAberto: decimal("vl_aberto", { precision: 15, scale: 2 }),
  vlGlosas: decimal("vl_glosas", { precision: 15, scale: 2 }),
  vlRecurso: decimal("vl_recurso", { precision: 15, scale: 2 }),
  glAceita: decimal("gl_aceita", { precision: 15, scale: 2 }),
  glAnalise: decimal("gl_analise", { precision: 15, scale: 2 }),
  glRecuperado: decimal("gl_recuperado", { precision: 15, scale: 2 }),
  codigoTiss: varchar("codigo_tiss", { length: 50 }),
  descricaoMotivo: text("descricao_motivo"),
  complementoRecurso: text("complemento_recurso"),
  tipoAtendimento: varchar("tipo_atendimento", { length: 255 }),
}, (table) => ({
  estabIdx: index("idx_receb_geral_estab").on(table.estabelecimentoId),
  convenioIdx: index("idx_receb_geral_convenio").on(table.convenio),
  mesIdx: index("idx_receb_geral_mes").on(table.mesProducao),
  protocoloIdx: index("idx_receb_geral_protocolo").on(table.protocolo),
  contaIdx: index("idx_receb_geral_conta").on(table.numeroConta),
  convenioIdIdx: index("idx_receb_geral_convenio_id").on(table.convenioId),
}));

export type RecebimentoGeral = typeof recebimentoGeral.$inferSelect;
export type InsertRecebimentoGeral = typeof recebimentoGeral.$inferInsert;


/**
 * Mapeamento de ConvÃªnios (De-Para)
 * Associa nomes/cÃ³digos de convÃªnios vindos do hospital (Tasy/integraÃ§Ã£o)
 * aos IDs dos convÃªnios cadastrados no Safatle.
 * Permite que cada estabelecimento tenha seu prÃ³prio mapeamento.
 */
export const convenioMapeamento = mysqlTable("convenio_mapeamento", {
  id: int("id").autoincrement().primaryKey(),
  
  // Estabelecimento (cada hospital pode ter nomes diferentes para o mesmo convÃªnio)
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Dados de origem (como vem do hospital)
  nomeOrigem: varchar("nome_origem", { length: 255 }).notNull(), // Nome do convÃªnio como vem do hospital (ex: "BRADESCO SAUDE")
  codigoOrigem: varchar("codigo_origem", { length: 50 }), // CÃ³digo do convÃªnio no hospital (ex: "0016")
  
  // ReferÃªncia ao convÃªnio no Safatle
  convenioId: int("convenioId").notNull(), // FK para tabela convenios
  
  // Fonte dos dados (de qual sistema/tabela veio)
  fonte: mysqlEnum("fonte", ["tasy", "integracao", "xml", "excel", "manual"]).default("manual").notNull(),
  
  // Status
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  
  // Quem criou o mapeamento
  criadoPor: int("criadoPor"), // userId
  metodoMatch: mysqlEnum("metodo_match", ["automatico", "manual"]).default("manual").notNull(),
  confianca: decimal("confianca", { precision: 5, scale: 2 }), // Score de confianÃ§a do match automÃ¡tico (0-100)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabIdx: index("idx_conv_map_estab").on(table.estabelecimentoId),
  nomeOrigemIdx: index("idx_conv_map_nome_origem").on(table.nomeOrigem),
  convenioIdIdx: index("idx_conv_map_convenio_id").on(table.convenioId),
  uniqueMapping: index("idx_conv_map_unique").on(table.estabelecimentoId, table.nomeOrigem, table.codigoOrigem),
}));

export type ConvenioMapeamento = typeof convenioMapeamento.$inferSelect;
export type InsertConvenioMapeamento = typeof convenioMapeamento.$inferInsert;


/**
 * VinculaÃ§Ã£o de CÃ³digos - De-Para entre cÃ³digos do hospital e do convÃªnio
 * Quando o hospital envia um item com cÃ³digo X e o convÃªnio devolve com cÃ³digo Y,
 * essa tabela armazena a vinculaÃ§Ã£o para cruzamentos futuros automÃ¡ticos.
 */
export const vinculacaoCodigos = mysqlTable("vinculacao_codigos", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  convenioId: int("convenioId"), // Pode variar por convÃªnio
  
  // CÃ³digo do hospital (enviado no faturamento)
  codigoHospital: varchar("codigoHospital", { length: 50 }).notNull(),
  descricaoHospital: text("descricaoHospital"),
  
  // CÃ³digo do convÃªnio (recebido no demonstrativo)
  codigoConvenio: varchar("codigoConvenio", { length: 50 }).notNull(),
  descricaoConvenio: text("descricaoConvenio"),
  
  // ClassificaÃ§Ã£o
  tipoItem: mysqlEnum("tipoItem", ["medicamento", "material", "procedimento", "taxa", "diaria", "gas", "outros"]).default("outros"),
  
  // Controle
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  criadoPor: int("criadoPor"), // userId que criou a vinculaÃ§Ã£o
  metodoMatch: mysqlEnum("metodo_match", ["automatico", "manual"]).default("manual").notNull(),
  confianca: decimal("confianca", { precision: 5, scale: 2 }), // Score de confianÃ§a (0-100)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabIdx: index("idx_vinc_cod_estab").on(table.estabelecimentoId),
  codHospIdx: index("idx_vinc_cod_hospital").on(table.codigoHospital),
  codConvIdx: index("idx_vinc_cod_convenio").on(table.codigoConvenio),
  uniqueVinc: index("idx_vinc_unique").on(table.estabelecimentoId, table.convenioId, table.codigoHospital, table.codigoConvenio),
}));

export type VinculacaoCodigo = typeof vinculacaoCodigos.$inferSelect;
export type InsertVinculacaoCodigo = typeof vinculacaoCodigos.$inferInsert;


/**
 * PadrÃ£o de PreÃ§o por Procedimento/ConvÃªnio
 * Armazena estatÃ­sticas de preÃ§o para cada combinaÃ§Ã£o item+convÃªnio
 */
export const padraoPrecoConvenio = mysqlTable("padraoPrecoConvenio", {
  id: int("id").autoincrement().primaryKey(),
  
  estabelecimentoId: int("estabelecimentoId").notNull(),
  convenio: varchar("convenio", { length: 255 }).notNull(),
  setor: varchar("setor", { length: 255 }), // Setor de atendimento (ex: CENTRO CIRURGICO, POSTO I)
  
  codigoItem: varchar("codigoItem", { length: 50 }).notNull(),
  descricaoItem: varchar("descricaoItem", { length: 500 }),
  tipoItem: varchar("tipoItem", { length: 50 }),
  
  // EstatÃ­sticas de preÃ§o unitÃ¡rio
  mediaUnitario: decimal("mediaUnitario", { precision: 12, scale: 4 }),
  minUnitario: decimal("minUnitario", { precision: 12, scale: 4 }),
  maxUnitario: decimal("maxUnitario", { precision: 12, scale: 4 }),
  desvioUnitario: decimal("desvioUnitario", { precision: 12, scale: 4 }),
  
  // EstatÃ­sticas de valor faturado
  mediaFaturado: decimal("mediaFaturado", { precision: 12, scale: 4 }),
  minFaturado: decimal("minFaturado", { precision: 12, scale: 4 }),
  maxFaturado: decimal("maxFaturado", { precision: 12, scale: 4 }),
  desvioFaturado: decimal("desvioFaturado", { precision: 12, scale: 4 }),
  
  // Volume
  totalOcorrencias: int("totalOcorrencias").default(0).notNull(),
  totalContas: int("totalContas").default(0).notNull(),
  
  // ConfianÃ§a (0-100) - baseada no volume de dados
  confianca: int("confianca").default(0).notNull(),
  
  // PerÃ­odo analisado
  competenciaInicio: varchar("competenciaInicio", { length: 7 }),
  competenciaFim: varchar("competenciaFim", { length: 7 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabConvItemIdx: index("idx_ppc_estab_conv_item").on(table.estabelecimentoId, table.convenio, table.codigoItem),
  convenioIdx: index("idx_ppc_convenio").on(table.convenio),
  setorIdx: index("idx_ppc_setor").on(table.setor),
}));
export type PadraoPrecoConvenio = typeof padraoPrecoConvenio.$inferSelect;
export type InsertPadraoPrecoConvenio = typeof padraoPrecoConvenio.$inferInsert;

/**
 * PadrÃ£o de Glosa por ConvÃªnio
 * Armazena taxa de glosa histÃ³rica por item e convÃªnio
 */
export const padraoGlosaConvenio = mysqlTable("padraoGlosaConvenio", {
  id: int("id").autoincrement().primaryKey(),
  
  estabelecimentoId: int("estabelecimentoId").notNull(),
  convenio: varchar("convenio", { length: 255 }).notNull(),
  
  codigoItem: varchar("codigoItem", { length: 50 }).notNull(),
  descricaoItem: varchar("descricaoItem", { length: 500 }),
  tipoItem: varchar("tipoItem", { length: 50 }),
  
  // EstatÃ­sticas de glosa
  totalFaturado: int("totalFaturado").default(0).notNull(), // Vezes que o item foi faturado
  totalGlosado: int("totalGlosado").default(0).notNull(), // Vezes que foi glosado
  taxaGlosa: decimal("taxaGlosa", { precision: 5, scale: 2 }).default("0"), // % de glosa
  
  valorTotalFaturado: decimal("valorTotalFaturado", { precision: 14, scale: 2 }).default("0"),
  valorTotalGlosado: decimal("valorTotalGlosado", { precision: 14, scale: 2 }).default("0"),
  valorTotalPago: decimal("valorTotalPago", { precision: 14, scale: 2 }).default("0"),
  
  // CÃ³digos de glosa mais frequentes (JSON array)
  // [{codigoGlosa, descricao, frequencia}]
  codigosGlosaFrequentes: json("codigosGlosaFrequentes"),
  
  // Risco (calculado)
  nivelRisco: mysqlEnum("nivelRisco", ["baixo", "medio", "alto", "critico"]).default("baixo").notNull(),
  
  // PerÃ­odo analisado
  competenciaInicio: varchar("competenciaInicio", { length: 7 }),
  competenciaFim: varchar("competenciaFim", { length: 7 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabConvItemIdx: index("idx_pgc_estab_conv_item").on(table.estabelecimentoId, table.convenio, table.codigoItem),
  convenioIdx: index("idx_pgc_convenio").on(table.convenio),
  riscoIdx: index("idx_pgc_risco").on(table.nivelRisco),
}));
export type PadraoGlosaConvenio = typeof padraoGlosaConvenio.$inferSelect;
export type InsertPadraoGlosaConvenio = typeof padraoGlosaConvenio.$inferInsert;

/**
 * PadrÃ£o de Quantidade por Item
 * Armazena estatÃ­sticas de quantidade utilizada por item e convÃªnio
 */
export const padraoQuantidadeItem = mysqlTable("padraoQuantidadeItem", {
  id: int("id").autoincrement().primaryKey(),
  
  estabelecimentoId: int("estabelecimentoId").notNull(),
  convenio: varchar("convenio", { length: 255 }),
  setor: varchar("setor", { length: 255 }),
  
  codigoItem: varchar("codigoItem", { length: 50 }).notNull(),
  descricaoItem: varchar("descricaoItem", { length: 500 }),
  tipoItem: varchar("tipoItem", { length: 50 }),
  
  // EstatÃ­sticas de quantidade por atendimento/conta
  mediaQuantidade: decimal("mediaQuantidade", { precision: 10, scale: 4 }),
  minQuantidade: decimal("minQuantidade", { precision: 10, scale: 4 }),
  maxQuantidade: decimal("maxQuantidade", { precision: 10, scale: 4 }),
  desvioQuantidade: decimal("desvioQuantidade", { precision: 10, scale: 4 }),
  medianaQuantidade: decimal("medianaQuantidade", { precision: 10, scale: 4 }),
  
  // Volume
  totalOcorrencias: int("totalOcorrencias").default(0).notNull(),
  totalContas: int("totalContas").default(0).notNull(),
  
  // Limites sugeridos para alertas
  limiteInferior: decimal("limiteInferior", { precision: 10, scale: 4 }),
  limiteSuperior: decimal("limiteSuperior", { precision: 10, scale: 4 }),
  
  // ConfianÃ§a (0-100)
  confianca: int("confianca").default(0).notNull(),
  
  // PerÃ­odo analisado
  competenciaInicio: varchar("competenciaInicio", { length: 7 }),
  competenciaFim: varchar("competenciaFim", { length: 7 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabConvItemIdx: index("idx_pqi_estab_conv_item").on(table.estabelecimentoId, table.convenio, table.codigoItem),
  setorIdx: index("idx_pqi_setor").on(table.setor),
}));
export type PadraoQuantidadeItem = typeof padraoQuantidadeItem.$inferSelect;
export type InsertPadraoQuantidadeItem = typeof padraoQuantidadeItem.$inferInsert;


// ============================================================
// CONTAS CONVÃŠNIO - Tabela Operacional Unificada
// ============================================================

/**
 * Tabela operacional para gestÃ£o de contas de convÃªnio.
 * Alimentada por DUAS fontes:
 *   1. XML imports (TISS) - parseados e salvos
 *   2. Busca em tempo real no banco do cliente (Warleine) por nÃºmero de conta
 * 
 * Separada das tabelas de bulk sync (integ_faturado, staging_faturamento_xml, faturamento_unificado)
 * que servem para anÃ¡lise e geraÃ§Ã£o de padrÃµes.
 */
export const contasConvenioItens = mysqlTable("contas_convenio_itens", {
  id: int("id").autoincrement().primaryKey(),
  
  // Origem do dado
  origem: mysqlEnum("origem", ["XML", "BANCO_CLIENTE"]).notNull(),
  
  // IdentificaÃ§Ã£o da conta
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  numeroGuia: varchar("numeroGuia", { length: 100 }),
  numeroGuiaOperadora: varchar("numeroGuiaOperadora", { length: 100 }),
  numeroLote: varchar("numeroLote", { length: 50 }),
  senha: varchar("senha", { length: 50 }),
  protocolo: varchar("protocolo", { length: 100 }),
  
  // Paciente
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  carteiraBeneficiario: varchar("carteiraBeneficiario", { length: 100 }),
  
  // ConvÃªnio
  convenio: varchar("convenio", { length: 255 }),
  convenioId: int("convenioId"),
  
  // Estabelecimento
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Item
  tipoItem: varchar("tipoItem", { length: 50 }), // PROCEDIMENTO, DIARIA, MAT_MED, TAXA, GASES, etc.
  codigoItem: varchar("codigoItem", { length: 50 }),
  codigoItemTuss: varchar("codigoItemTuss", { length: 50 }),
  descricaoItem: text("descricaoItem"),
  codigoTabela: varchar("codigoTabela", { length: 10 }),
  
  // Valores
  quantidade: decimal("quantidade", { precision: 12, scale: 4 }),
  valorUnitario: decimal("valorUnitario", { precision: 12, scale: 4 }),
  valorTotal: decimal("valorTotal", { precision: 14, scale: 2 }),
  
  // Datas
  dataExecucao: timestamp("dataExecucao"),
  dataReferencia: timestamp("dataReferencia"),
  competencia: varchar("competencia", { length: 20 }),
  
  // Profissional
  profissionalExecutante: varchar("profissionalExecutante", { length: 255 }),
  setor: varchar("setor", { length: 255 }),
  
  // ReferÃªncia ao arquivo de origem (se veio de XML)
  arquivoId: int("arquivoId"),
  
  // Status da anÃ¡lise de padrÃµes
  statusAnalise: mysqlEnum("statusAnalise", [
    "pendente",     // Ainda nÃ£o analisado contra padrÃµes
    "conforme",     // Dentro dos padrÃµes
    "divergente",   // Fora dos padrÃµes (tem alertas)
    "revisado",     // Revisado manualmente
  ]).default("pendente").notNull(),
  
  // DivergÃªncias encontradas (JSON array de alertas)
  // [{tipo, severidade, mensagem, valorEsperado, valorEncontrado, padraoId}]
  divergencias: json("divergencias"),
  
  // Metadados
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  numContaIdx: index("idx_cci_numconta").on(table.numeroConta),
  convenioIdx: index("idx_cci_convenio").on(table.convenio),
  estabIdx: index("idx_cci_estab").on(table.estabelecimentoId),
  origemIdx: index("idx_cci_origem").on(table.origem),
  statusIdx: index("idx_cci_status").on(table.statusAnalise),
  competenciaIdx: index("idx_cci_competencia").on(table.competencia),
  codigoItemIdx: index("idx_cci_codigo_item").on(table.codigoItem),
  guiaIdx: index("idx_cci_guia").on(table.numeroGuia),
}));

export type ContaConvenioItem = typeof contasConvenioItens.$inferSelect;
export type InsertContaConvenioItem = typeof contasConvenioItens.$inferInsert;

/**
 * Tabela de resumo de contas convÃªnio (cabeÃ§alho da conta)
 * Armazena metadados da conta como um todo, nÃ£o dos itens individuais
 */
export const contasConvenioResumo = mysqlTable("contas_convenio_resumo", {
  id: int("id").autoincrement().primaryKey(),
  
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Origem
  origem: mysqlEnum("origem", ["XML", "BANCO_CLIENTE"]).notNull(),
  
  // Dados da conta
  convenio: varchar("convenio", { length: 255 }),
  convenioId: int("convenioId"),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  carteiraBeneficiario: varchar("carteiraBeneficiario", { length: 100 }),
  
  // Totais
  totalItens: int("totalItens").default(0).notNull(),
  valorTotal: decimal("valorTotal", { precision: 14, scale: 2 }).default("0"),
  
  // Datas
  dataInternacao: timestamp("dataInternacao"),
  dataAlta: timestamp("dataAlta"),
  competencia: varchar("competencia", { length: 20 }),
  
  // Status geral da anÃ¡lise
  statusAnalise: mysqlEnum("statusAnaliseResumo", [
    "pendente",
    "conforme",
    "divergente",
    "revisado",
  ]).default("pendente").notNull(),
  
  // Resumo de divergÃªncias
  totalDivergencias: int("totalDivergencias").default(0),
  totalAlertas: int("totalAlertas").default(0),
  
  // Score de Risco (0-100)
  scoreRisco: int("scoreRisco"),
  detalhesRisco: json("detalhesRisco"), // {score, composicao, preco, quantidade, glosa, detalhes[]}
  isOutlierValor: int("isOutlierValor").default(0), // 1 = outlier de valor
  
  // DivergÃªncias que nÃ£o pertencem a nenhum item especÃ­fico (ITEM_FALTANTE, etc.)
  divergenciasGerais: json("divergenciasGerais"), // Array de divergÃªncias Ã³rfÃ£s (sem item correspondente na conta)
  
  // Metadados
  dataBusca: timestamp("dataBusca").defaultNow().notNull(),
  buscadoPor: int("buscadoPor"), // userId
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  numContaEstabIdx: index("idx_ccr_numconta_estab").on(table.numeroConta, table.estabelecimentoId),
  convenioIdx: index("idx_ccr_convenio").on(table.convenio),
  statusIdx: index("idx_ccr_status").on(table.statusAnalise),
}));

export type ContaConvenioResumo = typeof contasConvenioResumo.$inferSelect;
export type InsertContaConvenioResumo = typeof contasConvenioResumo.$inferInsert;

/**
 * ProntuÃ¡rio - PrescriÃ§Ãµes MÃ©dicas importadas da IntegraÃ§Ã£o
 */
export const prontuarioPrescricoes = mysqlTable("prontuario_prescricoes", {
  id: int("id").autoincrement().primaryKey(),
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  dataPrescricao: timestamp("dataPrescricao"),
  medico: varchar("medico", { length: 255 }),
  crm: varchar("crm", { length: 50 }),
  
  codigoItem: varchar("codigoItem", { length: 50 }),
  descricaoItem: varchar("descricaoItem", { length: 255 }),
  quantidade: decimal("quantidade", { precision: 10, scale: 2 }),
  viaAdministracao: varchar("viaAdministracao", { length: 100 }),
  frequencia: varchar("frequencia", { length: 100 }),
  
  // Rastreamento
  origem: varchar("origem", { length: 50 }).default("INTEGRACAO"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
}, (table) => ({
  numContaEstabIdx: index("idx_pp_numconta_estab").on(table.numeroConta, table.estabelecimentoId),
  codigoIdx: index("idx_pp_codigo").on(table.codigoItem),
}));

export type ProntuarioPrescricao = typeof prontuarioPrescricoes.$inferSelect;
export type InsertProntuarioPrescricao = typeof prontuarioPrescricoes.$inferInsert;

/**
 * ProntuÃ¡rio - EvoluÃ§Ãµes ClÃ­nicas e de Enfermagem
 */
export const prontuarioEvolucoes = mysqlTable("prontuario_evolucoes", {
  id: int("id").autoincrement().primaryKey(),
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  dataEvolucao: timestamp("dataEvolucao"),
  profissional: varchar("profissional", { length: 255 }),
  conselho: varchar("conselho", { length: 50 }),
  tipoEvolucao: varchar("tipoEvolucao", { length: 100 }), // Medica, Enfermagem, Fisioterapia
  
  descricao: text("descricao"),
  
  // Rastreamento
  origem: varchar("origem", { length: 50 }).default("INTEGRACAO"),
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
}, (table) => ({
  numContaEstabIdx: index("idx_pe_numconta_estab").on(table.numeroConta, table.estabelecimentoId),
}));

export type ProntuarioEvolucao = typeof prontuarioEvolucoes.$inferSelect;
export type InsertProntuarioEvolucao = typeof prontuarioEvolucoes.$inferInsert;

/**
 * Feedback de DivergÃªncias - Registra decisÃµes do auditor sobre divergÃªncias encontradas
 * Alimenta o feedback loop para refinar os padrÃµes de cobranÃ§a
 */
export const feedbackDivergencias = mysqlTable("feedback_divergencias", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia Ã  conta e item
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  codigoItem: varchar("codigoItem", { length: 50 }),
  
  // ReferÃªncia ao padrÃ£o
  padraoId: int("padraoId"),
  
  // Tipo da divergÃªncia original
  tipoDivergencia: varchar("tipoDivergencia", { length: 50 }).notNull(), // PRECO, QUANTIDADE, ITEM_FALTANTE, ITEM_EXTRA, COMPOSICAO, GLOSA_RISCO
  
  // DecisÃ£o do auditor
  decisao: mysqlEnum("decisao", [
    "aceitar",       // DivergÃªncia Ã© vÃ¡lida, padrÃ£o deve ser ajustado
    "rejeitar",      // DivergÃªncia Ã© falso positivo, conta estÃ¡ correta
    "ignorar",       // NÃ£o relevante para este caso
  ]).notNull(),
  
  // Justificativa do auditor
  justificativa: text("justificativa"),
  
  // Dados da divergÃªncia original (snapshot)
  dadosDivergencia: json("dadosDivergencia"),
  
  // UsuÃ¡rio que deu o feedback
  usuarioId: int("usuarioId").notNull(),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  padraoIdx: index("idx_fd_padrao").on(table.padraoId),
  estabIdx: index("idx_fd_estab").on(table.estabelecimentoId),
  decisaoIdx: index("idx_fd_decisao").on(table.decisao),
}));

export type FeedbackDivergencia = typeof feedbackDivergencias.$inferSelect;
export type InsertFeedbackDivergencia = typeof feedbackDivergencias.$inferInsert;


/**
 * Tabela CBHPM - ClassificaÃ§Ã£o Brasileira Hierarquizada de Procedimentos MÃ©dicos
 * Base de referÃªncia para porte anestÃ©sico e compatibilidade de taxas
 */
export const tabelaCbhpm = mysqlTable("tabelaCbhpm", {
  id: int("id").autoincrement().primaryKey(),
  
  codigoProcedimento: varchar("codigoProcedimento", { length: 20 }).notNull(),
  descricaoProcedimento: varchar("descricaoProcedimento", { length: 500 }),
  
  // Porte do procedimento (1 a 8, ou especial)
  porte: varchar("porte", { length: 10 }),
  
  // Porte anestÃ©sico esperado (1 a 8)
  porteAnestesico: varchar("porteAnestesico", { length: 10 }),
  
  // Custo operacional (CO)
  custoOperacional: decimal("custoOperacional", { precision: 14, scale: 2 }),
  
  // NÃºmero de auxiliares
  numAuxiliares: int("numAuxiliares").default(0),
  
  // IncidÃªncia (percentual do porte para anestesia)
  incidencia: decimal("incidencia", { precision: 5, scale: 2 }),
  
  // Filme radiolÃ³gico (quantidade padrÃ£o)
  filmeRadiologico: int("filmeRadiologico").default(0),
  
  // Grupo/Subgrupo do procedimento
  grupo: varchar("grupo", { length: 100 }),
  subgrupo: varchar("subgrupo", { length: 100 }),
  
  // VersÃ£o da tabela CBHPM
  versao: varchar("versao", { length: 20 }).default("6a"),
  
  // ObservaÃ§Ãµes
  observacoes: text("observacoes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codigoIdx: index("idx_cbhpm_codigo").on(table.codigoProcedimento),
  porteIdx: index("idx_cbhpm_porte").on(table.porte),
  porteAnestIdx: index("idx_cbhpm_porte_anest").on(table.porteAnestesico),
}));

export type TabelaCbhpm = typeof tabelaCbhpm.$inferSelect;
export type InsertTabelaCbhpm = typeof tabelaCbhpm.$inferInsert;

/**
 * Tabela de Porte por ConvÃªnio
 * Regras especÃ­ficas de cada convÃªnio para porte de sala e anestesia
 * Sobrescreve a CBHPM quando o convÃªnio tem tabela prÃ³pria (ex: Unimed, Ipasgo)
 */
export const tabelaPorteConvenio = mysqlTable("tabelaPorteConvenio", {
  id: int("id").autoincrement().primaryKey(),
  
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // ConvÃªnio que possui tabela prÃ³pria
  convenio: varchar("convenio", { length: 255 }).notNull(),
  
  // CÃ³digo do procedimento
  codigoProcedimento: varchar("codigoProcedimento", { length: 20 }).notNull(),
  descricaoProcedimento: varchar("descricaoProcedimento", { length: 500 }),
  
  // Porte especÃ­fico do convÃªnio (pode diferir da CBHPM)
  porte: varchar("porte", { length: 10 }),
  porteAnestesico: varchar("porteAnestesico", { length: 10 }),
  
  // Valor da taxa de sala esperado para este porte
  valorTaxaSala: decimal("valorTaxaSala", { precision: 14, scale: 2 }),
  
  // Valor do honorÃ¡rio anestÃ©sico esperado
  valorHonorarioAnestesico: decimal("valorHonorarioAnestesico", { precision: 14, scale: 2 }),
  
  // Custo operacional especÃ­fico do convÃªnio
  custoOperacional: decimal("custoOperacional", { precision: 14, scale: 2 }),
  
  // VigÃªncia
  vigenciaInicio: timestamp("vigenciaInicio"),
  vigenciaFim: timestamp("vigenciaFim"),
  
  // Origem da informaÃ§Ã£o (manual, importaÃ§Ã£o, contrato)
  origem: varchar("origem", { length: 50 }).default("manual"),
  
  // ObservaÃ§Ãµes
  observacoes: text("observacoes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabConvIdx: index("idx_porte_conv_estab").on(table.estabelecimentoId, table.convenio),
  codigoIdx: index("idx_porte_conv_codigo").on(table.codigoProcedimento),
  convCodigoIdx: index("idx_porte_conv_conv_codigo").on(table.convenio, table.codigoProcedimento),
}));

export type TabelaPorteConvenio = typeof tabelaPorteConvenio.$inferSelect;
export type InsertTabelaPorteConvenio = typeof tabelaPorteConvenio.$inferInsert;


/**
 * Falhas de ProntuÃ¡rio - Registra falhas encontradas pela auditora no prontuÃ¡rio do paciente
 * Cada registro Ã© um checkbox marcado + observaÃ§Ã£o
 */
export const falhasProntuario = mysqlTable("falhas_prontuario", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia Ã  conta
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Tipo da falha (checkbox marcado)
  tipoFalha: varchar("tipoFalha", { length: 100 }).notNull(),
  // Categorias: EVOLUCAO, PRESCRICAO, CHECAGEM, AUTORIZACAO, DOCUMENTACAO, IDENTIFICACAO, CONSENTIMENTO, ALERGIA, ALTA, OUTRO
  categoriaFalha: varchar("categoriaFalha", { length: 50 }).notNull(),
  
  // DescriÃ§Ã£o/observaÃ§Ã£o da auditora
  descricao: text("descricao"),
  
  // Severidade
  severidade: mysqlEnum("severidade", ["leve", "moderada", "grave", "critica"]).default("moderada").notNull(),
  
  // Status
  status: mysqlEnum("statusFalha", ["aberta", "corrigida", "justificada"]).default("aberta").notNull(),
  
  // Quem registrou
  usuarioId: int("usuarioId").notNull(),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  contaIdx: index("idx_fp_conta").on(table.numeroConta, table.estabelecimentoId),
  categoriaIdx: index("idx_fp_categoria").on(table.categoriaFalha),
  statusIdx: index("idx_fp_status").on(table.status),
}));

export type FalhaProntuario = typeof falhasProntuario.$inferSelect;
export type InsertFalhaProntuario = typeof falhasProntuario.$inferInsert;

/**
 * Ajustes de Auditoria - Registra alteraÃ§Ãµes feitas pela auditora nos itens da conta
 * (alterar quantidade, valor, ou adicionar itens faltantes)
 */
export const ajustesAuditoria = mysqlTable("ajustes_auditoria", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia Ã  conta
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Tipo do ajuste
  tipoAjuste: mysqlEnum("tipoAjuste", [
    "ALTERAR_QUANTIDADE",
    "ALTERAR_VALOR",
    "ADICIONAR_ITEM",
    "REMOVER_ITEM",
    "ALTERAR_SETOR",
  ]).notNull(),
  
  // Item afetado (null se for adiÃ§Ã£o de novo item)
  itemId: int("itemId"),
  codigoItem: varchar("codigoItem", { length: 50 }),
  descricaoItem: text("descricaoItem"),
  
  // Valores originais (antes do ajuste)
  quantidadeOriginal: decimal("quantidadeOriginal", { precision: 12, scale: 4 }),
  valorOriginal: decimal("valorOriginal", { precision: 14, scale: 2 }),
  
  // Valores ajustados (depois do ajuste)
  quantidadeAjustada: decimal("quantidadeAjustada", { precision: 12, scale: 4 }),
  valorAjustado: decimal("valorAjustado", { precision: 14, scale: 2 }),
  
  // Para itens adicionados
  tipoItemAdicionado: varchar("tipoItemAdicionado", { length: 50 }),
  
  // Para alteraÃ§Ã£o de setor
  setorOriginal: varchar("setorOriginal", { length: 255 }),
  setorAjustado: varchar("setorAjustado", { length: 255 }),
  
  // Justificativa do ajuste
  justificativa: text("justificativa"),
  
  // Status do ajuste
  status: mysqlEnum("statusAjuste", ["pendente", "aplicado", "revertido"]).default("pendente").notNull(),
  
  // Quem fez o ajuste
  usuarioId: int("usuarioId").notNull(),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  contaIdx: index("idx_aa_conta").on(table.numeroConta, table.estabelecimentoId),
  tipoIdx: index("idx_aa_tipo").on(table.tipoAjuste),
  itemIdx: index("idx_aa_item").on(table.codigoItem),
  statusIdx: index("idx_aa_status").on(table.status),
}));

export type AjusteAuditoria = typeof ajustesAuditoria.$inferSelect;
export type InsertAjusteAuditoria = typeof ajustesAuditoria.$inferInsert;

/**
 * Aprendizado de Auditoria - Base de conhecimento construÃ­da a partir das aÃ§Ãµes das auditoras
 * Cada registro Ã© um padrÃ£o aprendido que pode gerar sugestÃµes automÃ¡ticas
 */
export const aprendizadoAuditoria = mysqlTable("aprendizado_auditoria", {
  id: int("id").autoincrement().primaryKey(),
  
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Tipo de aprendizado
  tipoAprendizado: mysqlEnum("tipoAprendizado", [
    "FALHA_PRONTUARIO",       // Falhas recorrentes por tipo de procedimento
    "AJUSTE_QUANTIDADE",      // Ajustes de quantidade recorrentes
    "AJUSTE_VALOR",           // Ajustes de valor recorrentes
    "ITEM_FALTANTE",          // Itens frequentemente adicionados
    "DECISAO_DIVERGENCIA",    // PadrÃ£o de decisÃ£o em divergÃªncias
  ]).notNull(),
  
  // Contexto do aprendizado (chave de agrupamento)
  convenio: varchar("convenio", { length: 255 }),
  tipoProcedimento: varchar("tipoProcedimento", { length: 100 }),
  codigoItem: varchar("codigoItem", { length: 50 }),
  descricaoItem: varchar("descricaoItem", { length: 500 }),
  setor: varchar("setor", { length: 255 }),
  
  // O que foi aprendido (JSON flexÃ­vel)
  // Para FALHA_PRONTUARIO: {tipoFalha, categoriaFalha, frequencia, percentual}
  // Para AJUSTE_QUANTIDADE: {quantidadeMedia, quantidadeModa, direcao: "aumentar"|"diminuir"}
  // Para AJUSTE_VALOR: {valorMedio, valorModa, direcao}
  // Para ITEM_FALTANTE: {codigoItem, descricao, quantidadeMedia, frequencia}
  // Para DECISAO_DIVERGENCIA: {tipoDivergencia, decisaoMaisComum, percentualAceitar, percentualRejeitar}
  dadosAprendizado: json("dadosAprendizado").notNull(),
  
  // MÃ©tricas de confianÃ§a
  totalOcorrencias: int("totalOcorrencias").default(1).notNull(),
  confianca: decimal("confianca", { precision: 5, scale: 2 }).default("0.50"), // 0.00 a 1.00
  
  // Controle de ativaÃ§Ã£o
  ativo: int("ativo").default(1).notNull(), // 1 = ativo, 0 = desativado
  minimoOcorrencias: int("minimoOcorrencias").default(3), // MÃ­nimo para sugerir
  
  // Ãšltima atualizaÃ§Ã£o do aprendizado
  ultimaAtualizacao: timestamp("ultimaAtualizacao").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabTipoIdx: index("idx_aprd_estab_tipo").on(table.estabelecimentoId, table.tipoAprendizado),
  convenioIdx: index("idx_aprd_convenio").on(table.convenio),
  codigoIdx: index("idx_aprd_codigo").on(table.codigoItem),
  confiancaIdx: index("idx_aprd_confianca").on(table.confianca),
  ativoIdx: index("idx_aprd_ativo").on(table.ativo),
}));

export type AprendizadoAuditoria = typeof aprendizadoAuditoria.$inferSelect;
export type InsertAprendizadoAuditoria = typeof aprendizadoAuditoria.$inferInsert;


/**
 * Snapshot de Auditoria - Salva o estado dos itens da conta no momento em que a auditoria Ã© finalizada
 * Permite comparar com a reimportaÃ§Ã£o para verificar se o faturista corrigiu os problemas
 */
export const snapshotAuditoria = mysqlTable("snapshot_auditoria", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia Ã  conta
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // ConvÃªnio
  convenio: varchar("convenio", { length: 255 }),
  convenioId: int("convenioId"),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  
  // Snapshot dos itens da conta (JSON array com todos os itens no momento da auditoria)
  // [{codigoItem, descricaoItem, tipoItem, quantidade, valorUnitario, valorTotal, statusAnalise, divergencias}]
  itensSnapshot: json("itensSnapshot").notNull(),
  
  // Snapshot das divergÃªncias aceitas pela auditoria (itens que o faturista PRECISA corrigir)
  // [{codigoItem, tipoDivergencia, decisao, justificativa, dadosDivergencia}]
  divergenciasAceitas: json("divergenciasAceitas"),
  
  // Snapshot das falhas de prontuÃ¡rio abertas
  // [{tipoFalha, categoriaFalha, descricao, severidade}]
  falhasAbertas: json("falhasAbertas"),
  
  // Snapshot dos ajustes aplicados pela auditoria
  // [{tipoAjuste, codigoItem, descricaoItem, quantidadeOriginal, valorOriginal, quantidadeAjustada, valorAjustado}]
  ajustesAplicados: json("ajustesAplicados"),
  
  // Totais no momento do snapshot
  totalItens: int("totalItens").default(0),
  valorTotal: decimal("valorTotal", { precision: 14, scale: 2 }),
  totalDivergenciasAceitas: int("totalDivergenciasAceitas").default(0),
  totalFalhasAbertas: int("totalFalhasAbertas").default(0),
  totalAjustes: int("totalAjustes").default(0),
  
  // Quem finalizou a auditoria (gerou o snapshot)
  auditorId: int("auditorId").notNull(),
  auditorNome: varchar("auditorNome", { length: 255 }),
  
  // Status do snapshot
  status: mysqlEnum("statusSnapshot", [
    "aguardando_correcao",   // Faturista ainda nÃ£o reimportou
    "reimportado",           // Conta foi reimportada, comparaÃ§Ã£o disponÃ­vel
    "conferido",             // ConferÃªncia foi revisada manualmente
    "aprovado",              // Todas as correÃ§Ãµes foram feitas
    "reprovado",             // CorreÃ§Ãµes insuficientes, precisa refazer
  ]).default("aguardando_correcao").notNull(),
  
  // Data em que a correÃ§Ã£o foi realizada (preenchida quando status muda para reimportado/conferido/aprovado)
  dataCorrecao: timestamp("dataCorrecao"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  contaEstabIdx: index("idx_sa_conta_estab").on(table.numeroConta, table.estabelecimentoId),
  statusIdx: index("idx_sa_status").on(table.status),
  auditorIdx: index("idx_sa_auditor").on(table.auditorId),
}));

export type SnapshotAuditoria = typeof snapshotAuditoria.$inferSelect;
export type InsertSnapshotAuditoria = typeof snapshotAuditoria.$inferInsert;

/**
 * ConferÃªncia PÃ³s-CorreÃ§Ã£o - Resultado da comparaÃ§Ã£o entre snapshot e reimportaÃ§Ã£o
 * Cada registro Ã© um item comparado com seu status de correÃ§Ã£o
 */
export const conferenciaCorrecao = mysqlTable("conferencia_correcao", {
  id: int("id").autoincrement().primaryKey(),
  
  // ReferÃªncia ao snapshot
  snapshotId: int("snapshotId").notNull(),
  
  // ReferÃªncia Ã  conta
  numeroConta: varchar("numeroConta", { length: 100 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Item comparado
  codigoItem: varchar("codigoItem", { length: 50 }),
  descricaoItem: text("descricaoItem"),
  tipoItem: varchar("tipoItem", { length: 50 }),
  
  // Tipo do apontamento original
  tipoApontamento: mysqlEnum("tipoApontamento", [
    "divergencia_aceita",   // DivergÃªncia aceita pela auditoria
    "falha_prontuario",     // Falha de prontuÃ¡rio aberta
    "ajuste_auditoria",     // Ajuste feito pela auditoria
  ]).notNull(),
  
  // Dados ANTES (do snapshot)
  valorAntes: decimal("valorAntes", { precision: 14, scale: 2 }),
  quantidadeAntes: decimal("quantidadeAntes", { precision: 12, scale: 4 }),
  detalhesAntes: json("detalhesAntes"), // dados completos do apontamento original
  
  // Dados DEPOIS (da reimportaÃ§Ã£o)
  valorDepois: decimal("valorDepois", { precision: 14, scale: 2 }),
  quantidadeDepois: decimal("quantidadeDepois", { precision: 12, scale: 4 }),
  detalhesDepois: json("detalhesDepois"), // dados do item reimportado
  
  // Resultado da comparaÃ§Ã£o
  statusCorrecao: mysqlEnum("statusCorrecao", [
    "corrigido",              // Item foi alterado conforme apontado
    "parcialmente_corrigido", // Mudou mas nÃ£o exatamente como esperado
    "nao_corrigido",          // Permanece igual ao anterior
    "novo_problema",          // Item que nÃ£o tinha divergÃªncia agora tem
    "item_removido",          // Item foi removido na reimportaÃ§Ã£o
    "item_adicionado",        // Novo item adicionado na reimportaÃ§Ã£o
  ]).notNull(),
  
  // DescriÃ§Ã£o da mudanÃ§a detectada
  descricaoMudanca: text("descricaoMudanca"),
  
  // Impacto financeiro da correÃ§Ã£o (diferenÃ§a de valor)
  impactoFinanceiro: decimal("impactoFinanceiro", { precision: 14, scale: 2 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  snapshotIdx: index("idx_cc_snapshot").on(table.snapshotId),
  contaEstabIdx: index("idx_cc_conta_estab").on(table.numeroConta, table.estabelecimentoId),
  statusIdx: index("idx_cc_status").on(table.statusCorrecao),
}));

export type ConferenciaCorrecao = typeof conferenciaCorrecao.$inferSelect;
export type InsertConferenciaCorrecao = typeof conferenciaCorrecao.$inferInsert;

/**
 * Log de AnÃ¡lise de ComparaÃ§Ã£o
 * Registra qual gabarito/padrÃ£o foi usado em cada anÃ¡lise de conta,
 * para rastreabilidade e auditoria
 */
export const logAnaliseComparacao = mysqlTable("log_analise_comparacao", {
  id: int("id").autoincrement().primaryKey(),
  numeroConta: varchar("numeroConta", { length: 50 }).notNull(),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Info do padrÃ£o/gabarito usado
  padraoId: int("padraoId"),
  padraoNome: varchar("padraoNome", { length: 500 }),
  padraoTipo: varchar("padraoTipo", { length: 50 }), // 'gabarito_manual', 'padrao_aprendido'
  isGabarito: int("isGabarito").default(0),
  convenioNome: varchar("convenioNome", { length: 255 }),
  setorPadrao: varchar("setorPadrao", { length: 255 }),
  
  // Procedimentos da conta
  procedimentosConta: text("procedimentosConta"),
  
  // Resultados da anÃ¡lise
  totalItensAnalisados: int("totalItensAnalisados").default(0),
  totalDivergencias: int("totalDivergencias").default(0),
  divergenciasCritico: int("divergenciasCritico").default(0),
  divergenciasAlerta: int("divergenciasAlerta").default(0),
  divergenciasAviso: int("divergenciasAviso").default(0),
  divergenciasInfo: int("divergenciasInfo").default(0),
  
  // Score de confianÃ§a do match
  scoreMatch: int("scoreMatch").default(0),
  motivoSelecao: text("motivoSelecao"), // ExplicaÃ§Ã£o de por que este padrÃ£o foi selecionado
  
  // Metadados
  statusGeral: varchar("statusGeral", { length: 30 }),
  duracaoMs: int("duracaoMs"), // Tempo de execuÃ§Ã£o em ms
  usuarioId: int("usuarioId"),
  usuarioNome: varchar("usuarioNome", { length: 255 }),
  
  criadoEm: timestamp("criadoEm").defaultNow().notNull(),
}, (table) => ({
  contaIdx: index("idx_lac_conta").on(table.numeroConta, table.estabelecimentoId),
  padraoIdx: index("idx_lac_padrao").on(table.padraoId),
  criadoEmIdx: index("idx_lac_criado").on(table.criadoEm),
}));

export type LogAnaliseComparacao = typeof logAnaliseComparacao.$inferSelect;
export type InsertLogAnaliseComparacao = typeof logAnaliseComparacao.$inferInsert;


// ============================================================
// MÃ“DULO NFS-e - GestÃ£o de Notas Fiscais de ServiÃ§o
// ============================================================

/**
 * ConfiguraÃ§Ã£o de hospitais para emissÃ£o de NFS-e
 * Armazena credenciais de acesso ao portal de NFS-e de cada hospital/unidade
 */
export const nfseHospitais = mysqlTable("nfse_hospitais", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId"), // Vincula ao estabelecimento do sistema
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  cpfNf: varchar("cpfNf", { length: 20 }), // CPF para acesso ao portal NFS-e
  senhaNf: varchar("senhaNf", { length: 255 }), // Senha do portal NFS-e
  endereco: text("endereco"),
  telefone: varchar("telefone", { length: 20 }),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabelecimentoIdx: index("idx_nfse_hosp_estab").on(table.estabelecimentoId),
}));

export type NfseHospital = typeof nfseHospitais.$inferSelect;
export type InsertNfseHospital = typeof nfseHospitais.$inferInsert;

/**
 * ConvÃªnios para NFS-e
 * Separado dos convÃªnios de faturamento para flexibilidade
 */
export const nfseConvenios = mysqlTable("nfse_convenios", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  codigo: varchar("codigo", { length: 50 }),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NfseConvenio = typeof nfseConvenios.$inferSelect;
export type InsertNfseConvenio = typeof nfseConvenios.$inferInsert;

/**
 * Notas Fiscais de ServiÃ§o (NFS-e)
 * Registro completo de cada nota fiscal emitida
 */
export const nfseNotas = mysqlTable("nfse_notas", {
  id: int("id").autoincrement().primaryKey(),
  hospitalId: int("hospitalId").notNull(), // FK para nfse_hospitais
  convenioId: int("convenioId"), // FK para nfse_convenios (opcional)
  numeroNf: varchar("numeroNf", { length: 50 }).notNull(),
  dataEmissao: date("dataEmissao").notNull(),
  dataFaturamento: date("dataFaturamento"),
  valorBruto: decimal("valorBruto", { precision: 15, scale: 2 }).default("0").notNull(),
  valorLiquido: decimal("valorLiquido", { precision: 15, scale: 2 }).default("0").notNull(),
  xmlDemonstrativoEmitido: mysqlEnum("xmlDemonstrativoEmitido", ["sim", "nao"]).default("nao").notNull(),
  nfEmitida: mysqlEnum("nfEmitida", ["sim", "nao"]).default("nao").notNull(),
  observacoes: text("observacoes"),
  pdfUrl: text("pdfUrl"), // URL do PDF no S3
  pdfKey: varchar("pdfKey", { length: 512 }), // Chave do PDF no S3
  userId: int("userId"), // Quem criou o registro
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  hospitalIdx: index("idx_nfse_nota_hospital").on(table.hospitalId),
  convenioIdx: index("idx_nfse_nota_convenio").on(table.convenioId),
  dataEmissaoIdx: index("idx_nfse_nota_emissao").on(table.dataEmissao),
  nfEmitidaIdx: index("idx_nfse_nota_emitida").on(table.nfEmitida),
}));

export type NfseNota = typeof nfseNotas.$inferSelect;
export type InsertNfseNota = typeof nfseNotas.$inferInsert;


// ============================================================
// MÃ“DULO FINANCEIRO
// ============================================================

/**
 * Empresas/CNPJs do mÃ³dulo financeiro (vinculadas a estabelecimentos)
 */
export const finEmpresas = mysqlTable("fin_empresas", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId"), // FK para estabelecimentos (opcional)
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabIdx: index("idx_fin_empresa_estab").on(table.estabelecimentoId),
}));

export type FinEmpresa = typeof finEmpresas.$inferSelect;
export type InsertFinEmpresa = typeof finEmpresas.$inferInsert;

/**
 * Clientes do mÃ³dulo financeiro
 */
export const finClientes = mysqlTable("fin_clientes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"), // FK para fin_empresas
  nome: varchar("nome", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }),
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 20 }),
  valorContrato: decimal("valorContrato", { precision: 15, scale: 2 }),
  cep: varchar("cep", { length: 10 }),
  endereco: text("endereco"),
  numero: varchar("numero", { length: 20 }),
  complemento: varchar("complemento", { length: 255 }),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),
  uf: varchar("uf", { length: 2 }),
  cnpjSafatle: varchar("cnpjSafatle", { length: 20 }).default("24.785.393/0001-54"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  empresaIdx: index("idx_fin_cliente_empresa").on(table.empresaId),
}));

export type FinCliente = typeof finClientes.$inferSelect;
export type InsertFinCliente = typeof finClientes.$inferInsert;

/**
 * Categorias de despesa do mÃ³dulo financeiro
 */
export const finCategorias = mysqlTable("fin_categorias", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinCategoria = typeof finCategorias.$inferSelect;
export type InsertFinCategoria = typeof finCategorias.$inferInsert;

/**
 * Tipos de pagamento
 */
export const finTiposPagamento = mysqlTable("fin_tipos_pagamento", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  categoriaId: int("categoriaId"), // FK para fin_categorias
  custoId: int("custoId"), // FK para fin_custos
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinTipoPagamento = typeof finTiposPagamento.$inferSelect;
export type InsertFinTipoPagamento = typeof finTiposPagamento.$inferInsert;

/**
 * Tipos de recebÃ­vel
 */
export const finTiposRecebivel = mysqlTable("fin_tipos_recebivel", {
  id: int("id").autoincrement().primaryKey(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinTipoRecebivel = typeof finTiposRecebivel.$inferSelect;
export type InsertFinTipoRecebivel = typeof finTiposRecebivel.$inferInsert;

/**
 * Contas bancÃ¡rias
 */
export const finBancos = mysqlTable("fin_bancos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#3b82f6"),
  saldoInicial: decimal("saldoInicial", { precision: 15, scale: 2 }).default("0"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinBanco = typeof finBancos.$inferSelect;
export type InsertFinBanco = typeof finBancos.$inferInsert;

/**
 * Custos fixos e variÃ¡veis
 */
export const finCustos = mysqlTable("fin_custos", {
  id: int("id").autoincrement().primaryKey(),
  categoriaId: int("categoriaId"), // FK para fin_categorias
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).default("0").notNull(),
  tipo: mysqlEnum("tipo", ["fixo", "variavel"]).default("fixo").notNull(),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FinCusto = typeof finCustos.$inferSelect;
export type InsertFinCusto = typeof finCustos.$inferInsert;

/**
 * TransaÃ§Ãµes (Contas a Pagar)
 */
export const finTransacoes = mysqlTable("fin_transacoes", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"), // FK para fin_empresas
  categoriaId: int("categoriaId"), // FK para fin_categorias
  tipoId: int("tipoId"), // FK para fin_tipos_pagamento
  custoId: int("custoId"), // FK para fin_custos
  bancoId: int("bancoId"), // FK para fin_bancos
  centroCustoId: int("centroCustoId"), // FK para fin_centros_custo
  descricao: varchar("descricao", { length: 500 }).notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).default("0").notNull(),
  dataVencimento: date("dataVencimento").notNull(),
  dataPagamento: date("dataPagamento"),
  pago: mysqlEnum("pago", ["sim", "nao"]).default("nao").notNull(),
  observacoes: text("observacoes"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  empresaIdx: index("idx_fin_transacao_empresa").on(table.empresaId),
  categoriaIdx: index("idx_fin_transacao_categoria").on(table.categoriaId),
  vencimentoIdx: index("idx_fin_transacao_vencimento").on(table.dataVencimento),
  pagoIdx: index("idx_fin_transacao_pago").on(table.pago),
}));

export type FinTransacao = typeof finTransacoes.$inferSelect;
export type InsertFinTransacao = typeof finTransacoes.$inferInsert;

/**
 * RecebÃ­veis (Contas a Receber)
 */
export const finRecebiveis = mysqlTable("fin_recebiveis", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"), // FK para fin_empresas
  clienteId: int("clienteId"), // FK para fin_clientes
  tipoId: int("tipoId"), // FK para fin_tipos_recebivel
  bancoId: int("bancoId"), // FK para fin_bancos
  descricao: varchar("descricao", { length: 500 }).notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).default("0").notNull(),
  dataVencimento: date("dataVencimento").notNull(),
  dataRecebimento: date("dataRecebimento"),
  recebido: mysqlEnum("recebido", ["sim", "nao"]).default("nao").notNull(),
  tipoServico: varchar("tipoServico", { length: 255 }), // Tipo de ServiÃ§o (ex: Consulta, Exame, Cirurgia, InternaÃ§Ã£o)
  descricaoServico: text("descricaoServico"), // DescriÃ§Ã£o detalhada do serviÃ§o prestado
  boletoSolicitacaoId: varchar("boletoSolicitacaoId", { length: 100 }),
  boletoLinhaDigitavel: varchar("boletoLinhaDigitavel", { length: 100 }),
  boletoPixCopiaCola: text("boletoPixCopiaCola"),
  notaFiscalKey: varchar("notaFiscalKey", { length: 255 }),
  emailEnviado: mysqlEnum("emailEnviado", ["sim", "nao"]).default("nao").notNull(),
  observacoes: text("observacoes"),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  empresaIdx: index("idx_fin_recebivel_empresa").on(table.empresaId),
  clienteIdx: index("idx_fin_recebivel_cliente").on(table.clienteId),
  vencimentoIdx: index("idx_fin_recebivel_vencimento").on(table.dataVencimento),
  recebidoIdx: index("idx_fin_recebivel_recebido").on(table.recebido),
}));

export type FinRecebivel = typeof finRecebiveis.$inferSelect;
export type InsertFinRecebivel = typeof finRecebiveis.$inferInsert;

/**
 * Extratos bancÃ¡rios
 */
export const finExtratos = mysqlTable("fin_extratos", {
  id: int("id").autoincrement().primaryKey(),
  bancoId: int("bancoId").notNull(), // FK para fin_bancos
  data: date("data").notNull(),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  valor: decimal("valor", { precision: 15, scale: 2 }).default("0").notNull(),
  tipo: mysqlEnum("tipo", ["credito", "debito"]).notNull(),
  conciliado: mysqlEnum("conciliado", ["sim", "nao"]).default("nao").notNull(),
  transacaoId: int("transacaoId"), // FK para fin_transacoes (quando conciliado)
  recebivelId: int("recebivelId"), // FK para fin_recebiveis (quando conciliado)
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  bancoIdx: index("idx_fin_extrato_banco").on(table.bancoId),
  dataIdx: index("idx_fin_extrato_data").on(table.data),
  conciliadoIdx: index("idx_fin_extrato_conciliado").on(table.conciliado),
}));

export type FinExtrato = typeof finExtratos.$inferSelect;
export type InsertFinExtrato = typeof finExtratos.$inferInsert;

/**
 * PrevisÃ£o de receita/faturamento
 */
export const finPrevisaoReceita = mysqlTable("fin_previsao_receita", {
  id: int("id").autoincrement().primaryKey(),
  empresaId: int("empresaId"), // FK para fin_empresas
  dataPrevisao: date("dataPrevisao").notNull(),
  valorPrevisto: decimal("valorPrevisto", { precision: 15, scale: 2 }).default("0").notNull(),
  valorRealizado: decimal("valorRealizado", { precision: 15, scale: 2 }),
  descricao: varchar("descricao", { length: 500 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  empresaIdx: index("idx_fin_previsao_empresa").on(table.empresaId),
  dataIdx: index("idx_fin_previsao_data").on(table.dataPrevisao),
}));

export type FinPrevisaoReceita = typeof finPrevisaoReceita.$inferSelect;
export type InsertFinPrevisaoReceita = typeof finPrevisaoReceita.$inferInsert;

// ============================================================
// CENTROS DE CUSTO
// ============================================================

/**
 * Centros de Custo
 */
export const finCentrosCusto = mysqlTable("fin_centros_custo", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  responsavel: varchar("responsavel", { length: 255 }),
  orcamentoMensal: decimal("orcamentoMensal", { precision: 15, scale: 2 }),
  ativo: mysqlEnum("ativo", ["sim", "nao"]).default("sim").notNull(),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codigoIdx: index("idx_fin_cc_codigo").on(table.codigo),
  ativoIdx: index("idx_fin_cc_ativo").on(table.ativo),
}));

export type FinCentroCusto = typeof finCentrosCusto.$inferSelect;
export type InsertFinCentroCusto = typeof finCentrosCusto.$inferInsert;

// ============================================================
// MÃ“DULO CONTRATOS
// ============================================================

/**
 * Contratos hospitalares
 */
export const contratos = mysqlTable("contratos", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId"), // FK para estabelecimentos
  contratanteNome: varchar("contratanteNome", { length: 255 }).notNull(),
  contratanteCnpj: varchar("contratanteCnpj", { length: 20 }),
  contratadaNome: varchar("contratadaNome", { length: 255 }),
  contratadaCnpj: varchar("contratadaCnpj", { length: 20 }),
  servicos: json("servicos"), // Array de serviÃ§os selecionados
  modelosCobranca: json("modelosCobranca"), // Array de modelos de cobranÃ§a
  valorMensal: decimal("valorMensal", { precision: 15, scale: 2 }),
  valorHora: decimal("valorHora", { precision: 15, scale: 2 }),
  valorPercentualConvenio: decimal("valorPercentualConvenio", { precision: 5, scale: 2 }),
  prazoContrato: int("prazoContrato"), // Em meses
  dataInicio: date("dataInicio"),
  dataFim: date("dataFim"),
  status: mysqlEnum("status", ["rascunho", "ativo", "suspenso", "encerrado", "renovacao"]).default("rascunho").notNull(),
  dadosCompletos: json("dadosCompletos"), // JSON com todas as clÃ¡usulas e seÃ§Ãµes
  docxUrl: text("docxUrl"), // URL do DOCX no S3
  docxKey: varchar("docxKey", { length: 512 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabIdx: index("idx_contrato_estab").on(table.estabelecimentoId),
  statusIdx: index("idx_contrato_status").on(table.status),
  dataFimIdx: index("idx_contrato_data_fim").on(table.dataFim),
}));

export type Contrato = typeof contratos.$inferSelect;
export type InsertContrato = typeof contratos.$inferInsert;

/**
 * HistÃ³rico de alteraÃ§Ãµes e reajustes de contratos
 */
export const contratosHistorico = mysqlTable("contratos_historico", {
  id: int("id").autoincrement().primaryKey(),
  contratoId: int("contratoId").notNull(), // FK para contratos
  tipo: mysqlEnum("tipo", ["criacao", "alteracao", "reajuste", "renovacao", "suspensao", "encerramento"]).notNull(),
  descricao: text("descricao"),
  valorAnterior: decimal("valorAnterior", { precision: 15, scale: 2 }),
  valorNovo: decimal("valorNovo", { precision: 15, scale: 2 }),
  indiceReajuste: varchar("indiceReajuste", { length: 50 }), // IGPM, IPCA, etc.
  percentualReajuste: decimal("percentualReajuste", { precision: 5, scale: 2 }),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  contratoIdx: index("idx_contrato_hist_contrato").on(table.contratoId),
}));

export type ContratoHistorico = typeof contratosHistorico.$inferSelect;
export type InsertContratoHistorico = typeof contratosHistorico.$inferInsert;

// ============================================================
// MÃ“DULO PROPOSTAS
// ============================================================

/**
 * Propostas comerciais
 */
export const propostas = mysqlTable("propostas", {
  id: int("id").autoincrement().primaryKey(),
  estabelecimentoId: int("estabelecimentoId"), // FK para estabelecimentos
  numero: varchar("numero", { length: 50 }).notNull(), // Ex: PROP-2026-0001
  titulo: varchar("titulo", { length: 255 }).notNull(),
  cliente: varchar("cliente", { length: 255 }).notNull(),
  tipoCliente: mysqlEnum("tipoCliente", ["hospital", "clinica", "laboratorio", "plano_saude", "governo"]).default("hospital").notNull(),
  responsavel: varchar("responsavel", { length: 255 }),
  status: mysqlEnum("status", ["rascunho", "aguardando", "aprovada", "recusada", "negociando"]).default("rascunho").notNull(),
  valorTotal: decimal("valorTotal", { precision: 15, scale: 2 }).default("0").notNull(),
  condicoesPagamento: varchar("condicoesPagamento", { length: 255 }),
  validadeDias: int("validadeDias").default(30),
  dataExpiracao: date("dataExpiracao"),
  observacoes: text("observacoes"),
  contratoId: int("contratoId"), // FK para contratos (quando convertida)
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  estabIdx: index("idx_proposta_estab").on(table.estabelecimentoId),
  statusIdx: index("idx_proposta_status").on(table.status),
  clienteIdx: index("idx_proposta_cliente").on(table.cliente),
}));

export type Proposta = typeof propostas.$inferSelect;
export type InsertProposta = typeof propostas.$inferInsert;

/**
 * Itens de serviÃ§o das propostas
 */
export const propostaItens = mysqlTable("proposta_itens", {
  id: int("id").autoincrement().primaryKey(),
  propostaId: int("propostaId").notNull(), // FK para propostas
  codigo: varchar("codigo", { length: 50 }),
  descricao: varchar("descricao", { length: 500 }).notNull(),
  categoria: varchar("categoria", { length: 100 }),
  unidade: varchar("unidade", { length: 50 }).default("Unidade"),
  quantidade: int("quantidade").default(1).notNull(),
  precoUnitario: decimal("precoUnitario", { precision: 15, scale: 2 }).default("0").notNull(),
  desconto: decimal("desconto", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  propostaIdx: index("idx_proposta_item_proposta").on(table.propostaId),
}));

export type PropostaItem = typeof propostaItens.$inferSelect;
export type InsertPropostaItem = typeof propostaItens.$inferInsert;


// ============================================================
// TASY FATURADO STAGING - ImportaÃ§Ã£o bruta de dados Tasy
// ============================================================

/**
 * Tabela TASY.FATURADO.STAGING
 * Armazena dados brutos importados do CSV do Tasy (Hemolabor/Ipasgo/etc.)
 * Campos de valor armazenados como TEXT para preservar formato original
 * (o CSV usa vÃ­rgula como separador decimal E como separador de campos)
 */
export const tasyFaturadoStaging = mysqlTable("tasy_faturado_staging", {
  id: int("id").autoincrement().primaryKey(),
  
  // IdentificaÃ§Ã£o da importaÃ§Ã£o
  importacaoId: int("importacaoId"), // ReferÃªncia Ã  importaÃ§Ã£o que trouxe este registro
  estabelecimentoId: int("estabelecimentoId"),
  
  // Campos do CSV (0-38: campos fixos)
  estabelecimento: varchar("estabelecimento", { length: 255 }),       // 0
  sequencia: varchar("sequencia", { length: 100 }),                   // 1
  convenio: varchar("convenio", { length: 255 }),                     // 2
  prod: varchar("prod", { length: 100 }),                             // 3
  competencia: varchar("competencia", { length: 20 }),                // 4
  dtReferencia: varchar("dtReferencia", { length: 50 }),              // 5
  entrega: varchar("entrega", { length: 50 }),                        // 6
  protocolo: varchar("protocolo", { length: 100 }),                   // 7
  nrProtocolo: varchar("nrProtocolo", { length: 100 }),               // 8
  nrTitulo: varchar("nrTitulo", { length: 100 }),                     // 9
  nmUsuario: varchar("nmUsuario", { length: 255 }),                   // 10
  dtAtualizacao: varchar("dtAtualizacao", { length: 50 }),            // 11
  statusProt: varchar("statusProt", { length: 100 }),                 // 12
  tipoProt: varchar("tipoProt", { length: 100 }),                     // 13
  docConvenio: varchar("docConvenio", { length: 100 }),               // 14
  atend: varchar("atend", { length: 50 }),                            // 15
  entrada: varchar("entrada", { length: 50 }),                        // 16
  stEntrada: varchar("stEntrada", { length: 100 }),                   // 17
  conta: varchar("conta", { length: 50 }),                            // 18
  autorizacao: varchar("autorizacao", { length: 100 }),               // 19
  senha: varchar("senha", { length: 100 }),                           // 20
  dtInicio: varchar("dtInicio", { length: 50 }),                      // 21
  dtFim: varchar("dtFim", { length: 50 }),                            // 22
  encerramento: varchar("encerramento", { length: 50 }),              // 23
  matricula: varchar("matricula", { length: 100 }),                   // 24
  paciente: varchar("paciente", { length: 255 }),                     // 25
  cdMotivoExcConta: varchar("cdMotivoExcConta", { length: 100 }),     // 26
  dsComplMotivoExcon: text("dsComplMotivoExcon"),                     // 27
  tipo: varchar("tipo", { length: 100 }),                             // 28
  tipoItem: varchar("tipoItem", { length: 100 }),                    // 29
  setor: varchar("setor", { length: 255 }),                           // 30
  profExec: varchar("profExec", { length: 255 }),                     // 31
  crm: varchar("crm", { length: 50 }),                                // 32
  cdItem: varchar("cdItem", { length: 50 }),                          // 33
  cdItemTuss: varchar("cdItemTuss", { length: 50 }),                  // 34
  dtItem: varchar("dtItem", { length: 50 }),                          // 35
  descricao: text("descricao"),                                       // 36
  credito: varchar("credito", { length: 10 }),                        // 37
  qtd: varchar("qtd", { length: 20 }),                                // 38
  
  // Campos de valor (39-45) - armazenados como TEXT para preservar formato original
  // Os valores no CSV usam vÃ­rgula decimal (ex: "11,02") que conflita com separador CSV
  // Armazenamos o bloco bruto de valores para parsing posterior
  valoresRaw: text("valoresRaw"),  // Campos 39-45 concatenados com pipe: "11,02|0|0|0|11,02|0|0"
  
  // Campos de valor parseados (preenchidos quando possÃ­vel)
  vlProduzido: decimal("vlProduzido", { precision: 14, scale: 2 }),
  vlMedico: decimal("vlMedico", { precision: 14, scale: 2 }),
  aReceber: decimal("aReceber", { precision: 14, scale: 2 }),
  vlPago: decimal("vlPago", { precision: 14, scale: 2 }),
  vlGlosa: decimal("vlGlosa", { precision: 14, scale: 2 }),
  vlAmaior: decimal("vlAmaior", { precision: 14, scale: 2 }),
  tReceb: decimal("tReceb", { precision: 14, scale: 2 }),
  
  // Campos finais (46-49)
  motivoGlosa: text("motivoGlosa"),                                   // 46
  retorno: varchar("retorno", { length: 50 }),                        // 47
  pgto: varchar("pgto", { length: 20 }),                              // 48 - CompetÃªncia do pagamento
  dtPgto: varchar("dtPgto", { length: 50 }),                          // 49 - Data do pagamento
  
  // Metadados
  linhaOriginal: int("linhaOriginal"), // NÃºmero da linha no CSV original
  parseStatus: mysqlEnum("parseStatus", ["ok", "ambiguo", "erro"]).default("ok").notNull(),
  parseNotas: text("parseNotas"), // Notas sobre problemas de parsing
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  importacaoIdx: index("idx_tfs_importacao").on(table.importacaoId),
  estabIdx: index("idx_tfs_estab").on(table.estabelecimentoId),
  convenioIdx: index("idx_tfs_convenio").on(table.convenio),
  competenciaIdx: index("idx_tfs_competencia").on(table.competencia),
  sequenciaIdx: index("idx_tfs_sequencia").on(table.sequencia),
  contaIdx: index("idx_tfs_conta").on(table.conta),
  atendIdx: index("idx_tfs_atend").on(table.atend),
  parseStatusIdx: index("idx_tfs_parse_status").on(table.parseStatus),
}));

export type TasyFaturadoStaging = typeof tasyFaturadoStaging.$inferSelect;
export type InsertTasyFaturadoStaging = typeof tasyFaturadoStaging.$inferInsert;

/**
 * MÃ“DULO DE AUDITORIA DE SISTEMA
 * Tabela para armazenar logs globais de aÃ§Ãµes dos usuÃ¡rios
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull(),
  userNome: varchar("userNome", { length: 255 }),
  acao: mysqlEnum("acao", ["CRIAR", "EDITAR", "EXCLUIR", "ACESSO", "SISTEMA"]).notNull(),
  entidade: varchar("entidade", { length: 255 }).notNull(), // ex: 'usuario', 'convenio', 'integrador', 'auth'
  entidadeId: varchar("entidadeId", { length: 255 }), // ID do registro afetado (opcional)
  detalhes: json("detalhes"), // Payload JSON com contexto ou diff de mudanÃ§as
  ipAddress: varchar("ipAddress", { length: 45 }), // Para IPv4 ou IPv6
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GlobalAuditLog = typeof auditLogs.$inferSelect;
export type InsertGlobalAuditLog = typeof auditLogs.$inferInsert;


export const recebimentoUnificado = mysqlTable("recebimento_unificado", {
  id: int("id").primaryKey().autoincrement(),
  origemSistema: varchar("origemSistema", { length: 50 }).notNull(),
  origemId: varchar("origemId", { length: 100 }),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  convenioId: int("convenioId"),
  convenio: varchar("convenio", { length: 255 }),
  numeroConta: varchar("numeroConta", { length: 100 }),
  numeroGuia: varchar("numeroGuia", { length: 50 }),
  numeroGuiaOperadora: varchar("numeroGuiaOperadora", { length: 50 }),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  carteiraBeneficiario: varchar("carteiraBeneficiario", { length: 50 }),
  competencia: varchar("competencia", { length: 20 }),
  tipoItem: varchar("tipoItem", { length: 50 }),
  codigoItem: varchar("codigoItem", { length: 50 }),
  descricaoItem: text("descricaoItem"),
  quantidade: decimal("quantidade", { precision: 12, scale: 4 }),
  valorFaturado: decimal("valorFaturado", { precision: 12, scale: 4 }),
  valorPago: decimal("valorPago", { precision: 12, scale: 4 }),
  valorGlosa: decimal("valorGlosa", { precision: 12, scale: 4 }),
  motivoGlosa: text("motivoGlosa"),
  codigoGlosa: varchar("codigoGlosa", { length: 50 }),
  dataExecucao: datetime("dataExecucao"),
  dataPagamento: datetime("dataPagamento"),
  codigoPrestadorExecutante: varchar("codigoPrestadorExecutante", { length: 50 }),
  statusConciliacao: varchar("statusConciliacao", { length: 50 }),
  arquivoId: int("arquivoId"),
  criadoEm: timestamp("criadoEm").defaultNow(),
  atualizadoEm: timestamp("atualizadoEm").defaultNow().onUpdateNow(),
});

export type InsertRecebimentoUnificado = typeof recebimentoUnificado.$inferInsert;
export type SelectRecebimentoUnificado = typeof recebimentoUnificado.$inferSelect;


export const staging_faturamento_warleine = mysqlTable("staging_faturamento_warleine", {
  id: int("id").primaryKey().autoincrement(),
  importacaoId: int("importacaoId"),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Mapeamento Primario (Basico para De/Para)
  numeroConta: varchar("numeroConta", { length: 100 }),
  numeroGuia: varchar("numeroGuia", { length: 100 }),
  convenioNome: varchar("convenioNome", { length: 255 }),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  
  // Dados do Item
  codigoItem: varchar("codigoItem", { length: 100 }),
  descricaoItem: text("descricaoItem"),
  quantidade: decimal("quantidade", { precision: 12, scale: 4 }),
  valorUnitario: decimal("valorUnitario", { precision: 12, scale: 4 }),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 4 }),
  
  dataExecucao: datetime("dataExecucao"),
  competencia: varchar("competencia", { length: 20 }),
  
  // Dump Completo do Original
  rawData: json("rawData"),
  
  processado: boolean("processado").default(false),
  criadoEm: timestamp("criadoEm").defaultNow(),
});
export type InsertStagingFaturamentoWarleine = typeof staging_faturamento_warleine.$inferInsert;
export type SelectStagingFaturamentoWarleine = typeof staging_faturamento_warleine.$inferSelect;


export const staging_faturamento_omni = mysqlTable("staging_faturamento_omni", {
  id: int("id").primaryKey().autoincrement(),
  importacaoId: int("importacaoId"),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Mapeamento Primario (Basico para De/Para)
  numeroConta: varchar("numeroConta", { length: 100 }),
  numeroGuia: varchar("numeroGuia", { length: 100 }),
  convenioNome: varchar("convenioNome", { length: 255 }),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  
  // Dados do Item
  codigoItem: varchar("codigoItem", { length: 100 }),
  descricaoItem: text("descricaoItem"),
  quantidade: decimal("quantidade", { precision: 12, scale: 4 }),
  valorUnitario: decimal("valorUnitario", { precision: 12, scale: 4 }),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 4 }),
  
  dataExecucao: datetime("dataExecucao"),
  competencia: varchar("competencia", { length: 20 }),
  
  // Dump Completo do Original
  rawData: json("rawData"),
  
  processado: boolean("processado").default(false),
  criadoEm: timestamp("criadoEm").defaultNow(),
});
export type InsertStagingFaturamentoOmni = typeof staging_faturamento_omni.$inferInsert;
export type SelectStagingFaturamentoOmni = typeof staging_faturamento_omni.$inferSelect;


export const staging_faturamento_promedico = mysqlTable("staging_faturamento_promedico", {
  id: int("id").primaryKey().autoincrement(),
  importacaoId: int("importacaoId"),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Mapeamento Primario (Basico para De/Para)
  numeroConta: varchar("numeroConta", { length: 100 }),
  numeroGuia: varchar("numeroGuia", { length: 100 }),
  convenioNome: varchar("convenioNome", { length: 255 }),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  
  // Dados do Item
  codigoItem: varchar("codigoItem", { length: 100 }),
  descricaoItem: text("descricaoItem"),
  quantidade: decimal("quantidade", { precision: 12, scale: 4 }),
  valorUnitario: decimal("valorUnitario", { precision: 12, scale: 4 }),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 4 }),
  
  dataExecucao: datetime("dataExecucao"),
  competencia: varchar("competencia", { length: 20 }),
  
  // Dump Completo do Original
  rawData: json("rawData"),
  
  processado: boolean("processado").default(false),
  criadoEm: timestamp("criadoEm").defaultNow(),
});
export type InsertStagingFaturamentoPromedico = typeof staging_faturamento_promedico.$inferInsert;
export type SelectStagingFaturamentoPromedico = typeof staging_faturamento_promedico.$inferSelect;


export const staging_faturamento_easyvision = mysqlTable("staging_faturamento_easyvision", {
  id: int("id").primaryKey().autoincrement(),
  importacaoId: int("importacaoId"),
  estabelecimentoId: int("estabelecimentoId").notNull(),
  
  // Mapeamento Primario (Basico para De/Para)
  numeroConta: varchar("numeroConta", { length: 100 }),
  numeroGuia: varchar("numeroGuia", { length: 100 }),
  convenioNome: varchar("convenioNome", { length: 255 }),
  pacienteNome: varchar("pacienteNome", { length: 255 }),
  
  // Dados do Item
  codigoItem: varchar("codigoItem", { length: 100 }),
  descricaoItem: text("descricaoItem"),
  quantidade: decimal("quantidade", { precision: 12, scale: 4 }),
  valorUnitario: decimal("valorUnitario", { precision: 12, scale: 4 }),
  valorTotal: decimal("valorTotal", { precision: 12, scale: 4 }),
  
  dataExecucao: datetime("dataExecucao"),
  competencia: varchar("competencia", { length: 20 }),
  
  // Dump Completo do Original
  rawData: json("rawData"),
  
  processado: boolean("processado").default(false),
  criadoEm: timestamp("criadoEm").defaultNow(),
});
export type InsertStagingFaturamentoEasyvision = typeof staging_faturamento_easyvision.$inferInsert;
export type SelectStagingFaturamentoEasyvision = typeof staging_faturamento_easyvision.$inferSelect;

