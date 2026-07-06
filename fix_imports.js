const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/renderer');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(srcDir, function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Fix BaseRenderer imports
    content = content.replace(/import\s*\{\s*BaseRenderer\s*,\s*RenderContext\s*\}\s*from\s*'(\.\/BaseRenderer)';/g, "import { BaseRenderer } from '$1';\nimport { RenderContext } from '../../types/renderer';");
    content = content.replace(/import\s*\{\s*RenderContext\s*,\s*BaseRenderer\s*\}\s*from\s*'(\.\/BaseRenderer)';/g, "import { BaseRenderer } from '$1';\nimport { RenderContext } from '../../types/renderer';");
    
    // Fix MapStyleContext in SpaceStyle and VellumStyle
    if (filePath.includes('SpaceStyle.ts') || filePath.includes('VellumStyle.ts') || filePath.includes('NavChartCanvas.tsx')) {
      content = content.replace(/import\s*\{[^}]*MapStyleContext[^}]*\}\s*from\s*'(.*?)MapStyle';/g, (match, prefix) => {
        return match.replace('MapStyleContext,', '').replace(', MapStyleContext', '').replace('MapStyleContext', '') + `\nimport { MapStyleContext } from '${prefix}../types/renderer';`;
      });
      // Clean up empty imports like import { } from '../styles/MapStyle';
      content = content.replace(/import\s*\{\s*\}\s*from\s*'.*?MapStyle';\n/g, '');
    }

    // Add ParchmentDecoration import to VellumStyle if missing
    if (filePath.includes('VellumStyle.ts') && !content.includes('ParchmentDecoration')) {
      content = content.replace(/import\s*\{\s*MapStyle\s*\}\s*from\s*'\.\/MapStyle';/g, "import { MapStyle } from './MapStyle';\nimport { ParchmentDecoration } from '../../types/renderer';");
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
