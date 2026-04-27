import fs from "fs";

let content = fs.readFileSync("server/db.ts", "utf8");

const startIdx = content.indexOf('const rawResultRetornados = await db.execute(sql.raw(sqlPartsRetornados.join(');
const endIdx = content.indexOf('const itensRecebidosFiltrados = itensRecebidos.filter(filtrarRecebido);', startIdx);

if (startIdx > -1 && endIdx > -1) {
  const snippet = content.substring(startIdx, endIdx);
  fs.writeFileSync("snippet.ts", snippet);
  console.log("Snippet written to snippet.ts");
} else {
  console.log("NOT FOUND");
}
