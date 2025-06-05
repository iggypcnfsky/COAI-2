import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#64748b', // slate
  '#78716c', // stone
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value = '#3b82f6',
  onChange,
  disabled = false,
}) => {
  const [customColor, setCustomColor] = React.useState(value);

  const handlePresetClick = (color: string) => {
    setCustomColor(color);
    onChange(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="w-full justify-start gap-2"
        >
          <div
            className="w-4 h-4 rounded border border-neutral-300 dark:border-neutral-600"
            style={{ backgroundColor: value }}
          />
          <Palette className="w-4 h-4" />
          <span className="flex-1 text-left">Chat Color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Preset Colors</p>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handlePresetClick(color)}
                  className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                    value === color
                      ? 'border-neutral-900 dark:border-neutral-100'
                      : 'border-neutral-300 dark:border-neutral-600'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium mb-2">Custom Color</p>
            <div className="flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-12 h-8 p-1 border rounded"
              />
              <Input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                placeholder="#3b82f6"
                className="flex-1 h-8 text-sm"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}; 