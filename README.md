# Tube Rhythm

A web-based rhythm game powered by YouTube video playback and Anime.js. Paste any YouTube music video link, generate or edit custom beatmaps, and play along to the rhythm on desktop or mobile devices.

---

## 🎮 How to Play

### 1. Load a Song
1. Copy any public YouTube video link (watch URLs, `youtu.be` links, YouTube Shorts, or embed URLs).
2. Paste the link into the **YouTube Link** input box on the start screen.
3. Click **Load Video**.

### 2. Configure Settings & Beatmap
- **Play Mode:** Choose between **PC User** or **Mobile User** (automatically detected on startup).
- **BPM & Offset:** Set the tempo and start time of the first beat in milliseconds.
- **Approach Speed:** Adjust how fast hit circles shrink before reaching exact beat timing (300ms–2000ms).
- **Regenerate Pattern:** Click to auto-generate circle coordinates timed to the configured BPM.
- **Custom Beatmaps:** Directly edit the beatmap text box following the format:
  ```text
  bpm: 120
  offset: 0
  approach: 900
  # time_ms, x, y (x: 0-512, y: 0-384)
  1000,256,192
  1500,300,200
  ```

---

## 🕹️ Controls & Play Modes

### 💻 PC User Mode (Desktop)
* **Aiming:** Move your mouse over the screen. The aim indicator (`#cursor-dot`) is strictly **clamped within the field boundaries** and cannot exceed the border.
* **Hitting Circles:** Press **`Z`** or **`X`** on your keyboard, or perform a standard **left-click** when the approach ring aligns with the inner target circle.
* **Pause / Unpause:** Press **`Esc`** at any time during gameplay.

### 📱 Mobile User Mode (Fruit Ninja Style)
* **Slicing Targets:** Drag or swipe your finger across target circles in rhythm with the music.
* **Visual Trail:** Renders a neon swipe trail across your touch trajectory. Touch collisions trigger precision judgments automatically upon contact.

---

## 🎯 Scoring & Judgments

Hits are judged based on timing accuracy relative to the video time:

| Judgment | Timing Window | Score |
| :--- | :--- | :--- |
| **Perfect** | $\le \pm 40\text{ ms}$ | $300\text{ pts} \times \text{Combo multiplier}$ |
| **Great** | $\le \pm 80\text{ ms}$ | $200\text{ pts} \times \text{Combo multiplier}$ |
| **Good** | $\le \pm 120\text{ ms}$ | $100\text{ pts} \times \text{Combo multiplier}$ |
| **Miss** | $> \pm 120\text{ ms}$ | $0\text{ pts}$ (Resets combo) |

Final grades (**S**, **A**, **B**, **C**, **D**) are awarded based on total accuracy percentage at the end of the song.

