import type { ThreadParticipant } from './turnPlanner';

export type ChatTurnImage = {
  url: string;
  name?: string;
  type?: string;
};

export type ChatTurn = {
  speakerId: string;
  speakerName: string;
  content: string;
  image?: ChatTurnImage;
};

export type LlmChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  image?: ChatTurnImage;
};

export function groupSystemPrompt(current: ThreadParticipant, roster: ThreadParticipant[]) {
  const others = roster.filter((p) => p.synthId !== current.synthId);
  const lines = [
    '- User (the human)',
    ...others.map((p) => `- ${p.name}${p.role ? ` (${p.role})` : ''}`),
  ].join('\n');

  return `You are ${current.name}${current.role ? `, ${current.role}` : ''}.

Also in this chat:
${lines}

Speak only as yourself. You may talk to the user or to a teammate by name (for example "@${others[0]?.name || 'Alex'} that's a stretch because..."). Do not recap what someone just said; add one new beat, a question, or a disagreement. Keep it short unless the user asked for depth. Not everyone speaks every turn — if you were called on, show up as yourself, not as a panel.

Other speakers are labeled [Name]. Your own previous lines are unlabeled assistant messages.`;
}

export function buildMessagesForSpeaker(history: ChatTurn[], current: ThreadParticipant): LlmChatMessage[] {
  return history
    .filter((turn) => turn.content.trim() || turn.image?.url)
    .map((turn) => {
      const isSelf = turn.speakerId === current.synthId;
      if (isSelf) {
        return {
          role: 'assistant' as const,
          content: turn.content,
        };
      }
      const label = turn.speakerId === 'user' ? 'User' : turn.speakerName;
      return {
        role: 'user' as const,
        content: `[${label}]: ${turn.content}`.trim(),
        ...(turn.image?.url ? { image: turn.image } : {}),
      };
    });
}
