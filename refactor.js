const fs = require('fs');

function refactorFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Find all private fields/methods
  const regex = /private (?:readonly )?([a-zA-Z0-9_]+)/g;
  let match;
  const fields = new Set();
  
  while ((match = regex.exec(content)) !== null) {
    fields.add(match[1]);
  }
  
  // Replace declarations
  content = content.replace(/private readonly ([a-zA-Z0-9_]+)/g, 'readonly #$1');
  content = content.replace(/private ([a-zA-Z0-9_]+)/g, '#$1');
  
  // Replace references (this.field)
  for (const field of fields) {
    const refRegex = new RegExp(`this\\.${field}\\b`, 'g');
    content = content.replace(refRegex, `this.#${field}`);
  }
  
  fs.writeFileSync(path, content, 'utf8');
  console.log(`Refactored ${path}`);
}

refactorFile('c:/John/Code/Astrolabe/src/renderer/renderers/VellumNavigationChartRenderer.ts');
refactorFile('c:/John/Code/Astrolabe/src/renderer/renderers/SpaceNavigationChartRenderer.ts');
