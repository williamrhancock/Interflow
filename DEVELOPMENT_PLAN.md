# InferFlow Development Plan

## Project Overview
An infinite canvas application for managing branching LLM conversations with context-aware chat spawning and summarization capabilities.

## Architecture Suggestions

### Tech Stack Recommendations

**Frontend:**
- **React + TypeScript** - Modern, type-safe UI framework
- **React Flow** - Infinite canvas with node-based UI (perfect for chat nodes)
- **Tailwind CSS** - Modern, utility-first styling
- **Zustand** - Lightweight state management for conversations
- **Vite** - Fast build tool and dev server

**Backend (if needed):**
- **Next.js API Routes** - Full-stack framework (recommended)
- OR **Express.js** - Standalone backend
- **OpenAI SDK** - Official OpenAI integration
- **LangChain** (optional) - For multi-LLM support and advanced features

**Storage:**
- **LocalStorage** - For persistence (MVP)
- **IndexedDB** - For larger conversation trees (future)
- **Backend Database** - For cloud sync (future)

### Key Design Decisions

1. **Conversation Structure:**
   - Tree/graph data structure where each node represents a Q&A pair
   - Each node can have multiple children (branches)
   - Root nodes start from the inference window
   - Context flows from parent to child nodes

2. **Canvas Implementation:**
   - Use React Flow for infinite canvas with zoom/pan
   - Each chat node is a draggable React Flow node
   - Edges connect parent Q&A to child conversations
   - Auto-layout or manual positioning

3. **Inference Window:**
   - Fixed position (bottom or side panel)
   - Single input field
   - Shows current conversation context
   - Can switch between "new conversation" and "continue current"

4. **Context Management:**
   - When spawning from a Q&A, include:
     - The parent question
     - The parent answer
     - Full conversation chain up to that point
   - Context window management (token limits)

## Development Phases

### Phase 1: Foundation (MVP)
**Goal:** Basic infinite canvas with single inference window

1. **Project Setup**
   - Initialize React + TypeScript + Vite project
   - Install dependencies (React Flow, Tailwind, Zustand)
   - Set up project structure

2. **Basic Canvas**
   - Implement React Flow infinite canvas
   - Add zoom/pan controls
   - Basic node rendering

3. **Inference Window**
   - Create fixed-position chat input component
   - Basic UI for question input
   - Connect to OpenAI API (hardcoded key for MVP)

4. **Basic Chat Nodes**
   - Render Q&A pairs as nodes on canvas
   - Simple card-based design
   - Display question and answer

### Phase 2: Branching Conversations
**Goal:** Spawn new chats from existing Q&A pairs

1. **"+" Button Functionality**
   - Add "+" button to each answer node
   - Click handler to spawn new conversation
   - Create new node with parent context

2. **Context Passing**
   - Implement context chain collection
   - Pass parent Q&A to new conversation
   - Update inference window with context

3. **Node Relationships**
   - Visual edges connecting parent to child nodes
   - Tree structure in state management
   - Update canvas when new nodes added

### Phase 3: LLM Integration & Configuration
**Goal:** Flexible LLM support with configuration

1. **LLM Abstraction**
   - Create LLM service interface
   - Implement OpenAI provider
   - Support for other providers (Anthropic, etc.)

2. **Configuration UI**
   - Settings panel for API keys
   - Model selection
   - Temperature and other parameters
   - Provider selection

3. **Error Handling**
   - API error handling
   - Rate limiting
   - Retry logic

### Phase 4: Summarization
**Goal:** Gather and organize conversation chains

1. **Chain Collection**
   - Traverse conversation tree
   - Collect all Q&A pairs
   - Identify conversation branches

2. **Summarization Logic**
   - Order conversations chronologically or by dependency
   - Create flow representation
   - Generate summary using LLM

3. **Summary Display**
   - New view/modal for summary
   - Visual flow diagram
   - Export functionality (future)

### Phase 5: Polish & Enhancement
**Goal:** Better UX and additional features

1. **UI/UX Improvements**
   - Better node styling
   - Animations
   - Loading states
   - Better mobile responsiveness

2. **Additional Features**
   - Search across conversations
   - Node deletion/editing
   - Export/import conversations
   - Conversation templates

3. **Performance**
   - Optimize large conversation trees
   - Virtualization for many nodes
   - Lazy loading

## File Structure

```
inferflow/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── ChatNode.tsx
│   │   │   ├── ConversationCanvas.tsx
│   │   │   └── NodeControls.tsx
│   │   ├── inference/
│   │   │   ├── InferenceWindow.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── settings/
│   │   │   └── LLMConfig.tsx
│   │   └── summary/
│   │       └── SummaryView.tsx
│   ├── services/
│   │   ├── llm/
│   │   │   ├── LLMService.ts
│   │   │   ├── OpenAIProvider.ts
│   │   │   └── types.ts
│   │   └── storage/
│   │       └── ConversationStorage.ts
│   ├── store/
│   │   ├── conversationStore.ts
│   │   └── configStore.ts
│   ├── types/
│   │   ├── conversation.ts
│   │   └── node.ts
│   ├── utils/
│   │   ├── contextBuilder.ts
│   │   └── summarizer.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## Data Models

### Conversation Node
```typescript
interface ConversationNode {
  id: string;
  question: string;
  answer: string;
  parentId: string | null;
  childrenIds: string[];
  context: string[]; // Full conversation chain
  timestamp: number;
  position: { x: number; y: number };
}
```

### LLM Config
```typescript
interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}
```

## Questions & Considerations

1. **Context Window Management:**
   - How should we handle very long conversation chains?
   - Should we truncate context or use summarization?
   - Token limit per request?

2. **Node Positioning:**
   - Auto-layout (hierarchical tree layout)?
   - Manual positioning only?
   - Hybrid approach?

3. **Persistence:**
   - LocalStorage sufficient for MVP?
   - Need cloud sync?
   - Export format (JSON, markdown)?

4. **UI/UX:**
   - Should the inference window be always visible or toggleable?
   - Dark/light theme preference?
   - Should nodes be collapsible/expandable?

5. **Summarization:**
   - Should it create a new summary node on canvas?
   - Separate view/modal?
   - What format for the summary (narrative, bullet points, flow diagram)?

## Next Steps

1. Confirm tech stack preferences
2. Answer questions above
3. Start with Phase 1 implementation
4. Iterate based on feedback

