/**
 * Funções para merge inteligente de registros
 * Detecta mudanças e atualiza apenas campos que foram alterados
 */

export interface MergeResult {
  acao: "criado" | "atualizado" | "sem_alteracao";
  registroId: number;
  camposAlterados: string[];
  valoresAntigos?: Record<string, any>;
  valoresNovos?: Record<string, any>;
}

/**
 * Compara dois registros e retorna os campos que mudaram
 * @param registroAntigo Registro anterior (do banco)
 * @param registroNovo Registro novo (dos dados sincronizados)
 * @param camposIgnorar Campos que não devem ser comparados (ex: id, timestamps)
 * @returns Objeto com campos alterados e seus valores
 */
export function detectarMudancas(
  registroAntigo: Record<string, any>,
  registroNovo: Record<string, any>,
  camposIgnorar: string[] = ["id", "criadoEm", "atualizadoEm", "dataSincronizacao"]
): {
  temMudancas: boolean;
  camposAlterados: string[];
  valoresAntigos: Record<string, any>;
  valoresNovos: Record<string, any>;
} {
  const camposAlterados: string[] = [];
  const valoresAntigos: Record<string, any> = {};
  const valoresNovos: Record<string, any> = {};

  // Iterar sobre todos os campos do registro novo
  for (const campo of Object.keys(registroNovo)) {
    if (camposIgnorar.includes(campo)) continue;

    const valorAntigo = registroAntigo[campo];
    const valorNovo = registroNovo[campo];

    // Comparar valores (considerando null/undefined como iguais)
    if (!saoIguais(valorAntigo, valorNovo)) {
      camposAlterados.push(campo);
      valoresAntigos[campo] = valorAntigo;
      valoresNovos[campo] = valorNovo;
    }
  }

  return {
    temMudancas: camposAlterados.length > 0,
    camposAlterados,
    valoresAntigos,
    valoresNovos,
  };
}

/**
 * Compara dois valores considerando tipos diferentes
 * Trata null, undefined, strings vazias como equivalentes em alguns casos
 */
function saoIguais(valor1: any, valor2: any): boolean {
  // Se são exatamente iguais
  if (valor1 === valor2) return true;

  // Se ambos são null/undefined
  if ((valor1 == null || valor1 === "") && (valor2 == null || valor2 === "")) {
    return true;
  }

  // Se são datas, comparar timestamps
  if (valor1 instanceof Date && valor2 instanceof Date) {
    return valor1.getTime() === valor2.getTime();
  }

  // Se um é data e outro é timestamp
  if (valor1 instanceof Date && typeof valor2 === "number") {
    return valor1.getTime() === valor2;
  }

  if (typeof valor1 === "number" && valor2 instanceof Date) {
    return valor1 === valor2.getTime();
  }

  // Se são números, comparar com tolerância
  if (typeof valor1 === "number" && typeof valor2 === "number") {
    return Math.abs(valor1 - valor2) < 0.01; // Tolerância de 0.01
  }

  // Se são strings, comparar normalizadas (trim, lowercase)
  if (typeof valor1 === "string" && typeof valor2 === "string") {
    return valor1.trim().toLowerCase() === valor2.trim().toLowerCase();
  }

  return false;
}

/**
 * Prepara objeto com apenas os campos que mudaram
 * Útil para UPDATE queries
 */
export function prepararCamposAtualizacao(
  registroAntigo: Record<string, any>,
  registroNovo: Record<string, any>,
  camposIgnorar: string[] = ["id", "criadoEm", "atualizadoEm"]
): Record<string, any> {
  const atualizacoes: Record<string, any> = {};

  for (const campo of Object.keys(registroNovo)) {
    if (camposIgnorar.includes(campo)) continue;

    const valorAntigo = registroAntigo[campo];
    const valorNovo = registroNovo[campo];

    if (!saoIguais(valorAntigo, valorNovo)) {
      atualizacoes[campo] = valorNovo;
    }
  }

  // Sempre atualizar timestamp
  atualizacoes.atualizadoEm = new Date();

  return atualizacoes;
}

/**
 * Calcula estatísticas de merge para um lote de registros
 */
export function calcularEstatisticasMerge(resultados: MergeResult[]): {
  total: number;
  criados: number;
  atualizados: number;
  semAlteracao: number;
  camposAlteradosFrequencia: Record<string, number>;
} {
  const stats = {
    total: resultados.length,
    criados: 0,
    atualizados: 0,
    semAlteracao: 0,
    camposAlteradosFrequencia: {} as Record<string, number>,
  };

  for (const resultado of resultados) {
    if (resultado.acao === "criado") stats.criados++;
    else if (resultado.acao === "atualizado") stats.atualizados++;
    else if (resultado.acao === "sem_alteracao") stats.semAlteracao++;

    // Contar frequência de campos alterados
    for (const campo of resultado.camposAlterados) {
      stats.camposAlteradosFrequencia[campo] =
        (stats.camposAlteradosFrequencia[campo] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Gera relatório de mudanças em formato legível
 */
export function gerarRelatorioCamposAlterados(
  resultado: MergeResult
): string {
  if (resultado.acao === "criado") {
    return `✓ Registro criado (ID: ${resultado.registroId})`;
  }

  if (resultado.acao === "sem_alteracao") {
    return `- Sem alterações (ID: ${resultado.registroId})`;
  }

  const mudancas = resultado.camposAlterados
    .map((campo) => {
      const anterior = resultado.valoresAntigos?.[campo];
      const novo = resultado.valoresNovos?.[campo];
      return `${campo}: "${anterior}" → "${novo}"`;
    })
    .join(", ");

  return `↻ Atualizado (ID: ${resultado.registroId}): ${mudancas}`;
}
