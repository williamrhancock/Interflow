export interface AnswerSection {
  id: string;
  text: string;
  index: number;
}

export interface ConversationNode {
  id: string;
  name: string; // Human-readable name like "Question 1" or "Node 2"
  question: string;
  answer: string;
  answerSections?: AnswerSection[]; // Parsed sections of the answer
  parentId: string | null;
  childrenIds: string[];
  context: string[]; // Full conversation chain up to parent
  timestamp: number;
  position: { x: number; y: number };
  isCollapsed: boolean;
  selectedSectionIndexFromParent?: number; // Index of section selected from parent when spawning this node
}

export interface ConversationTree {
  nodes: Map<string, ConversationNode>;
  rootIds: string[]; // IDs of root nodes (no parent)
}

