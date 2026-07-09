const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const dir = 'C:/Users/chimp/.gemini/antigravity-ide/brain/ac08eaef-b2d6-40f0-b629-19bc4db84e96';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') && f.includes('_silhouette_'));

for (const file of files) {
  console.log('Processing', file);
  const fullPath = path.join(dir, file);
  cp.execSync(`cmd.exe /c npm run generate-shape "${fullPath}"`, {cwd: 'C:/John/Code/Astrolabe', stdio: 'inherit'});
}
