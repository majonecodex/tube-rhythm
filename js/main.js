// Entry point: wires the screens, player, game and input together.
import { parseVideoId, YTPlayer } from './youtube.js';
import { SongClock } from './clock.js';
import { parse, generate } from './beatmap.js';
import { initInput } from './input.js';
import { Renderer } from './render.js';
import { Hud, show, hide } from './ui.js';
import { Game } from './game.js';

const $ = (id) => document.getElementById(id);
const player = new YTPlayer();
const clock = new SongClock(player);
const hud = new Hud();
const rend = new Renderer($('field'), $('pulse'), $('combo'));
const game = new Game({ clock, player, field: $('field'), rend, hud, onEnd: showResult });
let videoId = null, duration = 0;

// Automatically detect user device on load
function detectDevice() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);
  const modeSelect = $('play-mode');
  if (modeSelect) {
    modeSelect.value = isMobile ? 'mobile' : 'pc';
  }
}
detectDevice();

const msg = (t, bad = true) => { $('msg').textContent = t; $('msg').className = 'msg' + (bad ? ' bad' : ''); };

function regenerate() {
  $('map').value = generate({
    bpm: Math.max(30, +$('bpm').value || 120), offset: +$('offset').value || 0,
    approach: +$('approach').value || 900, duration: duration || 120, seed: videoId,
  });
}

async function loadVideo() {
  const id = parseVideoId($('url').value);
  if (!id) return msg('That is not a valid YouTube link. Use a watch, youtu.be, shorts or embed URL.');
  msg('Loading video...', false); $('load').disabled = true;
  try {
    duration = await player.load(id);
    videoId = id;
    $('title').textContent = player.title();
    regenerate();
    $('setup').hidden = false;
    msg(duration ? '' : 'The video length could not be read. The default pattern covers 120 seconds; edit the beatmap if needed.', !duration);
  } catch (e) { $('setup').hidden = true; msg(e.message); }
  $('load').disabled = false;
}

function play() {
  const map = parse($('map').value);
  if (map.errors.length) return msg(`The beatmap has ${map.errors.length} invalid line(s). First: ${map.errors[0]}`);
  if (!map.objects.length) return msg('The beatmap has no hit objects.');
  msg('', false);
  player.setVolume(+$('vol').value);
  player.seek(0); player.play();
  ['screen-start', 'screen-result', 'screen-pause'].forEach((id) => { if (!$(id).hidden) hide($(id)); });
  show($('field'), false); show($('hud'), false);
  
  const mode = $('play-mode').value;
  game.start(map, mode);
}

function toStart(message) {
  game.stop(); player.pause();
  $('cursor-dot').style.display = 'none';
  hide($('field'), false); hide($('hud'), false);
  ['screen-pause', 'screen-result'].forEach((id) => { if (!$(id).hidden) hide($(id)); });
  show($('screen-start'));
  if (message) msg(message);
}

function showResult(r) {
  $('cursor-dot').style.display = 'none';
  hide($('field'), false); hide($('hud'), false);
  $('grade').textContent = r.grade;
  $('r-score').textContent = r.score.toLocaleString();
  const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
  $('r-stats').innerHTML = [
    row('Perfect', r.counts.Perfect), row('Great', r.counts.Great), row('Good', r.counts.Good), row('Miss', r.counts.Miss),
    row('Max combo', r.max + 'x'), row('Accuracy', (r.acc * 100).toFixed(2) + '%'),
  ].join('');
  show($('screen-result'));
  anime({ targets: '#grade', scale: [2.2, 1], duration: 600, easing: 'easeOutElastic(1, .6)' });
  anime({ targets: '#r-stats div', opacity: [0, 1], translateX: [-14, 0], delay: anime.stagger(80, { start: 250 }), easing: 'easeOutCubic' });
}

function togglePause() {
  if (!game.running) return;
  if (!game.paused) { game.pause(); show($('screen-pause')); }
  else { hide($('screen-pause')); game.resume(); }
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