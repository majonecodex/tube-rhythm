// Game clock driven by the YouTube player's reported time (never by audio analysis).
// getCurrentTime() updates in coarse steps, so between updates we extrapolate with performance.now()
// and blend each new reading in gently. Large errors (seek, buffering) snap immediately.
// While the player is not in state 1 (playing) the clock holds, so pause/buffering freeze the game.
export class SongClock {
  constructor(player) { this.player = player; this.reset(); }
  reset() {
    this.anchorT = this.player.time() * 1000;
    this.anchorP = performance.now();
    this.last = -1; this.playing = false;
  }
  /** Call once per frame. */
  update() {
    const now = performance.now(), r = this.player.time() * 1000;
    if (this.player.state() !== 1) { this.anchorT = r; this.anchorP = now; this.playing = false; return; }
    if (!this.playing) { this.anchorT = r; this.anchorP = now; this.last = r; this.playing = true; return; }
    if (r !== this.last) {
      this.last = r;
      const est = this.at(now), err = r - est;
      this.anchorT = Math.abs(err) > 120 ? r : est + err * 0.15;
      this.anchorP = now;
    }
  }
  /** Song time (ms) at a performance.now() timestamp. Input events use their own timeStamp for low latency. */
  at(perfMs) { return this.anchorT + (perfMs - this.anchorP); }
  now() { return this.at(performance.now()); }
}