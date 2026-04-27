const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

// Fix offset duplication
let offsetCount = 0;
code = code.replace(/const offset = \(filters\.page - 1\) \* filters\.pageSize;/g, () => {
    offsetCount++;
    if (offsetCount > 1) return 'const offset2 = (filters.page - 1) * filters.pageSize;';
    return 'const offset = (filters.page - 1) * filters.pageSize;';
});

code = code.replace(/const paginatedItems = items\.slice\(offset, offset \+ filters\.pageSize\);/g, (match, p1, off, str) => {
    if (off > code.indexOf('offset2')) {
        return 'const paginatedItems = items.slice(offset2, offset2 + filters.pageSize);';
    }
    return match;
});

// Resumo calculation
code = code.replace(
  /let totalFaturado = 0;\s*let totalPago = 0;\s*let totalGlosado = 0;\s*for \(const item of items\) {/g,
  `let totalFaturado = 0;
    let totalPago = 0;
    let totalGlosado = 0;
    const medicos = new Set<string>();
    const resumoPorConvenio: Record<string, any> = {};

    for (const item of items) {`
);

code = code.replace(
  /totalGlosado \+= parseFloat\(item\.valorGlosado\);/g,
  `totalGlosado += parseFloat(item.valorGlosado);
      
      if (item.nomeMedico && item.nomeMedico !== "Próprio Estabelecimento") medicos.add(item.nomeMedico);

      const convNome = item.convenioNome || "Sem Convênio";
      if (!resumoPorConvenio[convNome]) {
         resumoPorConvenio[convNome] = { faturado: 0, pago: 0, glosado: 0, itens: 0 };
      }
      resumoPorConvenio[convNome].faturado += parseFloat(item.valorFaturado);
      resumoPorConvenio[convNome].pago += parseFloat(item.valorPago);
      resumoPorConvenio[convNome].glosado += parseFloat(item.valorGlosado);
      resumoPorConvenio[convNome].itens += 1;`
);

// We need to replace ALL 'const resumo = ...' inside the getRepasseData
code = code.replace(
  /const resumo = {[\s\S]*?totalMedicos: \d+,?\s*};/g,
  `const resumo = {
      totalFaturado,
      totalPago,
      totalGlosado,
      totalItens: items.length,
      totalMedicos: medicos.size,
      resumoPorConvenio,
    };`
);

fs.writeFileSync('server/db.ts', code);
console.log('Final patch combined correctly');
