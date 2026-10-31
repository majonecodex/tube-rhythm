// Beatmap format (plain text):
//   bpm: 120          optional, drives the beat pulse
//   offset: 1000      optional, ms of the first beat
//   approach: 900     optional, ms the approach circle takes to close (300-2000)
//   time_ms,x,y       one hit object per line; x 0-512, y 0-384 (osu! playfield units)
//   # comment
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function parse(text) {
  const meta = { bpm: 0, offset: 0, approach: 900 }, objects = [], errors = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) return;
    const kv = line.match(/^(bpm|offset|approach)\s*:\s*(-?[\d.]+)$/i);
    if (kv) { meta[kv[1].toLowerCase()] = +kv[2]; return; }
    const p = line.split(/[\s,]+/).map(Number);
    if (p.length >= 3 && p.slice(0, 3).every(Number.isFinite)) objects.push({ time: p[0], x: clamp(p[1], 0, 512), y: clamp(p[2], 0, 384) });
    else errors.push(`line ${i + 1}: "${raw.trim()}"`);
  });
  objects.sort((a, b) => a.time - b.time);
  meta.approach = clamp(meta.approach, 300, 2000);
  return { meta, objects, errors };
}

function rng(seed) { // mulberry32
  let a = [...(seed || 'x')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Default pattern: one circle per beat (every other beat if the tempo is very fast), random walk across the field. */
export function generate({ bpm, offset, approach, duration, seed }) {
  const rand = rng(seed || 'x');
  let step = 60000 / bpm;
  while (step < 400) step *= 2;
  let t = offset;
  while (t < approach + 800) t += step;
  const end = duration * 1000 - 1500;
  let x = 256, y = 192;
  const lines = [`bpm: ${bpm}`, `offset: ${offset}`, `approach: ${approach}`, '# time_ms,x,y'];
  for (; t < end; t += step) {
    const a = rand() * Math.PI * 2, d = 110 + rand() * 90;
    x = clamp(x + Math.cos(a) * d, 50, 462); y = clamp(y + Math.sin(a) * d, 50, 334);
    lines.push(`${Math.round(t)},${Math.round(x)},${Math.round(y)}`);
  }
  return lines.join('\n');
}