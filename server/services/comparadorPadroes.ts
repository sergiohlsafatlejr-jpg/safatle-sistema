import { getDb } from "../db";
import { contasConvenioItens, contasConvenioResumo, padraoPrecoConvenio, padraoGlosaConvenio, padraoQuantidadeItem, padroesCobranca } from "../../drizzle/schema";
import { eq, and, sql, or, inArray } from "drizzle-orm";
import { logger } from "../_core/logger";

/**
 * Motor de Comparação de Padrões de Cobrança (com suporte a Gabarito)
 * 
 * Compara os itens de uma conta contra os padrões ATIVOS e GABARITOS:
 * 1. Preço: valor unitário/total vs média ± 2 desvios
 * 2. Quantidade: qtd vs média ± 2 desvios
 * 3. Glosa: risco de glosa baseado no histórico
 * 4. Composição: itens faltantes ou extras vs kit padrão (gabarito tem prioridade)
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
  isGabarito?: boolean;
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
  gabaritosUsados: number;
  padroesUsados: number;
}

/**
 * Compara todos os itens de uma conta contra os padrões de cobrança
 * Prioriza gabaritos (isGabarito=1) sobre padrões aprendidos
 * Filtra apenas padrões com status "ativo"
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
      gabaritosUsados: 0,
      padroesUsados: 0,
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
      gabaritosUsados: 0,
      padroesUsados: 0,
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
    .where(eq(padraoQuantidadeItem.estabelecimentoId, estabelecimentoId));

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

  // 6. Buscar padrões de composição - APENAS ATIVOS (inclui gabaritos)
  const padroesComposicao = await db
    .select()
    .from(padroesCobranca)
    .where(and(
      eq(padroesCobranca.estabelecimentoId, estabelecimentoId),
      eq(padroesCobranca.status, "ativo"),
    ));

  // Filtrar por convênio
  const padroesCompFiltrados = padroesComposicao.filter(p => 
    !p.convenioId || p.convenioId === itens[0].convenioId
  );

  // Priorizar gabaritos: se há gabarito e padrão aprendido para o mesmo procedimento,
  // usar apenas o gabarito
  const mapComposicao = new Map<string, typeof padroesCompFiltrados[0]>();
  for (const padrao of padroesCompFiltrados) {
    const codigo = padrao.codigoProcedimentoPrincipal;
    if (!codigo) continue;
    const existente = mapComposicao.get(codigo);
    if (!existente || padrao.isGabarito === 1) {
      // Gabarito sempre sobrescreve, ou adiciona se não existia
      mapComposicao.set(codigo, padrao);
    }
  }

  let gabaritosUsados = 0;
  let padroesUsados = 0;

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

  // 8. Verificar composição (itens faltantes no kit) usando gabaritos prioritários
  const codigosNaConta = new Set(itens.map(i => i.codigoItem).filter(Boolean));
  
  // Identificar procedimentos na conta (vários formatos de tipo)
  const tiposProcedimento = new Set(["PROCEDIMENTO", "P", "C", "O", "01", "PROC"]);
  const procedimentosNaConta = itens
    .filter(i => {
      const tipo = (i.tipoItem || "").toUpperCase().trim();
      return tiposProcedimento.has(tipo) || tipo.includes("PROC");
    })
    .map(i => i.codigoItem)
    .filter(Boolean);

  for (const [codigoProc, padrao] of mapComposicao) {
    // Verificar se o procedimento principal está na conta
    // Suporte a padrões combinados: "CODIGO_A + CODIGO_B" - todos devem estar presentes
    const codigosCombinados = codigoProc.includes(" + ") 
      ? codigoProc.split(" + ").map(c => c.trim()).filter(Boolean)
      : [codigoProc];
    const todosPresentes = codigosCombinados.every(c => procedimentosNaConta.includes(c));
    if (todosPresentes) {
      const isGab = padrao.isGabarito === 1;
      if (isGab) gabaritosUsados++;
      else padroesUsados++;

      const itensAssociados = padrao.itensAssociados as Array<{
        codigo: string;
        descricao: string;
        tipo: string;
        frequencia: number;
        quantidadeMedia: number;
        valorMedio?: number;
      }>;

      if (Array.isArray(itensAssociados)) {
        for (const itemEsperado of itensAssociados) {
          // Frequência está em porcentagem (0-100)
          // Gabaritos: alertar para todos os itens (frequência geralmente 100%)
          // Padrões aprendidos: alertar para itens com frequência >= 70%
          const limiteFrequencia = isGab ? 50 : 70;
          
          if (itemEsperado.frequencia >= limiteFrequencia && !codigosNaConta.has(itemEsperado.codigo)) {
            const severidade = isGab 
              ? (itemEsperado.frequencia >= 90 ? "critico" : "alerta")
              : (itemEsperado.frequencia >= 90 ? "alerta" : "aviso");
            
            const fonte = isGab ? "gabarito" : "padrão aprendido";
            divergencias.push({
              tipo: "ITEM_FALTANTE",
              severidade,
              mensagem: `Item "${itemEsperado.descricao || itemEsperado.codigo}" esperado no kit de "${padrao.descricaoProcedimentoPrincipal}" (frequência: ${itemEsperado.frequencia.toFixed(0)}%) não encontrado na conta. [Fonte: ${fonte}]`,
              codigoItem: itemEsperado.codigo,
              descricaoItem: itemEsperado.descricao,
              padraoId: padrao.id,
              isGabarito: isGab,
              detalhes: {
                procedimentoPrincipal: padrao.codigoProcedimentoPrincipal,
                descricaoProcedimentoPrincipal: padrao.descricaoProcedimentoPrincipal,
                frequenciaEsperada: itemEsperado.frequencia,
                quantidadeMedia: itemEsperado.quantidadeMedia,
                valorMedio: itemEsperado.valorMedio,
                fonte,
              },
            });
          }

          // Verificar quantidade se o item existe na conta
          if (codigosNaConta.has(itemEsperado.codigo) && itemEsperado.quantidadeMedia > 0) {
            const itemNaConta = itens.find(i => i.codigoItem === itemEsperado.codigo);
            if (itemNaConta) {
              const qtdNaConta = parseFloat(itemNaConta.quantidade || "0");
              const qtdEsperada = itemEsperado.quantidadeMedia;
              
              // Se quantidade na conta é significativamente diferente (>50% de diferença)
              if (qtdNaConta > 0 && qtdEsperada > 0) {
                const diffPercent = Math.abs(qtdNaConta - qtdEsperada) / qtdEsperada * 100;
                if (diffPercent > 50) {
                  const fonte = isGab ? "gabarito" : "padrão aprendido";
                  divergencias.push({
                    tipo: "COMPOSICAO",
                    severidade: isGab ? "alerta" : "aviso",
                    mensagem: `Quantidade de "${itemEsperado.descricao || itemEsperado.codigo}" divergente do ${fonte}: esperado ~${qtdEsperada.toFixed(1)}, encontrado ${qtdNaConta.toFixed(1)} (diferença de ${diffPercent.toFixed(0)}%)`,
                    codigoItem: itemEsperado.codigo,
                    descricaoItem: itemEsperado.descricao,
                    valorEsperado: `${qtdEsperada.toFixed(1)}`,
                    valorEncontrado: `${qtdNaConta.toFixed(1)}`,
                    padraoId: padrao.id,
                    isGabarito: isGab,
                    detalhes: {
                      procedimentoPrincipal: padrao.codigoProcedimentoPrincipal,
                      fonte,
                    },
                  });
                }
              }
            }
          }
        }

        // Verificar itens extras (na conta mas não no kit) - apenas para gabaritos
        if (isGab) {
          const codigosEsperados = new Set(itensAssociados.map(i => i.codigo));
          const itensNaoProc = itens.filter(i => {
            const tipo = (i.tipoItem || "").toUpperCase().trim();
            return !tiposProcedimento.has(tipo) && !tipo.includes("PROC");
          });
          
          for (const itemNaConta of itensNaoProc) {
            if (itemNaConta.codigoItem && !codigosEsperados.has(itemNaConta.codigoItem)) {
              // Verificar se este item extra pertence ao contexto do procedimento
              // (simplificação: marcar como info para revisão)
              divergencias.push({
                tipo: "ITEM_EXTRA",
                severidade: "info",
                mensagem: `Item "${itemNaConta.descricaoItem || itemNaConta.codigoItem}" presente na conta mas não definido no gabarito de "${padrao.descricaoProcedimentoPrincipal}".`,
                codigoItem: itemNaConta.codigoItem,
                descricaoItem: itemNaConta.descricaoItem || undefined,
                padraoId: padrao.id,
                isGabarito: true,
                detalhes: {
                  procedimentoPrincipal: padrao.codigoProcedimentoPrincipal,
                  fonte: "gabarito",
                },
              });
            }
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
    gabaritosUsados,
    padroesUsados,
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
        ? "conforme" as const
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
    gabaritosUsados: resultado.gabaritosUsados,
    padroesUsados: resultado.padroesUsados,
    statusGeral: resultado.statusGeral,
  });

  return resultado;
}
