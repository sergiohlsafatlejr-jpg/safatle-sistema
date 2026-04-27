import "dotenv/config";
import { getDb } from "./server/db.js";
import { sql } from "drizzle-orm";
import { faturamentoTiss, contasConvenioItens, contasConvenioResumo, convenios } from "./drizzle/schema.js";
import { eq, and } from "drizzle-orm";

async function run() {
  const db = await getDb();
  if (!db) {
    console.error("DB indisponível");
    process.exit(1);
  }

  console.log("Iniciando migração de staging_faturamento_xml para contas_convenio...");

  try {
    const faturamentoRecords = await db.select().from(faturamentoTiss).limit(500000);
    console.log(`Buscados ${faturamentoRecords.length} registros da staging.`);

    if (faturamentoRecords.length === 0) {
      console.log("Nada a migrar.");
      process.exit(0);
    }

    // Agrupar prestadores por estabelecimento (usando dados reais da tabela)
    const estabelecimentosIds = Array.from(new Set(faturamentoRecords.map(r => r.estabelecimentoId).filter(Boolean)));
    console.log(`Encontrados ${estabelecimentosIds.length} estabelecimentos.`);

    for (const estabelecimentoId of estabelecimentosIds) {
      if (!estabelecimentoId) continue;
      
      const registrosArquivo = faturamentoRecords.filter(r => r.estabelecimentoId === estabelecimentoId);
      console.log(`Migrando ${registrosArquivo.length} registros para o estabelecimento ${estabelecimentoId}`);

      const porGuia = new Map<string, typeof registrosArquivo>();
      for (const reg of registrosArquivo) {
        const guia = reg.numeroGuiaPrestador || reg.numeroGuiaOperadora || 'SEM_GUIA';
        if (!porGuia.has(guia)) porGuia.set(guia, []);
        porGuia.get(guia)!.push(reg);
      }

      // Limpar todos os dados XML ateriores deste estabelecimento para evitar duplicatas 
      console.log("Limpando contas_convenio_itens anteriores para evitar duplicação (por arquivo Id seria o ideal, mas aqui limpa tudo da origem XML)...");
      await db.delete(contasConvenioItens).where(
        and(
          eq(contasConvenioItens.estabelecimentoId, estabelecimentoId),
          eq(contasConvenioItens.origem, "XML")
        )
      );

      await db.delete(contasConvenioResumo).where(
        and(
          eq(contasConvenioResumo.estabelecimentoId, estabelecimentoId),
          eq(contasConvenioResumo.origem, "XML")
        )
      );

      // Inserir itens em batches
      const BATCH_CC = 1000;
      let totalCC = 0;
      const allItems = registrosArquivo.map(reg => {
        const guia = reg.numeroGuiaPrestador || reg.numeroGuiaOperadora || 'SEM_GUIA';
        const vlUnit = reg.valorUnitario ? parseFloat(String(reg.valorUnitario)) : 0;
        const vlFat = reg.valorFaturado ? parseFloat(String(reg.valorFaturado)) : 0;
        const qtd = reg.quantidade ? parseFloat(String(reg.quantidade)) : 0;
        const vlTotal = vlFat || (vlUnit * qtd);
        
        return {
          origem: "XML" as const,
          numeroConta: String(guia),
          numeroGuia: reg.numeroGuiaPrestador ? String(reg.numeroGuiaPrestador) : null,
          numeroGuiaOperadora: reg.numeroGuiaOperadora ? String(reg.numeroGuiaOperadora) : null,
          numeroLote: reg.numeroLote ? String(reg.numeroLote) : null,
          senha: reg.senha ? String(reg.senha) : null,
          pacienteNome: null,
          carteiraBeneficiario: reg.carteiraBeneficiario ? String(reg.carteiraBeneficiario) : null,
          convenio: null, // Pode ser buscado via convenioId se os ID's estiverem lá
          convenioId: reg.convenioId,
          estabelecimentoId: estabelecimentoId,
          tipoItem: reg.tipoItem ? String(reg.tipoItem) : 'OUTROS',
          codigoItem: reg.codigoItem ? String(reg.codigoItem) : null,
          codigoItemTuss: null,
          descricaoItem: reg.descricaoItem ? String(reg.descricaoItem) : null,
          codigoTabela: reg.codigoTabela ? String(reg.codigoTabela) : null,
          quantidade: qtd ? String(qtd) : null,
          valorUnitario: vlUnit ? String(vlUnit) : null,
          valorTotal: vlTotal ? String(vlTotal) : null,
          dataExecucao: reg.dataExecucao ? new Date(reg.dataExecucao) : null,
          dataReferencia: reg.dataReferencia ? new Date(reg.dataReferencia) : null,
          competencia: reg.competencia ? String(reg.competencia) : null,
          profissionalExecutante: reg.nomeProf ? String(reg.nomeProf) : null,
          setor: null,
          arquivoId: reg.arquivoId,
          statusAnalise: "pendente" as const,
        };
      });

      console.log(`Processando inserção de contas_convenio_itens (${allItems.length})...`);
      for (let b = 0; b < allItems.length; b += BATCH_CC) {
        const batch = allItems.slice(b, b + BATCH_CC);
        await db.insert(contasConvenioItens).values(batch);
        totalCC += batch.length;
        if (totalCC % 10000 === 0) console.log(`${totalCC} itens inseridos...`);
      }

      console.log(`Criando resumos por conta...`);
      let resumoCount = 0;
      const resumosArray = [];

      for (const [guia, regs] of porGuia.entries()) {
        const totalItensGuia = regs.length;
        let valorTotalGuia = 0;
        let dataExecGuia: Date | null = null;
        
        for (const r of regs) {
          const vlFat = r.valorFaturado ? parseFloat(String(r.valorFaturado)) : 0;
          const vlUnit = r.valorUnitario ? parseFloat(String(r.valorUnitario)) : 0;
          const qtd = r.quantidade ? parseFloat(String(r.quantidade)) : 0;
          valorTotalGuia += vlFat || (vlUnit * qtd);
          if (r.dataExecucao && !dataExecGuia) dataExecGuia = new Date(r.dataExecucao);
        }

        // Calcular competencia
        let competencia: string | null = null;
        const dataRef = regs[0]?.dataReferencia;
        if (dataRef) {
            const d = new Date(dataRef);
            competencia = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        } else if (dataExecGuia) {
            competencia = `${dataExecGuia.getFullYear()}/${String(dataExecGuia.getMonth() + 1).padStart(2, '0')}`;
        }
        if (regs[0]?.competencia) competencia = regs[0].competencia;

        resumosArray.push({
          numeroConta: guia,
          estabelecimentoId: estabelecimentoId,
          origem: "XML" as const,
          convenio: null,
          convenioId: regs[0]?.convenioId || null,
          pacienteNome: null,
          carteiraBeneficiario: regs[0]?.carteiraBeneficiario ? String(regs[0].carteiraBeneficiario) : null,
          totalItens: totalItensGuia,
          valorTotal: String(valorTotalGuia.toFixed(2)),
          dataInternacao: dataExecGuia,
          statusAnalise: "pendente" as const,
          buscadoPor: null,
          competencia,
        });
      }

      // Inserção em massa dos resumos
      const BATCH_RESUMO = 1000;
      for (let b = 0; b < resumosArray.length; b += BATCH_RESUMO) {
        const batch = resumosArray.slice(b, b + BATCH_RESUMO);
        await db.insert(contasConvenioResumo).values(batch);
        resumoCount += batch.length;
      }
      
      console.log(`[Upload] contas_convenio populado: ${totalCC} itens, ${resumoCount} contas para estabelecimento ${estabelecimentoId}`);
    }

  } catch(e) {
    console.error(e);
  }

  console.log("Migração de XML finalizada.");
  process.exit(0);
}
run();
