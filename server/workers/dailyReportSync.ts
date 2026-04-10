import cron from "node-cron";
import { getDb } from "../db";
import { sincronizarRelatorioAtendimentos } from "../relatorioAtendimentos";
import { sincronizarCustosProdutos } from "../relatorioCustos";
import { sincronizarRelatorioFaturamento } from "../relatorioFaturamento";

/**
 * Worker para atualizar as bases de dados locais dos Relatórios BI
 * Executa uma vez ao dia, de madrugada, para todos os estabelecimentos que possuem integração com Warleine.
 */
export function startDailyReportSync() {
  // Executa todo dia às 03:00 AM (uma hora após o JobScheduler incremental / OMNI)
  cron.schedule("0 3 * * *", async () => {
    console.log("[DailyReportSync] Iniciando sincronização diária dos relatórios BI");
    const inicioGeral = Date.now();

    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Banco de dados não disponível para o DailyReportSync");
      }

      // Buscar todos os estabelecimentos que possuem conexão Warleine ativa
      const conexoesRes = await db.execute("SELECT estabelecimentoId FROM integracao_conexoes");
      const conexoes = (conexoesRes as any)[0] || [];
      
      const estabIds = (conexoes as any[]).map(c => c.estabelecimentoId);
      console.log(`[DailyReportSync] Encontrados ${estabIds.length} estabelecimentos com integrações ativas`);

      for (const estabId of estabIds) {
        console.log(`[DailyReportSync] Sincronizando estabelecimento: ${estabId}`);
        const estabInicio = Date.now();
        try {
          // 1. Sincronizar Atendimentos
          console.log(`\t- Atendimentos...`);
          try {
             const hoje = new Date();
             const anoAtualStr = `${hoje.getFullYear()}-12-31`;
             const anoAnteriorStr = `${hoje.getFullYear() - 1}-01-01`;
             await sincronizarRelatorioAtendimentos(estabId, anoAnteriorStr, anoAtualStr);
          } catch(e) { console.error(`Erro ao sincronizar Atendimentos para ${estabId}:`, e); }

          // 2. Sincronizar Custos
          console.log(`\t- Custos (Produtos)...`);
          try {
             await sincronizarCustosProdutos(estabId);
          } catch(e) { console.error(`Erro ao sincronizar Custos para ${estabId}:`, e); }

          // 3. Sincronizar Faturamento
          console.log(`\t- Faturamento...`);
          try {
             await sincronizarRelatorioFaturamento(estabId);
          } catch(e) { console.error(`Erro ao sincronizar Faturamento para ${estabId}:`, e); }

          console.log(`[DailyReportSync] Estabelecimento ${estabId} concluído em ${((Date.now() - estabInicio) / 1000).toFixed(1)}s`);
        } catch (estabError) {
          console.error(`[DailyReportSync] Erro no estabelecimento ${estabId}:`, estabError);
        }
      }

      console.log(`[DailyReportSync] Sincronização diária concluída em ${((Date.now() - inicioGeral) / 1000).toFixed(1)}s`);
    } catch (err) {
      console.error("[DailyReportSync] Erro fatal durante a rotina:", err);
    }
  });

  console.log("[DailyReportSync] Cron job de relatórios agendado para 03:00 AM (!)");
}
