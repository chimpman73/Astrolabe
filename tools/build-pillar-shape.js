const CustomShapeBuilder = require('./custom-shape-builder');

const pathD = "M 20 10 L 80 10 L 80 15 L 75 15 L 75 20 L 72 20 L 72 22 L 68 22 L 70 80 L 75 80 L 75 85 L 80 85 L 80 90 L 20 90 L 20 85 L 25 85 L 25 80 L 30 80 L 32 22 L 28 22 L 28 20 L 25 20 L 25 15 L 20 15 Z";

const points = [
  { "x": 20, "y": 10 },
  { "x": 80, "y": 10 },
  { "x": 25, "y": 20 },
  { "x": 75, "y": 20 },
  { "x": 32, "y": 22 },
  { "x": 50, "y": 22 },
  { "x": 68, "y": 22 },
  { "x": 30, "y": 80 },
  { "x": 50, "y": 80 },
  { "x": 70, "y": 80 },
  { "x": 25, "y": 80 },
  { "x": 75, "y": 80 },
  { "x": 20, "y": 90 },
  { "x": 80, "y": 90 }
];

const edges = [
  // Capital Top Slab
  { "p1": { "x": 20, "y": 10 }, "p2": { "x": 80, "y": 10 } },
  { "p1": { "x": 20, "y": 10 }, "p2": { "x": 25, "y": 20 } },
  { "p1": { "x": 80, "y": 10 }, "p2": { "x": 75, "y": 20 } },
  { "p1": { "x": 25, "y": 20 }, "p2": { "x": 75, "y": 20 } },

  // Capital to Shaft Connectors
  { "p1": { "x": 25, "y": 20 }, "p2": { "x": 32, "y": 22 } },
  { "p1": { "x": 75, "y": 20 }, "p2": { "x": 68, "y": 22 } },

  // Shaft Top
  { "p1": { "x": 32, "y": 22 }, "p2": { "x": 50, "y": 22 } },
  { "p1": { "x": 50, "y": 22 }, "p2": { "x": 68, "y": 22 } },

  // Vertical Shaft Lines (Left, Middle Flute, Right)
  { "p1": { "x": 32, "y": 22 }, "p2": { "x": 30, "y": 80 } },
  { "p1": { "x": 50, "y": 22 }, "p2": { "x": 50, "y": 80 } },
  { "p1": { "x": 68, "y": 22 }, "p2": { "x": 70, "y": 80 } },

  // Shaft Bottom
  { "p1": { "x": 30, "y": 80 }, "p2": { "x": 50, "y": 80 } },
  { "p1": { "x": 50, "y": 80 }, "p2": { "x": 70, "y": 80 } },

  // Shaft to Base Connectors
  { "p1": { "x": 30, "y": 80 }, "p2": { "x": 25, "y": 80 } },
  { "p1": { "x": 70, "y": 80 }, "p2": { "x": 75, "y": 80 } },

  // Base Upper Slab
  { "p1": { "x": 25, "y": 80 }, "p2": { "x": 75, "y": 80 } },
  { "p1": { "x": 25, "y": 80 }, "p2": { "x": 20, "y": 90 } },
  { "p1": { "x": 75, "y": 80 }, "p2": { "x": 80, "y": 90 } },

  // Base Bottom Slab
  { "p1": { "x": 20, "y": 90 }, "p2": { "x": 80, "y": 90 } }
];

// Execute the codified shape generation
CustomShapeBuilder.build('pillar', { pathD, points, edges });
