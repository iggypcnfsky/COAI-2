import OpenAI from 'npm:openai@4.28.0';

// CORS headers embedded in the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { prompt, openaiApiKey } = await req.json();
    
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

    if (!prompt) {
      return new Response(JSON.stringify({
        error: 'Prompt is required'
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

    console.log('🎯 [Orchestrator] Making decision for team coordination');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap for orchestration decisions
      messages: [
        {
          role: 'system',
          content: 'You are a team coordination AI. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent decisions
      max_tokens: 200
    });

    const content = response.choices[0].message.content;
    
    console.log('🎯 [Orchestrator] Decision made:', content);

    return new Response(JSON.stringify({ content }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ [Orchestrator] Error:', error);
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