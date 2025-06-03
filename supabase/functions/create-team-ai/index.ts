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
// Helper function to generate a placeholder image (same as create-synth-ai)
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
// Helper function to generate a team placeholder image
function generateTeamPlaceholderImage(teamName) {
  const initials = teamName.split(' ').map((word)=>word[0]).join('').toUpperCase().slice(0, 3);
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
  const colorIndex = teamName.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];
  // Generate a team placeholder SVG
  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="${bgColor}"/>
      <text x="200" y="160" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">
        ${initials}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // Extract request data
    const { keywords, teamSize = 3, useExistingSynths = false, existingSynths = [], baseModel = 'claude-3-5-sonnet', teamType = 'team', averageAge = 35, genderDistribution = { male: 50, female: 50, nonBinary: 0 }, openaiApiKey, anthropicApiKey, perplexityApiKey } = await req.json();
    console.log(`🎯 Creating AI ${teamType}: "${keywords}" with ${teamSize} members (avg age: ${averageAge}, gender dist: ${genderDistribution.male}%M/${genderDistribution.female}%F/${genderDistribution.nonBinary}%NB)`);
    
    // Determine which provider to use based on the model
    const provider = MODEL_PROVIDERS[baseModel as keyof typeof MODEL_PROVIDERS] || 'openai';
    
    // Validate API key for the required provider
    let apiKey: string;
    switch (provider) {
      case 'openai':
        if (!openaiApiKey) {
          throw new Error('OpenAI API key is required for this model');
        }
        apiKey = openaiApiKey;
        break;
      case 'anthropic':
        if (!anthropicApiKey) {
          throw new Error('Anthropic API key is required for Claude models');
        }
        apiKey = anthropicApiKey;
        break;
      case 'perplexity':
        if (!perplexityApiKey) {
          throw new Error('Perplexity API key is required for Sonar models');
        }
        apiKey = perplexityApiKey;
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
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
    // Step 1: Generate team concept and structure with different prompts for team vs group
    let teamConceptPrompt;
    if (teamType === 'team') {
      // TEAM prompt - collaborative, functional naming
      teamConceptPrompt = `Based on these keywords: "${keywords}"

Create a TEAM concept with EXACTLY ${teamSize} team members. This should be a group that works together toward common goals.

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

JSON structure required:
{
  "team_name": "Functional team name (e.g., 'Design Studio', 'Investment Fund', 'Marketing Team')",
  "team_description": "2-3 sentence description of what this team does together",
  "collaboration_style": "How this team collaborates and works together",
  "required_roles": [
    {
      "role": "2-3 words max - Collaborative role within the team (e.g., 'Product Manager', 'Data Analyst')",
      "importance": "high|medium|low",
      "responsibilities": "What they contribute to the team's goals",
      "existing_match": "${useExistingSynths ? 'null or existing synth name if good match' : 'null'}"
    }
  ]
}

CRITICAL: Create EXACTLY ${teamSize} roles in the required_roles array - no more, no less.

Focus on:
- Functional, professional team names (not creative nicknames)
- Collaborative roles that complement each other
- Team members who work together toward shared objectives
- Clear team purpose and collaboration methods

Return only the JSON object, nothing else.`;
    } else {
      // GROUP prompt - individual characters, descriptive naming
      teamConceptPrompt = `Based on these keywords: "${keywords}"

Create a GROUP of EXACTLY ${teamSize} individuals who LITERALLY EMBODY the keywords. These are separate people who ARE what the keywords describe.

CRITICAL INTERPRETATION:
- If keywords say "FAT KIDS", create actual fat kids (overweight children/teens), not people who work with fat kids
- If keywords say "ANGRY CUSTOMERS", create actual angry customers, not customer service reps
- BE LITERAL - the characters should BE what the keywords describe

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

JSON structure required:
{
  "team_name": "Literal descriptive group name (e.g., 'Fat Kids', 'Angry Customers', 'Tech Investors')",
  "team_description": "2-3 sentence description of what type of people this group LITERALLY represents",
  "collaboration_style": "How these individuals typically behave or interact (not as a team)",
  "required_roles": [
    {
      "role": "2-3 words max - LITERALLY what they ARE based on keywords (e.g., 'Fat Kid', 'Angry Customer')",
      "importance": "high|medium|low", 
      "responsibilities": "How they behave or what they represent as this character type",
      "existing_match": "${useExistingSynths ? 'null or existing synth name if good match' : 'null'}"
    }
  ]
}

CRITICAL: Create EXACTLY ${teamSize} roles in the required_roles array - no more, no less.

Focus on:
- LITERAL interpretation of keywords - if it says "fat kids", create fat kids
- Individual character types that ARE the keywords, not people who work with them
- Authentic representation of what the keywords actually describe
- Different variations/perspectives within the same character type

Examples:
- "FAT KIDS" → roles like "Overweight Teen", "Chubby Kid", "Heavy Child"
- "ANGRY CUSTOMERS" → roles like "Furious Buyer", "Upset Client", "Irate Customer"

Return only the JSON object, nothing else.`;
    }
    // Create team concept response based on provider
    let teamConceptResponse: any;
    if (provider === 'anthropic') {
      teamConceptResponse = await client.messages.create({
        model: actualModel,
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: teamConceptPrompt
          }
        ],
        temperature: 0.8
      });
    } else {
      // OpenAI and Perplexity
      teamConceptResponse = await client.chat.completions.create({
        model: actualModel,
        messages: [
          {
            role: 'user',
            content: teamConceptPrompt
          }
        ],
        temperature: 0.8
      });
    }
    // Extract content based on provider
    let rawTeamConcept: string;
    if (provider === 'anthropic') {
      rawTeamConcept = teamConceptResponse.content[0]?.text || '{}';
    } else {
      rawTeamConcept = teamConceptResponse.choices[0].message.content || '{}';
    }
    
    console.log(`🔍 Raw team concept response: ${rawTeamConcept.substring(0, 200)}...`);
    const cleanedTeamConcept = cleanJsonResponse(rawTeamConcept);
    console.log(`🧹 Cleaned team concept response: ${cleanedTeamConcept.substring(0, 200)}...`);
    const teamConcept = JSON.parse(cleanedTeamConcept);
    console.log(`✅ Generated team concept: ${teamConcept.team_name}`);
    
    // CRITICAL: Validate that AI created the correct number of roles
    if (!teamConcept.required_roles || teamConcept.required_roles.length !== teamSize) {
      console.warn(`⚠️ AI created ${teamConcept.required_roles?.length || 0} roles but we requested ${teamSize}. Adjusting...`);
      
      // If AI created fewer roles, duplicate some roles with variations
      if (!teamConcept.required_roles) {
        teamConcept.required_roles = [];
      }
      
      while (teamConcept.required_roles.length < teamSize) {
        const baseRole = teamConcept.required_roles[teamConcept.required_roles.length % Math.max(1, teamConcept.required_roles.length)] || {
          role: "Team Member",
          importance: "medium",
          responsibilities: "Contributes to team goals",
          existing_match: null
        };
        
        teamConcept.required_roles.push({
          ...baseRole,
          role: `${baseRole.role} ${teamConcept.required_roles.length + 1}`
        });
      }
      
      // If AI created too many roles, trim to requested size
      if (teamConcept.required_roles.length > teamSize) {
        teamConcept.required_roles = teamConcept.required_roles.slice(0, teamSize);
      }
    }
    
    console.log(`🔢 Final role count: ${teamConcept.required_roles.length} (requested: ${teamSize})`);
    
    // Step 2: Pre-calculate gender assignments to match distribution
    const genderAssignments = [];
    const maleCount = Math.round((genderDistribution.male / 100) * teamSize);
    const femaleCount = Math.round((genderDistribution.female / 100) * teamSize);
    const nonBinaryCount = teamSize - maleCount - femaleCount;
    
    console.log(`👥 Gender distribution: ${maleCount}M, ${femaleCount}F, ${nonBinaryCount}NB (total: ${teamSize})`);
    
    // Create gender assignment array
    for (let i = 0; i < maleCount; i++) genderAssignments.push('male');
    for (let i = 0; i < femaleCount; i++) genderAssignments.push('female');
    for (let i = 0; i < nonBinaryCount; i++) genderAssignments.push('non-binary');
    
    // Shuffle the assignments to randomize order
    for (let i = genderAssignments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [genderAssignments[i], genderAssignments[j]] = [genderAssignments[j], genderAssignments[i]];
    }
    
    // Step 3: Generate team members using the same process as create-synth-ai (fast creation with placeholder images)
    const teamMembers = [];
    for(let i = 0; i < teamConcept.required_roles.length; i++){
      const roleSpec = teamConcept.required_roles[i];
      // Check if we should use an existing synth
      if (useExistingSynths && roleSpec.existing_match) {
        const existingSynth = existingSynths.find((s)=>s.name.toLowerCase() === roleSpec.existing_match.toLowerCase());
        if (existingSynth) {
          console.log(`♻️ Using existing synth: ${existingSynth.name} for ${roleSpec.role}`);
          // Generate system prompt for existing synth in team context
          const teamSystemPromptRequest = `Create a VERY DIRECT, RAW system prompt for ${existingSynth.name} (${existingSynth.role}) in this ${teamType} context:

${teamType === 'team' ? 'Team' : 'Group'}: ${teamConcept.team_name}
${teamType === 'team' ? 'Team' : 'Group'} Purpose: ${teamConcept.team_description}
Their Role: ${roleSpec.responsibilities}
Original Keywords: ${keywords}

Existing Bio: ${existingSynth.bio || 'Not provided'}
Existing Experience: ${existingSynth.experience?.join(', ') || 'Not provided'}

REQUIREMENTS:
- Maximum 200 words (slightly longer to include mental models)
- Use CAPS for emphasis on key traits/emotions
- Be BLUNT and DIRECT, no flowery language
- Cut out poetic descriptions
- Focus on raw personality and behavior
- Written in second person ("You are...")
- Make it sound urgent/intense

Return ONLY the raw, direct system prompt.`;
          // Create team system prompt response based on provider
          let teamSystemPromptResponse: any;
          if (provider === 'anthropic') {
            teamSystemPromptResponse = await client.messages.create({
              model: actualModel,
              max_tokens: 4000,
              messages: [
                {
                  role: 'user',
                  content: teamSystemPromptRequest
                }
              ],
              temperature: 0.7
            });
          } else {
            // OpenAI and Perplexity
            teamSystemPromptResponse = await client.chat.completions.create({
              model: actualModel,
              messages: [
                {
                  role: 'user',
                  content: teamSystemPromptRequest
                }
              ],
              temperature: 0.7
            });
          }
          
          // Extract system prompt content based on provider
          let teamSystemPrompt: string;
          if (provider === 'anthropic') {
            teamSystemPrompt = teamSystemPromptResponse.content[0]?.text || '';
          } else {
            teamSystemPrompt = teamSystemPromptResponse.choices[0].message.content || '';
          }
          teamMembers.push({
            name: existingSynth.name,
            age: 30,
            role: existingSynth.role,
            systemPrompt: teamSystemPrompt,
            baseModel: baseModel,
            profileImage: '',
            bio: existingSynth.bio,
            experience: existingSynth.experience,
            isExisting: true,
            existingId: existingSynth.id,
            isLoadingImage: true
          });
          continue;
        }
      }
      // Generate new team member using the SAME PROCESS as create-synth-ai
      console.log(`🆕 Generating new member for role: ${roleSpec.role} using optimized process`);
      
      // Use pre-calculated gender assignment to ensure exact distribution
      const memberGender = genderAssignments[i] || 'male'; // Fallback to male if somehow missing
      console.log(`👤 Assigning gender: ${memberGender} to member ${i + 1}/${teamSize}`);
      // Step 2a: Generate character profile - realistic, no mental models bullshit
      const characterPrompt = `Based on these keywords and role: "${keywords}" - ${roleSpec.role}

Create a character that LITERALLY IS what the keywords describe. Be realistic and authentic.

${teamType === 'team' ? 'Team' : 'Group'}: ${teamConcept.team_name}
Purpose: ${teamConcept.team_description}
Role/Character Type: ${roleSpec.role}
Responsibilities/Behavior: ${roleSpec.responsibilities}

CRITICAL NAME INSTRUCTIONS:
- Choose an appropriate name that fits the character type described in the role
- The name should feel authentic to what this character represents
- Consider age, background, and personality when choosing the name

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

JSON structure required:
{
  "name": "Choose appropriate ${memberGender} name for this character type",
  "age": number between ${Math.max(5, averageAge - 2)}-${Math.min(80, averageAge + 2)},
  "gender": "${memberGender}",
  "role": "${roleSpec.role}",
  "bio": "2-3 sentence bio that reflects what they ARE based on the keywords - be realistic",
  "personality_traits": ["trait1", "trait2", "trait3"],
  "background": "Brief background that explains why they are this way",
  "current_situation": "What their current life situation is like"
}

CRITICAL: 
- BE LITERAL - if the role is "Fat Kid", create an actual overweight child/teen character
- BE REALISTIC - no overly positive or intellectual nonsense
- Focus on creating a character that IS what the role describes
- Make them authentic to real life
- Ensure gender is appropriate for the character.

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
          temperature: 0.8
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
          temperature: 0.8
        });
      }
      // Extract content based on provider
      let rawCharacterData: string;
      if (provider === 'anthropic') {
        rawCharacterData = characterResponse.content[0]?.text || '{}';
      } else {
        rawCharacterData = characterResponse.choices[0].message.content || '{}';
      }
      
      console.log(`🔍 Raw character data response: ${rawCharacterData.substring(0, 200)}...`);
      const cleanedCharacterData = cleanJsonResponse(rawCharacterData);
      console.log(`🧹 Cleaned character data response: ${cleanedCharacterData.substring(0, 200)}...`);
      const characterData = JSON.parse(cleanedCharacterData);
      console.log(`✅ Generated character: ${characterData.name} - ${characterData.role}`);
      // Step 2b: Generate realistic system prompt - no mental models bullshit
      const systemPromptRequest = `Create a VERY DIRECT, RAW system prompt for this character based on what they actually ARE:

CHARACTER PROFILE:
- Name: ${characterData.name}
- Role/Type: ${characterData.role}
- Bio: ${characterData.bio}
- Personality: ${characterData.personality_traits?.join(', ')}
- Background: ${characterData.background}
- Current Situation: ${characterData.current_situation}
- Original Keywords: ${keywords}
- Gender: appropriate for the ${characterData.name}

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
      console.log(`✅ Generated system prompt for ${characterData.name} (${systemPrompt.length} chars)`);
      // Step 2c: Generate placeholder image (same as create-synth-ai)
      const placeholderImage = generatePlaceholderImage(characterData.name);
      // Step 2d: Create team member with isLoadingImage flag
      teamMembers.push({
        name: characterData.name,
        age: characterData.age,
        gender: characterData.gender,
        role: characterData.role,
        systemPrompt: systemPrompt,
        baseModel: baseModel,
        profileImage: placeholderImage,
        bio: characterData.bio,
        experience: characterData.experience,
        mentalModels: characterData.mental_models,
        coreParadigm: characterData.core_paradigm,
        systemsPerspective: characterData.systems_perspective,
        isExisting: false,
        isLoadingImage: true
      });
      console.log(`✅ Generated member: ${characterData.name} - ${characterData.role} (image will be generated in background)`);
      // Image generation will be handled separately by the frontend calling generate-synth-image
      console.log(`✅ Generated member: ${characterData.name} - ${characterData.role} (placeholder image)`);
    }
    // Step 3: Generate team placeholder image (fast response)
    console.log(`🎨 Generating ${teamType} placeholder image...`);
    const teamPlaceholderImage = generateTeamPlaceholderImage(teamConcept.team_name);
    // Step 4: Team image generation will be handled separately by the frontend
    console.log(`🎨 Generated ${teamType} placeholder image for: ${teamConcept.team_name}`);
    // Step 5: Compile final team data (fast response)
    const generatedTeam = {
      name: teamConcept.team_name,
      description: teamConcept.team_description,
      members: teamMembers,
      teamImage: teamPlaceholderImage,
      collaborationStyle: teamConcept.collaboration_style,
      isLoadingTeamImage: true
    };
    // Log final team composition for debugging
    const finalGenderCount = {
      male: teamMembers.filter(m => m.gender === 'male').length,
      female: teamMembers.filter(m => m.gender === 'female').length,
      'non-binary': teamMembers.filter(m => m.gender === 'non-binary').length
    };
    
    console.log(`🎉 Successfully generated team: ${generatedTeam.name} with ${teamMembers.length} members (images will be generated separately)`);
    console.log(`📊 Final gender distribution: ${finalGenderCount.male}M, ${finalGenderCount.female}F, ${finalGenderCount['non-binary']}NB`);
    console.log(`🎯 Requested: ${teamSize} members with ${genderDistribution.male}%M/${genderDistribution.female}%F/${genderDistribution.nonBinary}%NB`);

    return new Response(JSON.stringify({
      success: true,
      team: generatedTeam
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error in create-team-ai:', error);
    return new Response(JSON.stringify({
      error: 'Failed to generate team',
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
