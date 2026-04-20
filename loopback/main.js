const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win;
let ffmpegProcess = null;
let isCapturing = false;
let chunkIndex = 0;
const CHUNK_DURATION = 8; // seconds per chunk
const TMP_DIR = os.tmpdir();

// ── Update these paths after building whisper.cpp ──
const WHISPER_BIN   = process.env.WHISPER_BIN   || 'C:\\Users\\inuko\\OneDrive\\Documents\\GitHub\\kongaraju\\whisper.cpp\\build\\bin\\Release\\whisper-cli.exe';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'C:\\Users\\inuko\\OneDrive\\Documents\\GitHub\\kongaraju\\whisper.cpp\\models\\ggml-small.en.bin';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'REMOVED_SECRET';

function createWindow() {
  win = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.loadFile('loopback/index.html');
  win.webContents.openDevTools();
}

// ── List audio devices (run once to find loopback device name) ──
ipcMain.handle('list-devices', () => {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], { shell: true });
    let out = '';
    p.stderr.on('data', (d) => (out += d.toString()));
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('close', () => resolve(out));
  });
});

// ── Start capture loop ──
ipcMain.on('start-capture', (_, deviceName) => {
  if (isCapturing) return;
  console.log('[MeetingAI] Start capture requested for device:', deviceName);
  isCapturing = true;
  chunkIndex = 0;
  captureChunk(deviceName);
});

// ── Stop capture ──
ipcMain.on('stop-capture', () => {
  isCapturing = false;
  if (ffmpegProcess) { ffmpegProcess.kill('SIGKILL'); ffmpegProcess = null; }
});

// ── Window controls ──
ipcMain.on('window-minimize', () => win.minimize());
ipcMain.on('window-close',    () => app.quit());

// ── Claude API call (from renderer) ──
ipcMain.handle('ask-claude', async (_, { transcript, systemPrompt, history }) => {
  const apiKey = ANTHROPIC_API_KEY;
  if (!apiKey) return { error: 'No ANTHROPIC_API_KEY set in environment.' };

  const messages = [
    ...history,
    { role: 'user', content: `Meeting transcript segment:\n\n"${transcript}"\n\nPlease respond as a helpful meeting assistant.` },
  ];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt || 'You are a real-time meeting assistant. Summarize key points, highlight action items, answer questions, and provide context from the ongoing meeting transcript. Be concise and useful.',
        messages,
      }),
    });
    const data = await res.json();
    if (data.error) return { error: data.error.message };
    return { text: data.content?.[0]?.text || '' };
  } catch (err) {
    return { error: err.message };
  }
});

function captureChunk(deviceName) {
  if (!isCapturing) return;
  const outputFile = path.join(TMP_DIR, `ma_chunk_${chunkIndex++}.wav`);

  console.log('[MeetingAI] Spawning ffmpeg for device:', deviceName);
  ffmpegProcess = spawn('ffmpeg', [
    '-f', 'dshow',
    '-i', `audio=\"${deviceName}\"`,
    '-t', String(CHUNK_DURATION),
    '-ar', '16000',
    '-ac', '1',
    '-y', outputFile,
  ], { shell: true });

  ffmpegProcess.stdout.on('data', (data) => {
    console.log('[ffmpeg stdout]', data.toString());
  });
  ffmpegProcess.stderr.on('data', (data) => {
    console.log('[ffmpeg stderr]', data.toString());
  });

  ffmpegProcess.on('error', (err) => {
    console.error('[MeetingAI] ffmpeg process error:', err);
  });

  ffmpegProcess.on('close', (code) => {
    ffmpegProcess = null;
    console.log('[MeetingAI] ffmpeg process exited with code:', code);
    if (code === 0 && fs.existsSync(outputFile)) {
      transcribeChunk(outputFile, deviceName);
    } else {
      if (isCapturing) setTimeout(() => captureChunk(deviceName), 500);
    }
  });
}

function transcribeChunk(wavFile, deviceName) {
  const wp = spawn(WHISPER_BIN, [
    '-m', WHISPER_MODEL,
    '-f', wavFile,
    '--no-timestamps',
    '-l', 'en',
    '--print-colors', 'false',
  ], { shell: true });

  let output = '';
  wp.stdout.on('data', (d) => (output += d.toString()));
  wp.stderr.on('data', () => {}); // suppress whisper logs

  wp.on('close', () => {
    try { fs.unlinkSync(wavFile); } catch (_) {}
    const transcript = output.replace(/\[.*?\]/g, '').trim();
    if (transcript && win) {
      win.webContents.send('transcript-chunk', transcript);
    }
    if (isCapturing) captureChunk(deviceName);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });