export function characterPrompt(keywords: string, averageAge: number, gender: string) {
  const genderInstruction = gender === 'any'
    ? 'Choose an appropriate gender that fits the character description. Include the chosen gender in the response.'
    : `The character MUST be ${gender}. This is a strict requirement.`;

  return `Based on these keywords: "${keywords}"

Create a character that LITERALLY IS what the keywords describe. Be realistic and authentic.

CRITICAL GENDER REQUIREMENT: ${genderInstruction}

IMPORTANT: Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

JSON structure required:
{
  "name": "A distinctive name that matches the gender",
  "age": number between ${Math.max(5, averageAge - 2)}-${Math.min(80, averageAge + 2)},
  "gender": "${gender === 'any' ? 'Choose: male, female, or non-binary' : gender}",
  "role": "2-3 words maximum - LITERALLY what the keywords describe",
  "bio": "2-3 sentence bio that reflects what they ARE based on the keywords",
  "personality_traits": ["trait1", "trait2", "trait3"],
  "background": "Brief background that explains why they are this way",
  "current_situation": "What their current life situation is like"
}

BE LITERAL. Return only the JSON object.`;
}

export function systemPromptRequest(character: {
  name: string;
  role: string;
  bio?: string;
  personality_traits?: string[];
  background?: string;
  current_situation?: string;
}, keywords: string) {
  return `Create a VERY DIRECT, RAW system prompt for this character based on what they actually ARE:

CHARACTER PROFILE:
- Name: ${character.name}
- Role/Type: ${character.role}
- Bio: ${character.bio}
- Personality: ${character.personality_traits?.join(', ')}
- Background: ${character.background}
- Current Situation: ${character.current_situation}
- Original Keywords: ${keywords}

REQUIREMENTS:
- Maximum 200 words
- Use CAPS for emphasis on key emotions and traits
- Be BLUNT and DIRECT
- Written in second person ("You are...")
- Add age-appropriate communication instructions
Return ONLY the raw system prompt.`;
}

export function teamConceptPrompt(keywords: string, teamSize: number, teamType: string, averageAge: number) {
  return `Create a ${teamType} concept from these keywords: "${keywords}"

Return ONLY valid JSON:
{
  "team_name": "short distinctive name",
  "team_description": "1-2 sentences",
  "collaboration_style": "how they work together",
  "required_roles": [{"role": "2-3 words", "why": "one sentence"}]
}

required_roles MUST contain exactly ${teamSize} DIFFERENT complementary roles. Never repeat a role.
Average member age around ${averageAge}, but members should not all be the same age.
BE LITERAL to the keywords.`;
}

export function groupRosterPrompt(
  keywords: string,
  teamSize: number,
  averageAge: number,
  genderDistribution?: { male?: number; female?: number; nonBinary?: number }
) {
  const minAge = Math.max(18, averageAge - 14);
  const maxAge = Math.min(72, averageAge + 14);
  const male = genderDistribution?.male ?? 34;
  const female = genderDistribution?.female ?? 34;
  const nonBinary = genderDistribution?.nonBinary ?? 32;

  return `Create a group of ${teamSize} DISTINCT people from these keywords: "${keywords}"

DIVERSITY IS MANDATORY. The group must feel like real different people, not clones.
- Every member MUST have a unique first name AND a unique last name. Never reuse a surname.
- Do not invent lookalike names (no Claire Sterling twice, no Claire Sterling / Clara Sterling).
- Ages MUST all be different integers between ${minAge} and ${maxAge}, spread around ${averageAge} — never give two people the same age.
- Mix genders roughly ${male}% male, ${female}% female, ${nonBinary}% non-binary unless the keywords clearly require a specific mix.
- Each role must be different and complementary. Never duplicate a role or slightly rephrase the same job.
- Give each person a distinct personality, background, speaking style, and life situation.
- Stay literal to the keywords, but vary who these people ARE within that brief.

Return ONLY valid JSON:
{
  "team_name": "short distinctive group name",
  "team_description": "1-2 sentences",
  "collaboration_style": "how they work together",
  "members": [
    {
      "name": "First Last",
      "age": number,
      "gender": "male" | "female" | "non-binary",
      "role": "2-3 words",
      "bio": "2-3 sentence bio",
      "personality_traits": ["trait1", "trait2", "trait3"],
      "background": "brief background",
      "current_situation": "current life situation"
    }
  ]
}

members MUST contain exactly ${teamSize} people. Return only the JSON object.`;
}
