// YouTube integration (IFrame Player API).
const ERRORS = {
  2: 'The video ID is invalid.',
  5: 'The HTML5 player failed to load this video.',
  100: 'The video was not found or is private.',
  101: 'The owner does not allow embedding this video.',
  150: 'The owner does not allow embedding this video.',
  153: 'Embedding was blocked. Serve the page over http://localhost instead of opening the file directly.',
};

/** Returns an 11-character video ID from a watch, youtu.be, embed, shorts or live URL, or a bare ID. Null if invalid. */
export function parseVideoId(input) {
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
    s.onerror = () => { apiPromise = null; reject(new Error('Could not load the YouTube API. Check your connection.')); };
    document.head.appendChild(s);
  }));
}

export class YTPlayer {
  p = null; err = null; onError = null;
  _onError = (e) => { this.err = ERRORS[e.data] || `Player error ${e.data}.`; this.onError?.(this.err); };

  /** Creates or re-cues the player; resolves with the duration in seconds (0 if unknown after 6 s). */
  async load(id) {
    await loadApi();
    this.err = null;
    if (!this.p) {
      this.p = new YT.Player('yt', {
        videoId: id,
        playerVars: { controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, playsinline: 1, iv_load_policy: 3 },
        events: { onError: this._onError },
      });
    } else if (this.p.cueVideoById) this.p.cueVideoById(id);
    for (let i = 0; i < 60; i++) {
      if (this.err) throw new Error(this.err);
      const p = this.p;
      if (p.getVideoData && p.getVideoData().video_id === id && p.getDuration() > 0) return p.getDuration();
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
  title() { return this.p?.getVideoData()?.title || ''; }
}