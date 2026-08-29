import CustomSynthCard from '@/components/browser/CustomSynthCard';
import ChatMessageView from '@/components/chat/ChatMessage';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { PreviewComposer, PreviewMemberChips, StudioPreview } from '../StudioPreview';
import { PREVIEW_MEMBERS, PREVIEW_MESSAGES, PREVIEW_SYNTHS } from '../fixtures';

export function StudioScene() {
  return (
    <div className="w-full min-w-0">
      <StudioPreview compact />
    </div>
  );
}

export function ChatThreadScene() {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <p className="text-xs font-medium text-neutral-400">Launch review</p>
        <div className="mt-2">
          <PreviewMemberChips members={PREVIEW_MEMBERS.slice(0, 4)} />
        </div>
      </div>
      <div className="px-4 py-3">
        {PREVIEW_MESSAGES.slice(0, 2).map((message) => (
          <ChatMessageView
            key={message.id}
            message={message}
            employees={PREVIEW_SYNTHS}
            teamMembers={PREVIEW_MEMBERS}
          />
        ))}
      </div>
    </div>
  );
}

export function SynthListScene() {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-3 py-2.5">
        <p className="text-xs font-medium text-neutral-500">Synths</p>
      </div>
      <div className="p-2 [&_button]:hidden">
        {PREVIEW_SYNTHS.map((synth) => (
          <CustomSynthCard
            key={synth.id}
            employee={synth}
            onClick={() => {}}
            onQuickAdd={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

export function ComposerScene() {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="px-4 py-3">
        <ChatMessageView
          message={PREVIEW_MESSAGES[PREVIEW_MESSAGES.length - 1]}
          employees={PREVIEW_SYNTHS}
          teamMembers={PREVIEW_MEMBERS}
        />
      </div>
      <div className="border-t border-neutral-200 p-3">
        <PreviewComposer />
      </div>
    </div>
  );
}

export function SpecSheetScene() {
  return (
    <div className="design-frame w-full min-w-0 space-y-6">
      <div className="flex min-w-0 items-center gap-3">
        <Logo size={36} color="#6b7280" alt="Corals" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Corals</p>
          <p className="text-sm text-neutral-500">Component spec</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {PREVIEW_SYNTHS.slice(0, 4).map((synth) => (
          <PersonAvatar key={synth.id} name={synth.name} src={synth.profileImage} className="h-10 w-10" />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button size="sm">Start trial</Button>
          <Button size="sm" variant="outline">
            How it works
          </Button>
        </div>
      </div>

      <div className="design-spec-split grid gap-4">
        <div className="min-w-0 rounded-lg border border-neutral-200 bg-white p-2 [&_button]:hidden">
          {PREVIEW_SYNTHS.slice(0, 5).map((synth) => (
            <CustomSynthCard
              key={synth.id}
              employee={synth}
              onClick={() => {}}
              onQuickAdd={() => {}}
            />
          ))}
        </div>
        <div className="min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-2">
          {PREVIEW_MESSAGES.slice(0, 2).map((message) => (
            <ChatMessageView
              key={message.id}
              message={message}
              employees={PREVIEW_SYNTHS}
              teamMembers={PREVIEW_MEMBERS}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
