const fs = require('fs');
const content = fs.readFileSync('e:/cyvrix-main/prisma/schema.prisma', 'utf8');

const blocks = content.split('model ');
const missing = [];
const missingRLS = [];

for (let i = 1; i < blocks.length; i++) {
  let modelStr = blocks[i];
  let lines = modelStr.split('\n');
  let name = lines[0].split(' ')[0].trim();
  
  if (!modelStr.includes('@@schema("public")')) continue;

  // Check RLS
  // The comment would be in the previous block's end.
  let prevBlock = blocks[i - 1];
  let hasRLS = prevBlock.includes('row level security');
  if (!hasRLS) {
    missingRLS.push(name);
  }

  let relationFields = [];
  for (let line of lines) {
    line = line.trim();
    if (line.includes('@relation') && !line.startsWith('//')) {
      let match = line.match(/fields:\s*\[(.*?)\]/);
      if (match) {
        let fields = match[1].split(',').map(f => f.trim());
        relationFields.push(...fields);
      }
    }
  }

  for (let f of relationFields) {
    // If the model string does not have @@index([f])
    // or @@index([f, ...])
    let indexPattern = new RegExp(`@@index\\(\\[.*?${f}.*?\\]\\)`);
    if (!indexPattern.test(modelStr)) {
      missing.push({ model: name, field: f });
    }
  }
}

console.log('Missing Indexes:', missing);
console.log('Missing RLS:', missingRLS);
