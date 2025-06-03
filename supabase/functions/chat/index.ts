import OpenAI from 'npm:openai@4.28.0';
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3';

// CORS headers embedded in the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};

const SYSTEM_PROMPT = `You are a team member.`;

// Model provider mapping
const MODEL_PROVIDERS = {
  // OpenAI models
  'gpt-4.1-nano': 'openai',
  'o4-mini': 'openai',
  'o3': 'openai',
  'o1': 'openai',
  'gpt-4.1': 'openai',
  'gpt-4o': 'openai',
  'chatgpt-4o-latest': 'openai',
  
  // Anthropic Claude models
  'claude-3-5-sonnet': 'anthropic',
  'claude-4-sonnet': 'anthropic',
  'claude-4-opus': 'anthropic',
  
  // Perplexity models
  'sonar': 'perplexity',
  'sonar-pro': 'perplexity',
  'sonar-reasoning': 'perplexity',
  'sonar-reasoning-pro': 'perplexity',
} as const;

// Anthropic model name mapping
const ANTHROPIC_MODEL_MAP = {
  'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
  'claude-4-sonnet': 'claude-sonnet-4-20250514',
  'claude-4-opus': 'claude-opus-4-20250514',
} as const;

// Token estimation and context window management utilities
function estimateTokens(text: string): number {
  if (!text) return 0;
  
  const baseTokens = Math.ceil(text.length / 4);
  const overhead = Math.ceil(baseTokens * 0.1); // 10% overhead
  
  return baseTokens + overhead;
}

function estimateMessageTokens(message: { role: string; content: string | any; image?: any }): number {
  let tokens = 0;
  
  // Handle content that might be an array (for vision models)
  const contentText = Array.isArray(message.content) 
    ? message.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
    : message.content;
  
  tokens += estimateTokens(contentText);
  tokens += estimateTokens(message.role);
  
  // Image tokens
  if (message.image || (Array.isArray(message.content) && message.content.some(c => c.type === 'image_url'))) {
    tokens += 800; // Rough estimate for images
  }
  
  tokens += 10; // Message structure overhead
  
  return tokens;
}

function trimMessagesToTokenLimit(
  messages: Array<{ role: string; content: string | any; image?: any }>,
  maxTokens: number = 40000,
  systemPromptTokens: number = 2000
): Array<{ role: string; content: string | any; image?: any }> {
  if (messages.length === 0) return messages;
  
  const availableTokens = maxTokens - systemPromptTokens;
  let currentTokens = 0;
  const trimmedMessages: Array<{ role: string; content: string | any; image?: any }> = [];
  
  // Start from the most recent message and work backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateMessageTokens(message);
    
    if (currentTokens + messageTokens > availableTokens) {
      break;
    }
    
    currentTokens += messageTokens;
    trimmedMessages.unshift(message);
  }
  
  // Always include at least the last message
  if (trimmedMessages.length === 0 && messages.length > 0) {
    trimmedMessages.push(messages[messages.length - 1]);
  }
  
  return trimmedMessages;
}

function getContextInfo(
  messages: Array<{ role: string; content: string | any; image?: any }>,
  maxTokens: number = 40000,
  systemPromptTokens: number = 2000
) {
  const totalTokens = messages.reduce((total, msg) => total + estimateMessageTokens(msg), 0);
  const availableTokens = maxTokens - systemPromptTokens;
  const trimmedMessages = trimMessagesToTokenLimit(messages, maxTokens, systemPromptTokens);
  const trimmedTokens = trimmedMessages.reduce((total, msg) => total + estimateMessageTokens(msg), 0);
  
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
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { messages, role, model, employeePrompt, employeeName, openaiApiKey, anthropicApiKey, perplexityApiKey } = await req.json();
    
    // Determine which provider to use based on the model
    const provider = MODEL_PROVIDERS[model as keyof typeof MODEL_PROVIDERS];
    if (!provider) {
      return new Response(JSON.stringify({
        error: `Unsupported model: ${model}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Validate API key for the required provider
    let apiKey: string;
    switch (provider) {
      case 'openai':
        if (!openaiApiKey) {
          return new Response(JSON.stringify({
            error: 'OpenAI API key is required for this model'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        apiKey = openaiApiKey;
        break;
      case 'anthropic':
        if (!anthropicApiKey) {
          return new Response(JSON.stringify({
            error: 'Anthropic API key is required for Claude models'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        apiKey = anthropicApiKey;
        break;
      case 'perplexity':
        if (!perplexityApiKey) {
          return new Response(JSON.stringify({
            error: 'Perplexity API key is required for Sonar models'
          }), {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
        apiKey = perplexityApiKey;
        break;
      default:
        return new Response(JSON.stringify({
          error: `Unsupported provider: ${provider}`
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
    }
    
    // Initialize the appropriate client
    let client: any;
    switch (provider) {
      case 'openai':
        client = new OpenAI({
          apiKey: apiKey
        });
        break;
      case 'anthropic':
        client = new Anthropic({
          apiKey: apiKey
        });
        break;
      case 'perplexity':
        // Perplexity uses OpenAI-compatible API
        client = new OpenAI({
          apiKey: apiKey,
          baseURL: 'https://api.perplexity.ai'
        });
        break;
    }
    // 🚨 ENHANCED DEBUG: Track edge function calls
    const timestamp = new Date().toISOString();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🚨 [EDGE FUNCTION CALL] ${timestamp} - Request ID: ${requestId}`);
    console.log(`🚨 [${requestId}] Employee: ${employeeName || 'UNKNOWN'} (${role})`);
    console.log(`🚨 [${requestId}] Model: ${model}`);
    console.log(`🚨 [${requestId}] Messages in context: ${messages?.length || 0}`);
    console.log(`🚨 [${requestId}] Has employeePrompt: ${!!employeePrompt}`);
    
    // DEBUG: Log all received data
    console.log(`[DEBUG] Full request data:`, {
      requestId,
      role,
      model,
      employeeName: employeeName || 'MISSING!',
      employeePrompt: employeePrompt ? `${employeePrompt.substring(0, 200)}...` : 'MISSING!',
      messagesCount: messages?.length || 0,
      hasOpenAIKey: !!openaiApiKey,
      openaiKeyLength: openaiApiKey?.length || 0
    });
    // ENHANCED DEBUG: Log the actual employeePrompt length and content
    if (employeePrompt) {
      console.log(`[DEBUG] employeePrompt received - Length: ${employeePrompt.length} chars`);
      console.log(`[DEBUG] employeePrompt preview: "${employeePrompt.substring(0, 500)}..."`);
    } else {
      console.log(`[DEBUG] employeePrompt is NULL/UNDEFINED/EMPTY`);
    }
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({
        error: 'Missing or invalid messages array'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // WARNING: If no employeePrompt provided, log it
    if (!employeePrompt) {
      console.log(`[WARNING] No employeePrompt received for ${role}! Using fallback.`);
    }
    // Map model names for different providers
    let actualModel = model;
    if (provider === 'anthropic') {
      actualModel = ANTHROPIC_MODEL_MAP[model as keyof typeof ANTHROPIC_MODEL_MAP] || model;
    }
    console.log(`[${role}] Model mapping: ${model} -> ${actualModel} (provider: ${provider})`);
    // 🔍 ENHANCED DEBUG: Log the conversation context this AI is receiving
    console.log(`🔍 [${requestId}] [${employeeName}] Received ${messages.length} messages in context:`);
    console.log(`🔍 [${requestId}] [${employeeName}] Employee prompt: ${employeePrompt ? employeePrompt.substring(0, 100) + '...' : 'NOT PROVIDED'}`);
    
    // Log each message with more detail
    messages.forEach((msg, index)=>{
      const msgPreview = msg.content.substring(0, 150);
      console.log(`🔍 [${requestId}]   ${index + 1}. ${msg.role}: "${msgPreview}${msg.content.length > 150 ? '...' : ''}" ${msg.image ? '🖼️ [HAS IMAGE]' : ''}`);
    });
    
    // 🚨 CRITICAL: Check if this AI is seeing other AI responses in the same conversation
    const allAssistantMessages = messages.filter(msg => msg.role === 'assistant');
    console.log(`🚨 [${requestId}] [${employeeName}] SEES ${allAssistantMessages.length} PREVIOUS AI RESPONSES:`);
    allAssistantMessages.forEach((msg, index) => {
      console.log(`🚨 [${requestId}]   AI Response ${index + 1}: "${msg.content.substring(0, 100)}..."`);
    });
    // Analyze if there are previous AI responses in this conversation
    const userMessages = messages.filter((msg)=>msg.role === 'user');
    const assistantMessages = messages.filter((msg)=>msg.role === 'assistant');
    const latestUserMessage = userMessages[userMessages.length - 1];
    // Find AI responses that came after the latest user message
    const aiResponsesAfterLatestUser: any[] = [];
    
    // Find the index of the latest user message
    let latestUserIndex = -1;
    for(let i = messages.length - 1; i >= 0; i--){
      if (messages[i].role === 'user' && messages[i].content === latestUserMessage?.content) {
        latestUserIndex = i;
        break;
      }
    }
    
    // Collect all assistant messages that come after the latest user message
    if (latestUserIndex !== -1) {
      for(let i = latestUserIndex + 1; i < messages.length; i++){
        if (messages[i].role === 'assistant') {
          aiResponsesAfterLatestUser.push(messages[i]);
        }
      }
    }
    console.log(`🔍 [DEBUG] [${role}] Found ${aiResponsesAfterLatestUser.length} AI responses after latest user message`);
    console.log(`🔍 [DEBUG] [${role}] Latest user message: "${latestUserMessage?.content?.substring(0, 100)}..."`);
    console.log(`🔍 [DEBUG] [${role}] AI responses found:`, aiResponsesAfterLatestUser.map((msg, i)=>`${i + 1}. "${msg.content.substring(0, 50)}..."`));
    // Build the final system message - use employee prompt as-is without artificial additions
    const systemMessage = {
      role: 'system',
      content: employeePrompt || `${SYSTEM_PROMPT}\n\nYou are a ${role}.`
    };
    // DEBUG: Log the final system prompt being used
    console.log(`[DEBUG] Final system prompt for ${role}:`, systemMessage.content.substring(0, 300) + '...');
    console.log(`[DEBUG] Using employeePrompt: ${employeePrompt ? 'YES' : 'NO'}`);
    console.log(`[DEBUG] System prompt construction:`);
    console.log(`[DEBUG] - employeePrompt exists: ${!!employeePrompt}`);
    console.log(`[DEBUG] - Final system message length: ${systemMessage.content.length}`);
    console.log(`[DEBUG] - Full system prompt (first 1000 chars): "${systemMessage.content.substring(0, 1000)}..."`);
    
    // 🎯 CONTEXT WINDOW MANAGEMENT: Trim messages to fit within token limits
    const originalMessages = [...messages];
    const trimmedMessages = trimMessagesToTokenLimit(messages, 40000, 2000);
    
    // 🔍 DEBUG: Log context window optimization
    const contextInfo = getContextInfo(originalMessages, 40000, 2000);
    console.log(`🎯 [EDGE FUNCTION - CONTEXT WINDOW] Optimized chat history for ${employeeName}:`, {
      originalMessages: contextInfo.originalMessageCount,
      trimmedMessages: contextInfo.trimmedMessageCount,
      messagesRemoved: contextInfo.messagesRemoved,
      originalTokens: contextInfo.originalTokens,
      trimmedTokens: contextInfo.trimmedTokens,
      utilization: `${contextInfo.utilizationPercent}%`,
      maxTokens: contextInfo.maxTokens
    });

    // Transform messages to include image data for vision models
    const transformedMessages = trimmedMessages.map((msg, index) => {
      if (msg.image && msg.image.base64) {
        console.log(`🖼️ [DEBUG] [${role}] Transforming message ${index + 1} with image:`, {
          hasImage: !!msg.image,
          imageType: msg.image.type,
          imageName: msg.image.name,
          base64Length: msg.image.base64?.length || 0
        });
        
        return {
          role: msg.role,
          content: [
            {
              type: "text",
              text: msg.content
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${msg.image.type};base64,${msg.image.base64}`
              }
            }
          ]
        };
      }
      return msg;
    });

    // DEBUG: Log how many messages have images
    const imagesCount = transformedMessages.filter(msg => 
      Array.isArray(msg.content) && msg.content.some(c => c.type === 'image_url')
    ).length;
    console.log(`🖼️ [DEBUG] [${role}] Transformed ${imagesCount} messages with images for OpenAI`);

    // Helper function to ensure proper message alternation for Perplexity
    function ensureMessageAlternation(messages: any[]): any[] {
      if (messages.length === 0) return messages;
      
      const alternatingMessages: any[] = [];
      let lastRole = '';
      
      for (const message of messages) {
        // Skip consecutive messages with the same role (except for the first message)
        if (message.role === lastRole && alternatingMessages.length > 0) {
          // Merge content if both are strings, otherwise skip
          if (typeof message.content === 'string' && typeof alternatingMessages[alternatingMessages.length - 1].content === 'string') {
            alternatingMessages[alternatingMessages.length - 1].content += '\n\n' + message.content;
          }
          continue;
        }
        
        alternatingMessages.push(message);
        lastRole = message.role;
      }
      
      return alternatingMessages;
    }

    // Helper function to ensure conversation ends with user message for Perplexity
    function ensureEndsWithUser(messages: any[]): any[] {
      if (messages.length === 0) return messages;
      
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        return messages;
      }
      
      // If last message is not from user, add a continuation prompt
      return [
        ...messages,
        {
          role: 'user',
          content: 'Please continue the conversation.'
        }
      ];
    }

    // Create stream based on provider
    let stream: any;
    
    if (provider === 'anthropic') {
      // Transform messages for Anthropic format
      const anthropicMessages = transformedMessages.map(msg => {
        if (Array.isArray(msg.content)) {
          // Handle image content for Anthropic
          return {
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content.map((item: any) => {
              if (item.type === 'image_url') {
                // Extract base64 data from data URL
                const base64Data = item.image_url.url.split(',')[1];
                const mimeType = item.image_url.url.split(';')[0].split(':')[1];
                return {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType,
                    data: base64Data
                  }
                };
              }
              return item;
            })
          };
        }
        return {
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        };
      });

      stream = await client.messages.stream({
        model: actualModel,
        max_tokens: 4000,
        system: systemMessage.content,
        messages: anthropicMessages
      });
    } else {
      // OpenAI and Perplexity (OpenAI-compatible)
      let finalMessages = [systemMessage, ...transformedMessages];
      
      // For Perplexity, ensure strict message alternation and ends with user
      if (provider === 'perplexity') {
        let perplexityMessages = ensureMessageAlternation(transformedMessages);
        perplexityMessages = ensureEndsWithUser(perplexityMessages);
        finalMessages = [systemMessage, ...perplexityMessages];
        console.log(`🔄 [PERPLEXITY] Ensured message alternation and user ending: ${transformedMessages.length} -> ${perplexityMessages.length} messages`);
        console.log(`🔄 [PERPLEXITY] Last message role: ${perplexityMessages[perplexityMessages.length - 1]?.role}`);
      }
      
      stream = await client.chat.completions.create({
        model: actualModel,
        messages: finalMessages,
        stream: true,
        max_completion_tokens: 4000
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    
    (async ()=>{
      try {
        if (provider === 'anthropic') {
          // Handle Anthropic streaming
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
              // Convert Anthropic format to OpenAI-compatible format
              const openaiChunk = {
                choices: [{
                  delta: {
                    content: chunk.delta.text
                  }
                }]
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
            }
          }
        } else {
          // Handle OpenAI/Perplexity streaming
          for await (const chunk of stream){
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          }
        }
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        console.error('Stream error:', error);
        await writer.write(encoder.encode(`data: ${JSON.stringify({
          error: 'Stream error'
        })}\n\n`));
      } finally{
        await writer.close();
      }
    })();
    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
