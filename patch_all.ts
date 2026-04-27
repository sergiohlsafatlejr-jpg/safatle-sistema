import fs from "fs";

let content = fs.readFileSync("server/db.ts", "utf8");

// FIX 1: Add contaCompetenciaMap mapping for Faturado
const faturadoStart = content.indexOf("const rawResult = await db.execute(sql.raw(sqlParts.join(' ')));");
const faturadoEnd = content.indexOf("    } else {\n      // Sem filtro de competência");

if (faturadoStart > -1 && faturadoEnd > -1) {
  const replacementFaturado = `const rawResult = await db.execute(sql.raw(sqlParts.join(' ')));
    
    // Buscar o mapeamento de numeroConta -> competencia em JS para evitar lentidão de subqueries SQL
    const ccrResult = await db.execute(sql.raw(\`
      SELECT numeroConta, competencia 
      FROM contas_convenio_resumo 
      WHERE estabelecimentoId = \${estabelecimentoId || 0}
      AND numeroConta IN (\${subqueryParts.join(' ')})
    \`));
    const ccrRows = (ccrResult as any)[0] || [];
    const contaCompetenciaMap = new Map<string, string>();
    for (const row of ccrRows) {
      if (row.numeroConta && row.competencia) {
        contaCompetenciaMap.set(String(row.numeroConta), row.competencia);
      }
    }

    const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const rawRows = (rawResult as any)[0] || [];
    itensFaturados = rawRows.map((row: any) => {
      const mapped: any = {};
      for (const key of Object.keys(row)) {
        mapped[snakeToCamel(key)] = row[key];
      }
      
      // SOBRESCREVER a competência do XML pela competência da CONTA
      const guiaStr = String(mapped.numeroGuiaPrestador || '');
      if (guiaStr && contaCompetenciaMap.has(guiaStr)) {
        mapped.competencia = contaCompetenciaMap.get(guiaStr);
      }
      return mapped;
    });
`;
  content = content.substring(0, faturadoStart) + replacementFaturado + content.substring(faturadoEnd);
} else {
  console.log("Faturado NOT FOUND");
}

// FIX 2: Map recebidosCompetenciaMap for Recebido and use getUTCFullYear
const recebidoStart = content.indexOf('  for (const item of itensRecebidosFiltrados) {\n    // Demonstrativo tem');
const recebidoEnd = content.indexOf('  // Adicionar dados de recebimento por paciente');

if (recebidoStart > -1 && recebidoEnd > -1) {
  const replacementRecebido = `
  // Buscar mapeamento de competencia para os itens recebidos (usando guiaNumero)
  const guiasRecebidas = Array.from(new Set(itensRecebidosFiltrados.map(i => i.guiaNumero).filter(Boolean)));
  const recebidosCompetenciaMap = new Map<string, string>();
  
  if (guiasRecebidas.length > 0) {
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
      } catch (err) {}
    }
  }

  for (const item of itensRecebidosFiltrados) {
    let chave = 'Sem Data';
    const guiaStr = String(item.numeroGuia || item.guiaNumero || '');
    
    if (guiaStr && recebidosCompetenciaMap.has(guiaStr)) {
      const comp = recebidosCompetenciaMap.get(guiaStr);
      if (comp) chave = comp.replace('/', '-');
    } else {
      const dataRefStr = item.dataReferencia;
      if (dataRefStr) {
        const d = new Date(dataRefStr);
        chave = \`\${d.getUTCFullYear()}-\${String(d.getUTCMonth() + 1).padStart(2, '0')}\`;
      } else {
        const dataRef = arquivoDataMap.get(item.arquivoId);
        chave = dataRef ? \`\${dataRef.getFullYear()}-\${String(dataRef.getMonth() + 1).padStart(2, '0')}\` : 'Sem Data';
      }
    }

    if (!porMesMap.has(chave)) {
      porMesMap.set(chave, { chave, valorFaturado: 0, valorRecebido: 0, valorGlosado: 0, valorPendente: 0, quantidade: 0, registros: 0, diarias: 0 });
    }
    const entry = porMesMap.get(chave)!;
    entry.valorRecebido += parseFloat(item.valorPago || "0");
    entry.valorGlosado += parseFloat(item.valorGlosa || "0");
  }
`;
  content = content.substring(0, recebidoStart) + replacementRecebido + content.substring(recebidoEnd);
} else {
  console.log("Recebido NOT FOUND: start=" + recebidoStart + " end=" + recebidoEnd);
}

fs.writeFileSync("server/db.ts", content);
console.log("SUCCESS");
