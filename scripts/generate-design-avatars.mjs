import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(path.join(process.cwd(), 'api/package.json'));
const Replicate = require('replicate');

const OUT_DIR = path.join(process.cwd(), 'public/design/avatars');

const CAST = [
  {
    slug: 'anya-voss',
    name: 'Anya Voss',
    prompt:
      'Photorealistic head-and-shoulders portrait of Anya Voss, a 44-year-old woman with Eastern European features, sharp cheekbones, silver-streaked dark brown hair pulled back, cool grey-green eyes, tailored black knit, calm chair-of-the-room presence, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
  {
    slug: 'lev-hart',
    name: 'Lev Hart',
    prompt:
      'Photorealistic head-and-shoulders portrait of Lev Hart, a 37-year-old wiry man, short messy brown hair, light stubble, thin metal glasses, skeptical half-smile, olive jacket over a grey tee, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
  {
    slug: 'noor-ellison',
    name: 'Noor Ellison',
    prompt:
      'Photorealistic head-and-shoulders portrait of Noor Ellison, a 31-year-old Black woman, short natural coily hair, warm brown skin, gold hoop earrings, navy workwear shirt, open builder energy, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
  {
    slug: 'mateo-ruiz',
    name: 'Mateo Ruiz',
    prompt:
      'Photorealistic head-and-shoulders portrait of Mateo Ruiz, a 52-year-old Latino man, salt-and-pepper beard, close-cropped dark hair, warm brown skin, charcoal crewneck, numbers-person composure, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
  {
    slug: 'priya-kaur',
    name: 'Priya Kaur',
    prompt:
      'Photorealistic head-and-shoulders portrait of Priya Kaur, a 29-year-old South Asian woman, long dark hair, brown skin, small gold studs, cream blouse, precise legal counsel look, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
  {
    slug: 'jonah-okada',
    name: 'Jonah Okada',
    prompt:
      'Photorealistic head-and-shoulders portrait of Jonah Okada, a 34-year-old Japanese American man, black hair with a slight wave, light stubble, charcoal overshirt, designer with a quiet stare, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
  {
    slug: 'amara-mwangi',
    name: 'Amara Mwangi',
    prompt:
      'Photorealistic head-and-shoulders portrait of Amara Mwangi, a 41-year-old East African woman, dark skin, braided hair in a low bun, structured rust blazer, operator who keeps the room moving, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
  {
    slug: 'elise-chen',
    name: 'Elise Chen',
    prompt:
      'Photorealistic head-and-shoulders portrait of Elise Chen, a 26-year-old East Asian woman, shoulder-length black hair, round glasses, pale sage sweater, curious researcher look, natural skin, studio lighting, looking at camera, shallow depth of field, no text, no watermark, no logo',
  },
];

function getClient() {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error('REPLICATE_API_TOKEN is not set');
  }
  return new Replicate({ auth: token, useFileOutput: false });
}

async function outputToBuffer(output) {
  const first = Array.isArray(output) ? output[0] : output;
  if (!first) throw new Error('Replicate returned no image');
  const url = typeof first === 'string' ? first : String(first.url?.() ?? first);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateOne(replicate, version, person) {
  const dest = path.join(OUT_DIR, `${person.slug}.webp`);
  if (existsSync(dest)) {
    console.log(`Skip ${person.name} (already exists)`);
    return;
  }
  console.log(`Generating ${person.name}…`);
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const prediction = await replicate.predictions.create({
        version,
        input: {
          prompt: person.prompt,
          go_fast: true,
          megapixels: '1',
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 80,
          num_inference_steps: 4,
        },
      });
      const done = await replicate.wait(prediction, { interval: 1000 });
      if (done.status !== 'succeeded') {
        throw new Error(`Prediction ${done.status}`);
      }
      const buf = await outputToBuffer(done.output);
      await writeFile(dest, buf);
      console.log(`Wrote ${person.slug}.webp (${buf.length} bytes)`);
      return;
    } catch (error) {
      lastError = error;
      const status = error?.response?.status;
      const retryAfter = Number(error?.response?.headers?.get?.('retry-after') || 12);
      const waitMs = Number.isFinite(retryAfter) ? (retryAfter + 1) * 1000 : 12000;
      console.log(
        `Retry ${person.name} in ${Math.round(waitMs / 1000)}s (attempt ${attempt}${status ? `, ${status}` : ''})`
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
}

async function main() {
  const replicate = getClient();
  const model = await replicate.models.get('black-forest-labs', 'flux-schnell');
  const version = model.latest_version.id;
  await mkdir(OUT_DIR, { recursive: true });
  for (const person of CAST) {
    await generateOne(replicate, version, person);
    await sleep(11000);
  }
  console.log(`Done. ${CAST.length} portraits in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
