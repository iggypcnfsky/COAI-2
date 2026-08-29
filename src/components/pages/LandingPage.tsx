import { Link } from 'react-router-dom';
import { Bot, Image, MessageSquare, PanelLeftClose, Plus, Send, Trash2, Users, Zap } from 'lucide-react';
import { MarketingHeader } from '@/components/auth/AuthControls';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import Logo from '@/components/Logo';
import CustomSynthCard from '@/components/browser/CustomSynthCard';
import CustomTeamCard from '@/components/browser/CustomTeamCard';
import ChatMessageView from '@/components/chat/ChatMessage';
import { getRoleTeamBadgeColor } from '@/lib/roleColors';
import { DEFAULT_MODEL_ID } from '@shared/models';
import type { AIEmployee, ChatMessage, TeamMember } from '@/types';
import type { CustomTeam } from '@/components/browser/CreateTeamModal';

const FEATURES = [
  {
    icon: Bot,
    title: 'Compose a synth',
    body: 'Give it a role, a voice, and a model. It becomes a person in the room — not another prompt tab.',
  },
  {
    icon: Users,
    title: 'Seat a group',
    body: 'Drop several synths into a thread. They argue, build, and stay in character while you steer.',
  },
  {
    icon: MessageSquare,
    title: 'Keep the room going',
    body: 'Platform models are included. Bring your own OpenRouter key from the account menu if you want.',
  },
];

const PREVIEW_SYNTHS: AIEmployee[] = [
  {
    id: 'preview-anya',
    name: 'Anya Voss',
    role: 'Chair',
    age: 44,
    profileImage: '',
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#8b5cf6',
  },
  {
    id: 'preview-lev',
    name: 'Lev Hart',
    role: 'Skeptic',
    age: 37,
    profileImage: '',
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#f97316',
  },
  {
    id: 'preview-noor',
    name: 'Noor Ellison',
    role: 'Builder',
    age: 31,
    profileImage: '',
    systemPrompt: '',
    baseModel: DEFAULT_MODEL_ID,
    chatColor: '#06b6d4',
  },
];

const PREVIEW_MEMBERS: TeamMember[] = PREVIEW_SYNTHS.map((synth) => ({
  id: synth.id,
  name: synth.name,
  role: synth.role,
  profileImage: synth.profileImage,
  model: synth.baseModel,
  systemPrompt: synth.systemPrompt,
  chatColor: synth.chatColor,
}));

const PREVIEW_GROUP: CustomTeam = {
  id: 'preview-board',
  name: 'Launch review',
  description: 'Chair, skeptic, and builder',
  selectedSynths: PREVIEW_SYNTHS,
  isPublic: true,
};

const PREVIEW_MESSAGES: ChatMessage[] = [
  {
    id: 'preview-user',
    content: 'What’s the fastest path to a believable board meeting?',
    sender: 'user',
    timestamp: new Date('2026-01-15T16:12:00'),
  },
  {
    id: 'preview-anya',
    content: 'Give me a skeptic, a builder, and a numbers person. Then stay out of the way for ten minutes.',
    sender: 'ai',
    timestamp: new Date('2026-01-15T16:12:18'),
    aiEmployee: {
      id: PREVIEW_SYNTHS[0].id,
      name: PREVIEW_SYNTHS[0].name,
      role: PREVIEW_SYNTHS[0].role,
      profileImage: PREVIEW_SYNTHS[0].profileImage,
      model: PREVIEW_SYNTHS[0].baseModel,
    },
  },
  {
    id: 'preview-lev',
    content: 'If they agree too quickly, the room is fake. Seat someone whose job is to stall.',
    sender: 'ai',
    timestamp: new Date('2026-01-15T16:12:32'),
    aiEmployee: {
      id: PREVIEW_SYNTHS[1].id,
      name: PREVIEW_SYNTHS[1].name,
      role: PREVIEW_SYNTHS[1].role,
      profileImage: PREVIEW_SYNTHS[1].profileImage,
      model: PREVIEW_SYNTHS[1].baseModel,
    },
  },
];

function PreviewChatChip() {
  return (
    <div className="flex items-center gap-2 border rounded-full pl-1 pr-3 py-1 bg-blue-50 border-blue-200">
      <div className="flex -space-x-1">
        {PREVIEW_SYNTHS.map((synth) => (
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

function StudioPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <div className="grid min-h-[32rem] md:grid-cols-[16.5rem_1fr]">
        <aside className="hidden min-h-0 flex-col border-r border-neutral-200 md:flex">
          <Tabs defaultValue="synths" className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-neutral-200 p-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5 shrink-0">
                  <Logo size="24px" color="#6b7280" alt="Corals" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-600" tabIndex={-1}>
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
                <TabsList className="grid flex-1 min-w-0 grid-cols-2 rounded-full">
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
            <TabsContent value="groups" className="m-0 flex-1">
              <div className="pointer-events-none p-3">
                <CustomTeamCard
                  team={PREVIEW_GROUP}
                  onClick={() => {}}
                  onQuickAdd={() => {}}
                />
              </div>
            </TabsContent>
            <TabsContent value="synths" className="m-0 flex-1">
              <div className="pointer-events-none p-3">
                {PREVIEW_SYNTHS.map((synth) => (
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
          <div className="mt-auto flex items-center px-3 py-2.5 border-t border-neutral-200">
            <PersonAvatar name="You" className="h-8 w-8" />
          </div>
        </aside>
        <div className="flex min-h-0 flex-col">
          <div className="border-b border-neutral-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium md:text-sm">Chats (1)</h3>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 rounded-full px-2 text-xs" tabIndex={-1}>
                  <Plus className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Create Chat</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full px-2 text-xs text-red-600"
                  tabIndex={-1}
                >
                  <Trash2 className="h-3 w-3 md:mr-1" />
                  <span className="hidden md:inline">Clear Chat</span>
                </Button>
              </div>
            </div>
            <PreviewChatChip />
          </div>
          <div className="border-b border-neutral-200 p-3">
            <h3 className="mb-2 text-xs font-medium md:text-sm">Members ({PREVIEW_MEMBERS.length})</h3>
            <div className="flex flex-wrap gap-2">
              {PREVIEW_MEMBERS.map((member) => (
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
          </div>
          <div className="flex flex-1 flex-col px-4 py-3">
            {PREVIEW_MESSAGES.map((message) => (
              <ChatMessageView
                key={message.id}
                message={message}
                employees={PREVIEW_SYNTHS}
                teamMembers={PREVIEW_MEMBERS}
              />
            ))}
          </div>
          <div className="border-t border-neutral-200 p-3">
            <div className="relative">
              <div className="min-h-[72px] rounded-md border border-neutral-200 bg-transparent px-3 py-2 pr-32 text-sm text-neutral-400">
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
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <MarketingHeader showContinue />

      <main className="mx-auto max-w-6xl px-6 py-16 md:px-10 md:py-20">
        <div className="max-w-2xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">
            Corals
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
            Rooms of minds.
            <br />
            One conversation.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-500">
            Build synths, assemble groups, and run long-form dialogue with models routed through OpenRouter.
            Start a trial — card on file, cancel anytime.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex -space-x-2">
              {PREVIEW_SYNTHS.map((synth) => (
                <PersonAvatar
                  key={synth.id}
                  name={synth.name}
                  src={synth.profileImage}
                  className="h-9 w-9 ring-2 ring-white"
                />
              ))}
            </div>
            <p className="text-sm text-neutral-500">Synths that stay in character</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/sign-up">Start trial</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#how">How it works</a>
            </Button>
          </div>
        </div>

        <div className="mt-14">
          <StudioPreview />
        </div>
      </main>

      <section id="how" className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-16 md:grid-cols-3 md:px-10">
          {FEATURES.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-neutral-200 bg-white p-5"
            >
              <item.icon className="h-4 w-4 text-neutral-500" />
              <h2 className="mt-3 text-base font-semibold tracking-tight">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 md:px-10">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Logo size="16px" color="#6b7280" alt="Corals" />
            Corals
          </div>
          <Link to="/sign-in" className="text-sm text-neutral-500 hover:text-neutral-900">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
