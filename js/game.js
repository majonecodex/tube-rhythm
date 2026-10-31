// Game loop, timing and judging. Everything is timed against SongClock (video time), not rAF time.
const WIN = { Perfect: 40, Great: 80, Good: 120 }; // +/- ms
const PTS = { Perfect: 300, Great: 200, Good: 100, Miss: 0 };
const R = 0.0575; // hit radius as a fraction of field width (matches .ho CSS)

export class Game {
  constructor({ clock, player, field, rend, hud, onEnd }) {
    Object.assign(this, { clock, player, field, rend, hud, onEnd });
    this.running = false; this.paused = false;
    this.mode = 'pc';
    addEventListener('resize', () => { this.rect = field.getBoundingClientRect(); });
  }

  start(map, mode = 'pc') {
    cancelAnimationFrame(this.raf);
    this.mode = mode;
    this.rend.clear(); this.hud.reset();
    this.map = map; this.approach = map.meta.approach;
    this.objs = map.objects.map((o, i) => ({ ...o, i, num: (i % 9) + 1, st: 0, h: null }));
    this.next = 0; this.live = [];
    this.s = { score: 0, combo: 0, max: 0, pts: 0, n: 0, counts: { Perfect: 0, Great: 0, Good: 0, Miss: 0 } };
    this.endAt = (this.objs.at(-1)?.time || 0) + 1000;
    this.rect = this.field.getBoundingClientRect();
    this.clock.reset();
    this.started = false; this.paused = false; this.running = true; this.lastBeat = -1;
    this.raf = requestAnimationFrame(this.tick);
  }

  tick = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    this.clock.update();
    const t = this.clock.now();
    // Wait until the video is actually playing near the start; avoids stale times after a retry.
    if (!this.started) { if (this.clock.playing && t < 2000) this.started = true; else return; }

    while (this.next < this.objs.length && t >= this.objs[this.next].time - this.approach) {
      const o = this.objs[this.next++];
      o.h = this.rend.spawn(o, this.approach);
      this.live.push(o);
    }
    for (const o of this.live) {
      if (o.st) continue;
      o.h.tl.seek(Math.max(0, t - (o.time - this.approach)));
      if (t - o.time > WIN.Good) this.judge(o, 'Miss');
    }
    this.live = this.live.filter((o) => !o.st);

    const { bpm, offset } = this.map.meta;
    if (bpm > 0 && t >= offset) {
      const b = Math.floor((t - offset) / (60000 / bpm));
      if (b !== this.lastBeat) { this.lastBeat = b; this.rend.beat(); }
    }
    this.hud.setProgress(t / this.endAt);

    const allDone = this.next >= this.objs.length && !this.live.length && t > this.endAt;
    if (!this.paused && (allDone || this.player.state() === 0)) this.finish();
  };

  /** Called from input. cx/cy are client px; ts is the event timestamp. */
  press(cx, cy, ts) {
    if (!this.running || this.paused || !this.started) return;
    const o = this.live.find((x) => !x.st); // only the earliest unjudged object can be hit
    if (!o) return;
    const dt = this.clock.at(ts) - o.time, r = this.rect;
    const dx = cx - (r.left + (o.x / 512) * r.width), dy = cy - (r.top + (o.y / 384) * r.height);
    if (dx * dx + dy * dy > (R * r.width) ** 2) return;
    const a = Math.abs(dt);
    if (dt < -250) return; // far too early: ignore instead of punishing
    this.judge(o, a <= WIN.Perfect ? 'Perfect' : a <= WIN.Great ? 'Great' : a <= WIN.Good ? 'Good' : 'Miss');
  }

  /** Mobile Fruit Ninja Slicer swipe hit checker */
  slice(cx, cy, ts) {
    if (!this.running || this.paused || !this.started) return;
    const o = this.live.find((x) => !x.st);
    if (!o) return;
    const dt = this.clock.at(ts) - o.time, r = this.rect;
    const dx = cx - (r.left + (o.x / 512) * r.width), dy = cy - (r.top + (o.y / 384) * r.height);
    if (dx * dx + dy * dy <= (R * 1.35 * r.width) ** 2) {
      const a = Math.abs(dt);
      if (dt < -250) return;
      this.judge(o, a <= WIN.Perfect ? 'Perfect' : a <= WIN.Great ? 'Great' : a <= WIN.Good ? 'Good' : 'Miss');
    }
  }

  judge(o, j) {
    const s = this.s;
    o.st = 2; s.counts[j]++; s.n++; s.pts += PTS[j];
    if (j === 'Miss') { if (s.combo >= 5) this.rend.shake(); s.combo = 0; }
    else {
      s.combo++; s.max = Math.max(s.max, s.combo);
      s.score += Math.round(PTS[j] * (1 + Math.min(s.combo, 100) / 20));
      this.hud.setScore(s.score);
    }
    this.hud.setCombo(s.combo);
    this.hud.setAcc(s.pts / (300 * s.n));
    this.rend.judge(o, j);
  }

  pause() { this.paused = true; this.player.pause(); }
  resume() { this.paused = false; this.player.play(); }
  stop() { this.running = false; cancelAnimationFrame(this.raf); this.rend.clear(); }

  finish() {
    this.running = false; cancelAnimationFrame(this.raf);
    this.player.pause();
    const s = this.s, acc = s.n ? s.pts / (300 * s.n) : 0;
    const grade = acc >= 0.95 ? 'S' : acc >= 0.9 ? 'A' : acc >= 0.8 ? 'B' : acc >= 0.7 ? 'C' : 'D';
    this.onEnd({ score: s.score, max: s.max, acc, grade, counts: s.counts });
  }
}