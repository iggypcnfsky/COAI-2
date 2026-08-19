import { Hono } from 'hono';
import { z } from 'zod';
import { getUserByClerkId } from '../lib/users.js';
import { cleanJsonResponse, completeText, createOpenRouterClient } from '../llm/openrouter.js';
import { characterPrompt, groupRosterPrompt, systemPromptRequest } from '../llm/prompts.js';
import { generateSynthPortrait, generateTeamPortrait } from '../llm/replicate.js';
import { generatePlaceholderImage, generateTeamPlaceholderImage } from '../llm/svg.js';
import { DEFAULT_MODEL_ID } from '../../../shared/models.js';

export const generateRoutes = new Hono();

generateRoutes.post('/synth', async (c) => {
  const { clerkId } = c.get('authUser');
  const user = await getUserByClerkId(clerkId);
  const body = z.object({
    keywords: z.string().min(1),
    baseModel: z.string().optional(),
    averageAge: z.number().optional(),
    gender: z.string().optional(),
  }).parse(await c.req.json());

  const model = body.baseModel || DEFAULT_MODEL_ID;
  const client = createOpenRouterClient(user?.openrouterKeyEncrypted);
  const raw = await completeText({
    client,
    model,
    prompt: characterPrompt(body.keywords, body.averageAge ?? 35, body.gender ?? 'any'),
    temperature: 0.5,
  });
  const character = JSON.parse(cleanJsonResponse(raw));
  const systemPrompt = await completeText({
    client,
    model,
    prompt: systemPromptRequest(character, body.keywords),
    temperature: 0.7,
  });

  return c.json({
    success: true,
    synth: {
      name: character.name,
      age: character.age,
      gender: character.gender || body.gender,
      role: character.role,
      systemPrompt,
      baseModel: model,
      profileImage: generatePlaceholderImage(character.name),
      bio: character.bio,
      personalityTraits: character.personality_traits,
      background: character.background,
      currentSituation: character.current_situation,
      isLoadingImage: true,
    },
  });
});

generateRoutes.post('/team', async (c) => {
  const { clerkId } = c.get('authUser');
  const user = await getUserByClerkId(clerkId);
  const body = z.object({
    keywords: z.string().min(1),
    teamSize: z.number().int().min(1).max(8).optional(),
    useExistingSynths: z.boolean().optional(),
    existingSynths: z.array(z.record(z.unknown())).optional(),
    baseModel: z.string().optional(),
    teamType: z.enum(['team', 'group']).optional(),
    averageAge: z.number().optional(),
    genderDistribution: z.record(z.number()).optional(),
  }).parse(await c.req.json());

  const model = body.baseModel || DEFAULT_MODEL_ID;
  const teamSize = body.teamSize ?? 3;
  const averageAge = body.averageAge ?? 35;
  const client = createOpenRouterClient(user?.openrouterKeyEncrypted);
  const genderDistribution = body.genderDistribution as
    | { male?: number; female?: number; nonBinary?: number }
    | undefined;

  const rosterRaw = await completeText({
    client,
    model,
    prompt: groupRosterPrompt(body.keywords, teamSize, averageAge, genderDistribution),
    temperature: 0.9,
  });
  const roster = JSON.parse(cleanJsonResponse(rosterRaw));
  const rosterMembers: Array<Record<string, unknown>> = Array.isArray(roster.members)
    ? roster.members.slice(0, teamSize)
    : [];

  while (rosterMembers.length < teamSize) {
    rosterMembers.push({
      name: `${body.keywords} member ${rosterMembers.length + 1}`,
      age: averageAge,
      gender: 'any',
      role: `${body.keywords} specialist`,
    });
  }

  const usedNames = new Set<string>();
  const usedAges = new Set<number>();
  const fallbackSurnames = ['Okada', 'Voss', 'Rahman', 'Ellison', 'Petrov', 'Mwangi', 'Santos', 'Kaur'];
  const uniqueMembers = rosterMembers.map((member, index) => {
    let name = String(member.name || `Member ${index + 1}`).trim();
    const nameKey = name.toLowerCase();
    if (usedNames.has(nameKey)) {
      const parts = name.split(/\s+/);
      const first = parts[0] || 'Member';
      const surname = fallbackSurnames.find((s) => !usedNames.has(`${first} ${s}`.toLowerCase())) || `Lane${index + 1}`;
      name = `${first} ${surname}`;
    }
    usedNames.add(name.toLowerCase());

    let age = Number(member.age);
    if (!Number.isFinite(age)) age = averageAge + index * 3;
    while (usedAges.has(age)) age += 1;
    usedAges.add(age);

    return { ...member, name, age };
  });

  const members = [];
  for (const character of uniqueMembers) {
    const role = String(character.role || body.keywords);
    const existing = (body.existingSynths ?? []).find((s) =>
      String(s.role || '').toLowerCase() === role.toLowerCase()
    );
    if (body.useExistingSynths && existing) {
      members.push({
        ...existing,
        isExisting: true,
        isLoadingImage: false,
        profileImage: existing.profileImage || generatePlaceholderImage(String(existing.name || role)),
      });
      continue;
    }

    const systemPrompt = await completeText({
      client,
      model,
      prompt: systemPromptRequest({
        name: String(character.name),
        role,
        bio: character.bio ? String(character.bio) : undefined,
        personality_traits: Array.isArray(character.personality_traits)
          ? character.personality_traits.map(String)
          : undefined,
        background: character.background ? String(character.background) : undefined,
        current_situation: character.current_situation ? String(character.current_situation) : undefined,
      }, body.keywords),
      temperature: 0.8,
    });

    members.push({
      name: String(character.name),
      age: Number(character.age),
      gender: character.gender ? String(character.gender) : undefined,
      role,
      systemPrompt,
      baseModel: model,
      profileImage: generatePlaceholderImage(String(character.name)),
      bio: character.bio ? String(character.bio) : undefined,
      isExisting: false,
      isLoadingImage: true,
    });
  }

  return c.json({
    success: true,
    team: {
      name: roster.team_name,
      description: roster.team_description,
      members,
      teamImage: generateTeamPlaceholderImage(roster.team_name || body.keywords),
      collaborationStyle: roster.collaboration_style,
      isLoadingTeamImage: true,
    },
  });
});

generateRoutes.post('/image', async (c) => {
  const body = z.object({
    kind: z.enum(['synth', 'team']).default('synth'),
    name: z.string().min(1).max(100),
    role: z.string().max(120).optional(),
    age: z.number().min(1).max(120).optional(),
    gender: z.string().max(40).optional(),
    bio: z.string().max(500).optional(),
    keywords: z.string().max(300).optional(),
    description: z.string().max(500).optional(),
  }).parse(await c.req.json());

  const url = body.kind === 'team'
    ? await generateTeamPortrait({
        name: body.name,
        description: body.description,
        keywords: body.keywords,
      })
    : await generateSynthPortrait({
        name: body.name,
        role: body.role,
        age: body.age,
        gender: body.gender,
        bio: body.bio,
        keywords: body.keywords,
      });

  return c.json({ success: true, url });
});
