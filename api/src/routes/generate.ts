import { Hono } from 'hono';
import { z } from 'zod';
import { getUserByClerkId } from '../lib/users.js';
import { cleanJsonResponse, completeText, createOpenRouterClient } from '../llm/openrouter.js';
import { characterPrompt, systemPromptRequest, teamConceptPrompt } from '../llm/prompts.js';
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
      isLoadingImage: false,
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
  const teamType = body.teamType ?? 'team';
  const client = createOpenRouterClient(user?.openrouterKeyEncrypted);

  const conceptRaw = await completeText({
    client,
    model,
    prompt: teamConceptPrompt(body.keywords, teamSize, teamType, body.averageAge ?? 35),
    temperature: 0.6,
  });
  const concept = JSON.parse(cleanJsonResponse(conceptRaw));
  const roles: Array<{ role: string }> = Array.isArray(concept.required_roles)
    ? concept.required_roles.slice(0, teamSize)
    : [];
  while (roles.length < teamSize) {
    roles.push({ role: `${body.keywords} member ${roles.length + 1}` });
  }

  const members = [];
  for (const role of roles) {
    const existing = (body.existingSynths ?? []).find((s) =>
      String(s.role || '').toLowerCase() === String(role.role).toLowerCase()
    );
    if (body.useExistingSynths && existing) {
      members.push({
        ...existing,
        isExisting: true,
        isLoadingImage: false,
        profileImage: existing.profileImage || generatePlaceholderImage(String(existing.name || role.role)),
      });
      continue;
    }
    const keywords = `${role.role} ${body.keywords}`;
    const raw = await completeText({
      client,
      model,
      prompt: characterPrompt(keywords, body.averageAge ?? 35, 'any'),
      temperature: 0.5,
    });
    const character = JSON.parse(cleanJsonResponse(raw));
    const systemPrompt = await completeText({
      client,
      model,
      prompt: systemPromptRequest(character, keywords),
      temperature: 0.7,
    });
    members.push({
      name: character.name,
      age: character.age,
      gender: character.gender,
      role: character.role,
      systemPrompt,
      baseModel: model,
      profileImage: generatePlaceholderImage(character.name),
      bio: character.bio,
      isExisting: false,
      isLoadingImage: false,
    });
  }

  return c.json({
    success: true,
    team: {
      name: concept.team_name,
      description: concept.team_description,
      members,
      teamImage: generateTeamPlaceholderImage(concept.team_name || body.keywords),
      collaborationStyle: concept.collaboration_style,
      isLoadingTeamImage: false,
    },
  });
});

generateRoutes.post('/image', async (c) => {
  return c.json({
    success: true,
    deferred: true,
    message: 'Image generation is not enabled yet. SVG placeholders are used instead.',
  });
});
