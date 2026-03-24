/**
 * Gerenciador de Jobs de Conciliação Assíncrona
 * 
 * Permite executar a conciliação em background, evitando timeout do proxy.
 * O frontend dispara o job e faz polling do progresso.
 */

import { executarConciliacaoAutomatica, type ConciliacaoResultado } from "./faturamentoUnificadoService";

export interface ConciliacaoJob {
  id: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  progresso: {
    competenciaAtual: string;
    competenciasProcessadas: number;
    competenciasTotal: number;
    percentual: number;
  };
  resultado: ConciliacaoResultado | null;
  erro: string | null;
  iniciadoEm: number;
  finalizadoEm: number | null;
  params: {
    estabelecimentoId: number;
    competencia?: string;
    convenioId?: number;
    toleranciaPercentual?: number;
  };
}

// Store de jobs em memória (limpa automaticamente após 1h)
const jobs = new Map<string, ConciliacaoJob>();

// Limpar jobs antigos a cada 10 minutos
setInterval(() => {
  const agora = Date.now();
  for (const [id, job] of jobs) {
    if (agora - job.iniciadoEm > 3600000) { // 1 hora
      jobs.delete(id);
    }
  }
}, 600000);

function gerarJobId(): string {
  return `conc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Inicia um job de conciliação em background
 */
export function iniciarJobConciliacao(params: ConciliacaoJob['params']): string {
  const jobId = gerarJobId();
  
  const job: ConciliacaoJob = {
    id: jobId,
    status: 'pendente',
    progresso: {
      competenciaAtual: '',
      competenciasProcessadas: 0,
      competenciasTotal: 0,
      percentual: 0,
    },
    resultado: null,
    erro: null,
    iniciadoEm: Date.now(),
    finalizadoEm: null,
    params,
  };
  
  jobs.set(jobId, job);
  
  // Executar em background (não aguardar)
  executarJobBackground(jobId).catch(err => {
    console.error(`[ConciliacaoJob] Erro fatal no job ${jobId}:`, err);
    const j = jobs.get(jobId);
    if (j) {
      j.status = 'erro';
      j.erro = err.message || 'Erro desconhecido';
      j.finalizadoEm = Date.now();
    }
  });
  
  return jobId;
}

/**
 * Executa o job de conciliação em background
 * Se não há competência específica, processa uma a uma com progresso
 */
async function executarJobBackground(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  
  job.status = 'processando';
  
  try {
    if (job.params.competencia) {
      // Competência específica: processar diretamente
      job.progresso.competenciasTotal = 1;
      job.progresso.competenciaAtual = job.params.competencia;
      
      const resultado = await executarConciliacaoAutomatica(job.params);
      
      job.progresso.competenciasProcessadas = 1;
      job.progresso.percentual = 100;
      job.resultado = resultado;
      job.status = 'concluido';
      job.finalizadoEm = Date.now();
    } else {
      // Sem competência: buscar todas e processar uma a uma
      // Importar getDb para buscar competências
      const { getDb } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw new Error("Database não disponível");
      
      const [compRows] = await db.execute(sql.raw(
        `SELECT DISTINCT competencia FROM faturamento_unificado WHERE estabelecimentoId = ${job.params.estabelecimentoId} ORDER BY competencia`
      ));
      const competencias = (compRows as unknown as any[]).map((r: any) => r.competencia).filter(Boolean);
      
      if (competencias.length === 0) {
        job.resultado = {
          totalProcessados: 0,
          totalConciliados: 0,
          totalDivergentes: 0,
          totalNaoRecebidos: 0,
          totalGlosados: 0,
          totalTerceiros: 0,
          totalJaConciliados: 0,
          detalhes: {
            conciliadosPorGuiaCodigo: 0,
            conciliadosPorGuiaCodigoTuss: 0,
            conciliadosPorVinculacao: 0,
            conciliadosPorPacienteCodigo: 0,
            conciliadosPorCarteiraCodigo: 0,
          },
          divergencias: [],
        };
        job.status = 'concluido';
        job.finalizadoEm = Date.now();
        return;
      }
      
      job.progresso.competenciasTotal = competencias.length;
      
      const resultadoTotal: ConciliacaoResultado = {
        totalProcessados: 0,
        totalConciliados: 0,
        totalDivergentes: 0,
        totalNaoRecebidos: 0,
        totalGlosados: 0,
        totalTerceiros: 0,
        totalJaConciliados: 0,
        detalhes: {
          conciliadosPorGuiaCodigo: 0,
          conciliadosPorGuiaCodigoTuss: 0,
          conciliadosPorVinculacao: 0,
          conciliadosPorPacienteCodigo: 0,
          conciliadosPorCarteiraCodigo: 0,
        },
        divergencias: [],
      };
      
      for (let i = 0; i < competencias.length; i++) {
        const comp = competencias[i];
        job.progresso.competenciaAtual = comp;
        job.progresso.percentual = Math.round((i / competencias.length) * 100);
        
        try {
          const parcial = await executarConciliacaoAutomatica({
            ...job.params,
            competencia: comp,
          });
          
          resultadoTotal.totalProcessados += parcial.totalProcessados;
          resultadoTotal.totalConciliados += parcial.totalConciliados;
          resultadoTotal.totalDivergentes += parcial.totalDivergentes;
          resultadoTotal.totalNaoRecebidos += parcial.totalNaoRecebidos;
          resultadoTotal.totalTerceiros += parcial.totalTerceiros;
          resultadoTotal.totalJaConciliados += parcial.totalJaConciliados;
          resultadoTotal.detalhes.conciliadosPorGuiaCodigo += parcial.detalhes.conciliadosPorGuiaCodigo;
          resultadoTotal.detalhes.conciliadosPorGuiaCodigoTuss += parcial.detalhes.conciliadosPorGuiaCodigoTuss;
          resultadoTotal.detalhes.conciliadosPorVinculacao += parcial.detalhes.conciliadosPorVinculacao;
          resultadoTotal.detalhes.conciliadosPorPacienteCodigo += parcial.detalhes.conciliadosPorPacienteCodigo;
          resultadoTotal.detalhes.conciliadosPorCarteiraCodigo += parcial.detalhes.conciliadosPorCarteiraCodigo;
          resultadoTotal.divergencias.push(...parcial.divergencias.slice(0, 10));
        } catch (err: any) {
          console.error(`[ConciliacaoJob] Erro na competência ${comp}:`, err.message);
          // Continua com as próximas
        }
        
        job.progresso.competenciasProcessadas = i + 1;
      }
      
      resultadoTotal.divergencias = resultadoTotal.divergencias.slice(0, 100);
      job.resultado = resultadoTotal;
      job.progresso.percentual = 100;
      job.status = 'concluido';
      job.finalizadoEm = Date.now();
    }
  } catch (err: any) {
    job.status = 'erro';
    job.erro = err.message || 'Erro desconhecido';
    job.finalizadoEm = Date.now();
    console.error(`[ConciliacaoJob] Job ${jobId} falhou:`, err);
  }
}

/**
 * Consulta o status de um job
 */
export function consultarJob(jobId: string): ConciliacaoJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Verifica se há um job em andamento para o estabelecimento
 */
export function jobEmAndamento(estabelecimentoId: number): ConciliacaoJob | null {
  for (const job of jobs.values()) {
    if (
      job.params.estabelecimentoId === estabelecimentoId &&
      (job.status === 'pendente' || job.status === 'processando')
    ) {
      return job;
    }
  }
  return null;
}
