const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

const regex1 = /\{ totalFaturado, totalPago, totalGlosado, totalItens: items\.length, totalMedicos: 0 \}/g;

code = code.replace(
  /let totalFaturado = 0;\s*let totalPago = 0;\s*let totalGlosado = 0;\s*for \(const item of items\) {/g,
  `let totalFaturado = 0;
    let totalPago = 0;
    let totalGlosado = 0;
    const medicos = new Set<string>();
    const resumoPorConvenio: Record<string, any> = {};

    for (const item of items) {`
);

// We need to inject the internal updates
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

let count = 0;
code = code.replace(
  /const resumo = {[\s\S]*?totalMedicos: \d+,?\s*};/,
  (match) => {
    count++;
    return `const resumo = {
      totalFaturado,
      totalPago,
      totalGlosado,
      totalItens: items.length,
      totalMedicos: medicos.size,
      resumoPorConvenio,
    };`;
  }
);

code = code.replace(
  /const resumo = {[\s\S]*?totalMedicos: \d+,?\s*};/,
  (match) => {
    count++;
    return `const resumo = {
      totalFaturado,
      totalPago,
      totalGlosado,
      totalItens: items.length,
      totalMedicos: medicos.size,
      resumoPorConvenio,
    };`;
  }
);

fs.writeFileSync('server/db.ts', code);
console.log('Modified server/db.ts - count:', count);
