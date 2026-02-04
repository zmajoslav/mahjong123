/* global MahjongSolitaire */

const API_BASE = '';
var cachedBaseUrl = null;

function getBaseUrl(cb) {
  if (cachedBaseUrl) {
    if (cb) cb(cachedBaseUrl);
    return cachedBaseUrl;
  }
  fetch(API_BASE + '/api/config')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      cachedBaseUrl = data.baseUrl || '';
      if (cb) cb(cachedBaseUrl);
    })
    .catch(function () {
      if (cb) cb('');
    });
  return '';
}

function trackEvent(name, payload) {
  if (typeof payload === 'undefined') payload = {};
  try {
    if (window.gtag) window.gtag('event', name, payload);
    if (window.ga) window.ga('send', 'event', name, JSON.stringify(payload));
  } catch (e) {}
}

var soundMuted = localStorage.getItem('soundMuted') === 'true';
var audioCtx = null;
var ambienceNode = null;
var ambienceGain = null;

function getAudioCtx() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
  return audioCtx;
}

function createPinkNoise() {
    var ctx = getAudioCtx();
    if (!ctx) return null;
    var bufferSize = 2 * ctx.sampleRate;
    var noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var output = noiseBuffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; 
    }
    var lastOut = 0;
    return noiseBuffer;
}

function toggleAmbience(enabled) {
    var ctx = getAudioCtx();
    if (!ctx) return;
    
    if (enabled && !soundMuted) {
        if (!ambienceNode) {
            try {
                // Create a wind-like sound using filtered noise
                var buffer = createPinkNoise();
                if (!buffer) return;
                
                ambienceNode = ctx.createBufferSource();
                ambienceNode.buffer = buffer;
                ambienceNode.loop = true;
                
                ambienceGain = ctx.createGain();
                ambienceGain.gain.value = 0; // Start silent and fade in
                
                var filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 400;
                filter.Q.value = 1;
                
                // Modulate filter to simulate wind
                var lfo = ctx.createOscillator();
                lfo.type = 'sine';
                lfo.frequency.value = 0.15;
                var lfoGain = ctx.createGain();
                lfoGain.gain.value = 200;
                lfo.connect(lfoGain);
                lfoGain.connect(filter.frequency);
                lfo.start();

                ambienceNode.connect(filter);
                filter.connect(ambienceGain);
                ambienceGain.connect(ctx.destination);
                
                ambienceNode.start();
                
                // Fade in
                ambienceGain.gain.setTargetAtTime(0.08, ctx.currentTime, 2);
            } catch(e) {
                console.error("Audio init failed", e);
            }
        } else if (ctx.state === 'suspended') {
            ctx.resume();
        } else if (ambienceGain) {
             ambienceGain.gain.setTargetAtTime(0.08, ctx.currentTime, 2);
        }
    } else {
        if (ambienceGain) {
            // Fade out
            ambienceGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
            setTimeout(function() {
                if (ambienceNode) {
                    ambienceNode.stop();
                    ambienceNode = null;
                    ambienceGain = null;
                }
            }, 600);
        }
    }
}

function playTone(freq, duration, type) {
  if (soundMuted) return;
  var ctx = getAudioCtx();
  if (!ctx) return;
  // Resume context if needed (browsers block auto-play)
  if (ctx.state === 'suspended') ctx.resume();
  
  try {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type || 'sine';
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

function playMatch() {
  // C Major chord arpeggio: C5, E5, G5
  playTone(523.25, 0.1, 'sine');
  setTimeout(function () { playTone(659.25, 0.1, 'sine'); }, 50);
  setTimeout(function () { playTone(783.99, 0.15, 'sine'); }, 100);
}
function playUndo() {
  playTone(400, 0.1, 'sine');
}
function playWin() {
  playTone(523, 0.1, 'sine');
  setTimeout(function () { playTone(659, 0.1, 'sine'); }, 80);
  setTimeout(function () { playTone(784, 0.15, 'sine'); }, 160);
}
function playHint() {
  playTone(600, 0.08, 'sine');
}

function setSoundMuted(muted) {
  soundMuted = !!muted;
  localStorage.setItem('soundMuted', soundMuted ? 'true' : 'false');
  var btn = $('soundToggleBtn');
  if (btn) {
    btn.setAttribute('aria-label', soundMuted ? 'Unmute sound' : 'Mute sound');
    btn.textContent = soundMuted ? '🔇' : '🔊';
  }
  
  // Handle ambience state
  var ambienceEnabled = $('ambienceToggle') ? $('ambienceToggle').checked : false;
  if (soundMuted) {
      toggleAmbience(false);
  } else if (ambienceEnabled) {
      toggleAmbience(true);
  }
}

var TILE_UNICODE = {
  D1: '\u{1F019}', D2: '\u{1F01A}', D3: '\u{1F01B}', D4: '\u{1F01C}', D5: '\u{1F01D}',
  D6: '\u{1F01E}', D7: '\u{1F01F}', D8: '\u{1F020}', D9: '\u{1F021}',
  B1: '\u{1F010}', B2: '\u{1F011}', B3: '\u{1F012}', B4: '\u{1F013}', B5: '\u{1F014}',
  B6: '\u{1F015}', B7: '\u{1F016}', B8: '\u{1F017}', B9: '\u{1F018}',
  C1: '\u{1F007}', C2: '\u{1F008}', C3: '\u{1F009}', C4: '\u{1F00A}', C5: '\u{1F00B}',
  C6: '\u{1F00C}', C7: '\u{1F00D}', C8: '\u{1F00E}', C9: '\u{1F00F}',
  E: '\u{1F000}', S: '\u{1F001}', W: '\u{1F002}', N: '\u{1F003}',
  RD: '\u{1F004}', GD: '\u{1F005}', WD: '\u{1F006}',
  F1: '\u{1F022}', F2: '\u{1F023}', F3: '\u{1F024}', F4: '\u{1F025}',
  S1: '\u{1F026}', S2: '\u{1F027}', S3: '\u{1F028}', S4: '\u{1F029}'
};

function tileSymbol(kind) {
  return TILE_UNICODE[kind] || kind;
}

function tileSuitClass(kind) {
  if (!kind) return '';
  if (kind[0] === 'D') return 'suit--dots';
  if (kind[0] === 'B') return 'suit--bamboos';
  if (kind[0] === 'C') return 'suit--chars';
  if (kind === 'E' || kind === 'S' || kind === 'W' || kind === 'N') return 'suit--winds';
  if (kind === 'RD') return 'suit--dragon-red';
  if (kind === 'GD') return 'suit--dragon-green';
  if (kind === 'WD') return 'suit--dragon-white';
  if (kind[0] === 'F') return 'suit--flowers';
  if (kind[0] === 'S' && kind.length === 2) return 'suit--seasons';
  return '';
}

function getTileSvg(kind) {
  if (!kind) return '';
  var suit = kind[0];
  var val = kind.substring(1);
  
  // Base SVG wrapper
  var start = '<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">';
  var end = '</svg>';
  var content = '';

  if (suit === 'D') { // Dots
    var colors = ['#1d4ed8', '#059669', '#dc2626'];
    var dot = function(cx, cy, r, fill) { 
      if (!fill || fill.indexOf('#') !== 0) {
        console.error('Invalid fill color for dot:', fill, {cx, cy, r});
        fill = '#000000';
      }
      return '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+fill+'" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>'; 
    };
    if (val === '1') content = dot(50, 60, 35, colors[2]) + dot(50, 60, 15, '#fbbf24');
    else if (val === '2') content = dot(50, 35, 18, colors[0]) + dot(50, 85, 18, colors[1]);
    else if (val === '3') content = dot(25, 30, 15, colors[0]) + dot(50, 60, 15, colors[2]) + dot(75, 90, 15, colors[1]);
    else if (val === '4') content = dot(30, 35, 15, colors[0]) + dot(70, 35, 15, colors[1]) + dot(30, 85, 15, colors[1]) + dot(70, 85, 15, colors[0]);
    else if (val === '5') content = dot(25, 30, 14, colors[0]) + dot(75, 30, 14, colors[1]) + dot(50, 60, 14, colors[2]) + dot(25, 90, 14, colors[1]) + dot(75, 90, 14, colors[0]);
    else if (val === '6') content = dot(30, 30, 13, colors[0]) + dot(70, 30, 13, colors[0]) + dot(30, 60, 13, colors[2]) + dot(70, 60, 13, colors[2]) + dot(30, 90, 13, colors[2]) + dot(70, 90, 13, colors[2]);
    else if (val === '7') content = dot(20, 25, 11, colors[0]) + dot(50, 45, 11, colors[0]) + dot(80, 65, 11, colors[0]) + dot(30, 85, 11, colors[2]) + dot(70, 85, 11, colors[2]) + dot(30, 105, 11, colors[2]) + dot(70, 105, 11, colors[2]);
    else if (val === '8') content = dot(30, 20, 10, colors[2]) + dot(70, 20, 10, colors[2]) + dot(30, 45, 10, colors[2]) + dot(70, 45, 10, colors[2]) + dot(30, 70, 10, colors[2]) + dot(70, 70, 10, colors[2]) + dot(30, 95, 10, colors[2]) + dot(70, 95, 10, colors[2]);
    else if (val === '9') content = dot(20, 25, 10, colors[0]) + dot(50, 25, 10, colors[0]) + dot(80, 25, 10, colors[0]) + dot(20, 60, 10, colors[2]) + dot(50, 60, 10, colors[2]) + dot(80, 60, 10, colors[2]) + dot(20, 95, 10, colors[1]) + dot(50, 95, 10, colors[1]) + dot(80, 95, 10, colors[1]);
  } else if (suit === 'B') { // Bamboos
    var colors = ['#059669', '#dc2626', '#1d4ed8'];
    var stick = function(x, y, w, h, fill) { 
      if (!fill || fill.indexOf('#') !== 0) {
        console.error('Invalid fill color for stick:', fill, {x, y, w, h});
        fill = '#000000';
      }
      return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>'; 
    };
    if (val === '1') content = '<path d="M50 20 L80 90 L20 90 Z" fill="'+colors[0]+'" stroke="black" stroke-width="1"/><circle cx="50" cy="45" r="10" fill="'+colors[1]+'"/>'; // Simplified bird
    else if (val === '2') content = stick(45, 20, 10, 35, colors[0]) + stick(45, 65, 10, 35, colors[1]);
    else if (val === '3') content = stick(45, 20, 10, 35, colors[1]) + stick(25, 65, 10, 35, colors[0]) + stick(65, 65, 10, 35, colors[0]);
    else if (val === '4') content = stick(25, 20, 10, 35, colors[0]) + stick(65, 20, 10, 35, colors[1]) + stick(25, 65, 10, 35, colors[1]) + stick(65, 65, 10, 35, colors[0]);
    else if (val === '5') content = stick(20, 20, 10, 35, colors[0]) + stick(70, 20, 10, colors[1]) + stick(45, 42, 10, 35, colors[2]) + stick(20, 65, 10, colors[1]) + stick(70, 65, 10, colors[0]);
    else if (val === '6') content = stick(20, 20, 10, 35, colors[0]) + stick(45, 20, 10, 35, colors[0]) + stick(70, 20, 10, colors[1]) + stick(20, 65, 10, colors[1]) + stick(45, 65, 10, 35, colors[1]) + stick(70, 65, 10, colors[1]);
    else if (val === '7') content = stick(45, 15, 10, 30, colors[1]) + stick(20, 50, 10, 30, colors[0]) + stick(45, 50, 10, 30, colors[0]) + stick(70, 50, 10, 30, colors[0]) + stick(20, 85, 10, 30, colors[0]) + stick(45, 85, 10, 30, colors[0]) + stick(70, 85, 10, 30, colors[0]);
    else if (val === '8') content = stick(25, 15, 10, 25, colors[0]) + stick(45, 15, 10, 25, colors[1]) + stick(65, 15, 10, 25, colors[0]) + stick(35, 45, 10, 25, colors[2]) + stick(55, 45, 10, 25, colors[2]) + stick(25, 75, 10, 25, colors[1]) + stick(45, 75, 10, 25, colors[0]) + stick(65, 75, 10, 25, colors[1]);
    else if (val === '9') content = stick(20, 15, 10, 25, colors[1]) + stick(45, 15, 10, 25, colors[0]) + stick(70, 15, 10, 25, colors[2]) + stick(20, 45, 10, 25, colors[1]) + stick(45, 45, 10, 25, colors[0]) + stick(70, 45, 10, 25, colors[2]) + stick(20, 75, 10, 25, colors[1]) + stick(45, 75, 10, 25, colors[0]) + stick(70, 75, 10, 25, colors[2]);
  } else if (suit === 'C') { // Characters
    content = '<text x="50" y="50" font-size="45" text-anchor="middle" fill="#dc2626" font-weight="bold">'+val+'</text><text x="50" y="100" font-size="40" text-anchor="middle" fill="#1e293b" font-weight="bold">萬</text>';
  } else if (kind === 'E') content = '<text x="50" y="75" font-size="60" text-anchor="middle" fill="#1e293b" font-weight="bold">東</text>';
  else if (kind === 'S') content = '<text x="50" y="75" font-size="60" text-anchor="middle" fill="#1e293b" font-weight="bold">南</text>';
  else if (kind === 'W') content = '<text x="50" y="75" font-size="60" text-anchor="middle" fill="#1e293b" font-weight="bold">西</text>';
  else if (kind === 'N') content = '<text x="50" y="75" font-size="60" text-anchor="middle" fill="#1e293b" font-weight="bold">北</text>';
  else if (kind === 'RD') content = '<text x="50" y="75" font-size="60" text-anchor="middle" fill="#dc2626" font-weight="bold">中</text>';
  else if (kind === 'GD') content = '<text x="50" y="75" font-size="60" text-anchor="middle" fill="#059669" font-weight="bold">發</text>';
  else if (kind === 'WD') content = '<rect x="20" y="25" width="60" height="70" fill="none" stroke="#1d4ed8" stroke-width="8" rx="4"/>';
  else if (suit === 'F') content = '<text x="50" y="70" font-size="50" text-anchor="middle" fill="#c026d3">🌸</text><text x="50" y="105" font-size="25" text-anchor="middle" fill="#c026d3">'+val+'</text>';
  else if (suit === 'S' && val.length === 1) content = '<text x="50" y="70" font-size="50" text-anchor="middle" fill="#0d9488">🍂</text><text x="50" y="105" font-size="25" text-anchor="middle" fill="#0d9488">'+val+'</text>';

  return content ? start + content + end : null;
}

function $(id) {
  return document.getElementById(id);
}

function getAccessToken() {
  return localStorage.getItem('accessToken') || '';
}

function setAccessToken(token) {
  localStorage.setItem('accessToken', token);
}

function clearAccessToken() {
  localStorage.removeItem('accessToken');
}

async function apiRequest(path, opts) {
  var method = opts?.method || 'GET';
  var headers = { 'Content-Type': 'application/json' };
  if (!opts?.public) {
    var token = getAccessToken();
    if (token) headers.Authorization = 'Bearer ' + token;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json().catch(function () { return {}; });
  if (!res.ok) throw new Error(json?.error?.message || 'HTTP ' + res.status);
  return json;
}

var game = null;
var timerInterval = null;
var autoHintTimeout = null;
var selectedTileId = null;
var currentLayout = 'turtle';
var lastScore = 0;
var matchInProgress = false;
var pendingMatchTimeoutId = null;
var stuckModalShownForGame = false;

var LAYOUT_PAIRS = {
  supereasy: 12,
  easy: 24,
  turtle: 36,
  pyramid: 40,
  hard: 52,
  fort: 40,
  caterpillar: 36,
};
var AUTO_HINT_DELAY_MS = 10000;

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(updateUI, 500);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getLayout() {
  var sel = $('layoutSelectTop') || $('layoutSelect');
  return (sel && sel.value) || 'turtle';
}

function updateLayoutPreview() {
  var layout = getLayout();
  if (layout === 'daily') layout = getDailyChallengeLayout();
  var previewEl = $('layoutPreview');
  if (!previewEl) return;
  
  var svg = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">';
  if (layout === 'turtle') {
    svg += '<rect x="30" y="30" width="40" height="40" fill="var(--accent2)" opacity="0.6"/>';
    svg += '<rect x="20" y="20" width="20" height="20" fill="var(--accent2)" opacity="0.4"/>';
    svg += '<rect x="60" y="20" width="20" height="20" fill="var(--accent2)" opacity="0.4"/>';
    svg += '<rect x="20" y="60" width="20" height="20" fill="var(--accent2)" opacity="0.4"/>';
    svg += '<rect x="60" y="60" width="20" height="20" fill="var(--accent2)" opacity="0.4"/>';
  } else if (layout === 'pyramid') {
    svg += '<rect x="40" y="40" width="20" height="20" fill="var(--accent2)" opacity="0.8"/>';
    svg += '<rect x="30" y="30" width="40" height="40" fill="var(--accent2)" opacity="0.5"/>';
    svg += '<rect x="20" y="20" width="60" height="60" fill="var(--accent2)" opacity="0.2"/>';
  } else if (layout === 'hard') {
    svg += '<rect x="10" y="10" width="80" height="80" fill="var(--accent2)" opacity="0.3"/>';
    svg += '<rect x="25" y="25" width="50" height="50" fill="var(--accent2)" opacity="0.6"/>';
  } else {
    svg += '<circle cx="50" cy="50" r="30" fill="var(--accent2)" opacity="0.5"/>';
  }
  svg += '</svg>';
  previewEl.innerHTML = svg;
}

function clearAutoHint() {
  if (autoHintTimeout) {
    clearTimeout(autoHintTimeout);
    autoHintTimeout = null;
  }
}

function startAutoHintTimer() {
  clearAutoHint();
  if (!game) return;
  
  var hardMode = $('hardModeToggle') && $('hardModeToggle').checked;
  if (hardMode) return;

  autoHintTimeout = setTimeout(function () {
    autoHintTimeout = null;
    if (!game) return;
    var state = game.getState();
    if (state.won || state.remaining === 0) return;
    var r = game.hint();
    if (r.ok) {
      selectedTileId = null;
      document.querySelectorAll('.tile--selected').forEach(function (el) { el.classList.remove('tile--selected'); });
      var boardEl = $('board');
      var a = boardEl ? boardEl.querySelector('[data-id="' + r.tileA + '"]') : null;
      var b = boardEl ? boardEl.querySelector('[data-id="' + r.tileB + '"]') : null;
      if (a) a.classList.add('tile--hint');
      if (b) b.classList.add('tile--hint');
      playHint();
      showToast('Here\'s a hint! 💡', 'success');
      setTimeout(function () {
        showToast('Tip: Try clearing the top layer first.', 'info');
      }, 2200);
      setTimeout(function () {
        if (a) a.classList.remove('tile--hint');
        if (b) b.classList.remove('tile--hint');
      }, 2000);
      updateUI();
    }
    startAutoHintTimer();
  }, AUTO_HINT_DELAY_MS);
}

var STATS_KEY = 'mahjongStats';
var ACHIEVEMENTS_KEY = 'mahjongAchievements';

var ACHIEVEMENTS = [
  { id: 'first_win', name: 'First Win', desc: 'Win your first game', icon: '🏆' },
  { id: 'daily_hero', name: 'Daily Hero', desc: 'Win a Daily Challenge', icon: '📅' },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Win in under 3 minutes', icon: '⚡' },
  { id: 'combo_master', name: 'Combo Master', desc: 'Reach a 10x combo', icon: '🔥' },
  { id: 'layout_explorer', name: 'Layout Explorer', desc: 'Win on 5 different layouts', icon: '🗺️' },
];

function loadAchievements() {
  try {
    var a = localStorage.getItem(ACHIEVEMENTS_KEY);
    return a ? JSON.parse(a) : [];
  } catch (e) {
    return [];
  }
}

function unlockAchievement(id) {
  var unlocked = loadAchievements();
  if (unlocked.indexOf(id) === -1) {
    unlocked.push(id);
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
    var ach = ACHIEVEMENTS.find(function(a) { return a.id === id; });
    if (ach) {
      showToast('Achievement Unlocked: ' + ach.name + ' ' + ach.icon, 'success');
    }
  }
}

function loadStats() {
  try {
    var s = localStorage.getItem(STATS_KEY);
    return s ? JSON.parse(s) : { gamesPlayed: 0, gamesWon: 0, bestScore: {}, bestTime: {} };
  } catch (e) {
    return { gamesPlayed: 0, gamesWon: 0, bestScore: {}, bestTime: {} };
  }
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
}

function recordGameStart(layout) {
  var stats = loadStats();
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  saveStats(stats);
}

function recordGameWin(layout, score, elapsed) {
  var stats = loadStats();
  stats.gamesWon = (stats.gamesWon || 0) + 1;
  stats.bestScore = stats.bestScore || {};
  stats.bestTime = stats.bestTime || {};
  if (!stats.bestScore[layout] || score > stats.bestScore[layout]) {
    stats.bestScore[layout] = score;
  }
  if (!stats.bestTime[layout] || elapsed < stats.bestTime[layout]) {
    stats.bestTime[layout] = elapsed;
  }
  
  // Daily Streak
  if (layout === 'daily' || (getLayout() === 'daily')) {
    var today = getDailyChallengeSeed();
    var lastWin = localStorage.getItem('lastDailyWinDate');
    var currentStreak = parseInt(localStorage.getItem('dailyStreak') || '0', 10);
    
    if (lastWin !== today) {
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      var yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
      
      if (lastWin === yesterdayStr) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
      localStorage.setItem('dailyStreak', currentStreak);
      localStorage.setItem('lastDailyWinDate', today);
      showToast('Daily Streak: ' + currentStreak + ' days! 🔥', 'success');
      unlockAchievement('daily_hero');
    }
  }
  
  unlockAchievement('first_win');
  if (elapsed < 180) unlockAchievement('speed_demon');
  
  var wonLayouts = Object.keys(stats.bestScore || {}).length;
  if (wonLayouts >= 5) unlockAchievement('layout_explorer');
  
  saveStats(stats);
}

function renderStatsPanel() {
  var el = $('statsPanel');
  if (!el) return;
  var stats = loadStats();
  var streak = parseInt(localStorage.getItem('dailyStreak') || '0', 10);
  var layouts = ['supereasy', 'easy', 'turtle', 'pyramid', 'hard', 'fort', 'caterpillar'];
  var names = { supereasy: 'L1', easy: 'L2', turtle: 'L3', pyramid: 'L4', hard: 'L5', fort: 'Fort', caterpillar: 'Caterpillar' };
  var html = '<p class="stats-summary"><strong>' + (stats.gamesPlayed || 0) + '</strong> games · <strong>' + (stats.gamesWon || 0) + '</strong> wins</p>';
  if (streak > 0) {
    html += '<p class="stats-streak">Daily Streak: <strong>' + streak + '</strong> days 🔥</p>';
  }
  
  var unlocked = loadAchievements();
  if (unlocked.length > 0) {
    html += '<div class="achievements-list">';
    ACHIEVEMENTS.forEach(function(ach) {
      var isUnlocked = unlocked.indexOf(ach.id) !== -1;
      html += '<div class="achievement-item ' + (isUnlocked ? 'unlocked' : 'locked') + '" title="' + ach.desc + '">';
      html += '<span class="achievement-icon">' + ach.icon + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  html += '<table class="stats-table"><thead><tr><th>Layout</th><th>Best score</th><th>Best time</th></tr></thead><tbody>';
  layouts.forEach(function (l) {
    var bestS = stats.bestScore && stats.bestScore[l] ? stats.bestScore[l] : '—';
    var bestT = stats.bestTime && stats.bestTime[l] ? formatTime(stats.bestTime[l]) : '—';
    html += '<tr><td>' + (names[l] || l) + '</td><td>' + bestS + '</td><td>' + bestT + '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function getDailyChallengeSeed() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function getDailyChallengeLayout() {
  var d = new Date();
  var start = new Date(d.getFullYear(), 0, 0);
  var dayOfYear = Math.floor((d - start) / 86400000);
  var layouts = ['turtle', 'pyramid', 'fort', 'easy', 'caterpillar'];
  return layouts[dayOfYear % layouts.length];
}

function newGame() {
  if (pendingMatchTimeoutId != null) {
    clearTimeout(pendingMatchTimeoutId);
    pendingMatchTimeoutId = null;
  }
  matchInProgress = false;
  stuckModalShownForGame = false;
  winHandledForGame = false;
  stopTimer();
  clearAutoHint();
  currentLayout = getLayout();
  var seed = null;
  if (currentLayout === 'daily') {
    currentLayout = getDailyChallengeLayout();
    seed = getDailyChallengeSeed();
  }
  game = MahjongSolitaire.createGame(currentLayout, seed);
  selectedTileId = null;
  lastScore = 0;
  startTimer();
  startAutoHintTimer();
  renderBoard();
  updateUI();
  requestAnimationFrame(centerStageView);
}

function updateUI() {
  if (!game) return;
  var state = game.getState();
  var totalPairs = LAYOUT_PAIRS[currentLayout] || 36;
  var totalTiles = totalPairs * 2;
  var matchEl = $('matchCount');
  if (matchEl) matchEl.textContent = state.remaining;
  var totalEl = $('matchTotal');
  if (totalEl) totalEl.textContent = '/' + totalTiles;
  
  var progressBar = $('progressBar');
  if (progressBar) {
    var progress = ((totalTiles - state.remaining) / totalTiles) * 100;
    progressBar.style.setProperty('--progress', progress + '%');
  }
  
  var timerEl = $('timer');
  if (timerEl) timerEl.textContent = formatTime(state.elapsed);
  var scoreEl = $('score');
  if (scoreEl) {
    scoreEl.textContent = state.score;
    if (state.score > lastScore) {
      scoreEl.classList.add('stat--pulse');
      setTimeout(function () { scoreEl?.classList.remove('stat--pulse'); }, 400);
      lastScore = state.score;
    }
  }
  
  // Update Combo UI
  var comboEl = $('comboCount');
  var comboBar = $('comboBar');
  var comboContainer = $('comboContainer');
  if (comboEl) {
    if (state.combo > 1) {
        comboEl.textContent = 'x' + state.combo;
        comboEl.parentElement.classList.add('combo-container--active');
        if (comboContainer) comboContainer.classList.add('combo-container--active');
    } else {
        comboEl.textContent = '';
        comboEl.parentElement.classList.remove('combo-container--active');
        if (comboContainer) comboContainer.classList.remove('combo-container--active');
    }
  }
  if (comboBar) {
    var pct = state.combo > 0 ? (state.comboTimeLeft / state.comboTotalTime) * 100 : 0;
    comboBar.style.width = pct + '%';
  }

  if (state.won) lastScore = 0;
  var validEl = $('validMoves');
  if (validEl) {
    validEl.textContent = state.validMoves;
    var validStat = validEl.closest('.stat');
    if (validStat) {
      validStat.classList.toggle('stat--warning', state.validMoves > 0 && state.validMoves <= 2);
      validStat.classList.toggle('stat--danger', state.validMoves === 0 && state.remaining > 0);
    }
  }
  var hintEl = $('hintCount');
  if (hintEl) hintEl.textContent = state.hintsRemaining;
  var hintNavEl = $('hintCountNav');
  if (hintNavEl) hintNavEl.textContent = state.hintsRemaining;
  var undoBtn = $('undoBtn');
  if (undoBtn) undoBtn.disabled = !state.canUndo;
  var undoBtnNav = $('undoBtnNav');
  if (undoBtnNav) undoBtnNav.disabled = !state.canUndo;
  var shuffleBtn = $('shuffleBtn');
  if (shuffleBtn) shuffleBtn.disabled = state.remaining === 0;
  var shuffleBtnNav = $('shuffleBtnNav');
  if (shuffleBtnNav) shuffleBtnNav.disabled = state.remaining === 0;

  if (state.won) {
    stopTimer();
    clearAutoHint();
    if (!winHandledForGame) {
      winHandledForGame = true;
      recordGameWin(currentLayout, state.score, state.elapsed);
      var totalPairs = LAYOUT_PAIRS[currentLayout] || 36;
      var bestKey = 'mahjongBest_' + currentLayout;
      var best = parseInt(localStorage.getItem(bestKey) || '0', 10);
      if (state.score > best) {
        localStorage.setItem(bestKey, String(state.score));
        showToast('New personal best! 🏆', 'success');
      }
      renderStatsPanel();
      showLevelCompleteThenModal(state);
    }
  } else if (state.validMoves === 0 && state.remaining > 0) {
    if (!stuckModalShownForGame) {
      stuckModalShownForGame = true;
      showStuckModal();
    }
  }
}

var renderBoardScheduled = null;
function renderBoard() {
  if (renderBoardScheduled) return;
  var board = $('board');
  if (!board || !game) return;
  renderBoardScheduled = requestAnimationFrame(function () {
    renderBoardScheduled = null;
    renderBoardImpl(board);
  });
}

function applyHintToDom(tileA, tileB, durationMs) {
  durationMs = durationMs || 1200;
  var boardEl = $('board');
  if (!boardEl) return;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (!game) return;
      var state = game.getState();
      var tileAState = state.tiles.filter(function (t) { return t.id === tileA; })[0];
      var tileBState = state.tiles.filter(function (t) { return t.id === tileB; })[0];
      if (!tileAState || !tileBState || tileAState.kind !== tileBState.kind || !tileAState.free || !tileBState.free) {
        return;
      }
      var a = boardEl.querySelector('[data-id="' + tileA + '"]');
      var b = boardEl.querySelector('[data-id="' + tileB + '"]');
      if (a && b) {
        a.classList.add('tile--hint');
        b.classList.add('tile--hint');
        setTimeout(function () {
          a.classList.remove('tile--hint');
          b.classList.remove('tile--hint');
        }, durationMs);
      }
    });
  });
}
function getTileDimensions(isLevel1) {
  var w = window.innerWidth;
  if (w <= 400) return { w: isLevel1 ? 52 : 44, h: isLevel1 ? 64 : 52 };
  if (w <= 600) return { w: isLevel1 ? 64 : 54, h: isLevel1 ? 78 : 64 };
  if (w <= 900) return { w: isLevel1 ? 88 : 76, h: isLevel1 ? 106 : 90 };
  return { w: isLevel1 ? 120 : 100, h: isLevel1 ? 145 : 120 };
}

function renderBoardImpl(board) {
  if (!game) return;
  var state = game.getState();
  var tiles = state.tiles;
  if (!tiles || tiles.length === 0) return;
  var highlightCb = $('highlightPlayableTop') || $('highlightPlayable');
  if (highlightCb && highlightCb.checked) {
    board.classList.add('board--highlight-playable');
  } else {
    board.classList.remove('board--highlight-playable');
  }

  const maxLayer = Math.max.apply(null, tiles.map(function (t) { return t.layer; })) || 0;

  var isLevel1 = currentLayout === 'supereasy';
  var dims = getTileDimensions(isLevel1);
  var tileW = dims.w;
  var tileH = dims.h;
  var layerOffsetX = 0;
  var layerOffsetY = Math.round(-tileH * 0.04);

  var fullBoardCount = (LAYOUT_PAIRS[currentLayout] || 36) * 2;
  var isNewGame = tiles.length === fullBoardCount;
  var minTop = Math.min.apply(null, tiles.map(function (t) { return t.row * tileH + t.layer * layerOffsetY; }));
  var minLeft = Math.min.apply(null, tiles.map(function (t) { return t.col * tileW + t.layer * layerOffsetX; }));
  var offsetY = minTop < 0 ? -minTop : 0;
  var offsetX = minLeft < 0 ? -minLeft : 0;

  var fragment = document.createDocumentFragment();
  tiles.forEach(function (t, i) {
    var el = document.createElement('div');
    var suitCls = tileSuitClass(t.kind);
    var isTopLayer = t.layer === maxLayer;
    var layerClass = ' tile--layer-' + t.layer;
    el.className = 'tile ' + (t.free ? 'tile--free' : 'tile--blocked') + (isNewGame ? ' tile--enter' : '') + (suitCls ? ' ' + suitCls + '-tile' : '') + (isLevel1 ? ' tile--level1' : '') + (isTopLayer ? ' tile--top-layer' : '') + layerClass;
    el.dataset.id = t.id;
    el.dataset.layer = t.layer;
    el.style.width = tileW + 'px';
    el.style.height = tileH + 'px';
    if (isNewGame) el.style.animationDelay = Math.min(i * 4, 280) + 'ms';
    el.style.left = (t.col * tileW + t.layer * layerOffsetX + offsetX) + 'px';
    el.style.top = (t.row * tileH + t.layer * layerOffsetY + offsetY) + 'px';
    var layerStep = 10000;
    var rowStep = 100;
    var colStep = 1;
    var freeBoost = 50;
    var baseZ = (t.layer * layerStep) + (t.row * rowStep) + (t.col * colStep);
    el.style.zIndex = baseZ + (t.free ? freeBoost : 0);
    var sym = tileSymbol(t.kind);
    var cls = sym !== t.kind ? 'tile__kind' : 'tile__kind tile__kind--fallback';
    var suitCls = tileSuitClass(t.kind);
    if (suitCls) cls += ' ' + suitCls;
    
    // Use SVG for tile faces
    var svgContent = getTileSvg(t.kind);
    if (svgContent) {
      el.innerHTML = '<div class="tile__svg-wrap">' + svgContent + '</div>';
    } else {
      el.innerHTML = '<span class="' + cls + '" title="' + escapeHtml(t.kind) + '">' + escapeHtml(sym) + '</span>';
    }
    
    el.addEventListener('click', onTileClick);
    fragment.appendChild(el);
  });

  var maxRight = Math.max.apply(null, tiles.map(function (t) {
    return t.col * tileW + t.layer * layerOffsetX + tileW;
  }));
  var maxBottom = Math.max.apply(null, tiles.map(function (t) {
    return t.row * tileH + t.layer * layerOffsetY + tileH;
  }));
  var w = Math.ceil(maxRight - minLeft + 16);
  var h = Math.ceil(maxBottom - minTop + 32);
  board.style.width = w + 'px';
  board.style.height = h + 'px';

  if (board.replaceChildren) {
    board.replaceChildren(fragment);
  } else {
    board.innerHTML = '';
    while (fragment.firstChild) {
      board.appendChild(fragment.firstChild);
    }
  }

  requestAnimationFrame(function () {
    scaleToFit();
  });
}

function scaleToFit() {
  var stage = $('stage');
  var inner = stage ? stage.querySelector('.stage__inner') : null;
  var board = $('board');
  if (!stage || !inner || !board) return;

  // Defer layout reads to next frame to avoid forced reflow (read after DOM/style invalidation)
  requestAnimationFrame(function () {
    var stageW = stage.clientWidth;
    var stageH = stage.clientHeight;
    var boardW = board.offsetWidth;
    var boardH = board.offsetHeight;

    if (boardW === 0 || boardH === 0) return;

    var padding = window.innerWidth <= 400 ? 16 : (window.innerWidth < 600 ? 24 : 48);
    var scaleX = (stageW - padding) / boardW;
    var scaleY = (stageH - padding) / boardH;
    var scale = Math.min(scaleX, scaleY, 1);

    inner.style.transformOrigin = 'center center';
    inner.style.transform = 'scale(' + scale + ')';
  });
}

function centerStageView() {
  scaleToFit();
}

function setupStagePanning() {
  var stage = $('stage');
  if (!stage) return;

  // Re-scale and re-render board on resize (e.g. rotate) so tile sizes stay readable
  var resizeTimeout;
  window.addEventListener('resize', function () {
    scaleToFit();
    if (game && $('board')) {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        renderBoard();
      }, 150);
    }
  });

  var isDown = false;
  var isDragging = false;
  var lastPanAt = 0;
  var pointerId = null;
  var startX = 0;
  var startY = 0;
  var currentX = 0;
  var currentY = 0;
  var translateX = 0;
  var translateY = 0;
  var DRAG_THRESHOLD_PX = 6;

  function shouldIgnoreTarget(t) {
    if (!t) return false;
    // Ignore panning if clicking on tiles (or inside them) or UI controls
    if (t.closest && t.closest('.tile')) return true;
    return !!t.closest('button, input, select, textarea, a, label');
  }

  // 3D Tilt Effect
  var tiltEnabled = localStorage.getItem('tiltEnabled') !== 'false';
  var inner = stage.querySelector('.stage__inner');
  
  stage.addEventListener('mousemove', function(e) {
    if (!tiltEnabled || isDragging || isDown) {
        if (inner) inner.style.transform = inner.style.transform.replace(/rotateX\([^)]+\) rotateY\([^)]+\)/, '');
        return;
    }
    
    var rect = stage.getBoundingClientRect();
    var x = e.clientX - rect.left; // x position within the element.
    var y = e.clientY - rect.top;  // y position within the element.
    
    var cx = rect.width / 2;
    var cy = rect.height / 2;
    
    var dx = (x - cx) / cx; // -1 to 1
    var dy = (y - cy) / cy; // -1 to 1
    
    // Max rotation in degrees
    var maxRot = 4;
    var rotX = -dy * maxRot;
    var rotY = dx * maxRot;
    
    if (inner) {
        // We need to preserve the scale and translate if they exist
        var currentTransform = inner.style.transform;
        // Strip existing rotates if any to avoid accumulation (though we rewrite it)
        var baseTransform = currentTransform.replace(/rotateX\([^)]+\) rotateY\([^)]+\)/, '').trim();
        inner.style.transform = baseTransform + ' rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)';
    }
  });
  
  stage.addEventListener('mouseleave', function() {
    if (inner) {
        var currentTransform = inner.style.transform;
        var baseTransform = currentTransform.replace(/rotateX\([^)]+\) rotateY\([^)]+\)/, '').trim();
        inner.style.transform = baseTransform;
    }
  });

  stage.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (shouldIgnoreTarget(e.target)) return;
    isDown = true;
    isDragging = false;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    currentX = translateX;
    currentY = translateY;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });

  stage.addEventListener('pointermove', function (e) {
    if (!isDown) return;
    if (pointerId !== null && e.pointerId !== pointerId) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (!isDragging && (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)) {
      isDragging = true;
      stage.classList.add('stage--panning');
    }
    if (isDragging) {
      translateX = currentX + dx;
      translateY = currentY + dy;
      var inner = stage.querySelector('.stage__inner');
      if (inner) {
        var currentScale = inner.style.transform.match(/scale\(([\d.]+)\)/);
        var scale = currentScale ? parseFloat(currentScale[1]) : 1;
        inner.style.transform = 'scale(' + scale + ') translate(' + translateX + 'px, ' + translateY + 'px)';
      }
      e.preventDefault();
    }
  });

  function endPan(e) {
    if (!isDown) return;
    isDown = false;
    if (isDragging) {
      isDragging = false;
      lastPanAt = Date.now();
      stage.classList.remove('stage--panning');
      if (pointerId !== null) {
        try { stage.releasePointerCapture(pointerId); } catch (err) {}
      }
      if (e) e.preventDefault();
    }
    pointerId = null;
  }

  stage.addEventListener('pointerup', endPan);
  stage.addEventListener('pointercancel', endPan);

  // Only suppress clicks if the user actually dragged (not just a click)
  stage.addEventListener('click', function (e) {
    if (isDragging || (Date.now() - lastPanAt < 200)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function onTileClick(ev) {
  if (!game || matchInProgress) return;
  const el = ev.target.closest('.tile');
  if (!el || !el.dataset.id) return;
  const id = el.dataset.id;
  const state = game.getState();
  if (!state.tiles || state.tiles.length === 0) return;
  const tile = state.tiles.find(function (t) { return t.id === id; });
  if (!tile || !tile.free) return;

  if (selectedTileId === null) {
    selectedTileId = id;
    document.querySelectorAll('.tile--selected').forEach(function (e) { e.classList.remove('tile--selected'); });
    el.classList.add('tile--selected');
    return;
  }

  if (selectedTileId === id) {
    selectedTileId = null;
    el.classList.remove('tile--selected');
    return;
  }

  var result = game.match(selectedTileId, id);
  if (result.ok) {
    matchInProgress = true;
    playMatch();
    startAutoHintTimer();
    var prevId = selectedTileId;
    var boardEl = $('board');
    var a = boardEl ? boardEl.querySelector('[data-id="' + prevId + '"]') : null;
    var b = boardEl ? boardEl.querySelector('[data-id="' + id + '"]') : null;
    selectedTileId = null;
    document.querySelectorAll('.tile--selected').forEach(function (e) { e.classList.remove('tile--selected'); });
    if (a) a.classList.add('tile--matched');
    if (b) b.classList.add('tile--matched');
    showMatchPopup(a, b, result.score, result.combo);
    spawnParticles(a, b);
    
    if (result.comboBroken) {
        showToast('Combo Lost!', 'info');
    } else if (result.combo > 1) {
        // Play higher pitch for higher combos
        // Base freq 523 (C5). Add semitones.
        var semitones = Math.min((result.combo - 1) * 2, 12);
        var freq = 523 * Math.pow(2, semitones / 12);
        playTone(freq, 0.1, 'sine');
        setTimeout(function() { playTone(freq * 1.25, 0.15, 'triangle'); }, 80);
        if (result.combo >= 10) unlockAchievement('combo_master');
    } else {
        playMatch();
    }

    var stateAfter = game.getState();
    var totalPairs = LAYOUT_PAIRS[currentLayout] || 36;
    var remaining = stateAfter.won ? 0 : Math.floor(stateAfter.remaining / 2);
    announce(stateAfter.won ? 'All tiles cleared! You won!' : 'Matched pair. ' + remaining + ' pairs remaining.');
    pendingMatchTimeoutId = setTimeout(function () {
      pendingMatchTimeoutId = null;
      matchInProgress = false;
      if (game) {
        renderBoard();
        updateUI();
      }
    }, 260);
  } else {
    selectedTileId = null;
    document.querySelectorAll('.tile--selected').forEach(function (e) { e.classList.remove('tile--selected'); });
  }
}

function showLevelCompleteThenModal(state) {
  playWin();
  var overlay = document.createElement('div');
  overlay.className = 'level-complete';
  overlay.setAttribute('aria-live', 'polite');
  var lc = typeof window.t === 'function' ? window.t('ui.levelComplete') : 'Level complete!';
  overlay.innerHTML = '<div class="level-complete__inner"><span class="level-complete__icon">🏆</span><p class="level-complete__text">' + lc + '</p></div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('level-complete--visible'); });
  setTimeout(function () {
    overlay.classList.remove('level-complete--visible');
    setTimeout(function () {
      overlay.remove();
      showWinModal(state);
    }, 400);
  }, 1500);
}

function showWinModal(state) {
  announce('You won! Score: ' + state.score + '. Time: ' + formatTime(state.elapsed));
  trackEvent('game_won', { score: state.score, time: state.elapsed, layout: currentLayout });
  var bodyHtml = '<div class="win-summary">';
  bodyHtml += '<p class="win-summary__score">🌟 Score: <strong>' + state.score + '</strong></p>';
  bodyHtml += '<p class="win-summary__time">⏱ Time: <strong>' + formatTime(state.elapsed) + '</strong></p>';
  var t = typeof window.t === 'function' ? window.t : function (k) { return k; };
  bodyHtml += '<p class="win-summary__cheer">' + (t('win.cheer') || 'You cleared all the tiles! You\'re a star!') + ' ⭐</p>';
  
  // Name input for guest leaderboard
  bodyHtml += '<div class="field" style="margin-top: 20px;">';
  bodyHtml += '<label class="field__label" for="winNameInput">' + (t('ui.yourName') || 'Your Name') + '</label>';
  bodyHtml += '<input class="field__input" id="winNameInput" placeholder="' + (t('ui.enterName') || 'Enter name for leaderboard...') + '" maxlength="32" autocomplete="off">';
  bodyHtml += '</div>';
  
  bodyHtml += '<button class="btn btn--primary" id="submitScoreBtn" style="width: 100%; margin-top: 10px;">' + (t('ui.saveToLeaderboard') || 'Save Score') + ' 🏆</button>';
  bodyHtml += '<button class="btn btn--ghost" id="newGameFromWin" style="width: 100%; margin-top: 10px;">' + (t('ui.playAgain') || 'Play Again') + ' 🎮</button>';
  
  bodyHtml += '<div class="win-share" style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px;">';
  bodyHtml += '<p class="win-share__label">' + (t('win.shareLabel') || 'Share your score:') + '</p>';
  bodyHtml += '<div class="win-share__buttons">';
  bodyHtml += '<button class="btn btn--facebook" id="shareFacebookBtn"><span class="btn__icon">f</span> Facebook</button>';
  bodyHtml += '<button class="btn btn--twitter" id="shareTwitterBtn"><span class="btn__icon">𝕏</span> Twitter</button>';
  bodyHtml += '</div>';
  bodyHtml += '</div>';
  bodyHtml += '</div>';

  $('modalTitle').innerHTML = '<span class="modal__title-icon">🏆</span> Amazing! You did it! 🎉';
  $('modalBody').innerHTML = bodyHtml;
  var modalEl = $('modalBackdrop').querySelector('.modal');
  var confetti = $('confetti');
  if (modalEl) modalEl.classList.add('modal--win');
  trapFocusInModal();
  if (confetti) {
    confetti.innerHTML = '';
    var colors = ['#22d3ee', '#a78bfa', '#4ade80', '#fde047', '#fb7185'];
    for (var i = 0; i < 40; i++) {
      var p = document.createElement('div');
      p.className = 'confetti__particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = (Math.random() * 0.5) + 's';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
      confetti.appendChild(p);
    }
    confetti.classList.add('confetti--active');
  }
  $('modalBackdrop').classList.remove('hidden');

  // Pre-fill name from localStorage if available
  var savedName = localStorage.getItem('mahjongPlayerName');
  if (savedName) {
    var nameInput = $('winNameInput');
    if (nameInput) nameInput.value = savedName;
  }

  $('submitScoreBtn')?.addEventListener('click', function () {
    var nameInput = $('winNameInput');
    var name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
      showToast(typeof window.t === 'function' ? window.t('toasts.enterName') : 'Please enter your name to save to the leaderboard.', 'error');
      return;
    }
    // Save name for next time
    localStorage.setItem('mahjongPlayerName', name);
    
    var btn = this;
    btn.disabled = true;
    btn.textContent = 'Saving...';

    // Ensure we use public: true for guest scores to avoid "Missing Bearer Token"
    apiRequest('/api/scores', {
      method: 'POST',
      public: true,
      body: {
        displayName: name,
        layoutName: currentLayout,
        score: state.score,
        elapsedSeconds: state.elapsed,
      },
    }).then(function () {
      showToast(typeof window.t === 'function' ? window.t('toasts.scoreSaved') : 'Score saved! You\'re on the leaderboard!', 'success');
      btn.textContent = 'Saved! ✅';
      // Refresh sidebar if it's open
      var sidebar = $('sidebar');
      if (sidebar && !sidebar.classList.contains('sidebar--hidden')) {
        loadLeaderboard();
        renderStatsPanel();
      }
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = (t('ui.saveToLeaderboard') || 'Save Score') + ' 🏆';
      showToast((typeof window.t === 'function' ? window.t('toasts.couldNotSave') : 'Could not save score: ') + err.message, 'error');
    });
  });
  $('newGameFromWin')?.addEventListener('click', function () {
    closeModal();
    newGame();
  });
  $('shareFacebookBtn')?.addEventListener('click', function () {
    var text = 'I just scored ' + state.score + ' points in Mahjong Solitaire in ' + formatTime(state.elapsed) + '! Can you beat my score? 🀄🏆';
    var url = window.location.origin || 'https://yoursite.com';
    var shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '&quote=' + encodeURIComponent(text);
    window.open(shareUrl, 'facebook-share', 'width=580,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
    trackEvent('share_facebook', { score: state.score });
  });
  $('shareTwitterBtn')?.addEventListener('click', function () {
    var text = 'I just scored ' + state.score + ' points in Mahjong Solitaire in ' + formatTime(state.elapsed) + '! Can you beat my score? 🀄🏆';
    var url = window.location.origin || 'https://yoursite.com';
    var shareUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
    window.open(shareUrl, 'twitter-share', 'width=580,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
    trackEvent('share_twitter', { score: state.score });
  });
}

function submitScore(state, displayName, onSuccess) {
  apiRequest('/api/scores', {
    method: 'POST',
    public: true,
    body: {
      displayName: displayName,
      layoutName: currentLayout,
      score: state.score,
      elapsedSeconds: state.elapsed,
    },
  }).then(function () {
    if (onSuccess) onSuccess();
  }).catch(function (err) {
    showToast((typeof window.t === 'function' ? window.t('toasts.couldNotSave') : 'Could not save score: ') + err.message, 'error');
  });
}

function announce(message) {
  var el = $('announcer');
  if (el) {
    el.textContent = '';
    requestAnimationFrame(function () {
      el.textContent = message;
    });
  }
}

function trapFocusInModal() {
  var backdrop = $('modalBackdrop');
  if (!backdrop || backdrop.classList.contains('hidden')) return;
  var focusables = backdrop.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  var first = focusables[0];
  var last = focusables[focusables.length - 1];
  if (first) first.focus();
  function onKey(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        if (last) last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        if (first) first.focus();
      }
    }
  }
  document.addEventListener('keydown', onKey);
  var observer = new MutationObserver(function () {
    if (backdrop.classList.contains('hidden')) document.removeEventListener('keydown', onKey);
  });
  observer.observe(backdrop, { attributes: true, attributeFilter: ['class'] });
}

function closeModal() {
  var modalEl = $('modalBackdrop') && $('modalBackdrop').querySelector('.modal');
  var confetti = $('confetti');
  if (modalEl) modalEl.classList.remove('modal--win');
  if (confetti) confetti.classList.remove('confetti--active');
  $('modalBackdrop').classList.add('hidden');
}

function showStuckModal() {
  stopTimer();
  clearAutoHint();
  announce(typeof window.t === 'function' ? window.t('toasts.noMoves') : 'No moves left. Shuffle or start a new game.');
  var bodyHtml = '<div class="win-summary">';
  bodyHtml += '<p class="win-summary__cheer">No moves available! Shuffle to mix things up or start a new game.</p>';
  bodyHtml += '<button class="btn btn--primary" id="stuckShuffleBtn">Shuffle tiles 🔀</button>';
  bodyHtml += '<button class="btn btn--ghost" id="stuckNewGameBtn">New game 🎮</button>';
  bodyHtml += '</div>';

  $('modalTitle').innerHTML = '<span class="modal__title-icon">🤔</span> Stuck? No problem!';
  $('modalBody').innerHTML = bodyHtml;
  $('modalBackdrop').classList.remove('hidden');
  trapFocusInModal();

  $('stuckShuffleBtn')?.addEventListener('click', function () {
    if (!game) return;
    var r = game.shuffle();
    if (r.ok) {
      stuckModalShownForGame = false;
      closeModal();
      startTimer();
      startAutoHintTimer();
      renderBoard();
      updateUI();
      showToast((typeof window.t === 'function' ? window.t('toasts.tilesShuffled') : 'Tiles shuffled!') + ' 🔀', 'info');
    }
  });

  $('stuckNewGameBtn')?.addEventListener('click', function () {
    closeModal();
    newGame();
  });
}

var MATCH_MESSAGES = [
  'Great match! ✨', 'Awesome! 🌟', 'Nice! 👍', "You're on fire! 🔥",
  'Super! ⭐', 'Perfect! 💯', 'Wow! 😍', 'Excellent! 🎉',
  'Cool! 😎', 'Fantastic! 🌈', 'Amazing! 💫', 'Way to go! 👏',
  'Yay! 🎈', 'You did it! 🎊', 'So good! 🌟', 'Star player! ⭐',
  'Wonderful! 🦋', 'Terrific! 🎨', 'Brilliant! 💡', 'Champion! 🏆'
];

function getMatchMessage() {
  return MATCH_MESSAGES[Math.floor(Math.random() * MATCH_MESSAGES.length)];
}

function spawnParticles(elA, elB) {
  if (!elA && !elB) return;
  var board = $('board');
  if (!board) return;
  
  var rect = board.getBoundingClientRect();
  
  function spawnAt(el) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    var cx = r.left + r.width / 2 - rect.left;
    var cy = r.top + r.height / 2 - rect.top;
    
    var colors = ['#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#ffffff', '#60a5fa', '#34d399'];
    
    for (var i = 0; i < 20; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      if (Math.random() > 0.5) p.style.borderRadius = '50%';
      else p.style.borderRadius = '2px';

      var size = Math.random() * 8 + 4;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      
      var angle = Math.random() * Math.PI * 2;
      var velocity = Math.random() * 0.5 + 0.5;
      var dist = (Math.random() * 80 + 40) * velocity;
      var tx = Math.cos(angle) * dist;
      var ty = Math.sin(angle) * dist;
      var rot = (Math.random() * 360 - 180) + 'deg';
      
      p.style.setProperty('--tx', tx + 'px');
      p.style.setProperty('--ty', ty + 'px');
      p.style.setProperty('--rot', rot);
      p.style.animationDuration = (Math.random() * 0.4 + 0.5) + 's';
      
      board.appendChild(p);
      setTimeout(function(e) { e.remove(); }, 900, p);
    }
  }
  
  spawnAt(elA);
  spawnAt(elB);
}

function showMatchPopup(tileA, tileB, score, combo) {
  var board = $('board');
  if (!board) return;
  var rect = board.getBoundingClientRect();
  var midX = rect.left + rect.width / 2;
  var midY = rect.top + rect.height / 2;
  if (tileA && tileB) {
    var rA = tileA.getBoundingClientRect();
    var rB = tileB.getBoundingClientRect();
    midX = (rA.left + rA.width / 2 + rB.left + rB.width / 2) / 2;
    midY = (rA.top + rA.height / 2 + rB.top + rB.height / 2) / 2;
  }
  var popup = document.createElement('div');
  popup.className = 'floating-text' + (combo > 1 ? ' floating-text--combo' : '');
  popup.innerHTML = '+' + score + (combo > 1 ? ' <small>x' + combo + '</small>' : '');
  popup.style.left = (midX - rect.left) + 'px';
  popup.style.top = (midY - rect.top) + 'px';
  board.style.position = 'relative';
  board.appendChild(popup);
  setTimeout(function () { popup.remove(); }, 900);
}

function showToast(msg, type) {
  type = type || 'info';
  var container = $('toastContainer');
  if (!container) return;
  var el = document.createElement('div');
  el.className = 'toast toast--' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function () {
    el.style.opacity = '0';
    el.style.transform = 'translateX(24px)';
    el.style.transition = 'opacity 0.25s, transform 0.25s';
    setTimeout(function () { el.remove(); }, 250);
  }, 3500);
}

function loadLeaderboard() {
  var layout = currentLayout || 'turtle';
  apiRequest('/api/leaderboard?layoutName=' + encodeURIComponent(layout) + '&limit=10', {
    public: true,
  })
    .then(function (res) {
      const el = $('leaderboard');
      if (!el) return;
      if (!res.leaderboard || res.leaderboard.length === 0) {
        el.innerHTML = '<p class="muted">No scores yet.</p>';
        return;
      }
      el.innerHTML = '<table class="leaderboard__table"><thead><tr><th>#</th><th>Name</th><th>Score</th><th>Time</th></tr></thead><tbody>' +
        res.leaderboard.map(function (r) {
          var rankClass = 'rank';
          if (r.rank === 1) rankClass += ' rank--gold';
          else if (r.rank === 2) rankClass += ' rank--silver';
          else if (r.rank === 3) rankClass += ' rank--bronze';
          return '<tr><td class="' + rankClass + '">' + r.rank + '</td><td>' + escapeHtml(r.username) + '</td><td>' + r.score + '</td><td>' + formatTime(r.elapsedSeconds) + '</td></tr>';
        }).join('') + '</tbody></table>';
    })
    .catch(function () {
      var el = $('leaderboard');
      if (el) el.innerHTML = '<p class="muted">Could not load leaderboard.</p>';
    });
}

var gameStartInProgress = false;
function startGame() {
  if (gameStartInProgress) return;
  var loadingOverlay = $('loadingOverlay');
  try {
    if (typeof MahjongSolitaire === 'undefined') {
      throw new Error('Game engine failed to load. Refresh the page.');
    }
    gameStartInProgress = true;
    newGame();
    var boardEl = $('board');
    if (boardEl) boardEl.classList.remove('board--loading');
    if (loadingOverlay) {
      setTimeout(function () {
        var wasOverlayVisible = !loadingOverlay.classList.contains('hidden');
        loadingOverlay.classList.add('hidden');
        gameStartInProgress = false;
        if (wasOverlayVisible) {
          showToast('Let\'s play! Have fun! 🎮', 'success');
          if (localStorage.getItem('mahjongTutorialSeen') !== 'true') {
            showTutorialOverlay();
          }
        }
      }, 300);
    } else {
      gameStartInProgress = false;
    }
  } catch (err) {
    gameStartInProgress = false;
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
    showToast(err && err.message ? err.message : 'Failed to load game. Try refreshing.', 'error');
    var boardEl = $('board');
    if (boardEl) boardEl.classList.remove('board--loading');
  }
}

function showTutorialOverlay() {
  var overlay = document.createElement('div');
  overlay.className = 'tutorial-overlay';
  overlay.id = 'tutorialOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-labelledby', 'tutorialTitle');
  overlay.innerHTML = '<div class="tutorial-overlay__inner"><h2 id="tutorialTitle" class="tutorial-overlay__title">How to play</h2><p class="tutorial-overlay__text">Click two <strong>matching</strong> tiles to remove them. A tile is playable when it has nothing on top and is free on the left or right.</p><button type="button" class="btn btn--primary" id="tutorialDismissBtn">Got it</button></div>';
  document.body.appendChild(overlay);
  var btn = $('tutorialDismissBtn');
  if (btn) {
    btn.focus();
    btn.addEventListener('click', function () {
      localStorage.setItem('mahjongTutorialSeen', 'true');
      overlay.classList.add('tutorial-overlay--hidden');
      setTimeout(function () { overlay.remove(); }, 300);
    });
  }
}

function applyTheme(theme) {
  var v = theme || localStorage.getItem('mahjongTheme') || 'dark';
  if (v === 'dark') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', v);
  }
}

function init() {
  applyTheme();

  var landing = $('landing');
  var gameWrap = $('gameWrap');
  var landingPlayBtn = $('landingPlayBtn');
  var loadingOverlay = $('loadingOverlay');
  
  if (landing && gameWrap && landingPlayBtn) {
    if (window.location.hash === '#play') {
      landing.style.display = 'none';
      gameWrap.classList.add('game-wrap--visible');
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');
      setTimeout(startGame, 80);
      setTimeout(function () {
        if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
          loadingOverlay.classList.add('hidden');
          showToast('Loading timed out. Click Play to try again.', 'error');
        }
      }, 5000);
    } else {
      // Defer game creation until Play is clicked so initial load stays light (Lighthouse trace)
      landingPlayBtn.addEventListener('click', function () {
        trackEvent('play_clicked');
        gameWrap.classList.add('game-wrap--visible');
        landing.classList.add('landing--hidden');
        if (!game) {
          if (loadingOverlay) loadingOverlay.classList.remove('hidden');
          startGame();
        } else {
          if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
            setTimeout(function () {
              loadingOverlay.classList.add('hidden');
              showToast('Let\'s play! Have fun! 🎮', 'success');
              if (localStorage.getItem('mahjongTutorialSeen') !== 'true') {
                showTutorialOverlay();
              }
            }, 300);
          } else {
            showToast('Let\'s play! Have fun! 🎮', 'success');
            if (localStorage.getItem('mahjongTutorialSeen') !== 'true') {
              showTutorialOverlay();
            }
          }
        }
        setTimeout(function () {
          landing.style.display = 'none';
        }, 400);
      });
    }
  } else {
    if (gameWrap) gameWrap.classList.add('game-wrap--visible');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    setTimeout(startGame, 80);
    setTimeout(function () {
      if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
        loadingOverlay.classList.add('hidden');
        showToast('Loading timed out. Click Play to try again.', 'error');
      }
    }, 5000);
  }

  // Sidebar toggle
  var sidebarFab = $('sidebarFab');
  var sidebar = $('sidebar');
  var sidebarClose = $('sidebarClose');
  if (sidebarFab && sidebar) {
    sidebarFab.addEventListener('click', function () {
      sidebar.classList.toggle('sidebar--hidden');
      if (!sidebar.classList.contains('sidebar--hidden')) {
        loadLeaderboard();
        renderStatsPanel();
      }
    });
  }
  if (sidebarClose && sidebar) {
    sidebarClose.addEventListener('click', function () {
      sidebar.classList.add('sidebar--hidden');
    });
  }

  var modalCloseBtn = $('modalCloseBtn');
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  var modalBackdrop = $('modalBackdrop');
  if (modalBackdrop) modalBackdrop.addEventListener('click', function (e) {
    if (e.target.id === 'modalBackdrop') closeModal();
  });

  var newDealBtn = $('newDealBtn');
  if (newDealBtn) newDealBtn.addEventListener('click', newGame);
  var newDealBtnNav = $('newDealBtnNav');
  if (newDealBtnNav) newDealBtnNav.addEventListener('click', newGame);
  var centerBtnNav = $('centerBtnNav');
  if (centerBtnNav) centerBtnNav.addEventListener('click', centerStageView);
  var undoBtn = $('undoBtn');
  var undoBtnNav = $('undoBtnNav');
  function doUndo() {
    if (!game || matchInProgress) return;
    playUndo();
    game.undo();
    renderBoard();
    updateUI();
  }
  if (undoBtn) undoBtn.addEventListener('click', doUndo);
  if (undoBtnNav) undoBtnNav.addEventListener('click', doUndo);

  var shuffleBtn = $('shuffleBtn');
  var shuffleBtnNav = $('shuffleBtnNav');
  function doShuffle() {
    if (!game || matchInProgress) return;
    var r = game.shuffle();
    if (r.ok) {
      startAutoHintTimer();
      renderBoard();
      updateUI();
      var shuffleMsg = (typeof window.t === 'function' ? window.t('toasts.tilesShuffled') : 'Tiles shuffled!');
      showToast(shuffleMsg + ' 🔀', 'info');
    } else if (r && r.message) {
      showToast(r.message, 'error');
    }
  }
  if (shuffleBtn) shuffleBtn.addEventListener('click', doShuffle);
  if (shuffleBtnNav) shuffleBtnNav.addEventListener('click', doShuffle);

  var hintBtn = $('hintBtn');
  var hintBtnNav = $('hintBtnNav');
  function doHint(e) {
    if (e) e.preventDefault();
    if (!game || matchInProgress) return;
    
    var hardMode = $('hardModeToggle') && $('hardModeToggle').checked;
    if (hardMode) {
      showToast('Hints disabled in Hard Mode!', 'error');
      return false;
    }

    startAutoHintTimer();
    var r = game.hint();
    if (r.ok) {
      playHint();
      selectedTileId = null;
      document.querySelectorAll('.tile--selected').forEach(function (el) { el.classList.remove('tile--selected'); });
      renderBoard();
      applyHintToDom(r.tileA, r.tileB, 1200);
      updateUI();
    }
    return false;
  }
  if (hintBtn) hintBtn.addEventListener('click', doHint);
  if (hintBtnNav) hintBtnNav.addEventListener('click', doHint);

  var soundToggleBtn = $('soundToggleBtn');
  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', function () {
      setSoundMuted(!soundMuted);
    });
    setSoundMuted(soundMuted);
  }

  var loadLeaderboardBtn = $('loadLeaderboardBtn');
  if (loadLeaderboardBtn) loadLeaderboardBtn.addEventListener('click', loadLeaderboard);

  var sidebar = $('sidebar');
  var sidebarToggle = $('sidebarToggle');
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('sidebar--collapsed');
    });
  }

  var highlightPlayable = $('highlightPlayableTop') || $('highlightPlayable');
  if (highlightPlayable) highlightPlayable.addEventListener('change', function () {
    var board = $('board');
    if (!board) return;
    if (this.checked) {
      board.classList.add('board--highlight-playable');
    } else {
      board.classList.remove('board--highlight-playable');
    }
    localStorage.setItem('highlightPlayable', this.checked);
  });
  
  var hardModeToggle = $('hardModeToggle');
  if (hardModeToggle) {
    hardModeToggle.addEventListener('change', function() {
      localStorage.setItem('hardMode', this.checked);
      if (this.checked) {
        clearAutoHint();
        showToast('Hard Mode Enabled: No hints!', 'info');
      } else {
        startAutoHintTimer();
      }
    });
    var storedHardMode = localStorage.getItem('hardMode');
    if (storedHardMode !== null) {
      hardModeToggle.checked = storedHardMode === 'true';
    }
  }
  
  var ambienceToggle = $('ambienceToggle');
  if (ambienceToggle) {
      ambienceToggle.addEventListener('change', function() {
          if (this.checked && !soundMuted) {
              toggleAmbience(true);
          } else {
              toggleAmbience(false);
          }
      });
  }

  var layoutSelectTop = $('layoutSelectTop') || $('layoutSelect');
  if (layoutSelectTop) layoutSelectTop.addEventListener('change', function () {
    newGame();
    loadLeaderboard();
    renderStatsPanel();
    updateLayoutPreview();
  });
  updateLayoutPreview();

  setupStagePanning();

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      newGame();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      centerStageView();
    } else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (game) {
        playUndo();
        game.undo();
        renderBoard();
        updateUI();
      }
    } else if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      if (game && !matchInProgress) {
        startAutoHintTimer();
        var r = game.hint();
        if (r.ok) {
          playHint();
          selectedTileId = null;
          document.querySelectorAll('.tile--selected').forEach(function (el) { el.classList.remove('tile--selected'); });
          renderBoard();
          applyHintToDom(r.tileA, r.tileB, 1200);
          updateUI();
        }
      }
    }
  });

  var boardEl = $('board');
  if (boardEl) boardEl.classList.add('board--loading');

  var storedHighlight = localStorage.getItem('highlightPlayable');
  if (storedHighlight !== null) {
    var highlightCb = $('highlightPlayableTop');
    if (highlightCb) highlightCb.checked = storedHighlight === 'true';
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }
}

(function bootstrap() {
  var landing = document.getElementById('landing');
  var usePreloader = landing && window.location.hash !== '#play';
  if (usePreloader) {
    // Defer all JS until after load so Lighthouse gets a clean trace (no NO_NAVSTART)
    window.addEventListener('load', function onLoad() {
      window.removeEventListener('load', onLoad);
      init();
    });
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})();
