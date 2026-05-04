const fs = require('fs');
const file = 'c:/Users/sergi/OneDrive/Antigravity/safatle-sistema/server/faturamentoUnificadoService.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add whereClause update for manual_auxiliar before the query string in itensConciliadosPorGuia
content = content.replace(
  /    if \(params\.contaNumero\) \{\r?\n      whereClause \+= ` AND ca\.contaNumero = '\$\{params\.contaNumero\.replace\(\/'\/g, "''"\)\}'`;\r?\n    \}\r?\n  \}\r?\n\r?\n  const query = `/g,
  `    if (params.contaNumero) {\n      whereClause += \` AND ca.contaNumero = '\${params.contaNumero.replace(/'/g, "''")}'\`;\n    }\n  }\n\n  whereClause += \` AND (ca.metodoConciliacao != 'manual_auxiliar' OR ca.metodoConciliacao IS NULL)\`;\n\n  const query = \``
);

// 2. Change valor_pagamento to 0 for auxiliary manual links
content = content.replace(
  /\$\{r\.id\}, 'excel', \$\{Number\(r\.valor_pagamento\) \|\| 0\}, 0,/g,
  `\${r.id}, 'excel', 0, 0,`
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed file');
