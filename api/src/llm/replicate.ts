import Replicate from 'replicate';
import { env } from '../env.js';
import { generatePlaceholderImage, generateTeamPlaceholderImage } from './svg.js';

const FLUX_SCHNELL = 'black-forest-labs/flux-schnell';

type FileLike = {
  url?: () => URL | string;
  blob?: () => Promise<Blob>;
};

function clip(value: string | undefined, max: number): string {
  return (value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function genderPhrase(gender?: string): string {
  const g = (gender || '').toLowerCase();
  if (g === 'male' || g === 'female' || g === 'non-binary') return g;
  return '';
}

function getClient(): Replicate | null {
  if (!env.replicateApiToken) return null;
  return new Replicate({
    auth: env.replicateApiToken,
    useFileOutput: false,
  });
}

function describeOutput(output: unknown): string {
  if (output == null) return String(output);
  if (typeof output === 'string') return `string:${output.slice(0, 80)}`;
  if (Array.isArray(output)) return `array(${output.length})`;
  if (typeof output === 'object') return `object:${Object.keys(output as object).join(',')}`;
  return typeof output;
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download generated image (${res.status})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get('content-type') || 'image/webp';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function outputToDataUrl(output: unknown): Promise<string> {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) {
    throw new Error(`Replicate returned no image (${describeOutput(output)})`);
  }
  if (typeof first === 'string') {
    return first.startsWith('data:') ? first : urlToDataUrl(first);
  }

  const file = first as FileLike;
  if (typeof file.url === 'function') {
    return urlToDataUrl(String(file.url()));
  }
  if (typeof file.blob === 'function') {
    const blob = await file.blob();
    const buf = Buffer.from(await blob.arrayBuffer());
    const mime = blob.type || 'image/webp';
    return `data:${mime};base64,${buf.toString('base64')}`;
  }
  throw new Error(`Unrecognized Replicate image output (${describeOutput(output)})`);
}

async function runFlux(prompt: string): Promise<string> {
  const replicate = getClient();
  if (!replicate) {
    throw new Error('REPLICATE_API_TOKEN is not set');
  }

  const output = await replicate.run(FLUX_SCHNELL, {
    input: {
      prompt,
      go_fast: true,
      megapixels: '1',
      num_outputs: 1,
      aspect_ratio: '1:1',
      output_format: 'webp',
      output_quality: 80,
      num_inference_steps: 4,
    },
    wait: { mode: 'poll', interval: 500 },
  });

  return outputToDataUrl(output);
}

export function buildSynthPortraitPrompt(input: {
  name: string;
  role?: string;
  age?: number;
  gender?: string;
  bio?: string;
  keywords?: string;
}): string {
  const name = clip(input.name, 80) || 'a person';
  const role = clip(input.role, 80);
  const bio = clip(input.bio, 240);
  const keywords = clip(input.keywords, 200);
  const gender = genderPhrase(input.gender);
  const age = typeof input.age === 'number' && input.age > 0 ? `${Math.round(input.age)}-year-old` : '';

  const subject = [age, gender, role].filter(Boolean).join(' ');
  const details = [bio, keywords].filter(Boolean).join('. ');

  return [
    `Photorealistic head-and-shoulders portrait of ${name}`,
    subject ? `a ${subject}` : '',
    details,
    'natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  ].filter(Boolean).join(', ');
}

export function buildTeamPortraitPrompt(input: {
  name: string;
  description?: string;
  keywords?: string;
}): string {
  const name = clip(input.name, 80) || 'a team';
  const description = clip(input.description, 240);
  const keywords = clip(input.keywords, 200);
  const details = [description, keywords].filter(Boolean).join('. ');

  return [
    `Photorealistic group portrait of "${name}"`,
    details,
    'diverse people standing together, different faces ages and genders, cinematic lighting, no text, no watermark, no logo',
  ].filter(Boolean).join(', ');
}

export async function generateSynthPortrait(input: {
  name: string;
  role?: string;
  age?: number;
  gender?: string;
  bio?: string;
  keywords?: string;
}): Promise<string> {
  const fallback = generatePlaceholderImage(input.name || 'Synth');
  try {
    const image = await runFlux(buildSynthPortraitPrompt(input));
    console.log('Replicate synth portrait ready for', input.name);
    return image;
  } catch (error) {
    console.error('Replicate synth portrait failed:', error instanceof Error ? error.message : error);
    return fallback;
  }
}

export async function generateTeamPortrait(input: {
  name: string;
  description?: string;
  keywords?: string;
}): Promise<string> {
  const fallback = generateTeamPlaceholderImage(input.name || 'Team');
  try {
    const image = await runFlux(buildTeamPortraitPrompt(input));
    console.log('Replicate team portrait ready for', input.name);
    return image;
  } catch (error) {
    console.error('Replicate team portrait failed:', error instanceof Error ? error.message : error);
    return fallback;
  }
}
