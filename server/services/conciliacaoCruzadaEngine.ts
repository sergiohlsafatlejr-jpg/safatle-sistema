function normalizarCodigo(codigo: string | null | undefined): string {
  if (!codigo) return '';
  const limpo = String(codigo).trim().replace(/^0+/, '');
  return limpo === '' && String(codigo).trim().length > 0 ? '0' : limpo;
}

function normalizarNome(nome: string): string {
  return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Motor de Conciliação Multi-Fase (v2 - Faturamento-First)
 * 
 * Abordagem: Itera sobre cada item de FATURAMENTO e busca o melhor recebimento.
 * Isso garante que cada faturamento receba no máximo seu próprio valor como pagamento.
 * 
 * Fase 1: Match individual (guia+código, guia+TUSS, vinculação, paciente+código)
 * Fase 2: Consolidação N:1 (múltiplos faturamentos glosados → 1 recebimento agrupado)
 * Fase 3: Reagrupamento 1:N (1 faturamento divergente → soma de múltiplos recebimentos)
 */
export function executarMatchingMultiFase(
  itensFaturamento: any[],
  itensRecebimento: any[],
  vinculacoes: Map<string, string>,
  codigosProprios: Set<string>,
  toleranciaPercentual: number = 1
) {
  const tolerancia = toleranciaPercentual;

  const resultado = {
    totalProcessados: itensFaturamento.length,
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
    divergencias: [] as any[],
  };

  const inserts: any[] = [];

  // Clone recebimentos com saldo e flag de utilização para itens glosados
  const recebimentos = itensRecebimento.map((r: any) => ({
    ...r,
    saldoPago: Number(r.valorPago) || 0,
    utilizado: false
  }));

  // ==========================================
  // INDEXAÇÃO DOS RECEBIMENTOS
  // ==========================================
  const indexGuiaCodigo = new Map<string, any[]>();
  const indexGuia = new Map<string, any[]>();
  const indexPacienteCodigo = new Map<string, any[]>();
  const indexCarteiraCodigo = new Map<string, any[]>();

  for (const rec of recebimentos) {
    const guia = String(rec.numeroGuia || '').trim();
    const codigo = normalizarCodigo(String(rec.codigoItem || ''));
    const paciente = normalizarNome(String(rec.nomeBeneficiario || ''));
    const carteira = String(rec.carteira || '').trim();

    if (guia) {
      if (!indexGuia.has(guia)) indexGuia.set(guia, []);
      indexGuia.get(guia)!.push(rec);
      if (codigo) {
        const k = `${guia}|${codigo}`;
        if (!indexGuiaCodigo.has(k)) indexGuiaCodigo.set(k, []);
        indexGuiaCodigo.get(k)!.push(rec);
      }
    }
    if (paciente && codigo) {
      const k = `${paciente}|${codigo}`;
      if (!indexPacienteCodigo.has(k)) indexPacienteCodigo.set(k, []);
      indexPacienteCodigo.get(k)!.push(rec);
    }
    if (carteira && codigo) {
      const k = `${carteira}|${codigo}`;
      if (!indexCarteiraCodigo.has(k)) indexCarteiraCodigo.set(k, []);
      indexCarteiraCodigo.get(k)!.push(rec);
    }
  }

  // Helper: encontrar melhor match com saldo disponível OU totalmente glosado
  function encontrarMelhorMatch(candidatos: any[] | undefined, valorFaturado: number): any | null {
    if (!candidatos) return null;
    // Permite itens com saldo pago > 0 OU itens totalmente glosados (valorPago == 0 e não utilizados)
    const disp = candidatos.filter((c: any) => c.saldoPago > 0.01 || (Number(c.valorPago) === 0 && !c.utilizado));
    if (disp.length === 0) return null;
    
    // Se tivermos itens com saldo e sem saldo, dar preferência para quem tem saldo (se o faturamento for > 0)
    const dispComSaldo = disp.filter((c: any) => c.saldoPago > 0.01);
    const dispSemSaldo = disp.filter((c: any) => Number(c.valorPago) === 0 && !c.utilizado);

    let melhores = disp;
    if (valorFaturado > 0 && dispComSaldo.length > 0) {
        melhores = dispComSaldo;
    } else if (valorFaturado === 0 && dispSemSaldo.length > 0) {
        melhores = dispSemSaldo;
    }

    if (melhores.length === 1) return melhores[0];

    // Preferir match exato de valor
    const exato = melhores.find((c: any) => Math.abs(c.saldoPago - valorFaturado) < 0.01);
    if (exato) return exato;
    // Senão, mais próximo
    let melhor = melhores[0];
    let menorDiff = Math.abs(valorFaturado - melhor.saldoPago);
    for (let i = 1; i < melhores.length; i++) {
      const diff = Math.abs(valorFaturado - melhores[i].saldoPago);
      if (diff < menorDiff) { menorDiff = diff; melhor = melhores[i]; }
    }
    return melhor;
  }

  // Helper: separar codigoGlosa (numérico curto) de motivoGlosa (texto longo) e mapear textos comuns para códigos TISS
  function parseGlosa(raw: string | null): { codigoGlosa: string | null; motivoGlosa: string | null } {
    if (!raw) return { codigoGlosa: null, motivoGlosa: null };
    const s = String(raw).trim();
    if (s.length <= 20 && /^\d+$/.test(s)) return { codigoGlosa: s, motivoGlosa: null };
    
    // Dicionário básico de conversão de texto de demonstrativo para código TISS
    let codigo = null;
    const txt = s.toUpperCase();
    if (txt.includes('ASSINATURA DO TITULAR') || txt.includes('RESPONSÁVEL INEXISTENTE') || txt.includes('RESPONSAVEL INEXISTENTE')) {
      codigo = '1010'; // Assinatura do titular/responsável inexistente
    } else if (txt.includes('VALOR COBRADO MAIOR') || txt.includes('VALOR INCORRETO')) {
      codigo = '1004'; // Valor cobrado a maior
    } else if (txt.includes('FALTA DE AUTORIZAÇÃO') || txt.includes('SEM AUTORIZACAO')) {
      codigo = '1006'; // Procedimento sem autorização
    } else if (txt.includes('COBRANÇA INDEVIDA') || txt.includes('COBRANCA INDEVIDA')) {
      codigo = '1008'; // Cobrança indevida
    } else if (txt.includes('GUIA NÃO ENVIADA') || txt.includes('GUIA NAO ENVIADA')) {
      codigo = '1009'; // Guia não enviada
    } else if (txt.includes('PROCEDIMENTO NÃO COBERTO') || txt.includes('NAO COBERTO')) {
      codigo = '1012'; // Procedimento não coberto
    } else {
      codigo = '5007'; // Código TISS genérico (divergência de valores / glosa automática) quando não identificar
    }
    
    return { codigoGlosa: codigo, motivoGlosa: s };
  }

  // ==========================================
  // FASE 1: MATCHING INDIVIDUAL (faturamento-first)
  // Para cada faturamento, buscar o melhor recebimento.
  // Pega no máximo min(valorFaturado, saldoPago).
  // ==========================================
  for (const fat of itensFaturamento) {
    const guia = String(fat.numeroGuia || fat.contaNumero || '').trim();
    const codigoNorm = normalizarCodigo(fat.codigoItem || '');
    const codigoTussNorm = normalizarCodigo(fat.codigoItemTuss || '');
    const paciente = normalizarNome(String(fat.pacienteNome || ''));
    const carteira = String(fat.carteiraBeneficiario || '').trim();
    const valorFaturado = Number(fat.valorFaturado) || 0;

    let recMatch: any = null;
    let metodo = '';

    // 1. Guia + código
    if (guia && codigoNorm) {
      recMatch = encontrarMelhorMatch(indexGuiaCodigo.get(`${guia}|${codigoNorm}`), valorFaturado);
      if (recMatch) metodo = 'guia_codigo';
    }
    // 2. Guia + TUSS
    if (!recMatch && guia && codigoTussNorm && codigoTussNorm !== codigoNorm) {
      recMatch = encontrarMelhorMatch(indexGuiaCodigo.get(`${guia}|${codigoTussNorm}`), valorFaturado);
      if (recMatch) metodo = 'guia_codigo_tuss';
    }
    // 3. Vinculação
    if (!recMatch && guia && fat.codigoItem && vinculacoes.has(fat.codigoItem)) {
      const codTrad = normalizarCodigo(vinculacoes.get(fat.codigoItem)!);
      recMatch = encontrarMelhorMatch(indexGuiaCodigo.get(`${guia}|${codTrad}`), valorFaturado);
      if (recMatch) metodo = 'vinculacao';
    }
    // 4. Paciente + código
    if (!recMatch && paciente && codigoNorm) {
      const possivel = encontrarMelhorMatch(indexPacienteCodigo.get(`${paciente}|${codigoNorm}`), valorFaturado);
      if (possivel) {
        if (!possivel.numero_guia || possivel.numero_guia === guia || Math.abs(possivel.saldoPago - valorFaturado) < 0.01) {
          recMatch = possivel;
          metodo = 'paciente_codigo';
        }
      }
    }
    // 5. Carteira + código
    if (!recMatch && carteira && codigoNorm) {
      const possivel = encontrarMelhorMatch(indexCarteiraCodigo.get(`${carteira}|${codigoNorm}`), valorFaturado);
      if (possivel) {
        if (!possivel.numero_guia || possivel.numero_guia === guia || Math.abs(possivel.saldoPago - valorFaturado) < 0.01) {
          recMatch = possivel;
          metodo = 'carteira_codigo';
        }
      }
    }
    // 6. Valor exato na mesma guia
    if (!recMatch && guia && valorFaturado > 0) {
      const cg = indexGuia.get(guia);
      if (cg) {
        const m = cg.filter((c: any) => c.saldoPago > 0.01 && Math.abs(c.saldoPago - valorFaturado) < 0.01);
        if (m.length > 0) { recMatch = m[0]; metodo = 'guia_valor'; }
      }
    }

    // Base insert
    const baseInsert: any = {
      faturamentoUnificadoId: fat.id,
      contaNumero: String(fat.contaNumero || ''),
      numeroGuia: guia,
      pacienteNome: String(fat.pacienteNome || ''),
      convenio: String(fat.convenio || ''),
      convenioId: fat.convenioId ? Number(fat.convenioId) : null,
      competencia: String(fat.competencia || ''),
      codigoItem: String(fat.codigoItem || ''),
      codigoItemTuss: String(fat.codigoItemTuss || ''),
      descricaoItem: String(fat.descricaoItem || ''),
      tipoItem: String(fat.tipoItem || ''),
      origemSistema: String(fat.origemSistema || ''),
      dataExecucao: fat.dataExecucao ? new Date(fat.dataExecucao).toISOString().slice(0, 19).replace('T', ' ') : null,
      codigoPrestadorExecutante: fat.codigoPrestadorExecutante ? String(fat.codigoPrestadorExecutante) : null,
      valorFaturado,
      quantidade: Number(fat.quantidade) || 0,
      codigoGlosa: null as string | null,
      motivoGlosa: null as string | null,
    };

    if (recMatch) {
      // Pegar no MÁXIMO o valor faturado (nunca mais!)
      const valorRecebido = Math.min(valorFaturado, recMatch.saldoPago);
      recMatch.saldoPago -= valorRecebido;
      recMatch.utilizado = true;

      const diferenca = valorFaturado - valorRecebido;
      const pctDif = valorFaturado > 0 ? Math.min(9999.99, (Math.abs(diferenca) / valorFaturado) * 100) : 0;

      // Enriquecer com dados do recebimento
      if (recMatch.nomeBeneficiario) baseInsert.pacienteNome = String(recMatch.nomeBeneficiario);
      if (recMatch.descricaoItem) baseInsert.descricaoItem = String(recMatch.descricaoItem);
      // Removido: Não sobrescrever o tipo do faturamento (MAT/MED) com o tipo financeiro do demonstrativo (CRÉDITO)
      // if (recMatch.tipoLancamento) baseInsert.tipoItem = String(recMatch.tipoLancamento);
      const glosa = parseGlosa(recMatch.codigoGlosa);
      baseInsert.codigoGlosa = glosa.codigoGlosa;
      baseInsert.motivoGlosa = glosa.motivoGlosa;

      const valorGlosaRec = diferenca > 0 ? diferenca : 0;
      let status = pctDif <= tolerancia ? 'conciliado' : 'divergente';

      inserts.push({
        ...baseInsert, recebimentoId: recMatch.id, recebimentoOrigem: 'excel',
        valorPago: valorRecebido, valorGlosa: valorGlosaRec,
        statusConciliacao: status, metodoConciliacao: metodo,
        diferenca, percentualDiferenca: pctDif,
      });

      if (status === 'conciliado') resultado.totalConciliados++;
      else {
        resultado.totalDivergentes++;
        resultado.divergencias.push({
          faturamentoId: fat.id, recebimentoId: recMatch.id,
          codigoItem: fat.codigoItem, numeroGuia: guia,
          valorFaturado, valorRecebido, diferenca,
        });
      }
      // Contadores por método
      switch (metodo) {
        case 'guia_codigo': resultado.detalhes.conciliadosPorGuiaCodigo++; break;
        case 'guia_codigo_tuss': resultado.detalhes.conciliadosPorGuiaCodigoTuss++; break;
        case 'vinculacao': resultado.detalhes.conciliadosPorVinculacao++; break;
        case 'paciente_codigo': resultado.detalhes.conciliadosPorPacienteCodigo++; break;
        case 'carteira_codigo': resultado.detalhes.conciliadosPorCarteiraCodigo++; break;
      }
    } else {
      // Sem match - verificar se terceiro
      let isTerceiro = false;
      const codPrest = baseInsert.codigoPrestadorExecutante;
      
      // Regra 1: Código do prestador executante não está nos próprios
      if (codigosProprios.size > 0) {
        if (codPrest && !codigosProprios.has(codPrest)) {
          isTerceiro = true;
        } else if (!codPrest) {
          const mesmaGuia = itensFaturamento.filter((f: any) => String(f.numeroGuia || f.contaNumero) === guia);
          if (mesmaGuia.some((f: any) => f.codigoPrestadorExecutante && codigosProprios.has(String(f.codigoPrestadorExecutante)))) {
            isTerceiro = true;
          }
        }
      }
      
      // Regra 2: Tipo "P" (Procedimento/Honorário médico) sem match = médico credenciado (terceiro)
      // Honorários médicos não são recebidos pelo hospital, são pagos diretamente ao médico
      if (!isTerceiro && baseInsert.tipoItem) {
        const tipo = String(baseInsert.tipoItem).toUpperCase().trim();
        if (tipo === 'P' || tipo === 'PROCEDIMENTO' || tipo === 'HONORARIO' || tipo === 'HONORÁRIO') {
          isTerceiro = true;
        }
      }
      
      if (isTerceiro) {
        inserts.push({
          ...baseInsert, recebimentoId: null, recebimentoOrigem: null,
          valorPago: 0, valorGlosa: 0, statusConciliacao: 'terceiro',
          metodoConciliacao: null, diferenca: 0, percentualDiferenca: 0,
        });
        resultado.totalTerceiros++;
      } else {
        inserts.push({
          ...baseInsert, recebimentoId: null, recebimentoOrigem: null,
          valorPago: 0, valorGlosa: 0, statusConciliacao: 'nao_recebido',
          metodoConciliacao: null, diferenca: valorFaturado, percentualDiferenca: 100,
          codigoGlosa: null,
        });
        resultado.totalNaoRecebidos++;
      }
    }
  }

  // ==========================================
  // FASE 2: CONSOLIDAÇÃO N:1
  // Múltiplos faturamentos glosados (mesmo guia+código) → 1 recebimento agrupado
  // ==========================================
  const glosadosIdx = inserts
    .map((ins, idx) => ({ ins, idx }))
    .filter(({ ins }) => ins.statusConciliacao === 'nao_recebido' && !ins.recebimentoId);

  const gruposGlosados = new Map<string, { ins: any; idx: number }[]>();
  for (const item of glosadosIdx) {
    const k = `${item.ins.numeroGuia}|${normalizarCodigo(item.ins.codigoItem)}`;
    if (!gruposGlosados.has(k)) gruposGlosados.set(k, []);
    gruposGlosados.get(k)!.push(item);
  }

  for (const [chave, grupo] of gruposGlosados) {
    if (grupo.length < 2) continue;
    const somaQtd = grupo.reduce((s, g) => s + g.ins.quantidade, 0);
    const somaValor = grupo.reduce((s, g) => s + g.ins.valorFaturado, 0);

    const candidatos = indexGuiaCodigo.get(chave);
    if (!candidatos) continue;

    const disp = candidatos.filter((c: any) => c.saldoPago > 0.01 || (Number(c.valorPago) === 0 && !c.utilizado));
    let recAgrupado = disp.find((c: any) => Math.abs((Number(c.quantidade) || 0) - somaQtd) < 0.01);
    if (!recAgrupado) {
      recAgrupado = disp.find((c: any) => somaValor > 0 && Math.abs(c.saldoPago - somaValor) / somaValor <= tolerancia / 100);
    }
    if (!recAgrupado) continue;

    const valorRecTotal = Math.min(recAgrupado.saldoPago, somaValor);
    recAgrupado.saldoPago -= valorRecTotal;
    recAgrupado.utilizado = true;
    const glosaTotal = Number(recAgrupado.valorGlosa) || 0;
    const glosa = parseGlosa(recAgrupado.codigoGlosa);

    for (const { ins } of grupo) {
      const prop = somaValor > 0 ? ins.valorFaturado / somaValor : 1 / grupo.length;
      const vPago = Math.round(valorRecTotal * prop * 100) / 100;
      const vGlosa = Math.round(glosaTotal * prop * 100) / 100;
      const dif = ins.valorFaturado - vPago;
      const pct = ins.valorFaturado > 0 ? Math.min(9999.99, (Math.abs(dif) / ins.valorFaturado) * 100) : 0;

      if (recAgrupado.nomeBeneficiario) ins.pacienteNome = String(recAgrupado.nomeBeneficiario);
      ins.codigoGlosa = glosa.codigoGlosa;
      ins.motivoGlosa = glosa.motivoGlosa;
      ins.recebimentoId = recAgrupado.id;
      ins.recebimentoOrigem = 'excel';
      ins.valorPago = vPago;
      ins.valorGlosa = vGlosa;
      ins.diferenca = dif;
      ins.percentualDiferenca = pct;
      ins.metodoConciliacao = 'agrupamento';
      ins.statusConciliacao = pct <= tolerancia ? 'conciliado' : 'divergente';

      if (ins.statusConciliacao === 'conciliado') resultado.totalConciliados++;
      else resultado.totalDivergentes++;
      resultado.totalNaoRecebidos--;
    }
  }

  // ==========================================
  // FASE 3: REAGRUPAMENTO 1:N
  // 1 faturamento divergente → soma de múltiplos recebimentos com saldo
  // ==========================================
  const divergentes = inserts
    .map((ins, idx) => ({ ins, idx }))
    .filter(({ ins }) => ins.statusConciliacao === 'divergente' || ins.statusConciliacao === 'nao_recebido');

  for (const { ins } of divergentes) {
    const guia = ins.numeroGuia;
    const codigo = normalizarCodigo(ins.codigoItem);
    if (!guia || !codigo) continue;
    const cands = indexGuiaCodigo.get(`${guia}|${codigo}`);
    if (!cands) continue;
    const naoUsados = cands.filter((c: any) => c.saldoPago > 0.01 || (Number(c.valorPago) === 0 && !c.utilizado));
    if (naoUsados.length === 0) continue;

    let somaPago = ins.valorPago;
    let somaGlosa = ins.valorGlosa;
    const usados: any[] = [];

    for (const rec of naoUsados) {
      const add = Math.min(rec.saldoPago, ins.valorFaturado - somaPago);
      if (add <= 0.01) continue;
      somaPago += add;
      somaGlosa += Number(rec.valorGlosa) || 0;
      usados.push({ rec, add });
    }

    if (Math.abs(ins.valorFaturado - somaPago) < Math.abs(ins.valorFaturado - ins.valorPago)) {
      for (const u of usados) {
        u.rec.saldoPago -= u.add;
        u.rec.utilizado = true;
      }
      const dif = ins.valorFaturado - somaPago;
      const pct = ins.valorFaturado > 0 ? Math.min(9999.99, (Math.abs(dif) / ins.valorFaturado) * 100) : 0;
      ins.valorPago = somaPago;
      // Glosa = diferença real entre faturado e pago (não acumulada)
      ins.valorGlosa = dif > 0 ? dif : 0;
      ins.diferenca = dif;
      ins.percentualDiferenca = pct;
      ins.metodoConciliacao = 'agrupamento_recebimentos';
      const oldStatus = ins.statusConciliacao;
      ins.statusConciliacao = pct <= tolerancia ? 'conciliado' : 'divergente';
      // Atualizar contadores
      if (oldStatus === 'divergente') resultado.totalDivergentes--;
      if (oldStatus === 'nao_recebido') resultado.totalNaoRecebidos--;
      if (ins.statusConciliacao === 'conciliado') resultado.totalConciliados++;
      else resultado.totalDivergentes++;
    }
  }

  // ==========================================
  // FASE 4: CONVERTER DIVERGÊNCIAS COM DIFERENÇA PARA GLOSA
  // Toda divergência com diferença positiva (faturado > pago) é uma glosa.
  // - Se o demonstrativo já trouxe código de glosa (ex: 1702), mantém.
  // - Se não tem motivo, atribui código 5007 (glosa automática).
  // Itens 'nao_recebido' permanecem inalterados.
  // ==========================================
  for (const ins of inserts) {
    if (ins.statusConciliacao === 'divergente' && ins.diferenca > 0) {
      ins.statusConciliacao = 'glosado';
      ins.valorGlosa = ins.diferenca;
      if (!ins.codigoGlosa && !ins.motivoGlosa) {
        ins.codigoGlosa = '5007';
        ins.motivoGlosa = 'Glosa Automática - Valor divergente sem motivo no demonstrativo';
      }
      resultado.totalDivergentes--;
      resultado.totalGlosados++;
    }
  }

  return { inserts, resultado };
}
