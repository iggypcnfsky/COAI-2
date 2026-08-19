import { Link } from 'react-router-dom';
import { Bot, MessageSquare, Users } from 'lucide-react';
import { MarketingHeader } from '@/components/auth/AuthControls';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';

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

function StudioPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <Logo size="18px" color="#6b7280" />
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700">
            beta
          </span>
        </div>
        <div className="h-6 w-6 rounded-full bg-neutral-200" />
      </div>
      <div className="grid min-h-[22rem] md:grid-cols-[13.5rem_1fr]">
        <aside className="hidden border-r border-neutral-200 md:flex md:flex-col">
          <div className="grid grid-cols-2 gap-1 border-b border-neutral-200 p-2">
            {['Groups', 'Synths'].map((tab, i) => (
              <div
                key={tab}
                className={`rounded-md px-2 py-1.5 text-center text-[11px] font-medium ${
                  i === 1 ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-500'
                }`}
              >
                {tab}
              </div>
            ))}
          </div>
          <div className="space-y-2 p-2">
            {[
              { name: 'Anya Voss', role: 'Chair', tone: 'bg-neutral-800' },
              { name: 'Lev Hart', role: 'Skeptic', tone: 'bg-neutral-600' },
              { name: 'Noor Ellison', role: 'Builder', tone: 'bg-neutral-400' },
            ].map((synth) => (
              <div key={synth.name} className="overflow-hidden rounded-md border border-neutral-200">
                <div className={`flex h-20 flex-col justify-between p-2 text-white ${synth.tone}`}>
                  <p className="text-xs font-semibold leading-tight">{synth.name}</p>
                  <span className="w-fit rounded bg-black/50 px-1.5 py-0.5 text-[10px]">{synth.role}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex flex-col">
          <div className="border-b border-neutral-200 px-4 py-2 text-xs font-medium text-neutral-500">
            Launch review
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="ml-auto max-w-[80%] rounded-lg bg-blue-50 px-3 py-2 text-sm text-neutral-800">
              What’s the fastest path to a believable board meeting?
              <p className="mt-1 text-[10px] text-neutral-500">You · 4:12 PM</p>
            </div>
            <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm text-neutral-800" style={{ backgroundColor: 'rgb(245 245 245)' }}>
              Give me a skeptic, a builder, and a numbers person. Then stay out of the way for ten minutes.
              <p className="mt-1 text-[10px] text-neutral-500">Anya · Chair</p>
            </div>
            <div className="max-w-[85%] rounded-lg bg-amber-50 px-3 py-2 text-sm text-neutral-800">
              If they agree too quickly, the room is fake. Seat someone whose job is to stall.
              <p className="mt-1 text-[10px] text-neutral-500">Lev · Skeptic</p>
            </div>
          </div>
          <div className="border-t border-neutral-200 p-3">
            <div className="h-9 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm leading-9 text-neutral-400">
              Message the room
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
            Multi-agent studio
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.05]">
            Rooms of minds.
            <br />
            One conversation.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-500">
            Build synths, assemble teams, and run long-form dialogue with models routed through OpenRouter.
            Start a trial — card on file, cancel anytime.
          </p>
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
            <Logo size="16px" color="#6b7280" />
            COAI
          </div>
          <Link to="/sign-in" className="text-sm text-neutral-500 hover:text-neutral-900">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
