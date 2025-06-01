import { TeamMember, AIEmployee, ChatMessage } from '@/types';
import { teamDynamicsEngine, initializeTeamDynamicsWithApiKey } from './naturalTeamDynamics';
import { ResponsePlan } from '@/types/teamDynamics';

/**
 * Integration layer for Natural Team Dynamics
 * 
 * This module provides the interface between the existing chat system
 * and the Natural Team Dynamics engine, handling the coordination of
 * AI responses in a natural, team-like manner.
 */

interface AIResponseHandler {
  (
    member: TeamMember,
    employee: AIEmployee,
    chatHistory: any[],
    messageId: string,
    onMessageUpdate: (messageId: string, content: string, isComplete: boolean) => void
  ): Promise<string>;
}

interface TeamDynamicsOptions {
  enableNaturalDynamics: boolean;
  fallbackToSequential: boolean;
  debugMode: boolean;
}

/**
 * Enhanced message handler that uses Natural Team Dynamics
 */
export class TeamDynamicsMessageHandler {
  private options: TeamDynamicsOptions;
  private activeResponses: Map<string, Promise<void>> = new Map();

  constructor(options: Partial<TeamDynamicsOptions> = {}) {
    this.options = {
      enableNaturalDynamics: true,
      fallbackToSequential: false,
      debugMode: true,
      ...options
    };
  }

  /**
   * Initialize the team with natural dynamics
   */
  initializeTeam(
    teamMembers: TeamMember[], 
    employees: AIEmployee[], 
    openaiApiKey?: string,
    supabaseUrl?: string,
    supabaseAnonKey?: string
  ): void {
    if (!this.options.enableNaturalDynamics) return;
    
    // 🚨 DEBUG: Track reinitialization calls
    console.log('🔄 [HISTORY DEBUG] initializeTeam called');
    console.log('🔄 [HISTORY DEBUG] Current conversation state before init:', teamDynamicsEngine.getConversationState());
    console.log('🔄 [HISTORY DEBUG] Team members:', teamMembers.map(m => m.name));
    
    // Check if we already have an initialized engine with the same team
    const currentState = teamDynamicsEngine.getConversationState();
    const hasExistingState = currentState.conversationTurn > 0 || currentState.activeResponders.size > 0;
    
    if (hasExistingState) {
      console.log('⚠️ [HISTORY DEBUG] Engine already has conversation state - avoiding full reinitialization');
      // Only reinitialize personalities if needed, don't reset the entire engine
      teamDynamicsEngine.initializePersonalities(teamMembers, employees);
      return;
    }
    
    // Reinitialize with API key and Supabase credentials if provided
    if (openaiApiKey && supabaseUrl && supabaseAnonKey) {
      console.log('🔄 [HISTORY DEBUG] Reinitializing engine with API key - THIS RESETS STATE');
      initializeTeamDynamicsWithApiKey(openaiApiKey, supabaseUrl, supabaseAnonKey);
    }
    
    teamDynamicsEngine.initializePersonalities(teamMembers, employees);
    
    console.log('🔄 [HISTORY DEBUG] Conversation state after init:', teamDynamicsEngine.getConversationState());
    
    if (this.options.debugMode) {
      console.log('🚀 [Team Dynamics] Initialized team with natural dynamics enabled');
    }
  }

  /**
   * Process a user message and coordinate AI responses using Natural Team Dynamics
   */
  async handleUserMessage(
    messageContent: string,
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messageHistory: ChatMessage[],
    aiResponseHandler: AIResponseHandler,
    onMessageAdd: (message: ChatMessage) => void,
    onMessageUpdate: (messageId: string, content: string, isComplete: boolean) => void
  ): Promise<void> {
    
    if (!this.options.enableNaturalDynamics || teamMembers.length === 0) {
      // Fallback to existing sequential behavior
      if (this.options.debugMode) {
        console.log('🔄 [Team Dynamics] Falling back to sequential responses');
      }
      return this.handleSequentialResponses(
        teamMembers, 
        employees, 
        messageHistory, 
        aiResponseHandler, 
        onMessageAdd, 
        onMessageUpdate
      );
    }

    try {
      console.log(`🧠 [Team Dynamics] Processing message: "${messageContent}"`);
      console.log(`🧠 [Team Dynamics] Team members: ${teamMembers.map(m => m.name).join(', ')}`);
      console.log(`🧠 [Team Dynamics] Message history length: ${messageHistory.length}`);
      
      // Plan responses using AI Orchestrator (with fallback to rule-based system)
      const responsePlans = await teamDynamicsEngine.planResponsesWithOrchestrator(
        messageContent,
        teamMembers,
        employees,
        messageHistory
      );

      console.log(`🎯 [Team Dynamics] Generated ${responsePlans.length} response plans`);
      responsePlans.forEach((plan, i) => {
        const member = teamMembers.find(m => m.id === plan.aiId);
        console.log(`🎯 [Team Dynamics] Plan ${i + 1}: ${member?.name} (${plan.decision.responseType}, confidence: ${plan.decision.confidence.toFixed(2)})`);
      });

      if (responsePlans.length === 0) {
        if (this.options.debugMode) {
          console.log('🤐 [Team Dynamics] No AIs decided to respond');
        }
        return;
      }

      // Execute response plans
      await this.executeResponsePlans(
        responsePlans,
        teamMembers,
        employees,
        messageHistory,
        aiResponseHandler,
        onMessageAdd,
        onMessageUpdate
      );

    } catch (error) {
      console.error('❌ [Team Dynamics] Error in natural dynamics:', error);
      console.error('❌ [Team Dynamics] Error details:', error instanceof Error ? error.message : String(error), error instanceof Error ? error.stack : '');
      
      if (this.options.fallbackToSequential) {
        console.log('🔄 [Team Dynamics] Falling back to sequential responses due to error');
        return this.handleSequentialResponses(
          teamMembers,
          employees,
          messageHistory,
          aiResponseHandler,
          onMessageAdd,
          onMessageUpdate
        );
      } else {
        console.log('❌ [Team Dynamics] No fallback enabled - throwing error');
        throw error;
      }
    }
  }

  /**
   * Execute the planned AI responses with proper timing and coordination
   */
  private async executeResponsePlans(
    plans: ResponsePlan[],
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messageHistory: ChatMessage[],
    aiResponseHandler: AIResponseHandler,
    onMessageAdd: (message: ChatMessage) => void,
    onMessageUpdate: (messageId: string, content: string, isComplete: boolean) => void
  ): Promise<void> {
    
    if (this.options.debugMode) {
      console.log(`🎯 [Team Dynamics] Executing ${plans.length} response plans sequentially to maintain conversation context`);
    }

    // Track the evolving message history as each AI responds
    let currentMessageHistory = [...messageHistory];

    // Execute responses sequentially to maintain conversation context
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      
      if (this.options.debugMode) {
        const member = teamMembers.find(m => m.id === plan.aiId);
        console.log(`📝 [Team Dynamics] ${member?.name} responding (${i + 1}/${plans.length})`);
      }

      try {
        // Execute this response and capture the result for the next AI
        const responseResult = await this.executeIndividualResponseWithCapture(
          plan,
          teamMembers,
          employees,
          currentMessageHistory,
          aiResponseHandler,
          onMessageAdd,
          onMessageUpdate
        );

        // Add the completed response to the message history for the next AI
        if (responseResult) {
          currentMessageHistory = [...currentMessageHistory, responseResult];
          
          if (this.options.debugMode) {
            console.log(`✅ [Team Dynamics] Added ${responseResult.aiEmployee?.name}'s response to context for next AI`);
          }
        }

        // Mark AI as finished
        teamDynamicsEngine.markAIFinished(plan.aiId);

        // Add a small delay between responses to feel more natural
        if (i < plans.length - 1) {
          await this.sleep(500 + Math.random() * 1000); // 0.5-1.5 second delay
        }

      } catch (error) {
        console.error(`❌ [Team Dynamics] Error executing response for ${plan.aiId}:`, error);
        teamDynamicsEngine.markAIFinished(plan.aiId);
      }
    }

    if (this.options.debugMode) {
      console.log('✅ [Team Dynamics] All planned responses completed sequentially');
    }
  }

  /**
   * Execute a single AI response and return the completed message for conversation history
   */
  private async executeIndividualResponseWithCapture(
    plan: ResponsePlan,
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messageHistory: ChatMessage[],
    aiResponseHandler: AIResponseHandler,
    onMessageAdd: (message: ChatMessage) => void,
    onMessageUpdate: (messageId: string, content: string, isComplete: boolean) => void
  ): Promise<ChatMessage | null> {
    
    const member = teamMembers.find(m => m.id === plan.aiId);
    const employee = employees.find(e => e.id === plan.aiId);
    
    if (!member || !employee) {
      console.error(`❌ [Team Dynamics] Could not find member/employee for ${plan.aiId}`);
      return null;
    }

    try {
      // Wait for dependencies to complete
      if (plan.dependencies.length > 0) {
        const dependencyPromises = plan.dependencies
          .map(depId => this.activeResponses.get(depId))
          .filter(promise => promise !== undefined);
        
        if (dependencyPromises.length > 0) {
          if (this.options.debugMode) {
            console.log(`⏳ [Team Dynamics] ${member.name} waiting for dependencies...`);
          }
          await Promise.allSettled(dependencyPromises);
        }
      }

      // Wait for scheduled time
      const currentTime = Date.now();
      const delay = Math.max(0, plan.scheduledTime - currentTime);
      
      if (delay > 0) {
        if (this.options.debugMode) {
          console.log(`⏰ [Team Dynamics] ${member.name} waiting ${delay}ms before responding`);
        }
        await this.sleep(delay);
      }

      // Mark AI as responding
      teamDynamicsEngine.markAIResponding(plan.aiId);

      if (this.options.debugMode) {
        console.log(`💬 [Team Dynamics] ${member.name} starting ${plan.decision.responseType} response (confidence: ${plan.decision.confidence.toFixed(2)})`);
        console.log(`🧠 [Team Dynamics] ${member.name} sees ${messageHistory.length} messages in context (including previous AI responses)`);
      }

      // Prepare chat history for this AI - this now includes previous AI responses from this turn
      const chatHistory = this.prepareChatHistory(messageHistory);

      // Generate message ID
      const messageId = `${Date.now()}-${plan.aiId}-dynamics`;

      // Create initial message
      const initialMessage: ChatMessage = {
        id: messageId,
        content: '',
        sender: 'ai',
        timestamp: new Date(),
        isLoading: true,
        aiEmployee: {
          id: employee.id,
          name: employee.name,
          role: employee.role,
          profileImage: employee.profileImage,
          model: member.model,
        },
      };

      // Add message to UI
      onMessageAdd(initialMessage);

      // Execute the AI response
      const responseContent = await aiResponseHandler(
        member,
        employee,
        chatHistory,
        messageId,
        onMessageUpdate
      );

      // Mark response as complete
      onMessageUpdate(messageId, responseContent, true);

      if (this.options.debugMode) {
        console.log(`✅ [Team Dynamics] ${member.name} completed response: "${responseContent.substring(0, 100)}..."`);
      }

      // Return the completed message for conversation history
      return {
        id: messageId,
        content: responseContent,
        sender: 'ai',
        timestamp: new Date(),
        isLoading: false,
        aiEmployee: {
          id: employee.id,
          name: employee.name,
          role: employee.role,
          profileImage: employee.profileImage,
          model: member.model,
        },
      };

    } catch (error) {
      console.error(`❌ [Team Dynamics] Error in ${member.name} response:`, error);
      teamDynamicsEngine.markAIFinished(plan.aiId);
      return null;
    }
  }



  /**
   * Fallback to sequential responses (existing behavior)
   */
  private async handleSequentialResponses(
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messageHistory: ChatMessage[],
    aiResponseHandler: AIResponseHandler,
    onMessageAdd: (message: ChatMessage) => void,
    onMessageUpdate: (messageId: string, content: string, isComplete: boolean) => void
  ): Promise<void> {
    
    // This would call the existing sequential logic
    // For now, we'll implement a simple version
    const chatHistory = this.prepareChatHistory(messageHistory);

    for (let i = 0; i < teamMembers.length; i++) {
      const member = teamMembers[i];
      const employee = employees.find(emp => emp.id === member.id);
      if (!employee) continue;

      const messageId = `${Date.now()}-${member.id}-sequential-${i}`;
      
      const initialMessage: ChatMessage = {
        id: messageId,
        content: '',
        sender: 'ai',
        timestamp: new Date(),
        isLoading: true,
        aiEmployee: {
          id: employee.id,
          name: employee.name,
          role: employee.role,
          profileImage: employee.profileImage,
          model: member.model,
        },
      };

      onMessageAdd(initialMessage);

      try {
        const responseContent = await aiResponseHandler(
          member,
          employee,
          chatHistory,
          messageId,
          onMessageUpdate
        );

        onMessageUpdate(messageId, responseContent, true);

        // Add to chat history for next AI
        chatHistory.push({
          role: 'assistant',
          content: responseContent,
        });

        // Add delay between responses
        if (i < teamMembers.length - 1) {
          await this.sleep(2000);
        }

      } catch (error) {
        console.error(`❌ [Sequential] Error in ${member.name} response:`, error);
      }
    }
  }

  /**
   * Prepare chat history for AI consumption
   */
  private prepareChatHistory(messageHistory: ChatMessage[]): any[] {
    return messageHistory
      .filter(msg => !msg.id.startsWith('demo'))
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content,
        ...(msg.image && { image: msg.image }),
      }));
  }

  /**
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if natural dynamics is enabled
   */
  isNaturalDynamicsEnabled(): boolean {
    return this.options.enableNaturalDynamics;
  }

  /**
   * Update configuration
   */
  updateOptions(newOptions: Partial<TeamDynamicsOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current conversation state
   */
  getConversationState() {
    return teamDynamicsEngine.getConversationState();
  }
}

// Export singleton instance
export const teamDynamicsHandler = new TeamDynamicsMessageHandler(); 