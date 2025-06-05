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

/**
 * Get a random chat color from the preset colors
 * @returns A random hex color string
 */
export const getRandomChatColor = (): string => {
  const randomIndex = Math.floor(Math.random() * PRESET_COLORS.length);
  return PRESET_COLORS[randomIndex];
};

/**
 * Get all available preset colors
 * @returns Array of hex color strings
 */
export const getPresetColors = (): string[] => {
  return [...PRESET_COLORS];
}; 