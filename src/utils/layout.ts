import { ConversationTree } from '../types/conversation';

const NODE_WIDTH = 400; // Approximate width of a node (max-w-[400px])
const HORIZONTAL_SPACING = 500; // Space between nodes horizontally (must be > NODE_WIDTH to prevent overlap)
const VERTICAL_SPACING = 350; // Space between nodes vertically (increased for better visibility)

export function calculateAutoLayout(tree: ConversationTree): Map<string, { x: number; y: number }> {
  if (tree.nodes.size === 0) {
    return new Map();
  }

  // Use simple hierarchical layout as primary method - more reliable for tree structures
  return calculateSimpleLayout(tree);
  
  // Dagre can be used as alternative, but simple layout works better for conversation trees
  // Uncomment below to try dagre first:
  /*
  try {
    // Create dagre graph
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: 'TB', // Top to bottom
      nodesep: HORIZONTAL_SPACING, // Horizontal spacing between nodes
      ranksep: VERTICAL_SPACING, // Vertical spacing between ranks
      marginx: 100,
      marginy: 100,
      align: 'UL', // Align nodes to upper left
    });

    // Add nodes to graph with proper dimensions
    tree.nodes.forEach((node) => {
      g.setNode(node.id, {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        label: node.id, // dagre needs a label
      });
    });

    // Add edges to graph (parent -> child)
    tree.nodes.forEach((node) => {
      if (node.parentId) {
        g.setEdge(node.parentId, node.id);
      }
    });

    // Calculate layout
    dagre.layout(g);

    // Extract positions - dagre gives center positions
    g.nodes().forEach((nodeId) => {
      const dagreNode = g.node(nodeId);
      if (dagreNode && dagreNode.x !== undefined && dagreNode.y !== undefined) {
        // dagre gives center coordinates, React Flow expects top-left
        positions.set(nodeId, {
          x: dagreNode.x - NODE_WIDTH / 2,
          y: dagreNode.y - NODE_HEIGHT / 2,
        });
      }
    });

    // Only use dagre if it worked for all nodes
    if (positions.size === tree.nodes.size) {
      return positions;
    }
  } catch (error) {
    console.warn('Dagre layout failed, using simple layout:', error);
  }
  
  // Fallback to simple layout
  return calculateSimpleLayout(tree);
  */
}

// Simple hierarchical layout - groups nodes by depth and positions them level by level
function calculateSimpleLayout(tree: ConversationTree): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  if (tree.nodes.size === 0) {
    return positions;
  }
  
  // Group nodes by depth (distance from root)
  const nodesByDepth = new Map<number, string[]>();
  const depthMap = new Map<string, number>();
  
  // Calculate depth for each node (0 = root, 1 = first level children, etc.)
  const calculateDepth = (nodeId: string): number => {
    if (depthMap.has(nodeId)) {
      return depthMap.get(nodeId)!;
    }
    
    const node = tree.nodes.get(nodeId);
    if (!node) {
      depthMap.set(nodeId, 0);
      return 0;
    }
    
    if (!node.parentId) {
      // Root node
      depthMap.set(nodeId, 0);
      return 0;
    }
    
    // Recursively calculate parent depth
    const depth = calculateDepth(node.parentId) + 1;
    depthMap.set(nodeId, depth);
    return depth;
  };
  
  // Group all nodes by their depth
  tree.nodes.forEach((node) => {
    const depth = calculateDepth(node.id);
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth)!.push(node.id);
  });
  
  // Position nodes level by level
  // Strategy: Spread all nodes across the canvas horizontally, regardless of depth
  // This prevents clustering when there's only 1 node per depth
  const sortedDepths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
  const startY = 100;
  
  // Start further right to give more space
  const startX = 300;
  
  sortedDepths.forEach((depth) => {
    const nodesAtDepth = nodesByDepth.get(depth)!;
    const levelY = startY + depth * VERTICAL_SPACING;
    
    // Space nodes horizontally at this level
    // Stagger each depth level horizontally to create a diagonal tree pattern
    nodesAtDepth.forEach((nodeId, index) => {
      // Horizontal offset based on depth creates diagonal pattern
      // Each level is offset by at least NODE_WIDTH to prevent overlap
      const horizontalOffset = depth * (NODE_WIDTH + 100); // 500px per depth level
      // Position nodes with proper spacing (NODE_WIDTH + HORIZONTAL_SPACING ensures no overlap)
      positions.set(nodeId, {
        x: startX + index * (NODE_WIDTH + HORIZONTAL_SPACING) + horizontalOffset,
        y: levelY,
      });
    });
  });
  
  // Debug logging - show ALL positions
  const allPositions = Array.from(positions.entries()).map(([id, pos]) => ({
    id: id.slice(0, 8),
    x: Math.round(pos.x),
    y: Math.round(pos.y)
  }));
  console.log('Layout calculated:', {
    totalNodes: tree.nodes.size,
    positionsCalculated: positions.size,
    depths: sortedDepths,
    nodesPerDepth: sortedDepths.map(d => ({ depth: d, count: nodesByDepth.get(d)?.length || 0 })),
    allPositions: allPositions
  });
  
  return positions;
}

