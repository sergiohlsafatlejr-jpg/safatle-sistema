const fs = require('fs');
const file = 'C:/Users/sergi/OneDrive/Antigravity/safatle-sistema/server/db.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Interfaces
code = code.replace(
  /registros: number;\r?\n}/,
  'registros: number;\n  diarias?: number;\n  ticketMedio?: number;\n}'
);

// 2. Add totalDiarias
code = code.replace(
  /let totalProcedimentos = 0;\r?\n  const pacientesSet = new Set<string>\(\);/,
  'let totalProcedimentos = 0;\n  let totalDiarias = 0;\n  const pacientesSet = new Set<string>();'
);

// 3. Normalize tipoItem in general loop
code = code.replace(
  /totalFaturado \+= parseFloat\(item\.valorFaturado \|\| \"0\"\);\r?\n    const tipoItem = item\.tipoItem \|\| determinarTipoProcedimento\(item\.codigoItem \|\| '', item\.descricaoItem \|\| undefined\);\r?\n    if \(tipoItem === \"material\"/,
  'totalFaturado += parseFloat(item.valorFaturado || "0");\n    const rawTipoItem = item.tipoItem || determinarTipoProcedimento(item.codigoItem || "", item.descricaoItem || undefined);\n    const tipoItem = String(rawTipoItem).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();\n    if (tipoItem === "material"'
);

// 4. Sum totalDiarias in general loop
code = code.replace(
  /else if \(tipoItem === \"procedimento\"\) totalHonorarios\+\+;\r?\n    totalProcedimentos\+\+;/,
  'else if (tipoItem === "procedimento") totalHonorarios++;\n    else if (tipoItem === "diaria") totalDiarias += parseFloat(item.quantidade || "1");\n    totalProcedimentos++;'
);

// 5. Update overall ticketMedio formula
code = code.replace(
  /const ticketMedio = totalGuias > 0 \? totalFaturado \/ totalGuias : 0;/,
  'const ticketMedio = totalDiarias > 0 ? totalFaturado / totalDiarias : (totalGuias > 0 ? totalFaturado / totalGuias : 0);'
);

// 6. Init diarias in grouping loop
code = code.replace(
  /valorPendente: 0, quantidade: 0, registros: 0 }\);/g,
  'valorPendente: 0, quantidade: 0, registros: 0, diarias: 0 });'
);

// 7. Sum diarias in grouping loop
code = code.replace(
  /entry\.quantidade \+= parseFloat\(String\(item\.quantidade \|\| \"1\"\)\);\r?\n    entry\.registros\+\+;/g,
  'entry.quantidade += parseFloat(String(item.quantidade || "1"));\n    entry.registros++;\n    const rawTItem = item.tipoItem || determinarTipoProcedimento(item.codigoItem || "", item.descricaoItem || undefined);\n    const tItem = String(rawTItem).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();\n    if (tItem === "diaria") entry.diarias = (entry.diarias || 0) + parseFloat(item.quantidade || "1");'
);

// 8. Update ticketMedio por convenio
code = code.replace(
  /for \(const entry of Array\.from\(porConvenioMap\.values\(\)\)\) \{\r?\n    entry\.valorPendente = entry\.valorFaturado - entry\.valorRecebido - entry\.valorGlosado;\r?\n  }/,
  'for (const entry of Array.from(porConvenioMap.values())) {\n    entry.valorPendente = entry.valorFaturado - entry.valorRecebido - entry.valorGlosado;\n    entry.ticketMedio = (entry.diarias && entry.diarias > 0) ? entry.valorFaturado / entry.diarias : 0;\n  }'
);

fs.writeFileSync(file, code);
console.log("update_db success");
