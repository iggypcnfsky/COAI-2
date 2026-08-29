import ChatMessageView from '@/components/chat/ChatMessage';
import FileMentionBadge from '@/components/chat/FileMentionBadge';
import MentionBadge from '@/components/chat/MentionBadge';
import { PreviewComposer, PreviewMemberChips } from '../StudioPreview';
import {
  PREVIEW_CONTINUATION,
  PREVIEW_LOADING_MESSAGE,
  PREVIEW_MEMBERS,
  PREVIEW_MESSAGES,
  PREVIEW_SYNTHS,
} from '../fixtures';

export function MessageStory() {
  return (
    <div className="w-full min-w-0">
      {PREVIEW_MESSAGES.map((message) => (
        <ChatMessageView
          key={message.id}
          message={message}
          employees={PREVIEW_SYNTHS}
          teamMembers={PREVIEW_MEMBERS}
        />
      ))}
    </div>
  );
}

export function ContinuationStory() {
  return (
    <div className="w-full min-w-0">
      <ChatMessageView
        message={PREVIEW_CONTINUATION[0]}
        employees={PREVIEW_SYNTHS}
        teamMembers={PREVIEW_MEMBERS}
        hasFollowUp
      />
      <ChatMessageView
        message={PREVIEW_CONTINUATION[1]}
        employees={PREVIEW_SYNTHS}
        teamMembers={PREVIEW_MEMBERS}
        isContinuation
      />
      <ChatMessageView
        message={PREVIEW_LOADING_MESSAGE}
        employees={PREVIEW_SYNTHS}
        teamMembers={PREVIEW_MEMBERS}
      />
    </div>
  );
}

export function MentionsStory() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PREVIEW_SYNTHS.map((synth) => (
        <MentionBadge key={synth.id} employee={synth} />
      ))}
      <FileMentionBadge title="brief.md" />
    </div>
  );
}

export function MembersStory() {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="p-3">
        <h3 className="mb-2 text-sm font-medium">Members ({PREVIEW_MEMBERS.length})</h3>
        <PreviewMemberChips />
      </div>
    </div>
  );
}

export function MemberChipsStory() {
  return <PreviewMemberChips />;
}

export function ComposerStory() {
  return (
    <div className="w-full min-w-0 rounded-lg border border-neutral-200 bg-white p-3">
      <PreviewComposer />
    </div>
  );
}
