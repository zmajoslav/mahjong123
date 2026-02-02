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

function getAudioCtx() {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {}
  return audioCtx;
}

function playTone(freq, duration, type) {
  if (soundMuted) return;
  var ctx = getAudioCtx();
  if (!ctx) return;
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
  playTone(523, 0.08, 'sine');
  setTimeout(function () { playTone(659, 0.12, 'sine'); }, 60);
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

var LAYOUT_PAIRS = { supereasy: 12, easy: 24, turtle: 36, pyramid: 40, hard: 52 };
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

function clearAutoHint() {
  if (autoHintTimeout) {
    clearTimeout(autoHintTimeout);
    autoHintTimeout = null;
  }
}

function startAutoHintTimer() {
  clearAutoHint();
  if (!game) return;
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

function newGame() {
  stopTimer();
  clearAutoHint();
  currentLayout = getLayout();
  game = MahjongSolitaire.createGame(currentLayout);
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
  var matched = state.won ? totalPairs : Math.floor((totalPairs * 2 - state.remaining) / 2);
  var matchEl = $('matchCount');
  if (matchEl) matchEl.textContent = matched;
  var totalEl = $('matchTotal');
  if (totalEl) totalEl.textContent = '/' + totalPairs;
  
  var progressBar = $('progressBar');
  if (progressBar) {
    var progress = (matched / totalPairs) * 100;
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
    var totalPairs = LAYOUT_PAIRS[currentLayout] || 36;
    var bestKey = 'mahjongBest_' + currentLayout;
    var best = parseInt(localStorage.getItem(bestKey) || '0', 10);
    if (state.score > best) {
      localStorage.setItem(bestKey, String(state.score));
      showToast('New personal best! 🏆', 'success');
    }
    showLevelCompleteThenModal(state);
  } else if (state.validMoves === 0 && state.remaining > 0) {
    showStuckModal();
  }
}

function renderBoard() {
  var board = $('board');
  if (!board || !game) return;
  var state = game.getState();
  board.innerHTML = '';
  var highlightCb = $('highlightPlayableTop') || $('highlightPlayable');
  if (highlightCb && highlightCb.checked) {
    board.classList.add('board--highlight-playable');
  } else {
    board.classList.remove('board--highlight-playable');
  }

  const tiles = state.tiles;
  const maxLayer = Math.max.apply(null, tiles.map(function (t) { return t.layer; })) || 0;

  var isLevel1 = currentLayout === 'supereasy';
  var tileW = isLevel1 ? 120 : 100;
  var tileH = isLevel1 ? 145 : 120;
  var layerOffsetX = 12;
  var layerOffsetY = -10;

  var fullBoardCount = (LAYOUT_PAIRS[currentLayout] || 36) * 2;
  var isNewGame = tiles.length === fullBoardCount;
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
    if (isNewGame) el.style.animationDelay = Math.min(i * 5, 350) + 'ms';
    el.style.left = (t.col * tileW + t.layer * layerOffsetX) + 'px';
    el.style.top = (t.row * tileH + t.layer * layerOffsetY) + 'px';
    el.style.zIndex = t.layer * 100 + t.row * 10 + t.col;
    var sym = tileSymbol(t.kind);
    var cls = sym !== t.kind ? 'tile__kind' : 'tile__kind tile__kind--fallback';
    var suitCls = tileSuitClass(t.kind);
    if (suitCls) cls += ' ' + suitCls;
    el.innerHTML = '<span class="' + cls + '" title="' + escapeHtml(t.kind) + '">' + escapeHtml(sym) + '</span>';
    el.addEventListener('click', onTileClick);
    board.appendChild(el);
  });

  var maxCol = Math.max.apply(null, tiles.map(function (x) { return x.col; })) || 12;
  var maxRow = Math.max.apply(null, tiles.map(function (x) { return x.row; })) || 8;
  var w = (maxCol + 1) * tileW + (maxLayer + 1) * Math.abs(layerOffsetX);
  var h = (maxRow + 1) * tileH + 20;
  board.style.width = w + 'px';
  board.style.height = h + 'px';

  // Auto-scale board to fit viewport
  requestAnimationFrame(function () {
    scaleToFit();
  });
}

function scaleToFit() {
  var stage = $('stage');
  var inner = stage ? stage.querySelector('.stage__inner') : null;
  var board = $('board');
  if (!stage || !inner || !board) return;

  var stageW = stage.clientWidth;
  var stageH = stage.clientHeight;
  var boardW = board.offsetWidth;
  var boardH = board.offsetHeight;

  if (boardW === 0 || boardH === 0) return;

  var padding = 40;
  var scaleX = (stageW - padding) / boardW;
  var scaleY = (stageH - padding) / boardH;
  var scale = Math.min(scaleX, scaleY, 1);

  inner.style.transform = 'scale(' + scale + ')';
}

function centerStageView() {
  scaleToFit();
}

function setupStagePanning() {
  var stage = $('stage');
  if (!stage) return;

  // Re-scale on window resize
  window.addEventListener('resize', function () {
    scaleToFit();
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
  if (!game) return;
  const el = ev.target.closest('.tile');
  if (!el || !el.dataset.id) return;
  const id = el.dataset.id;
  const state = game.getState();
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
    playMatch();
    startAutoHintTimer();
    var prevId = selectedTileId;
    var a = $('board').querySelector('[data-id="' + prevId + '"]');
    var b = $('board').querySelector('[data-id="' + id + '"]');
    selectedTileId = null;
    document.querySelectorAll('.tile--selected').forEach(function (e) { e.classList.remove('tile--selected'); });
    a?.classList.add('tile--matched');
    b?.classList.add('tile--matched');
    showMatchPopup(a, b, result.score, result.combo);
    var stateAfter = game.getState();
    var totalPairs = LAYOUT_PAIRS[currentLayout] || 36;
    var remaining = stateAfter.won ? 0 : Math.floor(stateAfter.remaining / 2);
    announce(stateAfter.won ? 'All tiles cleared! You won!' : 'Matched pair. ' + remaining + ' pairs remaining.');
    setTimeout(function () {
      renderBoard();
      updateUI();
    }, 120);
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
  overlay.innerHTML = '<div class="level-complete__inner"><span class="level-complete__icon">🏆</span><p class="level-complete__text">Level complete!</p></div>';
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
  var token = getAccessToken();
  var canSubmit = !!token;
  var bodyHtml = '<div class="win-summary">';
  bodyHtml += '<p class="win-summary__score">🌟 Score: <strong>' + state.score + '</strong></p>';
  bodyHtml += '<p class="win-summary__time">⏱ Time: <strong>' + formatTime(state.elapsed) + '</strong></p>';
  bodyHtml += '<p class="win-summary__cheer">You cleared all the tiles! You\'re a star! ⭐</p>';
  if (canSubmit) {
    bodyHtml += '<button class="btn btn--primary" id="submitScoreBtn">Save score to leaderboard ⭐</button>';
  } else {
    bodyHtml += '<p class="muted">Register to save your score and appear on the leaderboard.</p>';
  }
  bodyHtml += '<button class="btn btn--ghost" id="newGameFromWin">Play again! 🎮</button>';
  bodyHtml += '<div class="win-share">';
  bodyHtml += '<p class="win-share__label">Share your score:</p>';
  bodyHtml += '<div class="win-share__buttons">';
  bodyHtml += '<button class="btn btn--facebook" id="shareFacebookBtn"><span class="btn__icon">f</span> Facebook</button>';
  bodyHtml += '<button class="btn btn--twitter" id="shareTwitterBtn"><span class="btn__icon">𝕏</span> Twitter</button>';
  bodyHtml += '</div>';
  bodyHtml += '</div>';
  bodyHtml += '</div>';

  $('modalTitle').innerHTML = '<span class="modal__title-icon">🏆</span> Amazing! You did it! 🎉🌟';
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

  $('submitScoreBtn')?.addEventListener('click', function () {
    submitScore(state, function () {
      showToast('Score saved!', 'success');
      closeModal();
      loadLeaderboard();
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

function submitScore(state, onSuccess) {
  apiRequest('/api/scores', {
    method: 'POST',
    body: {
      layoutName: currentLayout,
      score: state.score,
      elapsedSeconds: state.elapsed,
    },
  }).then(function () {
    if (onSuccess) onSuccess();
  }).catch(function (err) {
    showToast('Could not save score: ' + err.message, 'error');
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
  announce('No moves left. Shuffle or start a new game.');
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
      closeModal();
      startTimer();
      startAutoHintTimer();
      renderBoard();
      updateUI();
      showToast('Tiles shuffled! 🔀', 'info');
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
  popup.className = 'match-popup';
  popup.innerHTML = '<div class="match-popup__row"><span class="match-popup__score">+' + score + '</span>' + (combo > 1 ? '<span class="match-popup__combo">x' + combo + '</span>' : '') + '</div><span class="match-popup__fun">' + getMatchMessage() + '</span>';
  popup.style.left = (midX - rect.left) + 'px';
  popup.style.top = (midY - rect.top) + 'px';
  board.style.position = 'relative';
  board.appendChild(popup);
  requestAnimationFrame(function () { popup.classList.add('match-popup--visible'); });
  setTimeout(function () {
    popup.classList.remove('match-popup--visible');
    setTimeout(function () { popup.remove(); }, 300);
  }, 1000);
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
      el.innerHTML = '<table class="leaderboard__table"><thead><tr><th>#</th><th>User</th><th>Score</th><th>Time</th></tr></thead><tbody>' +
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

function startGame() {
  newGame();
  var boardEl = $('board');
  if (boardEl) boardEl.classList.remove('board--loading');
  var loadingOverlay = $('loadingOverlay');
  if (loadingOverlay) {
    setTimeout(function () {
      loadingOverlay.classList.add('hidden');
      showToast('Let\'s play! Have fun! 🎮', 'success');
      if (localStorage.getItem('mahjongTutorialSeen') !== 'true') {
        showTutorialOverlay();
      }
    }, 300);
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
  var sel = $('themeSelect');
  if (sel) sel.value = v;
}

function init() {
  applyTheme();

  var themeSelect = $('themeSelect');
  if (themeSelect) {
    themeSelect.addEventListener('change', function () {
      var v = themeSelect.value || 'dark';
      localStorage.setItem('mahjongTheme', v);
      applyTheme(v);
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
    } else {
      landingPlayBtn.addEventListener('click', function () {
        trackEvent('play_clicked');
        landing.classList.add('landing--hidden');
        gameWrap.classList.add('game-wrap--visible');
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        setTimeout(function () {
          landing.style.display = 'none';
          startGame();
        }, 300);
      });
    }
  } else {
    if (gameWrap) gameWrap.classList.add('game-wrap--visible');
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    setTimeout(startGame, 80);
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
    if (!game) return;
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
    if (!game) return;
    var r = game.shuffle();
    if (r.ok) {
      startAutoHintTimer();
      renderBoard();
      updateUI();
    }
  }
  if (shuffleBtn) shuffleBtn.addEventListener('click', doShuffle);
  if (shuffleBtnNav) shuffleBtnNav.addEventListener('click', doShuffle);

  var hintBtn = $('hintBtn');
  var hintBtnNav = $('hintBtnNav');
  function doHint(e) {
    if (e) e.preventDefault();
    if (!game) return;
    startAutoHintTimer();
    var r = game.hint();
    if (r.ok) {
      playHint();
      selectedTileId = null;
      document.querySelectorAll('.tile--selected').forEach(function (el) { el.classList.remove('tile--selected'); });
      var boardEl = $('board');
      var a = boardEl ? boardEl.querySelector('[data-id="' + r.tileA + '"]') : null;
      var b = boardEl ? boardEl.querySelector('[data-id="' + r.tileB + '"]') : null;
      if (a) a.classList.add('tile--hint');
      if (b) b.classList.add('tile--hint');
      setTimeout(function () {
        if (a) a.classList.remove('tile--hint');
        if (b) b.classList.remove('tile--hint');
      }, 1200);
      updateUI();
    }
    return false;
  }
  if (hintBtn) hintBtn.addEventListener('click', doHint);
  if (hintBtnNav) hintBtnNav.addEventListener('click', doHint);

  var registerForm = $('registerForm');
  if (registerForm) registerForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(e.target).entries());
    apiRequest('/api/auth/register', { method: 'POST', body: data })
      .then(function (res) {
        setAccessToken(res.token);
        var authEl = $('authStatus');
        if (authEl) authEl.textContent = 'Registered: ' + res.user.username;
        showToast('Welcome, ' + res.user.username + '!', 'success');
      })
      .catch(function (err) {
        var authEl = $('authStatus');
        if (authEl) authEl.textContent = 'Register failed';
        showToast('Register failed: ' + err.message, 'error');
      });
  });

  var loginForm = $('loginForm');
  if (loginForm) loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(e.target).entries());
    apiRequest('/api/auth/login', { method: 'POST', body: data })
      .then(function (res) {
        setAccessToken(res.token);
        var authEl = $('authStatus');
        if (authEl) authEl.textContent = 'Logged in: ' + res.user.username;
        showToast('Welcome back, ' + res.user.username + '!', 'success');
      })
      .catch(function (err) {
        var authEl = $('authStatus');
        if (authEl) authEl.textContent = 'Login failed';
        showToast('Login failed: ' + err.message, 'error');
      });
  });

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

  var layoutSelectTop = $('layoutSelectTop') || $('layoutSelect');
  if (layoutSelectTop) layoutSelectTop.addEventListener('change', function () {
    newGame();
    loadLeaderboard();
  });

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
      if (game) {
        startAutoHintTimer();
        var r = game.hint();
        if (r.ok) {
          playHint();
          selectedTileId = null;
          document.querySelectorAll('.tile--selected').forEach(function (el) { el.classList.remove('tile--selected'); });
          var boardEl = $('board');
          var a = boardEl ? boardEl.querySelector('[data-id="' + r.tileA + '"]') : null;
          var b = boardEl ? boardEl.querySelector('[data-id="' + r.tileB + '"]') : null;
          if (a) a.classList.add('tile--hint');
          if (b) b.classList.add('tile--hint');
          setTimeout(function () {
            if (a) a.classList.remove('tile--hint');
            if (b) b.classList.remove('tile--hint');
          }, 1200);
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
