const fs = require('fs');
const path = require('path');

const dir = './drizzle';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace `timestamp,` with `datetime,`
  content = content.replace(/timestamp,/g, 'datetime,');
  // Replace `timestamp NOT NULL,` with `datetime NOT NULL,`
  content = content.replace(/timestamp NOT NULL,/g, 'datetime NOT NULL,');
  // Replace `timestamp` at the end of a line (if any)
  content = content.replace(/timestamp$/gm, 'datetime');
  
  fs.writeFileSync(filePath, content);
  console.log(`Patched ${file}`);
}
