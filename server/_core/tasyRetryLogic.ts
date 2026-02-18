import { logger } from "./logger";
import {
  criarChaveIdempotencia,
  executarComIdempotencia,
  obterEstatisticasIdempotencia,
} from "./idempotency";

/**
 * Retry Logic com Idempotência para Tasy
 * Implementa exponential backoff + idempotência para operações críticas
 */

export interface RetryConfig {
  maxTentativas: number;
  delayInicial: number; // em ms
  delayMaximo: number; // em ms
  fatorExponencial: number;
  jitterPercentual: number; // 0-100
}

export const RETRY_CONFIG_PADRAO: RetryConfig = {
  maxTentativas: 5,
  delayInicial: 1000, // 1 segundo
  delayMaximo: 30000, // 30 segundos
  fatorExponencial: 2,
  jitterPercentual: 20, // 20% de variação
};

/**
 * Calcula delay com exponential backoff + jitter
 */
export function calcularDelay(
  tentativa: number,
  config: RetryConfig = RETRY_CONFIG_PADRAO
): number {
  // Exponential backoff: delay = inicial * (fator ^ tentativa)
  let delay = config.delayInicial * Math.pow(config.fatorExponencial, tentativa);

  // Limitar ao máximo
  delay = Math.min(delay, config.delayMaximo);

  // Adicionar jitter (variação aleatória)
  const jitter = (delay * config.jitterPercentual) / 100;
  const jitterAleatorio = (Math.random() - 0.5) * 2 * jitter;
  delay = Math.max(delay + jitterAleatorio, config.delayInicial);

  return Math.round(delay);
}

/**
 * Aguarda por um tempo específico
 */
export function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executa operação com retry e idempotência
 */
export async function executarComRetry<T>(
  operacao: () => Promise<T>,
  opcoes: {
    nome: string;
    usuarioId: number;
    estabelecimentoId: number;
    dados: any;
    config?: Partial<RetryConfig>;
  }
): Promise<T> {
  const config = { ...RETRY_CONFIG_PADRAO, ...opcoes.config };
  const chaveIdempotencia = criarChaveIdempotencia(
    opcoes.nome,
    opcoes.dados,
    opcoes.usuarioId,
    opcoes.estabelecimentoId
  );

  return executarComIdempotencia(chaveIdempotencia, async () => {
    let ultimoErro: Error | null = null;

    for (let tentativa = 0; tentativa < config.maxTentativas; tentativa++) {
      try {
        logger.info({
          tipo: "tasy_operacao_iniciada",
          nome: opcoes.nome,
          tentativa: tentativa + 1,
          maxTentativas: config.maxTentativas,
          usuarioId: opcoes.usuarioId,
        });

        // Executar operação
        const resultado = await operacao();

        logger.info({
          tipo: "tasy_operacao_sucesso",
          nome: opcoes.nome,
          tentativa: tentativa + 1,
          usuarioId: opcoes.usuarioId,
        });

        return resultado;
      } catch (erro) {
        ultimoErro = erro instanceof Error ? erro : new Error(String(erro));

        // Se for última tentativa, lançar erro
        if (tentativa === config.maxTentativas - 1) {
          logger.error({
            tipo: "tasy_operacao_falha_final",
            nome: opcoes.nome,
            tentativa: tentativa + 1,
            maxTentativas: config.maxTentativas,
            erro: ultimoErro.message,
            usuarioId: opcoes.usuarioId,
          });

          throw ultimoErro;
        }

        // Calcular delay para próxima tentativa
        const delay = calcularDelay(tentativa, config);

        logger.warn({
          tipo: "tasy_operacao_retry",
          nome: opcoes.nome,
          tentativa: tentativa + 1,
          proximaTentativaEm: delay,
          erro: ultimoErro.message,
          usuarioId: opcoes.usuarioId,
        });

        // Aguardar antes de tentar novamente
        await aguardar(delay);
      }
    }

    // Nunca deve chegar aqui, mas por segurança
    throw ultimoErro || new Error("Operação falhou após todas as tentativas");
  });
}

/**
 * Wrapper para importação Tasy com retry
 */
export async function importarTasyComRetry(opcoes: {
  usuarioId: number;
  estabelecimentoId: number;
  arquivo: Buffer;
  tipo: "procedimentos" | "materiais" | "contas" | "itens";
  config?: Partial<RetryConfig>;
}): Promise<{ sucesso: boolean; linhasProcessadas: number; erros: string[] }> {
  return executarComRetry(
    async () => {
      // TODO: Implementar lógica real de importação
      return {
        sucesso: true,
        linhasProcessadas: 0,
        erros: [],
      };
    },
    {
      nome: `importar_tasy_${opcoes.tipo}`,
      usuarioId: opcoes.usuarioId,
      estabelecimentoId: opcoes.estabelecimentoId,
      dados: { tipo: opcoes.tipo, tamanhoArquivo: opcoes.arquivo.length },
      config: opcoes.config,
    }
  );
}

/**
 * Wrapper para sincronização Tasy com retry
 */
export async function sincronizarTasyComRetry(opcoes: {
  usuarioId: number;
  estabelecimentoId: number;
  config?: Partial<RetryConfig>;
}): Promise<{ sucesso: boolean; registrosAtualizados: number }> {
  return executarComRetry(
    async () => {
      // TODO: Implementar lógica real de sincronização
      return {
        sucesso: true,
        registrosAtualizados: 0,
      };
    },
    {
      nome: "sincronizar_tasy",
      usuarioId: opcoes.usuarioId,
      estabelecimentoId: opcoes.estabelecimentoId,
      dados: { tipo: "sincronizacao" },
      config: opcoes.config,
    }
  );
}

/**
 * Obtém estatísticas de retry
 */
export function obterEstatisticasRetry() {
  const idempotencia = obterEstatisticasIdempotencia();

  return {
    idempotencia,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Exemplo de uso:
 *
 * const resultado = await executarComRetry(
 *   async () => {
 *     // Sua operação aqui
 *     return await fazerAlgo();
 *   },
 *   {
 *     nome: "operacao_critica",
 *     usuarioId: 123,
 *     estabelecimentoId: 456,
 *     dados: { param1: "valor1" },
 *     config: {
 *       maxTentativas: 3,
 *       delayInicial: 500,
 *     }
 *   }
 * );
 */
