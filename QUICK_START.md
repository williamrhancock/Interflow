# Quick Start Guide

## Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Set up your OpenAI API key**:
   - Create a `.env` file in the root directory
   - Add: `VITE_OPENAI_API_KEY=your_api_key_here`

3. **Start the app**:
   ```bash
   npm run dev
   ```

4. **Open in browser**: Navigate to the URL shown (usually `http://localhost:5173`)

## How to Use

### Basic Workflow

1. **Ask your first question**: Type in the inference window at the bottom and click "Send" or press Cmd/Ctrl + Enter

2. **Branch conversations**: Click the "+" button on any answer to start a new conversation with that context

3. **Navigate the canvas**:
   - Drag nodes to reposition
   - Use zoom controls (bottom-right)
   - Use minimap (bottom-left) to see overview

4. **Collapse nodes**: Click the chevron icon in a node's header

5. **Start fresh**: Click "New Question" in the header

6. **Toggle theme**: Click the sun/moon icon

### Features

- ✅ Infinite canvas with zoom/pan
- ✅ Single inference window
- ✅ Branch conversations with "+" button
- ✅ Full context chain included in new branches
- ✅ Collapsible nodes
- ✅ Dark/light theme
- ✅ LocalStorage persistence
- ✅ Auto-layout with manual positioning

### Coming Soon

- Summarization function with export (text, PDF, PNG)
- Support for other LLM providers
- Search functionality
- Node editing/deletion

## Troubleshooting

**API Key not working?**
- Make sure your `.env` file is in the root directory
- Restart the dev server after adding/changing the `.env` file
- Check that the key starts with `VITE_` prefix

**Nodes not appearing?**
- Check browser console for errors
- Try clearing localStorage: `localStorage.clear()` in browser console

**Build errors?**
- Run `npm install` again
- Delete `node_modules` and reinstall if needed

