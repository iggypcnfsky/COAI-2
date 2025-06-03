// Token estimation and context window management utilities

/**
 * Rough token estimation for OpenAI models
 * Based on the rule: ~4 characters = 1 token for English text
 * This is an approximation - for exact counts, you'd need tiktoken
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  
  // Basic estimation: 4 characters ≈ 1 token
  // Add some overhead for special tokens and formatting
  const baseTokens = Math.ceil(text.length / 4);
  
  // Add overhead for message structure (role, formatting, etc.)
  const overhead = Math.ceil(baseTokens * 0.1); // 10% overhead
  
  return baseTokens + overhead;
}

/**
 * Estimate tokens for a message object
 */
export function estimateMessageTokens(message: { role: string; content: string; image?: any }): number {
  let tokens = 0;
  
  // Content tokens
  tokens += estimateTokens(message.content);
  
  // Role tokens (small overhead)
  tokens += estimateTokens(message.role);
  
  // Image tokens (if present) - images are expensive!
  if (message.image) {
    // GPT-4V uses ~765 tokens for a 1024x1024 image
    // This is a rough estimate - actual cost depends on image size
    tokens += 800;
  }
  
  // Message structure overhead
  tokens += 10;
  
  return tokens;
}

/**
 * Estimate tokens for an array of messages
 */
export function estimateMessagesTokens(messages: Array<{ role: string; content: string; image?: any }>): number {
  return messages.reduce((total, message) => total + estimateMessageTokens(message), 0);
}

/**
 * Trim messages to fit within a token limit using a sliding window approach
 * Always keeps the most recent messages and system prompt space
 */
export function trimMessagesToTokenLimit(
  messages: Array<{ role: string; content: string; image?: any }>,
  maxTokens: number = 40000, // Default 40k context window
  systemPromptTokens: number = 2000 // Reserve space for system prompt
): Array<{ role: string; content: string; image?: any }> {
  if (messages.length === 0) return messages;
  
  const availableTokens = maxTokens - systemPromptTokens;
  let currentTokens = 0;
  const trimmedMessages: Array<{ role: string; content: string; image?: any }> = [];
  
  // Start from the most recent message and work backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateMessageTokens(message);
    
    // If adding this message would exceed the limit, stop
    if (currentTokens + messageTokens > availableTokens) {
      break;
    }
    
    currentTokens += messageTokens;
    trimmedMessages.unshift(message); // Add to beginning to maintain order
  }
  
  // Always include at least the last message (even if it's over the limit)
  if (trimmedMessages.length === 0 && messages.length > 0) {
    trimmedMessages.push(messages[messages.length - 1]);
  }
  
  return trimmedMessages;
}

/**
 * Get context window info for debugging
 */
export function getContextInfo(
  messages: Array<{ role: string; content: string; image?: any }>,
  maxTokens: number = 40000,
  systemPromptTokens: number = 2000
) {
  const totalTokens = estimateMessagesTokens(messages);
  const availableTokens = maxTokens - systemPromptTokens;
  const trimmedMessages = trimMessagesToTokenLimit(messages, maxTokens, systemPromptTokens);
  const trimmedTokens = estimateMessagesTokens(trimmedMessages);
  
  return {
    originalMessageCount: messages.length,
    trimmedMessageCount: trimmedMessages.length,
    messagesRemoved: messages.length - trimmedMessages.length,
    originalTokens: totalTokens,
    trimmedTokens: trimmedTokens,
    systemPromptTokens,
    maxTokens,
    availableTokens,
    utilizationPercent: Math.round((trimmedTokens / availableTokens) * 100)
  };
} 