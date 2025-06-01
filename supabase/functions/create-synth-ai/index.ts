import OpenAI from 'npm:openai@4.28.0';
// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};
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
    const { keywords, openaiApiKey, baseModel = 'gpt-4o', averageAge = 35 } = await req.json();
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
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });
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
    // Step 1: Generate character profile with mental models
    const characterPrompt = `Based on these keywords: "${keywords}"

Create a character that EMBODIES these keywords with DEEP MENTAL MODELS and SYSTEMS THINKING. The keywords might describe:
- A professional role (e.g., "social media expert", "data scientist", "team leader") 
- A character type (e.g., "angry customer", "skeptical investor", "enthusiastic student")
- A personality/behavioral pattern (e.g., "perfectionist", "analytical", "impatient")

Create a character who thinks in SYSTEMS, MENTAL MODELS, and PARADIGMS relevant to their role/situation.

EXAMPLES OF MENTAL MODELS BY ROLE:
- Social Media Expert: Network effects, virality mechanics, attention economy, platform algorithms, engagement loops
- Angry Customer: Service failure cascades, expectation-reality gaps, trust erosion patterns, switching costs
- Data Scientist: Statistical thinking, correlation vs causation, bias detection, model validation, data quality frameworks
- Skeptical Investor: Risk assessment models, due diligence frameworks, market efficiency theory, downside protection

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

JSON structure required:
{
  "name": "FIRST NAME ONLY - Choose from diverse names, exotic but human names.",
  "age": number between ${Math.max(20, averageAge - 10)}-${Math.min(65, averageAge + 10)},
  "role": "2-3 words maximum - concise role/title that fits the keywords (e.g., 'Marketing Expert', 'Angry Customer', 'Team Leader')",
  "bio": "2-3 sentence bio that reflects the keywords and their worldview",
  "mental_models": ["model1", "model2", "model3", "model4", "model5"],
  "core_paradigm": "The fundamental worldview/framework that drives their thinking",
  "systems_perspective": "How they view interconnections, feedback loops, and system dynamics",
  "experience": ["skill/trait1", "skill/trait2", "skill/trait3", "skill/trait4", "skill/trait5"],
  "personality_traits": ["trait1", "trait2", "trait3"],
  "work_style": "How they behave, communicate, or approach situations"
}

Examples:
- For "angry customer": Create someone who IS an angry, frustrated customer
- For "marketing expert": Create someone who IS a marketing professional
- For "perfectionist": Create someone who IS a perfectionist personality
- For "skeptical investor": Create someone who IS a skeptical, questioning investor

CRITICAL: 
- The "role" field must be exactly 2-3 words, no more. Examples: "Marketing Expert", "Angry Customer", "Data Scientist", "Team Leader".
- Use ONLY FIRST NAMES from universally diverse options
- DO NOT use culturally specific names or surnames - keep names universal and internationally recognizable
- Avoid defaulting to any particular nationality or cultural background

Make the character authentic to the keywords with universal appeal.
Return only the JSON object, nothing else.`;
    const characterResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: characterPrompt
        }
      ],
      temperature: 0.8
    });
    const rawCharacterData = characterResponse.choices[0].message.content || '{}';
    console.log(`🔍 Raw character response: ${rawCharacterData.substring(0, 200)}...`);
    const cleanedCharacterData = cleanJsonResponse(rawCharacterData);
    console.log(`🧹 Cleaned character response: ${cleanedCharacterData.substring(0, 200)}...`);
    const characterData = JSON.parse(cleanedCharacterData);
    console.log(`✅ Generated character: ${characterData.name} - ${characterData.role}`);
    // Step 2: Generate system prompt with mental models
    const systemPromptRequest = `Create a VERY DIRECT, RAW system prompt for this character with DEEP MENTAL MODELS:

CHARACTER PROFILE:
- Name: ${characterData.name}
- Role/Type: ${characterData.role}
- Bio: ${characterData.bio}
- Mental Models: ${characterData.mental_models?.join(', ')}
- Core Paradigm: ${characterData.core_paradigm}
- Systems Perspective: ${characterData.systems_perspective}
- Experience/Traits: ${characterData.experience?.join(', ')}
- Personality: ${characterData.personality_traits?.join(', ')}
- Behavior: ${characterData.work_style}
- Original Keywords: ${keywords}

REQUIREMENTS:
- Maximum 60-80 words (slightly longer to include mental models)
- Use CAPS for emphasis on key mental frameworks and paradigms
- Be BLUNT and DIRECT, no flowery language
- Include their MENTAL MODELS and SYSTEMS THINKING approach
- Focus on HOW THEY THINK, not just emotions
- Written in second person ("You are...")
- Make it sound urgent/intense with intellectual depth

ENHANCED STYLE: "You are [Name], A VERY [TRAIT] [ROLE]. You think in [MENTAL MODEL], you see [SYSTEMS PERSPECTIVE], YOU ARE [EMOTION] about [what breaks their mental model]. You approach everything through [PARADIGM] and you [behavior with reasoning]."

Example: "You are Alex, A VERY ANALYTICAL DATA SCIENTIST. You think in STATISTICAL MODELS, you see CORRELATION VS CAUSATION everywhere, YOU ARE FRUSTRATED when people ignore DATA QUALITY. You approach everything through HYPOTHESIS TESTING and you question every assumption because bad data creates cascading failures."

Important: Make them an intellectual with deep frameworks, not just emotional reactions.

Return ONLY the raw, direct system prompt with mental models, no additional formatting or explanation.`;
    const systemPromptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: systemPromptRequest
        }
      ],
      temperature: 0.7
    });
    const systemPrompt = systemPromptResponse.choices[0].message.content || '';
    console.log(`✅ Generated system prompt (${systemPrompt.length} chars)`);
    // Generate a placeholder image (a simple colored circle with initials)
    const placeholderImage = generatePlaceholderImage(characterData.name);
    // Step 3: Compile synth data with placeholder image
    const generatedSynth = {
      name: characterData.name,
      age: characterData.age,
      role: characterData.role,
      systemPrompt: systemPrompt,
      baseModel: baseModel,
      profileImage: placeholderImage,
      bio: characterData.bio,
      experience: characterData.experience,
      mentalModels: characterData.mental_models,
      coreParadigm: characterData.core_paradigm,
      systemsPerspective: characterData.systems_perspective,
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
