import { getDb } from "../server/db";
import { queryConfiguracoes } from "../drizzle/schema-integracao";
import * as fs from "fs";

async function run() {
  const db = await getDb();
  if(!db) { console.error("No DB"); return; }
  
  const configs = await db.select().from(queryConfiguracoes);
  const out = configs.map(c => ({
    id: c.id,
    tipo: c.tipoDados,
    conexao: c.conexaoConfig ? JSON.parse(c.conexaoConfig as string) : null
  }));
  
  fs.writeFileSync("config_dump.json", JSON.stringify(out, null, 2));
  console.log("Dumped to config_dump.json");
  process.exit(0);
}
run();
