import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Edit2, Save, Loader2, Download, Upload } from 'lucide-react';
import { useConversationStore, Session } from '../../store/conversationStore';

interface SessionManagerProps {
  onClose: () => void;
}

export default function SessionManager({ onClose }: SessionManagerProps) {
  const {
    sessions,
    currentSessionId,
    saveCurrentSession,
    loadSession,
    createNewSession,
    deleteSession,
    getSessionList,
    renameSession,
    exportSession,
    importSession,
  } = useConversationStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessionList, setSessionList] = useState<Session[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSessionList(getSessionList());
  }, [sessions, getSessionList]);

  const handleSaveCurrent = async () => {
    setIsSaving(true);
    const name = prompt('Enter a name for this session:', '');
    if (name) {
      saveCurrentSession(name.trim() || undefined);
    }
    setIsSaving(false);
    setSessionList(getSessionList());
  };

  const handleCreateNew = () => {
    createNewSession();
    setSessionList(getSessionList());
  };

  const handleLoad = (sessionId: string) => {
    loadSession(sessionId);
    onClose();
  };

  const handleDelete = (sessionId: string, sessionName: string) => {
    if (window.confirm(`Are you sure you want to delete "${sessionName}"? This cannot be undone.`)) {
      deleteSession(sessionId);
      setSessionList(getSessionList());
    }
  };

  const handleStartEdit = (session: Session) => {
    setEditingId(session.id);
    setEditName(session.name);
  };

  const handleSaveEdit = (sessionId: string) => {
    if (editName.trim()) {
      renameSession(sessionId, editName.trim());
      setEditingId(null);
      setEditName('');
      setSessionList(getSessionList());
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleExport = (sessionId: string, sessionName: string) => {
    try {
      const sessionData = exportSession(sessionId);
      const blob = new Blob([sessionData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sessionName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Failed to export session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const sessionId = importSession(content);
        if (sessionId) {
          setSessionList(getSessionList());
          alert('Session imported successfully!');
        }
      } catch (error) {
        alert(`Failed to import session: ${error instanceof Error ? error.message : 'Invalid file format'}`);
      }
    };
    reader.onerror = () => {
      alert('Failed to read file');
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Session Manager
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={handleSaveCurrent}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Current Session
                </>
              )}
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
            <button
              onClick={handleImport}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Import Session
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            {sessionList.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No saved sessions. Create a new session to get started.
              </div>
            ) : (
              sessionList.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border rounded-lg transition-colors ${
                    session.id === currentSessionId
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingId === session.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(session.id);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSaveEdit(session.id)}
                            className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {session.name}
                            {session.id === currentSessionId && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                                (Current)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {session.tree.nodes.size} node{session.tree.nodes.size !== 1 ? 's' : ''} •{' '}
                            Updated {new Date(session.updatedAt).toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {editingId !== session.id && (
                        <>
                          <button
                            onClick={() => handleLoad(session.id)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleExport(session.id, session.name)}
                            className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded"
                            title="Export session to file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(session)}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Rename session"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(session.id, session.name)}
                            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                            title="Delete session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

