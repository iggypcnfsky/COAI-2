export const CONTINUE_PROMPT =
  '[Continue the conversation - explore the topic further and share your thoughts among the team]';

export const MAX_SPEAKERS_PER_TURN = 3;
export const MENTION_NAME_RE = /@([A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s|$)/g;

export type ThreadParticipant = {
  synthId: string;
  name: string;
  role: string;
  systemPrompt?: string;
  model?: string;
  profileImage?: string;
  chatColor?: string;
  _freshStartApplied?: boolean;
};

export function isContinuePrompt(content: string) {
  return content.trim() === CONTINUE_PROMPT || content.trim() === 'Please continue among yourselves.';
}

export function parseMentionedParticipants(text: string, participants: ThreadParticipant[]) {
  const mentioned: ThreadParticipant[] = [];
  const seen = new Set<string>();
  const regex = new RegExp(MENTION_NAME_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const mentionName = match[1].toLowerCase();
    const found = participants.find((p) => p.name.toLowerCase() === mentionName);
    if (found && !seen.has(found.synthId)) {
      seen.add(found.synthId);
      mentioned.push(found);
    }
  }
  return mentioned;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function speakerSubsetSize(count: number, isContinue: boolean) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (isContinue) return 1;
  if (count === 2) return 1;
  if (count === 3) return Math.random() < 0.55 ? 1 : 2;
  return 2;
}

export function pickSpeakers(opts: {
  participants: ThreadParticipant[];
  userMessage: string;
  isContinue?: boolean;
  lastSpeakerId?: string | null;
}): ThreadParticipant[] {
  const { participants, userMessage, isContinue = false, lastSpeakerId } = opts;
  if (participants.length === 0) return [];

  const mentioned = parseMentionedParticipants(userMessage, participants);
  if (mentioned.length > 0) {
    return shuffle(mentioned).slice(0, MAX_SPEAKERS_PER_TURN);
  }

  const size = Math.min(speakerSubsetSize(participants.length, isContinue), MAX_SPEAKERS_PER_TURN);
  const others = lastSpeakerId
    ? participants.filter((p) => p.synthId !== lastSpeakerId)
    : participants;
  const last = lastSpeakerId ? participants.find((p) => p.synthId === lastSpeakerId) : undefined;
  const picked = shuffle(others).slice(0, size);
  if (picked.length < size && last) picked.push(last);
  return picked;
}

function namePattern(name: string) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findAddressedTeammate(
  reply: string,
  participants: ThreadParticipant[],
  alreadySpoke: Set<string>,
  currentSpeakerId: string,
): ThreadParticipant | null {
  const mentioned = parseMentionedParticipants(reply, participants);
  const fromMention = mentioned.find(
    (p) => p.synthId !== currentSpeakerId && !alreadySpoke.has(p.synthId),
  );
  if (fromMention) return fromMention;

  for (const participant of participants) {
    if (participant.synthId === currentSpeakerId || alreadySpoke.has(participant.synthId)) continue;
    const escaped = namePattern(participant.name);
    const addressed =
      new RegExp(`^${escaped}\\s*[,:]`, 'i').test(reply.trim()) ||
      new RegExp(`\\b${escaped}\\b[,?]`, 'i').test(reply);
    if (addressed) return participant;
  }
  return null;
}
