import { MODEL_CATALOG } from '@shared/models';
import { SelectItem } from '@/components/ui/select';

export function ModelSelectItems() {
  return (
    <>
      {MODEL_CATALOG.map((model) => (
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
