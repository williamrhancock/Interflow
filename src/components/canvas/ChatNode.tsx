import { memo, useState, useEffect, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Plus, ChevronDown, ChevronRight, ArrowRight, Trash2 } from 'lucide-react';
import { ConversationNode } from '../../types/conversation';
import { useConversationStore } from '../../store/conversationStore';
import { parseAnswerIntoSections } from '../../utils/answerParser';

interface ChatNodeData extends ConversationNode {
  onSpawnChild: (nodeId: string, selectedSectionIndex?: number) => void;
  onFocusChild?: (nodeId: string) => void;
}

function ChatNodeComponent({ data, selected }: NodeProps<ChatNodeData>) {
  const { toggleCollapse, tree, deleteNode } = useConversationStore();
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
  const [sections, setSections] = useState(parseAnswerIntoSections(data.answer));

  // Update sections if answer changes
  useEffect(() => {
    if (data.answerSections) {
      setSections(data.answerSections);
    } else {
      setSections(parseAnswerIntoSections(data.answer));
    }
  }, [data.answer, data.answerSections]);

  // Find which sections have been used to spawn children and map to child IDs
  const sectionsWithChildren = useMemo(() => {
    const usedSections = new Set<number>();
    const sectionToChildMap = new Map<number, string[]>();
    
    data.childrenIds.forEach((childId) => {
      const childNode = tree.nodes.get(childId);
      if (childNode && childNode.selectedSectionIndexFromParent !== undefined) {
        const sectionIndex = childNode.selectedSectionIndexFromParent;
        usedSections.add(sectionIndex);
        
        // Map section index to child IDs
        if (!sectionToChildMap.has(sectionIndex)) {
          sectionToChildMap.set(sectionIndex, []);
        }
        sectionToChildMap.get(sectionIndex)!.push(childId);
      }
    });
    
    return { usedSections, sectionToChildMap };
  }, [data.childrenIds, tree]);

  const handleSpawn = () => {
    data.onSpawnChild(data.id, selectedSectionIndex !== null ? selectedSectionIndex : undefined);
    // Clear selection after spawning
    setSelectedSectionIndex(null);
  };

  const handleToggleCollapse = () => {
    toggleCollapse(data.id);
  };

  const handleSectionSelect = (index: number) => {
    setSelectedSectionIndex(index === selectedSectionIndex ? null : index);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${data.name}"? This will also delete all child conversations.`)) {
      deleteNode(data.id);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 ${
        selected ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'
      } min-w-[300px] max-w-[400px] transition-all`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleCollapse}
            className="flex items-center gap-1 px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={data.isCollapsed ? 'Expand node' : 'Collapse node'}
          >
            {data.isCollapsed ? (
              <>
                <ChevronRight className="w-4 h-4" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Expand</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Collapse</span>
              </>
            )}
          </button>
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
            {data.name || `Node ${data.id.slice(0, 8)}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {new Date(data.timestamp).toLocaleTimeString()}
          </div>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors text-red-600 dark:text-red-400"
            title="Delete node"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!data.isCollapsed && (
        <>
          {/* Question */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              QUESTION
            </div>
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {data.question}
            </div>
          </div>

          {/* Answer with Sections */}
          <div className="p-4">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
              <span>ANSWER</span>
              {selectedSectionIndex !== null && (
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Section {selectedSectionIndex + 1} selected
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              {sections.map((section, index) => {
                const isSelected = selectedSectionIndex === index;
                const hasChildren = sectionsWithChildren.usedSections.has(index);
                const isHighlighted = isSelected || hasChildren;
                const childIds = sectionsWithChildren.sectionToChildMap.get(index) || [];
                const firstChildId = childIds[0]; // Focus on first child if multiple
                
                const handleArrowClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (firstChildId && data.onFocusChild) {
                    data.onFocusChild(firstChildId);
                  }
                };
                
                return (
                  <div
                    key={section.id}
                    className={`flex gap-2 p-2 rounded border transition-colors relative ${
                      isHighlighted
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                    } ${hasChildren ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''}`}
                  >
                    <div className="flex items-start pt-0.5">
                      <input
                        type="radio"
                        name={`section-${data.id}`}
                        checked={isSelected}
                        onChange={() => handleSectionSelect(index)}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div
                      className="flex-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap cursor-pointer"
                      onClick={() => handleSectionSelect(index)}
                    >
                      {section.text}
                    </div>
                    {hasChildren && (
                      <button
                        onClick={handleArrowClick}
                        className="absolute -right-2 -top-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white dark:border-gray-800 transition-colors cursor-pointer z-10"
                        title={`Focus on child node (${childIds.length} child${childIds.length > 1 ? 'ren' : ''})`}
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedSectionIndex !== null && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs">
                <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Selected for context:
                </div>
                <div className="text-blue-700 dark:text-blue-300 italic">
                  "{sections[selectedSectionIndex]?.text.substring(0, 100)}
                  {sections[selectedSectionIndex]?.text.length && sections[selectedSectionIndex].text.length > 100 ? '...' : ''}"
                </div>
              </div>
            )}
          </div>

          {/* Spawn Button */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex justify-center">
            <button
              onClick={handleSpawn}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {selectedSectionIndex !== null
                ? 'Continue with Selected Section'
                : 'Continue Conversation (Full Answer)'}
            </button>
          </div>
        </>
      )}

      {/* Handles for connections */}
      {data.parentId && (
        <Handle type="target" position={Position.Top} className="w-3 h-3" />
      )}
      {data.childrenIds.length > 0 && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      )}
    </div>
  );
}

export default memo(ChatNodeComponent);
