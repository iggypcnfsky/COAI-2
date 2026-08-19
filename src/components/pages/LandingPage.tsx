import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';
import { AuthControls } from '@/components/auth/AuthControls';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e8e2d6] overflow-hidden relative">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(196,165,116,0.18), transparent 32%), radial-gradient(circle at 80% 0%, rgba(232,226,214,0.08), transparent 24%)',
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-3">
          <Logo size="28px" color="#c4a574" />
          <span className="font-serif text-xl tracking-wide">COAI</span>
        </div>
        <AuthControls showContinue />
      </header>

      <main className="relative z-10 px-6 md:px-12 pt-16 md:pt-28 pb-24 max-w-6xl">
        <p className="text-[#c4a574] uppercase tracking-[0.35em] text-xs mb-6">Multi-agent studio</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] max-w-4xl">
          Rooms of minds.<br />One conversation.
        </h1>
        <p className="mt-8 max-w-xl text-lg text-[#a8a29a] leading-relaxed">
          Build synths, assemble teams, and run long-form dialogue with models routed through OpenRouter. Start a trial — card on file, cancel anytime.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            to="/sign-up"
            className="inline-flex items-center px-7 py-3 bg-[#c4a574] text-[#0b0b0c] font-medium tracking-wide hover:bg-[#d4b98a] transition-colors"
          >
            Start trial
          </Link>
          <a
            href="#how"
            className="inline-flex items-center px-7 py-3 border border-[#2a2a2c] text-[#e8e2d6] hover:border-[#c4a574] transition-colors"
          >
            How it works
          </a>
        </div>
      </main>

      <section id="how" className="relative z-10 px-6 md:px-12 pb-28 grid md:grid-cols-3 gap-10 max-w-6xl">
        {[
          { n: '01', t: 'Compose a synth', d: 'Give it a role, a voice, a model. It becomes a person in the room, not a prompt tab.' },
          { n: '02', t: 'Seat a team', d: 'Drop several synths into a thread. They argue, build, and stay in character.' },
          { n: '03', t: 'Stay subscribed', d: 'Platform key included. Bring your own OpenRouter key in settings if you want.' },
        ].map((item) => (
          <article key={item.n} className="border-t border-[#2a2a2c] pt-6">
            <p className="text-[#c4a574] text-xs tracking-[0.3em]">{item.n}</p>
            <h2 className="font-serif text-2xl mt-3">{item.t}</h2>
            <p className="mt-3 text-[#a8a29a] leading-relaxed">{item.d}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
