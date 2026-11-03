// --- DEFAULT CHIBI MASCOT ARTWORK ---
const DEFAULT_CHIBI_SVG = 'mascot.png';

// --- CUSTOM MENU THEME SONG BGM ENGINE (Tube Rhythm BGM.mp3) ---
class MenuThemeSongEngine {
  constructor() {
    this.audio = new Audio('Tube Rhythm BGM.mp3');
    this.audio.loop = true;
    this.audio.volume = 0.4;
    this.isPlaying = false;
    this.isEnabled = true;
  }

  start() {
    if (!this.isEnabled || this.isPlaying) return;
    this.audio.play().then(() => {
      this.isPlaying = true;
    }).catch(() => {
      // Autoplay blocked until user interaction
    });
  }

  stop() {
    if (!this.isPlaying) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
  }

  setVolume(val) {
    this.audio.volume = Math.max(0, Math.min(1, val));
  }
}

const themeSongEngine = new MenuThemeSongEngine();

const startBGMOnce = () => {
  themeSongEngine.start();
  window.removeEventListener('pointerdown', startBGMOnce);
  window.removeEventListener('keydown', startBGMOnce);
};
window.addEventListener('pointerdown', startBGMOnce);
window.addEventListener('keydown', startBGMOnce);

// --- SYNTHESIZED UI SOUND EFFECTS (Web Audio API) ---
class UISoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // High-pitched chime/blip on menu hover
  playHover() {
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {
      // Ignore audio context interruptions
    }
  }

  // Upbeat pop sound on button click
  playClick() {
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, this.ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(260, this.ctx.currentTime + 0.07);

      gain.gain.setValueAtTime(0.14, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.07);
    } catch (e) {
      // Ignore audio context interruptions
    }
  }
}

const uiSounds = new UISoundFX();

// --- YOUTUBE INTEGRATION ---
const ERRORS = {
  2: 'The video ID is invalid.',
  5: 'The HTML5 player failed to load this video.',
  100: 'The video was not found or is private.',
  101: 'The owner does not allow embedding this video.',
  150: 'The owner does not allow embedding this video.',
  153: 'Embedding was blocked. Serve the page over http/https instead of local file://.',
};

function parseVideoId(input) {
  const s = (input || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else { const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/); if (m) id = m[2]; }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

let apiPromise;
function loadApi() {
  return (apiPromise ||= new Promise((resolve, reject) => {
    if (window.YT && YT.Player) return resolve();
    window.onYouTubeIframeAPIReady = resolve;
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiPromise = null; reject(new Error('Could not load the YouTube API. Check connection.')); };
    document.head.appendChild(s);
  }));
}

class YTPlayer {
  p = null; err = null; onError = null;
  _onError = (e) => { this.err = ERRORS[e.data] || `Player error ${e.data}.`; this.onError?.(this.err); };

  async load(id) {
    await loadApi();
    this.err = null;
    if (!this.p) {
      this.p = new YT.Player('yt', {
        videoId: id,
        playerVars: { controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3 },
        events: { onError: this._onError },
      });
    } else if (this.p.cueVideoById) {
      this.p.cueVideoById(id);
    }
    for (let i = 0; i < 60; i++) {
      if (this.err) throw new Error(this.err);
      const p = this.p;
      if (p.getDuration && p.getDuration() > 0) return p.getDuration();
      await new Promise((r) => setTimeout(r, 100));
    }
    if (this.err) throw new Error(this.err);
    return 0;
  }
  play() { this.p?.playVideo(); }
  pause() { this.p?.pauseVideo(); }
  seek(s) { this.p?.seekTo(s, true); }
  setVolume(v) { this.p?.unMute?.(); this.p?.setVolume(v); }
  time() { return this.p?.getCurrentTime?.() ?? 0; }
  state() { return this.p?.getPlayerState?.() ?? -1; }
  title() { 
    try {
      return this.p?.getVideoData?.()?.title || 'YouTube Music';
    } catch (e) {
      return 'YouTube Music';
    }
  }
}

// --- SONG CLOCK ---
class SongClock {
  constructor(player) { this.player = player; this.reset(); }
  reset() {
    this.anchorT = this.player.time() * 1000;
    this.anchorP = performance.now();
    this.last = -1; this.playing = false;
  }
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
  at(perfMs) { return this.anchorT + (perfMs - this.anchorP); }
  now() { return this.at(performance.now()); }
}

// --- BEATMAP GENERATOR & PARSER ---
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function parseMap(text) {
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

function generateMap({ bpm, offset, approach, duration, seed }) {
  let a = [...(seed || 'x')].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rand = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  
  let step = 60000 / bpm;
  while (step < 400) step *= 2;
  let t = offset;
  while (t < approach + 800) t += step;
  const end = duration * 1000 - 1500;
  let x = 256, y = 192;
  const lines = [`bpm: ${bpm}`, `offset: ${offset}`, `approach: ${approach}`, '# time_ms,x,y'];
  for (; t < end; t += step) {
    const angle = rand() * Math.PI * 2, dist = 90 + rand() * 80;
    x = clamp(x + Math.cos(angle) * dist, 60, 452); 
    y = clamp(y + Math.sin(angle) * dist, 60, 324);
    lines.push(`${Math.round(t)},${Math.round(x)},${Math.round(y)}`);
  }
  return lines.join('\n');
}

// --- CHIBI COMPANION MANAGER ---
class ChibiManager {
  constructor() {
    this.settings = { enabled: true, mode: 'wander', size: 70, speed: 1.0, opacity: 0.9, dimGameplay: 'false' };
    this.imgDataUrl = DEFAULT_CHIBI_SVG;
    this.x = 256; this.y = 192; this.targetX = 256; this.targetY = 192;
    this.vx = 0; this.vy = 0; this.facingLeft = false;
    this.pauseTimer = 0; this.modeTimer = 0; this.currentSubMode = 'wander';
    this.lastTime = performance.now();
    this.isGameplayActive = false;
  }

  async init(fieldEl) {
    this.field = fieldEl;
    this.container = document.getElementById('chibi-companion');
    this.imgEl = document.getElementById('chibi-img');

    this.loadSettings();
    await this.initDB();
    await this.loadSavedImage();
    this.setupCustomizerUI();
    this.startLoop();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('tube_rhythm_chibi_settings');
      if (saved) this.settings = { ...this.settings, ...JSON.parse(saved) };
    } catch (e) {}
  }

  saveSettings() {
    try { localStorage.setItem('tube_rhythm_chibi_settings', JSON.stringify(this.settings)); } catch (e) {}
  }

  initDB() {
    return new Promise((resolve) => {
      const request = indexedDB.open('TubeRhythmChibiDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('character_images')) db.createObjectStore('character_images');
      };
      request.onsuccess = (e) => { this.db = e.target.result; resolve(); };
      request.onerror = () => resolve();
    });
  }

  async loadSavedImage() {
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx = this.db.transaction('character_images', 'readonly');
      const req = tx.objectStore('character_images').get('active_chibi');
      req.onsuccess = () => {
        if (req.result) {
          const url = typeof req.result === 'string' ? req.result : URL.createObjectURL(req.result);
          this.setImage(url, false);
        } else {
          this.setImage(DEFAULT_CHIBI_SVG, false);
        }
        resolve();
      };
      req.onerror = () => { this.setImage(DEFAULT_CHIBI_SVG, false); resolve(); };
    });
  }

  async saveImageBlobToDB(blob) {
    if (!this.db) return;
    const tx = this.db.transaction('character_images', 'readwrite');
    tx.objectStore('character_images').put(blob, 'active_chibi');
  }

  async removeImageFromDB() {
    if (!this.db) return;
    const tx = this.db.transaction('character_images', 'readwrite');
    tx.objectStore('character_images').delete('active_chibi');
  }

  setImage(dataUrl, save = true) {
    this.imgDataUrl = dataUrl || DEFAULT_CHIBI_SVG;
    if (this.imgEl) this.imgEl.src = this.imgDataUrl;
    
    const previewImg = document.getElementById('companion-preview-img');
    const placeholder = document.getElementById('companion-preview-placeholder');
    const removeBtn = document.getElementById('chibi-remove-btn');

    if (previewImg && placeholder && removeBtn) {
      if (dataUrl && dataUrl !== DEFAULT_CHIBI_SVG) {
        previewImg.src = dataUrl;
        previewImg.hidden = false;
        placeholder.hidden = true;
        removeBtn.hidden = false;
      } else {
        previewImg.hidden = true;
        placeholder.textContent = 'Default Mascot Active';
        placeholder.hidden = false;
        removeBtn.hidden = true;
        if (save) this.removeImageFromDB();
      }
    }
    this.updateVisibility();
  }

  handleFileUpload(file) {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showModal('Invalid File', 'Please upload a valid PNG, JPG, GIF, or WebP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showModal('File Too Large', 'File size exceeds the 10MB limit.');
      return;
    }
    this.saveImageBlobToDB(file);
    const objectUrl = URL.createObjectURL(file);
    this.setImage(objectUrl, true);
  }

  setupCustomizerUI() {
    const fileInput = document.getElementById('chibi-file-input');
    const uploadBtn = document.getElementById('chibi-upload-btn');
    const removeBtn = document.getElementById('chibi-remove-btn');
    const resetBtn = document.getElementById('chibi-reset-btn');

    uploadBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
    
    removeBtn?.addEventListener('click', () => this.setImage(DEFAULT_CHIBI_SVG, true));

    resetBtn?.addEventListener('click', () => {
      this.settings = { enabled: true, mode: 'wander', size: 70, speed: 1.0, opacity: 0.9, dimGameplay: 'false' };
      this.applySettingsToForm();
      this.saveSettings();
      this.updateStyle();
    });

    const bindSetting = (id, key, parseFn = (v) => v) => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = () => {
        this.settings[key] = parseFn(el.value);
        this.saveSettings();
        this.updateStyle();
      };
      el.addEventListener('change', handler);
      el.addEventListener('input', handler);
    };

    bindSetting('chibi-enabled', 'enabled', (v) => v === 'true');
    bindSetting('chibi-mode', 'mode');
    bindSetting('chibi-size', 'size', Number);
    bindSetting('chibi-speed', 'speed', Number);
    bindSetting('chibi-opacity', 'opacity', Number);
    bindSetting('chibi-dim-gameplay', 'dimGameplay');

    this.applySettingsToForm();
    this.updateStyle();
  }

  applySettingsToForm() {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = String(val); };
    setVal('chibi-enabled', this.settings.enabled);
    setVal('chibi-mode', this.settings.mode);
    setVal('chibi-size', this.settings.size);
    setVal('chibi-speed', this.settings.speed);
    setVal('chibi-opacity', this.settings.opacity);
    setVal('chibi-dim-gameplay', this.settings.dimGameplay);
  }

  updateStyle() {
    if (!this.container) return;
    const { size, opacity } = this.settings;
    this.container.style.width = `${size}px`;
    this.container.style.height = `${size}px`;
    this.container.style.opacity = opacity;
    this.updateVisibility();
  }

  setGameplayState(active) {
    this.isGameplayActive = active;
    this.updateVisibility();
  }

  updateVisibility() {
    if (!this.container) return;
    const isVisible = this.settings.enabled && this.imgDataUrl !== null;
    if (!isVisible) { this.container.hidden = true; return; }

    if (this.isGameplayActive) {
      if (this.settings.dimGameplay === 'hide') { this.container.hidden = true; return; }
      this.container.hidden = false;
      this.container.style.opacity = this.settings.dimGameplay === 'true' ? 0.35 : this.settings.opacity;
    } else {
      this.container.hidden = false;
      this.container.style.opacity = this.settings.opacity;
    }
  }

  startLoop() {
    this.lastTime = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      if (this.settings.enabled && !this.container?.hidden) this.updateMovement(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  updateMovement(dt) {
    if (!this.field) return;
    const bounds = this.field.getBoundingClientRect();
    const fieldW = bounds.width || 512;
    const fieldH = bounds.height || 384;
    const margin = this.settings.size / 2 + 10;

    let activeMode = this.settings.mode;
    if (activeMode === 'random') {
      this.modeTimer -= dt;
      if (this.modeTimer <= 0) {
        const modes = ['wander', 'idle', 'follow'];
        this.currentSubMode = modes[Math.floor(Math.random() * modes.length)];
        this.modeTimer = 3 + Math.random() * 5;
      }
      activeMode = this.currentSubMode;
    }

    if (activeMode === 'idle') {
      this.vx = 0; this.vy = 0;
    } else if (activeMode === 'follow') {
      const cursorDot = document.getElementById('cursor-dot');
      if (cursorDot && cursorDot.style.display !== 'none') {
        this.targetX = parseFloat(cursorDot.style.left) || fieldW / 2;
        this.targetY = parseFloat(cursorDot.style.top) || fieldH / 2;
      }
      this.moveTowardsTarget();
    } else {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        if (Math.random() < 0.3) {
          this.pauseTimer = 1 + Math.random() * 2;
          this.vx = 0; this.vy = 0;
        } else {
          this.targetX = margin + Math.random() * (fieldW - margin * 2);
          this.targetY = margin + Math.random() * (fieldH - margin * 2);
          this.pauseTimer = 2 + Math.random() * 4;
        }
      }
      this.moveTowardsTarget();
    }

    this.x += this.vx * dt * 160 * this.settings.speed;
    this.y += this.vy * dt * 160 * this.settings.speed;

    this.x = Math.max(margin, Math.min(fieldW - margin, this.x));
    this.y = Math.max(margin, Math.min(fieldH - margin, this.y));

    if (this.container) {
      this.container.style.left = `${this.x}px`;
      this.container.style.top = `${this.y}px`;
      if (Math.abs(this.vx) > 0.05) {
        this.facingLeft = this.vx < 0;
        this.imgEl.style.transform = `scaleX(${this.facingLeft ? -1 : 1})`;
      }
    }
  }

  moveTowardsTarget() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 5) {
      this.vx = dx / dist;
      this.vy = dy / dist;
    } else {
      this.vx = 0; this.vy = 0;
    }
  }

  triggerReaction(type) {
    if (!this.settings.enabled || !this.imgEl || this.container?.hidden) return;
    if (window.anime) {
      window.anime.remove(this.imgEl);
      switch (type) {
        case 'Perfect':
          window.anime({ targets: this.imgEl, translateY: [-16, 0], duration: 280, easing: 'easeOutBack' });
          break;
        case 'Combo':
          window.anime({ targets: this.imgEl, scale: [1.3, 1], rotate: [-15, 0], duration: 380, easing: 'easeOutElastic(1, .5)' });
          break;
        case 'Miss':
          window.anime({ targets: this.imgEl, translateX: [-8, 8, -4, 4, 0], duration: 320, easing: 'easeInOutSine' });
          break;
        case 'Victory':
          window.anime({ targets: this.imgEl, rotate: [0, 360], scale: [1.4, 1], duration: 750, easing: 'easeOutBack' });
          break;
      }
    }
  }
}

const chibiManager = new ChibiManager();

// --- RENDERER & THEME UTILITIES ---
function getThemeColors() {
  const style = getComputedStyle(document.body);
  return [
    style.getPropertyValue('--target-c1').trim() || '#ff4f8b',
    style.getPropertyValue('--target-c2').trim() || '#4fc3ff',
    style.getPropertyValue('--target-c3').trim() || '#ffcf4a',
    style.getPropertyValue('--target-c4').trim() || '#7dff8a'
  ];
}
const JCOL = { Perfect: '#6ff0ff', Great: '#7dff8a', Good: '#ffd84f', Miss: '#ff5a5a' };

function pop(el, s = 1.3) {
  anime.remove(el);
  anime({ targets: el, scale: [s, 1], duration: 220, easing: 'easeOutBack' });
}

class Renderer {
  constructor(field, pulseEl, comboEl) { this.field = field; this.pulseEl = pulseEl; this.comboEl = comboEl; }
  at(o) { return `left:${(o.x / 512) * 100}%;top:${(o.y / 384) * 100}%`; }

  spawn(o, approach) {
    const colors = getThemeColors();
    const el = document.createElement('div');
    el.className = 'ho';
    el.style.cssText = `${this.at(o)};--c:${colors[o.i % 4]};z-index:${100000 - o.i}`;
    el.innerHTML = `<span>${o.num}</span><i class="ring"></i>`;
    this.field.appendChild(el);
    const tl = anime.timeline({ autoplay: false, easing: 'linear' })
      .add({ targets: el, opacity: [0, 1], duration: Math.min(250, approach * 0.4) }, 0)
      .add({ targets: el.querySelector('.ring'), scale: [3, 1], duration: approach }, 0);
    return { el, tl };
  }

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
  clear() {
    const dots = this.field.querySelectorAll('.ho,.burst,.judge');
    dots.forEach(d => d.remove());
  }
}

class Hud {
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

function showScreen(el, slide = true) {
  el.hidden = false;
  anime.remove(el);
  anime({ targets: el, opacity: [0, 1], translateY: slide ? [24, 0] : 0, duration: 450, easing: 'easeOutCubic' });
}
function hideScreen(el, slide = true) {
  return new Promise((resolve) => {
    anime.remove(el);
    anime({ targets: el, opacity: 0, translateY: slide ? -16 : 0, duration: 250, easing: 'easeInQuad', complete: () => { el.hidden = true; resolve(); } });
  });
}

// --- GAME ENGINE ---
const WIN = { Perfect: 40, Great: 80, Good: 120 };
const PTS = { Perfect: 300, Great: 200, Good: 100, Miss: 0 };
const R = 0.0575;

class Game {
  constructor({ clock, player, field, rend, hud, onEnd }) {
    Object.assign(this, { clock, player, field, rend, hud, onEnd });
    this.running = false; this.paused = false; this.mode = 'pc';
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
    this.clock.reset();
    this.started = false; this.paused = false; this.running = true; this.lastBeat = -1;
    this.raf = requestAnimationFrame(this.tick);
  }

  tick = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.tick);
    this.clock.update();
    const t = this.clock.now();

    if (!this.started) {
      if (this.clock.playing && t < 2000) this.started = true;
      else return;
    }

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

  press(cx, cy, ts) {
    if (!this.running || this.paused || !this.started) return;
    const o = this.live.find((x) => !x.st);
    if (!o) return;
    
    const r = this.field.getBoundingClientRect();
    const dt = this.clock.at(ts) - o.time;
    const targetX = r.left + (o.x / 512) * r.width;
    const targetY = r.top + (o.y / 384) * r.height;
    
    const dx = cx - targetX, dy = cy - targetY;
    const hitRadius = R * r.width;
    if (dx * dx + dy * dy > hitRadius * hitRadius) return;
    
    const a = Math.abs(dt);
    if (dt < -250) return;
    this.judge(o, a <= WIN.Perfect ? 'Perfect' : a <= WIN.Great ? 'Great' : a <= WIN.Good ? 'Good' : 'Miss');
  }

  slice(cx, cy, ts) {
    if (!this.running || this.paused || !this.started) return;
    const o = this.live.find((x) => !x.st);
    if (!o) return;
    
    const r = this.field.getBoundingClientRect();
    const dt = this.clock.at(ts) - o.time;
    const targetX = r.left + (o.x / 512) * r.width;
    const targetY = r.top + (o.y / 384) * r.height;
    
    const dx = cx - targetX, dy = cy - targetY;
    const hitRadius = R * 1.4 * r.width;
    if (dx * dx + dy * dy <= hitRadius * hitRadius) {
      const a = Math.abs(dt);
      if (dt < -250) return;
      this.judge(o, a <= WIN.Perfect ? 'Perfect' : a <= WIN.Great ? 'Great' : a <= WIN.Good ? 'Good' : 'Miss');
    }
  }

  judge(o, j) {
    const s = this.s;
    o.st = 2; s.counts[j]++; s.n++; s.pts += PTS[j];
    if (j === 'Miss') { 
      if (s.combo >= 5) this.rend.shake(); 
      s.combo = 0; 
      chibiManager.triggerReaction('Miss');
    } else {
      s.combo++; s.max = Math.max(s.max, s.combo);
      s.score += Math.round(PTS[j] * (1 + Math.min(s.combo, 100) / 20));
      this.hud.setScore(s.score);

      if (j === 'Perfect') chibiManager.triggerReaction('Perfect');
      if (s.combo > 0 && s.combo % 25 === 0) chibiManager.triggerReaction('Combo');
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

// --- INPUT CONTROLLER ---
let key1 = 'z', key2 = 'x';
function updateKeybinds() {
  const k1 = document.getElementById('key1')?.value.trim().toLowerCase();
  const k2 = document.getElementById('key2')?.value.trim().toLowerCase();
  if (k1) key1 = k1;
  if (k2) key2 = k2;
}

function initInput(gameInstance, onEsc) {
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const cursorDot = document.getElementById('cursor-dot');
  const sliceCanvas = document.getElementById('slice-canvas');
  const sliceCtx = sliceCanvas?.getContext('2d');
  const activeTouches = new Map();

  function resizeSliceCanvas() {
    if (!sliceCanvas) return;
    sliceCanvas.width = window.innerWidth;
    sliceCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeSliceCanvas);
  resizeSliceCanvas();

  function renderSliceTrails() {
    if (!sliceCtx) return;
    sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    const now = Date.now();

    activeTouches.forEach((trail) => {
      if (trail.length > 1) {
        sliceCtx.beginPath();
        sliceCtx.moveTo(trail[0].x, trail[0].y);
        for (let i = 1; i < trail.length; i++) sliceCtx.lineTo(trail[i].x, trail[i].y);
        sliceCtx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--cursor-color').trim() || '#00f0ff';
        sliceCtx.lineWidth = 5;
        sliceCtx.lineCap = 'round';
        sliceCtx.shadowColor = '#ffcf4a';
        sliceCtx.shadowBlur = 12;
        sliceCtx.stroke();
      }
      const valid = trail.filter(p => now - p.time < 120);
      trail.length = 0;
      trail.push(...valid);
    });

    requestAnimationFrame(renderSliceTrails);
  }
  renderSliceTrails();

  document.getElementById('key1')?.addEventListener('input', updateKeybinds);
  document.getElementById('key2')?.addEventListener('input', updateKeybinds);

  function updatePCCursor(clientX, clientY) {
    const field = document.getElementById('field');
    if (!field) return;
    const rect = field.getBoundingClientRect();
    pos.x = Math.max(rect.left, Math.min(rect.right, clientX));
    pos.y = Math.max(rect.top, Math.min(rect.bottom, clientY));

    if (gameInstance.mode === 'pc' && gameInstance.running && cursorDot) {
      cursorDot.style.display = 'block';
      cursorDot.style.left = `${pos.x - rect.left}px`;
      cursorDot.style.top = `${pos.y - rect.top}px`;
    } else if (cursorDot) {
      cursorDot.style.display = 'none';
    }
  }

  addEventListener('pointermove', (e) => {
    updatePCCursor(e.clientX, e.clientY);
    if (gameInstance.mode === 'mobile' && gameInstance.running) {
      if (activeTouches.has(e.pointerId)) {
        activeTouches.get(e.pointerId).push({ x: e.clientX, y: e.clientY, time: Date.now() });
        gameInstance.slice(e.clientX, e.clientY, e.timeStamp);
      }
    }
  }, { passive: true });

  addEventListener('pointerdown', (e) => {
    if (e.target.closest('button,input,textarea,select,.screen')) return;
    updatePCCursor(e.clientX, e.clientY);

    if (gameInstance.mode === 'mobile') {
      activeTouches.set(e.pointerId, [{ x: e.clientX, y: e.clientY, time: Date.now() }]);
      gameInstance.slice(e.clientX, e.clientY, e.timeStamp);
    } else {
      gameInstance.press(pos.x, pos.y, e.timeStamp);
    }
  });

  const removePointer = (id) => activeTouches.delete(id);
  addEventListener('pointerup', (e) => removePointer(e.pointerId));
  addEventListener('pointercancel', (e) => removePointer(e.pointerId));

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const tag = document.activeElement?.tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

    updateKeybinds();
    const k = e.key.toLowerCase();
    if (k === key1 || k === key2) gameInstance.press(pos.x, pos.y, e.timeStamp);
    else if (k === 'escape') onEsc();
  });
}

// --- MAIN BOOTSTRAP ---
const $ = (id) => document.getElementById(id);
const player = new YTPlayer();
const clock = new SongClock(player);
const hud = new Hud();
const rend = new Renderer($('field'), $('pulse'), $('combo'));
const game = new Game({ clock, player, field: $('field'), rend, hud, onEnd: showResult });
let videoId = null, duration = 0;

chibiManager.init($('field'));

// --- MENU NAVIGATION & INTERACTION SYSTEM ---
const setupContainer = $('menu-setup-container');
const menuBody = document.querySelector('.menu-body');
const btnPlay = $('btn-menu-play');
const btnPractice = $('btn-menu-practice');
const btnSongs = $('btn-menu-songs');
const btnBack = $('btn-back-main');
const navScores = $('nav-scores');
const navProfile = $('nav-profile');
const navSettings = $('nav-settings');
const navHelp = $('nav-help');
const btnBug = $('btn-bug');

function openSetupPanel(tabId = 'tab-game', titleText = 'Song & Game Setup') {
  if (menuBody) menuBody.style.display = 'none';
  if (setupContainer) setupContainer.hidden = false;
  $('panel-title-text').textContent = titleText;
  
  // Switch active tab
  document.querySelectorAll('.tab-btn').forEach(b => {
    const isTarget = b.dataset.tab === tabId;
    b.classList.toggle('active', isTarget);
  });
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.toggle('active', c.id === tabId);
  });
}

function closeSetupPanel() {
  if (setupContainer) setupContainer.hidden = true;
  if (menuBody) menuBody.style.display = 'flex';
}

btnPlay?.addEventListener('click', () => {
  uiSounds.playClick();
  openSetupPanel('tab-game', 'Song & Game Setup');
  if (!videoId) loadVideo();
});

btnPractice?.addEventListener('click', () => {
  uiSounds.playClick();
  openSetupPanel('tab-game', 'Practice Mode');
  if (!videoId) loadVideo();
});

btnSongs?.addEventListener('click', () => {
  uiSounds.playClick();
  openSetupPanel('tab-game', 'Song Selection');
});

btnBack?.addEventListener('click', () => {
  uiSounds.playClick();
  closeSetupPanel();
});

navSettings?.addEventListener('click', () => {
  uiSounds.playClick();
  openSetupPanel('tab-theme', 'Settings & Preferences');
});

navScores?.addEventListener('click', () => {
  uiSounds.playClick();
  openSetupPanel('tab-game', 'Personal Best Scores');
  updateHighScoreBanner();
});

navProfile?.addEventListener('click', () => {
  uiSounds.playClick();
  openSetupPanel('tab-companion', 'Profile & Companion Customization');
});

// Custom Modal Dialog Helper (Replaces alert)
function showModal(title, text) {
  const modal = document.getElementById('custom-modal');
  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  if (!modal || !titleEl || !bodyEl) return;
  
  titleEl.textContent = title;
  bodyEl.textContent = text;
  modal.hidden = false;
}

document.getElementById('modal-close-btn')?.addEventListener('click', () => {
  uiSounds.playClick();
  const modal = document.getElementById('custom-modal');
  if (modal) modal.hidden = true;
});

navHelp?.addEventListener('click', () => {
  uiSounds.playClick();
  showModal(
    'TUBE RHYTHM HELP',
    '1. Aim your cursor or touch target.\n2. Hit notes using Key 1 / Key 2 (Z/X) or tap directly.\n3. Customise skin theme & mascot in Settings!'
  );
});

btnBug?.addEventListener('click', () => {
  uiSounds.playClick();
  showModal(
    'Bug Report Info',
    'If you experience video playback issues, please ensure the YouTube video allows external embedding.'
  );
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    uiSounds.playClick();
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  });
});

// Bind UI hover sound to interactive elements
function initHoverSounds() {
  const hoverSelectors = '.menu-nav-item, .nav-icon-btn, .bug-report-btn, .tab-btn, .back-btn, button, select, input';
  document.querySelectorAll(hoverSelectors).forEach((el) => {
    el.addEventListener('mouseenter', () => uiSounds.playHover());
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHoverSounds);
} else {
  initHoverSounds();
}

// Theme Selector Handler
const selectTheme = $('select-theme');
selectTheme?.addEventListener('change', (e) => {
  document.body.setAttribute('data-theme', e.target.value);
});

const videoDim = $('video-dim');
const bgmToggle = $('bgm-toggle');
const bgmVolume = $('bgm-volume');

videoDim?.addEventListener('input', (e) => {
  const opacity = (+e.target.value / 100).toFixed(2);
  const currentTheme = document.body.getAttribute('data-theme') || 'cyberpunk';
  let baseRgb = '8,6,24';
  if (currentTheme === 'kawaii') baseRgb = '30,15,35';
  if (currentTheme === 'monochrome' || currentTheme === 'high-contrast') baseRgb = '0,0,0';
  if (currentTheme === 'synthwave') baseRgb = '20,5,30';

  $('dim').style.background = `rgba(${baseRgb}, ${opacity})`;
});

bgmToggle?.addEventListener('change', (e) => {
  themeSongEngine.isEnabled = e.target.value === 'enabled';
  if (!themeSongEngine.isEnabled) themeSongEngine.stop();
  else if ($('screen-start').hidden === false) themeSongEngine.start();
});

bgmVolume?.addEventListener('input', (e) => {
  themeSongEngine.setVolume(+e.target.value / 100);
});

function detectDevice() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const modeSelect = $('play-mode');
  if (modeSelect) modeSelect.value = isMobile ? 'mobile' : 'pc';
}
detectDevice();

const msg = (t, bad = true) => { $('msg').textContent = t; $('msg').className = 'msg' + (bad ? ' bad' : ''); };

function getHighScore(vid) {
  try {
    const data = localStorage.getItem(`tube_rhythm_hs_${vid}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveHighScore(vid, r) {
  if (!vid) return;
  const prev = getHighScore(vid);
  if (!prev || r.score > prev.score) {
    try {
      localStorage.setItem(`tube_rhythm_hs_${vid}`, JSON.stringify({
        score: r.score, max: r.max, acc: r.acc, grade: r.grade, date: Date.now()
      }));
    } catch {}
  }
}

function updateHighScoreBanner() {
  const container = $('highscore-container');
  if (!container) return;
  const hs = getHighScore(videoId);
  if (hs && videoId) {
    container.innerHTML = `
      <div class="highscore-box">
        <div>
          <div class="highscore-title">Personal Best Score</div>
          <div class="highscore-val">${hs.score.toLocaleString()} <span style="font-size: 13px; opacity:0.7;">(${(hs.acc * 100).toFixed(2)}% | ${hs.max}x)</span></div>
        </div>
        <div class="highscore-grade">${hs.grade}</div>
      </div>
    `;
  } else {
    container.innerHTML = '';
  }
}

function regenerate() {
  $('map').value = generateMap({
    bpm: Math.max(30, +$('bpm').value || 120), offset: +$('offset').value || 0,
    approach: +$('approach').value || 900, duration: duration || 120, seed: videoId,
  });
}

async function loadVideo() {
  const id = parseVideoId($('url').value);
  if (!id) return msg('Please paste a valid YouTube watch, youtu.be, or shorts URL.');
  msg('Loading video...', false); $('load').disabled = true;
  try {
    duration = await player.load(id);
    videoId = id;
    $('title').textContent = player.title();
    regenerate();
    updateHighScoreBanner();
    msg(duration ? '' : 'Video length could not be read automatically. Pattern generated for 120s.', !duration);
  } catch (e) { msg(e.message); }
  $('load').disabled = false;
}

function play() {
  const map = parseMap($('map').value);
  if (map.errors.length) return msg(`Beatmap script error on ${map.errors[0]}`);
  if (!map.objects.length) return msg('Beatmap contains no hit targets.');
  msg('', false);

  themeSongEngine.stop();

  player.setVolume(+$('vol').value);
  player.seek(0); player.play();
  ['screen-start', 'screen-result', 'screen-pause'].forEach((id) => { if (!$(id).hidden) hideScreen($(id)); });
  showScreen($('field'), false); showScreen($('hud'), false);
  
  chibiManager.setGameplayState(true);
  game.start(map, $('play-mode').value);
}

function toStart(message) {
  game.stop(); player.pause();
  chibiManager.setGameplayState(false);
  $('cursor-dot').style.display = 'none';
  hideScreen($('field'), false); hideScreen($('hud'), false);
  ['screen-pause', 'screen-result'].forEach((id) => { if (!$(id).hidden) hideScreen($(id)); });
  showScreen($('screen-start'));
  updateHighScoreBanner();

  themeSongEngine.start();
  if (message) msg(message);
}

function showResult(r) {
  chibiManager.setGameplayState(false);
  chibiManager.triggerReaction('Victory');
  $('cursor-dot').style.display = 'none';
  hideScreen($('field'), false); hideScreen($('hud'), false);
  $('grade').textContent = r.grade;
  $('r-score').textContent = r.score.toLocaleString();
  const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  $('r-stats').innerHTML = [
    row('Perfect', r.counts.Perfect), row('Great', r.counts.Great), row('Good', r.counts.Good), row('Miss', r.counts.Miss),
    row('Max combo', r.max + 'x'), row('Accuracy', (r.acc * 100).toFixed(2) + '%'),
  ].join('');

  saveHighScore(videoId, r);
  showScreen($('screen-result'));
  anime({ targets: '#grade', scale: [2.2, 1], duration: 600, easing: 'easeOutElastic(1, .6)' });
  anime({ targets: '#r-stats div', opacity: [0, 1], translateX: [-14, 0], delay: anime.stagger(80, { start: 250 }), easing: 'easeOutCubic' });
}

function togglePause() {
  if (!game.running) return;
  if (!game.paused) { game.pause(); showScreen($('screen-pause')); }
  else { hideScreen($('screen-pause')); game.resume(); }
}

player.onError = (m) => { if (game.running) toStart(m); };
$('load').onclick = loadVideo;
$('url').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadVideo(); });
$('gen').onclick = regenerate;
$('play').onclick = play;
$('retry').onclick = play;
$('again').onclick = () => toStart();
$('resume').onclick = togglePause;
$('quit').onclick = () => toStart();
$('vol').oninput = () => player.p && player.setVolume(+$('vol').value);

initInput(game, togglePause);