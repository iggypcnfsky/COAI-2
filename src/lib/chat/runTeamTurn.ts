import { DEFAULT_MODEL_ID } from '@shared/models';
import type { COAIMessage, COAITeamSynthReference } from '../../types';
import {
  MAX_SPEAKERS_PER_TURN,
  findAddressedTeammate,
  isContinuePrompt,
  pickSpeakers,
  type ThreadParticipant,
} from './turnPlanner';
import { splitChatBubbles } from './bubbles';
import { buildMessagesForSpeaker, groupSystemPrompt, type ChatTurn, type LlmChatMessage } from './transcript';
import {
  createReinjectedPrompt,
  enhanceSystemPromptForConsistency,
  logPromptReinjection,
  shouldInjectPrompt,
  shouldReinforceCharacter,
} from '../utils/promptReinjection';
import { trimMessagesToTokenLimit } from '../utils/tokenUtils';

export function participantsFromThreadSynths(
  teamSynths: { synthId: string; reference: COAITeamSynthReference }[],
): ThreadParticipant[] {
  return teamSynths
    .filter((ts) => Boolean(ts.synthId))
    .map((ts) => ({
      synthId: ts.synthId,
      name: ts.reference.metadata?.name || 'AI',
      role: ts.reference.metadata?.role || 'Assistant',
      systemPrompt: ts.reference.metadata?.systemPrompt,
      model: ts.reference.metadata?.model || DEFAULT_MODEL_ID,
      profileImage: ts.reference.metadata?.profileImage,
      chatColor: ts.reference.metadata?.chatColor,
      _freshStartApplied: (ts.reference.metadata as { _freshStartApplied?: boolean } | undefined)?._freshStartApplied,
    }));
}

export function messagesToTurns(threadMessages: COAIMessage[]): ChatTurn[] {
  return [...threadMessages]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .filter((msg) => !msg.message_data.isLoading)
    .map((msg) => {
      const data = msg.message_data;
      const isUser = data.sender === 'user';
      const raw = data.content || '';
      const image = data.image?.url && !data.image._wasStripped
        ? { url: data.image.url, name: data.image.name, type: data.image.type }
        : undefined;
      return {
        speakerId: isUser ? 'user' : (data.aiEmployee?.id || 'ai'),
        speakerName: isUser ? 'User' : (data.aiEmployee?.name || 'AI'),
        content: isContinuePrompt(raw) ? 'Please continue among yourselves.' : raw,
        image,
      };
    });
}

export function buildSpeakerSystemPrompt(
  participant: ThreadParticipant,
  roster: ThreadParticipant[],
  messageCount: number,
  isFreshStart: boolean,
): { systemPrompt: string; reinjectionReason: 'interval' | 'reinforcement' | 'fresh_start' | null; enhancedCharacterPrompt: string } {
  const basePrompt = participant.systemPrompt
    || `You are ${participant.name}. Respond according to your role.`;

  let enhancedPrompt = basePrompt;
  let reinjectionReason: 'interval' | 'reinforcement' | 'fresh_start' | null = null;

  if (isFreshStart) {
    enhancedPrompt = basePrompt;
    reinjectionReason = 'fresh_start';
  } else if (shouldInjectPrompt(messageCount)) {
    enhancedPrompt = createReinjectedPrompt(basePrompt, false);
    reinjectionReason = 'interval';
  } else if (shouldReinforceCharacter(messageCount)) {
    enhancedPrompt = createReinjectedPrompt(basePrompt, true);
    reinjectionReason = 'reinforcement';
  }

  enhancedPrompt = enhanceSystemPromptForConsistency(
    enhancedPrompt,
    participant.name,
    participant.role,
    messageCount,
  );

  return {
    systemPrompt: `${groupSystemPrompt(participant, roster)}\n\n${enhancedPrompt}`,
    reinjectionReason,
    enhancedCharacterPrompt: enhancedPrompt,
  };
}

export async function planAndRunTurns(opts: {
  participants: ThreadParticipant[];
  history: ChatTurn[];
  speak: (participant: ThreadParticipant, messages: LlmChatMessage[], systemPrompt: string) => Promise<string>;
  onFreshStart?: (participant: ThreadParticipant) => void;
}) {
  const { participants, speak, onFreshStart } = opts;
  const turns = [...opts.history];
  if (participants.length === 0) return;

  const lastUser = [...turns].reverse().find((turn) => turn.speakerId === 'user');
  const lastAi = [...turns].reverse().find((turn) => turn.speakerId !== 'user');
  const queue = pickSpeakers({
    participants,
    userMessage: lastUser?.content || '',
    isContinue: isContinuePrompt(lastUser?.content || '') || lastUser?.content === 'Please continue among yourselves.',
    lastSpeakerId: lastAi?.speakerId,
  });

  const alreadySpoke = new Set<string>();
  let generations = 0;

  while (queue.length > 0 && generations < MAX_SPEAKERS_PER_TURN) {
    const participant = queue.shift();
    if (!participant || alreadySpoke.has(participant.synthId)) continue;
    alreadySpoke.add(participant.synthId);
    generations += 1;

    const llmMessages = trimMessagesToTokenLimit(
      buildMessagesForSpeaker(turns, participant),
      40000,
      2000,
    ) as LlmChatMessage[];
    const isFreshStart = Boolean(participant._freshStartApplied);
    const { systemPrompt, reinjectionReason } = buildSpeakerSystemPrompt(
      participant,
      participants,
      llmMessages.length,
      isFreshStart,
    );
    if (reinjectionReason) logPromptReinjection(participant.name, llmMessages.length, reinjectionReason);
    if (isFreshStart) onFreshStart?.(participant);

    try {
      const content = await speak(participant, llmMessages, systemPrompt);
      const bubbles = splitChatBubbles(content);
      for (const bubble of bubbles.length > 0 ? bubbles : [content]) {
        turns.push({
          speakerId: participant.synthId,
          speakerName: participant.name,
          content: bubble,
        });
      }

      if (generations >= MAX_SPEAKERS_PER_TURN) break;
      const addressed = findAddressedTeammate(content, participants, alreadySpoke, participant.synthId);
      if (addressed) queue.push(addressed);
    } catch (error) {
      console.error(`Failed to generate response for ${participant.name}:`, error);
    }
  }
}
