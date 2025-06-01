import React from 'react';
import { teamDynamicsHandler } from '@/lib/teamDynamicsIntegration';
import { TeamMember, AIEmployee, ChatMessage } from '@/types';
import { streamChat } from '@/lib/supabase';

interface UseTeamDynamicsOptions {
  enableNaturalDynamics?: boolean;
  debugMode?: boolean;
}

interface UseTeamDynamicsReturn {
  isNaturalDynamicsEnabled: boolean;
  handleUserMessageWithDynamics: (
    content: string,
    attachedImage: any,
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messages: ChatMessage[],
    openaiApiKey: string,
    isApiKeyValid: boolean,
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setIsWaitingForStream: React.Dispatch<React.SetStateAction<boolean>>,
    originalHandler: (content: string, attachedImage?: any) => Promise<void>
  ) => Promise<void>;
  getConversationState: () => any;
  updateOptions: (options: Partial<UseTeamDynamicsOptions>) => void;
}

/**
 * React hook for Natural Team Dynamics
 * 
 * This hook provides the Natural Team Dynamics functionality that can be
 * integrated into the existing Layout component without modifying its interface.
 */
export const useTeamDynamics = (options: UseTeamDynamicsOptions = {}): UseTeamDynamicsReturn => {
  const [config, setConfig] = React.useState({
    enableNaturalDynamics: true,
    debugMode: true,
    ...options
  });

  // Initialize team dynamics handler with options
  React.useEffect(() => {
    teamDynamicsHandler.updateOptions({
      enableNaturalDynamics: config.enableNaturalDynamics,
      debugMode: config.debugMode,
      fallbackToSequential: false  // Don't fall back - force team awareness
    });
  }, [config]);

  /**
   * AI response handler that works with the streaming API
   */
  const createAIResponseHandler = React.useCallback((
    openaiApiKey: string,
    _setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    _setIsWaitingForStream: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    return async (
      member: TeamMember,
      employee: AIEmployee,
      chatHistory: any[],
      messageId: string,
      onMessageUpdate: (messageId: string, content: string, isComplete: boolean) => void
    ): Promise<string> => {
      
      try {
        // Enhance the system prompt to encourage team interaction
        const basePrompt = member.systemPrompt || `You are a ${employee.role}. Always respond according to your role.`;
        
        // 🚨 DEBUG: Log the system prompt construction in Natural Team Dynamics
        console.log(`🚨 [NATURAL DYNAMICS PROMPT DEBUG] ${employee.name}:`);
        console.log(`🚨 [NATURAL DYNAMICS PROMPT DEBUG] - member.systemPrompt: "${member.systemPrompt}"`);
        console.log(`🚨 [NATURAL DYNAMICS PROMPT DEBUG] - basePrompt: "${basePrompt}"`);
        
        const teamInteractionPrompt = `

TEAM INTERACTION GUIDELINES:
- You are part of a collaborative team. Stay true to your personality and role as defined in your system prompt.
- Respond to messages according to your character - if you're meant to be angry, stay angry; if friendly, stay friendly.
- Your personality should remain consistent with your core character traits.
- IMPORTANT: Always address the user as "Boss" when speaking to them directly. Never use other team member names when addressing the user.

TEAM COLLABORATION - CRITICAL:
- ALWAYS check if other team members have already responded to this message in the conversation history.
- If colleagues have already provided responses, DO NOT repeat their work - instead build on it.
- Start your response by acknowledging what others have said: "Building on [Name]'s excellent framework..." or "I agree with [Name]'s approach, and I'd add..."
- If you're the first to respond, provide a comprehensive answer. If others have responded, focus on adding unique value.
- Reference specific points from colleagues' responses to show you're listening and collaborating.
- Create a natural team discussion where ideas flow and build upon each other.
- If you disagree with a colleague, do so respectfully: "While I appreciate [Name]'s perspective on X, I think we should also consider..."`;

        const finalPrompt = basePrompt + teamInteractionPrompt;
        
        console.log(`🚨 [NATURAL DYNAMICS PROMPT DEBUG] - finalPrompt length: ${finalPrompt.length}`);
        console.log(`🚨 [NATURAL DYNAMICS PROMPT DEBUG] - finalPrompt: "${finalPrompt}"`);

        if (config.debugMode) {
          console.log(`🤖 [AI Response] ${employee.name} starting response...`);
        }
        
        const response = await streamChat(
          chatHistory,
          employee.role,
          member.model,
          finalPrompt,
          employee.name,
          openaiApiKey
        );

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error('No reader available');

        let accumulatedContent = '';
        let streamCompleted = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') {
                if (data === '[DONE]') streamCompleted = true;
                continue;
              }

              try {
                // Skip empty or malformed data
                if (!data || data.length < 2) {
                  continue;
                }
                
                const parsed = JSON.parse(data);
                
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].finish_reason) {
                  streamCompleted = true;
                  break;
                }
                
                const content = parsed.choices?.[0]?.delta?.content || parsed.content;
                if (content) {
                  accumulatedContent += content;
                  onMessageUpdate(messageId, accumulatedContent, false);
                }

                if (parsed.done) {
                  streamCompleted = true;
                  break;
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
                console.error('Problematic data:', data);
                // Continue processing other chunks instead of failing completely
                continue;
              }
            }
          }
          
          if (streamCompleted) break;
        }

        if (config.debugMode) {
          console.log(`✅ [AI Response] ${employee.name} completed response`);
        }
        
        return accumulatedContent;

      } catch (error) {
        console.error(`❌ [AI Response] Error for ${employee.name}:`, error);
        throw error;
      }
    };
  }, [config.debugMode]);

  /**
   * Enhanced message handler that uses Natural Team Dynamics
   */
  const handleUserMessageWithDynamics = React.useCallback(async (
    content: string,
    attachedImage: any,
    teamMembers: TeamMember[],
    employees: AIEmployee[],
    messages: ChatMessage[],
    openaiApiKey: string,
    isApiKeyValid: boolean,
    _setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    _setIsWaitingForStream: React.Dispatch<React.SetStateAction<boolean>>,
    originalHandler: (content: string, attachedImage?: any) => Promise<void>
  ) => {
    
    // 🚨 DEBUG: Track document context in useTeamDynamics hook
    console.log('🚨 [DOCUMENT DEBUG] === USETEAMDYNAMICS HANDLER DEBUG ===');
    console.log('🚨 [DOCUMENT DEBUG] Content received in useTeamDynamics:', content.substring(0, 200) + '...');
    console.log('🚨 [DOCUMENT DEBUG] Contains DOCUMENT_CONTEXT in useTeamDynamics:', content.includes('<!-- DOCUMENT_CONTEXT:'));
    if (content.includes('<!-- DOCUMENT_CONTEXT:')) {
      const contextMatch = content.match(/<!-- DOCUMENT_CONTEXT:[\s\S]*? -->/);
      if (contextMatch) {
        console.log('🚨 [DOCUMENT DEBUG] Document context found in useTeamDynamics:', contextMatch[0].substring(0, 300) + '...');
      }
    }
    
    // Check if natural dynamics is enabled and we have team members
    if (!config.enableNaturalDynamics || teamMembers.length === 0) {
      if (config.debugMode) {
        console.log('🔄 [Team Dynamics] Using original handler');
      }
      return originalHandler(content, attachedImage);
    }

    // Check API key
    if (!isApiKeyValid) {
      console.error('❌ No OpenAI API key provided');
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        content: '⚠️ Please enter your OpenAI API key in the header to enable AI responses.',
        sender: 'ai',
        timestamp: new Date(),
        aiEmployee: {
          id: 'system',
          name: 'System',
          role: 'System',
          profileImage: '/coai-logo.png',
          model: 'system',
        },
      };
      _setMessages(prev => [...prev, errorMessage]);
      return;
    }

    // Add user message
    const userMessageId = Date.now().toString();
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      content: content || (attachedImage ? `Shared an image: ${attachedImage.name}` : ''),
      sender: 'user',
      timestamp: new Date(),
      ...(attachedImage && { image: attachedImage }),
    };
    
    // 🚨 DEBUG: Track document context in new user message
    console.log('🚨 [DOCUMENT DEBUG] === NEW USER MESSAGE DEBUG ===');
    console.log('🚨 [DOCUMENT DEBUG] New user message content:', newUserMessage.content.substring(0, 200) + '...');
    console.log('🚨 [DOCUMENT DEBUG] New user message contains DOCUMENT_CONTEXT:', newUserMessage.content.includes('<!-- DOCUMENT_CONTEXT:'));
    if (newUserMessage.content.includes('<!-- DOCUMENT_CONTEXT:')) {
      const contextMatch = newUserMessage.content.match(/<!-- DOCUMENT_CONTEXT:[\s\S]*? -->/);
      if (contextMatch) {
        console.log('🚨 [DOCUMENT DEBUG] Document context in new user message:', contextMatch[0].substring(0, 300) + '...');
      }
    }
    
    _setMessages((prev: ChatMessage[]) => [...prev, newUserMessage]);

    // Initialize team dynamics with current team and API key
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    teamDynamicsHandler.initializeTeam(teamMembers, employees, openaiApiKey, supabaseUrl, supabaseAnonKey);

    // Create AI response handler
    const aiResponseHandler = createAIResponseHandler(
      openaiApiKey,
      _setMessages,
      _setIsWaitingForStream
    );

    // Create message update callback
    const onMessageUpdate = (messageId: string, content: string, isComplete: boolean) => {
      _setMessages((prev: ChatMessage[]) => prev.map((msg: ChatMessage) =>
        msg.id === messageId
          ? {
              ...msg,
              content,
              isLoading: !isComplete,
            }
          : msg
      ));
    };

    // Create message add callback
    const onMessageAdd = (message: ChatMessage) => {
      _setMessages((prev: ChatMessage[]) => [...prev, message]);
      // Hide waiting spinner when first AI message is added
      _setIsWaitingForStream(false);
    };

    // Set loading state
    _setIsWaitingForStream(true);

    try {
      // Use Natural Team Dynamics to handle the message
      const finalMessages = [...messages, newUserMessage];
      
      // 🚨 DEBUG: Track document context in final message array
      console.log('🚨 [DOCUMENT DEBUG] === FINAL MESSAGE ARRAY DEBUG ===');
      console.log('🚨 [DOCUMENT DEBUG] Final messages array length:', finalMessages.length);
      const lastUserMsg = finalMessages.filter(msg => msg.sender === 'user').pop();
      if (lastUserMsg) {
        console.log('🚨 [DOCUMENT DEBUG] Last user message in final array:', lastUserMsg.content.substring(0, 200) + '...');
        console.log('🚨 [DOCUMENT DEBUG] Last user message contains DOCUMENT_CONTEXT:', lastUserMsg.content.includes('<!-- DOCUMENT_CONTEXT:'));
        if (lastUserMsg.content.includes('<!-- DOCUMENT_CONTEXT:')) {
          const contextMatch = lastUserMsg.content.match(/<!-- DOCUMENT_CONTEXT:[\s\S]*? -->/);
          if (contextMatch) {
            console.log('🚨 [DOCUMENT DEBUG] Document context in final message array:', contextMatch[0].substring(0, 300) + '...');
          }
        }
      }
      
      await teamDynamicsHandler.handleUserMessage(
        content,
        teamMembers,
        employees,
        finalMessages, // Include the new user message
        aiResponseHandler,
        onMessageAdd,
        onMessageUpdate
      );
    } catch (error) {
      console.error('❌ [Team Dynamics] Error in enhanced message handler:', error);
      // Fallback to original handler
      return originalHandler(content, attachedImage);
    } finally {
      _setIsWaitingForStream(false);
    }
  }, [config, createAIResponseHandler]);

  /**
   * Get current conversation state from the team dynamics engine
   */
  const getConversationState = React.useCallback(() => {
    return teamDynamicsHandler.getConversationState();
  }, []);

  /**
   * Update configuration options
   */
  const updateOptions = React.useCallback((newOptions: Partial<UseTeamDynamicsOptions>) => {
    setConfig(prev => ({ ...prev, ...newOptions }));
  }, []);

  return {
    isNaturalDynamicsEnabled: config.enableNaturalDynamics,
    handleUserMessageWithDynamics,
    getConversationState,
    updateOptions
  };
}; 