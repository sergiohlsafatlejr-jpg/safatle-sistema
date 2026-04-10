import { InsertDivergencia } from "../drizzle/schema";

export interface ComparacaoResult {
  totalItensEnviados: number;
  totalItensRetornados: number;
  totalDivergencias: number;
  valorTotalEnviado: number;
  valorTotalRetornado: number;
  diferencaValor: number;
  divergencias: DivergenciaDetalhada[];
}

export interface DivergenciaDetalhada {
  tipo: "valor" | "quantidade" | "ausente_retorno" | "ausente_envio" | "dados";
  procedimentoEnviadoId?: number;
  procedimentoRetornadoId?: number;
  campo?: string;
  valorEnviado?: string;
  valorRetornado?: string;
  diferenca?: number;
  descricao: string;
}

interface ProcedimentoComparavel {
  id: number;
  // Campos da tabela procedimentos (legado) ou staging_faturamento_xml
  codigo?: string;
  codigoItem?: string | null;
  quantidade?: number | string | null;
  valorUnitario?: string | null;
  valorTotal?: string | null;
  valorFaturado?: string | null;
  pacienteCarteirinha?: string | null;
  carteiraBeneficiario?: string | null;
  guiaNumero?: string | null;
  numeroGuiaPrestador?: string | null;
}

/** Normaliza campos para comparação (suporta tanto procedimentos quanto staging_faturamento_xml) */
function normalizarItem(p: ProcedimentoComparavel) {
  return {
    id: p.id,
    codigo: p.codigo || p.codigoItem || '',
    quantidade: typeof p.quantidade === 'string' ? parseFloat(p.quantidade) : (p.quantidade || 0),
    valorTotal: p.valorTotal || p.valorFaturado || '0',
    valorUnitario: p.valorUnitario || '0',
    pacienteCarteirinha: p.pacienteCarteirinha || p.carteiraBeneficiario || '',
    guiaNumero: p.guiaNumero || p.numeroGuiaPrestador || '',
  };
}

/**
 * Compara procedimentos enviados com retornados e identifica divergências
 */
export function compararProcedimentos(
  enviados: ProcedimentoComparavel[],
  retornados: ProcedimentoComparavel[],
  toleranciaValor: number = 0.01 // Tolerância de 1 centavo por padrão
): ComparacaoResult {
  const divergencias: DivergenciaDetalhada[] = [];
  
  // Normalizar itens para formato comum
  type ItemNormalizado = ReturnType<typeof normalizarItem>;
  const enviadosNorm = enviados.map(normalizarItem);
  const retornadosNorm = retornados.map(normalizarItem);
  
  // Criar mapas para busca eficiente
  const enviadosMap = new Map<string, ItemNormalizado[]>();
  const retornadosMap = new Map<string, ItemNormalizado[]>();
  
  // Agrupar por código + carteirinha + guia para matching mais preciso
  const getChave = (p: ItemNormalizado): string => {
    return `${p.codigo}|${p.pacienteCarteirinha || ""}|${p.guiaNumero || ""}`;
  };
  
  for (const env of enviadosNorm) {
    const chave = getChave(env);
    if (!enviadosMap.has(chave)) {
      enviadosMap.set(chave, []);
    }
    enviadosMap.get(chave)!.push(env);
  }
  
  for (const ret of retornadosNorm) {
    const chave = getChave(ret);
    if (!retornadosMap.has(chave)) {
      retornadosMap.set(chave, []);
    }
    retornadosMap.get(chave)!.push(ret);
  }
  
  // Verificar itens enviados que não estão no retorno
  const chavesProcessadas = new Set<string>();
  
  for (const [chave, envList] of Array.from(enviadosMap.entries())) {
    const retList = retornadosMap.get(chave) || [];
    chavesProcessadas.add(chave);
    
    if (retList.length === 0) {
      // Itens enviados mas não retornados
      for (const env of envList) {
        divergencias.push({
          tipo: "ausente_retorno",
          procedimentoEnviadoId: env.id,
          descricao: `Procedimento ${env.codigo} enviado mas não encontrado no retorno`,
          valorEnviado: env.valorTotal || undefined,
        });
      }
    } else {
      // Comparar itens correspondentes
      const minLen = Math.min(envList.length, retList.length);
      
      for (let i = 0; i < minLen; i++) {
        const env = envList[i];
        const ret = retList[i];
        
        // Comparar quantidade
        if (env.quantidade !== ret.quantidade) {
          divergencias.push({
            tipo: "quantidade",
            procedimentoEnviadoId: env.id,
            procedimentoRetornadoId: ret.id,
            campo: "quantidade",
            valorEnviado: String(env.quantidade || 0),
            valorRetornado: String(ret.quantidade || 0),
            diferenca: (env.quantidade || 0) - (ret.quantidade || 0),
            descricao: `Divergência de quantidade no procedimento ${env.codigo}`,
          });
        }
        
        // Comparar valor total
        const valorEnv = parseFloat(env.valorTotal || "0");
        const valorRet = parseFloat(ret.valorTotal || "0");
        const difValor = Math.abs(valorEnv - valorRet);
        
        if (difValor > toleranciaValor) {
          divergencias.push({
            tipo: "valor",
            procedimentoEnviadoId: env.id,
            procedimentoRetornadoId: ret.id,
            campo: "valorTotal",
            valorEnviado: env.valorTotal || "0",
            valorRetornado: ret.valorTotal || "0",
            diferenca: valorEnv - valorRet,
            descricao: `Divergência de valor no procedimento ${env.codigo}: enviado R$ ${valorEnv.toFixed(2)}, retornado R$ ${valorRet.toFixed(2)}`,
          });
        }
      }
      
      // Itens extras enviados
      for (let i = minLen; i < envList.length; i++) {
        const env = envList[i];
        divergencias.push({
          tipo: "ausente_retorno",
          procedimentoEnviadoId: env.id,
          descricao: `Procedimento ${env.codigo} enviado (extra) mas não encontrado no retorno`,
          valorEnviado: env.valorTotal || undefined,
        });
      }
      
      // Itens extras retornados
      for (let i = minLen; i < retList.length; i++) {
        const ret = retList[i];
        divergencias.push({
          tipo: "ausente_envio",
          procedimentoRetornadoId: ret.id,
          descricao: `Procedimento ${ret.codigo} retornado mas não encontrado no envio`,
          valorRetornado: ret.valorTotal || undefined,
        });
      }
    }
  }
  
  // Verificar itens retornados que não foram enviados
  for (const [chave, retList] of Array.from(retornadosMap.entries())) {
    if (!chavesProcessadas.has(chave)) {
      for (const ret of retList) {
        divergencias.push({
          tipo: "ausente_envio",
          procedimentoRetornadoId: ret.id,
          descricao: `Procedimento ${ret.codigo} retornado mas não encontrado no envio`,
          valorRetornado: ret.valorTotal || undefined,
        });
      }
    }
  }
  
  // Calcular totais
  const valorTotalEnviado = enviadosNorm.reduce(
    (sum, p) => sum + parseFloat(p.valorTotal || "0"),
    0
  );
  
  const valorTotalRetornado = retornadosNorm.reduce(
    (sum, p) => sum + parseFloat(p.valorTotal || "0"),
    0
  );
  
  return {
    totalItensEnviados: enviados.length,
    totalItensRetornados: retornados.length,
    totalDivergencias: divergencias.length,
    valorTotalEnviado,
    valorTotalRetornado,
    diferencaValor: valorTotalEnviado - valorTotalRetornado,
    divergencias,
  };
}

/**
 * Converte divergências detalhadas para formato de inserção no banco
 */
export function toDivergenciaInsert(
  div: DivergenciaDetalhada,
  comparacaoId: number
): Omit<InsertDivergencia, "id" | "createdAt"> {
  return {
    comparacaoId,
    tipo: div.tipo,
    procedimentoEnviadoId: div.procedimentoEnviadoId || null,
    procedimentoRetornadoId: div.procedimentoRetornadoId || null,
    campo: div.campo || null,
    valorEnviado: div.valorEnviado || null,
    valorRetornado: div.valorRetornado || null,
    diferenca: div.diferenca?.toString() || null,
    descricao: div.descricao,
    resolvido: "nao",
  };
}

/**
 * Gera resumo estatístico da comparação
 */
export function gerarResumoComparacao(result: ComparacaoResult): {
  percentualDivergencia: number;
  percentualValorRecuperado: number;
  tiposDivergencia: Record<string, number>;
} {
  const percentualDivergencia = result.totalItensEnviados > 0
    ? (result.totalDivergencias / result.totalItensEnviados) * 100
    : 0;
  
  const percentualValorRecuperado = result.valorTotalEnviado > 0
    ? (result.valorTotalRetornado / result.valorTotalEnviado) * 100
    : 0;
  
  const tiposDivergencia: Record<string, number> = {};
  for (const div of result.divergencias) {
    tiposDivergencia[div.tipo] = (tiposDivergencia[div.tipo] || 0) + 1;
  }
  
  return {
    percentualDivergencia,
    percentualValorRecuperado,
    tiposDivergencia,
  };
}
