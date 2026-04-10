import { logger } from "../_core/logger";
import { OracleConnector } from "../connectors/OracleConnector";
import { getDb } from "../db";
import { queryConfiguracoes, tasyRelatorioFinanceiroStaging } from "../../drizzle/schema-integracao";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

export async function syncRelatorioFinanceiroTasy(
  estabelecimentoId: number,
  configIdParam: number | null,
  dtInicial: string, // formato 'DD/MM/YYYY'
  dtFinal: string    // formato 'DD/MM/YYYY'
) {
  logger.info({ message: "Iniciando syncRelatorioFinanceiroTasy", estabelecimentoId, dtInicial, dtFinal });

  const db = await getDb();
  if (!db) throw new Error("Banco local indisponível");

  // Buscar config do TASY
  let config;
  if(configIdParam) {
    const [c] = await db.select().from(queryConfiguracoes).where(eq(queryConfiguracoes.id, configIdParam)).limit(1);
    config = c;
  } else {
    const [c] = await db.select().from(queryConfiguracoes).where(
      sql`${queryConfiguracoes.estabelecimentoId} = ${estabelecimentoId} AND ${queryConfiguracoes.sistema} = 'tasy'`
    ).limit(1);
    config = c;
  }

  if (!config) {
    throw new Error(`Configuração do TASY não encontrada para o estabelecimento ${estabelecimentoId}`);
  }

  const conexaoConfig = config.conexaoConfig as any;
  if (!conexaoConfig) {
    throw new Error(`Credenciais do TASY ausentes para o estabelecimento ${estabelecimentoId}`);
  }

  const connector = new OracleConnector({
    host: conexaoConfig.host || "localhost",
    port: conexaoConfig.port || 1521,
    database: conexaoConfig.database || "XE",
    user: conexaoConfig.user || "system",
    password: conexaoConfig.password || "",
  });

  const conectado = await connector.conectar();
  if (!conectado) {
    throw new Error("Falha ao conectar ao banco TASY (Oracle)");
  }

  // A super-query provida pelo usuário:
  const superQuery = `
    SELECT * FROM (
      -- SUBQUERY 1: PROCEDIMENTOS
      SELECT 
        PP.CD_ESTABELECIMENTO_CUSTO AS ESTABELECIMENTO,
        PP.NR_SEQUENCIA AS SEQUENCIA,
        C1.DS_CONVENIO AS CONVENIO,
        TO_CHAR(PC.DT_MESANO_REFERENCIA, 'YYYY/MM') AS COMPETENCIA,
        PC.DT_MESANO_REFERENCIA AS DT_REFERENCIA,
        C2.NR_SEQ_PROTOCOLO AS PROTOCOLO,
        PC.NR_PROTOCOLO AS NR_PROTOCOLO,
        T.NR_TITULO AS NR_TITULO,
        PC.NM_USUARIO AS NM_USUARIO,
        PC.DT_ATUALIZACAO AS DT_ATUALIZACAO,
        PC.IE_STATUS_PROTOCOLO AS STATUS_PROT,
        PC.IE_TIPO_PROTOCOLO AS TIPO_PROT,
        PC.NR_SEQ_DOC_CONVENIO AS DOC_CONVENIO,
        PC.DT_ENTREGA_CONVENIO AS ENTREGA,
        PP.NR_ATENDIMENTO AS ATEND,
        AP.DT_ENTRADA AS ENTRADA,
        AP.DS_SETOR_ENTRADA AS ST_ENTRADA,
        PP.NR_INTERNO_CONTA AS CONTA,
        PP.NR_DOC_CONVENIO AS AUTORIZACAO,
        PP.CD_SENHA AS SENHA,
        C2.DT_PERIODO_INICIAL AS DT_INICIO,
        C2.DT_PERIODO_FINAL AS DT_FIM,
        ATC.CD_USUARIO_CONVENIO AS MATRICULA,
        PF.NM_PESSOA_FISICA AS PACIENTE,
        PP.CD_MOTIVO_EXC_CONTA,
        PP.IE_TIPO_GUIA AS TIPO,
        PP.DS_COMPL_MOTIVO_EXCON,
        SA.DS_SETOR_ATENDIMENTO AS SETOR,
        PP.CD_PROCEDIMENTO AS CD_ITEM,
        CAST(NULL AS VARCHAR2(50)) AS CD_ITEM_TUSS,
        MC.NM_GUERRA AS PROF_EXEC,
        MC.NR_CRM AS CRM,
        TO_CHAR(PP.DT_PROCEDIMENTO, 'YYYY/MM') AS PROD,
        PP.DT_PROCEDIMENTO AS DT_ITEM,
        PP.DS_PROCEDIMENTO AS DESCRICAO,
        PP.QT_PROCEDIMENTO AS QTD,
        PP.VL_MEDICO AS VL_MEDICO,
        PP.IE_RESPONSAVEL_CREDITO AS CREDITO,
        CASE 
          WHEN PP.NR_INTERNO_CONTA IS NOT NULL THEN NVL(PP.VL_PROCEDIMENTO, 0) 
          ELSE 0 
        END AS VL_PRODUZIDO,
        NVL(GL_P.TOTAL_GLOSA, 0) AS VL_GLOSA,
        NVL(GL_P.TOTAL_AMAIOR, 0) AS VL_AMAIOR,
        GL_P.MOTIVOS AS MOTIVO_GLOSA,
        CASE 
          WHEN RET_P.NR_INTERNO_CONTA IS NOT NULL 
          THEN (NVL(PP.VL_PROCEDIMENTO, 0) - NVL(GL_P.TOTAL_GLOSA, 0))
          ELSE 0 
        END AS VL_PAGO,
        RET_P.NR_SEQ_RETORNO AS RETORNO,
        TO_CHAR(RET_P.DT_RETORNO, 'YYYY/MM') AS PGTO,
        RET_P.DT_RETORNO AS DT_PGTO
      FROM TASY.PROCEDIMENTO_PACIENTE_V PP
      LEFT JOIN TASY.CONTA_PACIENTE C2 ON PP.NR_INTERNO_CONTA = C2.NR_INTERNO_CONTA
      LEFT JOIN TASY.ATENDIMENTO_PACIENTE_V AP ON C2.NR_ATENDIMENTO = AP.NR_ATENDIMENTO
      LEFT JOIN TASY.CONVENIO C1 ON PP.CD_CONVENIO = C1.CD_CONVENIO
      LEFT JOIN TASY.PROTOCOLO_CONVENIO PC ON C2.NR_SEQ_PROTOCOLO = PC.NR_SEQ_PROTOCOLO
      LEFT JOIN TASY.TITULO_RECEBER T ON T.NR_SEQ_PROTOCOLO = PC.NR_SEQ_PROTOCOLO
      LEFT JOIN (
        SELECT RI.NR_INTERNO_CONTA, MIN(R.NR_SEQUENCIA) AS NR_SEQ_RETORNO, MIN(R.DT_RETORNO) AS DT_RETORNO
        FROM TASY.CONVENIO_RETORNO_ITEM RI
        JOIN TASY.CONVENIO_RETORNO R ON RI.NR_SEQ_RETORNO = R.NR_SEQUENCIA
        GROUP BY RI.NR_INTERNO_CONTA
      ) RET_P ON C2.NR_INTERNO_CONTA = RET_P.NR_INTERNO_CONTA
      LEFT JOIN (
        SELECT RG.NR_SEQ_PROPACI,
             SUM(RG.VL_GLOSA) AS TOTAL_GLOSA,
             SUM(NVL(RG.VL_AMAIOR, 0)) AS TOTAL_AMAIOR,
             LISTAGG(MG.DS_MOTIVO_GLOSA, ' / ' ON OVERFLOW TRUNCATE) WITHIN GROUP (ORDER BY MG.DS_MOTIVO_GLOSA) AS MOTIVOS
        FROM TASY.CONVENIO_RETORNO_GLOSA RG
        JOIN TASY.MOTIVO_GLOSA MG ON RG.CD_MOTIVO_GLOSA = MG.CD_MOTIVO_GLOSA
        GROUP BY RG.NR_SEQ_PROPACI
      ) GL_P ON PP.NR_SEQUENCIA = GL_P.NR_SEQ_PROPACI    
      LEFT JOIN TASY.SETOR_ATENDIMENTO SA ON PP.CD_SETOR_ATENDIMENTO = SA.CD_SETOR_ATENDIMENTO
      LEFT JOIN TASY.MEDICO MC ON MC.CD_PESSOA_FISICA = PP.CD_MEDICO_EXECUTOR
      LEFT JOIN TASY.ATEND_CATEGORIA_CONVENIO ATC ON AP.NR_ATENDIMENTO = ATC.NR_ATENDIMENTO
      LEFT JOIN TASY.PESSOA_FISICA PF ON PF.CD_PESSOA_FISICA = AP.CD_PESSOA_FISICA
      
      UNION ALL
      
      -- SUBQUERY 2: MATERIAIS E MEDICAMENTOS
      SELECT 
        MP.CD_ESTABELECIMENTO_CUSTO AS ESTABELECIMENTO,
        MP.NR_SEQUENCIA AS SEQUENCIA,
        C1.DS_CONVENIO AS CONVENIO,
        TO_CHAR(PC.DT_MESANO_REFERENCIA, 'YYYY/MM') AS COMPETENCIA,
        PC.DT_MESANO_REFERENCIA AS DT_REFERENCIA,
        C2.NR_SEQ_PROTOCOLO AS PROTOCOLO,
        PC.NR_PROTOCOLO AS NR_PROTOCOLO,
        T.NR_TITULO AS NR_TITULO,
        PC.NM_USUARIO AS NM_USUARIO,
        PC.DT_ATUALIZACAO AS DT_ATUALIZACAO,
        PC.IE_STATUS_PROTOCOLO AS STATUS_PROT,
        PC.IE_TIPO_PROTOCOLO AS TIPO_PROT,
        PC.NR_SEQ_DOC_CONVENIO AS DOC_CONVENIO,
        PC.DT_ENTREGA_CONVENIO AS ENTREGA,
        MP.NR_ATENDIMENTO AS ATEND,
        AP.DT_ENTRADA AS ENTRADA,
        AP.DS_SETOR_ENTRADA AS ST_ENTRADA,
        MP.NR_INTERNO_CONTA AS CONTA,
        MP.NR_DOC_CONVENIO AS AUTORIZACAO,
        MP.CD_SENHA AS SENHA,
        C2.DT_PERIODO_INICIAL AS DT_INICIO,
        C2.DT_PERIODO_FINAL AS DT_FIM,
        ATC.CD_USUARIO_CONVENIO AS MATRICULA,
        PF.NM_PESSOA_FISICA AS PACIENTE,
        MP.CD_MOTIVO_EXC_CONTA,
        MP.DS_COMPL_MOTIVO_EXCON,
        MP.IE_TIPO_GUIA AS TIPO,
        SA.DS_SETOR_ATENDIMENTO AS SETOR,
        MP.CD_MATERIAL_CONVENIO AS CD_ITEM,
        TO_CHAR(MP.CD_MATERIAL_TUSS) AS CD_ITEM_TUSS,
        CAST(NULL AS VARCHAR2(255)) AS PROF_EXEC,
        CAST(NULL AS VARCHAR2(55)) AS CRM,
        TO_CHAR(MP.DT_CONTA, 'YYYY/MM') AS PROD,
        MP.DT_CONTA AS DT_ITEM,
        MP.DS_MATERIAL_TISS AS DESCRICAO,
        MP.QT_MATERIAL AS QTD,
        MP.VL_MATERIAL AS VL_PRODUZIDO,
        CAST(NULL AS NUMBER) AS VL_MEDICO,
        CAST(NULL AS VARCHAR2(55)) AS CREDITO,
        NVL(GL_M.TOTAL_GLOSA, 0) AS VL_GLOSA,
        NVL(GL_M.TOTAL_AMAIOR, 0) AS VL_AMAIOR,
        GL_M.MOTIVOS AS MOTIVO_GLOSA,
        CASE 
          WHEN RET_M.NR_INTERNO_CONTA IS NOT NULL 
          THEN (NVL(MP.VL_MATERIAL, 0) - NVL(GL_M.TOTAL_GLOSA, 0))
          ELSE 0 
        END AS VL_PAGO,
        RET_M.NR_SEQ_RETORNO AS RETORNO,
        TO_CHAR(RET_M.DT_RETORNO, 'YYYY/MM') AS PGTO,
        RET_M.DT_RETORNO AS DT_PGTO      
      FROM TASY.MATERIAL_ATEND_PACIENTE MP
      LEFT JOIN TASY.CONTA_PACIENTE C2 ON MP.NR_INTERNO_CONTA = C2.NR_INTERNO_CONTA
      LEFT JOIN TASY.ATENDIMENTO_PACIENTE_V AP ON C2.NR_ATENDIMENTO = AP.NR_ATENDIMENTO
      LEFT JOIN TASY.MATERIAL_V M ON M.CD_MATERIAL = MP.CD_MATERIAL_EXEC 
      LEFT JOIN TASY.CONVENIO C1 ON MP.CD_CONVENIO = C1.CD_CONVENIO
      LEFT JOIN TASY.PROTOCOLO_CONVENIO PC ON C2.NR_SEQ_PROTOCOLO = PC.NR_SEQ_PROTOCOLO
      LEFT JOIN TASY.TITULO_RECEBER T ON T.NR_SEQ_PROTOCOLO = PC.NR_SEQ_PROTOCOLO
      LEFT JOIN TASY.SETOR_ATENDIMENTO SA ON MP.CD_SETOR_ATENDIMENTO = SA.CD_SETOR_ATENDIMENTO
      LEFT JOIN TASY.ATEND_CATEGORIA_CONVENIO ATC ON AP.NR_ATENDIMENTO = ATC.NR_ATENDIMENTO
      LEFT JOIN TASY.PESSOA_FISICA PF ON PF.CD_PESSOA_FISICA = AP.CD_PESSOA_FISICA
      LEFT JOIN (
        SELECT RG.NR_SEQ_MATPACI,
             SUM(RG.VL_GLOSA) AS TOTAL_GLOSA,
             SUM(NVL(RG.VL_AMAIOR, 0)) AS TOTAL_AMAIOR,
             LISTAGG(MG.DS_MOTIVO_GLOSA, ' / ' ON OVERFLOW TRUNCATE) WITHIN GROUP (ORDER BY MG.DS_MOTIVO_GLOSA) AS MOTIVOS
        FROM TASY.CONVENIO_RETORNO_GLOSA RG
        JOIN TASY.MOTIVO_GLOSA MG ON RG.CD_MOTIVO_GLOSA = MG.CD_MOTIVO_GLOSA
        GROUP BY RG.NR_SEQ_MATPACI
      ) GL_M ON MP.NR_SEQUENCIA = GL_M.NR_SEQ_MATPACI
      LEFT JOIN (
        SELECT RI.NR_INTERNO_CONTA, MIN(R.NR_SEQUENCIA) AS NR_SEQ_RETORNO, MIN(R.DT_RETORNO) AS DT_RETORNO
        FROM TASY.CONVENIO_RETORNO_ITEM RI
        JOIN TASY.CONVENIO_RETORNO R ON RI.NR_SEQ_RETORNO = R.NR_SEQUENCIA
        GROUP BY RI.NR_INTERNO_CONTA
      ) RET_M ON C2.NR_INTERNO_CONTA = RET_M.NR_INTERNO_CONTA
    )
    WHERE DT_ITEM BETWEEN TO_DATE(:dtInicial,'DD/MM/YYYY') AND TO_DATE(:dtFinal,'DD/MM/YYYY')
  `;

  // Executa no Oracle
  let registros: any[] = [];
  try {
    registros = await connector.executarQuery(superQuery, { dtInicial, dtFinal });
  } catch (err) {
    await connector.desconectar();
    throw new Error(`Falha ao executar query no TASY: ${(err as Error).message}`);
  }

  await connector.desconectar();

  if (registros.length === 0) {
    return { processados: 0, mensagem: "Nenhum registro encontrado no período informado." };
  }

  // Se houverem registros, formataremos para inserção na Staging!
  const BATCH_SIZE = 250;
  let inseridos = 0;

  for (let i = 0; i < registros.length; i += BATCH_SIZE) {
    const lote = registros.slice(i, i + BATCH_SIZE).map((r) => {
      // Cria um hashId único: tipoItem + sequencia + conta (para garantir UPSERT perfeito)
      const tipoParaHash = String(r.TIPO_ITEM || "").substring(0,4);
      const hashCalc = crypto.createHash("md5").update(`${config.id}_${tipoParaHash}_${r.SEQUENCIA}_${r.CONTA}`).digest("hex");

      const vlProduzido = parseFloat(r.VL_PRODUZIDO) || 0;
      const vlGlosa = parseFloat(r.VL_GLOSA) || 0;
      const vlPago = parseFloat(r.VL_PAGO) || 0;
      const aReceber = vlProduzido - vlPago - vlGlosa; // Conforme query
      
      return {
        estabelecimentoId,
        configId: config.id,
        estabelecimento: String(r.ESTABELECIMENTO || ""),
        sequencia: String(r.SEQUENCIA || ""),
        convenio: String(r.CONVENIO || ""),
        prod: r.PROD ? String(r.PROD) : "",
        competencia: r.COMPETENCIA ? String(r.COMPETENCIA) : "",
        dtReferencia: r.DT_REFERENCIA ? new Date(r.DT_REFERENCIA) : null,
        entrega: r.ENTREGA ? new Date(r.ENTREGA) : null,
        protocolo: String(r.PROTOCOLO || ""),
        nrProtocolo: String(r.NR_PROTOCOLO || ""),
        nrTitulo: String(r.NR_TITULO || ""),
        nmUsuario: String(r.NM_USUARIO || ""),
        dtAtualizacao: r.DT_ATUALIZACAO ? new Date(r.DT_ATUALIZACAO) : null,
        statusProt: String(r.STATUS_PROT || ""),
        tipoProt: String(r.TIPO_PROT || ""),
        docConvenio: String(r.DOC_CONVENIO || ""),
        atend: String(r.ATEND || ""),
        entrada: r.ENTRADA ? String(r.ENTRADA) : "",
        stEntrada: String(r.ST_ENTRADA || ""),
        conta: String(r.CONTA || ""),
        autorizacao: String(r.AUTORIZACAO || ""),
        senha: String(r.SENHA || ""),
        dtInicio: r.DT_INICIO ? new Date(r.DT_INICIO) : null,
        dtFim: r.DT_FIM ? new Date(r.DT_FIM) : null,
        encerramento: r.ENCERRAMENTO ? String(r.ENCERRAMENTO) : "",
        matricula: String(r.MATRICULA || ""),
        paciente: String(r.PACIENTE || ""),
        cdMotivoExcConta: String(r.CD_MOTIVO_EXC_CONTA || ""),
        dsComplMotivoExcon: String(r.DS_COMPL_MOTIVO_EXCON || ""),
        tipo: String(r.TIPO || ""),
        tipoItem: String(r.TIPO_ITEM || ""),
        setor: String(r.SETOR || ""),
        profExec: String(r.PROF_EXEC || ""),
        crm: String(r.CRM || ""),
        cdItem: String(r.CD_ITEM || ""),
        cdItemTuss: String(r.CD_ITEM_TUSS || ""),
        dtItem: r.DT_ITEM ? new Date(r.DT_ITEM) : null,
        descricao: String(r.DESCRICAO || ""),
        credito: String(r.CREDITO || ""),
        qtd: String(r.QTD || "0"),
        vlProduzido: String(vlProduzido),
        vlMedico: String(r.VL_MEDICO || "0"),
        aReceber: String(aReceber),
        vlPago: String(vlPago),
        vlGlosa: String(vlGlosa),
        vlAMaior: String(r.VL_AMAIOR || "0"),
        tReceb: String((parseFloat(r.VL_PAGO) || 0) + (parseFloat(r.VL_AMAIOR) || 0)),
        motivoGlosa: String(r.MOTIVO_GLOSA || ""),
        retorno: String(r.RETORNO || ""),
        pgto: r.PGTO ? String(r.PGTO) : "",
        dtPgto: r.DT_PGTO ? new Date(r.DT_PGTO) : null,
        hashId: hashCalc,
        dadosBrutos: r,
        atualizadoEm: new Date(),
      };
    });

    try {
      await db.insert(tasyRelatorioFinanceiroStaging)
        .values(lote)
        .onDuplicateKeyUpdate({
          set: {
            // Atualiza colunas que podem ter mudado se a conta foi paga/glosada
            vlProduzido: sql`VALUES(vlProduzido)`,
            aReceber: sql`VALUES(aReceber)`,
            vlPago: sql`VALUES(vlPago)`,
            vlGlosa: sql`VALUES(vlGlosa)`,
            motivoGlosa: sql`VALUES(motivoGlosa)`,
            retorno: sql`VALUES(retorno)`,
            pgto: sql`VALUES(pgto)`,
            dtPgto: sql`VALUES(dtPgto)`,
            statusProt: sql`VALUES(statusProt)`,
            atualizadoEm: sql`VALUES(atualizadoEm)`,
            dadosBrutos: sql`VALUES(dadosBrutos)`
          }
        });
      inseridos += lote.length;
    } catch (upsertErr) {
      logger.error({ message: "Falha ao upsertar lote do Tasy Financeiro", err: upsertErr });
    }
  }

  logger.info({ message: "Sincronização do Tasy Financeiro finalizada", registrosProcessados: inseridos });
  return { processados: inseridos, mensagem: "Sucesso" };
}
