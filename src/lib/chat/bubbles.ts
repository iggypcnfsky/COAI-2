export const MAX_CHAT_BUBBLES = 12;
const CHATTY_MAX = 140;

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function bubbleDelayMs(text: string) {
  return Math.min(420, Math.max(160, 140 + Math.min(text.trim().length, 80) * 2));
}

export async function revealText(
  current: string,
  target: string,
  onUpdate: (text: string) => void,
) {
  if (target === current) return;
  if (!target.startsWith(current)) {
    onUpdate(target);
    return;
  }

  let shown = current;
  const words = target.slice(current.length).match(/\s*\S+/g) || [];
  let i = 0;
  while (i < words.length) {
    const remaining = words.length - i;
    const n = remaining <= 2 ? remaining : 1 + Math.floor(Math.random() * Math.min(4, remaining));
    shown += words.slice(i, i + n).join('');
    i += n;
    onUpdate(shown);
    await sleep(10 + n * 5);
  }
}

function isFenceLine(line: string) {
  return line.trim().startsWith('```');
}

function isNumberedItem(line: string) {
  return /^\s*\d+[.)]\s+/.test(line);
}

function isBulletItem(line: string) {
  return /^\s*[-*•]\s+/.test(line);
}

function endsLikeSentence(text: string) {
  return /[.!?…]["')\]]?\s*$/.test(text.trim());
}

function capBubbles(parts: string[]) {
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  if (cleaned.length <= MAX_CHAT_BUBBLES) return cleaned;
  return [
    ...cleaned.slice(0, MAX_CHAT_BUBBLES - 1),
    cleaned.slice(MAX_CHAT_BUBBLES - 1).join('\n\n'),
  ];
}

function breakLongBubble(text: string): string[] {
  if (text.includes('```') || text.length <= CHATTY_MAX) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+(?:["')\]]+)?\s*|[^.!?]+$/g) || [text];
  const parts: string[] = [];
  let acc = '';
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    const next = acc ? `${acc} ${sentence}` : sentence;
    if (acc && next.length > CHATTY_MAX) {
      parts.push(acc);
      acc = sentence;
    } else {
      acc = next;
    }
  }
  if (acc) parts.push(acc);
  return parts.length > 0 ? parts : [text];
}

function closeCurrent(closed: string[], current: string) {
  const trimmed = current.trim();
  if (!trimmed) return;
  closed.push(...breakLongBubble(trimmed));
}

export function splitClosedChatBubbles(buffer: string): { closed: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const closed: string[] = [];
  let current = '';
  let inFence = false;

  for (const line of normalized.split('\n')) {
    if (isFenceLine(line)) {
      inFence = !inFence;
      current = current ? `${current}\n${line}` : line;
      continue;
    }

    if (inFence) {
      current = current ? `${current}\n${line}` : line;
      continue;
    }

    if (line.trim() === '') {
      closeCurrent(closed, current);
      current = '';
      continue;
    }

    if (isNumberedItem(line) && current.trim()) {
      closeCurrent(closed, current);
      current = line;
      continue;
    }

    if (current.trim() && endsLikeSentence(current) && !isBulletItem(line) && !isNumberedItem(line)) {
      closeCurrent(closed, current);
      current = line;
      continue;
    }

    current = current ? `${current}\n${line}` : line;
  }

  return { closed, rest: current };
}

export function splitChatBubbles(text: string): string[] {
  const { closed, rest } = splitClosedChatBubbles(`${text.replace(/\s+$/, '')}\n\n`);
  return capBubbles(rest.trim() ? [...closed, ...breakLongBubble(rest.trim())] : closed);
}
