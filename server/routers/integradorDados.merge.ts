/**
 * Procedure de merge inteligente para sincronizações incrementais
 * Detecta registros duplicados e atualiza apenas campos que mudaram
 */

import { z } from "zod";
import { protectedProcedure } from "../_core/procedures";
import { getDb } from "../db";
import { atendimentos, atendimentosHistorico } from "../../drizzle/schema-integracao";
import { eq, and } from "drizzle-orm";
import { detectarMudancas, prepararCamposAtualizacao, MergeResult } from "../db.merge";

export const mergeInteligenteProcedure = protectedProcedure
  .input(
    z.object({
      configId: z.number(),
      registrosNovos: z.array(
        z.object({
          origemId: z.string(),
          numero_atendimento: z.string().optional(),
          codigo_saida: z.string().optional(),
          convenio: z.string().optional(),
          paciente: z.string().optional(),
          caracter_atendimento: z.string().optional(),
          data_entrada: z.date().optional(),
          data_saida: z.date().optional(),
          tipo_atendimento: z.string().optional(),
          descricao_atendimento: z.string().optional(),
          codigo_servico: z.string().optional(),
          codigo_procedimento: z.string().optional(),
          destino_conta: z.string().optional(),
        })
      ),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      if (ctx.user?.role !== "admin") {
        throw new Error("Acesso negado");
      }

      const db = await getDb();
      if (!db) throw new Error("Banco de dados nao disponivel");

      const resultados: MergeResult[] = [];
      let criados = 0;
      let atualizados = 0;
      let semAlteracao = 0;

      // Processar cada registro novo
      for (const registroNovo of input.registrosNovos) {
        // Buscar registro existente
        const registroExistente = await db
          .select()
          .from(atendimentos)
          .where(eq(atendimentos.origemId, registroNovo.origemId))
          .limit(1)
          .then((rows) => rows[0]);

        if (!registroExistente) {
          // Criar novo registro
          const novoRegistro = {
            origemSistema: "WARLEINE",
            origemId: registroNovo.origemId,
            estabelecimentoId: ctx.user.estabelecimentoId || 1,
            numero_atendimento: registroNovo.numero_atendimento,
            codigo_saida: registroNovo.codigo_saida,
            convenio: registroNovo.convenio,
            paciente: registroNovo.paciente,
            caracter_atendimento: registroNovo.caracter_atendimento,
            data_entrada: registroNovo.data_entrada,
            data_saida: registroNovo.data_saida,
            tipo_atendimento: registroNovo.tipo_atendimento,
            descricao_atendimento: registroNovo.descricao_atendimento,
            codigo_servico: registroNovo.codigo_servico,
            codigo_procedimento: registroNovo.codigo_procedimento,
            destino_conta: registroNovo.destino_conta,
            dataSincronizacao: new Date(),
          };

          const resultado = await db.insert(atendimentos).values(novoRegistro);
          const novoId = resultado.insertId as number;

          resultados.push({
            acao: "criado",
            registroId: novoId,
            camposAlterados: [],
          });

          criados++;
        } else {
          // Comparar com registro existente
          const { temMudancas, camposAlterados, valoresAntigos, valoresNovos } =
            detectarMudancas(registroExistente, {
              numero_atendimento: registroNovo.numero_atendimento,
              codigo_saida: registroNovo.codigo_saida,
              convenio: registroNovo.convenio,
              paciente: registroNovo.paciente,
              caracter_atendimento: registroNovo.caracter_atendimento,
              data_entrada: registroNovo.data_entrada,
              data_saida: registroNovo.data_saida,
              tipo_atendimento: registroNovo.tipo_atendimento,
              descricao_atendimento: registroNovo.descricao_atendimento,
              codigo_servico: registroNovo.codigo_servico,
              codigo_procedimento: registroNovo.codigo_procedimento,
              destino_conta: registroNovo.destino_conta,
            });

          if (temMudancas) {
            // Atualizar apenas campos que mudaram
            const camposAtualizacao = prepararCamposAtualizacao(
              registroExistente,
              {
                numero_atendimento: registroNovo.numero_atendimento,
                codigo_saida: registroNovo.codigo_saida,
                convenio: registroNovo.convenio,
                paciente: registroNovo.paciente,
                caracter_atendimento: registroNovo.caracter_atendimento,
                data_entrada: registroNovo.data_entrada,
                data_saida: registroNovo.data_saida,
                tipo_atendimento: registroNovo.tipo_atendimento,
                descricao_atendimento: registroNovo.descricao_atendimento,
                codigo_servico: registroNovo.codigo_servico,
                codigo_procedimento: registroNovo.codigo_procedimento,
                destino_conta: registroNovo.destino_conta,
              }
            );

            await db
              .update(atendimentos)
              .set(camposAtualizacao)
              .where(eq(atendimentos.id, registroExistente.id));

            // Registrar no histórico
            for (const campo of camposAlterados) {
              await db.insert(atendimentosHistorico).values({
                atendimentoId: registroExistente.id,
                campoAlterado: campo,
                valorAnterior: String(valoresAntigos[campo]),
                valorNovo: String(valoresNovos[campo]),
              });
            }

            resultados.push({
              acao: "atualizado",
              registroId: registroExistente.id,
              camposAlterados,
              valoresAntigos,
              valoresNovos,
            });

            atualizados++;
          } else {
            // Nenhuma mudança
            resultados.push({
              acao: "sem_alteracao",
              registroId: registroExistente.id,
              camposAlterados: [],
            });

            semAlteracao++;
          }
        }
      }

      return {
        sucesso: true,
        mensagem: `Merge concluído: ${criados} criados, ${atualizados} atualizados, ${semAlteracao} sem alteração`,
        estatisticas: {
          total: input.registrosNovos.length,
          criados,
          atualizados,
          semAlteracao,
        },
        resultados: resultados.slice(0, 10), // Retornar apenas os 10 primeiros para não sobrecarregar
      };
    } catch (error) {
      console.error("[ERROR] Merge inteligente:", error);
      return {
        sucesso: false,
        mensagem: error instanceof Error ? error.message : "Erro ao executar merge inteligente",
        estatisticas: {
          total: input.registrosNovos.length,
          criados: 0,
          atualizados: 0,
          semAlteracao: 0,
        },
        resultados: [],
      };
    }
  });
