// gta6-clipper-01 entry program (Node 22, standard library only).
// The entry is the YouTube video itself. This program only carries
// VIDEO.json from the repository into the grader's output directory,
// so the house can read the video address from there. It does no
// network access, reads no clock, and writes the same bytes on
// every run: the output is a byte copy of the repository's file.
//
// Run locally the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const sourcePath = resolve(botDir, 'VIDEO.json');
const targetPath = resolve(outputDir, 'VIDEO.json');

let payload: Buffer;
try {
  payload = readFileSync(sourcePath);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`could not read VIDEO.json at ${sourcePath}: ${detail}`);
  process.exit(1);
}

// Fail loudly on anything that is not a JSON object with a url string,
// so a bad VIDEO.json is caught here instead of silently copied.
let parsed: unknown;
try {
  parsed = JSON.parse(payload.toString('utf8'));
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`VIDEO.json at ${sourcePath} is not valid JSON: ${detail}`);
  process.exit(1);
}

if (
  typeof parsed !== 'object' ||
  parsed === null ||
  Array.isArray(parsed) ||
  typeof (parsed as { url?: unknown }).url !== 'string'
) {
  console.error('VIDEO.json must be a JSON object with a string "url" field');
  process.exit(1);
}

// A placeholder or a non-YouTube address is refused by the gate, so say
// so here instead of silently copying it through. The address must be a
// YouTube video link (shorts, watch or youtu.be) with an 11-character id.
const videoUrl = (parsed as { url: string }).url;
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
let looksLikeYouTubeVideo = false;
try {
  const address = new URL(videoUrl);
  if (address.protocol === 'https:') {
    const host = address.hostname;
    if (host === 'youtu.be') {
      looksLikeYouTubeVideo = videoIdPattern.test(
        address.pathname.replace(/^\//, '').split('/')[0] ?? '',
      );
    } else if (
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com'
    ) {
      const shortId = address.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
      const watchId = address.searchParams.get('v');
      looksLikeYouTubeVideo =
        (shortId !== null && videoIdPattern.test(shortId[1] ?? '')) ||
        (watchId !== null && videoIdPattern.test(watchId));
    }
  }
} catch {
  looksLikeYouTubeVideo = false;
}
if (!looksLikeYouTubeVideo) {
  console.error(`VIDEO.json url does not look like a YouTube video address: ${videoUrl}`);
  process.exit(1);
}

mkdirSync(outputDir, { recursive: true });
try {
  writeFileSync(targetPath, payload);
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`could not write VIDEO.json to ${targetPath}: ${detail}`);
  process.exit(1);
}
