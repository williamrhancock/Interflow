import { useState, useEffect, useCallback } from 'react';
import ConversationCanvas from './components/canvas/ConversationCanvas';
import InferenceWindow from './components/inference/InferenceWindow';
import SummaryView from './components/summary/SummaryView';
import SessionManager from './components/session/SessionManager';
import { useConfigStore } from './store/configStore';
import { useConversationStore } from './store/conversationStore';

function App() {
  const [parentNodeId, setParentNodeId] = useState<string | null>(null);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | undefined>(undefined);
  const [key, setKey] = useState(0); // Force re-render when parent changes
  const [showSummary, setShowSummary] = useState(false);
  const [showSessionManager, setShowSessionManager] = useState(false);
  const { theme, setTheme, loadFromStorage } = useConfigStore();
  const { clearAll, loadFromStorage: loadConversations, applyAutoLayout } = useConversationStore();

  useEffect(() => {
    // Load config from storage on mount
    loadFromStorage();
    // Load conversations from storage
    loadConversations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Apply theme when it changes
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleSpawnChild = useCallback((nodeId: string, selectedSectionIndex?: number) => {
    setParentNodeId(nodeId);
    setSelectedSectionIndex(selectedSectionIndex);
    setKey((k) => k + 1); // Force inference window to reset
  }, []);

  const handleNewQuestion = () => {
    setParentNodeId(null);
    setSelectedSectionIndex(undefined);
    setKey((k) => k + 1);
  };

  const handleComplete = () => {
    // Reset to allow new questions
    setParentNodeId(null);
    setSelectedSectionIndex(undefined);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear all conversations? This cannot be undone.')) {
      clearAll();
      setParentNodeId(null);
      setSelectedSectionIndex(undefined);
      setKey((k) => k + 1);
    }
  };

  const handleAutoLayout = () => {
    applyAutoLayout();
    // Force re-render to update canvas with new positions
    setKey((k) => k + 1);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-20">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          InferFlow
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowSessionManager(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            💾 Sessions
          </button>
          <button
            onClick={handleAutoLayout}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-medium"
            title="Automatically organize nodes in a tree layout"
          >
            📐 Auto Layout
          </button>
          <button
            onClick={() => setShowSummary(true)}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            📊 Summary
          </button>
          <button
            onClick={handleNewQuestion}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            New Question
          </button>
          <button
            onClick={handleClearCanvas}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Clear Canvas
          </button>
          <button
            onClick={toggleTheme}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors text-sm font-medium"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 relative" style={{ paddingBottom: '200px' }}>
        <ConversationCanvas onSpawnChild={handleSpawnChild} />
      </div>

      {/* Inference Window */}
      <InferenceWindow key={key} parentNodeId={parentNodeId} selectedSectionIndex={selectedSectionIndex} onComplete={handleComplete} />

          {/* Summary Modal */}
          {showSummary && (
            <SummaryView onClose={() => setShowSummary(false)} />
          )}

          {/* Session Manager Modal */}
          {showSessionManager && (
            <SessionManager onClose={() => setShowSessionManager(false)} />
          )}
        </div>
      );
    }

    export default App;

