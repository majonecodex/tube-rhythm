// Rendering and animation, all through anime.js (global `anime`).
// Approach circles are paused anime timelines. game.js seeks each one to (songTime - spawnTime) every
// frame, so they follow the video clock exactly, including through pause and buffering.
const COLORS = ['#ff4f8b', '#4fc3ff', '#ffcf4a', '#7dff8a'];
export const JCOL = { Perfect: '#6ff0ff', Great: '#7dff8a', Good: '#ffd84f', Miss: '#ff5a5a' };

export function pop(el, s = 1.3) {
  anime.remove(el);
  anime({ targets: el, scale: [s, 1], duration: 220, easing: 'easeOutBack' });
}

export class Renderer {
  constructor(field, pulseEl, comboEl) { this.field = field; this.pulseEl = pulseEl; this.comboEl = comboEl; }
  at(o) { return `left:${(o.x / 512) * 100}%;top:${(o.y / 384) * 100}%`; }

  spawn(o, approach) {
    const el = document.createElement('div');
    el.className = 'ho';
    el.style.cssText = `${this.at(o)};--c:${COLORS[o.i % 4]};z-index:${100000 - o.i}`;
    el.innerHTML = `<span>${o.num}</span><i class="ring"></i>`;
    this.field.appendChild(el);
    const tl = anime.timeline({ autoplay: false, easing: 'linear' })
      .add({ targets: el, opacity: [0, 1], duration: Math.min(250, approach * 0.4) }, 0)
      .add({ targets: el.querySelector('.ring'), scale: [3, 1], duration: approach }, 0);
    return { el, tl };
  }

  /** Hit/miss feedback: object burst, expanding ring, floating judgment text. */
  judge(o, j) {
    const miss = j === 'Miss';
    anime({ targets: o.h.el, scale: miss ? [1, 0.6] : [1, 1.5], opacity: [1, 0], duration: miss ? 250 : 300, easing: 'easeOutQuad', complete: () => o.h.el.remove() });
    if (!miss) {
      const b = document.createElement('div');
      b.className = 'burst'; b.style.cssText = `${this.at(o)};border-color:${JCOL[j]}`;
      this.field.appendChild(b);
      anime({ targets: b, scale: [0.8, 1.9], opacity: [0.9, 0], duration: 420, easing: 'easeOutCubic', complete: () => b.remove() });
    }
    const t = document.createElement('div');
    t.className = 'judge'; t.textContent = j; t.style.cssText = `${this.at(o)};color:${JCOL[j]}`;
    this.field.appendChild(t);
    anime({ targets: t, translateY: [0, -34], scale: [0.7, 1.15], opacity: [1, 0], duration: 650, easing: 'easeOutCubic', complete: () => t.remove() });
  }

  beat() {
    anime.remove(this.pulseEl);
    anime({ targets: this.pulseEl, opacity: [0.35, 0], duration: 380, easing: 'easeOutQuad' });
  }
  shake() {
    anime({ targets: this.comboEl, translateX: [{ value: -9, duration: 50 }, { value: 9, duration: 80 }, { value: -5, duration: 70 }, { value: 0, duration: 60 }] });
  }
  clear() { this.field.innerHTML = ''; }
}
