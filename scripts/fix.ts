import fs from 'fs';
import path from 'path';

const dir = './drizzle';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Revert incorrect replacement that happened during regex
  content = content.replace(/CURRENT_datetime/g, 'CURRENT_TIMESTAMP');
  
  // Also apply the proper fix for the timestamps that don't have defaults
  content = content.replace(/timestamp,/g, 'datetime,');
  content = content.replace(/timestamp NOT NULL,/g, 'datetime NOT NULL,');
  content = content.replace(/timestamp$/gm, 'datetime');
  
  // Re-revert any collateral damage from the above naive .replace
  content = content.replace(/CURRENT_datetime/g, 'CURRENT_TIMESTAMP');

  fs.writeFileSync(filePath, content);
  console.log(`Patched ${file}`);
}
