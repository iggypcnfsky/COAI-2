import OpenAI from 'npm:openai@4.28.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { messages, role } = await req.json();
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
    const systemMessage = {
      role: 'system',
      content: `You are an AI assistant with expertise as a ${role}. Provide detailed, helpful responses while staying in character. Be conversational, sound human.`
    };
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        systemMessage,
        ...messages
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: 2000
    });
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    (async ()=>{
      try {
        for await (const chunk of stream){
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // Send each token immediately
            const payload = JSON.stringify({
              content
            });
            await writer.write(encoder.encode(`data: ${payload}\n\n`));
          }
        }
        // Send completion signal
        await writer.write(encoder.encode('data: {"done":true}\n\n'));
        await writer.write(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        console.error('Stream error:', error);
        const errorPayload = JSON.stringify({
          error: 'Stream error'
        });
        await writer.write(encoder.encode(`data: ${errorPayload}\n\n`));
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
