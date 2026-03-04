import { getDb } from "../db";
import { contasConvenioItens, contasConvenioResumo, padraoPrecoConvenio, padraoGlosaConvenio, padraoQuantidadeItem, padroesCobranca } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../_core/logger";

/**
 * Motor de Comparação de Padrões de Cobrança
 * 
 * Compara os itens de uma conta contra os padrões aprovados:
 * 1. Preço: valor unitário/total vs média ± 2 desvios
 * 2. Quantidade: qtd vs média ± 2 desvios
 * 3. Glosa: risco de glosa baseado no histórico
 * 4. Composição: itens faltantes ou extras vs kit padrão
 */

export interface Divergencia {
  tipo: "PRECO" | "QUANTIDADE" | "GLOSA_RISCO" | "ITEM_FALTANTE" | "ITEM_EXTRA" | "COMPOSICAO";
  severidade: "info" | "aviso" | "alerta" | "critico";
  mensagem: string;
  campo?: string;
  valorEsperado?: string;
  valorEncontrado?: string;
  padraoId?: number;
  codigoItem?: string;
  descricaoItem?: string;
  detalhes?: Record<string, any>;
}

export interface ResultadoComparacao {
  numeroConta: string;
  totalItensAnalisados: number;
  totalDivergencias: number;
  totalAlertas: number;
  totalCriticos: number;
  divergencias: Divergencia[];
  resumoPorTipo: Record<string, number>;
  statusGeral: "conforme" | "divergente";
}

/**
 * Compara todos os itens de uma conta contra os padrões de cobrança
 */
export async function compararContaComPadroes(
  numeroConta: string,
  estabelecimentoId: number
): Promise<ResultadoComparacao> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  // 1. Buscar itens da conta
  const itens = await db
    .select()
    .from(contasConvenioItens)
    .where(and(
      eq(contasConvenioItens.numeroConta, numeroConta),
      eq(contasConvenioItens.estabelecimentoId, estabelecimentoId),
    ));

  if (itens.length === 0) {
    return {
      numeroConta,
      totalItensAnalisados: 0,
      totalDivergencias: 0,
      totalAlertas: 0,
      totalCriticos: 0,
      divergencias: [],
      resumoPorTipo: {},
      statusGeral: "conforme",
    };
  }

  // 2. Identificar o convênio da conta
  const convenio = itens[0].convenio;
  if (!convenio) {
    logger.warn({ message: "Conta sem convênio identificado", numeroConta });
    return {
      numeroConta,
      totalItensAnalisados: itens.length,
      totalDivergencias: 0,
      totalAlertas: 0,
      totalCriticos: 0,
      divergencias: [{
        tipo: "COMPOSICAO",
        severidade: "aviso",
        mensagem: "Convênio não identificado na conta. Não é possível comparar com padrões.",
      }],
      resumoPorTipo: { COMPOSICAO: 1 },
      statusGeral: "conforme",
    };
  }

  const divergencias: Divergencia[] = [];

  // 3. Buscar padrões de preço para este convênio
  const padroesPreco = await db
    .select()
    .from(padraoPrecoConvenio)
    .where(and(
      eq(padraoPrecoConvenio.estabelecimentoId, estabelecimentoId),
      eq(padraoPrecoConvenio.convenio, convenio),
    ));

  const mapPreco = new Map(padroesPreco.map(p => [p.codigoItem, p]));

  // 4. Buscar padrões de quantidade
  const padroesQtd = await db
    .select()
    .from(padraoQuantidadeItem)
    .where(and(
      eq(padraoQuantidadeItem.estabelecimentoId, estabelecimentoId),
    ));

  // Filtrar por convênio ou sem convênio (padrão geral)
  const padroesQtdFiltrados = padroesQtd.filter(p => 
    p.convenio === convenio || !p.convenio
  );
  const mapQtd = new Map(padroesQtdFiltrados.map(p => [p.codigoItem, p]));

  // 5. Buscar padrões de glosa
  const padroesGlosa = await db
    .select()
    .from(padraoGlosaConvenio)
    .where(and(
      eq(padraoGlosaConvenio.estabelecimentoId, estabelecimentoId),
      eq(padraoGlosaConvenio.convenio, convenio),
    ));

  const mapGlosa = new Map(padroesGlosa.map(p => [p.codigoItem, p]));

  // 6. Buscar padrões de composição (kit cirúrgico)
  const padroesComposicao = await db
    .select()
    .from(padroesCobranca)
    .where(and(
      eq(padroesCobranca.estabelecimentoId, estabelecimentoId),
    ));

  // Filtrar por convênio
  const padroesCompFiltrados = padroesComposicao.filter(p => 
    !p.convenioId || p.convenioId === itens[0].convenioId
  );

  // 7. Analisar cada item
  for (const item of itens) {
    const codigo = item.codigoItem;
    if (!codigo) continue;

    const valorUnitario = parseFloat(item.valorUnitario || "0");
    const valorTotal = parseFloat(item.valorTotal || "0");
    const quantidade = parseFloat(item.quantidade || "0");

    // 7a. Comparação de PREÇO
    const padraoP = mapPreco.get(codigo);
    if (padraoP) {
      const mediaUnit = parseFloat(padraoP.mediaUnitario || "0");
      const desvioUnit = parseFloat(padraoP.desvioUnitario || "0");
      const minUnit = parseFloat(padraoP.minUnitario || "0");
      const maxUnit = parseFloat(padraoP.maxUnitario || "0");

      if (mediaUnit > 0 && valorUnitario > 0) {
        // Verificar se está fora de 2 desvios padrão
        const limiteInferior = Math.max(0, mediaUnit - 2 * desvioUnit);
        const limiteSuperior = mediaUnit + 2 * desvioUnit;

        if (valorUnitario > limiteSuperior) {
          const percentAcima = ((valorUnitario - mediaUnit) / mediaUnit * 100).toFixed(1);
          const severidade = valorUnitario > maxUnit ? "critico" : "alerta";
          divergencias.push({
            tipo: "PRECO",
            severidade,
            mensagem: `Valor unitário ${percentAcima}% acima da média (R$ ${mediaUnit.toFixed(2)}). Limite superior: R$ ${limiteSuperior.toFixed(2)}`,
            campo: "valorUnitario",
            valorEsperado: `R$ ${mediaUnit.toFixed(2)} (±R$ ${desvioUnit.toFixed(2)})`,
            valorEncontrado: `R$ ${valorUnitario.toFixed(2)}`,
            padraoId: padraoP.id,
            codigoItem: codigo,
            descricaoItem: item.descricaoItem || undefined,
            detalhes: { mediaUnit, desvioUnit, minUnit, maxUnit, limiteInferior, limiteSuperior },
          });
        } else if (valorUnitario < limiteInferior && limiteInferior > 0) {
          const percentAbaixo = ((mediaUnit - valorUnitario) / mediaUnit * 100).toFixed(1);
          divergencias.push({
            tipo: "PRECO",
            severidade: "info",
            mensagem: `Valor unitário ${percentAbaixo}% abaixo da média (R$ ${mediaUnit.toFixed(2)}).`,
            campo: "valorUnitario",
            valorEsperado: `R$ ${mediaUnit.toFixed(2)} (±R$ ${desvioUnit.toFixed(2)})`,
            valorEncontrado: `R$ ${valorUnitario.toFixed(2)}`,
            padraoId: padraoP.id,
            codigoItem: codigo,
            descricaoItem: item.descricaoItem || undefined,
          });
        }
      }
    }

    // 7b. Comparação de QUANTIDADE
    const padraoQ = mapQtd.get(codigo);
    if (padraoQ && quantidade > 0) {
      const mediaQtd = parseFloat(padraoQ.mediaQuantidade || "0");
      const limiteSup = parseFloat(padraoQ.limiteSuperior || "0");
      const limiteInf = parseFloat(padraoQ.limiteInferior || "0");

      if (mediaQtd > 0) {
        if (limiteSup > 0 && quantidade > limiteSup) {
          const percentAcima = ((quantidade - mediaQtd) / mediaQtd * 100).toFixed(1);
          divergencias.push({
            tipo: "QUANTIDADE",
            severidade: quantidade > limiteSup * 1.5 ? "critico" : "alerta",
            mensagem: `Quantidade ${percentAcima}% acima da média (${mediaQtd.toFixed(2)}). Limite: ${limiteSup.toFixed(2)}`,
            campo: "quantidade",
            valorEsperado: `${mediaQtd.toFixed(2)} (limite: ${limiteSup.toFixed(2)})`,
            valorEncontrado: `${quantidade.toFixed(2)}`,
            padraoId: padraoQ.id,
            codigoItem: codigo,
            descricaoItem: item.descricaoItem || undefined,
          });
        } else if (limiteInf > 0 && quantidade < limiteInf) {
          divergencias.push({
            tipo: "QUANTIDADE",
            severidade: "info",
            mensagem: `Quantidade abaixo do limite inferior (${limiteInf.toFixed(2)}). Média: ${mediaQtd.toFixed(2)}`,
            campo: "quantidade",
            valorEsperado: `${mediaQtd.toFixed(2)} (limite: ${limiteInf.toFixed(2)})`,
            valorEncontrado: `${quantidade.toFixed(2)}`,
            padraoId: padraoQ.id,
            codigoItem: codigo,
            descricaoItem: item.descricaoItem || undefined,
          });
        }
      }
    }

    // 7c. Risco de GLOSA
    const padraoG = mapGlosa.get(codigo);
    if (padraoG) {
      const taxaGlosa = parseFloat(padraoG.taxaGlosa || "0");
      const nivelRisco = padraoG.nivelRisco;

      if (taxaGlosa > 10 || nivelRisco === "alto" || nivelRisco === "critico") {
        const severidade = nivelRisco === "critico" ? "critico" : nivelRisco === "alto" ? "alerta" : "aviso";
        divergencias.push({
          tipo: "GLOSA_RISCO",
          severidade,
          mensagem: `Item com risco ${nivelRisco} de glosa (taxa histórica: ${taxaGlosa.toFixed(1)}%). Valor em risco: R$ ${valorTotal.toFixed(2)}`,
          codigoItem: codigo,
          descricaoItem: item.descricaoItem || undefined,
          padraoId: padraoG.id,
          detalhes: {
            taxaGlosa,
            nivelRisco,
            valorEmRisco: valorTotal * (taxaGlosa / 100),
            codigosGlosaFrequentes: padraoG.codigosGlosaFrequentes,
          },
        });
      }
    }
  }

  // 8. Verificar composição (itens faltantes no kit)
  const codigosNaConta = new Set(itens.map(i => i.codigoItem).filter(Boolean));
  const procedimentosNaConta = itens
    .filter(i => i.tipoItem === "PROCEDIMENTO" || i.tipoItem?.toLowerCase().includes("proc"))
    .map(i => i.codigoItem)
    .filter(Boolean);

  for (const padrao of padroesCompFiltrados) {
    // Verificar se o procedimento principal está na conta
    if (procedimentosNaConta.includes(padrao.codigoProcedimentoPrincipal)) {
      const itensAssociados = padrao.itensAssociados as Array<{
        codigo: string;
        descricao: string;
        tipo: string;
        frequencia: number;
        quantidadeMedia: number;
      }>;

      if (Array.isArray(itensAssociados)) {
        for (const itemEsperado of itensAssociados) {
          // Só alertar para itens com frequência > 70% (aparecem na maioria dos kits)
          if (itemEsperado.frequencia >= 0.7 && !codigosNaConta.has(itemEsperado.codigo)) {
            divergencias.push({
              tipo: "ITEM_FALTANTE",
              severidade: itemEsperado.frequencia >= 0.9 ? "alerta" : "aviso",
              mensagem: `Item "${itemEsperado.descricao || itemEsperado.codigo}" esperado no kit de "${padrao.descricaoProcedimentoPrincipal}" (frequência: ${(itemEsperado.frequencia * 100).toFixed(0)}%) não encontrado na conta.`,
              codigoItem: itemEsperado.codigo,
              descricaoItem: itemEsperado.descricao,
              padraoId: padrao.id,
              detalhes: {
                procedimentoPrincipal: padrao.codigoProcedimentoPrincipal,
                descricaoProcedimentoPrincipal: padrao.descricaoProcedimentoPrincipal,
                frequenciaEsperada: itemEsperado.frequencia,
                quantidadeMedia: itemEsperado.quantidadeMedia,
              },
            });
          }
        }
      }
    }
  }

  // 9. Calcular resumo
  const resumoPorTipo: Record<string, number> = {};
  let totalAlertas = 0;
  let totalCriticos = 0;

  for (const div of divergencias) {
    resumoPorTipo[div.tipo] = (resumoPorTipo[div.tipo] || 0) + 1;
    if (div.severidade === "alerta") totalAlertas++;
    if (div.severidade === "critico") totalCriticos++;
  }

  const statusGeral = divergencias.some(d => d.severidade === "critico" || d.severidade === "alerta")
    ? "divergente" as const
    : "conforme" as const;

  return {
    numeroConta,
    totalItensAnalisados: itens.length,
    totalDivergencias: divergencias.length,
    totalAlertas,
    totalCriticos,
    divergencias,
    resumoPorTipo,
    statusGeral,
  };
}

/**
 * Executa a comparação e salva os resultados nos itens e no resumo da conta
 */
export async function executarComparacaoESalvar(
  numeroConta: string,
  estabelecimentoId: number
): Promise<ResultadoComparacao> {
  const db = await getDb();
  if (!db) throw new Error("Database não disponível");

  const resultado = await compararContaComPadroes(numeroConta, estabelecimentoId);

  // Mapear divergências por código de item
  const divPorItem = new Map<string, Divergencia[]>();
  for (const div of resultado.divergencias) {
    if (div.codigoItem) {
      if (!divPorItem.has(div.codigoItem)) divPorItem.set(div.codigoItem, []);
      divPorItem.get(div.codigoItem)!.push(div);
    }
  }

  // Atualizar cada item com suas divergências
  const itens = await db
    .select({ id: contasConvenioItens.id, codigoItem: contasConvenioItens.codigoItem })
    .from(contasConvenioItens)
    .where(and(
      eq(contasConvenioItens.numeroConta, numeroConta),
      eq(contasConvenioItens.estabelecimentoId, estabelecimentoId),
    ));

  for (const item of itens) {
    const divs = item.codigoItem ? divPorItem.get(item.codigoItem) : undefined;
    const status = divs && divs.some(d => d.severidade === "critico" || d.severidade === "alerta")
      ? "divergente" as const
      : divs && divs.length > 0
        ? "conforme" as const // Tem divergências leves (info/aviso) mas não é crítico
        : "conforme" as const;

    await db.update(contasConvenioItens)
      .set({
        statusAnalise: status,
        divergencias: divs || null,
      })
      .where(eq(contasConvenioItens.id, item.id));
  }

  // Atualizar resumo da conta
  await db.update(contasConvenioResumo)
    .set({
      statusAnalise: resultado.statusGeral,
      totalDivergencias: resultado.totalDivergencias,
      totalAlertas: resultado.totalAlertas + resultado.totalCriticos,
    })
    .where(and(
      eq(contasConvenioResumo.numeroConta, numeroConta),
      eq(contasConvenioResumo.estabelecimentoId, estabelecimentoId),
    ));

  logger.info({
    message: "Comparação com padrões concluída",
    numeroConta,
    totalDivergencias: resultado.totalDivergencias,
    statusGeral: resultado.statusGeral,
  });

  return resultado;
}
