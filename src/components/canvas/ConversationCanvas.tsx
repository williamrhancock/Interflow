import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useConversationStore } from '../../store/conversationStore';
import ChatNode from './ChatNode';
import { ConversationNode } from '../../types/conversation';

const nodeTypes = {
  chatNode: ChatNode,
};

interface ConversationCanvasProps {
  onSpawnChild: (nodeId: string, selectedSectionIndex?: number) => void;
}

function ConversationCanvasInner({ onSpawnChild }: ConversationCanvasProps) {
  const { tree, loadFromStorage } = useConversationStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, getNode } = useReactFlow();

  const handleFocusNode = useCallback((nodeId: string) => {
    const node = getNode(nodeId);
    if (node) {
      fitView({
        nodes: [{ id: nodeId }],
        duration: 500,
        padding: 0.2,
      });
    }
  }, [fitView, getNode]);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert conversation tree to React Flow nodes and edges
  useEffect(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    tree.nodes.forEach((node) => {
      // Create a new position object to ensure React Flow detects the change
      const nodePosition = { x: node.position.x, y: node.position.y };
      flowNodes.push({
        id: node.id,
        type: 'chatNode',
        position: nodePosition,
        data: {
          ...node,
          onSpawnChild,
          onFocusChild: handleFocusNode,
        },
      });

      // Create edge from parent to this node
      if (node.parentId) {
        const hasSelectedSection = node.selectedSectionIndexFromParent !== undefined;
        const sectionNumber = hasSelectedSection ? node.selectedSectionIndexFromParent! + 1 : undefined;
        flowEdges.push({
          id: `e${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: hasSelectedSection ? '#3b82f6' : '#94a3b8',
            strokeWidth: hasSelectedSection ? 3 : 2,
          },
          label: hasSelectedSection && sectionNumber !== undefined 
            ? `📌 Section ${sectionNumber}` 
            : undefined,
          labelStyle: {
            fill: '#3b82f6',
            fontWeight: 600,
            fontSize: '12px',
          },
          labelBgStyle: {
            fill: '#ffffff',
            fillOpacity: 0.9,
            stroke: '#3b82f6',
            strokeWidth: 1,
          },
        });
      }
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [tree, setNodes, setEdges, onSpawnChild, handleFocusNode]);

  // Listen for auto-layout events and fit view
  useEffect(() => {
    const handleAutoLayout = () => {
      setTimeout(() => {
        fitView({ duration: 400, padding: 0.15 });
      }, 200);
    };

    window.addEventListener('autoLayoutApplied', handleAutoLayout);
    return () => {
      window.removeEventListener('autoLayoutApplied', handleAutoLayout);
    };
  }, [fitView]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent) => {
      // Check if user is trying to select text
      const target = event.target as HTMLElement;
      const selectableArea = target.closest('[data-selectable="true"]');
      
      if (selectableArea) {
        // User clicked in selectable area - prevent drag
        event.preventDefault();
        return false;
      }
      
      // Check if there's an active text selection
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        // User has selected text, don't drag
        return false;
      }
    },
    []
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const conversationNode = tree.nodes.get(node.id);
      if (conversationNode) {
        useConversationStore.getState().updateNode(node.id, {
          position: node.position,
        });
      }
    },
    [tree]
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50 dark:bg-gray-900"
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as ConversationNode;
            return data.parentId ? '#3b82f6' : '#10b981';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

export default function ConversationCanvas({ onSpawnChild }: ConversationCanvasProps) {
  return (
    <ReactFlowProvider>
      <ConversationCanvasInner onSpawnChild={onSpawnChild} />
    </ReactFlowProvider>
  );
}

