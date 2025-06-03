/**
 * Prompt Reinjection Utilities
 * 
 * Helps maintain character consistency by periodically reinjecting the original
 * system prompt to prevent AI models from "forgetting" their character instructions
 * as conversations get longer.
 */

// Internal configuration - optimized for best character consistency
const REINJECTION_CONFIG = {
  messageInterval: 6, // More frequent reinjection for better consistency
  minConversationLength: 8, // Start earlier to prevent drift
  includeReminderPrefix: true,
  reminderPrefix: "REMEMBER: "
};

/**
 * Determines if a prompt reinjection should occur based on conversation state
 */
export function shouldInjectPrompt(messageCount: number): boolean {
  // Don't inject if conversation is too short
  if (messageCount < REINJECTION_CONFIG.minConversationLength) {
    return false;
  }
  
  // Inject every N messages after the minimum threshold
  const messagesAfterThreshold = messageCount - REINJECTION_CONFIG.minConversationLength;
  return messagesAfterThreshold > 0 && messagesAfterThreshold % REINJECTION_CONFIG.messageInterval === 0;
}

/**
 * Creates a reinjected system prompt with reminder prefix for character consistency
 */
export function createReinjectedPrompt(
  originalSystemPrompt: string,
  isHighPriority: boolean = false
): string {
  if (!originalSystemPrompt) return originalSystemPrompt;
  
  const prefix = isHighPriority ? "CRITICAL CHARACTER REMINDER: " : REINJECTION_CONFIG.reminderPrefix;
  return `${prefix}${originalSystemPrompt}`;
}

/**
 * Simple check for very long conversations where character reinforcement might be helpful
 * This is intentionally minimal - we rely primarily on interval-based reinjection
 */
export function shouldReinforceCharacter(messageCount: number): boolean {
  // Only suggest reinforcement for very long conversations
  return messageCount > 25 && messageCount % 15 === 0;
}

/**
 * Creates an enhanced system prompt that includes character reinforcement
 */
export function enhanceSystemPromptForConsistency(
  originalPrompt: string,
  characterName: string,
  characterRole: string,
  messageCount: number
): string {
  if (!originalPrompt) return originalPrompt;
  
  // Add character consistency reminders for longer conversations
  if (messageCount > 15) {
    const consistencyReminder = `\n\nCHARACTER CONSISTENCY REMINDER: You are ${characterName}, ${characterRole}. Stay true to your character throughout this conversation. Don't become generic or overly helpful - maintain your unique personality, speech patterns, and perspective.`;
    return originalPrompt + consistencyReminder;
  }
  
  return originalPrompt;
}

/**
 * Creates a fresh start prompt when chat is cleared - always reinforces character
 */
export function createFreshStartPrompt(originalSystemPrompt: string): string {
  if (!originalSystemPrompt) return originalSystemPrompt;
  
  return `FRESH START REMINDER: ${originalSystemPrompt}`;
}

/**
 * Logs prompt reinjection events for debugging
 */
export function logPromptReinjection(
  characterName: string,
  messageCount: number,
  reason: 'interval' | 'reinforcement' | 'fresh_start'
): void {
  console.log(`🔄 [PROMPT REINJECTION] ${characterName} at message ${messageCount} (reason: ${reason})`);
} 