import fs from "fs";

let content = fs.readFileSync("client/src/pages/RelatoriosBI.tsx", "utf8");

const tableStart = content.indexOf('{/* Tabela de Valores por Competência e Convênio - Estilo Escuro Moderno */}');
const tabsStart = content.indexOf('{/* Charts & Tables in Tabs */}');
const tabsEnd = content.indexOf('</Tabs>') + '</Tabs>'.length;

if (tableStart > -1 && tabsStart > -1 && tabsEnd > -1) {
  const tablesBlock = content.substring(tableStart, tabsStart);
  const tabsBlock = content.substring(tabsStart, tabsEnd);
  
  const beforeTables = content.substring(0, tableStart);
  const afterTabs = content.substring(tabsEnd);
  
  const newContent = beforeTables + tabsBlock + "\n\n" + tablesBlock + afterTabs;
  fs.writeFileSync("client/src/pages/RelatoriosBI.tsx", newContent);
  console.log("SUCCESS: Swapped Tables and Tabs");
} else {
  console.log("ERROR: Blocks not found");
}
