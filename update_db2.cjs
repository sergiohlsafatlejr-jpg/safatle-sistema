const fs = require('fs');
const file = 'C:/Users/sergi/OneDrive/Antigravity/safatle-sistema/server/db.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `    const rawTipoItem = item.tipoItem || determinarTipoProcedimento(item.codigoItem || "", item.descricaoItem || undefined);\n    const tipoItem = String(rawTipoItem).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();`;
const replace1 = `    const rawStr = String(item.tipoItem || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    let tipoItem = rawStr;
    const desc = String(item.descricaoItem || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    if (desc.includes("diaria") || desc.includes("internacao") || rawStr === "diaria") {
      tipoItem = "diaria";
    } else if (!tipoItem || tipoItem === "taxa/alugueis" || tipoItem === "outros") {
      tipoItem = determinarTipoProcedimento(item.codigoItem || "", item.descricaoItem || undefined);
    }`;

code = code.replace(target1, replace1);

const target2 = `    const rawTItem = item.tipoItem || determinarTipoProcedimento(item.codigoItem || "", item.descricaoItem || undefined);\n    const tItem = String(rawTItem).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();`;
const replace2 = `    const rawStrT = String(item.tipoItem || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
    let tItem = rawStrT;
    const descT = String(item.descricaoItem || "").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
    if (descT.includes("diaria") || descT.includes("internacao") || rawStrT === "diaria") {
      tItem = "diaria";
    } else if (!tItem || tItem === "taxa/alugueis" || tItem === "outros") {
      tItem = determinarTipoProcedimento(item.codigoItem || "", item.descricaoItem || undefined);
    }`;

code = code.replace(target2, replace2);

fs.writeFileSync(file, code);
console.log("update_db2 success");
