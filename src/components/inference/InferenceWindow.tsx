import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { useConversationStore } from '../../store/conversationStore';
import { useConfigStore } from '../../store/configStore';
import { llmService } from '../../services/llm/LLMService';
import { buildContext, buildPrompt } from '../../utils/contextBuilder';
import { parseAnswerIntoSections } from '../../utils/answerParser';

interface InferenceWindowProps {
  parentNodeId: string | null;
  selectedSectionIndex?: number;
  onComplete: () => void;
}

export default function InferenceWindow({ parentNodeId, selectedSectionIndex, onComplete }: InferenceWindowProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addNode, getNode, getNodeChain, generateNodeName } = useConversationStore();
  const { llmConfig } = useConfigStore();

  useEffect(() => {
    // Auto-focus on mount
    textareaRef.current?.focus();
  }, [parentNodeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading || !llmConfig) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get parent node and build context
      const parentNode = parentNodeId ? getNode(parentNodeId) ?? null : null;
      const chain = parentNodeId ? getNodeChain(parentNodeId) : [];
      // Build context from the full chain, using selected section if available
      const context = buildContext(parentNode, chain, selectedSectionIndex);
      const prompt = buildPrompt(question, context);
      
      // Debug logging (can be removed in production)
      if (selectedSectionIndex !== undefined) {
        console.log('Using selected section index:', selectedSectionIndex);
        console.log('Context:', context);
      }

      // Generate answer
      const response = await llmService.generate(prompt, llmConfig);

      // Parse answer into sections
      const answerSections = parseAnswerIntoSections(response.content);

      // Create new node
      const newNodeId = `node-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const nodeName = generateNodeName(parentNodeId);
      const newNode = {
        id: newNodeId,
        name: nodeName,
        question: question.trim(),
        answer: response.content,
        answerSections,
        parentId: parentNodeId,
        childrenIds: [],
        context: context ? [context] : [],
        timestamp: Date.now(),
        position: parentNode
          ? {
              x: parentNode.position.x + 50,
              y: parentNode.position.y + 200,
            }
          : { x: 100, y: 100 },
        isCollapsed: false,
        selectedSectionIndexFromParent: selectedSectionIndex,
      };

      addNode(newNode);
      setQuestion('');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate response');
      console.error('Error generating response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  };

  if (!llmConfig) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-yellow-800 dark:text-yellow-200">
            Please set your OpenAI API key in the environment variable{' '}
            <code className="bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded">
              VITE_OPENAI_API_KEY
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-10">
      <div className="max-w-4xl mx-auto p-4">
        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                parentNodeId
                  ? 'Ask a follow-up question...'
                  : 'Ask a question to start a conversation...'
              }
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isLoading}
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Press Cmd/Ctrl + Enter to submit
            </div>
          </div>
          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Thinking...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

