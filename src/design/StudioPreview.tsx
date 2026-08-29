import { Bot, Image, PanelLeftClose, Plus, Send, Trash2, Users, Zap } from 'lucide-react';
import CustomSynthCard from '@/components/browser/CustomSynthCard';
import CustomTeamCard from '@/components/browser/CustomTeamCard';
import ChatMessageView from '@/components/chat/ChatMessage';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRoleTeamBadgeColor } from '@/lib/roleColors';
import type { TeamMember } from '@/types';
import { PREVIEW_GROUP, PREVIEW_MEMBERS, PREVIEW_MESSAGES, PREVIEW_SYNTHS } from './fixtures';

export function PreviewChatChip() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 py-1 pl-1 pr-3">
      <div className="flex -space-x-1">
        {PREVIEW_SYNTHS.slice(0, 4).map((synth) => (
          <PersonAvatar
            key={synth.id}
            name={synth.name}
            src={synth.profileImage}
            className="h-6 w-6 border-2 border-white"
          />
        ))}
      </div>
      <span className="text-xs font-medium">Launch review</span>
    </div>
  );
}

export function PreviewMemberChips({ members = PREVIEW_MEMBERS }: { members?: TeamMember[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((member) => (
        <div
          key={member.id}
          className={`flex flex-shrink-0 items-center gap-1 rounded-full border py-1 pl-1 pr-2 ${getRoleTeamBadgeColor(member.role)}`}
          style={
            member.chatColor
              ? {
                  backgroundColor: `${member.chatColor}20`,
                  borderColor: member.chatColor,
                }
              : undefined
          }
        >
          <PersonAvatar name={member.name} src={member.profileImage} className="h-6 w-6" />
          <span className="text-xs font-medium">{member.name}</span>
          <span className="text-xs text-neutral-500">{member.role}</span>
        </div>
      ))}
    </div>
  );
}

export function PreviewComposer({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative">
      <div
        className={
          compact
            ? 'min-h-[52px] rounded-md border border-neutral-200 bg-transparent px-3 py-2 pr-28 text-sm text-neutral-400'
            : 'min-h-[72px] rounded-md border border-neutral-200 bg-transparent px-3 py-2 pr-32 text-sm text-neutral-400'
        }
      >
        Type your message... Use @ to mention team members
      </div>
      <div className="absolute bottom-2 right-2 flex items-center space-x-1">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-neutral-500" tabIndex={-1}>
          <Zap className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-neutral-500" tabIndex={-1}>
          <Image className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" disabled className="h-8 w-8 bg-neutral-300" tabIndex={-1}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function StudioPreview({ compact = false }: { compact?: boolean }) {
  const members = PREVIEW_MEMBERS.slice(0, compact ? 0 : 4);
  const messages = compact ? PREVIEW_MESSAGES.slice(0, 2) : PREVIEW_MESSAGES;
  const synths = PREVIEW_SYNTHS.slice(0, compact ? 4 : 5);

  return (
    <div
      aria-hidden="true"
      className="design-frame w-full min-w-0 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <div className="design-frame-split grid">
        <aside className="design-frame-aside border-neutral-200">
          <Tabs defaultValue="synths" className="flex flex-col">
            <div className="border-b border-neutral-200 p-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="flex shrink-0 items-center gap-0.5">
                  <Logo size="24px" color="#6b7280" alt="Corals" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-600" tabIndex={-1}>
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                <TabsList className="grid min-w-0 flex-1 grid-cols-2 rounded-full">
                  <TabsTrigger value="synths" className="flex items-center gap-2 rounded-full">
                    <Bot className="h-4 w-4" />
                    <span>Synths</span>
                  </TabsTrigger>
                  <TabsTrigger value="groups" className="flex items-center gap-2 rounded-full">
                    <Users className="h-4 w-4" />
                    <span>Groups</span>
                  </TabsTrigger>
                </TabsList>
                <Button size="sm" variant="outline" className="shrink-0 rounded-full" tabIndex={-1}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <TabsContent value="groups" className="m-0">
              <div className="pointer-events-none p-3 [&_button]:hidden">
                <CustomTeamCard team={PREVIEW_GROUP} onClick={() => {}} onQuickAdd={() => {}} />
              </div>
            </TabsContent>
            <TabsContent value="synths" className="m-0">
              <div className="pointer-events-none p-3 [&_button]:hidden">
                {synths.map((synth) => (
                  <CustomSynthCard
                    key={synth.id}
                    employee={synth}
                    onClick={() => {}}
                    onQuickAdd={() => {}}
                  />
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <div className="mt-auto flex items-center border-t border-neutral-200 px-3 py-2.5">
            <PersonAvatar name="You" className="h-8 w-8" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <div className={compact ? 'border-b border-neutral-200 p-2.5' : 'border-b border-neutral-200 p-3'}>
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-medium sm:text-sm">Chats (1)</h3>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" className="h-7 rounded-full px-2 text-xs" tabIndex={-1}>
                  <Plus className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Create Chat</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full px-2 text-xs text-red-600"
                  tabIndex={-1}
                >
                  <Trash2 className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Clear Chat</span>
                </Button>
              </div>
            </div>
            <PreviewChatChip />
          </div>
          {members.length > 0 && (
            <div className="border-b border-neutral-200 p-3">
              <h3 className="mb-2 text-xs font-medium sm:text-sm">Members ({members.length})</h3>
              <PreviewMemberChips members={members} />
            </div>
          )}
          <div className={compact ? 'px-3 py-2' : 'px-4 py-3'}>
            {messages.map((message) => (
              <ChatMessageView
                key={message.id}
                message={message}
                employees={PREVIEW_SYNTHS}
                teamMembers={PREVIEW_MEMBERS}
              />
            ))}
          </div>
          <div className={compact ? 'border-t border-neutral-200 p-2.5' : 'border-t border-neutral-200 p-3'}>
            <PreviewComposer compact={compact} />
          </div>
        </div>
      </div>
    </div>
  );
}
