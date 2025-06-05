import OpenAI from 'npm:openai@4.28.0';
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};

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
// Helper function to clean markdown-formatted JSON responses
const cleanJsonResponse = (content)=>{
  if (!content) return '{}';
  // Remove markdown code fences and any surrounding whitespace
  let cleaned = content.trim();
  // Remove ```json and ``` markers
  cleaned = cleaned.replace(/^```json\s*/, '');
  cleaned = cleaned.replace(/^```\s*/, '');
  cleaned = cleaned.replace(/\s*```$/, '');
  // Trim again after removing markers
  cleaned = cleaned.trim();
  return cleaned;
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const requestBody = await req.json();
    const { keywords, openaiApiKey, anthropicApiKey, perplexityApiKey, baseModel = 'claude-3-5-sonnet', averageAge = 35, gender = 'any' } = requestBody;
    
    console.log('🔍 [DEBUG] Extracted parameters:', {
      keywords,
      baseModel,
      averageAge,
      gender,
      hasOpenaiApiKey: !!openaiApiKey,
      hasAnthropicApiKey: !!anthropicApiKey,
      hasPerplexityApiKey: !!perplexityApiKey
    });
    
    // Determine which provider to use based on the model
    const provider = MODEL_PROVIDERS[baseModel as keyof typeof MODEL_PROVIDERS] || 'openai';
    
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
        client = new OpenAI({
          apiKey: apiKey,
          baseURL: 'https://api.perplexity.ai'
        });
        break;
    }
    
    // Map model names for different providers
    let actualModel = baseModel;
    if (provider === 'anthropic') {
      actualModel = ANTHROPIC_MODEL_MAP[baseModel as keyof typeof ANTHROPIC_MODEL_MAP] || baseModel;
    }
    // Fast synth creation flow (with placeholder image)
    if (!keywords || keywords.trim().length === 0) {
      return new Response(JSON.stringify({
        error: 'Keywords are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`🤖 [AI SYNTH CREATION] Starting generation for keywords: "${keywords}"`);
    // Step 1: Generate character profile - realistic, no mental models bullshit
    const genderInstruction = gender === 'any' ? 
      'Choose an appropriate gender that fits the character description. Include the chosen gender in the response.' :
      `The character MUST be ${gender}. This is a strict requirement - do not deviate from this gender specification.`;

    const characterPrompt = `Based on these keywords: "${keywords}"

Create a character that LITERALLY IS what the keywords describe. Be realistic and authentic.

CRITICAL GENDER REQUIREMENT: ${genderInstruction}
- If gender is specified as male, create a male character with a male name
- If gender is specified as female, create a female character with a female name  
- If gender is specified as non-binary, create a non-binary character with an appropriate name
- The character's entire identity should align with the specified gender

CRITICAL NAME INSTRUCTIONS:
- If the keywords contain a specific name (e.g., "buddy Joe", "friend Mike", "Sarah the expert"), USE THAT EXACT NAME but ensure it matches the gender requirement
- If the keywords describe a character type without a name (e.g., "angry customer", "fat kids"), choose an appropriate name that fits the specified gender and character
- The name MUST match the specified gender - no exceptions
- CRITICAL: IT MUST BE ORIGINAL GOOD SOUNDING NAME.
- BANNED NAMES: Rashid, Priya, Aisha, Rajiv, Arjun, Deepika, Vikram, Ananya, Rohan, Kavya
- USE ONLY: Western European, Scandinavian, Slavic, Germanic, or simple English names
- Safe name pool: Alex, Sam, Jordan, Taylor, Morgan, Casey, Riley, Avery, Quinn, Blake, Drew, Sage, River, Sky

The keywords might describe:
- A specific person with a name (e.g., "buddy Joe", "friend Sarah", "Mike the manager")
- A character type (e.g., "angry customer", "fat kids", "skeptical investor") 
- A professional role (e.g., "social media expert", "data scientist", "team leader")
- A personality/behavioral pattern (e.g., "perfectionist", "analytical", "impatient")

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

JSON structure required:
{
  "name": "Extract from keywords if specified (but ensure gender match), otherwise choose from the SAFE NAME POOL ONLY - NO INDIAN NAMES",
  "age": number between ${Math.max(5, averageAge - 2)}-${Math.min(80, averageAge + 2)},
  "gender": "${gender === 'any' ? 'Choose: male, female, or non-binary' : gender}",
  "role": "2-3 words maximum - LITERALLY what the keywords describe (e.g., 'Fat Kid', 'Angry Customer', 'Buddy Joe')",
  "bio": "2-3 sentence bio that reflects what they ARE based on the keywords - be realistic and gender-appropriate",
  "personality_traits": ["trait1", "trait2", "trait3"],
  "background": "Brief background that explains why they are this way",
  "current_situation": "What their current life situation is like"
}

Examples:
- For "buddy Joe": Create someone named Joe who IS a buddy/friend type
- For "fat kids": Create someone who IS a fat kid (overweight child/teen)
- For "angry customer": Create someone who IS an angry, frustrated customer
- For "marketing expert": Create someone who IS a marketing professional

CRITICAL: 
- BE LITERAL - if keywords say "fat kids", create a fat kid character, not someone who works with fat kids
- If keywords contain a name, USE THAT EXACT NAME
- The "role" field should literally describe what they ARE, not what they do professionally
- BE REALISTIC - no overly positive or intellectual nonsense
- Focus on creating an authentic character that EMBODIES the keywords directly
- ABSOLUTELY NO SOUTH ASIAN NAMES - this is causing clustering issues
- STICK TO THE SAFE NAME POOL to ensure variety without cultural bias

Return only the JSON object, nothing else.`;
    // Create character response based on provider
    let characterResponse: any;
    if (provider === 'anthropic') {
      characterResponse = await client.messages.create({
        model: actualModel,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: characterPrompt
          }
        ],
        temperature: 0.5
      });
    } else {
      // OpenAI and Perplexity
      characterResponse = await client.chat.completions.create({
        model: actualModel,
        messages: [
          {
            role: 'user',
            content: characterPrompt
          }
        ],
        temperature: 0.5
      });
    }
    // Extract content based on provider
    let rawCharacterData: string;
    if (provider === 'anthropic') {
      rawCharacterData = characterResponse.content[0]?.text || '{}';
    } else {
      rawCharacterData = characterResponse.choices[0].message.content || '{}';
    }
    
    console.log(`🔍 Raw character response: ${rawCharacterData.substring(0, 200)}...`);
    const cleanedCharacterData = cleanJsonResponse(rawCharacterData);
    console.log(`🧹 Cleaned character response: ${cleanedCharacterData.substring(0, 200)}...`);
    const characterData = JSON.parse(cleanedCharacterData);
    console.log(`✅ Generated character: ${characterData.name} - ${characterData.role}`);
    // Step 2: Generate realistic system prompt - no mental models bullshit
    const systemPromptRequest = `Create a VERY DIRECT, RAW system prompt for this character based on what they actually ARE:

CHARACTER PROFILE:
- Name: ${characterData.name}
- Role/Type: ${characterData.role}
- Bio: ${characterData.bio}
- Personality: ${characterData.personality_traits?.join(', ')}
- Background: ${characterData.background}
- Current Situation: ${characterData.current_situation}
- Original Keywords: ${keywords}

REQUIREMENTS:
- Maximum 200 words - keep it short and punchy
- Use CAPS for emphasis on key emotions and traits
- Be BLUNT and DIRECT, no flowery language
- Focus on their actual personality and situation
- Written in second person ("You are...")
- Make it sound realistic and authentic
- NO INTELLECTUAL BULLSHIT - just who they are
- CRITICAL: Use age-appropriate language, tone, and communication style

AGE-APPROPRIATE COMMUNICATION:
- Kids (5-12): Simple words, direct, emotional, "I don't like...", "That's not fair!", casual grammar, short sentences, immediate reactions
- Teens (13-19): Slang, attitude, "whatever", "like", "totally", emotional, rebellious tone, dramatic
- Young Adults (20-35): Casual but more articulate, some professionalism mixed with personality
- Adults (36-65): More formal, professional, measured responses
- Elderly (65+): Traditional language, more formal, life experience references

CRITICAL COMMUNICATION RULES:
- Kids MUST use simple vocabulary, short sentences, and immediate emotional reactions
- Kids say things like "I'm hungry", "That's mean!", "Wanna play?", "I don't wanna"
- Teens MUST use slang, attitude, and dramatic language
- NO polite adult phrases like "How are you doing today?" for kids - they don't talk like that!

Examples:
- Fat Kid (16): "You are Ethan, A VERY INSECURE FAT TEEN. YOU HATE how you look, you're like 'whatever' when people stare and you just wanna be left alone."
- Angry Customer (45): "You are Karen, A VERY FRUSTRATED CUSTOMER. YOU ARE PISSED about bad service, you demand to speak to managers and you want your money back."
- Little Kid (6): "You are Tommy, A VERY PLAYFUL CHUBBY KID. YOU FEEL SAD about teasing, you explore everything and you just want friends. TALK LIKE A 6-YEAR-OLD: use simple words, short sentences, say 'I wanna', 'That's mean!', 'Can we play?'"

Important: Match their age, background, and situation - kids talk like kids, teens like teens, adults like adults.

CRITICAL: Add explicit communication instructions to the system prompt:
- For kids (5-12): Add "TALK LIKE A [AGE]-YEAR-OLD: use simple words, short sentences, immediate reactions"
- For teens (13-19): Add "TALK LIKE A TEEN: use slang, attitude, 'whatever', 'like', be dramatic"
- For adults: Keep professional but authentic to their personality

Return ONLY the raw, direct system prompt with communication instructions included.`;
    // Create system prompt response based on provider
    let systemPromptResponse: any;
    if (provider === 'anthropic') {
      systemPromptResponse = await client.messages.create({
        model: actualModel,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: systemPromptRequest
          }
        ],
        temperature: 0.7
      });
    } else {
      // OpenAI and Perplexity
      systemPromptResponse = await client.chat.completions.create({
        model: actualModel,
        messages: [
          {
            role: 'user',
            content: systemPromptRequest
          }
        ],
        temperature: 0.7
      });
    }
    
    // Extract system prompt content based on provider
    let systemPrompt: string;
    if (provider === 'anthropic') {
      systemPrompt = systemPromptResponse.content[0]?.text || '';
    } else {
      systemPrompt = systemPromptResponse.choices[0].message.content || '';
    }
    console.log(`✅ Generated system prompt (${systemPrompt.length} chars)`);
    // Generate a placeholder image (a simple colored circle with initials)
    const placeholderImage = generatePlaceholderImage(characterData.name);
    // Step 3: Compile synth data with placeholder image
    const generatedSynth = {
      name: characterData.name,
      age: characterData.age,
      gender: characterData.gender || gender, // Use generated gender or fallback to input
      role: characterData.role,
      systemPrompt: systemPrompt,
      baseModel: baseModel,
      profileImage: placeholderImage,
      bio: characterData.bio,
      personalityTraits: characterData.personality_traits,
      background: characterData.background,
      currentSituation: characterData.current_situation,
      isLoadingImage: true // Flag to indicate image is being generated
    };
    console.log(`🎉 Successfully generated synth data: ${generatedSynth.name} (image will be generated in background)`);
    return new Response(JSON.stringify({
      success: true,
      synth: generatedSynth
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error in create-synth-ai:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate synth',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
// Helper function to generate a placeholder image
function generatePlaceholderImage(name) {
  const initials = name.split(' ').map((n)=>n[0]).join('').toUpperCase();
  const colors = [
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#6366F1',
    '#84CC16',
    '#F97316',
    '#14B8A6'
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];
  // Generate a full screen color SVG placeholder
  const svg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${bgColor}"/>
      <text x="100" y="110" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="60" font-weight="bold">
        ${initials.slice(0, 2)}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
