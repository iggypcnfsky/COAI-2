// Natural Team Dynamics - Type Definitions

export interface AIPersonality {
  chattiness: number;           // 0-1: How often they respond to messages
  responseSpeed: number;        // 0-1: How quickly they respond (affects delay)
  collaboration: number;        // 0-1: Tendency to build on others' responses
  expertiseConfidence: number;  // 0-1: Confidence in their domain expertise
  questionTendency: number;     // 0-1: Likelihood to ask clarifying questions
}

export interface ResponseDecision {
  shouldRespond: boolean;
  confidence: number;           // 0-1: How confident they are about responding
  responseDelay: number;        // Milliseconds to wait before responding
  responseType: 'primary' | 'supporting' | 'questioning' | 'building';
  reasoning: string;            // Why they decided to respond or not
}

export interface ConversationContext {
  messageContent: string;
  messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    aiEmployeeId?: string;
  }>;
  mentionedAIs: string[];       // IDs of AIs mentioned in the message
  topicRelevance: Record<string, number>; // AI ID -> relevance score
  recentResponders: string[];   // IDs of AIs who responded recently
}

export interface TimingConfig {
  minThinkingTime: number;      // Minimum delay before responding (ms)
  maxThinkingTime: number;      // Maximum delay before responding (ms)
  betweenResponses: number;     // Delay between multiple AI responses (ms)
  typingSpeed: number;          // Characters per second for typing simulation
}

export interface TeamDynamicsConfig {
  personalities: Record<string, AIPersonality>; // AI ID -> personality
  timing: TimingConfig;
  maxSimultaneousResponses: number; // Prevent too many AIs responding at once
  collaborationBonus: number;   // Boost for building on others' responses
  mentionBonus: number;         // Boost for mentioned AIs
}

export interface ResponsePlan {
  aiId: string;
  decision: ResponseDecision;
  scheduledTime: number;        // When to start responding (timestamp)
  dependencies: string[];       // Wait for these AIs to finish first
}

export interface ConversationState {
  activeResponders: Set<string>; // AIs currently responding
  responseQueue: ResponsePlan[]; // Planned responses
  lastResponseTime: number;      // Timestamp of last response
  conversationTurn: number;      // Current turn number
} 