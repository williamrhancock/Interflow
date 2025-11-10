import { create } from 'zustand';
import { ConversationNode, ConversationTree } from '../types/conversation';
import { calculateAutoLayout } from '../utils/layout';

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tree: ConversationTree;
}

interface ConversationState {
  tree: ConversationTree;
  currentSessionId: string | null;
  sessions: Map<string, Session>;
  addNode: (node: ConversationNode) => void;
  updateNode: (id: string, updates: Partial<ConversationNode>) => void;
  deleteNode: (id: string) => void;
  getNode: (id: string) => ConversationNode | undefined;
  getNodeChain: (nodeId: string) => ConversationNode[];
  toggleCollapse: (id: string) => void;
  clearAll: () => void;
  generateNodeName: (parentId: string | null) => string;
  // Session management
  saveCurrentSession: (name?: string) => string;
  loadSession: (sessionId: string) => void;
  createNewSession: () => string;
  deleteSession: (sessionId: string) => void;
  getSessionList: () => Session[];
  renameSession: (sessionId: string, newName: string) => void;
  exportSession: (sessionId: string) => string;
  importSession: (sessionData: string) => string | null;
  applyAutoLayout: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const STORAGE_KEY = 'inferflow_conversations';
const SESSIONS_KEY = 'inferflow_sessions';
const CURRENT_SESSION_KEY = 'inferflow_current_session';

const initialTree: ConversationTree = {
  nodes: new Map(),
  rootIds: [],
};

export const useConversationStore = create<ConversationState>((set, get) => ({
  tree: initialTree,
  currentSessionId: null,
  sessions: new Map(),

  addNode: (node) => {
    set((state) => {
      const newNodes = new Map(state.tree.nodes);
      newNodes.set(node.id, node);

      // Update parent's childrenIds
      if (node.parentId) {
        const parent = newNodes.get(node.parentId);
        if (parent) {
          const updatedParent = {
            ...parent,
            childrenIds: [...parent.childrenIds, node.id],
          };
          newNodes.set(node.parentId, updatedParent);
        }
      } else {
        // Root node
        return {
          tree: {
            nodes: newNodes,
            rootIds: [...state.tree.rootIds, node.id],
          },
        };
      }

      return {
        tree: {
          nodes: newNodes,
          rootIds: state.tree.rootIds,
        },
      };
    });
    get().saveToStorage();
  },

  updateNode: (id, updates) => {
    set((state) => {
      const node = state.tree.nodes.get(id);
      if (!node) return state;

      const newNodes = new Map(state.tree.nodes);
      newNodes.set(id, { ...node, ...updates });

      return {
        tree: {
          ...state.tree,
          nodes: newNodes,
        },
      };
    });
    get().saveToStorage();
  },

  deleteNode: (id) => {
    set((state) => {
      const node = state.tree.nodes.get(id);
      if (!node) return state;

      const newNodes = new Map(state.tree.nodes);
      newNodes.delete(id);

      // Remove from parent's childrenIds
      if (node.parentId) {
        const parent = newNodes.get(node.parentId);
        if (parent) {
          const updatedParent = {
            ...parent,
            childrenIds: parent.childrenIds.filter((childId) => childId !== id),
          };
          newNodes.set(node.parentId, updatedParent);
        }
      }

      // Recursively delete children
      node.childrenIds.forEach((childId) => {
        get().deleteNode(childId);
      });

      return {
        tree: {
          nodes: newNodes,
          rootIds: state.tree.rootIds.filter((rootId) => rootId !== id),
        },
      };
    });
    get().saveToStorage();
  },

  getNode: (id) => {
    return get().tree.nodes.get(id);
  },

  getNodeChain: (nodeId) => {
    const chain: ConversationNode[] = [];
    let currentNodeId: string | null = nodeId;

    while (currentNodeId) {
      const node = get().tree.nodes.get(currentNodeId);
      if (!node) break;
      chain.unshift(node);
      currentNodeId = node.parentId;
    }

    return chain;
  },

  toggleCollapse: (id) => {
    const node = get().tree.nodes.get(id);
    if (node) {
      get().updateNode(id, { isCollapsed: !node.isCollapsed });
    }
  },

  generateNodeName: (parentId) => {
    const state = get();
    if (parentId === null) {
      // Root node - count root nodes
      const rootCount = state.tree.rootIds.length + 1;
      return `Question ${rootCount}`;
    } else {
      // Child node - count siblings (children of same parent)
      const parent = state.tree.nodes.get(parentId);
      if (parent) {
        const siblingCount = parent.childrenIds.length + 1;
        return `Follow-up ${siblingCount}`;
      }
      return `Node ${state.tree.nodes.size + 1}`;
    }
  },

  clearAll: () => {
    set({
      tree: {
        nodes: new Map(),
        rootIds: [],
      },
    });
    get().saveToStorage();
  },

  saveCurrentSession: (name) => {
    const state = get();
    const sessionId = state.currentSessionId || `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const sessionName = name || `Session ${new Date().toLocaleString()}`;
    
    // Convert nodes Map to array for storage
    const nodesArray = Array.from(state.tree.nodes.entries());
    const session: Session = {
      id: sessionId,
      name: sessionName,
      createdAt: state.sessions.get(sessionId)?.createdAt || Date.now(),
      updatedAt: Date.now(),
      tree: {
        nodes: nodesArray as any, // Will be converted back to Map on load
        rootIds: [...state.tree.rootIds],
      },
    };

    const newSessions = new Map(state.sessions);
    newSessions.set(sessionId, session);

    set({
      currentSessionId: sessionId,
      sessions: newSessions,
    });

    // Save to localStorage
    try {
      const sessionsArray = Array.from(newSessions.entries());
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessionsArray));
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    return sessionId;
  },

  loadSession: (sessionId) => {
    const state = get();
    const session = state.sessions.get(sessionId);
    
    if (session) {
      // Save current session before switching
      if (state.currentSessionId && state.tree.nodes.size > 0) {
        get().saveCurrentSession();
      }

      // Convert Map from session data (nodes are already Maps when loaded)
      const nodes = session.tree.nodes instanceof Map 
        ? new Map<string, ConversationNode>(session.tree.nodes)
        : new Map<string, ConversationNode>(session.tree.nodes as [string, ConversationNode][]);
      
      set({
        tree: {
          nodes,
          rootIds: [...session.tree.rootIds],
        },
        currentSessionId: sessionId,
      });

      // Update localStorage
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
    }
  },

  createNewSession: () => {
    // Save current session before creating new one
    const state = get();
    if (state.currentSessionId && state.tree.nodes.size > 0) {
      get().saveCurrentSession();
    }

    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newSession: Session = {
      id: newSessionId,
      name: `New Session ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tree: initialTree,
    };

    const newSessions = new Map(state.sessions);
    newSessions.set(newSessionId, newSession);

    set({
      tree: initialTree,
      currentSessionId: newSessionId,
      sessions: newSessions,
    });

    // Save to localStorage
    try {
      const sessionsArray = Array.from(newSessions.entries());
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessionsArray));
      localStorage.setItem(CURRENT_SESSION_KEY, newSessionId);
    } catch (error) {
      console.error('Failed to save new session:', error);
    }

    return newSessionId;
  },

  deleteSession: (sessionId) => {
    const state = get();
    if (state.currentSessionId === sessionId) {
      // Can't delete current session - create a new one first
      get().createNewSession();
    }

    const newSessions = new Map(state.sessions);
    newSessions.delete(sessionId);

    set({ sessions: newSessions });

    // Save to localStorage
    try {
      const sessionsArray = Array.from(newSessions.entries());
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessionsArray));
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  getSessionList: () => {
    return Array.from(get().sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  },

  renameSession: (sessionId, newName) => {
    const state = get();
    const session = state.sessions.get(sessionId);
    
    if (session) {
      const updatedSession = {
        ...session,
        name: newName,
        updatedAt: Date.now(),
      };

      const newSessions = new Map(state.sessions);
      newSessions.set(sessionId, updatedSession);

      set({ sessions: newSessions });

      // Save to localStorage
      try {
        const sessionsArray = Array.from(newSessions.entries());
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessionsArray));
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }
  },

  exportSession: (sessionId) => {
    const state = get();
    const session = state.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    // Convert session to exportable format (convert Maps to arrays)
    const nodesArray = Array.from(session.tree.nodes.entries());
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      session: {
        ...session,
        tree: {
          nodes: nodesArray,
          rootIds: session.tree.rootIds,
        },
      },
    };

    return JSON.stringify(exportData, null, 2);
  },

  importSession: (sessionData) => {
    try {
      const data = JSON.parse(sessionData);
      
      // Validate structure
      if (!data.session || !data.session.tree) {
        throw new Error('Invalid session file format');
      }

      const importedSession = data.session;
      
      // Convert nodes array back to Map
      const nodesArray = importedSession.tree.nodes || [];
      const nodes = new Map<string, ConversationNode>(nodesArray);
      
      // Generate names for nodes that don't have them
      nodes.forEach((node) => {
        if (!node.name) {
          const name = get().generateNodeName(node.parentId);
          node.name = name;
        }
      });

      // Create new session with imported data
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const session: Session = {
        id: newSessionId,
        name: importedSession.name || `Imported Session ${new Date().toLocaleString()}`,
        createdAt: importedSession.createdAt || Date.now(),
        updatedAt: Date.now(),
        tree: {
          nodes,
          rootIds: importedSession.tree.rootIds || [],
        },
      };

      // Add to sessions
      const state = get();
      const newSessions = new Map(state.sessions);
      newSessions.set(newSessionId, session);

      set({ sessions: newSessions });

      // Save to localStorage
      try {
        const sessionsArray = Array.from(newSessions.entries());
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessionsArray));
      } catch (error) {
        console.error('Failed to save imported session:', error);
      }

      return newSessionId;
    } catch (error) {
      console.error('Failed to import session:', error);
      throw error;
    }
  },

  applyAutoLayout: () => {
    const state = get();
    console.log('Applying auto-layout to', state.tree.nodes.size, 'nodes');
    const positions = calculateAutoLayout(state.tree);
    console.log('Calculated positions for', positions.size, 'nodes');
    
    // Update all node positions - ALWAYS update, even if positions seem similar
    const newNodes = new Map(state.tree.nodes);
    let hasChanges = false;
    let updatedCount = 0;
    
    positions.forEach((position, nodeId) => {
      const node = newNodes.get(nodeId);
      if (node) {
        const oldPos = node.position;
        const newPos = position;
        // Check if position actually changed
        const xDiff = Math.abs(oldPos.x - newPos.x);
        const yDiff = Math.abs(oldPos.y - newPos.y);
        if (xDiff > 1 || yDiff > 1) {
          hasChanges = true;
        }
        console.log(`Node ${nodeId.slice(0, 8)}: old (${Math.round(oldPos.x)}, ${Math.round(oldPos.y)}) -> new (${Math.round(newPos.x)}, ${Math.round(newPos.y)}) [diff: ${Math.round(xDiff)}, ${Math.round(yDiff)}]`);
        newNodes.set(nodeId, {
          ...node,
          position: newPos, // Always use new position
        });
        updatedCount++;
      } else {
        console.warn('Node not found for layout:', nodeId);
      }
    });
    
    console.log('Updated', updatedCount, 'node positions. Has changes:', hasChanges);

    // Always update, even if positions are similar (force re-render)
    set({
      tree: {
        ...state.tree,
        nodes: newNodes,
      },
    });

    get().saveToStorage();
    
    // Trigger a custom event to notify canvas to fit view
    window.dispatchEvent(new CustomEvent('autoLayoutApplied'));
  },

  loadFromStorage: () => {
    try {
      // Load sessions
      const sessionsStored = localStorage.getItem(SESSIONS_KEY);
      const sessions = new Map<string, Session>();
      
      if (sessionsStored) {
        const sessionsArray = JSON.parse(sessionsStored) as [string, any][];
        sessionsArray.forEach(([id, sessionData]) => {
          // Convert tree nodes from array back to Map
          let nodes: Map<string, ConversationNode>;
          
          if (sessionData.tree?.nodes) {
            // Check if nodes is already a Map (shouldn't happen from JSON, but handle it)
            if (sessionData.tree.nodes instanceof Map) {
              nodes = new Map<string, ConversationNode>(sessionData.tree.nodes);
            } else if (Array.isArray(sessionData.tree.nodes)) {
              // It's an array of [key, value] pairs
              nodes = new Map<string, ConversationNode>(sessionData.tree.nodes as [string, ConversationNode][]);
            } else {
              // Fallback: empty map
              console.warn('Invalid nodes format in session, using empty map');
              nodes = new Map<string, ConversationNode>();
            }
          } else {
            // No nodes data, create empty map
            nodes = new Map<string, ConversationNode>();
          }
          
          // Backward compatibility: generate names for nodes that don't have them
          // Create a new map with updated nodes to avoid mutation issues
          const updatedNodes = new Map<string, ConversationNode>();
          nodes.forEach((node, nodeId) => {
            if (!node.name) {
              const name = get().generateNodeName(node.parentId);
              updatedNodes.set(nodeId, { ...node, name });
            } else {
              updatedNodes.set(nodeId, node);
            }
          });
          nodes = updatedNodes;
          
          sessions.set(id, {
            id: sessionData.id || id,
            name: sessionData.name || `Session ${id}`,
            createdAt: sessionData.createdAt || Date.now(),
            updatedAt: sessionData.updatedAt || Date.now(),
            tree: {
              nodes,
              rootIds: sessionData.tree?.rootIds || [],
            },
          });
        });
      }

      // Load current session ID
      const currentSessionId = localStorage.getItem(CURRENT_SESSION_KEY);

      // Backward compatibility: migrate old single session to new format
      const oldStored = localStorage.getItem(STORAGE_KEY);
      if (oldStored && sessions.size === 0) {
        try {
          const data = JSON.parse(oldStored);
          const nodesArray = (data.nodes || []) as [string, ConversationNode][];
          const nodes = new Map<string, ConversationNode>(nodesArray);
          
          nodes.forEach((node) => {
            if (!node.name) {
              const name = get().generateNodeName(node.parentId);
              node.name = name;
            }
          });

          // Ensure nodes is a proper Map
          let migratedNodes: Map<string, ConversationNode>;
          if (nodes instanceof Map) {
            migratedNodes = nodes;
          } else if (Array.isArray(nodes)) {
            migratedNodes = new Map<string, ConversationNode>(nodes as [string, ConversationNode][]);
          } else {
            console.warn('Invalid nodes format in old session, using empty map');
            migratedNodes = new Map<string, ConversationNode>();
          }

          const migratedSessionId = `session-${Date.now()}`;
          const migratedSession: Session = {
            id: migratedSessionId,
            name: 'Migrated Session',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tree: {
              nodes: migratedNodes,
              rootIds: data.rootIds || [],
            },
          };
          sessions.set(migratedSessionId, migratedSession);
          
          // Set as current session
          localStorage.setItem(CURRENT_SESSION_KEY, migratedSessionId);
          
          // Remove old storage
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          console.error('Failed to migrate old session:', error);
        }
      }

      // Load current session or create new one
      let tree = initialTree;
      let activeSessionId = currentSessionId;

      if (activeSessionId && sessions.has(activeSessionId)) {
        const session = sessions.get(activeSessionId)!;
        const sessionNodes = session.tree.nodes instanceof Map
          ? new Map<string, ConversationNode>(session.tree.nodes)
          : new Map<string, ConversationNode>(session.tree.nodes as [string, ConversationNode][]);
        tree = {
          nodes: sessionNodes,
          rootIds: [...session.tree.rootIds],
        };
      } else if (sessions.size > 0) {
        // Load most recent session
        const sortedSessions = Array.from(sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
        const mostRecent = sortedSessions[0];
        const recentNodes = mostRecent.tree.nodes instanceof Map
          ? new Map<string, ConversationNode>(mostRecent.tree.nodes)
          : new Map<string, ConversationNode>(mostRecent.tree.nodes as [string, ConversationNode][]);
        tree = {
          nodes: recentNodes,
          rootIds: [...mostRecent.tree.rootIds],
        };
        activeSessionId = mostRecent.id;
      } else {
        // Create new session
        activeSessionId = get().createNewSession();
      }

      set({
        tree,
        currentSessionId: activeSessionId,
        sessions,
      });
    } catch (error) {
      console.error('Failed to load from storage:', error);
      // Create new session on error
      get().createNewSession();
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      
      // Auto-save current session
      if (state.currentSessionId) {
        get().saveCurrentSession();
      } else {
        // No current session, create one
        get().saveCurrentSession();
      }
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  },
}));

