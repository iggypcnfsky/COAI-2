import { TeamMember, AIEmployee } from '@/types';

interface OrchestratorDecision {
  shouldRespond: string[]; // Array of AI IDs that should respond
  primaryResponder: string; // The main AI that should lead the response
  reasoning: string;
  responseOrder: string[]; // Order in which AIs should respond
}

/**
 * AI Orchestrator that uses an LLM to decide which team members should respond
 */
export class AIOrchestrator {
  private openaiApiKey: string;
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor(openaiApiKey: string, supabaseUrl: string, supabaseAnonKey: string) {
    this.openaiApiKey = openaiApiKey;
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
  }

  /**
   * Use an LLM to decide which team members should respond to a message
   */
  async decideResponders(
    messageContent: string,
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    conversationHistory: string[]
  ): Promise<OrchestratorDecision> {
    
    const teamDescription = teamMembers.map(member => {
      const employee = employees.find(emp => emp.id === member.id);
      return `- ${member.name}: ${employee?.role || 'Unknown Role'}`;
    }).join('\n');

    const recentHistory = conversationHistory.slice(-6).join('\n');

    const prompt = `You are an intelligent team coordinator. Analyze the conversation and decide which team members should respond to create the most natural, helpful, and engaging interaction.

TEAM MEMBERS:
${teamDescription}

RECENT CONVERSATION:
${recentHistory}

USER MESSAGE: "${messageContent}"

CRITICAL RULES:
1. **DIRECT MENTIONS (@name)**: If the user specifically mentions someone with @name, ONLY that person should respond. This is a direct instruction and overrides all other considerations.
2. **No Mentions**: If no one is specifically mentioned, decide based on expertise and natural conversation flow.
3. **User Addressing**: All team members should address the user as "Boss" in their responses.
4. **TEAM AWARENESS**: When multiple people respond, they will see each other's responses and should build on them, reference them, or add complementary perspectives. This creates natural team dynamics.

Consider:
- Who has the most relevant expertise for this message?
- What would feel like a natural team conversation?
- Are there any direct mentions (@name) that must be included?
- What combination of voices would provide the best value to the user?
- How many responses would feel appropriate for this type of message? (You can choose 1, 2, 3, 4, or even more if it makes sense)
- How can the responses build on each other to create a collaborative discussion?
- Sometimes one expert voice is best, sometimes multiple perspectives add value - trust your judgment

RESPONSE COORDINATION:
- The first responder should provide the primary answer/perspective
- Subsequent responders should build on, complement, or respectfully add to what was said
- Avoid having everyone say the same thing - each should add unique value
- Create a natural flow where team members are aware of and reference each other

Make your decision based on what would happen in a real team conversation. Trust your judgment.

IMPORTANT: You have full control over how many team members respond. There are no artificial limits - choose the number that makes the most sense for the situation.

Respond in this exact JSON format:
{
  "shouldRespond": ["member_name1", "member_name2", "member_name3"],
  "primaryResponder": "member_name1", 
  "reasoning": "Why these specific members should respond and how they will complement each other",
  "responseOrder": ["member_name1", "member_name2", "member_name3"]
}

Only include member names that exist in the team list above.`;

    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          prompt,
          openaiApiKey: this.openaiApiKey
        })
      });

      if (!response.ok) {
        throw new Error(`Orchestrator API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Parse the LLM response
      const decision = JSON.parse(result.content);
      
      // Convert names to IDs
      const shouldRespondIds = decision.shouldRespond
        .map((name: string) => teamMembers.find(m => m.name === name)?.id)
        .filter(Boolean);
      
      const primaryResponderId = teamMembers.find(m => m.name === decision.primaryResponder)?.id;
      
      const responseOrderIds = decision.responseOrder
        .map((name: string) => teamMembers.find(m => m.name === name)?.id)
        .filter(Boolean);

      console.log(`🎯 [AI Orchestrator] Raw LLM Response: ${JSON.stringify(decision, null, 2)}`);
      console.log(`🎯 [AI Orchestrator] Decision: ${decision.shouldRespond.join(', ')} should respond (Primary: ${decision.primaryResponder})`);
      console.log(`🎯 [AI Orchestrator] Reasoning: ${decision.reasoning}`);
      
      // Check for mentions in the message
      const mentionRegex = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(messageContent)) !== null) {
        mentions.push(match[1]);
      }
      console.log(`🎯 [AI Orchestrator] Detected mentions in message: [${mentions.join(', ')}]`);
      
      if (mentions.length > 0) {
        console.log(`🎯 [AI Orchestrator] ⚠️ MENTIONS DETECTED - Should only respond with mentioned people!`);
      }

      return {
        shouldRespond: shouldRespondIds,
        primaryResponder: primaryResponderId || shouldRespondIds[0],
        reasoning: decision.reasoning,
        responseOrder: responseOrderIds
      };

    } catch (error) {
      console.error('❌ [AI Orchestrator] Error:', error);
      
      // Fallback: just pick the first team member
      return {
        shouldRespond: [teamMembers[0].id],
        primaryResponder: teamMembers[0].id,
        reasoning: 'Fallback due to orchestrator error',
        responseOrder: [teamMembers[0].id]
      };
    }
  }
} 