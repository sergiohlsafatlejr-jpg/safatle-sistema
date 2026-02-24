import { getDb } from "./db";
import { atendimentos } from "../drizzle/schema-integracao";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Busca todos os atendimentos parados (sem data de saída) da tabela unificada
 * @returns Lista de atendimentos parados
 */
export async function getAtendimentosParadosUnificados() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Banco de dados não disponível");
      return [];
    }

    // Buscar todos os atendimentos que não têm data_saida (parados)
    const result = await db
      .select()
      .from(atendimentos)
      .where(isNull(atendimentos.data_saida))
      .orderBy(atendimentos.data_entrada);

    return result;
  } catch (error) {
    console.error("Erro ao buscar atendimentos parados unificados:", error);
    return [];
  }
}

/**
 * Busca atendimentos parados (sem data de saída) da tabela unificada por estabelecimento
 * @param estabelecimentoId - ID do estabelecimento
 * @returns Lista de atendimentos parados
 */
export async function getAtendimentosParadosPorEstabelecimento(estabelecimentoId: number) {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Banco de dados não disponível");
      return [];
    }

    // Buscar atendimentos que não têm data_saida (parados) para um estabelecimento específico
    const result = await db
      .select()
      .from(atendimentos)
      .where(
        and(
          eq(atendimentos.estabelecimentoId, estabelecimentoId),
          isNull(atendimentos.data_saida)
        )
      )
      .orderBy(atendimentos.data_entrada);

    return result;
  } catch (error) {
    console.error("Erro ao buscar atendimentos parados por estabelecimento:", error);
    return [];
  }
}

/**
 * Calcula dias parado para atendimentos unificados
 * @param dataEntrada - Data de entrada do atendimento
 * @param dataSaida - Data de saída (null se parado)
 * @returns Número de dias parado
 */
export function calcularDiasParadoUnificado(dataEntrada?: string | Date, dataSaida?: string | Date): number {
  if (!dataEntrada) return 0;

  const entrada = new Date(dataEntrada);
  const saida = dataSaida ? new Date(dataSaida) : new Date();

  const diffMs = saida.getTime() - entrada.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Busca estatísticas de atendimentos parados por estabelecimento
 * @param estabelecimentoId - ID do estabelecimento
 * @returns Estatísticas
 */
export async function getEstatisticasAtendimentosParadosUnificados(estabelecimentoId?: number) {
  try {
    const atendimentosParados = estabelecimentoId 
      ? await getAtendimentosParadosPorEstabelecimento(estabelecimentoId)
      : await getAtendimentosParadosUnificados();

    if (atendimentosParados.length === 0) {
      return {
        total: 0,
        diasParadoTotal: 0,
        mediaDias: 0,
        porTipo: {},
        porConvenio: {},
        porOrigem: {},
      };
    }

    const diasParadoTotal = atendimentosParados.reduce((sum, a) => {
      return sum + calcularDiasParadoUnificado(a.data_entrada, a.data_saida || undefined);
    }, 0);

    const mediaDias = Math.round(diasParadoTotal / atendimentosParados.length);

    const porTipo: Record<string, number> = {};
    const porConvenio: Record<string, number> = {};
    const porOrigem: Record<string, number> = {};

    atendimentosParados.forEach(a => {
      const dias = calcularDiasParadoUnificado(a.data_entrada, a.data_saida || undefined);
      if (a.tipo_atendimento) {
        porTipo[a.tipo_atendimento] = (porTipo[a.tipo_atendimento] || 0) + 1;
      }
      if (a.convenio) {
        porConvenio[a.convenio] = (porConvenio[a.convenio] || 0) + 1;
      }
      if (a.origemSistema) {
        porOrigem[a.origemSistema] = (porOrigem[a.origemSistema] || 0) + 1;
      }
    });

    return {
      total: atendimentosParados.length,
      diasParadoTotal,
      mediaDias,
      porTipo,
      porConvenio,
      porOrigem,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return {
      total: 0,
      diasParadoTotal: 0,
      mediaDias: 0,
      porTipo: {},
      porConvenio: {},
      porOrigem: {},
    };
  }
}

/**
 * Busca atendimentos parados com filtros
 * @param estabelecimentoId - ID do estabelecimento
 * @param filtros - Filtros opcionais
 * @returns Lista de atendimentos parados filtrados
 */
export async function getAtendimentosParadosComFiltros(
  filtros?: {
    tipo?: string;
    convenio?: string;
    origem?: string;
    diasMinimoParado?: number;
    estabelecimentoId?: number;
  }
) {
  try {
    let atendimentosParados = filtros?.estabelecimentoId
      ? await getAtendimentosParadosPorEstabelecimento(filtros.estabelecimentoId)
      : await getAtendimentosParadosUnificados();

    if (filtros?.tipo) {
      atendimentosParados = atendimentosParados.filter(
        a => a.tipo_atendimento === filtros.tipo
      );
    }

    if (filtros?.convenio) {
      atendimentosParados = atendimentosParados.filter(
        a => a.convenio === filtros.convenio
      );
    }

    if (filtros?.origem) {
      atendimentosParados = atendimentosParados.filter(
        a => a.origemSistema === filtros.origem
      );
    }

    if (filtros?.diasMinimoParado) {
      atendimentosParados = atendimentosParados.filter(a => {
        const dias = calcularDiasParadoUnificado(a.data_entrada, a.data_saida || undefined);
        return dias >= filtros.diasMinimoParado!;
      });
    }

    return atendimentosParados;
  } catch (error) {
    console.error("Erro ao buscar atendimentos com filtros:", error);
    return [];
  }
}
