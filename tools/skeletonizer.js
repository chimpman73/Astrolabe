const Jimp = require('jimp');

function zhangSuenThinning(grid, width, height) {
    let changed = true;
    while (changed) {
        changed = false;
        let toClear = [];
        
        for (let pass = 0; pass < 2; pass++) {
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let p1 = grid[y * width + x];
                    if (p1 === 0) continue;
                    
                    let p2 = grid[(y-1) * width + x];
                    let p3 = grid[(y-1) * width + x + 1];
                    let p4 = grid[y * width + x + 1];
                    let p5 = grid[(y+1) * width + x + 1];
                    let p6 = grid[(y+1) * width + x];
                    let p7 = grid[(y+1) * width + x - 1];
                    let p8 = grid[y * width + x - 1];
                    let p9 = grid[(y-1) * width + x - 1];
                    
                    let A  = (p2 === 0 && p3 === 1) + (p3 === 0 && p4 === 1) + 
                             (p4 === 0 && p5 === 1) + (p5 === 0 && p6 === 1) + 
                             (p6 === 0 && p7 === 1) + (p7 === 0 && p8 === 1) +
                             (p8 === 0 && p9 === 1) + (p9 === 0 && p2 === 1);
                             
                    let B  = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
                    let m1 = pass === 0 ? (p2 * p4 * p6) : (p2 * p4 * p8);
                    let m2 = pass === 0 ? (p4 * p6 * p8) : (p2 * p6 * p8);
                    
                    if (A === 1 && B >= 2 && B <= 6 && m1 === 0 && m2 === 0) {
                        toClear.push(y * width + x);
                    }
                }
            }
            for (let i of toClear) {
                grid[i] = 0;
                changed = true;
            }
            toClear = [];
        }
    }
    return grid;
}

function extractGraph(grid, width, height) {
    const points = [];
    const indexMap = new Map();
    
    // First pass: collect all points
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y * width + x] === 1) {
                const idx = points.length;
                points.push({ x, y, edges: [] });
                indexMap.set(y * width + x, idx);
            }
        }
    }
    
    // Second pass: connect neighbors (8-way)
    const edges = [];
    const dirs = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
    for (const pt of points) {
        const u = indexMap.get(pt.y * width + pt.x);
        for (const [dx, dy] of dirs) {
            const nx = pt.x + dx;
            const ny = pt.y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (grid[ny * width + nx] === 1) {
                    const v = indexMap.get(ny * width + nx);
                    if (u < v) { // Only add one way
                        edges.push({ p1: u, p2: v });
                        points[u].edges.push(v);
                        points[v].edges.push(u);
                    }
                }
            }
        }
    }
    
    return { points, edges };
}

function decimateGraph(graph, targetNodes) {
    let { points, edges } = graph;
    if (!points || points.length === 0) {
        return { points: [], edges: [] };
    }
    
    // Ensure points have an edges Set
    let nodes = points.map((p, i) => ({ id: i, x: p.x, y: p.y, edges: new Set(p.edges || []) }));
    if (!points[0] || !points[0].edges) {
        for (let e of edges) {
            let u = points.indexOf(e.p1);
            let v = points.indexOf(e.p2);
            nodes[u].edges.add(v);
            nodes[v].edges.add(u);
        }
    }
    
    // Filter out isolated nodes
    let activeNodes = new Set(nodes.map(n => n.id));
    
    while (activeNodes.size > targetNodes) {
        // Find the shortest edge between two active nodes
        let minEdge = null;
        let minD2 = Infinity;
        
        for (let uId of activeNodes) {
            const u = nodes[uId];
            for (let vId of u.edges) {
                if (!activeNodes.has(vId)) continue;
                if (uId >= vId) continue;
                
                const v = nodes[vId];
                const d2 = (u.x - v.x)**2 + (u.y - v.y)**2;
                
                // Penalize collapsing endpoints (nodes with only 1 edge) to preserve shape
                // If one is an endpoint and the other isn't, prefer collapsing it.
                // Actually, let's heavily penalize endpoints so they don't get eaten.
                let penalty = 1;
                if (u.edges.size === 1 && v.edges.size === 1) penalty = 10;
                else if (u.edges.size === 1 || v.edges.size === 1) penalty = 5;
                // Penalize junctions (nodes with > 2 edges)
                if (u.edges.size > 2 || v.edges.size > 2) penalty *= 5;

                const score = d2 * penalty;

                if (score < minD2) {
                    minD2 = score;
                    minEdge = {u: uId, v: vId};
                }
            }
        }
        
        if (!minEdge) break; // Cannot collapse further
        
        // Collapse v into u
        const u = nodes[minEdge.u];
        const v = nodes[minEdge.v];
        
        // Merge position (average)
        // Wait, if we average, we drift off the line. Let's just keep u's position.
        // Actually, if we keep u's position, it's safer. Let's make the one with more edges survive to preserve junctions.
        let survivorId = u.edges.size >= v.edges.size ? minEdge.u : minEdge.v;
        let consumedId = u.edges.size >= v.edges.size ? minEdge.v : minEdge.u;
        
        const survivor = nodes[survivorId];
        const consumed = nodes[consumedId];
        
        // Transfer edges
        survivor.edges.delete(consumedId);
        consumed.edges.delete(survivorId);
        
        for (let neighborId of consumed.edges) {
            if (neighborId !== survivorId) {
                survivor.edges.add(neighborId);
                nodes[neighborId].edges.delete(consumedId);
                nodes[neighborId].edges.add(survivorId);
            }
        }
        
        activeNodes.delete(consumedId);
    }
    
    // Build final output graph
    // Re-index
    let finalPoints = [];
    let oldToNew = new Map();
    for (let id of activeNodes) {
        oldToNew.set(id, finalPoints.length);
        finalPoints.push({ x: nodes[id].x, y: nodes[id].y });
    }
    
    let finalEdges = [];
    let seenEdges = new Set();
    for (let id of activeNodes) {
        let u = oldToNew.get(id);
        for (let nId of nodes[id].edges) {
            if (activeNodes.has(nId)) {
                let v = oldToNew.get(nId);
                if (u < v) {
                    let hash = `${u}-${v}`;
                    if (!seenEdges.has(hash)) {
                        seenEdges.add(hash);
                        finalEdges.push({ p1: finalPoints[u], p2: finalPoints[v] });
                    }
                }
            }
        }
    }
    
    return { points: finalPoints, edges: finalEdges };
}

async function generateSkeletonData(jimpImg) {
    // 1. Scale down and pad to 100x100
    const scaled = jimpImg.clone().contain(100, 100);
    
    // 2. Build B&W grid
    const width = 100;
    const height = 100;
    const grid = new Uint8Array(width * height);
    
    // Auto-detect if background is light or dark by checking the four corners
    let darkCorners = 0;
    let lightCorners = 0;
    const corners = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1]
    ];
    for (const [cx, cy] of corners) {
      const hex = scaled.getPixelColor(cx, cy);
      const rgba = Jimp.intToRGBA(hex);
      if (rgba.a > 128) {
        if (rgba.r < 128 || rgba.g < 128 || rgba.b < 128) {
          darkCorners++;
        } else {
          lightCorners++;
        }
      }
    }
    
    // If corners are mostly dark, we assume a dark background (and thus light foreground)
    const isDarkBackground = darkCorners > lightCorners;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const hex = scaled.getPixelColor(x, y);
            const rgba = Jimp.intToRGBA(hex);
            if (rgba.a > 128) {
                const isPixelDark = (rgba.r < 128 || rgba.g < 128 || rgba.b < 128);
                // If dark background, light pixels are foreground.
                // If light background, dark pixels are foreground.
                if (isDarkBackground ? !isPixelDark : isPixelDark) {
                    grid[y * width + x] = 1;
                }
            }
        }
    }
    
    // 3. Thinning
    zhangSuenThinning(grid, width, height);
    
    // 4. Graph Extraction
    const baseGraph = extractGraph(grid, width, height);
    
    // 5. Generate Multi-Resolution Solutions
    // We generate exactly 20 levels. Level 1 = 5 nodes, Level 2 = 10 nodes ... Level 20 = 100 nodes.
    const maxNodes = 100; 
    const solutions = {};
    
    // Always run through decimateGraph at least once to ensure edges are converted from integer indices to Point objects
    let currentGraph = decimateGraph(baseGraph, Math.min(baseGraph.points.length, maxNodes));
    
    for (let level = 20; level >= 1; level--) {
        let targetNodes = level * 5;
        if (currentGraph.points.length > targetNodes) {
            currentGraph = decimateGraph(currentGraph, targetNodes);
        }
        solutions[level] = currentGraph;
    }
    
    return solutions;
}

module.exports = { generateSkeletonData };
