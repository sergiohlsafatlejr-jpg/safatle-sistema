const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

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
console.log('Replaced all resumos');
