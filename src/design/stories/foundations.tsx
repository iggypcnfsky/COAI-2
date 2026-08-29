import Logo from '@/components/Logo';
import ThinkingSpinner from '@/components/chat/ThinkingSpinner';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { getRoleInfo } from '@/lib/roleColors';
import { PREVIEW_SYNTHS, ROLE_SWATCHES } from '../fixtures';

const TOKEN_SWATCHES = [
  { name: 'Background', className: 'bg-background border' },
  { name: 'Foreground', className: 'bg-foreground' },
  { name: 'Primary', className: 'bg-primary' },
  { name: 'Secondary', className: 'bg-secondary border' },
  { name: 'Muted', className: 'bg-muted' },
  { name: 'Accent', className: 'bg-accent' },
  { name: 'Destructive', className: 'bg-destructive' },
  { name: 'Border', className: 'bg-border' },
];

export function LogoStory() {
  return (
    <div className="flex flex-wrap items-end gap-8">
      {[64, 40, 28, 16].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Logo size={size} color="#6b7280" alt="Corals" />
          <span className="text-[11px] text-neutral-400">{size}px</span>
        </div>
      ))}
    </div>
  );
}

export function TypographyStory() {
  return (
    <div className="w-full min-w-0 max-w-xl space-y-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-400">Google Sans Flex</p>
      <h1 className="text-4xl font-semibold tracking-tight">Rooms of minds.</h1>
      <h2 className="text-2xl font-semibold tracking-tight">One conversation.</h2>
      <p className="text-lg leading-relaxed text-neutral-500">
        Build synths, assemble groups, and run long-form dialogue.
      </p>
      <p className="text-sm text-neutral-600">
        Body copy at 14px. Captions and chips stay at 12px so the room stays dense.
      </p>
      <p className="text-xs text-neutral-400">Meta · 11px tracking for section labels</p>
    </div>
  );
}

export function ColorsStory() {
  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
      {TOKEN_SWATCHES.map((token) => (
        <div key={token.name} className="min-w-0">
          <div className={`h-16 rounded-lg ${token.className}`} />
          <p className="mt-2 text-xs font-medium">{token.name}</p>
        </div>
      ))}
    </div>
  );
}

export function AvatarStory() {
  return (
    <div className="flex flex-wrap items-end justify-center gap-4">
      {PREVIEW_SYNTHS.map((synth) => (
        <div key={synth.id} className="flex flex-col items-center gap-2">
          <PersonAvatar name={synth.name} src={synth.profileImage} className="h-12 w-12" />
          <span className="text-[11px] text-neutral-500">{synth.name.split(' ')[0]}</span>
        </div>
      ))}
      <div className="flex flex-col items-center gap-2">
        <PersonAvatar name="You" className="h-12 w-12" />
        <span className="text-[11px] text-neutral-500">You</span>
      </div>
    </div>
  );
}

export function RolesStory() {
  return (
    <div className="flex flex-wrap gap-2">
      {ROLE_SWATCHES.map((role) => {
        const info = getRoleInfo(role);
        return (
          <span
            key={role}
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${info.color}`}
          >
            {info.display}
          </span>
        );
      })}
    </div>
  );
}

export function ThinkingStory() {
  return <ThinkingSpinner size={28} />;
}
