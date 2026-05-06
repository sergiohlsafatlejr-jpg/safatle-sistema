import fs from "fs";

function extractTablesAndColumns() {
  const layoutPath = "c:\\Users\\sergi\\OneDrive\\Antigravity\\safatle-sistema\\scratch\\pbix_extract\\Report\\Layout";
  
  let raw = fs.readFileSync(layoutPath, "utf16le");
  if (raw[0] !== '{') {
    raw = fs.readFileSync(layoutPath, "utf8");
  }
  
  const tables = new Set<string>();
  const columns = new Set<string>();
  
  try {
    const layout = JSON.parse(raw);
    layout.sections.forEach((s: any) => {
      if (s.visualContainers) {
         s.visualContainers.forEach((v: any) => {
            try {
              const config = JSON.parse(v.config);
              // Projections usually define what fields are used
              if (config.singleVisual && config.singleVisual.projections) {
                 for (const proj in config.singleVisual.projections) {
                    config.singleVisual.projections[proj].forEach((p: any) => {
                        if (p.queryRef) {
                            columns.add(p.queryRef);
                            const parts = p.queryRef.split('.');
                            if (parts.length > 1) {
                                tables.add(parts[0]);
                            }
                        }
                    });
                 }
              }
            } catch(e) {}
         });
      }
    });
    
    console.log("=== Tables detected in visuals ===");
    console.log(Array.from(tables).sort().join("\n"));
    
    console.log("\n=== Columns detected in visuals ===");
    console.log(Array.from(columns).sort().join("\n"));
    
  } catch (e) {
    console.log("Error parsing JSON", e);
  }
}

extractTablesAndColumns();
