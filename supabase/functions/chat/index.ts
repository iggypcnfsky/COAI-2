import OpenAI from 'npm:openai@4.28.0';
// CORS headers embedded in the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};
const SYSTEM_PROMPT = `You are a team member.`;
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { messages, role, model, employeePrompt, employeeName, openaiApiKey } = await req.json();
    
    // Validate OpenAI API key
    if (!openaiApiKey) {
      return new Response(JSON.stringify({
        error: 'OpenAI API key is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Initialize OpenAI with the provided API key
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });
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
    // Use the exact OpenAI model names - no mapping needed
    const actualModel = model;
    console.log(`[${role}] Model mapping: ${model} -> ${actualModel}`);
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
    // Check if we received an enhanced prompt from frontend conversation analyzer
    const hasEnhancedPrompt = employeePrompt && employeePrompt.includes('CONVERSATION ANALYSIS:');
    
    // If frontend sent enhanced prompt, use it as-is. Otherwise, add minimal backend context
    let contextualPrompt = '';
    
    if (!hasEnhancedPrompt && aiResponsesAfterLatestUser.length > 0) {
      // Only add basic context if frontend didn't already analyze the conversation
      const latestMessage = latestUserMessage?.content || '';
      const isDirectlyMentioned = employeeName && latestMessage.toLowerCase().includes(`@${employeeName.toLowerCase()}`);
      
      contextualPrompt = `\n\nCONTEXT: ${aiResponsesAfterLatestUser.length} team member(s) already responded. ${isDirectlyMentioned ? 'You were mentioned directly.' : 'Add your unique perspective.'} Speak as ${employeeName || role}.`;
    }
    // Build the final system message - prioritize employee's personality prompt
    const userAddressingInstruction = '\n\nIMPORTANT: Always address the user as "Boss" when speaking to them directly. Never use other team member names when addressing the user.';
    
    const teamCollaborationInstruction = '\n\nTEAM COLLABORATION:\n- If you see that other team members have already responded in this conversation, acknowledge their input and build on it.\n- Reference what others have said when relevant: "I agree with [Name]\'s point about..." or "Building on what [Name] mentioned..."\n- Add your unique perspective rather than repeating what\'s already been said.\n- Create a natural team discussion where ideas flow and build upon each other.';
    
    const systemMessage = {
      role: 'system',
      content: employeePrompt 
        ? `${employeePrompt}${contextualPrompt ? '\n\n' + contextualPrompt : ''}${userAddressingInstruction}${teamCollaborationInstruction}` // Employee prompt first, then context, then instructions
        : `${SYSTEM_PROMPT}${contextualPrompt}\n\nYou are a ${role}.${userAddressingInstruction}${teamCollaborationInstruction}` // Fallback for missing employee prompts
    };
    // DEBUG: Log the final system prompt being used
    console.log(`[DEBUG] Final system prompt for ${role}:`, systemMessage.content.substring(0, 300) + '...');
    console.log(`[DEBUG] Using employeePrompt: ${employeePrompt ? 'YES' : 'NO'}`);
    // ENHANCED DEBUG: Show the construction logic
    console.log(`[DEBUG] System prompt construction:`);
    console.log(`[DEBUG] - contextualPrompt length: ${contextualPrompt.length}`);
    console.log(`[DEBUG] - employeePrompt exists: ${!!employeePrompt}`);
    console.log(`[DEBUG] - Final system message length: ${systemMessage.content.length}`);
    console.log(`[DEBUG] - Full system prompt (first 1000 chars): "${systemMessage.content.substring(0, 1000)}..."`);
    
    // Transform messages to include image data for vision models
    const transformedMessages = messages.map((msg, index) => {
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

    const stream = await openai.chat.completions.create({
      model: actualModel,
      messages: [
        systemMessage,
        ...transformedMessages
      ],
      stream: true,
      max_completion_tokens: 4000
    });
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    (async ()=>{
      try {
        for await (const chunk of stream){
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
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
