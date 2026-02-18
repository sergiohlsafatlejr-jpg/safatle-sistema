/**
 * Schemas de validação centralizados
 * Reutilizáveis em todas as procedures
 * 
 * Uso:
 * .input(faturamentoSchemas.create)
 * .input(faturamentoSchemas.filter)
 */

import { z } from "zod";

// Validadores reutilizáveis
export const validators = {
  // IDs
  id: z.number().int().positive("ID deve ser um número positivo"),
  
  // Valores monetários
  valor: z
    .number()
    .nonnegative("Valor não pode ser negativo")
    .max(999999999.99, "Valor muito grande"),
  
  percentual: z
    .number()
    .min(0, "Percentual não pode ser menor que 0")
    .max(100, "Percentual não pode ser maior que 100"),
  
  // Datas
  data: z.date(),
  dataPassada: z
    .date()
    .refine(d => d <= new Date(), "Data não pode ser futura"),
  dataFutura: z
    .date()
    .refine(d => d >= new Date(), "Data não pode ser passada"),
  
  // Strings
  nome: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(255, "Nome muito longo")
    .trim(),
  
  descricao: z
    .string()
    .max(1000, "Descrição muito longa")
    .trim(),
  
  codigo: z
    .string()
    .regex(/^[A-Z0-9\-]+$/, "Código deve conter apenas letras maiúsculas, números e hífen"),
  
  email: z
    .string()
    .email("Email inválido"),
  
  // Enums
  status: z.enum(["pendente", "processado", "erro"]),
  tipoArquivo: z.enum(["xml", "excel", "pdf", "csv"]),
};

// Schemas de domínio
export const faturamentoSchemas = {
  create: z.object({
    estabelecimentoId: validators.id,
    convenioId: validators.id,
    valor: validators.valor,
    dataReferencia: validators.data,
    descricao: validators.descricao.optional(),
  }),
  
  update: z.object({
    id: validators.id,
    valor: validators.valor.optional(),
    descricao: validators.descricao.optional(),
  }),
  
  filter: z.object({
    estabelecimentoId: validators.id,
    status: validators.status.optional(),
    dataInicio: validators.dataPassada.optional(),
    dataFim: validators.dataPassada.optional(),
    limit: z.number().int().min(1).max(1000).default(50),
    offset: z.number().int().nonnegative().default(0),
  }),
};

export const glosasSchemas = {
  create: z.object({
    faturamentoId: validators.id,
    motivo: validators.codigo,
    valor: validators.valor,
    descricao: validators.descricao,
  }),
  
  update: z.object({
    id: validators.id,
    valor: validators.valor.optional(),
    descricao: validators.descricao.optional(),
  }),
};

export const comparacoesSchemas = {
  create: z.object({
    arquivoEnviadoId: validators.id,
    arquivoRetornadoId: validators.id,
  }),
};
