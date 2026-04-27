import fs from "fs";

let content = fs.readFileSync("server/db.ts", "utf8");

// We need to find the exact grouping logic in getDadosBI and replace it with UTC methods or string splitting
// Let's replace:
//       const d = new Date(dataRefStr);
//       chave = \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2, '0')}\`;

const regex1 = /const d = new Date\(dataRefStr\);\s*chave = `\$\{d\.getFullYear\(\)\}-\$\{String\(d\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\)\}`;/g;
const replacement1 = `const d = new Date(dataRefStr);
        // Usa UTC para evitar que 2025-12-01T00:00:00Z vire 2025-11-30 no fuso horário local (Brasil GMT-3)
        chave = \`\${d.getUTCFullYear()}-\${String(d.getUTCMonth() + 1).padStart(2, '0')}\`;`;

// Also check the other place
//       const data = new Date(rawData);
//       const chave = data.toISOString().substring(0, 7); // YYYY-MM
// Actually, toISOString() already uses UTC, so that one is fine!
// Wait, what if rawData is already a Date object? toISOString() is fine.
// What about the other places in getDadosBI?

let modified = false;

if (regex1.test(content)) {
  content = content.replace(regex1, replacement1);
  modified = true;
  console.log("Replaced regex1");
}

// Let's also search for any other getFullYear() in getDadosBI
// Actually, let's just write this to file
if (modified) {
  fs.writeFileSync("server/db.ts", content);
  console.log("SUCCESS");
} else {
  console.log("NOT FOUND");
}
