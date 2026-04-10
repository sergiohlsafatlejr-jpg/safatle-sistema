import "dotenv/config";
import { getDb } from "../server/db";
import { tasyRelatorioFinanceiroStaging } from "../drizzle/schema-integracao";
import crypto from "crypto";

async function run() {
  console.log("Iniciando geração de MOCK duplo para o BI Financeiro TASY...");
  const db = await getDb();
  if(!db) throw new Error("DB offline");

  const estabelecimentos = [2]; // IDs de estabelecimento que queremos mockar (Safatle, Maternidade, etc)
  const convenios = ["Unimed", "Bradesco Saúde", "Sulamérica", "Amil", "Cassi", "Notredame", "Allianz", "Porto Seguro", "Care Plus", "Assim Saúde"];
  const setores = ["Pronto Socorro", "UTI Adulto", "Centro Cirúrgico", "Internação Clínica", "Maternidade", "SADT", "Ambulatório", "Oncologia"];
  
  const anoInicial = 2024;
  const anoFinal = 2026;
  const mesesAteHoje = new Date().getMonth() + 1;

  let totalInseridos = 0;

  for (const estabId of estabelecimentos) {
    const lote = [];

    for (let ano = anoInicial; ano <= anoFinal; ano++) {
      const isAnoCorrente = (ano === new Date().getFullYear());
      const maxMes = isAnoCorrente ? mesesAteHoje : 12;

      for (let mes = 1; mes <= maxMes; mes++) {
        // Gera registros para cada mes, distribuídos em convênios e setores aleatórios
        const qtdRegistrosMes = Math.floor(Math.random() * 20) + 10; // 10 a 30 notas fiscais/guias por mês simulado
        
        const mesStr = mes.toString().padStart(2, "0");
        const competencia = `${ano}/${mesStr}`;
        const dtItem = new Date(`${ano}-${mesStr}-15`);

        for (let r = 0; r < qtdRegistrosMes; r++) {
          const convenio = convenios[Math.floor(Math.random() * convenios.length)];
          const setor = setores[Math.floor(Math.random() * setores.length)];
          
          // Valores simulados
          const vlProduzido = Math.floor(Math.random() * 50000) + 1000;
          
          // Probabilidade: 60% já recebido inteiro, 20% com glosa, 20% em aberto
          const statusRandom = Math.random();
          let vlPago = 0;
          let vlGlosa = 0;

          if (statusRandom < 0.6) {
            vlPago = vlProduzido; // Pago integral
          } else if (statusRandom < 0.8) {
            // Teve Glosa
            vlGlosa = Math.floor(vlProduzido * (Math.random() * 0.3 + 0.1)); // 10% a 40% de glosa
            vlPago = vlProduzido - vlGlosa;
          } else {
            // Em aberto (recente)
            if (ano === anoFinal && mes >= maxMes - 2) {
              vlPago = 0; // A receber
            } else {
              vlPago = vlProduzido; // Antigos tem q estar pagos
            }
          }

          const aReceber = vlProduzido - vlPago - vlGlosa;
          
          const hashCalc = crypto.createHash("md5").update(`MOCK_${estabId}_${competencia}_${r}`).digest("hex");

          lote.push({
            estabelecimentoId: estabId,
            configId: 1, // ID Fake 
            estabelecimento: "MOCK",
            sequencia: `SEQ_${r}_${mes}`,
            convenio: convenio,
            prod: competencia,
            competencia: competencia,
            dtReferencia: dtItem,
            conta: `CONTA_${r}`,
            setor: setor,
            dtItem: dtItem,
            qtd: "1",
            vlProduzido: String(vlProduzido),
            vlPago: String(vlPago),
            vlGlosa: String(vlGlosa),
            aReceber: String(aReceber),
            hashId: hashCalc,
            atualizadoEm: new Date(),
          });
        }
      }
    }

    try {
      if (lote.length > 0) {
        await db.insert(tasyRelatorioFinanceiroStaging).values(lote).onDuplicateKeyUpdate({
          set: {
            vlProduzido: tasyRelatorioFinanceiroStaging.vlProduzido,
            HashId: tasyRelatorioFinanceiroStaging.hashId // dummy
          }
        });
        totalInseridos += lote.length;
        console.log(`Mock para estabelecimento ${estabId}: Inseriu ${lote.length} registros`);
      }
    } catch(err) {
      console.error(`Erro inserindo lote:`, err);
    }
  }

  console.log(`\nMocking concluído com sucesso. Total de ${totalInseridos} registros adicionados.`);
  process.exit();
}

run().catch(console.error);
