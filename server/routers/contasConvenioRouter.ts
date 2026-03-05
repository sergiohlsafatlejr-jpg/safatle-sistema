import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { contasConvenioItens, contasConvenioResumo, integracaoMapeamentos, integracaoConexoes } from "../../drizzle/schema";
import { queryConfiguracoes } from "../../drizzle/schema-integracao";
import { eq, and, sql, desc, like, or, inArray } from "drizzle-orm";
import { WarleineConnector } from "../connectors/WarleineConnector";
import { EasyVisionConnector } from "../connectors/EasyVisionConnector";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";

/**
 * Router para Contas Convênio - Gestão Operacional
 * 
 * Duas fontes de dados:
 * 1. Busca em tempo real no banco do cliente (Warleine) por número de conta
 * 2. Importação de XML (TISS) - reutiliza parser existente
 * 
 * Dados são salvos na tabela contas_convenio_itens para análise e comparação com padrões.
 */
export const contasConvenioRouter = router({

  // ============================================================
  // BUSCAR CONTA NO BANCO DO CLIENTE (via Integrador de Dados)
  // ============================================================
  buscarConta: protectedProcedure
    .input(z.object({
      numeroConta: z.string().min(1, "Número da conta é obrigatório"),
      estabelecimentoId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não disponível" });

      logger.info({
        message: "Buscando conta via Integrador de Dados",
        numeroConta: input.numeroConta,
        estabelecimentoId: input.estabelecimentoId,
      });

      // ============================================================
      // 1. Buscar mapeamento "Busca Conta" na tabela integracao_mapeamentos
      //    (cadastrado via Integrador de Dados > Mapeamentos)
      // ============================================================
      const mapeamentos = await db
        .select()
        .from(integracaoMapeamentos)
        .where(
          and(
            eq(integracaoMapeamentos.estabelecimentoId, input.estabelecimentoId),
            eq(integracaoMapeamentos.ativo, "sim"),
            like(integracaoMapeamentos.nome, "%Busca Conta%"),
          )
        )
        .limit(1);

      // Fallback: tentar também na query_configuracoes (compatibilidade)
      let querySql: string;
      let conexaoConfig: { host: string; port: number; database: string; user: string; password: string } | null = null;
      let configSource = "";

      if (mapeamentos.length > 0) {
        // Encontrou no integracao_mapeamentos
        const mapeamento = mapeamentos[0];
        querySql = mapeamento.queryOrigem;
        configSource = `mapeamento #${mapeamento.id}`;

        // Buscar conexão associada
        const [conexao] = await db
          .select()
          .from(integracaoConexoes)
          .where(eq(integracaoConexoes.id, mapeamento.conexaoOrigemId));

        if (conexao) {
          const senha = Buffer.from(conexao.senhaEncriptada, "base64").toString("utf-8");
          conexaoConfig = {
            host: conexao.host,
            port: conexao.porta,
            database: conexao.banco,
            user: conexao.usuario,
            password: senha,
          };
        }
      } else {
        // Fallback: buscar na query_configuracoes (modelo antigo)
        const configs = await db
          .select()
          .from(queryConfiguracoes)
          .where(
            and(
              eq(queryConfiguracoes.estabelecimentoId, input.estabelecimentoId),
              eq(queryConfiguracoes.tipoDados, "busca_conta"),
              eq(queryConfiguracoes.ativo, true),
            )
          )
          .limit(1);

        if (configs.length > 0) {
          const config = configs[0];
          querySql = config.querySql;
          configSource = `query_config #${config.id}`;

          if (config.conexaoConfig) {
            const parsed = typeof config.conexaoConfig === "string"
              ? JSON.parse(config.conexaoConfig)
              : config.conexaoConfig;
            conexaoConfig = parsed;
          }
        } else {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Nenhuma configuração de "Busca Conta" encontrada para este estabelecimento. Acesse o Integrador de Dados > Mapeamentos e cadastre um mapeamento com nome "Busca Conta" vinculado à conexão do banco do hospital.`,
          });
        }
      }

      // Fallback para variáveis de ambiente se a conexão não foi encontrada
      if (!conexaoConfig && ENV.warleineDbHost) {
        conexaoConfig = {
          host: ENV.warleineDbHost,
          port: parseInt(ENV.warleineDbPort),
          database: ENV.warleineDbName,
          user: ENV.warleineDbUser,
          password: ENV.warleineDbPassword,
        };
        configSource += " (fallback ENV)";
      }

      if (!conexaoConfig) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Nenhuma conexão configurada para busca de conta. Configure a conexão no Integrador de Dados.",
        });
      }

      logger.info({
        message: "Usando configuração do Integrador de Dados",
        source: configSource,
        conexao: { ...conexaoConfig, password: "***" },
      });

      // ============================================================
      // 2. Conectar ao banco do hospital (PostgreSQL)
      // ============================================================
      const connector = new EasyVisionConnector(conexaoConfig);

      let conectado = false;
      try {
        conectado = await connector.conectar();
      } catch (connError) {
        const errMsg = connError instanceof Error ? connError.message : String(connError);
        logger.error({
          message: "Erro ao conectar ao banco do hospital",
          error: errMsg,
          host: conexaoConfig.host,
          port: conexaoConfig.port,
          database: conexaoConfig.database,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao conectar ao banco do hospital (${conexaoConfig.host}:${conexaoConfig.port}/${conexaoConfig.database}): ${errMsg}`,
        });
      }

      if (!conectado) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Falha ao conectar ao banco do hospital (${conexaoConfig.host}:${conexaoConfig.port}/${conexaoConfig.database}). Verifique se o servidor está acessível e as credenciais estão corretas no Integrador de Dados.`,
        });
      }

      try {
        // ============================================================
        // 3. Executar a query cadastrada no Integrador
        //    A query deve usar $1 como placeholder para o número da conta
        // ============================================================
        logger.info({
          message: "Executando query de busca de conta",
          source: configSource,
          numeroConta: input.numeroConta,
          queryPreview: querySql.substring(0, 200) + "...",
        });

        let dados: any[];
        try {
          dados = await connector.executarQuery(querySql, [input.numeroConta]);
        } catch (queryError) {
          logger.warn({
            message: "Query do Integrador falhou, tentando busca local",
            error: queryError instanceof Error ? queryError.message : String(queryError),
          });

          await connector.desconectar();

          // Fallback: buscar da tabela local integ_faturado (dados já sincronizados)
          const localResult = await db.execute(sql`
            SELECT 
              numconta as numconta,
              guiacobra,
              aihguia,
              protocolo,
              numfatura,
              nomeconv,
              codconv,
              matricula,
              tipoproc,
              procdisco as codigoitem,
              codproprio as codigoitemtuss,
              descricao,
              data as dataexecucao,
              dataint as datainternacao,
              datasai as dataalta,
              mesprod as competencia,
              nomeprest,
              prestexe,
              nomecc as setor,
              vl_unitario as valorunitario,
              quantidade,
              vl_faturado as valortotal,
              codtiss,
              funcaotiss,
              codcc,
              receber,
              '' as pacientenome
            FROM integ_faturado
            WHERE numconta = ${input.numeroConta}
              AND estabelecimento_id = ${input.estabelecimentoId}
            ORDER BY data, tipoproc, descricao
          `);

          dados = (localResult as any)[0] || [];
        }

        await connector.desconectar();

        if (!dados || dados.length === 0) {
          return {
            sucesso: false,
            mensagem: `Conta ${input.numeroConta} não encontrada no banco do cliente.`,
            totalItens: 0,
            conta: null,
          };
        }

        // Log dos campos retornados para debug
        if (dados.length > 0) {
          logger.info({
            message: "Conta encontrada - campos retornados",
            numeroConta: input.numeroConta,
            totalItens: dados.length,
            camposDisponiveis: Object.keys(dados[0]),
            amostra: Object.fromEntries(
              Object.entries(dados[0]).map(([k, v]) => [k, v === null ? 'NULL' : String(v).substring(0, 50)])
            ),
          });
        } else {
          logger.info({
            message: "Conta encontrada no Warleine (sem itens)",
            numeroConta: input.numeroConta,
            totalItens: dados.length,
          });
        }

        // Limpar dados existentes desta conta (se já foi buscada antes)
        await db.delete(contasConvenioItens).where(
          and(
            eq(contasConvenioItens.numeroConta, input.numeroConta),
            eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
            eq(contasConvenioItens.origem, "BANCO_CLIENTE"),
          )
        );

        // Limpar resumo existente
        await db.delete(contasConvenioResumo).where(
          and(
            eq(contasConvenioResumo.numeroConta, input.numeroConta),
            eq(contasConvenioResumo.estabelecimentoId, input.estabelecimentoId),
            eq(contasConvenioResumo.origem, "BANCO_CLIENTE"),
          )
        );

        // Inserir itens na nova tabela
        const BATCH_SIZE = 100;
        let totalInseridos = 0;
        let valorTotalConta = 0;
        const primeiroItem = dados[0];

        // Helper: busca campo flexível (aceita múltiplos nomes possíveis)
        const getField = (row: any, ...names: string[]): any => {
          for (const name of names) {
            if (row[name] !== undefined && row[name] !== null) return row[name];
            // Tentar lowercase
            if (row[name.toLowerCase()] !== undefined && row[name.toLowerCase()] !== null) return row[name.toLowerCase()];
          }
          return null;
        };

        const parseNum = (val: any): number => {
          if (val === null || val === undefined) return 0;
          const n = parseFloat(String(val).replace(',', '.'));
          return isNaN(n) ? 0 : n;
        };

        for (let i = 0; i < dados.length; i += BATCH_SIZE) {
          const batch = dados.slice(i, i + BATCH_SIZE);
          const values = batch.map((row: any) => {
            // Flexibilizar nomes de campos - aceita tanto aliases quanto nomes originais do banco
            const vlUnitario = getField(row, 'valorunitario', 'vl_unitario', 'valor_unitario', 'vlunitario');
            const vlTotal = getField(row, 'valortotal', 'vl_faturado', 'valor_total', 'vlfaturado', 'valor_faturado');
            const qtd = getField(row, 'quantidade', 'qtd', 'qtde');
            const numConta = getField(row, 'numconta', 'numero_conta', 'conta');
            const guia = getField(row, 'guiacobra', 'guia_cobra', 'guia');
            const aihGuia = getField(row, 'aihguia', 'aih_guia', 'aih');
            const nomeConv = getField(row, 'nomeconv', 'nome_conv', 'convenio', 'nomeconvenio');
            const codConv = getField(row, 'codconv', 'cod_conv', 'codigo_convenio');
            const codItem = getField(row, 'codigoitem', 'procdisco', 'cod_item', 'cd_item', 'codigo_item');
            const codTuss = getField(row, 'codigoitemtuss', 'codproprio', 'cod_tuss', 'codigo_tuss', 'cd_item_tuss');
            const desc = getField(row, 'descricao', 'desc_item', 'ds_item');
            const dataExec = getField(row, 'dataexecucao', 'data', 'dt_item', 'data_execucao');
            const dataInt = getField(row, 'datainternacao', 'dataint', 'data_internacao');
            const dataAlta = getField(row, 'dataalta', 'datasai', 'data_alta', 'data_saida');
            const comp = getField(row, 'competencia', 'mesprod', 'mes_prod', 'comp');
            const prest = getField(row, 'nomeprest', 'prestexe', 'nome_prest', 'prof_exec');
            const setor = getField(row, 'setor', 'nomecc', 'nome_cc', 'centro_custo');
            const paciente = getField(row, 'pacientenome', 'nomepaciente', 'nomepac', 'nome_paciente', 'paciente');
            const tipoProc = getField(row, 'tipoproc', 'tipo_proc', 'tipo_item');
            const codRecur = getField(row, 'codrecur', 'cod_recur', 'codigo_recurso');
            const complRecur = getField(row, 'complrecur', 'compl_recur', 'complemento_recurso');
            const codTissGlosa = getField(row, 'codtiss', 'cod_tiss', 'codigo_tiss_glosa');
            const descMotivoGlosa = getField(row, 'descmotivo', 'desc_motivo', 'motivo_glosa');
            const tipoAtend = getField(row, 'tipoatend', 'tipo_atend', 'tipo_atendimento');
            const dataBaixa = getField(row, 'databaixa', 'data_baixa');
            const codPlaco = getField(row, 'codplaco', 'cod_placo');
            const nomePlaco = getField(row, 'nomeplaco', 'nome_placo', 'plano');
            const medSolic = getField(row, 'medsolic', 'med_solic', 'medico_solicitante');
            const nomeMedSolic = getField(row, 'nomemedsolic', 'nome_med_solic', 'nome_medico_solicitante');
            const codGrufi = getField(row, 'codgrufi', 'cod_grufi', 'grupo_financeiro');
            const funcaoTiss = getField(row, 'funcaotiss', 'funcao_tiss');
            const receber = getField(row, 'receber', 'a_receber');
            const codConvVal = getField(row, 'codconv', 'cod_conv', 'codigo_convenio');
            const protocolo = getField(row, 'protocolo', 'num_protocolo');
            const numFatura = getField(row, 'numfatura', 'num_fatura');
            const matricula = getField(row, 'matricula', 'carteirinha');
            const prestExe = getField(row, 'prestexe', 'prest_exe', 'cod_prestador');

            const vt = parseNum(vlTotal);
            valorTotalConta += vt;
            
            // Mapear tipo de procedimento
            let tipoItem = tipoProc || 'OUTROS';
            if (typeof tipoItem === 'string') {
              const ti = tipoItem.toLowerCase();
              if (ti.includes('proc')) tipoItem = 'PROCEDIMENTO';
              else if (ti.includes('diar')) tipoItem = 'DIARIA';
              else if (ti.includes('mat') || ti.includes('med')) tipoItem = 'MAT_MED';
              else if (ti.includes('tax')) tipoItem = 'TAXA';
              else if (ti.includes('gas')) tipoItem = 'GASES';
            }

            return {
              origem: "BANCO_CLIENTE" as const,
              numeroConta: String(numConta || input.numeroConta),
              numeroGuia: guia ? String(guia) : null,
              numeroGuiaOperadora: aihGuia ? String(aihGuia) : null,
              protocolo: protocolo ? String(protocolo) : null,
              numeroLote: numFatura ? String(numFatura) : null,
              pacienteNome: paciente ? String(paciente) : null,
              carteiraBeneficiario: matricula ? String(matricula) : null,
              convenio: nomeConv ? String(nomeConv).trim() : null,
              estabelecimentoId: input.estabelecimentoId,
              tipoItem,
              codigoItem: codItem ? String(codItem) : null,
              codigoItemTuss: codTuss ? String(codTuss) : null,
              descricaoItem: desc ? String(desc) : null,
              quantidade: qtd ? String(parseNum(qtd)) : null,
              valorUnitario: vlUnitario ? String(parseNum(vlUnitario)) : null,
              valorTotal: vt ? String(vt) : null,
              dataExecucao: dataExec ? new Date(dataExec) : null,
              competencia: comp ? String(comp).replace('/', '-') : null,
              profissionalExecutante: prest ? String(prest) : (nomeMedSolic ? String(nomeMedSolic) : null),
              setor: setor ? String(setor) : null,
              statusAnalise: "pendente" as const,
            };
          });

          await db.insert(contasConvenioItens).values(values);
          totalInseridos += batch.length;
        }

        // Criar resumo da conta (usando getField para flexibilidade)
        const resumoConvenio = getField(primeiroItem, 'nomeconv', 'nome_conv', 'convenio', 'nomeconvenio');
        const resumoPaciente = getField(primeiroItem, 'pacientenome', 'nomepaciente', 'nomepac', 'nome_paciente', 'paciente');
        const resumoMatricula = getField(primeiroItem, 'matricula', 'carteirinha', 'carteira');
        const resumoDataInt = getField(primeiroItem, 'datainternacao', 'dataint', 'data_internacao');
        const resumoDataAlta = getField(primeiroItem, 'dataalta', 'datasai', 'data_alta', 'data_saida');
        const resumoComp = getField(primeiroItem, 'competencia', 'mesprod', 'mes_prod', 'comp');

        await db.insert(contasConvenioResumo).values({
          numeroConta: input.numeroConta,
          estabelecimentoId: input.estabelecimentoId,
          origem: "BANCO_CLIENTE",
          convenio: resumoConvenio ? String(resumoConvenio).trim() : null,
          pacienteNome: resumoPaciente ? String(resumoPaciente) : null,
          carteiraBeneficiario: resumoMatricula ? String(resumoMatricula) : null,
          totalItens: totalInseridos,
          valorTotal: String(valorTotalConta),
          dataInternacao: resumoDataInt ? new Date(resumoDataInt) : null,
          dataAlta: resumoDataAlta ? new Date(resumoDataAlta) : null,
          competencia: resumoComp ? String(resumoComp).replace('/', '-') : null,
          statusAnalise: "pendente",
          buscadoPor: ctx.user?.id || null,
        });

        return {
          sucesso: true,
          mensagem: `Conta ${input.numeroConta} importada com ${totalInseridos} itens. Valor total: R$ ${valorTotalConta.toFixed(2)}`,
          totalItens: totalInseridos,
          valorTotal: valorTotalConta,
          convenio: resumoConvenio ? String(resumoConvenio).trim() : null,
          paciente: resumoPaciente ? String(resumoPaciente) : null,
          conta: {
            numeroConta: input.numeroConta,
            convenio: resumoConvenio ? String(resumoConvenio).trim() : null,
            paciente: resumoPaciente ? String(resumoPaciente) : null,
            totalItens: totalInseridos,
            valorTotal: valorTotalConta,
          },
        };
      } catch (error) {
        await connector.desconectar();
        logger.error({
          message: "Erro ao buscar conta no Warleine",
          error: error instanceof Error ? error.message : String(error),
          numeroConta: input.numeroConta,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Erro ao buscar conta: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),

  // ============================================================
  // LISTAR CONTAS (RESUMO)
  // ============================================================
  listarContas: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number().optional(),
      convenio: z.string().optional(),
      origem: z.enum(["XML", "BANCO_CLIENTE"]).optional(),
      statusAnalise: z.enum(["pendente", "conforme", "divergente", "revisado"]).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const estabelecimentoId = input?.estabelecimentoId;
      const convenio = input?.convenio;
      const origem = input?.origem;
      const statusAnalise = input?.statusAnalise;
      const search = input?.search;
      const page = input?.page ?? 1;
      const pageSize = input?.pageSize ?? 20;

      const conditions: any[] = [];

      if (estabelecimentoId) {
        conditions.push(eq(contasConvenioResumo.estabelecimentoId, estabelecimentoId));
      }
      if (convenio) {
        conditions.push(eq(contasConvenioResumo.convenio, convenio));
      }
      if (origem) {
        conditions.push(eq(contasConvenioResumo.origem, origem));
      }
      if (statusAnalise) {
        conditions.push(eq(contasConvenioResumo.statusAnalise, statusAnalise));
      }
      if (search) {
        const searchPattern = `%${search}%`;
        conditions.push(
          or(
            like(contasConvenioResumo.numeroConta, searchPattern),
            like(contasConvenioResumo.pacienteNome, searchPattern),
            like(contasConvenioResumo.convenio, searchPattern),
          )!
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (page - 1) * pageSize;

      const contas = await db
        .select()
        .from(contasConvenioResumo)
        .where(whereClause)
        .orderBy(desc(contasConvenioResumo.criadoEm))
        .limit(pageSize)
        .offset(offset);

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(contasConvenioResumo)
        .where(whereClause);

      const total = countResult[0]?.count || 0;

      // Resumo geral
      const resumoResult = await db
        .select({
          totalContas: sql<number>`COUNT(*)`,
          valorTotal: sql<string>`COALESCE(SUM(CAST(valorTotal AS DECIMAL(14,2))), 0)`,
          totalDivergentes: sql<number>`SUM(CASE WHEN statusAnaliseResumo = 'divergente' THEN 1 ELSE 0 END)`,
          totalConformes: sql<number>`SUM(CASE WHEN statusAnaliseResumo = 'conforme' THEN 1 ELSE 0 END)`,
          totalPendentes: sql<number>`SUM(CASE WHEN statusAnaliseResumo = 'pendente' THEN 1 ELSE 0 END)`,
        })
        .from(contasConvenioResumo)
        .where(whereClause);

      return {
        contas,
        total,
        resumo: resumoResult[0] || { totalContas: 0, valorTotal: "0", totalDivergentes: 0, totalConformes: 0, totalPendentes: 0 },
      };
    }),

  // ============================================================
  // LISTAR ITENS DE UMA CONTA
  // ============================================================
  listarItens: protectedProcedure
    .input(z.object({
      numeroConta: z.string(),
      estabelecimentoId: z.number(),
      tipoItem: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const conditions: any[] = [
        eq(contasConvenioItens.numeroConta, input.numeroConta),
        eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
      ];

      if (input.tipoItem) {
        conditions.push(eq(contasConvenioItens.tipoItem, input.tipoItem));
      }

      const items = await db
        .select()
        .from(contasConvenioItens)
        .where(and(...conditions))
        .orderBy(contasConvenioItens.tipoItem, contasConvenioItens.descricaoItem);

      // Resumo por tipo
      const resumoPorTipo = await db
        .select({
          tipoItem: contasConvenioItens.tipoItem,
          totalItens: sql<number>`COUNT(*)`,
          valorTotal: sql<string>`COALESCE(SUM(CAST(valorTotal AS DECIMAL(14,2))), 0)`,
        })
        .from(contasConvenioItens)
        .where(and(
          eq(contasConvenioItens.numeroConta, input.numeroConta),
          eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
        ))
        .groupBy(contasConvenioItens.tipoItem);

      // Total geral
      const totalGeral = await db
        .select({
          totalItens: sql<number>`COUNT(*)`,
          valorTotal: sql<string>`COALESCE(SUM(CAST(valorTotal AS DECIMAL(14,2))), 0)`,
          totalDivergentes: sql<number>`SUM(CASE WHEN statusAnalise = 'divergente' THEN 1 ELSE 0 END)`,
          totalConformes: sql<number>`SUM(CASE WHEN statusAnalise = 'conforme' THEN 1 ELSE 0 END)`,
          totalPendentes: sql<number>`SUM(CASE WHEN statusAnalise = 'pendente' THEN 1 ELSE 0 END)`,
        })
        .from(contasConvenioItens)
        .where(and(
          eq(contasConvenioItens.numeroConta, input.numeroConta),
          eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
        ));

      return {
        items,
        resumoPorTipo,
        resumoGeral: totalGeral[0] || { totalItens: 0, valorTotal: "0", totalDivergentes: 0, totalConformes: 0, totalPendentes: 0 },
      };
    }),

  // ============================================================
  // EXCLUIR CONTA
  // ============================================================
  excluirConta: protectedProcedure
    .input(z.object({
      numeroConta: z.string(),
      estabelecimentoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      // Excluir itens
      await db.delete(contasConvenioItens).where(
        and(
          eq(contasConvenioItens.numeroConta, input.numeroConta),
          eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
        )
      );

      // Excluir resumo
      await db.delete(contasConvenioResumo).where(
        and(
          eq(contasConvenioResumo.numeroConta, input.numeroConta),
          eq(contasConvenioResumo.estabelecimentoId, input.estabelecimentoId),
        )
      );

      return { sucesso: true, mensagem: `Conta ${input.numeroConta} excluída com sucesso.` };
    }),

  // ============================================================
  // IMPORTAR DE XML (reutiliza dados já parseados do faturamento_tiss)
  // ============================================================
  importarDeXml: protectedProcedure
    .input(z.object({
      arquivoId: z.number(),
      estabelecimentoId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      // Buscar itens do faturamento_tiss para este arquivo
      const itensXml = await db.execute(sql`
        SELECT 
          ft.numero_guia_prestador as numeroGuia,
          ft.numero_guia_operadora as numeroGuiaOperadora,
          ft.numero_lote as numeroLote,
          ft.senha,
          ft.carteira_beneficiario as carteiraBeneficiario,
          ft.tipo_item as tipoItem,
          ft.codigo_item as codigoItem,
          ft.descricao_item as descricaoItem,
          ft.codigo_tabela as codigoTabela,
          ft.quantidade,
          ft.valor_unitario as valorUnitario,
          ft.valor_faturado as valorTotal,
          ft.data_execucao as dataExecucao,
          ft.data_referencia as dataReferencia,
          ft.nome_prof as profissionalExecutante,
          ft.convenioId,
          ft.estabelecimentoId
        FROM faturamento_tiss ft
        WHERE ft.arquivo_id = ${input.arquivoId}
          AND ft.estabelecimentoId = ${input.estabelecimentoId}
        ORDER BY ft.data_execucao, ft.tipo_item, ft.descricao_item
      `);

      const items = (itensXml as any)[0] || [];

      if (items.length === 0) {
        return {
          sucesso: false,
          mensagem: "Nenhum item encontrado para este arquivo.",
          totalItens: 0,
        };
      }

      // Agrupar por guia para determinar numeroConta
      const guias = new Map<string, any[]>();
      for (const item of items) {
        const guia = item.numeroGuia || 'SEM_GUIA';
        if (!guias.has(guia)) guias.set(guia, []);
        guias.get(guia)!.push(item);
      }

      let totalInseridos = 0;

      for (const [guia, guiaItems] of guias) {
        const numeroConta = guia; // Usar número da guia como número da conta
        const primeiroItem = guiaItems[0];

        // Buscar nome do convênio
        let nomeConvenio: string | null = null;
        if (primeiroItem.convenioId) {
          const convResult = await db.execute(sql`
            SELECT nome FROM convenios WHERE id = ${primeiroItem.convenioId} LIMIT 1
          `);
          nomeConvenio = ((convResult as any)[0]?.[0]?.nome) || null;
        }

        // Limpar dados existentes desta conta/arquivo
        await db.delete(contasConvenioItens).where(
          and(
            eq(contasConvenioItens.numeroConta, numeroConta),
            eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
            eq(contasConvenioItens.origem, "XML"),
            eq(contasConvenioItens.arquivoId, input.arquivoId),
          )
        );

        // Inserir itens
        let valorTotalConta = 0;
        const values = guiaItems.map((item: any) => {
          const vt = parseFloat(item.valorTotal) || 0;
          valorTotalConta += vt;

          return {
            origem: "XML" as const,
            numeroConta,
            numeroGuia: item.numeroGuia || null,
            numeroGuiaOperadora: item.numeroGuiaOperadora || null,
            numeroLote: item.numeroLote || null,
            senha: item.senha || null,
            convenio: nomeConvenio,
            convenioId: item.convenioId || null,
            estabelecimentoId: input.estabelecimentoId,
            tipoItem: item.tipoItem || null,
            codigoItem: item.codigoItem || null,
            descricaoItem: item.descricaoItem || null,
            codigoTabela: item.codigoTabela || null,
            quantidade: item.quantidade ? String(item.quantidade) : null,
            valorUnitario: item.valorUnitario ? String(item.valorUnitario) : null,
            valorTotal: item.valorTotal ? String(item.valorTotal) : null,
            dataExecucao: item.dataExecucao ? new Date(item.dataExecucao) : null,
            dataReferencia: item.dataReferencia ? new Date(item.dataReferencia) : null,
            profissionalExecutante: item.profissionalExecutante || null,
            arquivoId: input.arquivoId,
            statusAnalise: "pendente" as const,
          };
        });

        if (values.length > 0) {
          await db.insert(contasConvenioItens).values(values);
          totalInseridos += values.length;
        }

        // Criar/atualizar resumo
        await db.delete(contasConvenioResumo).where(
          and(
            eq(contasConvenioResumo.numeroConta, numeroConta),
            eq(contasConvenioResumo.estabelecimentoId, input.estabelecimentoId),
            eq(contasConvenioResumo.origem, "XML"),
          )
        );

        await db.insert(contasConvenioResumo).values({
          numeroConta,
          estabelecimentoId: input.estabelecimentoId,
          origem: "XML",
          convenio: nomeConvenio,
          convenioId: primeiroItem.convenioId || null,
          pacienteNome: null, // XML TISS pode não ter nome do paciente
          carteiraBeneficiario: primeiroItem.carteiraBeneficiario || null,
          totalItens: values.length,
          valorTotal: String(valorTotalConta),
          statusAnalise: "pendente",
          buscadoPor: ctx.user?.id || null,
        });
      }

      return {
        sucesso: true,
        mensagem: `${totalInseridos} itens importados de ${guias.size} guia(s) do XML.`,
        totalItens: totalInseridos,
        totalGuias: guias.size,
      };
    }),

  // ============================================================
  // LISTAR CONVÊNIOS DISPONÍVEIS NAS CONTAS
  // ============================================================
  listarConvenios: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const conditions: any[] = [];
      if (input?.estabelecimentoId) {
        conditions.push(eq(contasConvenioResumo.estabelecimentoId, input.estabelecimentoId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await db
        .select({
          convenio: contasConvenioResumo.convenio,
          totalContas: sql<number>`COUNT(*)`,
          valorTotal: sql<string>`COALESCE(SUM(CAST(valorTotal AS DECIMAL(14,2))), 0)`,
        })
        .from(contasConvenioResumo)
        .where(whereClause)
        .groupBy(contasConvenioResumo.convenio)
        .orderBy(sql`COUNT(*) DESC`);

      return result;
    }),

  // ============================================================
  // ATUALIZAR STATUS DE ANÁLISE DE UM ITEM
  // ============================================================
  atualizarStatusItem: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      statusAnalise: z.enum(["pendente", "conforme", "divergente", "revisado"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      await db.update(contasConvenioItens)
        .set({ statusAnalise: input.statusAnalise })
        .where(eq(contasConvenioItens.id, input.itemId));

      return { sucesso: true };
    }),

  // ============================================================
  // COMPARAR CONTA COM PADRÕES DE COBRANÇA
  // ============================================================
  compararComPadroes: protectedProcedure
    .input(z.object({
      numeroConta: z.string(),
      estabelecimentoId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const { executarComparacaoESalvar } = await import("../services/comparadorPadroes");
      const resultado = await executarComparacaoESalvar(input.numeroConta, input.estabelecimentoId);
      return resultado;
    }),

  // ============================================================
  // BUSCAR DIVERGÊNCIAS DE UMA CONTA (já salvas)
  // ============================================================
  getDivergencias: protectedProcedure
    .input(z.object({
      numeroConta: z.string(),
      estabelecimentoId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });

      const itens = await db
        .select({
          id: contasConvenioItens.id,
          codigoItem: contasConvenioItens.codigoItem,
          descricaoItem: contasConvenioItens.descricaoItem,
          tipoItem: contasConvenioItens.tipoItem,
          valorTotal: contasConvenioItens.valorTotal,
          quantidade: contasConvenioItens.quantidade,
          statusAnalise: contasConvenioItens.statusAnalise,
          divergencias: contasConvenioItens.divergencias,
        })
        .from(contasConvenioItens)
        .where(and(
          eq(contasConvenioItens.numeroConta, input.numeroConta),
          eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
          sql`divergencias IS NOT NULL AND JSON_LENGTH(divergencias) > 0`,
        ));

      // Flatten divergências
      const todasDivergencias: any[] = [];
      for (const item of itens) {
        const divs = item.divergencias as any[];
        if (Array.isArray(divs)) {
          for (const div of divs) {
            todasDivergencias.push({
              ...div,
              itemId: item.id,
              codigoItem: item.codigoItem,
              descricaoItem: item.descricaoItem,
              tipoItem: item.tipoItem,
              valorTotal: item.valorTotal,
              quantidade: item.quantidade,
            });
          }
        }
      }

      // Resumo
      const resumo = {
        total: todasDivergencias.length,
        porTipo: {} as Record<string, number>,
        porSeveridade: {} as Record<string, number>,
      };
      for (const div of todasDivergencias) {
        resumo.porTipo[div.tipo] = (resumo.porTipo[div.tipo] || 0) + 1;
        resumo.porSeveridade[div.severidade] = (resumo.porSeveridade[div.severidade] || 0) + 1;
      }

      return {
        divergencias: todasDivergencias,
        resumo,
      };
    }),

  // ============================================================
  // MIGRAR DADOS XML (faturamento_tiss) PARA contas_convenio_itens
  // ============================================================
  migrarDadosXml: protectedProcedure
    .input(z.object({
      estabelecimentoId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });

      // Buscar dados do faturamento_tiss para o estabelecimento
      // Usando SQL direto para JOIN com convênios
      const rows = await db.execute(sql`
        SELECT 
          ft.id,
          ft.numero_lote,
          ft.numero_guia_prestador,
          ft.numero_guia_operadora,
          ft.senha,
          ft.carteira_beneficiario,
          ft.tipo_item,
          ft.sequencial_item,
          ft.data_execucao,
          ft.codigo_tabela,
          ft.codigo_item,
          ft.descricao_item,
          ft.quantidade,
          ft.valor_unitario,
          ft.valor_faturado,
          ft.nome_prof,
          ft.valor_total_geral_guia,
          ft.estabelecimentoId,
          ft.arquivo_id,
          ft.convenioId,
          ft.data_referencia,
          ft.data_importacao,
          c.nome as convenio_nome
        FROM faturamento_tiss ft
        LEFT JOIN convenios c ON c.id = ft.convenioId
        WHERE ft.estabelecimentoId = ${input.estabelecimentoId}
        ORDER BY ft.numero_guia_prestador, ft.data_execucao
      `);

      const data = (rows as any)[0] || rows;
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum dado XML encontrado para este estabelecimento.",
        });
      }

      logger.info({ message: `Migrando ${data.length} itens XML para contas_convenio_itens`, estabelecimentoId: input.estabelecimentoId });

      // Limpar dados XML anteriores deste estabelecimento na tabela destino
      await db.delete(contasConvenioItens).where(
        and(
          eq(contasConvenioItens.estabelecimentoId, input.estabelecimentoId),
          eq(contasConvenioItens.origem, "XML")
        )
      );
      await db.delete(contasConvenioResumo).where(
        and(
          eq(contasConvenioResumo.estabelecimentoId, input.estabelecimentoId),
          eq(contasConvenioResumo.origem, "XML")
        )
      );

      // Inserir itens em batches
      let totalInseridos = 0;
      const BATCH_SIZE = 500;

      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        const values = batch.map((row: any) => {
          const guia = row.numero_guia_prestador || row.numero_guia_operadora || 'SEM_GUIA';
          const vlUnit = row.valor_unitario ? parseFloat(String(row.valor_unitario)) : 0;
          const vlFat = row.valor_faturado ? parseFloat(String(row.valor_faturado)) : 0;
          const qtd = row.quantidade ? parseFloat(String(row.quantidade)) : 0;
          const vlTotal = vlFat || (vlUnit * qtd);

          return {
            origem: "XML" as const,
            numeroConta: String(guia),
            numeroGuia: row.numero_guia_prestador ? String(row.numero_guia_prestador) : null,
            numeroGuiaOperadora: row.numero_guia_operadora ? String(row.numero_guia_operadora) : null,
            numeroLote: row.numero_lote ? String(row.numero_lote) : null,
            senha: row.senha ? String(row.senha) : null,
            pacienteNome: null, // XML não tem nome do paciente
            carteiraBeneficiario: row.carteira_beneficiario ? String(row.carteira_beneficiario) : null,
            convenio: row.convenio_nome ? String(row.convenio_nome) : null,
            convenioId: row.convenioId || null,
            estabelecimentoId: input.estabelecimentoId,
            tipoItem: row.tipo_item ? String(row.tipo_item) : 'OUTROS',
            codigoItem: row.codigo_item ? String(row.codigo_item) : null,
            codigoItemTuss: null,
            descricaoItem: row.descricao_item ? String(row.descricao_item) : null,
            codigoTabela: row.codigo_tabela ? String(row.codigo_tabela) : null,
            quantidade: qtd ? String(qtd) : null,
            valorUnitario: vlUnit ? String(vlUnit) : null,
            valorTotal: vlTotal ? String(vlTotal) : null,
            dataExecucao: row.data_execucao ? new Date(row.data_execucao) : null,
            dataReferencia: row.data_referencia ? new Date(row.data_referencia) : null,
            competencia: null,
            profissionalExecutante: row.nome_prof ? String(row.nome_prof) : null,
            setor: null,
            arquivoId: row.arquivo_id || null,
            statusAnalise: "pendente" as const,
          };
        });

        await db.insert(contasConvenioItens).values(values);
        totalInseridos += batch.length;
      }

      // Criar resumos agrupados por guia
      const resumosPorGuia = new Map<string, {
        convenio: string | null;
        convenioId: number | null;
        carteira: string | null;
        totalItens: number;
        valorTotal: number;
        dataExecucao: Date | null;
      }>();

      for (const row of data) {
        const guia = String(row.numero_guia_prestador || row.numero_guia_operadora || 'SEM_GUIA');
        const existing = resumosPorGuia.get(guia) || {
          convenio: null,
          convenioId: null,
          carteira: null,
          totalItens: 0,
          valorTotal: 0,
          dataExecucao: null,
        };

        existing.convenio = existing.convenio || (row.convenio_nome ? String(row.convenio_nome) : null);
        existing.convenioId = existing.convenioId || row.convenioId || null;
        existing.carteira = existing.carteira || (row.carteira_beneficiario ? String(row.carteira_beneficiario) : null);
        existing.totalItens += 1;
        const vlFat = row.valor_faturado ? parseFloat(String(row.valor_faturado)) : 0;
        const vlUnit = row.valor_unitario ? parseFloat(String(row.valor_unitario)) : 0;
        const qtd = row.quantidade ? parseFloat(String(row.quantidade)) : 0;
        existing.valorTotal += vlFat || (vlUnit * qtd);
        if (row.data_execucao && !existing.dataExecucao) {
          existing.dataExecucao = new Date(row.data_execucao);
        }

        resumosPorGuia.set(guia, existing);
      }

      // Inserir resumos em batches
      const resumoEntries = Array.from(resumosPorGuia.entries());
      let totalResumos = 0;

      for (let i = 0; i < resumoEntries.length; i += BATCH_SIZE) {
        const batch = resumoEntries.slice(i, i + BATCH_SIZE);
        const resumoValues = batch.map(([guia, r]) => ({
          numeroConta: guia,
          estabelecimentoId: input.estabelecimentoId,
          origem: "XML" as const,
          convenio: r.convenio,
          convenioId: r.convenioId,
          pacienteNome: null,
          carteiraBeneficiario: r.carteira,
          totalItens: r.totalItens,
          valorTotal: String(r.valorTotal.toFixed(2)),
          dataInternacao: r.dataExecucao,
          statusAnalise: "pendente" as const,
          buscadoPor: ctx.user?.id || null,
        }));

        await db.insert(contasConvenioResumo).values(resumoValues);
        totalResumos += batch.length;
      }

      logger.info({
        message: `Migração concluída: ${totalInseridos} itens, ${totalResumos} contas`,
        estabelecimentoId: input.estabelecimentoId,
      });

      return {
        sucesso: true,
        mensagem: `Migração concluída: ${totalInseridos} itens importados em ${totalResumos} contas.`,
        totalItens: totalInseridos,
        totalContas: totalResumos,
      };
    }),
});
