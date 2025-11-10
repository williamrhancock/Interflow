/**
 * Parses an LLM answer into distinct sections
 * Handles markdown headers, paragraphs, numbered lists, etc.
 */
export interface AnswerSection {
  id: string;
  text: string;
  index: number;
}

export function parseAnswerIntoSections(answer: string): AnswerSection[] {
  if (!answer || answer.trim().length === 0) {
    return [];
  }

  const sections: AnswerSection[] = [];
  
  // Split by markdown headers (##, ###, etc.)
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  
  let match;
  
  // Find all headers
  const headerMatches: Array<{ index: number; level: number; text: string }> = [];
  while ((match = headerRegex.exec(answer)) !== null) {
    headerMatches.push({
      index: match.index,
      level: match[1].length,
      text: match[2],
    });
  }
  
  if (headerMatches.length > 0) {
    // Split by headers
    for (let i = 0; i < headerMatches.length; i++) {
      const current = headerMatches[i];
      const next = headerMatches[i + 1];
      
      const start = current.index;
      const end = next ? next.index : answer.length;
      const sectionText = answer.substring(start, end).trim();
      
      if (sectionText) {
        sections.push({
          id: `section-${i}`,
          text: sectionText,
          index: i,
        });
      }
    }
  } else {
    // No headers found, try to split by numbered steps (Step 1:, Step 2:, 1., 2., etc.)
    const stepRegex = /(?:^|\n)(?:Step\s+\d+:|^\d+\.\s+|^[-*]\s+)/im;
    if (stepRegex.test(answer)) {
      // Split by numbered steps
      const lines = answer.split('\n');
      let currentSection: string[] = [];
      let sectionIndex = 0;
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.length === 0 && currentSection.length > 0) {
          // Empty line - end current section if it has content
          sections.push({
            id: `section-${sectionIndex}`,
            text: currentSection.join('\n').trim(),
            index: sectionIndex,
          });
          sectionIndex++;
          currentSection = [];
        } else if (/^(?:Step\s+\d+:|^\d+\.\s+|^[-*]\s+)/i.test(trimmed)) {
          // New step detected - save previous section if exists
          if (currentSection.length > 0) {
            sections.push({
              id: `section-${sectionIndex}`,
              text: currentSection.join('\n').trim(),
              index: sectionIndex,
            });
            sectionIndex++;
          }
          currentSection = [line];
        } else if (currentSection.length > 0 || trimmed.length > 0) {
          // Continue current section
          currentSection.push(line);
        }
      });
      
      // Add final section
      if (currentSection.length > 0) {
        sections.push({
          id: `section-${sectionIndex}`,
          text: currentSection.join('\n').trim(),
          index: sectionIndex,
        });
      }
    } else {
      // No steps found, split by double newlines (paragraphs)
      const paragraphs = answer.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      paragraphs.forEach((para, index) => {
        const trimmed = para.trim();
        if (trimmed.length > 0) {
          sections.push({
            id: `section-${index}`,
            text: trimmed,
            index,
          });
        }
      });
    }
  }
  
  // If we still have no sections, treat the whole answer as one section
  if (sections.length === 0) {
    sections.push({
      id: 'section-0',
      text: answer.trim(),
      index: 0,
    });
  }
  
  // Clean up sections - remove markdown formatting from section text for display
  return sections.map(section => ({
    ...section,
    text: section.text.replace(/^#{1,6}\s+/gm, '').trim(), // Remove header markers
  }));
}

