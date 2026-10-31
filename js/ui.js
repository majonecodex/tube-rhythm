// UI screens and HUD. Screen transitions and score/combo effects use anime.js.
import { pop } from './render.js';

/** Fades a screen in. slide=false for elements whose own transform or fixed children must not be touched. */
export function show(el, slide = true) {
  el.hidden = false;
  anime.remove(el);
  anime({ targets: el, opacity: [0, 1], translateY: slide ? [24, 0] : 0, duration: 450, easing: 'easeOutCubic' });
}
export function hide(el, slide = true) {
  return new Promise((resolve) => {
    anime.remove(el);
    anime({ targets: el, opacity: 0, translateY: slide ? -16 : 0, duration: 250, easing: 'easeInQuad', complete: () => { el.hidden = true; resolve(); } });
  });
}

export class Hud {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.score = $('score'); this.acc = $('acc'); this.combo = $('combo'); this.fill = $('barfill');
    this.v = { n: 0 };
  }
  reset() {
    anime.remove(this.v); this.v.n = 0;
    this.score.textContent = '0'; this.acc.textContent = '100.00%'; this.combo.textContent = ''; this.fill.style.width = '0';
  }
  setScore(n) {
    anime.remove(this.v);
    anime({ targets: this.v, n, round: 1, duration: 300, easing: 'easeOutQuad', update: () => { this.score.textContent = this.v.n.toLocaleString(); } });
    pop(this.score, 1.12);
  }
  setCombo(n) { this.combo.textContent = n ? `${n}x` : ''; if (n) pop(this.combo, 1.35); }
  setAcc(a) { this.acc.textContent = `${(a * 100).toFixed(2)}%`; }
  setProgress(p) { this.fill.style.width = `${Math.min(100, p * 100)}%`; }
}