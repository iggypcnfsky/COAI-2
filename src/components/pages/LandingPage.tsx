import { Link } from 'react-router-dom';
import { Bot, MessageSquare, Users } from 'lucide-react';
import { MarketingHeader } from '@/components/auth/AuthControls';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import Logo from '@/components/Logo';
import { PREVIEW_SYNTHS } from '@/design/fixtures';
import { StudioPreview } from '@/design/StudioPreview';

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
              {PREVIEW_SYNTHS.slice(0, 6).map((synth) => (
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
