import cron from "node-cron";
import { getDb } from "../db";
import { finRecebiveis } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { consultarBoleto } from "../bancoInter";

export function startBoletoCron() {
  console.log("🕒 Iniciando cron job de conciliação de boletos (Banco Inter)...");
  
  // Executa toda hora '0 * * * *'
  cron.schedule("0 * * * *", async () => {
    console.log("🔄 [Cron] Varrendo boletos pendentes no Banco Inter...");
    try {
      const db = (await getDb())!;
      
      const pendentes = await db.select().from(finRecebiveis).where(
        and(
          eq(finRecebiveis.recebido, "nao"),
          isNotNull(finRecebiveis.boletoSolicitacaoId)
        )
      );
      
      if (pendentes.length === 0) return;
      
      let pagos = 0;
      for (const rec of pendentes) {
        if (!rec.boletoSolicitacaoId) continue;
        
        try {
          const dados = await consultarBoleto(rec.boletoSolicitacaoId);
          // O Banco inter retorna situacao: "PAGO" em boletos
          if (dados && dados.boleto && dados.boleto.situacao === "PAGO") {
            const dataPag = dados.boleto.dataHoraPagamento ? new Date(dados.boleto.dataHoraPagamento) : new Date();
            await db.update(finRecebiveis).set({
              recebido: "sim",
              dataRecebimento: dataPag
            }).where(eq(finRecebiveis.id, rec.id));
            pagos++;
          }
        } catch (err) {
          console.error(`Erro ao consultar boleto ${rec.id}:`, err);
        }
      }
      
      if (pagos > 0) {
        console.log(`✅ [Cron] ${pagos} boletos foram atualizados para PAGO!`);
      }
    } catch (err) {
      console.error("Erro geral no cron de boletos:", err);
    }
  });
}
