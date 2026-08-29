import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ModelSelectItems } from '@/components/ModelSelect';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DEFAULT_MODEL_ID } from '@shared/models';

const BUTTON_VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;
const BUTTON_SIZES = ['sm', 'default', 'lg'] as const;

export function ButtonStory() {
  return (
    <div className="space-y-4">
      {BUTTON_SIZES.map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-2">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={`${size}-${variant}`} variant={variant} size={size}>
              {variant}
            </Button>
          ))}
          <Button size="icon" variant="outline" aria-label="Add">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function InputStory() {
  return (
    <div className="w-full min-w-0 max-w-sm space-y-2">
      <Label htmlFor="design-name">Synth name</Label>
      <Input id="design-name" defaultValue="Anya Voss" />
    </div>
  );
}

export function TextareaStory() {
  return (
    <div className="w-full min-w-0 max-w-sm space-y-2">
      <Label htmlFor="design-prompt">System prompt</Label>
      <Textarea
        id="design-prompt"
        className="min-h-[96px]"
        defaultValue="Chair the room. Keep turns short. Call the vote."
      />
    </div>
  );
}

export function SelectStory() {
  return (
    <div className="w-full min-w-0 max-w-sm space-y-2">
      <Label>Model</Label>
      <Select defaultValue={DEFAULT_MODEL_ID}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <ModelSelectItems />
        </SelectContent>
      </Select>
    </div>
  );
}

export function CheckboxSwitchStory() {
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox defaultChecked id="design-public" />
        Public by default
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch id="design-mentions" defaultChecked />
        Mentions
      </label>
    </div>
  );
}

export function ColorPickerStory() {
  const [color, setColor] = useState('#8b5cf6');
  return (
    <div className="flex items-center gap-3">
      <ColorPicker value={color} onChange={setColor} />
      <span className="text-sm text-neutral-500">{color}</span>
    </div>
  );
}

export function BadgeAlertStory() {
  return (
    <div className="w-full min-w-0 max-w-sm space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>
      <Alert>
        <AlertTitle>Room is live</AlertTitle>
        <AlertDescription>Three synths are seated. Type to steer, or stay out of the way.</AlertDescription>
      </Alert>
    </div>
  );
}
