# MeetingAI — Real-time Meeting Transcription + Claude Assistant

Captures system audio from Zoom, Teams, Meet, etc. → transcribes with Whisper → sends to Claude.

---

## Prerequisites

### 1. ffmpeg (with DirectShow support)
Download from https://ffmpeg.org/download.html
- Choose the "full" build (not essentials)
- Extract and add the `bin/` folder to your Windows PATH
- Test: open a terminal and run `ffmpeg -version`

### 2. whisper.cpp
```bash
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
cmake -B build
cmake --build build --config Release

# Download the small English model (~150MB, fast + accurate enough for meetings)
.\models\download-ggml-model.cmd small.en
```

### 3. Enable Stereo Mix on Windows
- Right-click the speaker icon in system tray → Sound Settings → More sound settings
- Go to the **Recording** tab
- Right-click in the empty area → **Show Disabled Devices**
- Right-click **Stereo Mix** → **Enable**

> If Stereo Mix is missing, your audio driver doesn't support it.
> Install **VB-Cable** (free virtual audio device) from https://vb-audio.com/Cable/
> Then set Zoom/Teams to output to VB-Cable, and capture VB-Cable in this app.

---

## Setup

```bash
npm install
```

Update the paths in `main.js`:
```js
const WHISPER_BIN   = 'C:/whisper.cpp/build/bin/Release/whisper-cli.exe';
const WHISPER_MODEL = 'C:/whisper.cpp/models/ggml-small.en.bin';
```

Set your Anthropic API key as an environment variable:
```bash
# PowerShell
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# Or add to your system environment variables permanently
```

---

## Run

```bash
npm start
```

---

## Usage

1. Click **Detect Devices** — it will scan and auto-select your loopback device
2. Select **Stereo Mix** (or VB-Cable) from the dropdown
3. Join your Zoom/Teams call
4. Press **▶ Start Capture**
5. Transcript appears every ~8 seconds in the **Transcript** tab
6. Claude responds automatically in the **Claude** tab
7. You can also type questions to Claude manually — it has context of the recent transcript

---

## Tips

- Use the **small.en** Whisper model for speed, **medium.en** for better accuracy
- Adjust `CHUNK_DURATION` in `main.js` (default: 8 seconds) — shorter = more responsive, longer = better context per chunk
- The system prompt is editable in the sidebar — customize it for your use case (e.g. "focus on action items" or "translate to French")
- Toggle **Auto-send to Claude** off if you only want the transcript and prefer to ask Claude manually

---

## File Structure

```
meeting-assistant/
├── main.js        ← Electron main process (audio capture, Whisper, Claude API)
├── preload.js     ← Secure IPC bridge
├── index.html     ← UI (transcript + Claude chat)
├── package.json
└── README.md
```