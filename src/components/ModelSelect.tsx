import { MODEL_CATALOG, visibleCatalog } from '@shared/models';
import { SelectItem } from '@/components/ui/select';
import { useAppStore } from '@/stores/appStore';

export function ModelSelectItems({ currentId }: { currentId?: string } = {}) {
  const hiddenModelIds = useAppStore((s) => s.profile?.profile_data?.preferences?.hiddenModelIds);
  const models = visibleCatalog(hiddenModelIds, currentId);

  return (
    <>
      {models.map((model) => (
        <SelectItem key={model.id} value={model.id}>
          {model.label}
        </SelectItem>
      ))}
    </>
  );
}

export function modelLabel(id: string): string {
  return MODEL_CATALOG.find((model) => model.id === id)?.label || id;
}
