// Render the Department of Agriculture promo to MP4.
// Usage: node render.mjs [voiceover.mp3] [out.mp4] [--fps 30] [--preview]
// Scenes and captions are timed to the pauses in the ElevenLabs voiceover.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] || '').startsWith('--'));
const audio = pos[0] && existsSync(pos[0]) ? path.resolve(pos[0]) : null;
const out = path.resolve(pos[1] || path.join(here, 'dept-agriculture-promo.mp4'));
const FPS = +flag('--fps', 30);
const LEAD = 0.8, TAIL = 2.6;

const SCRIPT = [
  'From the soil to the table, the Department of Agriculture works for every farmer, and every family in South Africa.',
  'We support producers, big and small, with funding, training, and extension officers right there on the ground.',
  "We protect the nation's herds and harvests through animal and plant health services, keeping disease out and keeping our food safe.",
  'We open doors to new markets, at home and abroad, so South African produce reaches the world.',
  'And we invest in research and innovation, helping farms adapt to a changing climate.',
  'Because a strong agricultural sector means jobs, food security, and thriving rural communities.',
  'The Department of Agriculture. Growing South Africa, together.',
];

function duration(f) {
  return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
}

// Speech segments = gaps between detected silences; merge until we have one per paragraph.
function segments(f, dur) {
  const log = spawnSyncStderr('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=noise=-35dB:d=0.3', '-f', 'null', '-']);
  const sil = [];
  let s = null;
  for (const line of log.split('\n')) {
    const a = line.match(/silence_start: ([\d.]+)/); if (a) s = +a[1];
    const b = line.match(/silence_end: ([\d.]+)/); if (b && s !== null) { sil.push([s, +b[1]]); s = null; }
  }
  // keep the longest N-1 interior pauses as paragraph breaks
  const interior = sil.filter(([a, b]) => a > 0.5 && b < dur - 0.5)
    .sort((x, y) => (y[1] - y[0]) - (x[1] - x[0])).slice(0, SCRIPT.length - 1)
    .sort((x, y) => x[0] - y[0]);
  if (interior.length !== SCRIPT.length - 1) return null;
  const segs = []; let start = sil[0] && sil[0][0] < 0.05 ? sil[0][1] : 0;
  for (const [a, b] of interior) { segs.push([start, a]); start = b; }
  segs.push([start, dur]);
  return segs;
}
function spawnSyncStderr(cmd, a) {
  return spawnSync(cmd, a, { encoding: 'utf8' }).stderr || '';
}

function estimate(dur) {
  const words = SCRIPT.map(p => p.split(/\s+/).length), W = words.reduce((a, b) => a + b);
  const gap = 0.55, speak = dur - gap * (SCRIPT.length - 1);
  let t = 0; return words.map(w => { const s = [t, t + speak * w / W]; t = s[1] + gap; return s; });
}

// Split a paragraph into caption chunks at commas/full stops, ~ <= 62 chars each.
function chunks(text) {
  const parts = text.match(/[^,.]+[,.]?/g).map(s => s.trim());
  const outp = []; let cur = '';
  for (const p of parts) { if ((cur + ' ' + p).trim().length > 62 && cur) { outp.push(cur); cur = p; } else cur = (cur + ' ' + p).trim(); }
  if (cur) outp.push(cur);
  return outp;
}

const dur = audio ? duration(audio) : 42.88;
// --breaks "a-b,c-d,...": explicit paragraph pauses (seconds) when auto-detection picks the wrong ones
function fromBreaks(spec, dur) {
  const br = spec.split(',').map(x => x.split('-').map(Number));
  const segs = []; let start = 0;
  for (const [a, b] of br) { segs.push([start, a]); start = b; }
  segs.push([start, dur]); return segs;
}
const breaks = flag('--breaks');
const segs = (audio && breaks && fromBreaks(breaks, dur)) || (audio && segments(audio, dur)) || estimate(dur);
console.log(audio ? `voiceover: ${audio} (${dur.toFixed(2)}s)` : 'no voiceover given: using estimated timings (silent render)');
const total = +(dur + LEAD + TAIL).toFixed(2);
const starts = segs.map(([a], i) => i === 0 ? 0 : a + LEAD - 0.35);
const scenes = starts.map((s, i) => [s, i + 1 < starts.length ? starts[i + 1] : total]);
const captions = [];
segs.forEach(([a, b], i) => {
  const cs = chunks(SCRIPT[i]); const L = cs.reduce((n, c) => n + c.length, 0); let t = a + LEAD;
  cs.forEach(c => { const d = (b - a) * c.length / L; captions.push([+t.toFixed(2), +(t + d).toFixed(2), c]); t += d; });
});
const TIMELINE = { total, scenes, captions };
console.log(JSON.stringify(TIMELINE.scenes.map(s => s.map(x => +x.toFixed(2)))));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.addInitScript(tl => { window.TIMELINE = tl; }, TIMELINE);
await page.goto(pathToFileURL(path.join(here, 'scene.html')).href);
await page.evaluate(() => document.fonts.ready);

if (args.includes('--preview')) {
  for (const [i, [a]] of scenes.entries()) {
    await page.evaluate(t => window.render(t), a + 3.2);
    await page.screenshot({ path: path.join(path.dirname(out), `preview-${i}.png`) });
  }
  await browser.close(); console.log('previews written'); process.exit(0);
}

const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
if (audio) ffArgs.push('-i', audio, '-filter_complex', `[1:a]adelay=${LEAD * 1000}|${LEAD * 1000},apad[a]`, '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k');
ffArgs.push('-t', String(total), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });

const frames = Math.ceil(total * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate(t => window.render(t), f / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % (FPS * 5) === 0) process.stdout.write(`\rframe ${f}/${frames}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(`\nwrote ${out}`);
