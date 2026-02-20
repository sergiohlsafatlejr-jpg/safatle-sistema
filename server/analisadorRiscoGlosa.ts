import { sql } from "drizzle-orm";
import { getDb } from "./db";
import { logger } from "./_core/logger";

/**
 * Interface para padrão de recebimento de um item
 */
export interface PadraoRecebimento {
  codigoItem: string;
  descricaoItem: string;
  totalFaturado: number; // Total de vezes que foi faturado
  totalRecebido: number; // Total de vezes que foi recebido
  totalGlosado: number; // Total de vezes que foi glosado
  taxaGlosa: number; // Percentual (0-100)
  taxaRecebimento: number; // Percentual (0-100)
  valorMedioFaturado: number;
  valorMedioRecebido: number;
  valorMedioGlosado: number;
  motivosGlosaFrequentes: {
    codigo: string;
    descricao: string;
    frequencia: number;
    percentual: number;
  }[];
  risco: "baixo" | "medio" | "alto" | "critico";
}

/**
 * Interface para análise de risco de uma conta
 */
export interface AnaliseRiscoConta {
  numeroGuia: string;
  convenioId: number;
  valorFaturado: number;
  itens: {
    codigoItem: string;
    descricaoItem: string;
    quantidade: number;
    valorFaturado: number;
    riscoPrevisto: "baixo" | "medio" | "alto" | "critico";
    taxaGlosaEsperada: number;
    motivosGlosaProvaveis: string[];
  }[];
  riscoConta: "baixo" | "medio" | "alto" | "critico";
  scoreRisco: number; // 0-100
  motivosAlerta: string[];
}

/**
 * Analisador de Risco de Glosa
 * Detecta padrões de recebimento e prevê risco de glosa em novas contas
 */
export class AnalisadorRiscoGlosa {
  /**
   * Analisa padrões de recebimento a partir de dados históricos
   */
  static async analisarPadroesRecebimento(
    estabelecimentoId: number,
    convenioId?: number,
    mesesHistorico: number = 12
  ): Promise<PadraoRecebimento[]> {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        message: "Iniciando análise de padrões de recebimento",
        estabelecimentoId,
        convenioId,
        mesesHistorico,
      });

      // 1. Buscar dados de recebimento dos últimos N meses
      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - mesesHistorico);
      // Converter para ISO string (YYYY-MM-DD)
      const dataLimiteStr = dataLimite.toISOString().split('T')[0];

      logger.info({
        message: "Data limite para análise",
        dataLimite: dataLimiteStr,
        mesesHistorico,
      });

      // Query simplificada - busca dados brutos sem GROUP BY
      // Usando tabela demonstrativo que tem dados mais completos
      const query = sql`
        SELECT 
          d.codigo_item as codigoItem,
          d.descricao_item as descricaoItem,
          d.valor_informado as valor_faturado,
          d.valor_pago as valor_liberado,
          d.valor_glosa as valor_glosado
        FROM demonstrativo d
        WHERE d.estabelecimentoId = ${estabelecimentoId}
          ${convenioId ? sql`AND d.convenio_id = ${convenioId}` : sql``}
          AND d.data_importacao_sistema >= ${dataLimiteStr}
      `;

      let resultados = await db.execute(query);
      let linhas = (resultados as any[]) || [];

      logger.info({
        message: "Resultado da query inicial",
        linhas: linhas.length,
        primeireLinha: linhas[0],
      });

      // Se não houver dados com filtro de data, busca todos os dados
      if (linhas.length === 0) {
        logger.info({
          message: "Nenhum dado encontrado com filtro de data, buscando todos os dados",
          estabelecimentoId,
          convenioId,
        });

        const queryTodos = sql`
          SELECT 
            d.codigo_item as codigoItem,
            d.descricao_item as descricaoItem,
            d.valor_informado as valor_faturado,
            d.valor_pago as valor_liberado,
            d.valor_glosa as valor_glosado
          FROM demonstrativo d
          WHERE d.estabelecimentoId = ${estabelecimentoId}
            ${convenioId ? sql`AND d.convenio_id = ${convenioId}` : sql``}
        `;

        resultados = await db.execute(queryTodos);
        linhas = (resultados as any[]) || [];
      }

      logger.info({
        message: "Dados de demonstrativo recuperados",
        estabelecimentoId,
        linhas: linhas.length,
      });

      // Processar dados em JavaScript (GROUP BY manual)
      const mapa = new Map<string, any>();
      
      for (const linha of linhas) {
        const chave = `${linha.codigo_item}|${linha.descricao_item}`;
        if (!mapa.has(chave)) {
          mapa.set(chave, {
            codigoItem: linha.codigo_item,
            descricaoItem: linha.descricao_item,
            totalFaturado: 0,
            valorTotalFaturado: 0,
            valorMedioFaturado: 0,
            totalRecebido: 0,
            valorTotalRecebido: 0,
            valorMedioRecebido: 0,
            totalGlosado: 0,
            valorTotalGlosado: 0,
            valorMedioGlosado: 0,
            valores: []
          });
        }
        
        const grupo = mapa.get(chave)!;
        grupo.totalFaturado++;
        grupo.valorTotalFaturado += parseFloat(linha.valor_faturado) || 0;
        
        if (parseFloat(linha.valor_liberado) > 0) {
          grupo.totalRecebido++;
          grupo.valorTotalRecebido += parseFloat(linha.valor_liberado);
        }
        
        if (parseFloat(linha.valor_glosado) > 0) {
          grupo.totalGlosado++;
          grupo.valorTotalGlosado += parseFloat(linha.valor_glosado);
        }
        
        grupo.valores.push({
          faturado: parseFloat(linha.valor_faturado) || 0,
          recebido: parseFloat(linha.valor_liberado) || 0,
          glosado: parseFloat(linha.valor_glosado) || 0
        });
      }
      
      // Calcular médias
      const dados = Array.from(mapa.values()).map(g => ({
        codigoItem: g.codigoItem,
        descricaoItem: g.descricaoItem,
        totalFaturado: g.totalFaturado,
        valorTotalFaturado: Math.round(g.valorTotalFaturado * 100) / 100,
        valorMedioFaturado: g.totalFaturado > 0 ? Math.round((g.valorTotalFaturado / g.totalFaturado) * 100) / 100 : 0,
        totalRecebido: g.totalRecebido,
        valorTotalRecebido: Math.round(g.valorTotalRecebido * 100) / 100,
        valorMedioRecebido: g.totalRecebido > 0 ? Math.round((g.valorTotalRecebido / g.totalRecebido) * 100) / 100 : 0,
        totalGlosado: g.totalGlosado,
        valorTotalGlosado: Math.round(g.valorTotalGlosado * 100) / 100,
        valorMedioGlosado: g.totalGlosado > 0 ? Math.round((g.valorTotalGlosado / g.totalGlosado) * 100) / 100 : 0
      })).sort((a, b) => b.totalFaturado - a.totalFaturado);

      logger.info({
        message: "Dados de recebimento recuperados",
        estabelecimentoId,
        linhas: dados.length,
      });

      // 2. Processar resultados e calcular métricas
      const padroes: PadraoRecebimento[] = [];

      for (const row of dados) {
        if (!row.codigoItem) continue; // Pular se não houver código de item
        
        const totalFaturado = Number(row.totalFaturado) || 0;
        const totalRecebido = Number(row.totalRecebido) || 0;
        const totalGlosado = Number(row.totalGlosado) || 0;

        if (totalFaturado === 0) continue; // Pular se não houver faturamento

        const taxaGlosa = (totalGlosado / totalFaturado) * 100;
        const taxaRecebimento = (totalRecebido / totalFaturado) * 100;

        // 3. Buscar motivos de glosa mais frequentes para este item
        const motivosQuery = sql`
          SELECT 
            d.codigo_glosa as codigo,
            d.situacao_item as descricao,
            COUNT(*) as frequencia
          FROM demonstrativo d
          WHERE d.codigo_item = ${String(row.codigoItem).trim()}
            AND d.estabelecimentoId = ${estabelecimentoId}
            ${convenioId ? sql`AND d.convenio_id = ${convenioId}` : sql``}
            AND d.valor_glosa > 0
            AND d.data_importacao_sistema >= ${dataLimite.toISOString().split('T')[0]}
          GROUP BY d.codigo_glosa, d.situacao_item
          ORDER BY frequencia DESC
          LIMIT 5
        `;

        const motivosResultados = await db.execute(motivosQuery);
        const motivos = (motivosResultados as any[]) || [];

        const motivosGlosaFrequentes = motivos.map((m: any) => ({
          codigo: m.codigo || "N/A",
          descricao: m.descricao || "Motivo não informado",
          frequencia: Number(m.frequencia) || 0,
          percentual: totalGlosado > 0 ? (Number(m.frequencia) / totalGlosado) * 100 : 0,
        }));

        // 4. Classificar risco
        let risco: "baixo" | "medio" | "alto" | "critico";
        if (taxaGlosa < 5) {
          risco = "baixo";
        } else if (taxaGlosa < 15) {
          risco = "medio";
        } else if (taxaGlosa < 30) {
          risco = "alto";
        } else {
          risco = "critico";
        }

        padroes.push({
          codigoItem: row.codigoItem,
          descricaoItem: row.descricaoItem,
          totalFaturado,
          totalRecebido,
          totalGlosado,
          taxaGlosa: Math.round(taxaGlosa * 100) / 100,
          taxaRecebimento: Math.round(taxaRecebimento * 100) / 100,
          valorMedioFaturado: Number(row.valorMedioFaturado) || 0,
          valorMedioRecebido: Number(row.valorMedioRecebido) || 0,
          valorMedioGlosado: Number(row.valorMedioGlosado) || 0,
          motivosGlosaFrequentes,
          risco,
        });
      }

      // 5. Ordenar por risco
      padroes.sort((a, b) => {
        const riscoPriority = { critico: 0, alto: 1, medio: 2, baixo: 3 };
        return riscoPriority[a.risco] - riscoPriority[b.risco];
      });

      logger.info({
        message: "Análise de padrões de recebimento concluída",
        estabelecimentoId,
        padroes: padroes.length,
      });

      return padroes;
    } catch (error) {
      logger.error({
        message: "Erro ao analisar padrões de recebimento",
        error: String(error),
        estabelecimentoId,
      });
      throw error;
    }
  }

  /**
   * Analisa risco de glosa para uma conta específica
   */
  static async analisarRiscoConta(
    estabelecimentoId: number,
    convenioId: number,
    numeroGuia: string,
    itens: Array<{
      codigoItem: string;
      descricaoItem: string;
      quantidade: number;
      valorFaturado: number;
    }>,
    mesesHistorico: number = 12
  ): Promise<AnaliseRiscoConta> {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const dataLimite = new Date();
      dataLimite.setMonth(dataLimite.getMonth() - mesesHistorico);

      // Buscar padrões de risco para cada item
      let scoreRiscoTotal = 0;
      const itensComRisco: AnaliseRiscoConta["itens"] = [];
      const alertas: string[] = [];

      for (const item of itens) {
        // Buscar taxa de glosa histórica para este item
        const padraoQuery = sql`
          SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN valor_glosa > 0 THEN 1 END) as glosado,
            AVG(CASE WHEN valor_glosa > 0 THEN valor_glosa ELSE 0 END) as mediaGlosa
          FROM demonstrativo
          WHERE codigo_item = ${item.codigoItem}
            AND estabelecimentoId = ${estabelecimentoId}
            AND convenio_id = ${convenioId}
            AND data_importacao_sistema >= ${dataLimite.toISOString().split('T')[0]}
        `;

        const padrao = (await db.execute(padraoQuery)) as any[];
        const padraoData = padrao[0] || { total: 0, glosado: 0, mediaGlosa: 0 };

        const taxaGlosaEsperada = padraoData.total > 0 ? (padraoData.glosado / padraoData.total) * 100 : 0;
        
        // Calcular risco do item
        let riscoPrevisto: "baixo" | "medio" | "alto" | "critico";
        if (taxaGlosaEsperada < 5) {
          riscoPrevisto = "baixo";
        } else if (taxaGlosaEsperada < 15) {
          riscoPrevisto = "medio";
        } else if (taxaGlosaEsperada < 30) {
          riscoPrevisto = "alto";
        } else {
          riscoPrevisto = "critico";
        }

        // Buscar motivos de glosa frequentes
        const motivosQuery = sql`
          SELECT DISTINCT situacao_item
          FROM demonstrativo
          WHERE codigo_item = ${item.codigoItem}
            AND estabelecimentoId = ${estabelecimentoId}
            AND convenio_id = ${convenioId}
            AND valor_glosa > 0
            AND data_importacao_sistema >= ${dataLimite.toISOString().split('T')[0]}
          LIMIT 3
        `;

        const motivos = (await db.execute(motivosQuery)) as any[];
        const motivosProvaveis = motivos.map((m: any) => m.situacao_item || "Motivo não informado");

        itensComRisco.push({
          codigoItem: item.codigoItem,
          descricaoItem: item.descricaoItem,
          quantidade: item.quantidade,
          valorFaturado: item.valorFaturado,
          riscoPrevisto,
          taxaGlosaEsperada: Math.round(taxaGlosaEsperada * 100) / 100,
          motivosGlosaProvaveis: motivosProvaveis,
        });

        // Acumular score de risco
        const riscoPriority = { critico: 75, alto: 50, medio: 25, baixo: 0 };
        scoreRiscoTotal += riscoPriority[riscoPrevisto];

        // Adicionar alertas
        if (riscoPrevisto === "critico") {
          alertas.push(`⚠️ CRÍTICO: ${item.descricaoItem} tem ${taxaGlosaEsperada.toFixed(1)}% de taxa de glosa`);
        } else if (riscoPrevisto === "alto") {
          alertas.push(`⚠️ ALTO: ${item.descricaoItem} tem ${taxaGlosaEsperada.toFixed(1)}% de taxa de glosa`);
        }
      }

      // Calcular score final (0-100)
      const scoreRisco = itens.length > 0 ? Math.min(100, Math.round(scoreRiscoTotal / itens.length)) : 0;

      // Classificar risco geral da conta
      let riscoConta: "baixo" | "medio" | "alto" | "critico";
      if (scoreRisco < 25) {
        riscoConta = "baixo";
      } else if (scoreRisco < 50) {
        riscoConta = "medio";
      } else if (scoreRisco < 75) {
        riscoConta = "alto";
      } else {
        riscoConta = "critico";
      }

      return {
        numeroGuia,
        convenioId,
        valorFaturado: itens.reduce((sum, i) => sum + i.valorFaturado, 0),
        itens: itensComRisco,
        riscoConta,
        scoreRisco,
        motivosAlerta: alertas,
      };
    } catch (error) {
      logger.error({
        message: "Erro ao analisar risco de conta",
        error: String(error),
        estabelecimentoId,
      });
      throw error;
    }
  }

  /**
   * Identifica contas com risco em um arquivo importado
   */
  static async identificarContasComRisco(
    estabelecimentoId: number,
    arquivoId?: number,
    limiteRisco: "alto_critico" | "critico" = "alto_critico"
  ): Promise<Array<{ numeroGuia: string; scoreRisco: number; risco: string; itensProblematicos: number }>> {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limiteScore = limiteRisco === "critico" ? 75 : 50;

      // Buscar contas com risco
      const query = sql`
        SELECT 
          d.numero_guia as numeroGuia,
          d.convenio_id,
          COUNT(DISTINCT d.id) as totalItens,
          COUNT(CASE WHEN d.valor_glosa > 0 THEN 1 END) as itensGlosados,
          SUM(d.valor_glosa) as valorGlosado,
          ROUND(COUNT(CASE WHEN d.valor_glosa > 0 THEN 1 END) * 100.0 / COUNT(DISTINCT d.id), 2) as taxaGlosa
        FROM demonstrativo d
        WHERE d.estabelecimentoId = ${estabelecimentoId}
          ${arquivoId ? sql`AND d.arquivo_id = ${arquivoId}` : sql``}
        GROUP BY d.numero_guia, d.convenio_id
        HAVING taxaGlosa >= ${limiteScore / 100 * 100}
        ORDER BY taxaGlosa DESC
      `;

      const contas = (await db.execute(query)) as any[];

      return contas.map((c: any) => ({
        numeroGuia: c.numeroGuia || "N/A",
        scoreRisco: Math.min(100, Number(c.taxaGlosa) || 0),
        risco: Number(c.taxaGlosa) >= 75 ? "CRÍTICO" : Number(c.taxaGlosa) >= 50 ? "ALTO" : "MÉDIO",
        itensProblematicos: Number(c.itensGlosados) || 0,
      }));
    } catch (error) {
      logger.error({
        message: "Erro ao identificar contas com risco",
        error: String(error),
        estabelecimentoId,
      });
      return [];
    }
  }
}
