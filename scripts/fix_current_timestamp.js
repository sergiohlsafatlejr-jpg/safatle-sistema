const fs = require('fs');
const path = require('path');

const dir = './drizzle';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Revert incorrect replacement
  content = content.replace(/CURRENT_datetime/g, 'CURRENT_TIMESTAMP');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed CURRENT_TIMESTAMP in ${file}`);
}
