import { useState, useMemo } from 'react';
import { X, Download, FileText, Image, File } from 'lucide-react';
import { useConversationStore } from '../../store/conversationStore';
import { ConversationNode } from '../../types/conversation';
import { parseAnswerIntoSections } from '../../utils/answerParser';

interface SummaryViewProps {
  onClose: () => void;
}

interface ConversationChain {
  nodes: ConversationNode[];
  rootNode: ConversationNode;
}

export default function SummaryView({ onClose }: SummaryViewProps) {
  const { tree } = useConversationStore();
  const [exportFormat, setExportFormat] = useState<'text' | 'pdf' | 'png'>('text');

  // Organize conversations into chains
  const chains = useMemo(() => {
    const chains: ConversationChain[] = [];
    const processed = new Set<string>();

    // Start from root nodes
    tree.rootIds.forEach((rootId) => {
      const rootNode = tree.nodes.get(rootId);
      if (!rootNode) return;

      const chain: ConversationNode[] = [];
      const traverse = (nodeId: string) => {
        if (processed.has(nodeId)) return;
        processed.add(nodeId);

        const node = tree.nodes.get(nodeId);
        if (!node) return;

        chain.push(node);

        // Traverse children
        node.childrenIds.forEach((childId) => {
          traverse(childId);
        });
      };

      traverse(rootId);
      if (chain.length > 0) {
        chains.push({ nodes: chain, rootNode });
      }
    });

    return chains;
  }, [tree]);

  const generateTextSummary = (): string => {
    let summary = '# Conversation Summary\n\n';
    summary += `Generated: ${new Date().toLocaleString()}\n\n`;
    summary += `Total Conversations: ${chains.length}\n`;
    summary += `Total Nodes: ${tree.nodes.size}\n\n`;
    summary += '---\n\n';

    chains.forEach((chain, chainIndex) => {
      summary += `## Conversation Chain ${chainIndex + 1}\n\n`;
      summary += `**Root Question:** ${chain.rootNode.question}\n\n`;

      chain.nodes.forEach((node, nodeIndex) => {
        if (nodeIndex === 0) {
          summary += `### ${node.name || `Question ${nodeIndex + 1}`}: ${node.question}\n`;
          summary += `**A:** ${node.answer}\n\n`;
        } else {
          summary += `#### ${node.name || `Follow-up ${nodeIndex}`}\n`;
          summary += `**Q:** ${node.question}\n`;
          if (node.selectedSectionIndexFromParent !== undefined && node.parentId) {
            // Get parent node to find the actual section text
            const parentNode = tree.nodes.get(node.parentId);
            if (parentNode) {
              let sections = parentNode.answerSections;
              if (!sections || sections.length === 0) {
                sections = parseAnswerIntoSections(parentNode.answer);
              }
              const selectedSection = sections[node.selectedSectionIndexFromParent];
              if (selectedSection) {
                const sectionPreview = selectedSection.text.substring(0, 150);
                summary += `*Context from parent: "${sectionPreview}${selectedSection.text.length > 150 ? '...' : ''}"*\n`;
              } else {
                summary += `*Context: Selected section ${node.selectedSectionIndexFromParent + 1} from parent*\n`;
              }
            }
          }
          summary += `**A:** ${node.answer}\n\n`;
        }
      });

      summary += '---\n\n';
    });

    return summary;
  };

  const handleExport = () => {
    const text = generateTextSummary();

    if (exportFormat === 'text') {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inferflow-summary-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (exportFormat === 'pdf') {
      // For PDF, we'll use a simple approach with window.print
      // In a production app, you'd use a library like jsPDF or pdfkit
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>InferFlow Summary</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                pre { white-space: pre-wrap; }
              </style>
            </head>
            <body>
              <pre>${text}</pre>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } else if (exportFormat === 'png') {
      // For PNG, we'd need to use html2canvas or similar
      alert('PNG export requires additional libraries. Please use Text or PDF export for now.');
    }
  };

  if (tree.nodes.size === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              No Conversations
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              There are no conversations to summarize. Start asking questions to build your conversation tree.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Conversation Summary
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Export Options */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Export as:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setExportFormat('text')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                exportFormat === 'text'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Text
            </button>
            <button
              onClick={() => setExportFormat('pdf')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                exportFormat === 'pdf'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <File className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => setExportFormat('png')}
              className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                exportFormat === 'png'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Image className="w-4 h-4" />
              PNG
            </button>
          </div>
          <button
            onClick={handleExport}
            className="ml-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            <strong>{chains.length}</strong> conversation chain{chains.length !== 1 ? 's' : ''} •{' '}
            <strong>{tree.nodes.size}</strong> total node{tree.nodes.size !== 1 ? 's' : ''}
          </div>

          <div className="space-y-6">
            {chains.map((chain, chainIndex) => (
              <div
                key={chain.rootNode.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Chain {chainIndex + 1}: {chain.rootNode.name} - {chain.rootNode.question.substring(0, 50)}
                  {chain.rootNode.question.length > 50 ? '...' : ''}
                </h3>

                <div className="space-y-4">
                  {chain.nodes.map((node) => (
                    <div
                      key={node.id}
                      className="pl-4 border-l-2 border-blue-200 dark:border-blue-800"
                    >
                      <div className="mb-2">
                        <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                          {node.name || `Node ${node.id.slice(0, 8)}`}
                        </div>
                        {node.selectedSectionIndexFromParent !== undefined && node.parentId && (
                          <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                            <div className="font-semibold mb-1">📌 Context from parent:</div>
                            {(() => {
                              const parentNode = tree.nodes.get(node.parentId!);
                              if (parentNode) {
                                let sections = parentNode.answerSections;
                                if (!sections || sections.length === 0) {
                                  sections = parseAnswerIntoSections(parentNode.answer);
                                }
                                const selectedSection = sections[node.selectedSectionIndexFromParent];
                                if (selectedSection) {
                                  const preview = selectedSection.text.substring(0, 200);
                                  return (
                                    <div className="italic text-blue-700 dark:text-blue-300">
                                      "{preview}{selectedSection.text.length > 200 ? '...' : ''}"
                                    </div>
                                  );
                                }
                              }
                              return <div>Section {node.selectedSectionIndexFromParent + 1}</div>;
                            })()}
                          </div>
                        )}
                        <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          Q: {node.question}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          A: {node.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

