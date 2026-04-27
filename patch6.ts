import fs from "fs";

let content = fs.readFileSync("server/db.ts", "utf8");

const start = content.indexOf('    for (const item of itensRecebidosFiltrados) {');
const end = content.indexOf('    // Agrupamentos por dimensão Faturado', start);

if (start === -1 || end === -1) {
  console.log("NOT FOUND: start=" + start + " end=" + end);
  process.exit(1);
}

const replacement = `
    // Buscar mapeamento de competencia para os itens recebidos (usando guiaNumero)
    const guiasRecebidas = Array.from(new Set(itensRecebidosFiltrados.map(i => i.guiaNumero).filter(Boolean)));
    const recebidosCompetenciaMap = new Map<string, string>();
    
    if (guiasRecebidas.length > 0) {
      // Chunk the query to avoid "Too many parameters" if there are thousands of guides
      const chunkSize = 1000;
      for (let i = 0; i < guiasRecebidas.length; i += chunkSize) {
        const chunk = guiasRecebidas.slice(i, i + chunkSize);
        const quotedChunk = chunk.map(g => "'" + String(g).replace(/'/g, "") + "'").join(',');
        
        try {
          const ccrRecResult = await db.execute(sql.raw(\`
            SELECT numeroConta, competencia 
            FROM contas_convenio_resumo 
            WHERE estabelecimentoId = \${estabelecimentoId || 0}
            AND numeroConta IN (\${quotedChunk})
          \`));
          const ccrRecRows = (ccrRecResult as any)[0] || [];
          for (const row of ccrRecRows) {
            if (row.numeroConta && row.competencia) {
              recebidosCompetenciaMap.set(String(row.numeroConta), row.competencia);
            }
          }
        } catch (err) {
          console.error("Erro ao buscar competencias recebidos:", err);
        }
      }
    }

    // Mapear RECEBIDOS por mês
    for (const item of itensRecebidosFiltrados) {
      let chave = 'Sem Data';
      
      // PRIORIDADE 1: Mês Referência (Competência) da Conta associada
      const guiaStr = String(item.guiaNumero || '');
      if (guiaStr && recebidosCompetenciaMap.has(guiaStr)) {
        const comp = recebidosCompetenciaMap.get(guiaStr);
        if (comp) {
          // A competencia da conta geralmente vem como YYYY/MM, precisamos converter para YYYY-MM
          chave = comp.replace('/', '-');
        }
      } else {
        // PRIORIDADE 2: Data de Referência do Arquivo Demonstrativo
        const dataRefStr = item.dataReferencia;
        if (dataRefStr) {
          const d = new Date(dataRefStr);
          // Usa UTC para evitar que 2025-12-01T00:00:00Z vire 2025-11-30 no fuso horário local (Brasil GMT-3)
          chave = \`\${d.getUTCFullYear()}-\${String(d.getUTCMonth() + 1).padStart(2, '0')}\`;
        } else {
          const dataRef = arquivoDataMap.get(item.arquivoId);
          chave = dataRef ? \`\${dataRef.getFullYear()}-\${String(dataRef.getMonth() + 1).padStart(2, '0')}\` : 'Sem Data';
        }
      }

      if (!porMesMap.has(chave)) {
        porMesMap.set(chave, { chave, valorFaturado: 0, valorRecebido: 0, valorGlosado: 0, valorPendente: 0, quantidade: 0, registros: 0, diarias: 0 });
      }
      const mesData = porMesMap.get(chave)!;
      mesData.valorRecebido += Number(item.valorPago) || 0;
      mesData.valorGlosado += Number(item.valorGlosa) || 0;
      mesData.valorPendente -= (Number(item.valorPago) || 0) + (Number(item.valorGlosa) || 0);
      totalRecebido += Number(item.valorPago) || 0;
      totalGlosado += Number(item.valorGlosa) || 0;
      totalPendente -= (Number(item.valorPago) || 0) + (Number(item.valorGlosa) || 0);
    }

`;

content = content.substring(0, start) + replacement + content.substring(end);
fs.writeFileSync("server/db.ts", content);
console.log("SUCCESS");
