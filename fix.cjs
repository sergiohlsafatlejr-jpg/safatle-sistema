const fs = require('fs');
let s = fs.readFileSync('server/db.ts', 'utf8');

const targetStr = `  let filteredContas = contasComFlag;\\n  const total = havingClause ? countResult.length : (countResult[0]?.count || 0);\\n\\n  return {\\n    items: filteredContas,`;

// Just let's replace whatever is between `totalLotesGuia: ` line and `return {`
// with clean code.
s = s.replace(/let filteredContas = contasComFlag;\\[^]*items: filteredContas,/, `let filteredContas = contasComFlag;\n  const total = havingClause ? countResult.length : (countResult[0]?.count || 0);\n\n  return {\n    items: filteredContas,`);

fs.writeFileSync('server/db.ts', s);
