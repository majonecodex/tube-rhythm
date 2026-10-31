// Input: pointer click/tap plus Z and X keys + Fruit Ninja touch swipe mechanics.
const cursorDot = document.getElementById('cursor-dot');
const sliceCanvas = document.getElementById('slice-canvas');
const sliceCtx = sliceCanvas?.getContext('2d');

let sliceTrail = [];

function resizeSliceCanvas() {
  if (!sliceCanvas) return;
  sliceCanvas.width = window.innerWidth;
  sliceCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeSliceCanvas);
resizeSliceCanvas();

function renderSliceTrail() {
  if (!sliceCtx) return;
  sliceCtx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
  if (sliceTrail.length > 1) {
    sliceCtx.beginPath();
    sliceCtx.moveTo(sliceTrail[0].x, sliceTrail[0].y);
    for (let i = 1; i < sliceTrail.length; i++) {
      sliceCtx.lineTo(sliceTrail[i].x, sliceTrail[i].y);
    }
    sliceCtx.strokeStyle = '#00f0ff';
    sliceCtx.lineWidth = 5;
    sliceCtx.lineCap = 'round';
    sliceCtx.shadowColor = '#ffcf4a';
    sliceCtx.shadowBlur = 12;
    sliceCtx.stroke();
  }
  sliceTrail = sliceTrail.filter(p => Date.now() - p.time < 120);
  requestAnimationFrame(renderSliceTrail);
}
renderSliceTrail();

export function initInput(gameInstance, onEsc) {
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  let isSwiping = false;

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
    if (gameInstance.mode === 'mobile' && isSwiping && gameInstance.running) {
      sliceTrail.push({ x: e.clientX, y: e.clientY, time: Date.now() });
      gameInstance.slice(e.clientX, e.clientY, e.timeStamp);
    }
  }, { passive: true });

  addEventListener('pointerdown', (e) => {
    if (e.target.closest('button,input,textarea,select,.screen')) return;
    updatePCCursor(e.clientX, e.clientY);

    if (gameInstance.mode === 'mobile') {
      isSwiping = true;
      sliceTrail = [{ x: e.clientX, y: e.clientY, time: Date.now() }];
      gameInstance.slice(e.clientX, e.clientY, e.timeStamp);
    } else {
      gameInstance.press(pos.x, pos.y, e.timeStamp);
    }
  });

  addEventListener('pointerup', () => { isSwiping = false; });
  addEventListener('pointercancel', () => { isSwiping = false; });

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'z' || k === 'x') gameInstance.press(pos.x, pos.y, e.timeStamp);
    else if (k === 'escape') onEsc();
  });
}