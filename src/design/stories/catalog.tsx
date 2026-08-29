import CustomSynthCard from '@/components/browser/CustomSynthCard';
import CustomTeamCard from '@/components/browser/CustomTeamCard';
import LoadingSynthCard from '@/components/browser/LoadingSynthCard';
import LoadingTeamCard from '@/components/browser/LoadingTeamCard';
import { PREVIEW_GROUP, PREVIEW_SYNTHS } from '../fixtures';

export function SynthCardStory() {
  return (
    <div className="w-full min-w-0 max-w-xs rounded-lg border border-neutral-200 bg-white p-2">
      {PREVIEW_SYNTHS.map((synth) => (
        <CustomSynthCard
          key={synth.id}
          employee={synth}
          onClick={() => {}}
          onQuickAdd={() => {}}
          onDelete={() => {}}
        />
      ))}
    </div>
  );
}

export function GroupCardStory() {
  return (
    <div className="w-full min-w-0 max-w-xs rounded-lg border border-neutral-200 bg-white p-2">
      <CustomTeamCard team={PREVIEW_GROUP} onClick={() => {}} onQuickAdd={() => {}} />
    </div>
  );
}

export function LoadingCardsStory() {
  return (
    <div className="w-full min-w-0 max-w-xs space-y-1 rounded-lg border border-neutral-200 bg-white p-2">
      <LoadingSynthCard synthName="Anya Voss" synthRole="Chair" />
      <LoadingTeamCard prompt="Generating launch review..." />
    </div>
  );
}
