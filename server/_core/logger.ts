/**
 * Logger estruturado com console.log
 * Centraliza todos os logs do sistema
 * 
 * Uso:
 * logOperation('faturamento.create', { id: 123 }, userId, estabelecimentoId);
 * logError('faturamento.create', error, { input });
 * logWarning('faturamento.create', 'Algo estranho aconteceu');
 */

export const logger = {
  /**
   * Log de informação
   */
  info: (data: any) => {
    console.log(
      `[${new Date().toISOString()}] [INFO]`,
      JSON.stringify(data, null, 2)
    );
  },

  /**
   * Log de erro
   */
  error: (data: any) => {
    console.error(
      `[${new Date().toISOString()}] [ERROR]`,
      JSON.stringify(data, null, 2)
    );
  },

  /**
   * Log de aviso
   */
  warn: (data: any) => {
    console.warn(
      `[${new Date().toISOString()}] [WARN]`,
      JSON.stringify(data, null, 2)
    );
  },

  /**
   * Log de debug
   */
  debug: (data: any) => {
    if (process.env.DEBUG === 'true') {
      console.log(
        `[${new Date().toISOString()}] [DEBUG]`,
        JSON.stringify(data, null, 2)
      );
    }
  },
};

/**
 * Log de operação bem-sucedida
 */
export function logOperation(
  operacao: string,
  dados: any,
  usuarioId?: number,
  estabelecimentoId?: number
) {
  logger.info({
    tipo: "operacao",
    operacao,
    usuarioId,
    estabelecimentoId,
    dados,
  });
}

/**
 * Log de erro
 */
export function logError(
  operacao: string,
  erro: any,
  contexto?: any
) {
  logger.error({
    tipo: "erro",
    operacao,
    mensagem: erro instanceof Error ? erro.message : String(erro),
    stack: erro instanceof Error ? erro.stack : undefined,
    contexto,
  });
}

/**
 * Log de aviso
 */
export function logWarning(
  operacao: string,
  mensagem: string,
  contexto?: any
) {
  logger.warn({
    tipo: "aviso",
    operacao,
    mensagem,
    contexto,
  });
}

/**
 * Log de performance
 */
export function logPerformance(
  operacao: string,
  tempoMs: number,
  contexto?: any
) {
  logger.info({
    tipo: "performance",
    operacao,
    tempoMs,
    contexto,
  });
}
