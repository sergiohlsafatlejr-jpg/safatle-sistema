import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  snapshotAuditoria,
  conferenciaCorrecao,
  contasConvenioItens,
  contasConvenioResumo,
  feedbackDivergencias,
  falhasProntuario,
  ajustesAuditoria,
} from "../../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

/**
 * Router de Conferência Pós-Correção
 * Gerencia o fluxo: Auditoria finaliza → Snapshot → Faturista corrige → Reimportação → Comparação automática
 */
export const conferenciaRouter = router({

  // ============ GERAR SNAPSHOT (quando auditoria é finalizada) ============
  gerarSnapshot: protectedProcedure
    .input(z.object({
      numeroConta: z.string(),
      estabelecimentoId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // 1. Buscar itens atuais da conta
      const itens = await db.select().from(contasConvenioItens).where(
        and(
          eq(contasConvenioItens.numeroConta, input.numeroConta),
          eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
        )
      );

      if (itens.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum item encontrado para esta conta." });
      }

      // 2. Buscar resumo da conta
      const resumo = await db.select().from(contasConvenioResumo).where(
        and(
          eq(contasConvenioResumo.numeroConta, input.numeroConta),
          eq(contasConvenioResumo.estabelecimentoId, input.estabelecimentoId),
        )
      ).limit(1);

      // 3. Buscar divergências ACEITAS pela auditoria (são as que o faturista precisa corrigir)
      const divergencias = await db.select().from(feedbackDivergencias).where(
        and(
          eq(feedbackDivergencias.numeroConta, input.numeroConta),
          eq(feedbackDivergencias.estabelecimentoId, input.estabelecimentoId),
          eq(feedbackDivergencias.decisao, "aceitar"),
        )
      );

      // 4. Buscar falhas de prontuário abertas
      const falhas = await db.select().from(falhasProntuario).where(
        and(
          eq(falhasProntuario.numeroConta, input.numeroConta),
          eq(falhasProntuario.estabelecimentoId, input.estabelecimentoId),
          eq(falhasProntuario.status, "aberta"),
        )
      );

      // 5. Buscar ajustes aplicados
      const ajustes = await db.select().from(ajustesAuditoria).where(
        and(
          eq(ajustesAuditoria.numeroConta, input.numeroConta),
          eq(ajustesAuditoria.estabelecimentoId, input.estabelecimentoId),
          eq(ajustesAuditoria.status, "aplicado"),
        )
      );

      // 6. Montar snapshot dos itens
      const itensSnapshot = itens.map((item: any) => ({
        id: item.id,
        codigoItem: item.codigoItem,
        descricaoItem: item.descricaoItem,
        tipoItem: item.tipoItem,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        statusAnalise: item.statusAnalise,
        divergencias: item.divergencias,
        dataExecucao: item.dataExecucao,
      }));

      const divergenciasAceitas = divergencias.map((d: any) => ({
        codigoItem: d.codigoItem,
        tipoDivergencia: d.tipoDivergencia,
        decisao: d.decisao,
        justificativa: d.justificativa,
        dadosDivergencia: d.dadosDivergencia,
      }));

      const falhasAbertas = falhas.map((f: any) => ({
        id: f.id,
        tipoFalha: f.tipoFalha,
        categoriaFalha: f.categoriaFalha,
        descricao: f.descricao,
        severidade: f.severidade,
      }));

      const ajustesAplicados = ajustes.map((a: any) => ({
        tipoAjuste: a.tipoAjuste,
        codigoItem: a.codigoItem,
        descricaoItem: a.descricaoItem,
        quantidadeOriginal: a.quantidadeOriginal,
        valorOriginal: a.valorOriginal,
        quantidadeAjustada: a.quantidadeAjustada,
        valorAjustado: a.valorAjustado,
        justificativa: a.justificativa,
      }));

      // 7. Calcular totais
      const valorTotal = itens.reduce((sum: number, item: any) => sum + parseFloat(item.valorTotal || "0"), 0);

      // 8. Verificar se já existe snapshot para esta conta
      const existingSnapshot = await db.select().from(snapshotAuditoria).where(
        and(
          eq(snapshotAuditoria.numeroConta, input.numeroConta),
          eq(snapshotAuditoria.estabelecimentoId, input.estabelecimentoId),
          eq(snapshotAuditoria.status, "aguardando_correcao"),
        )
      ).limit(1);

      if (existingSnapshot.length > 0) {
        // Atualizar snapshot existente
        await db.update(snapshotAuditoria)
          .set({
            itensSnapshot: itensSnapshot,
            divergenciasAceitas: divergenciasAceitas,
            falhasAbertas: falhasAbertas,
            ajustesAplicados: ajustesAplicados,
            totalItens: itens.length,
            valorTotal: valorTotal.toFixed(2),
            totalDivergenciasAceitas: divergencias.length,
            totalFalhasAbertas: falhas.length,
            totalAjustes: ajustes.length,
            auditorId: ctx.user.id,
            auditorNome: ctx.user.name || "Auditor",
          })
          .where(eq(snapshotAuditoria.id, existingSnapshot[0].id));

        return {
          success: true,
          snapshotId: existingSnapshot[0].id,
          atualizado: true,
          resumo: {
            totalItens: itens.length,
            valorTotal,
            divergenciasAceitas: divergencias.length,
            falhasAbertas: falhas.length,
            ajustes: ajustes.length,
          },
        };
      }

      // 9. Inserir novo snapshot
      const [result] = await db.insert(snapshotAuditoria).values({
        numeroConta: input.numeroConta,
        estabelecimentoId: input.estabelecimentoId,
        convenio: resumo[0]?.convenio || itens[0]?.convenio || null,
        convenioId: resumo[0]?.convenioId || itens[0]?.convenioId || null,
        pacienteNome: resumo[0]?.pacienteNome || itens[0]?.pacienteNome || null,
        itensSnapshot: itensSnapshot,
        divergenciasAceitas: divergenciasAceitas,
        falhasAbertas: falhasAbertas,
        ajustesAplicados: ajustesAplicados,
        totalItens: itens.length,
        valorTotal: valorTotal.toFixed(2),
        totalDivergenciasAceitas: divergencias.length,
        totalFalhasAbertas: falhas.length,
        totalAjustes: ajustes.length,
        auditorId: ctx.user.id,
        auditorNome: ctx.user.name || "Auditor",
        status: "aguardando_correcao",
      });

      return {
        success: true,
        snapshotId: (result as any).insertId,
        atualizado: false,
        resumo: {
          totalItens: itens.length,
          valorTotal,
          divergenciasAceitas: divergencias.length,
          falhasAbertas: falhas.length,
          ajustes: ajustes.length,
        },
      };
    }),

  // ============ EXECUTAR COMPARAÇÃO (após reimportação) ============
  executarComparacao: protectedProcedure
    .input(z.object({
      snapshotId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // 1. Buscar snapshot
      const snapshot = await db.select().from(snapshotAuditoria)
        .where(eq(snapshotAuditoria.id, input.snapshotId))
        .limit(1);

      if (snapshot.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snapshot não encontrado." });
      }

      const snap = snapshot[0];

      // 2. Buscar itens atuais (reimportados)
      const itensAtuais = await db.select().from(contasConvenioItens).where(
        and(
          eq(contasConvenioItens.numeroConta, snap.numeroConta),
          eq(contasConvenioItens.estabelecimentoId, snap.estabelecimentoId),
        )
      );

      // 3. Limpar conferências anteriores deste snapshot
      await db.delete(conferenciaCorrecao).where(eq(conferenciaCorrecao.snapshotId, input.snapshotId));

      const itensSnap = (snap.itensSnapshot as any[]) || [];
      const divergenciasAceitas = (snap.divergenciasAceitas as any[]) || [];
      const falhasAbertas = (snap.falhasAbertas as any[]) || [];
      const ajustesAplicados = (snap.ajustesAplicados as any[]) || [];

      // Criar mapa de itens atuais por código
      const mapAtual = new Map<string, any[]>();
      for (const item of itensAtuais) {
        const key = item.codigoItem || "";
        if (!mapAtual.has(key)) mapAtual.set(key, []);
        mapAtual.get(key)!.push(item);
      }

      // Criar mapa de itens do snapshot por código
      const mapSnap = new Map<string, any[]>();
      for (const item of itensSnap) {
        const key = item.codigoItem || "";
        if (!mapSnap.has(key)) mapSnap.set(key, []);
        mapSnap.get(key)!.push(item);
      }

      const conferencias: any[] = [];

      // 4. Comparar divergências aceitas (itens que o faturista DEVERIA ter corrigido)
      for (const div of divergenciasAceitas) {
        const codigoItem = div.codigoItem || "";
        const itensSnapCodigo = mapSnap.get(codigoItem) || [];
        const itensAtualCodigo = mapAtual.get(codigoItem) || [];

        const itemSnapOriginal = itensSnapCodigo[0];
        const itemAtualCorrespondente = itensAtualCodigo[0];

        let statusCorrecao: string;
        let descricaoMudanca: string;
        let valorAntes = itemSnapOriginal ? parseFloat(itemSnapOriginal.valorTotal || "0") : null;
        let quantidadeAntes = itemSnapOriginal ? parseFloat(itemSnapOriginal.quantidade || "0") : null;
        let valorDepois = itemAtualCorrespondente ? parseFloat(itemAtualCorrespondente.valorTotal || "0") : null;
        let quantidadeDepois = itemAtualCorrespondente ? parseFloat(itemAtualCorrespondente.quantidade || "0") : null;

        if (!itemAtualCorrespondente) {
          statusCorrecao = "item_removido";
          descricaoMudanca = `Item ${codigoItem} foi removido na reimportação`;
        } else if (!itemSnapOriginal) {
          statusCorrecao = "item_adicionado";
          descricaoMudanca = `Item ${codigoItem} é novo na reimportação`;
        } else {
          // Comparar valores
          const valorMudou = valorAntes !== valorDepois;
          const qtdMudou = quantidadeAntes !== quantidadeDepois;

          if (valorMudou || qtdMudou) {
            // Verificar se a mudança foi na direção esperada
            const dadosDiv = div.dadosDivergencia as any;
            if (dadosDiv && dadosDiv.valorEsperado) {
              const valorEsperado = parseFloat(dadosDiv.valorEsperado);
              if (Math.abs((valorDepois || 0) - valorEsperado) < 0.01) {
                statusCorrecao = "corrigido";
                descricaoMudanca = `Valor corrigido de R$ ${valorAntes?.toFixed(2)} para R$ ${valorDepois?.toFixed(2)} (esperado: R$ ${valorEsperado.toFixed(2)})`;
              } else {
                statusCorrecao = "parcialmente_corrigido";
                descricaoMudanca = `Valor alterado de R$ ${valorAntes?.toFixed(2)} para R$ ${valorDepois?.toFixed(2)}, mas esperado era R$ ${valorEsperado.toFixed(2)}`;
              }
            } else if (dadosDiv && dadosDiv.quantidadeEsperada) {
              const qtdEsperada = parseFloat(dadosDiv.quantidadeEsperada);
              if (Math.abs((quantidadeDepois || 0) - qtdEsperada) < 0.001) {
                statusCorrecao = "corrigido";
                descricaoMudanca = `Quantidade corrigida de ${quantidadeAntes} para ${quantidadeDepois} (esperado: ${qtdEsperada})`;
              } else {
                statusCorrecao = "parcialmente_corrigido";
                descricaoMudanca = `Quantidade alterada de ${quantidadeAntes} para ${quantidadeDepois}, mas esperado era ${qtdEsperada}`;
              }
            } else {
              // Sem valor esperado definido, mas houve mudança
              statusCorrecao = "corrigido";
              descricaoMudanca = `Item alterado: valor ${valorMudou ? `R$ ${valorAntes?.toFixed(2)} → R$ ${valorDepois?.toFixed(2)}` : "mantido"}, qtd ${qtdMudou ? `${quantidadeAntes} → ${quantidadeDepois}` : "mantida"}`;
            }
          } else {
            statusCorrecao = "nao_corrigido";
            descricaoMudanca = `Item permanece inalterado (valor: R$ ${valorAntes?.toFixed(2)}, qtd: ${quantidadeAntes})`;
          }
        }

        const impactoFinanceiro = (valorDepois || 0) - (valorAntes || 0);

        conferencias.push({
          snapshotId: input.snapshotId,
          numeroConta: snap.numeroConta,
          estabelecimentoId: snap.estabelecimentoId,
          codigoItem,
          descricaoItem: itemSnapOriginal?.descricaoItem || itemAtualCorrespondente?.descricaoItem || div.descricaoItem || "",
          tipoItem: itemSnapOriginal?.tipoItem || itemAtualCorrespondente?.tipoItem || "",
          tipoApontamento: "divergencia_aceita",
          valorAntes: valorAntes?.toFixed(2) || null,
          quantidadeAntes: quantidadeAntes?.toFixed(4) || null,
          detalhesAntes: div,
          valorDepois: valorDepois?.toFixed(2) || null,
          quantidadeDepois: quantidadeDepois?.toFixed(4) || null,
          detalhesDepois: itemAtualCorrespondente || null,
          statusCorrecao,
          descricaoMudanca,
          impactoFinanceiro: impactoFinanceiro.toFixed(2),
        });
      }

      // 5. Comparar ajustes da auditoria
      for (const ajuste of ajustesAplicados) {
        const codigoItem = ajuste.codigoItem || "";
        const itensAtualCodigo = mapAtual.get(codigoItem) || [];
        const itemAtual = itensAtualCodigo[0];

        let statusCorrecao: string;
        let descricaoMudanca: string;
        const valorAntes = parseFloat(ajuste.valorOriginal || "0");
        const valorAjustado = parseFloat(ajuste.valorAjustado || "0");
        const valorDepois = itemAtual ? parseFloat(itemAtual.valorTotal || "0") : null;

        if (!itemAtual && ajuste.tipoAjuste === "REMOVER_ITEM") {
          statusCorrecao = "corrigido";
          descricaoMudanca = `Item removido conforme ajuste da auditoria`;
        } else if (!itemAtual) {
          statusCorrecao = "item_removido";
          descricaoMudanca = `Item ${codigoItem} não encontrado na reimportação`;
        } else if (Math.abs((valorDepois || 0) - valorAjustado) < 0.01) {
          statusCorrecao = "corrigido";
          descricaoMudanca = `Valor ajustado corretamente para R$ ${valorAjustado.toFixed(2)}`;
        } else if (valorDepois !== valorAntes) {
          statusCorrecao = "parcialmente_corrigido";
          descricaoMudanca = `Valor alterado para R$ ${valorDepois?.toFixed(2)}, mas auditoria esperava R$ ${valorAjustado.toFixed(2)}`;
        } else {
          statusCorrecao = "nao_corrigido";
          descricaoMudanca = `Valor permanece R$ ${valorAntes.toFixed(2)}, auditoria ajustou para R$ ${valorAjustado.toFixed(2)}`;
        }

        conferencias.push({
          snapshotId: input.snapshotId,
          numeroConta: snap.numeroConta,
          estabelecimentoId: snap.estabelecimentoId,
          codigoItem,
          descricaoItem: ajuste.descricaoItem || "",
          tipoItem: "",
          tipoApontamento: "ajuste_auditoria",
          valorAntes: valorAntes.toFixed(2),
          quantidadeAntes: ajuste.quantidadeOriginal || null,
          detalhesAntes: ajuste,
          valorDepois: valorDepois?.toFixed(2) || null,
          quantidadeDepois: itemAtual?.quantidade || null,
          detalhesDepois: itemAtual || null,
          statusCorrecao,
          descricaoMudanca,
          impactoFinanceiro: ((valorDepois || 0) - valorAntes).toFixed(2),
        });
      }

      // 6. Comparar falhas de prontuário
      for (const falha of falhasAbertas) {
        // Buscar status atual da falha
        const falhaAtual = await db.select().from(falhasProntuario)
          .where(eq(falhasProntuario.id, falha.id))
          .limit(1);

        const statusAtual = falhaAtual[0]?.status || "aberta";
        let statusCorrecao: string;
        let descricaoMudanca: string;

        if (statusAtual === "corrigida") {
          statusCorrecao = "corrigido";
          descricaoMudanca = `Falha de prontuário "${falha.tipoFalha}" foi corrigida`;
        } else if (statusAtual === "justificada") {
          statusCorrecao = "parcialmente_corrigido";
          descricaoMudanca = `Falha de prontuário "${falha.tipoFalha}" foi justificada mas não corrigida`;
        } else {
          statusCorrecao = "nao_corrigido";
          descricaoMudanca = `Falha de prontuário "${falha.tipoFalha}" permanece aberta`;
        }

        conferencias.push({
          snapshotId: input.snapshotId,
          numeroConta: snap.numeroConta,
          estabelecimentoId: snap.estabelecimentoId,
          codigoItem: null,
          descricaoItem: falha.tipoFalha,
          tipoItem: "PRONTUARIO",
          tipoApontamento: "falha_prontuario",
          valorAntes: null,
          quantidadeAntes: null,
          detalhesAntes: falha,
          valorDepois: null,
          quantidadeDepois: null,
          detalhesDepois: falhaAtual[0] || null,
          statusCorrecao,
          descricaoMudanca,
          impactoFinanceiro: null,
        });
      }

      // 7. Inserir conferências em batch
      if (conferencias.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < conferencias.length; i += batchSize) {
          const batch = conferencias.slice(i, i + batchSize);
          await db.insert(conferenciaCorrecao).values(batch);
        }
      }

      // 8. Atualizar status do snapshot e registrar data de correção
      await db.update(snapshotAuditoria)
        .set({ status: "reimportado", dataCorrecao: new Date() })
        .where(eq(snapshotAuditoria.id, input.snapshotId));

      // 9. Calcular resumo
      const corrigidos = conferencias.filter(c => c.statusCorrecao === "corrigido").length;
      const parciais = conferencias.filter(c => c.statusCorrecao === "parcialmente_corrigido").length;
      const naoCorrigidos = conferencias.filter(c => c.statusCorrecao === "nao_corrigido").length;
      const removidos = conferencias.filter(c => c.statusCorrecao === "item_removido").length;
      const adicionados = conferencias.filter(c => c.statusCorrecao === "item_adicionado").length;

      return {
        success: true,
        totalComparados: conferencias.length,
        resumo: {
          corrigidos,
          parcialmenteCorrigidos: parciais,
          naoCorrigidos,
          itensRemovidos: removidos,
          itensAdicionados: adicionados,
          taxaCorrecao: conferencias.length > 0
            ? Math.round((corrigidos / conferencias.length) * 100)
            : 0,
        },
      };
    }),

  // ============ LISTAR SNAPSHOTS ============
  listarSnapshots: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
      status: z.enum(["aguardando_correcao", "reimportado", "conferido", "aprovado", "reprovado"]).optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(20),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions = [eq(snapshotAuditoria.estabelecimentoId, input.estabelecimentoId)];
      if (input.status) {
        conditions.push(eq(snapshotAuditoria.status, input.status));
      }

      const offset = (input.page - 1) * input.pageSize;

      const [snapshots, countResult] = await Promise.all([
        db.select({
          id: snapshotAuditoria.id,
          numeroConta: snapshotAuditoria.numeroConta,
          convenio: snapshotAuditoria.convenio,
          pacienteNome: snapshotAuditoria.pacienteNome,
          totalItens: snapshotAuditoria.totalItens,
          valorTotal: snapshotAuditoria.valorTotal,
          totalDivergenciasAceitas: snapshotAuditoria.totalDivergenciasAceitas,
          totalFalhasAbertas: snapshotAuditoria.totalFalhasAbertas,
          totalAjustes: snapshotAuditoria.totalAjustes,
          auditorNome: snapshotAuditoria.auditorNome,
          status: snapshotAuditoria.status,
          createdAt: snapshotAuditoria.createdAt,
          updatedAt: snapshotAuditoria.updatedAt,
        })
          .from(snapshotAuditoria)
          .where(and(...conditions))
          .orderBy(desc(snapshotAuditoria.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(snapshotAuditoria)
          .where(and(...conditions)),
      ]);

      return {
        snapshots,
        total: Number(countResult[0]?.count || 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // ============ DETALHES DO SNAPSHOT ============
  detalhesSnapshot: protectedProcedure
    .input(z.object({ snapshotId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const snapshot = await db.select().from(snapshotAuditoria)
        .where(eq(snapshotAuditoria.id, input.snapshotId))
        .limit(1);

      if (snapshot.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snapshot não encontrado." });
      }

      // Buscar conferências se existirem
      const conferencias = await db.select().from(conferenciaCorrecao)
        .where(eq(conferenciaCorrecao.snapshotId, input.snapshotId))
        .orderBy(conferenciaCorrecao.statusCorrecao);

      return {
        snapshot: snapshot[0],
        conferencias,
      };
    }),

  // ============ ATUALIZAR STATUS DO SNAPSHOT ============
  atualizarStatus: protectedProcedure
    .input(z.object({
      snapshotId: z.number(),
      status: z.enum(["conferido", "aprovado", "reprovado"]),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      // Se está aprovando/conferindo e não tinha dataCorrecao, registrar agora
      const setData: any = { status: input.status };
      if (input.status === "aprovado" || input.status === "conferido") {
        const existing = await db.select({ dataCorrecao: snapshotAuditoria.dataCorrecao })
          .from(snapshotAuditoria)
          .where(eq(snapshotAuditoria.id, input.snapshotId));
        if (existing[0] && !existing[0].dataCorrecao) {
          setData.dataCorrecao = new Date();
        }
      }
      await db.update(snapshotAuditoria)
        .set(setData)
        .where(eq(snapshotAuditoria.id, input.snapshotId));

      return { success: true };
    }),

  // ============ DASHBOARD DE CONFERÊNCIA ============
  dashboard: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      // Contagem por status
      const statusCounts = await db.select({
        status: snapshotAuditoria.status,
        count: sql<number>`count(*)`,
      })
        .from(snapshotAuditoria)
        .where(eq(snapshotAuditoria.estabelecimentoId, input.estabelecimentoId))
        .groupBy(snapshotAuditoria.status);

      // Resumo de conferências (taxa de correção geral)
      const conferenciasResumo = await db.select({
        statusCorrecao: conferenciaCorrecao.statusCorrecao,
        count: sql<number>`count(*)`,
      })
        .from(conferenciaCorrecao)
        .where(eq(conferenciaCorrecao.estabelecimentoId, input.estabelecimentoId))
        .groupBy(conferenciaCorrecao.statusCorrecao);

      // Últimos snapshots
      const ultimosSnapshots = await db.select({
        id: snapshotAuditoria.id,
        numeroConta: snapshotAuditoria.numeroConta,
        convenio: snapshotAuditoria.convenio,
        pacienteNome: snapshotAuditoria.pacienteNome,
        status: snapshotAuditoria.status,
        totalDivergenciasAceitas: snapshotAuditoria.totalDivergenciasAceitas,
        auditorNome: snapshotAuditoria.auditorNome,
        createdAt: snapshotAuditoria.createdAt,
      })
        .from(snapshotAuditoria)
        .where(eq(snapshotAuditoria.estabelecimentoId, input.estabelecimentoId))
        .orderBy(desc(snapshotAuditoria.createdAt))
        .limit(10);

      // Calcular totais
      const statusMap: Record<string, number> = {};
      for (const s of statusCounts) {
        statusMap[s.status] = Number(s.count);
      }

      const conferenciaMap: Record<string, number> = {};
      let totalConferencias = 0;
      for (const c of conferenciasResumo) {
        conferenciaMap[c.statusCorrecao] = Number(c.count);
        totalConferencias += Number(c.count);
      }

      const corrigidos = conferenciaMap["corrigido"] || 0;
      const taxaCorrecaoGeral = totalConferencias > 0
        ? Math.round((corrigidos / totalConferencias) * 100)
        : 0;

      return {
        contasPorStatus: {
          aguardandoCorrecao: statusMap["aguardando_correcao"] || 0,
          reimportadas: statusMap["reimportado"] || 0,
          conferidas: statusMap["conferido"] || 0,
          aprovadas: statusMap["aprovado"] || 0,
          reprovadas: statusMap["reprovado"] || 0,
        },
        conferencias: {
          corrigidos: conferenciaMap["corrigido"] || 0,
          parcialmenteCorrigidos: conferenciaMap["parcialmente_corrigido"] || 0,
          naoCorrigidos: conferenciaMap["nao_corrigido"] || 0,
          itensRemovidos: conferenciaMap["item_removido"] || 0,
          itensAdicionados: conferenciaMap["item_adicionado"] || 0,
          total: totalConferencias,
          taxaCorrecaoGeral,
        },
        ultimosSnapshots,
      };
    }),

  // ============ BUSCAR SNAPSHOT POR CONTA (para verificar se já existe) ============
  buscarPorConta: protectedProcedure
    .input(z.object({
      numeroConta: z.string(),
      estabelecimentoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const snapshots = await db.select({
        id: snapshotAuditoria.id,
        status: snapshotAuditoria.status,
        totalDivergenciasAceitas: snapshotAuditoria.totalDivergenciasAceitas,
        totalFalhasAbertas: snapshotAuditoria.totalFalhasAbertas,
        totalAjustes: snapshotAuditoria.totalAjustes,
        auditorNome: snapshotAuditoria.auditorNome,
        createdAt: snapshotAuditoria.createdAt,
      })
        .from(snapshotAuditoria)
        .where(
          and(
            eq(snapshotAuditoria.numeroConta, input.numeroConta),
            eq(snapshotAuditoria.estabelecimentoId, input.estabelecimentoId),
          )
        )
        .orderBy(desc(snapshotAuditoria.createdAt));

      return { snapshots };
    }),
});
