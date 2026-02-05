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
var reverbNode = null;

function getAudioCtx() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
  return audioCtx;
}

function getReverb() {
    var ctx = getAudioCtx();
    if (!ctx) return null;
    if (reverbNode) return reverbNode;
    
    try {
        reverbNode = ctx.createConvolver();
        var length = ctx.sampleRate * 2.5;
        var buffer = ctx.createBuffer(2, length, ctx.sampleRate);
        for (var channel = 0; channel < 2; channel++) {
            var data = buffer.getChannelData(channel);
            for (var i = 0; i < length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.5);
            }
        }
        reverbNode.buffer = buffer;
        
        var reverbGain = ctx.createGain();
        reverbGain.gain.value = 0.25;
        reverbNode.connect(reverbGain);
        reverbGain.connect(ctx.destination);
    } catch(e) {
        reverbNode = null;
    }
    return reverbNode;
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

                // Start random Zen events (soft bells)
                startZenEvents();
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
            stopZenEvents();
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

var zenEventTimer = null;
function startZenEvents() {
    if (zenEventTimer) return;
    function nextEvent() {
        if (soundMuted || !ambienceNode) return;
        
        // C Major Pentatonic notes for bells
        var notes = [261.63, 329.63, 392.00, 523.25, 659.25];
        var freq = notes[Math.floor(Math.random() * notes.length)];
        
        // Play a very soft, long ethereal note
        playTone(freq, 5.0, 'sine', 0.012);
        
        zenEventTimer = setTimeout(nextEvent, 8000 + Math.random() * 15000);
    }
    zenEventTimer = setTimeout(nextEvent, 3000);
}

function stopZenEvents() {
    if (zenEventTimer) {
        clearTimeout(zenEventTimer);
        zenEventTimer = null;
    }
}

function playTone(freq, duration, type, volume) {
  if (soundMuted) return;
  var ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  
  try {
    // Use two oscillators for a richer, softer "chorus" effect
    var osc1 = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();
    
    osc1.type = 'sine';
    osc2.type = 'sine';
    
    // Slight detune for a softer, wider sound
    osc1.frequency.setValueAtTime(freq, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq * 1.002, ctx.currentTime);
    
    filter.type = 'lowpass';
    // Much lower filter cutoff for a "warm" sound
    filter.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, ctx.currentTime + duration);
    filter.Q.value = 0.5;

    // Softer attack (fade in) to remove any "pluck"
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime((volume || 0.1) * 0.8, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    
    // Send more to reverb, less to direct output for a "distant" feel
    var dryGain = ctx.createGain();
    dryGain.gain.value = 0.4;
    gain.connect(dryGain);
    dryGain.connect(ctx.destination);
    
    var reverb = getReverb();
    if (reverb) {
        var wetGain = ctx.createGain();
        wetGain.gain.value = 0.8;
        gain.connect(wetGain);
        wetGain.connect(reverb);
    }

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + duration + 0.2);
    osc2.stop(ctx.currentTime + duration + 0.2);
  } catch (e) {}
}

function playWoodClick() {
    if (soundMuted) return;
    var ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    
    try {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine'; // Even softer than triangle
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
}

function playMatch() {
  // Ultra-peaceful low-frequency pentatonic notes
  var notes = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4, D4, E4, G4, A4 (one octave lower)
  var n1 = notes[Math.floor(Math.random() * notes.length)];
  
  // Single, long, ethereal note
  playTone(n1, 2.5, 'sine', 0.06);
  
  // Occasional high harmonic
  if (Math.random() > 0.5) {
      setTimeout(function() {
          playTone(n1 * 2, 3.0, 'sine', 0.02);
      }, 200);
  }
}

function playUndo() {
  playTone(196.00, 1.5, 'sine', 0.04); // G3
}

function playWin() {
  var notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
  notes.forEach(function(f, i) {
    setTimeout(function() {
      playTone(f, 4.0, 'sine', 0.05);
    }, i * 400);
  });
}

function playHint() {
  playTone(440.00, 2.0, 'sine', 0.03); // A4
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
      return '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*1.15)+'" fill="'+fill+'" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>'; 
    };
    if (val === '1') content = dot(50, 60, 38, colors[2]) + dot(50, 60, 16, '#fbbf24');
    else if (val === '2') content = dot(50, 32, 20, colors[0]) + dot(50, 88, 20, colors[1]);
    else if (val === '3') content = dot(25, 28, 17, colors[0]) + dot(50, 60, 17, colors[2]) + dot(75, 92, 17, colors[1]);
    else if (val === '4') content = dot(28, 32, 17, colors[0]) + dot(72, 32, 17, colors[1]) + dot(28, 88, 17, colors[1]) + dot(72, 88, 17, colors[0]);
    else if (val === '5') content = dot(25, 28, 16, colors[0]) + dot(75, 28, 16, colors[1]) + dot(50, 60, 16, colors[2]) + dot(25, 92, 16, colors[1]) + dot(75, 92, 16, colors[0]);
    else if (val === '6') content = dot(28, 28, 15, colors[0]) + dot(72, 28, 15, colors[0]) + dot(28, 60, 15, colors[2]) + dot(72, 60, 15, colors[2]) + dot(28, 92, 15, colors[2]) + dot(72, 92, 15, colors[2]);
    else if (val === '7') content = dot(20, 22, 12, colors[0]) + dot(50, 42, 12, colors[0]) + dot(80, 62, 12, colors[0]) + dot(30, 82, 12, colors[2]) + dot(70, 82, 12, colors[2]) + dot(30, 102, 12, colors[2]) + dot(70, 102, 12, colors[2]);
    else if (val === '8') content = dot(30, 18, 11, colors[2]) + dot(70, 18, 11, colors[2]) + dot(30, 43, 11, colors[2]) + dot(70, 43, 11, colors[2]) + dot(30, 68, 11, colors[2]) + dot(70, 68, 11, colors[2]) + dot(30, 93, 11, colors[2]) + dot(70, 93, 11, colors[2]);
    else if (val === '9') content = dot(20, 22, 11, colors[0]) + dot(50, 22, 11, colors[0]) + dot(80, 22, 11, colors[0]) + dot(20, 60, 11, colors[2]) + dot(50, 60, 11, colors[2]) + dot(80, 60, 11, colors[2]) + dot(20, 98, 11, colors[1]) + dot(50, 98, 11, colors[1]) + dot(80, 98, 11, colors[1]);
  } else if (suit === 'B') { // Bamboos
    var colors = ['#059669', '#dc2626', '#1d4ed8'];
    var stick = function(x, y, w, h, fill) { 
      return '<rect x="'+x+'" y="'+y+'" width="'+(w*1.1)+'" height="'+(h*1.1)+'" rx="4" fill="'+fill+'" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>'; 
    };
    if (val === '1') content = '<path d="M50 15 L85 95 L15 95 Z" fill="'+colors[0]+'" stroke="black" stroke-width="1"/><circle cx="50" cy="42" r="12" fill="'+colors[1]+'"/>'; // Simplified bird
    else if (val === '2') content = stick(44, 18, 12, 38, colors[0]) + stick(44, 64, 12, 38, colors[1]);
    else if (val === '3') content = stick(44, 18, 12, 38, colors[1]) + stick(22, 64, 12, 38, colors[0]) + stick(66, 64, 12, 38, colors[0]);
    else if (val === '4') content = stick(22, 18, 12, 38, colors[0]) + stick(66, 18, 12, 38, colors[1]) + stick(22, 64, 12, 38, colors[1]) + stick(66, 64, 12, 38, colors[0]);
    else if (val === '5') content = stick(18, 18, 12, 38, colors[0]) + stick(70, 18, 12, 38, colors[1]) + stick(44, 41, 12, 38, colors[2]) + stick(18, 64, 12, 38, colors[1]) + stick(70, 64, 12, 38, colors[0]);
    else if (val === '6') content = stick(18, 18, 12, 38, colors[0]) + stick(44, 18, 12, 38, colors[0]) + stick(70, 18, 12, 38, colors[1]) + stick(18, 64, 12, 38, colors[1]) + stick(44, 64, 12, 38, colors[1]) + stick(70, 64, 12, 38, colors[1]);
    else if (val === '7') content = stick(44, 12, 12, 32, colors[1]) + stick(18, 48, 12, 32, colors[0]) + stick(44, 48, 12, 32, colors[0]) + stick(70, 48, 12, 32, colors[0]) + stick(18, 84, 12, 32, colors[0]) + stick(44, 84, 12, 32, colors[0]) + stick(70, 84, 12, 32, colors[0]);
    else if (val === '8') content = stick(22, 12, 12, 28, colors[0]) + stick(44, 12, 12, 28, colors[1]) + stick(66, 12, 12, 28, colors[0]) + stick(33, 44, 12, 28, colors[2]) + stick(55, 44, 12, 28, colors[2]) + stick(22, 76, 12, 28, colors[1]) + stick(44, 76, 12, 28, colors[0]) + stick(66, 76, 12, 28, colors[1]);
    else if (val === '9') content = stick(18, 12, 12, 28, colors[1]) + stick(44, 12, 12, 28, colors[0]) + stick(70, 12, 12, 28, colors[2]) + stick(18, 44, 12, 28, colors[1]) + stick(44, 44, 12, 28, colors[0]) + stick(70, 44, 12, 28, colors[2]) + stick(18, 76, 12, 28, colors[1]) + stick(44, 76, 12, 28, colors[0]) + stick(70, 76, 12, 28, colors[2]);
  } else   if (suit === 'C') { // Characters
    content = '<text x="50" y="50" font-size="52" text-anchor="middle" fill="#dc2626" font-weight="bold">'+val+'</text><text x="50" y="105" font-size="48" text-anchor="middle" fill="#1e293b" font-weight="bold">萬</text>';
  } else if (kind === 'E') content = '<text x="50" y="80" font-size="75" text-anchor="middle" fill="#1e293b" font-weight="bold">東</text>';
  else if (kind === 'S') content = '<text x="50" y="80" font-size="75" text-anchor="middle" fill="#1e293b" font-weight="bold">南</text>';
  else if (kind === 'W') content = '<text x="50" y="80" font-size="75" text-anchor="middle" fill="#1e293b" font-weight="bold">西</text>';
  else if (kind === 'N') content = '<text x="50" y="80" font-size="75" text-anchor="middle" fill="#1e293b" font-weight="bold">北</text>';
  else if (kind === 'RD') content = '<text x="50" y="80" font-size="75" text-anchor="middle" fill="#dc2626" font-weight="bold">中</text>';
  else if (kind === 'GD') content = '<text x="50" y="80" font-size="75" text-anchor="middle" fill="#059669" font-weight="bold">發</text>';
  else if (kind === 'WD') content = '<rect x="15" y="20" width="70" height="80" fill="none" stroke="#1d4ed8" stroke-width="10" rx="4"/>';
  else if (suit === 'F') content = '<text x="50" y="75" font-size="65" text-anchor="middle" fill="#c026d3">🌸</text><text x="50" y="110" font-size="30" text-anchor="middle" fill="#c026d3">'+val+'</text>';
  else if (suit === 'S' && val.length === 1) content = '<text x="50" y="75" font-size="65" text-anchor="middle" fill="#0d9488">🍂</text><text x="50" y="110" font-size="30" text-anchor="middle" fill="#0d9488">'+val+'</text>';

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
  
  let json;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { error: { message: text || 'Invalid JSON response from server' } };
  }

  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || 'HTTP ' + res.status);
  }
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
  
  var svg = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">';
  var color = 'var(--accent2)';
  
  function drawRect(x, y, w, h, op) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="2" fill="' + color + '" opacity="' + op + '" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>';
  }

  if (layout === 'supereasy') {
    svg += drawRect(30, 30, 40, 40, 0.3);
    svg += drawRect(35, 35, 30, 30, 0.6);
    svg += drawRect(40, 40, 20, 20, 0.9);
  } else if (layout === 'easy') {
    svg += drawRect(20, 25, 60, 50, 0.3);
    svg += drawRect(30, 35, 40, 30, 0.6);
    svg += drawRect(40, 42, 20, 16, 0.9);
  } else if (layout === 'turtle') {
    svg += drawRect(20, 30, 60, 40, 0.2);
    svg += drawRect(25, 25, 15, 15, 0.4);
    svg += drawRect(60, 25, 15, 15, 0.4);
    svg += drawRect(25, 60, 15, 15, 0.4);
    svg += drawRect(60, 60, 15, 15, 0.4);
    svg += drawRect(35, 35, 30, 30, 0.6);
    svg += drawRect(42, 42, 16, 16, 0.9);
  } else if (layout === 'pyramid') {
    svg += drawRect(15, 15, 70, 70, 0.2);
    svg += drawRect(25, 25, 50, 50, 0.4);
    svg += drawRect(35, 35, 30, 30, 0.7);
    svg += drawRect(45, 45, 10, 10, 1.0);
  } else if (layout === 'hard') {
    svg += drawRect(10, 10, 80, 80, 0.2);
    svg += drawRect(20, 20, 60, 60, 0.4);
    svg += drawRect(30, 30, 40, 40, 0.6);
    svg += drawRect(40, 40, 20, 20, 0.9);
  } else if (layout === 'fort') {
    svg += drawRect(15, 15, 25, 25, 0.5);
    svg += drawRect(60, 15, 25, 25, 0.5);
    svg += drawRect(15, 60, 25, 25, 0.5);
    svg += drawRect(60, 60, 25, 25, 0.5);
    svg += drawRect(30, 30, 40, 40, 0.3);
  } else if (layout === 'caterpillar') {
    svg += drawRect(10, 40, 80, 20, 0.3);
    svg += drawRect(20, 35, 15, 30, 0.6);
    svg += drawRect(45, 35, 15, 30, 0.6);
    svg += drawRect(70, 35, 15, 30, 0.6);
  } else {
    svg += drawRect(20, 20, 60, 60, 0.5);
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
  { id: 'zen_master', name: 'Zen Master', desc: 'Win without using any hints', icon: '🧘' },
  { id: 'hard_core', name: 'Hard Core', desc: 'Win a game in Hard Mode', icon: '💀' },
  { id: 'night_owl', name: 'Night Owl', desc: 'Win a game after midnight', icon: '🦉' },
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

var hintUsedInGame = false;

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

  if (!hintUsedInGame) unlockAchievement('zen_master');
  
  var hardMode = $('hardModeToggle') && $('hardModeToggle').checked;
  if (hardMode) unlockAchievement('hard_core');

  var hour = new Date().getHours();
  if (hour >= 0 && hour < 5) unlockAchievement('night_owl');
  
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

function newGame(forceRandom) {
  hintUsedInGame = false;
  if (pendingMatchTimeoutId != null) {
    clearTimeout(pendingMatchTimeoutId);
    pendingMatchTimeoutId = null;
  }
  matchInProgress = false;
  stuckModalShownForGame = false;
  winHandledForGame = false;
  stopTimer();
  clearAutoHint();
  
  var layoutSelector = $('layoutSelectTop') || $('layoutSelect');
  currentLayout = getLayout();
  var seed = null;
  
  if (currentLayout === 'daily' && !forceRandom) {
    currentLayout = getDailyChallengeLayout();
    seed = getDailyChallengeSeed();
  } else if (currentLayout === 'daily' && forceRandom) {
    currentLayout = getDailyChallengeLayout();
    seed = null; // Random
    if (layoutSelector) {
      layoutSelector.value = currentLayout;
      updateLayoutPreview();
    }
  }
  
  game = MahjongSolitaire.createGame(currentLayout, seed);
  selectedTileId = null;
  lastScore = 0;
  
  // Clear board to ensure 'enter' animation plays for new game
  var board = $('board');
  if (board) board.innerHTML = '';
  
  startTimer();
  startAutoHintTimer();
  startComboLoop();
  renderBoard();
  updateUI();
  requestAnimationFrame(centerStageView);
}

var comboLoopId = null;
function startComboLoop() {
  if (comboLoopId) cancelAnimationFrame(comboLoopId);
  
  function loop() {
    if (!game) return;
    var state = game.getState();
    var comboBar = $('comboBar');
    
    if (comboBar) {
      if (state.combo > 0) {
        var now = Date.now();
        // Calculate exact progress based on state (which is snapshot)?? 
        // No, game.getState() returns snapshot. We need live time.
        // We can't access internal lastMatchTime. 
        // But state.comboTimeLeft is calculated at the moment of getState call.
        // This loop runs 60fps. Calling getState() 60fps is cheap (it just filters array).
        // Let's rely on updateUI for the "state" part, but here we can't easily animate smoothly 
        // without knowing the "start time" of the combo.
        // Solitaire engine doesn't expose match time directly.
        // BUT, we can just use the state.comboTimeLeft from the frequent getState() call.
        // It should be smooth enough if getState() uses Date.now().
        
        var pct = (state.comboTimeLeft / state.comboTotalTime) * 100;
        comboBar.style.width = pct + '%';
        
        if (!comboBar.classList.contains('combo-bar--active')) {
             comboBar.classList.add('combo-bar--active');
        }
      } else {
        comboBar.style.width = '0%';
        comboBar.classList.remove('combo-bar--active');
      }
    }
    comboLoopId = requestAnimationFrame(loop);
  }
  loop();
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
  
  // Update Combo Text (Bar handled in loop)
  var comboEl = $('comboCount');
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
    if (comboLoopId) cancelAnimationFrame(comboLoopId);
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
      
      // Add visual feedback that the game is stuck
      var board = $('board');
      if (board) {
        board.classList.add('board--shake');
        setTimeout(function() { board.classList.remove('board--shake'); }, 500);
      }
      
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
  // Use a slight delay to ensure renderBoard has finished if called just before
  setTimeout(function () {
    if (!game) return;
    var state = game.getState();
    var tileAState = state.tiles.find(function (t) { return t.id === tileA; });
    var tileBState = state.tiles.find(function (t) { return t.id === tileB; });
    if (!tileAState || !tileBState) return;
    
    var a = boardEl.querySelector('[data-id="' + tileA + '"]');
    var b = boardEl.querySelector('[data-id="' + tileB + '"]');
    if (a) a.classList.add('tile--hint');
    if (b) b.classList.add('tile--hint');
    
    setTimeout(function () {
      if (a) a.classList.remove('tile--hint');
      if (b) b.classList.remove('tile--hint');
    }, durationMs);
  }, 50);
}

function getTileDimensions(isLevel1) {
  var w = window.innerWidth;
  if (w <= 400) return { w: isLevel1 ? 64 : 54, h: isLevel1 ? 78 : 64 };
  if (w <= 600) return { w: isLevel1 ? 76 : 64, h: isLevel1 ? 92 : 78 };
  if (w <= 900) return { w: isLevel1 ? 96 : 84, h: isLevel1 ? 116 : 100 };
  return { w: isLevel1 ? 120 : 100, h: isLevel1 ? 145 : 120 };
}

function renderBoardImpl(board) {
  if (!game) return;
  var state = game.getState();
  var tiles = state.tiles;
  if (!tiles) return;

  var highlightCb = $('highlightPlayableTop') || $('highlightPlayable');
  var isHighlight = highlightCb && highlightCb.checked;
  if (isHighlight) {
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

  // Calculate board bounds based on the FULL layout to prevent zooming/jitter as tiles are removed
  var fullLayout = MahjongSolitaire.getLayout(currentLayout);
  var minTop = 9999, minLeft = 9999, maxRight = -9999, maxBottom = -9999;
  
  if (fullLayout && fullLayout.length > 0) {
      fullLayout.forEach(function(p) {
          // p is [layer, row, col]
          var top = p[1] * tileH + p[0] * layerOffsetY;
          var left = p[2] * tileW + p[0] * layerOffsetX;
          if (top < minTop) minTop = top;
          if (left < minLeft) minLeft = left;
          if (left + tileW > maxRight) maxRight = left + tileW;
          if (top + tileH > maxBottom) maxBottom = top + tileH;
      });
  } else {
      // Fallback to current tiles if layout fetch fails
      if (tiles.length > 0) {
        tiles.forEach(function (t) {
            var top = t.row * tileH + t.layer * layerOffsetY;
            var left = t.col * tileW + t.layer * layerOffsetX;
            if (top < minTop) minTop = top;
            if (left < minLeft) minLeft = left;
            if (left + tileW > maxRight) maxRight = left + tileW;
            if (top + tileH > maxBottom) maxBottom = top + tileH;
        });
      } else {
          minTop = 0; minLeft = 0; maxRight = 0; maxBottom = 0;
      }
  }
  
  var offsetY = minTop < 0 ? -minTop : 0;
  var offsetX = minLeft < 0 ? -minLeft : 0;

  // DOM Diffing to prevent blinking
  var existingTiles = {};
  var children = Array.from(board.children);
  children.forEach(function(el) {
      if (el.classList.contains('tile') && el.dataset.id) {
          existingTiles[el.dataset.id] = el;
      }
  });

  var activeIds = new Set();
  var fullBoardCount = (LAYOUT_PAIRS[currentLayout] || 36) * 2;
  var isNewGame = tiles.length === fullBoardCount && children.length === 0;

  tiles.forEach(function (t, i) {
    activeIds.add(t.id);
    var el = existingTiles[t.id];
    var isNew = false;
    
    if (!el) {
        el = document.createElement('div');
        el.dataset.id = t.id;
        el.addEventListener('click', onTileClick);
        board.appendChild(el);
        isNew = true;
    }

    var suitCls = tileSuitClass(t.kind);
    var isTopLayer = t.layer === maxLayer;
    var layerClass = ' tile--layer-' + t.layer;
    
    // Efficient class updates
    var cls = 'tile';
    if (t.free) cls += ' tile--free';
    else cls += ' tile--blocked';
    
    if (isNewGame) cls += ' tile--enter';
    if (suitCls) cls += ' ' + suitCls + '-tile';
    if (isLevel1) cls += ' tile--level1';
    if (isTopLayer) cls += ' tile--top-layer';
    cls += layerClass;
    
    if (selectedTileId === t.id) cls += ' tile--selected';
    
    // Preserve hint class if it exists (transient UI state)
    if (el.classList.contains('tile--hint')) cls += ' tile--hint';
    
    if (el.className !== cls) el.className = cls;

    el.dataset.layer = t.layer;
    
    var left = (t.col * tileW + t.layer * layerOffsetX + offsetX) + 'px';
    var top = (t.row * tileH + t.layer * layerOffsetY + offsetY) + 'px';
    
    if (el.style.left !== left) el.style.left = left;
    if (el.style.top !== top) el.style.top = top;
    
    if (el.style.width !== tileW + 'px') el.style.width = tileW + 'px';
    if (el.style.height !== tileH + 'px') el.style.height = tileH + 'px';
    
    if (isNewGame) el.style.animationDelay = Math.min(i * 4, 280) + 'ms';
    else el.style.animationDelay = '';

    var layerStep = 10000;
    var rowStep = 100;
    var colStep = 1;
    var freeBoost = 50;
    var baseZ = (t.layer * layerStep) + (t.row * rowStep) + (t.col * colStep);
    var z = baseZ + (t.free ? freeBoost : 0);
    if (el.style.zIndex != z) el.style.zIndex = z;

    // Only update content if kind changed (e.g. shuffle)
    if (el.dataset.kind !== t.kind) {
        el.dataset.kind = t.kind;
        var sym = tileSymbol(t.kind);
        var innerCls = sym !== t.kind ? 'tile__kind' : 'tile__kind tile__kind--fallback';
        if (suitCls) innerCls += ' ' + suitCls;
        
        var svgContent = getTileSvg(t.kind);
        if (svgContent) {
          el.innerHTML = '<div class="tile__svg-wrap">' + svgContent + '</div>';
        } else {
          el.innerHTML = '<span class="' + innerCls + '" title="' + escapeHtml(t.kind) + '">' + escapeHtml(sym) + '</span>';
        }
    }
  });

  // Remove tiles that are no longer in state
  // But wait! If we just matched them, we want them to animate out.
  // The 'tile--matched' class is added in 'onTileClick' -> 'game.match'.
  // Those elements are still in DOM but not in state.tiles.
  // We should only remove them if they don't have 'tile--matched' or if they've been there too long?
  // Actually, 'tile--matched' animation takes 0.22s.
  // If we remove them immediately here, the animation is cut short.
  // BUT: renderBoard is called 260ms AFTER match (pendingMatchTimeoutId).
  // So by the time renderBoard runs, the animation should be done.
  // HOWEVER, for 'shuffle' or 'undo', tiles might disappear/reappear differently.
  // Let's safe-remove.
  
  Object.keys(existingTiles).forEach(function(id) {
      if (!activeIds.has(id)) {
          var el = existingTiles[id];
          // If it's currently animating out, let it finish?
          // The match logic handles its own removal visual? No, it just adds class.
          // In the old code, board.innerHTML = '' nuked everything.
          // So the 'tile--matched' elements were removed by renderBoard.
          // If we want to keep that behavior:
          el.remove();
      }
  });

  var w = Math.ceil(maxRight - minLeft + 16);
  var h = Math.ceil(maxBottom - minTop + 32);
  board.style.width = w + 'px';
  board.style.height = h + 'px';

  // Only scale if dimensions changed significantly to avoid jitter
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

    var padding = window.innerWidth <= 400 ? 4 : (window.innerWidth < 600 ? 8 : 48);
    var scaleX = (stageW - padding) / boardW;
    var scaleY = (stageH - padding) / boardH;
    // Allow scaling up to 1.2x on mobile to fill screen, but keep 1.0x on desktop for sharpness
    var maxScale = window.innerWidth <= 600 ? 1.2 : 1.0;
    var scale = Math.min(scaleX, scaleY, maxScale);

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
    playWoodClick();
    document.querySelectorAll('.tile--selected').forEach(function (e) { e.classList.remove('tile--selected'); });
    el.classList.add('tile--selected');
    return;
  }

  if (selectedTileId === id) {
    selectedTileId = null;
    playWoodClick();
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
        playTone(freq, 0.6, 'sine', 0.06);
        setTimeout(function() { playTone(freq * 1.5, 0.8, 'sine', 0.03); }, 100);
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

function getRank(score, elapsed, layout) {
  var baseTime = 300; // 5 mins
  if (layout === 'supereasy') baseTime = 60;
  if (layout === 'easy') baseTime = 120;
  
  if (elapsed < baseTime * 0.5) return { label: 'S', color: '#fbbf24', desc: 'Divine Master' };
  if (elapsed < baseTime * 0.8) return { label: 'A', color: '#f87171', desc: 'Grandmaster' };
  if (elapsed < baseTime * 1.2) return { label: 'B', color: '#a78bfa', desc: 'Expert' };
  if (elapsed < baseTime * 2.0) return { label: 'C', color: '#60a5fa', desc: 'Skilled' };
  return { label: 'D', color: '#94a3b8', desc: 'Apprentice' };
}

function showWinModal(state) {
  announce('You won! Score: ' + state.score + '. Time: ' + formatTime(state.elapsed));
  trackEvent('game_won', { score: state.score, time: state.elapsed, layout: currentLayout });
  
  var hardMode = $('hardModeToggle') && $('hardModeToggle').checked;
  var finalScore = state.score;
  if (hardMode) finalScore = Math.floor(finalScore * 1.5);

  var rank = getRank(finalScore, state.elapsed, currentLayout);
  recordGameWin(currentLayout, finalScore, state.elapsed);

  var bodyHtml = '<div class="win-summary">';
  
  bodyHtml += '<div class="win-rank" style="text-align: center; margin-bottom: 20px;">';
  bodyHtml += '<div style="font-size: 4rem; font-weight: 900; color: ' + rank.color + '; text-shadow: 0 0 20px ' + rank.color + '44;">' + rank.label + '</div>';
  bodyHtml += '<div style="font-size: 1.2rem; font-weight: bold; color: ' + rank.color + '; margin-top: -5px;">' + rank.desc + '</div>';
  bodyHtml += '</div>';

  bodyHtml += '<p class="win-summary__score">🌟 Score: <strong>' + finalScore + '</strong>' + (hardMode ? ' <small style="color:var(--accent2)">(+50% Hard Mode Bonus!)</small>' : '') + '</p>';
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
  if (modalEl) modalEl.classList.add('modal--win');
  trapFocusInModal();
  
  // Denser confetti using the library
  if (typeof confetti === 'function') {
    for (var i = 0; i < 5; i++) {
      setTimeout(function() {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: [rank.color, '#ffffff', '#ff0000', '#00ff00', '#0000ff']
        });
      }, i * 300);
    }
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

    submitScore(state, name, function () {
      showToast(typeof window.t === 'function' ? window.t('toasts.scoreSaved') : 'Score saved! You\'re on the leaderboard!', 'success');
      btn.textContent = 'Saved! ✅';
      // Refresh sidebar if it's open
      var sidebar = $('sidebar');
      if (sidebar && !sidebar.classList.contains('sidebar--hidden')) {
        loadLeaderboard();
        renderStatsPanel();
      }
    }, function() {
      btn.disabled = false;
      btn.textContent = (t('ui.saveToLeaderboard') || 'Save Score') + ' 🏆';
    });
  });
  $('newGameFromWin')?.addEventListener('click', function () {
    closeModal();
    newGame(true);
  });
  $('shareFacebookBtn')?.addEventListener('click', function () {
    var text = 'I just scored ' + state.score + ' points in Mahjong Boss Solitaire in ' + formatTime(state.elapsed) + '! Can you beat my score? 🀄🏆';
    var url = window.location.origin || 'https://yoursite.com';
    var shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '&quote=' + encodeURIComponent(text);
    window.open(shareUrl, 'facebook-share', 'width=580,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
    trackEvent('share_facebook', { score: state.score });
  });
  $('shareTwitterBtn')?.addEventListener('click', function () {
    var text = 'I just scored ' + state.score + ' points in Mahjong Boss Solitaire in ' + formatTime(state.elapsed) + '! Can you beat my score? 🀄🏆';
    var url = window.location.origin || 'https://yoursite.com';
    var shareUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
    window.open(shareUrl, 'twitter-share', 'width=580,height=400,menubar=no,toolbar=no,resizable=yes,scrollbars=yes');
    trackEvent('share_twitter', { score: state.score });
  });
}

function submitScore(state, displayName, onSuccess, onFail) {
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
    if (onFail) onFail(err);
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
    newGame(true);
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

function updateZenMode() {
  var isZen = localStorage.getItem('zenMode') === 'true';
  var stats = document.querySelectorAll('.stat--timer, .stat--score, .stat--combo');
  var comboContainer = document.getElementById('comboContainer');
  
  stats.forEach(function(el) {
    if (isZen) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
    }
  });
  
  if (comboContainer) {
      comboContainer.style.display = isZen ? 'none' : '';
  }
}

function applyTheme() {
  var theme = localStorage.getItem('mahjongTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  var sel = $('themeSelect');
  if (sel) sel.value = theme;
}

function init() {
  applyTheme();

  var zenModeToggle = $('zenModeToggle');
  if (zenModeToggle) {
    zenModeToggle.checked = localStorage.getItem('zenMode') === 'true';
    zenModeToggle.addEventListener('change', function() {
      localStorage.setItem('zenMode', this.checked);
      updateZenMode();
    });
    updateZenMode();
  }

  var themeSelect = $('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', function() {
      var newTheme = this.value;
      localStorage.setItem('mahjongTheme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      showToast('Theme updated to ' + this.options[this.selectedIndex].text, 'info');
    });
  }

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
  if (newDealBtnNav) newDealBtnNav.addEventListener('click', function() { newGame(true); });
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
    hintUsedInGame = true;
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
      newGame(true);
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
    navigator.serviceWorker.register('/sw.js?v=29').catch(function () {});
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

  // Analytics disabled - no external tracking to avoid CSP errors
  // The existing trackEvent function at the top of the file handles basic event tracking
})();
