import { ConversationNode } from '../types/conversation';
import { parseAnswerIntoSections } from './answerParser';

export function buildContext(
  parentNode: ConversationNode | null,
  chain: ConversationNode[],
  selectedSectionIndex?: number
): string {
  if (chain.length === 0) return '';

  const contextParts: string[] = [];

  // If no section is selected and we're continuing from a child node,
  // only use the immediate parent (last node in chain), not the full chain
  // This ensures we don't include the full parent answer when continuing from a child
  const isContinuingFromChild = parentNode !== null && 
                                 parentNode.parentId !== null && 
                                 selectedSectionIndex === undefined;

  if (isContinuingFromChild) {
    // Only use the immediate parent node (the child we're continuing from)
    const immediateParent = chain[chain.length - 1];
    contextParts.push(`Q: ${immediateParent.question}`);
    contextParts.push(`A: ${immediateParent.answer}`);
  } else {
    // Use full chain context
    // For the last node (parent), use selected section if available, otherwise full answer
    chain.forEach((chainNode, index) => {
      const isLastNode = index === chain.length - 1;
      
      contextParts.push(`Q: ${chainNode.question}`);
      
      if (isLastNode && selectedSectionIndex !== undefined) {
        // Use selected section for the parent node
        // Parse sections if they don't exist (for backward compatibility)
        let sections = chainNode.answerSections;
        if (!sections || sections.length === 0) {
          sections = parseAnswerIntoSections(chainNode.answer);
        }
        
        const selectedSection = sections[selectedSectionIndex];
        if (selectedSection) {
          contextParts.push(`A (selected section): ${selectedSection.text}`);
        } else {
          // Fallback to full answer if section index is invalid
          contextParts.push(`A: ${chainNode.answer}`);
        }
      } else {
        // Use full answer for all other nodes
        contextParts.push(`A: ${chainNode.answer}`);
      }
    });
  }

  return contextParts.join('\n\n');
}

export function buildPrompt(question: string, context: string): string {
  if (!context) {
    return question;
  }

  return `Context from previous conversation:\n${context}\n\nCurrent question: ${question}`;
}

