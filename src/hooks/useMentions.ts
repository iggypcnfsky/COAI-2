import { useState, useCallback, useMemo } from 'react';
import { AIEmployee } from '@/types';

interface MentionedEmployee {
  id: string;
  name: string;
  profileImage: string;
  position: number; // Position in the text where the mention starts
  length: number; // Length of the mention text including @
}

interface UseMentionsProps {
  employees: AIEmployee[];
}

interface TextPart {
  type: 'text' | 'mention';
  content: string;
  employee?: AIEmployee;
}

export const useMentions = ({ employees }: UseMentionsProps) => {
  const [isShowingMentions, setIsShowingMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState<number>(0);
  const [completedMentions, setCompletedMentions] = useState<Set<number>>(new Set());

  // Filter employees based on mention query
  const filteredEmployees = useMemo(() => {
    // If we're not showing mentions at all, return empty array
    if (!isShowingMentions) return [];
    
    // If we're showing mentions but have no query (just typed "@"), show all employees
    if (!mentionQuery) return employees;
    
    // Otherwise, filter based on the query
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [employees, mentionQuery, isShowingMentions]);

  // Parse mentions from text
  const parseMentions = useCallback((text: string): MentionedEmployee[] => {
    const mentions: MentionedEmployee[] = [];
    // Find all potential mentions and validate them against actual employee names
    const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$)/g;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const mentionName = match[1];
      
      const employee = employees.find(emp => 
        emp.name.toLowerCase() === mentionName.toLowerCase()
      );
      
      if (employee) {
        const mention = {
          id: employee.id,
          name: employee.name,
          profileImage: employee.profileImage,
          position: match.index,
          length: `@${employee.name}`.length // Use actual employee name length, not matched text length
        };
        mentions.push(mention);
      }
    }

    return mentions;
  }, [employees]);

  // Clear completed mentions when text is empty or significantly changed
  const checkAndClearCompletedMentions = useCallback((text: string) => {
    // If text is empty or doesn't contain any @ symbols, clear completed mentions
    if (!text || !text.includes('@')) {
      if (completedMentions.size > 0) {
        setCompletedMentions(new Set());
      }
    }
  }, [completedMentions]);

  // Check if cursor is in a mention
  const checkMentionAtCursor = useCallback((text: string, cursorPosition: number) => {
    // First check if we should clear completed mentions
    checkAndClearCompletedMentions(text);
    
    const beforeCursor = text.substring(0, cursorPosition);
    
    // Look for @ followed by characters at the end of beforeCursor
    const mentionMatch = beforeCursor.match(/@([A-Za-z]*(?:\s+[A-Za-z]*)*)$/);
    
    if (!mentionMatch) {
      setIsShowingMentions(false);
      setMentionQuery('');
      return false;
    }
    
    const fullQuery = mentionMatch[1];
    const mentionStartIndex = mentionMatch.index!;
    
    // Check if this mention position was already completed by user selection
    if (completedMentions.has(mentionStartIndex)) {
      setIsShowingMentions(false);
      setMentionQuery('');
      return false;
    }
    
    // Check all possible employee matches within this query
    for (const employee of employees) {
      const employeeName = employee.name.toLowerCase();
      const queryLower = fullQuery.toLowerCase();
      
      // If the query starts with a valid employee name followed by a space and more content
      if (queryLower.startsWith(employeeName + ' ') && queryLower.length > employeeName.length + 1) {
        // The mention is complete and user has typed beyond it
        setIsShowingMentions(false);
        setMentionQuery('');
        return false;
      }
    }
    
    // We're actively typing a mention
    setIsShowingMentions(true);
    setMentionQuery(fullQuery);
    setMentionPosition(mentionStartIndex);
    return true;
  }, [employees, completedMentions, checkAndClearCompletedMentions]);

  // Insert mention into text
  const insertMention = useCallback((text: string, employee: AIEmployee, cursorPosition: number) => {
    const beforeCursor = text.substring(0, cursorPosition);
    const afterCursor = text.substring(cursorPosition);
    
    // Updated regex to handle names with spaces during insertion
    const mentionMatch = beforeCursor.match(/@([A-Za-z]*(?:\s+[A-Za-z]*)*)$/);
    
    if (mentionMatch) {
      const beforeMention = beforeCursor.substring(0, mentionMatch.index);
      // Add space + em dash after mention for natural separation and to prevent regex issues
      const newText = `${beforeMention}@${employee.name} — ${afterCursor}`;
      const newCursorPosition = beforeMention.length + employee.name.length + 4; // +4 for "@" + " — "
      
      // Mark this mention as completed by user selection
      const mentionStartIndex = mentionMatch.index!;
      setCompletedMentions(prev => new Set(prev).add(mentionStartIndex));
      
      return {
        text: newText,
        cursorPosition: newCursorPosition
      };
    }
    
    return { text, cursorPosition };
  }, []);

  // Convert text with mentions to display format
  const formatTextWithMentions = useCallback((text: string): TextPart[] => {
    const mentions = parseMentions(text);
    if (mentions.length === 0) return [{ type: 'text', content: text }];

    const parts: TextPart[] = [];
    let lastIndex = 0;

    mentions.forEach(mention => {
      // Add text before mention
      if (mention.position > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, mention.position)
        });
      }

      // Add mention
      const employee = employees.find(emp => emp.id === mention.id);
      parts.push({
        type: 'mention',
        content: `@${mention.name}`,
        employee
      });

      lastIndex = mention.position + mention.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }

    return parts;
  }, [employees, parseMentions]);

  // Clear completed mentions when text changes significantly
  const clearCompletedMentions = useCallback(() => {
    setCompletedMentions(new Set());
  }, []);

  return {
    isShowingMentions,
    mentionQuery,
    mentionPosition,
    filteredEmployees,
    checkMentionAtCursor,
    insertMention,
    formatTextWithMentions,
    parseMentions,
    setIsShowingMentions,
    clearCompletedMentions
  };
}; 