import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIEmployee } from '@/types';
import MentionBadge from './MentionBadge';
import FileMentionBadge from './FileMentionBadge';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  employees?: AIEmployee[];
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '', employees = [] }) => {
  
  // Remove document context comments from display
  const cleanContent = content.replace(/\n\n<!-- DOCUMENT_CONTEXT:[\s\S]*? -->/g, '');
  
  // Function to parse mentions in text content
  const renderMentions = (text: string, employees: AIEmployee[]): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    
    // Combined regex for both employee mentions and file mentions
    const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$|[^\w])|📄\[([^\]]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // This is an employee mention
        const mentionName = match[1];
        const employee = employees.find(emp => 
          emp.name.toLowerCase() === mentionName.toLowerCase()
        );

        if (employee) {
          parts.push(
            <MentionBadge key={`employee-${match.index}-${employee.id}`} employee={employee} />
          );
        } else {
          // If employee not found, just render as text
          parts.push(match[0]);
        }
      } else if (match[2]) {
        // This is a file mention
        const fileName = match[2];
        parts.push(
          <FileMentionBadge key={`file-${match.index}-${fileName}`} title={fileName} />
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-bold mb-2 mt-4 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-medium mb-1 mt-2 first:mt-0">{children}</h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-xs font-medium mb-1 mt-1 first:mt-0">{children}</h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-xs font-medium mb-1 mt-1 first:mt-0">{children}</h6>
        ),
        
        // Paragraphs
        p: ({ children }) => {
          // Handle mentions in paragraph text
          if (typeof children === 'string') {
            const parsedContent = renderMentions(children, employees);
            return <p className="mb-2 last:mb-0">{parsedContent}</p>;
          }
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm">{children}</li>
        ),
        
        // Code
        code: ({ children, ...props }) => {
          const isInline = !props.className?.includes('language-');
          if (isInline) {
            return (
              <code 
                className="bg-neutral-200 dark:bg-neutral-700 px-1 py-0.5 rounded text-xs font-mono"
                {...props}
              >
                {children}
              </code>
            );
          }
          return (
            <code 
              className="block bg-neutral-200 dark:bg-neutral-700 p-2 rounded text-xs font-mono overflow-x-auto mb-2"
              {...props}
            >
              {children}
            </code>
          );
        },
        
        // Pre-formatted text (code blocks)
        pre: ({ children }) => (
          <pre className="bg-neutral-200 dark:bg-neutral-700 p-2 rounded text-xs font-mono overflow-x-auto mb-2 whitespace-pre-wrap">
            {children}
          </pre>
        ),
        
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-neutral-300 dark:border-neutral-600 pl-3 italic mb-2 text-neutral-600 dark:text-neutral-400">
            {children}
          </blockquote>
        ),
        
        // Links
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {children}
          </a>
        ),
        
        // Emphasis
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        
        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto mb-2">
            <table className="min-w-full border border-neutral-300 dark:border-neutral-600 text-xs">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-neutral-100 dark:bg-neutral-700">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody>{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-neutral-200 dark:border-neutral-600">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1 text-left font-medium">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1">{children}</td>
        ),
        
        // Horizontal rule
        hr: () => (
          <hr className="border-neutral-300 dark:border-neutral-600 my-3" />
        ),
      }}
    >
      {cleanContent}
    </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 