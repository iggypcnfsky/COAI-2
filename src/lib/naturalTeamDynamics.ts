import { TeamMember, AIEmployee, ChatMessage } from '@/types';
import {
  AIPersonality,
  ResponseDecision,
  ConversationContext,
  TeamDynamicsConfig,
  ResponsePlan,
  ConversationState
} from '@/types/teamDynamics';
import { AIOrchestrator } from './aiOrchestrator';

/**
 * Natural Team Dynamics Engine
 * 
 * This class manages the coordination of multiple AI team members in a conversation,
 * making decisions about who should respond, when, and how they should interact.
 */
export class NaturalTeamDynamicsEngine {
  private config: TeamDynamicsConfig;
  private conversationState: ConversationState;
  private orchestrator: AIOrchestrator | null = null;

  constructor(config?: Partial<TeamDynamicsConfig>, openaiApiKey?: string, supabaseUrl?: string, supabaseAnonKey?: string) {
    this.config = {
      personalities: {},
      timing: {
        minThinkingTime: 1000,    // 1 second
        maxThinkingTime: 4000,    // 4 seconds
        betweenResponses: 2000,   // 2 seconds between responses
        typingSpeed: 50,          // 50 characters per second
      },
      maxSimultaneousResponses: 6, // Allow more team members to respond - let orchestrator decide
      collaborationBonus: 0.3,
      mentionBonus: 0.5,
      ...config
    };

    this.conversationState = {
      activeResponders: new Set(),
      responseQueue: [],
      lastResponseTime: 0,
      conversationTurn: 0
    };

    // Initialize orchestrator if API key and Supabase credentials are provided
    if (openaiApiKey && supabaseUrl && supabaseAnonKey) {
      this.orchestrator = new AIOrchestrator(openaiApiKey, supabaseUrl, supabaseAnonKey);
    }
  }

  /**
   * Initialize AI personalities based on their roles and characteristics
   */
  initializePersonalities(teamMembers: TeamMember[], employees: AIEmployee[]): void {
    teamMembers.forEach(member => {
      const employee = employees.find(emp => emp.id === member.id);
      if (!employee) return;

      // Generate personality based on role and some randomization
      const personality = this.generatePersonalityFromRole(employee.role, employee.id);
      this.config.personalities[member.id] = personality;
    });

    console.log('🧠 [Team Dynamics] Initialized personalities:', 
      Object.entries(this.config.personalities).map(([id, p]) => ({
        id,
        chattiness: p.chattiness.toFixed(2),
        responseSpeed: p.responseSpeed.toFixed(2),
        collaboration: p.collaboration.toFixed(2)
      }))
    );
  }

  /**
   * Generate personality traits based on AI role
   */
  private generatePersonalityFromRole(role: string, aiId: string): AIPersonality {
    // Create deterministic but varied personalities based on role and ID
    const seed = this.hashString(aiId + role);
    const random = this.seededRandom(seed);

    const roleBasedTraits = this.getRoleBasedTraits(role);
    
    return {
      chattiness: this.clamp(roleBasedTraits.chattiness + (random() - 0.5) * 0.3, 0, 1),
      responseSpeed: this.clamp(roleBasedTraits.responseSpeed + (random() - 0.5) * 0.3, 0, 1),
      collaboration: this.clamp(roleBasedTraits.collaboration + (random() - 0.5) * 0.2, 0, 1),
      expertiseConfidence: this.clamp(roleBasedTraits.expertiseConfidence + (random() - 0.5) * 0.2, 0, 1),
      questionTendency: this.clamp(roleBasedTraits.questionTendency + (random() - 0.5) * 0.2, 0, 1)
    };
  }

  /**
   * Get base personality traits for different roles
   */
  private getRoleBasedTraits(role: string): AIPersonality {
    const roleTraits: Record<string, AIPersonality> = {
      'Designer': {
        chattiness: 0.7,
        responseSpeed: 0.6,
        collaboration: 0.8,
        expertiseConfidence: 0.8,
        questionTendency: 0.6
      },
      'Developer': {
        chattiness: 0.6,
        responseSpeed: 0.7,
        collaboration: 0.7,
        expertiseConfidence: 0.9,
        questionTendency: 0.5
      },
      'Product Manager': {
        chattiness: 0.8,
        responseSpeed: 0.5,
        collaboration: 0.9,
        expertiseConfidence: 0.7,
        questionTendency: 0.8
      },
      'Marketing': {
        chattiness: 0.9,
        responseSpeed: 0.8,
        collaboration: 0.6,
        expertiseConfidence: 0.7,
        questionTendency: 0.7
      },
      'Data Scientist': {
        chattiness: 0.5,
        responseSpeed: 0.4,
        collaboration: 0.6,
        expertiseConfidence: 0.9,
        questionTendency: 0.4
      }
    };

    return roleTraits[role] || {
      chattiness: 0.6,
      responseSpeed: 0.6,
      collaboration: 0.7,
      expertiseConfidence: 0.7,
      questionTendency: 0.6
    };
  }

  /**
   * Analyze a user message and determine which AIs should respond using AI orchestrator
   */
  async planResponsesWithOrchestrator(
    messageContent: string,
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messageHistory: ChatMessage[]
  ): Promise<ResponsePlan[]> {
    if (!this.orchestrator) {
      console.log('🎯 [Team Dynamics] No orchestrator available, falling back to rule-based system');
      return this.planResponses(messageContent, teamMembers, employees, messageHistory);
    }

    console.log(`🎯 [Team Dynamics] Using AI Orchestrator for message: "${messageContent}"`);
    
    // Check for mentions before calling orchestrator
    const mentionedAIs = this.extractMentionedAIs(messageContent, teamMembers);
    if (mentionedAIs.length > 0) {
      console.log(`🎯 [Team Dynamics] ⚠️ MENTIONS DETECTED: [${mentionedAIs.join(', ')}] - Should override orchestrator decision!`);
    }

    try {
      // Convert message history to simple strings for the orchestrator
      const conversationHistory = messageHistory.slice(-10).map(msg => {
        const sender = msg.sender === 'ai' ? (msg.aiEmployee?.name || 'AI') : 'User';
        return `${sender}: ${msg.content}`;
      });

      // Get orchestrator decision
      const decision = await this.orchestrator.decideResponders(
        messageContent,
        teamMembers,
        employees,
        conversationHistory
      );

      console.log(`🎯 [AI Orchestrator] Selected: ${decision.shouldRespond.length} AIs to respond`);
      console.log(`🎯 [AI Orchestrator] Reasoning: ${decision.reasoning}`);

      // 🚨 CRITICAL: If mentions were detected, override orchestrator decision
      if (mentionedAIs.length > 0) {
        console.log(`🚨 [MENTION OVERRIDE] Overriding orchestrator decision - only mentioned AIs should respond`);
        
        const mentionedPlans: ResponsePlan[] = [];
        
        for (let i = 0; i < mentionedAIs.length; i++) {
          const aiId = mentionedAIs[i];
          const member = teamMembers.find(m => m.id === aiId);
          const employee = employees.find(e => e.id === aiId);
          
          if (!member || !employee) continue;

          const plan: ResponsePlan = {
            aiId,
            decision: {
              shouldRespond: true,
              confidence: 1.0, // Maximum confidence for direct mentions
              responseDelay: i * 1000, // Shorter delay for mentions
              responseType: i === 0 ? 'primary' : 'supporting',
              reasoning: `Directly mentioned by user - overriding orchestrator`
            },
            scheduledTime: Date.now() + (i * 1000),
            dependencies: i > 0 ? [mentionedAIs[0]] : []
          };

          mentionedPlans.push(plan);
        }

        console.log(`🚨 [MENTION OVERRIDE] Generated ${mentionedPlans.length} plans for mentioned AIs only`);
        return mentionedPlans;
      }

      // Convert orchestrator decision to response plans
      const plans: ResponsePlan[] = [];
      
      console.log(`🔍 [DEBUG] Converting orchestrator decision to plans:`);
      console.log(`🔍 [DEBUG] decision.responseOrder:`, decision.responseOrder);
      console.log(`🔍 [DEBUG] decision.shouldRespond:`, decision.shouldRespond);
      console.log(`🔍 [DEBUG] decision.primaryResponder:`, decision.primaryResponder);
      console.log(`🔍 [DEBUG] Available teamMembers:`, teamMembers.map(m => ({ id: m.id, name: m.name })));
      console.log(`🔍 [DEBUG] Available employees:`, employees.map(e => ({ id: e.id, name: e.name })));
      
      for (let i = 0; i < decision.responseOrder.length; i++) {
        const aiId = decision.responseOrder[i];
        console.log(`🔍 [DEBUG] Processing aiId: ${aiId}`);
        
        const member = teamMembers.find(m => m.id === aiId);
        const employee = employees.find(emp => emp.id === aiId);
        
        console.log(`🔍 [DEBUG] Found member:`, member ? { id: member.id, name: member.name } : 'NOT FOUND');
        console.log(`🔍 [DEBUG] Found employee:`, employee ? { id: employee.id, name: employee.name } : 'NOT FOUND');
        
        if (!member || !employee) {
          console.log(`🔍 [DEBUG] Skipping aiId ${aiId} - member or employee not found`);
          continue;
        }

        const isPrimary = aiId === decision.primaryResponder;
        const baseDelay = this.config.timing.minThinkingTime;
        const responseDelay = baseDelay + (i * 1500); // Stagger responses

        const plan = {
          aiId,
          decision: {
            shouldRespond: true,
            confidence: isPrimary ? 0.9 : 0.7, // Primary responder gets higher confidence
            responseDelay,
            responseType: (isPrimary ? 'primary' : 'supporting') as 'primary' | 'supporting' | 'questioning' | 'building',
            reasoning: `Orchestrator decision: ${decision.reasoning}`
          },
          scheduledTime: Date.now() + responseDelay,
          dependencies: isPrimary ? [] : [decision.primaryResponder]
        };

        console.log(`🔍 [DEBUG] Created plan for ${aiId}:`, plan);
        plans.push(plan);
      }

      console.log(`🔍 [DEBUG] Final plans array length: ${plans.length}`);

      return plans;

    } catch (error) {
      console.error('❌ [AI Orchestrator] Error, falling back to rule-based system:', error);
      return this.planResponses(messageContent, teamMembers, employees, messageHistory);
    }
  }

  /**
   * Analyze a user message and determine which AIs should respond (rule-based fallback)
   */
  async planResponses(
    messageContent: string,
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messageHistory: ChatMessage[]
  ): Promise<ResponsePlan[]> {
    
    console.log(`🎯 [Rule-Based] Planning responses for message: "${messageContent}"`);
    
    // Build conversation context
    const context = this.buildConversationContext(messageContent, messageHistory, teamMembers);
    
    // 🚨 CRITICAL: If mentions were detected, only mentioned AIs should respond
    if (context.mentionedAIs.length > 0) {
      console.log(`🚨 [RULE-BASED MENTION OVERRIDE] Only mentioned AIs should respond: [${context.mentionedAIs.join(', ')}]`);
      
      const mentionedPlans: ResponsePlan[] = [];
      
      for (let i = 0; i < context.mentionedAIs.length; i++) {
        const aiId = context.mentionedAIs[i];
        const member = teamMembers.find(m => m.id === aiId);
        const employee = employees.find(e => e.id === aiId);
        
        if (!member || !employee) continue;

        const plan: ResponsePlan = {
          aiId,
          decision: {
            shouldRespond: true,
            confidence: 1.0, // Maximum confidence for direct mentions
            responseDelay: i * 1000, // Shorter delay for mentions
            responseType: i === 0 ? 'primary' : 'supporting',
            reasoning: `Directly mentioned by user - rule-based override`
          },
          scheduledTime: Date.now() + (i * 1000),
          dependencies: i > 0 ? [context.mentionedAIs[0]] : []
        };

        mentionedPlans.push(plan);
      }

      console.log(`🚨 [RULE-BASED MENTION OVERRIDE] Generated ${mentionedPlans.length} plans for mentioned AIs only`);
      return mentionedPlans;
    }
    
    // Calculate response decisions for each team member
    const decisions: ResponsePlan[] = [];
    
    for (const member of teamMembers) {
      const employee = employees.find(emp => emp.id === member.id);
      if (!employee) continue;

      const decision = await this.calculateResponseDecision(member, employee, context);
      
      if (decision.shouldRespond) {
        const scheduledTime = Date.now() + decision.responseDelay;
        
        decisions.push({
          aiId: member.id,
          decision,
          scheduledTime,
          dependencies: this.calculateDependencies(member.id, decisions, context)
        });
      }
    }

    // Sort by scheduled time and apply coordination rules
    const coordinatedPlans = this.coordinateResponses(decisions);
    
    console.log('📋 [Team Dynamics] Response plan:', 
      coordinatedPlans.map(plan => ({
        ai: teamMembers.find(m => m.id === plan.aiId)?.name,
        type: plan.decision.responseType,
        delay: `${(plan.scheduledTime - Date.now())}ms`,
        confidence: plan.decision.confidence.toFixed(2)
      }))
    );

    return coordinatedPlans;
  }

  /**
   * Build conversation context for decision making
   */
  private buildConversationContext(
    messageContent: string,
    messageHistory: ChatMessage[],
    teamMembers: TeamMember[]
  ): ConversationContext {
    
    // 🚨 DEBUG: Track conversation context building
    console.log('🧠 [HISTORY DEBUG] Building conversation context');
    console.log('🧠 [HISTORY DEBUG] Message content:', messageContent.substring(0, 100) + '...');
    console.log('🧠 [HISTORY DEBUG] Message history length:', messageHistory.length);
    console.log('🧠 [HISTORY DEBUG] Recent messages:', messageHistory.slice(-5).map(msg => ({
      sender: msg.sender,
      content: msg.content.substring(0, 50) + '...',
      aiEmployee: msg.aiEmployee?.name
    })));
    
    // Extract mentioned AIs
    const mentionedAIs = this.extractMentionedAIs(messageContent, teamMembers);
    
    // Calculate topic relevance for each AI
    const topicRelevance = this.calculateTopicRelevance(messageContent, teamMembers);
    
    // Find recent responders (last 3 messages)
    const recentResponders = messageHistory
      .slice(-3)
      .filter(msg => msg.sender === 'ai' && msg.aiEmployee)
      .map(msg => msg.aiEmployee!.id);

    console.log('🧠 [HISTORY DEBUG] Recent responders:', recentResponders);
    console.log('🧠 [HISTORY DEBUG] Mentioned AIs:', mentionedAIs);
    console.log('🧠 [HISTORY DEBUG] Topic relevance:', topicRelevance);

    // Convert message history to simple format
    const historyContext = messageHistory.map(msg => ({
      role: msg.sender === 'ai' ? 'assistant' as const : 'user' as const,
      content: msg.content,
      aiEmployeeId: msg.aiEmployee?.id
    }));

    console.log('🧠 [HISTORY DEBUG] History context length:', historyContext.length);

    return {
      messageContent,
      messageHistory: historyContext,
      mentionedAIs,
      topicRelevance,
      recentResponders
    };
  }

  /**
   * Calculate whether an AI should respond to a message
   */
  private async calculateResponseDecision(
    member: TeamMember,
    _employee: AIEmployee,
    context: ConversationContext
  ): Promise<ResponseDecision> {
    
    const personality = this.config.personalities[member.id];
    if (!personality) {
      return {
        shouldRespond: false,
        confidence: 0,
        responseDelay: 0,
        responseType: 'primary',
        reasoning: 'No personality configured'
      };
    }

    let responseScore = 0;
    let reasoning = '';

    // Base chattiness score
    responseScore += personality.chattiness * 0.3;
    reasoning += `Base chattiness: ${(personality.chattiness * 0.3).toFixed(2)}; `;

    // Topic relevance boost
    const relevance = context.topicRelevance[member.id] || 0;
    responseScore += relevance * 0.4;
    reasoning += `Topic relevance: ${(relevance * 0.4).toFixed(2)}; `;

    // Mention boost
    if (context.mentionedAIs.includes(member.id)) {
      responseScore += this.config.mentionBonus;
      reasoning += `Mentioned: +${this.config.mentionBonus}; `;
    }

    // Collaboration boost (if others have responded)
    const othersResponded = context.recentResponders.filter(id => id !== member.id).length;
    if (othersResponded > 0) {
      const collaborationBoost = personality.collaboration * this.config.collaborationBonus;
      responseScore += collaborationBoost;
      reasoning += `Collaboration: +${collaborationBoost.toFixed(2)}; `;
    }

    // Recent responder penalty
    if (context.recentResponders.includes(member.id)) {
      responseScore -= 0.3;
      reasoning += `Recent responder: -0.3; `;
    }

    // Expertise confidence boost
    responseScore += personality.expertiseConfidence * 0.2;
    reasoning += `Expertise: +${(personality.expertiseConfidence * 0.2).toFixed(2)}; `;

    // Determine response type
    let responseType: ResponseDecision['responseType'] = 'primary';
    if (othersResponded > 0 && personality.collaboration > 0.7) {
      responseType = 'building';
    } else if (personality.questionTendency > 0.7 && Math.random() < 0.3) {
      responseType = 'questioning';
    } else if (othersResponded > 0) {
      responseType = 'supporting';
    }

    // Calculate response delay based on personality and message complexity
    const baseDelay = this.config.timing.minThinkingTime;
    const maxDelay = this.config.timing.maxThinkingTime;
    const speedFactor = personality.responseSpeed;
    const complexityFactor = Math.min(context.messageContent.length / 200, 1);
    
    const responseDelay = baseDelay + 
      (maxDelay - baseDelay) * (1 - speedFactor) * (0.5 + complexityFactor * 0.5);

    // Dynamic threshold based on message type
    let threshold = 0.4;
    
    // Lower threshold for social messages to encourage team interaction
    const lowerContent = context.messageContent.toLowerCase();
    const socialPatterns = [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'how is everyone', 'whats up', "what's up", 'greetings'
    ];
    const isSocialMessage = socialPatterns.some(pattern => lowerContent.includes(pattern));
    
    if (isSocialMessage) {
      threshold = 0.25; // Much lower threshold for greetings and social interactions
    }

    const shouldRespond = responseScore > threshold;
    const confidence = Math.min(responseScore, 1);

    console.log(`🤖 [${member.name}] Decision: ${shouldRespond ? 'RESPOND' : 'SKIP'} | Score: ${responseScore.toFixed(2)} | Threshold: ${threshold} | ${reasoning}`);

    return {
      shouldRespond,
      confidence,
      responseDelay: Math.round(responseDelay),
      responseType,
      reasoning: `Final score: ${responseScore.toFixed(2)} vs threshold ${threshold} (${reasoning})`
    };
  }

  /**
   * Extract mentioned AI IDs from message content
   */
  private extractMentionedAIs(messageContent: string, teamMembers: TeamMember[]): string[] {
    const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$)/g;
    const mentionedIds: string[] = [];
    let match;

    while ((match = mentionRegex.exec(messageContent)) !== null) {
      const mentionName = match[1];
      
      const matchingMember = teamMembers.find(member => 
        member.name.toLowerCase() === mentionName.toLowerCase()
      );
      
      if (matchingMember) {
        mentionedIds.push(matchingMember.id);
      }
    }

    return mentionedIds;
  }

  /**
   * Calculate topic relevance for each AI based on their role and the message content
   */
  private calculateTopicRelevance(messageContent: string, teamMembers: TeamMember[]): Record<string, number> {
    const relevance: Record<string, number> = {};
    const lowerContent = messageContent.toLowerCase();

    // Define social/greeting patterns that ALL team members should respond to
    const socialPatterns = [
      'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
      'how are you', 'how is everyone', 'whats up', "what's up", 'greetings',
      'thanks everyone', 'thank you all', 'great work', 'nice job', 'well done'
    ];

    // Define keywords for different roles
    const roleKeywords: Record<string, string[]> = {
      'Designer': ['design', 'ui', 'ux', 'interface', 'visual', 'color', 'layout', 'user experience', 'wireframe', 'mockup'],
      'Developer': ['code', 'development', 'programming', 'api', 'database', 'backend', 'frontend', 'bug', 'implementation'],
      'Product Manager': ['product', 'feature', 'requirement', 'roadmap', 'strategy', 'user story', 'priority', 'business'],
      'Marketing': ['marketing', 'campaign', 'brand', 'promotion', 'audience', 'content', 'social media', 'analytics'],
      'Data Scientist': ['data', 'analytics', 'metrics', 'analysis', 'statistics', 'machine learning', 'insights', 'reporting'],
      'Chief Financial Officer': ['finance', 'finances', 'financial', 'budget', 'revenue', 'cost', 'profit', 'investment', 'funding', 'money', 'cash flow', 'expenses', 'accounting', 'valuation'],
      'Chief Legal Officer': ['legal', 'law', 'contract', 'compliance', 'regulation', 'agreement', 'terms', 'liability', 'intellectual property', 'patent', 'trademark', 'privacy', 'gdpr'],
      'Chief Partnership Officer': ['partnership', 'partnerships', 'alliance', 'collaboration', 'joint venture', 'strategic', 'channel', 'integration', 'ecosystem', 'network'],
      'Chief Technology Officer': ['technology', 'tech', 'architecture', 'infrastructure', 'security', 'scalability', 'platform', 'system', 'technical', 'engineering'],
      'Chief Marketing Officer': ['marketing', 'brand', 'campaign', 'promotion', 'audience', 'content', 'social media', 'analytics', 'growth', 'acquisition']
    };

    teamMembers.forEach(member => {
      let score = 0;

      // Check for social/greeting patterns - ALL team members should respond to these
      const isSocialMessage = socialPatterns.some(pattern => lowerContent.includes(pattern));
      if (isSocialMessage) {
        score += 0.6; // High relevance for social interactions
      }

      // Check role-specific keywords
      const keywords = roleKeywords[member.role] || [];
      keywords.forEach(keyword => {
        if (lowerContent.includes(keyword)) {
          score += 0.2;
        }
      });

      // Add base relevance for general questions
      if (lowerContent.includes('how') || lowerContent.includes('what') || lowerContent.includes('should')) {
        score += 0.2;
      }

      // Add base relevance for team-oriented language
      if (lowerContent.includes('team') || lowerContent.includes('everyone') || lowerContent.includes('all')) {
        score += 0.3;
      }

      relevance[member.id] = Math.min(score, 1);
    });

    return relevance;
  }

  /**
   * Calculate dependencies between AI responses
   */
  private calculateDependencies(aiId: string, existingPlans: ResponsePlan[], _context: ConversationContext): string[] {
    const dependencies: string[] = [];
    
    // If this is a building/supporting response, wait for primary responses
    const aiPersonality = this.config.personalities[aiId];
    if (aiPersonality?.collaboration > 0.8) {
      const primaryResponders = existingPlans
        .filter(plan => plan.decision.responseType === 'primary' && plan.aiId !== aiId)
        .map(plan => plan.aiId);
      
      dependencies.push(...primaryResponders);
    }

    return dependencies;
  }

  /**
   * Coordinate responses to prevent overwhelming the user
   */
  private coordinateResponses(plans: ResponsePlan[]): ResponsePlan[] {
    if (plans.length === 0) return [];

    // Sort by confidence and scheduled time
    plans.sort((a, b) => {
      if (Math.abs(a.decision.confidence - b.decision.confidence) > 0.1) {
        return b.decision.confidence - a.decision.confidence;
      }
      return a.scheduledTime - b.scheduledTime;
    });

    // For most messages, only the most relevant AI should respond
    // Exception: social messages where multiple responses are natural
    const highestConfidence = plans[0].decision.confidence;
    const confidenceThreshold = 0.15; // Only include AIs within 0.15 confidence of the top
    
    // Filter to only include the most relevant AIs
    const relevantPlans = plans.filter(plan => 
      (highestConfidence - plan.decision.confidence) <= confidenceThreshold
    );

    // Let the AI orchestrator decide how many should respond - be less restrictive
    let finalPlans = relevantPlans;
    
    // Check if this is a social/greeting message by looking at confidence distribution
    // Social messages tend to have more evenly distributed confidence scores
    const avgConfidence = plans.reduce((sum, plan) => sum + plan.decision.confidence, 0) / plans.length;
    const isSocialMessage = avgConfidence > 0.5 && (highestConfidence - avgConfidence) < 0.2;
    
    if (!isSocialMessage) {
      // For business/technical topics, allow more responses but cap at reasonable limit
      finalPlans = relevantPlans.slice(0, Math.min(4, relevantPlans.length));
    } else {
      // For social messages, allow even more responses
      finalPlans = relevantPlans.slice(0, Math.min(5, relevantPlans.length));
    }

    // Apply timing coordination
    const coordinated: ResponsePlan[] = [];
    let currentTime = Date.now();

    for (const plan of finalPlans) {
      if (coordinated.length >= this.config.maxSimultaneousResponses) {
        // Add delay to prevent too many simultaneous responses
        currentTime += this.config.timing.betweenResponses;
        plan.scheduledTime = Math.max(plan.scheduledTime, currentTime);
      }

      coordinated.push(plan);
    }

    return coordinated;
  }

  /**
   * Update conversation state when an AI starts responding
   */
  markAIResponding(aiId: string): void {
    this.conversationState.activeResponders.add(aiId);
  }

  /**
   * Update conversation state when an AI finishes responding
   */
  markAIFinished(aiId: string): void {
    this.conversationState.activeResponders.delete(aiId);
    this.conversationState.lastResponseTime = Date.now();
  }

  /**
   * Get current conversation state
   */
  getConversationState(): ConversationState {
    return { ...this.conversationState };
  }

  // Utility functions
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private seededRandom(seed: number): () => number {
    let x = seed;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}

// Export a singleton instance (will be reinitialized with API key when needed)
export let teamDynamicsEngine = new NaturalTeamDynamicsEngine();

// Function to reinitialize the engine with OpenAI API key and Supabase credentials
export function initializeTeamDynamicsWithApiKey(
  openaiApiKey: string, 
  supabaseUrl: string, 
  supabaseAnonKey: string, 
  config?: Partial<TeamDynamicsConfig>
) {
  teamDynamicsEngine = new NaturalTeamDynamicsEngine(config, openaiApiKey, supabaseUrl, supabaseAnonKey);
  console.log('🎯 [Team Dynamics] Reinitialized with AI Orchestrator');
} 