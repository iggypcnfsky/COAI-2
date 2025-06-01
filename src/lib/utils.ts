import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Human-like delay utilities for more natural AI responses
export const HumanTiming = {
  // Base delays in milliseconds (80% shorter than original)
  TYPING_START_DELAY: { min: 160, max: 400 },         // Time before starting to type (was 800-2000ms)
  BETWEEN_RESPONSES: { min: 300, max: 800 },          // Delay between team member responses (was 1500-4000ms)
  
  // Get random delay within range
  getRandomDelay: (range: { min: number; max: number }) => {
    return Math.random() * (range.max - range.min) + range.min;
  },
  
  // Get delay before starting to type (simulates reading/thinking)
  getStartDelay: () => {
    return HumanTiming.getRandomDelay(HumanTiming.TYPING_START_DELAY);
  },
  
  // Get delay between different team member responses
  getBetweenResponsesDelay: () => {
    return HumanTiming.getRandomDelay(HumanTiming.BETWEEN_RESPONSES);
  }
};

// Sleep utility
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
