const fs = require('fs');
const path = require('path');

/**
 * CustomShapeBuilder
 * Programmatically generates normalized 100x100 SVG shapes and matching skeleton JSON sidecars.
 * This formalizes the process of building high-quality vector shapes and constellation skeleton files.
 */
class CustomShapeBuilder {
  /**
   * Builds and saves shape files (.svg and _skeleton.json) to the assets directory.
   * @param {string} shapeName The name of the shape (e.g. 'pillar')
   * @param {object} config Configuration containing pathD, points, and edges
   */
  static build(shapeName, { pathD, points, edges }) {
    const cleanName = shapeName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const assetsDir = path.join(__dirname, '..', 'assets', 'shapes');

    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    // 1. Generate SVG XML content
    const svgContent = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <!-- Programmatic Shape: ${cleanName} -->
  <path d="${pathD}" fill="white" />
</svg>`;

    // 2. Generate multi-resolution skeleton LODs (levels 1 to 18)
    const skeleton = {};
    for (let lod = 1; lod <= 18; lod++) {
      skeleton[lod] = {
        points: points,
        edges: edges
      };
    }

    // 3. Write files to shapes folder
    const svgPath = path.join(assetsDir, `${cleanName}.svg`);
    const jsonPath = path.join(assetsDir, `${cleanName}_skeleton.json`);

    fs.writeFileSync(svgPath, svgContent, 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(skeleton, null, 2), 'utf8');

    console.log(`\n✅ Programmatic Shape Built Successfully!`);
    console.log(`   - SVG Shape: ${svgPath}`);
    console.log(`   - Skeleton JSON: ${jsonPath}`);
    console.log(`You can now select "${cleanName}" in Astrolabe editors!`);
  }
}

// Support executing directly via Node CLI: node tools/custom-shape-builder.js
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("CustomShapeBuilder: No direct args provided. Module loaded successfully.");
    process.exit(0);
  }
}

module.exports = CustomShapeBuilder;
