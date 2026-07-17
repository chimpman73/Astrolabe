const CustomShapeBuilder = require('./custom-shape-builder');

// A slender, vertical, solid classical Greek pillar.
// Total bounds: X span = 30 to 70 (width 40), Y span = 10 to 90 (height 80).
// Height is double the width, making it clearly vertical.
const pathD = "M 30 10 L 70 10 L 70 15 L 65 15 L 65 20 L 62 20 L 62 22 L 58 22 L 60 80 L 65 80 L 65 85 L 70 85 L 70 90 L 30 90 L 30 85 L 35 85 L 35 80 L 40 80 L 42 22 L 38 22 L 38 20 L 35 20 L 35 15 L 30 15 Z";

const points = [
  { "x": 30, "y": 10 },
  { "x": 70, "y": 10 },
  { "x": 35, "y": 20 },
  { "x": 65, "y": 20 },
  { "x": 42, "y": 22 },
  { "x": 50, "y": 22 },
  { "x": 58, "y": 22 },
  { "x": 40, "y": 80 },
  { "x": 50, "y": 80 },
  { "x": 60, "y": 80 },
  { "x": 35, "y": 80 },
  { "x": 65, "y": 80 },
  { "x": 30, "y": 90 },
  { "x": 70, "y": 90 }
];

const edges = [
  // Capital Top Slab
  { "p1": { "x": 30, "y": 10 }, "p2": { "x": 70, "y": 10 } },
  { "p1": { "x": 30, "y": 10 }, "p2": { "x": 35, "y": 20 } },
  { "p1": { "x": 70, "y": 10 }, "p2": { "x": 65, "y": 20 } },
  { "p1": { "x": 35, "y": 20 }, "p2": { "x": 65, "y": 20 } },

  // Capital to Shaft Connectors
  { "p1": { "x": 35, "y": 20 }, "p2": { "x": 42, "y": 22 } },
  { "p1": { "x": 65, "y": 20 }, "p2": { "x": 58, "y": 22 } },

  // Shaft Top
  { "p1": { "x": 42, "y": 22 }, "p2": { "x": 50, "y": 22 } },
  { "p1": { "x": 50, "y": 22 }, "p2": { "x": 58, "y": 22 } },

  // Vertical Shaft Lines (Left, Middle Flute, Right)
  { "p1": { "x": 42, "y": 22 }, "p2": { "x": 40, "y": 80 } },
  { "p1": { "x": 50, "y": 22 }, "p2": { "x": 50, "y": 80 } },
  { "p1": { "x": 58, "y": 22 }, "p2": { "x": 60, "y": 80 } },

  // Shaft Bottom
  { "p1": { "x": 40, "y": 80 }, "p2": { "x": 50, "y": 80 } },
  { "p1": { "x": 50, "y": 80 }, "p2": { "x": 60, "y": 80 } },

  // Shaft to Base Connectors
  { "p1": { "x": 40, "y": 80 }, "p2": { "x": 35, "y": 80 } },
  { "p1": { "x": 60, "y": 80 }, "p2": { "x": 65, "y": 80 } },

  // Base Upper Slab
  { "p1": { "x": 35, "y": 80 }, "p2": { "x": 65, "y": 80 } },
  { "p1": { "x": 35, "y": 80 }, "p2": { "x": 30, "y": 90 } },
  { "p1": { "x": 65, "y": 80 }, "p2": { "x": 70, "y": 90 } },

  // Base Bottom Slab
  { "p1": { "x": 30, "y": 90 }, "p2": { "x": 70, "y": 90 } }
];

// Execute the codified shape generation
CustomShapeBuilder.build('pillar', { pathD, points, edges });
