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

required_roles MUST contain exactly ${teamSize} roles.
Average member age around ${averageAge}.
BE LITERAL to the keywords.`;
}
