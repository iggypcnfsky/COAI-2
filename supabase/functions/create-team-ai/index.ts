import OpenAI from 'npm:openai@4.28.0';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400'
};

// Helper function to clean markdown-formatted JSON responses
const cleanJsonResponse = (content: string): string => {
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
function generatePlaceholderImage(name: string): string {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
  const colors = [
    '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#6366F1', '#84CC16', '#F97316', '#14B8A6'
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
function generateTeamPlaceholderImage(teamName: string): string {
  const initials = teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 3);
  const colors = [
    '#8B5CF6', '#EC4899', '#06B6D4', '#10B981', '#F59E0B',
    '#EF4444', '#6366F1', '#84CC16', '#F97316', '#14B8A6'
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



// Note: Image generation is now handled separately by the generate-synth-image function
// This function focuses ONLY on team structure creation with placeholders

interface TeamGenerationRequest {
  keywords: string;
  openaiApiKey: string;
  teamSize?: number;
  useExistingSynths?: boolean;
  existingSynths?: ExistingSynth[];
  baseModel?: string;
  teamType?: string;
  averageAge?: number;
}

interface ExistingSynth {
  id: string;
  name: string;
  role: string;
  bio?: string;
  experience?: string[];
}

interface GeneratedTeamMember {
  name: string;
  age: number;
  role: string;
  systemPrompt: string;
  baseModel: string;
  profileImage: string;
  bio?: string;
  experience?: string[];
  mentalModels?: string[];
  coreParadigm?: string;
  systemsPerspective?: string;
  isExisting?: boolean;
  existingId?: string;
  isLoadingImage?: boolean;
}

interface GeneratedTeam {
  name: string;
  description: string;
  members: GeneratedTeamMember[];
  teamImage?: string;
  collaborationStyle: string;
  isLoadingTeamImage?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract request data
    const { 
      keywords, 
      teamSize = 3, 
      useExistingSynths = false, 
      existingSynths = [], 
      baseModel = 'gpt-4o',
      teamType = 'team', // Default to 'team' if not specified
      averageAge = 35, // Default average age
      openaiApiKey
    } = await req.json();

    console.log(`🎯 Creating AI ${teamType}: "${keywords}" with ${teamSize} members (avg age: ${averageAge})`);

    if (!openaiApiKey) {
      throw new Error('OpenAI API key is required');
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Step 1: Generate team concept and structure with different prompts for team vs group
    let teamConceptPrompt: string;
    
    if (teamType === 'team') {
      // TEAM prompt - collaborative, functional naming
      teamConceptPrompt = `Based on these keywords: "${keywords}"

Create a COLLABORATIVE TEAM concept with EXACTLY ${teamSize} team members. This should be a group that works together toward common goals.

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
  "team_name": "Literal descriptive group name (e.g., 'Fat Kids Group', 'Angry Customers', 'Tech Investors')",
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

    const teamConceptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: teamConceptPrompt }],
      temperature: 0.8,
    });

    const rawTeamConcept = teamConceptResponse.choices[0].message.content || '{}';
    console.log(`🔍 Raw team concept response: ${rawTeamConcept.substring(0, 200)}...`);
    
    const cleanedTeamConcept = cleanJsonResponse(rawTeamConcept);
    console.log(`🧹 Cleaned team concept response: ${cleanedTeamConcept.substring(0, 200)}...`);
    
    const teamConcept = JSON.parse(cleanedTeamConcept);
    console.log(`✅ Generated team concept: ${teamConcept.team_name}`);

    // Step 2: Generate team members using the same process as create-synth-ai (fast creation with placeholder images)
    const teamMembers: GeneratedTeamMember[] = [];

    for (let i = 0; i < teamConcept.required_roles.length; i++) {
      const roleSpec = teamConcept.required_roles[i];
      // Check if we should use an existing synth
      if (useExistingSynths && roleSpec.existing_match) {
        const existingSynth = existingSynths.find(s => 
          s.name.toLowerCase() === roleSpec.existing_match.toLowerCase()
        );
        
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
- Maximum 60-80 words (slightly longer to include mental models)
- Use CAPS for emphasis on key traits/emotions
- Be BLUNT and DIRECT, no flowery language
- Cut out poetic descriptions
- Focus on raw personality and behavior
- Written in second person ("You are...")
- Make it sound urgent/intense

STYLE: "You are [Name], A VERY [TRAIT] [ROLE]. YOU ARE [EMOTION], [EMOTION], you [behavior] and you [what drives them mad/happy]."

Example style: "You are Sarah, A VERY ANGRY DOCTOR. YOU ARE FURIOUS, EXHAUSTED, you work 16-hour shifts and you're mad about hospital understaffing."

Return ONLY the raw, direct system prompt.`;

          const teamSystemPromptResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: teamSystemPromptRequest }],
            temperature: 0.7,
          });

          teamMembers.push({
            name: existingSynth.name,
            age: 30, // Default for existing
            role: existingSynth.role,
            systemPrompt: teamSystemPromptResponse.choices[0].message.content || '',
            baseModel: baseModel,
            profileImage: '', // Will use existing
            bio: existingSynth.bio,
            experience: existingSynth.experience,
            isExisting: true,
            existingId: existingSynth.id,
            isLoadingImage: true, // Will be generated separately
          });
          continue;
        }
      }

      // Generate new team member using the SAME PROCESS as create-synth-ai
      console.log(`🆕 Generating new member for role: ${roleSpec.role} using optimized process`);
      
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
  "name": "Choose appropriate name for this character type",
  "age": number between ${Math.max(5, averageAge - 2)}-${Math.min(80, averageAge + 2)},
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

Return only the JSON object, nothing else.`;

      const characterResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: characterPrompt }],
        temperature: 0.8,
      });

      const rawCharacterData = characterResponse.choices[0].message.content || '{}';
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
- Team Position: Member ${i + 1} of ${teamConcept.required_roles.length} (MUST be unique from other team members)

REQUIREMENTS:
- Maximum 40-50 words - keep it short and punchy
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

STYLE: "You are [Name], A VERY [TRAIT] [ROLE]. YOU ARE [EMOTION] about [what bothers them], you [how they behave] and you [what they want/need]."

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

      const systemPromptResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: systemPromptRequest }],
        temperature: 0.7,
      });

      const systemPrompt = systemPromptResponse.choices[0].message.content || '';
      console.log(`✅ Generated system prompt for ${characterData.name} (${systemPrompt.length} chars)`);

      // Step 2c: Generate placeholder image (same as create-synth-ai)
      const placeholderImage = generatePlaceholderImage(characterData.name);

      // Step 2d: Create team member with isLoadingImage flag
      teamMembers.push({
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
        isExisting: false,
        isLoadingImage: true, // Flag to indicate image is being generated in background
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
    const generatedTeam: GeneratedTeam = {
      name: teamConcept.team_name,
      description: teamConcept.team_description,
      members: teamMembers,
      teamImage: teamPlaceholderImage,
      collaborationStyle: teamConcept.collaboration_style,
      isLoadingTeamImage: true, // Images will be generated separately
    };

    console.log(`🎉 Successfully generated team: ${generatedTeam.name} with ${teamMembers.length} members (images will be generated separately)`);

    return new Response(JSON.stringify({
      success: true,
      team: generatedTeam
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in create-team-ai:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to generate team',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 