/**
 * Mahjong Solitaire engine - browser-compatible (no Node require).
 * Match pairs of identical tiles only (same kind). Flowers and Seasons match by exact type.
 */
(function (global) {
  'use strict';

  const SUIT_KINDS = [
    'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9',
    'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9',
    'E', 'S', 'W', 'N', 'RD', 'GD', 'WD',
  ];
  const FLOWERS = ['F1', 'F2', 'F3', 'F4'];
  const SEASONS = ['S1', 'S2', 'S3', 'S4'];

  function canMatch(a, b) {
    return a === b;
  }

  function posKey(layer, row, col) {
    return layer + ',' + row + ',' + col;
  }

  // Level 1: 24 tiles (12 pairs) - small 3-layer pyramid
  function getSuperEasyLayout() {
    const positions = [];
    // Layer 0: 4x4 base (16 tiles)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        positions.push([0, r, c]);
      }
    }
    // Layer 1: 2x3 middle (6 tiles)
    for (let r = 1; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        positions.push([1, r, c]);
      }
    }
    // Layer 2: 2 tiles on top
    positions.push([2, 1, 1], [2, 2, 1]);
    return positions;
  }

  // Level 2: 48 tiles (24 pairs) - medium 3-layer pyramid
  function getEasyLayout() {
    const positions = [];
    // Layer 0: 5x6 base (30 tiles)
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 6; c++) {
        positions.push([0, r, c]);
      }
    }
    // Layer 1: 3x4 middle (12 tiles)
    for (let r = 1; r < 4; r++) {
      for (let c = 1; c < 5; c++) {
        positions.push([1, r, c]);
      }
    }
    // Layer 2: 2x3 top (6 tiles)
    for (let r = 1; r < 3; r++) {
      for (let c = 2; c < 5; c++) {
        positions.push([2, r, c]);
      }
    }
    return positions;
  }

  // Level 3: 72 tiles (36 pairs) - classic turtle shape
  function getTurtleLayout() {
    const positions = [];
    // Layer 0: turtle shell base
    const L0 = [
      '..1111..', '.111111.', '11111111', '11111111',
      '11111111', '.111111.', '..1111..',
    ];
    for (let r = 0; r < L0.length; r++) {
      for (let c = 0; c < L0[r].length; c++) {
        if (L0[r][c] === '1') positions.push([0, r, c]);
      }
    }
    // Layer 1: 4x5 middle (20 tiles)
    for (let r = 1; r < 6; r++) {
      for (let c = 2; c < 6; c++) {
        positions.push([1, r, c]);
      }
    }
    // Layer 2: 2x3 top (6 tiles)
    for (let r = 2; r < 5; r++) {
      for (let c = 3; c < 5; c++) {
        positions.push([2, r, c]);
      }
    }
    // Layer 3: peak (2 tiles)
    positions.push([3, 3, 3], [3, 3, 4]);
    return positions;
  }

  // Level 4: 80 tiles (40 pairs) - tall pyramid
  function getPyramidLayout() {
    const positions = [];
    // Layer 0: 6x8 base (48 tiles)
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 8; c++) positions.push([0, r, c]);
    }
    // Layer 1: 4x6 (24 tiles)
    for (let r = 1; r < 5; r++) {
      for (let c = 1; c < 7; c++) positions.push([1, r, c]);
    }
    // Layer 2: 2x3 (6 tiles)
    for (let r = 2; r < 4; r++) {
      for (let c = 3; c < 6; c++) positions.push([2, r, c]);
    }
    // Layer 3: 2 tiles peak
    positions.push([3, 2, 4], [3, 3, 4]);
    return positions;
  }

  // Level 5: 104 tiles (52 pairs) - large 4-layer pyramid
  function getHardLayout() {
    const positions = [];
    // Layer 0: 6x10 base (60 tiles)
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 10; c++) positions.push([0, r, c]);
    }
    // Layer 1: 4x8 (32 tiles)
    for (let r = 1; r < 5; r++) {
      for (let c = 1; c < 9; c++) positions.push([1, r, c]);
    }
    // Layer 2: 2x4 (8 tiles)
    for (let r = 2; r < 4; r++) {
      for (let c = 3; c < 7; c++) positions.push([2, r, c]);
    }
    // Layer 3: 2x2 peak (4 tiles)
    for (let r = 2; r < 4; r++) {
      for (let c = 4; c < 6; c++) positions.push([3, r, c]);
    }
    return positions;
  }

  // Fort layout: 80 tiles (40 pairs) - fortress shape
  function getFortLayout() {
    const positions = [];
    const L0 = [
      '..111111..', '.11111111.', '1111111111', '1111111111',
      '1111111111', '1111111111', '.11111111.', '..111111..',
    ];
    for (let r = 0; r < L0.length; r++) {
      for (let c = 0; c < L0[r].length; c++) {
        if (L0[r][c] === '1') positions.push([0, r, c]);
      }
    }
    for (let r = 2; r < 6; r++) {
      for (let c = 2; c < 8; c++) {
        positions.push([1, r, c]);
      }
    }
    for (let r = 3; r < 5; r++) {
      for (let c = 3; c < 7; c++) {
        positions.push([2, r, c]);
      }
    }
    positions.push([3, 3, 4], [3, 3, 5]);
    return positions;
  }

  // Caterpillar layout: 72 tiles (36 pairs)
  function getCaterpillarLayout() {
    const positions = [];
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) positions.push([0, r, c]);
    }
    for (let r = 1; r < 5; r++) {
      for (let c = 1; c < 5; c++) positions.push([1, r, c]);
    }
    for (let r = 2; r < 5; r++) {
      for (let c = 1; c < 5; c++) positions.push([2, r, c]);
    }
    for (let r = 2; r < 5; r++) {
      for (let c = 2; c < 4; c++) positions.push([3, r, c]);
    }
    positions.push([4, 3, 2], [4, 3, 3]);
    return positions;
  }

  function getLayout(name) {
    if (name === 'supereasy') return getSuperEasyLayout();
    if (name === 'easy') return getEasyLayout();
    if (name === 'hard') return getHardLayout();
    if (name === 'pyramid') return getPyramidLayout();
    if (name === 'fort') return getFortLayout();
    if (name === 'caterpillar') return getCaterpillarLayout();
    return getTurtleLayout();
  }

  function hasTileAt(positions, removed, layer, row, col) {
    const inLayout = positions.some(function (p) {
      return p[0] === layer && p[1] === row && p[2] === col;
    });
    if (!inLayout) return false;
    return !removed.has(posKey(layer, row, col));
  }

  function isTileFree(positions, removed, layer, row, col) {
    const inLayout = positions.some(function (p) {
      return p[0] === layer && p[1] === row && p[2] === col;
    });
    if (!inLayout || removed.has(posKey(layer, row, col))) return false;
    if (hasTileAt(positions, removed, layer + 1, row, col)) return false;
    const left = hasTileAt(positions, removed, layer, row, col - 1);
    const right = hasTileAt(positions, removed, layer, row, col + 1);
    return !left || !right;
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h);
  }

  function createTileSet(positions, seed) {
    const count = positions.length;
    const pairsNeeded = count / 2;
    const rng = seed != null ? mulberry32(hashSeed(String(seed))) : Math.random;

    // Create a pool of available pairs.
    // Standard Mahjong has 4 copies of each suit/honor tile.
    // Since we match pairs, we treat 4 copies as "2 pairs".
    const availablePairs = [];
    
    // Add 2 pairs for each suit/honor
    SUIT_KINDS.forEach(function (k) {
      availablePairs.push(k, k);
    });
    // Add 1 pair for each Flower/Season
    FLOWERS.concat(SEASONS).forEach(function (k) {
      availablePairs.push(k);
    });

    // Shuffle the available pairs
    availablePairs.sort(function () { return rng() - 0.5; });

    // Select the needed number of pairs
    // If we need more than available (unlikely for < 152 tiles), we loop or error.
    // But Hard is 104 tiles (52 pairs), available is 76 pairs. Safe.
    const chosenPairs = availablePairs.slice(0, pairsNeeded);
    
    // If somehow we don't have enough (e.g. huge layout), fill with randoms
    while (chosenPairs.length < pairsNeeded) {
      chosenPairs.push(SUIT_KINDS[Math.floor(rng() * SUIT_KINDS.length)]);
    }

    const kinds = [];
    chosenPairs.forEach(function (k) {
      kinds.push(k, k);
    });
    
    // Shuffle the actual tile positions
    kinds.sort(function () { return rng() - 0.5; });

    const tiles = [];
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      tiles.push({
        id: 't' + i,
        kind: kinds[i],
        layer: p[0],
        row: p[1],
        col: p[2],
      });
    }
    return tiles;
  }

  /** Backtracking solver to check if a board is winnable. Caps steps/time to avoid long runs. */
  const SOLVER_MAX_STEPS = 150000;
  const SOLVER_MAX_MS = 150;
  function isSolvable(positions, tiles, removedSnapshot, timeLimitMs) {
    const removed = new Set();
    if (removedSnapshot && removedSnapshot.size) {
      removedSnapshot.forEach(function (key) { removed.add(key); });
    }
    let steps = 0;
    const startedAt = Date.now();
    const maxMs = typeof timeLimitMs === 'number' ? timeLimitMs : SOLVER_MAX_MS;

    function getValidMatchPairs() {
      const free = [];
      tiles.forEach(function (t) {
        if (removed.has(posKey(t.layer, t.row, t.col))) return;
        if (isTileFree(positions, removed, t.layer, t.row, t.col)) free.push(t);
      });
      const pairs = [];
      const seen = {};
      for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
          if (canMatch(free[i].kind, free[j].kind)) {
            const key = [free[i].id, free[j].id].sort().join('-');
            if (!seen[key]) {
              seen[key] = true;
              pairs.push([free[i], free[j]]);
            }
          }
        }
      }
      // Heuristic: check pairs in reverse order (likely higher layers first) to find solution faster
      pairs.reverse();
      return pairs;
    }

    function solve() {
      if (steps++ > SOLVER_MAX_STEPS) return false;
      if (Date.now() - startedAt > maxMs) return false;
      if (removed.size === tiles.length) return true;
      const pairs = getValidMatchPairs();
      for (let idx = 0; idx < pairs.length; idx++) {
        const a = pairs[idx][0];
        const b = pairs[idx][1];
        const kA = posKey(a.layer, a.row, a.col);
        const kB = posKey(b.layer, b.row, b.col);
        removed.add(kA);
        removed.add(kB);
        if (solve()) return true;
        removed.delete(kA);
        removed.delete(kB);
      }
      return false;
    }
    return solve();
  }

  const HINT_LIMIT = 20;
  const SHUFFLE_PENALTY = 5;
  const BASE_SCORE = 10;
  const SOLVABLE_MAX_ATTEMPTS = 20;
  const SOLVABLE_TOTAL_MAX_MS = 1000;
  const SHUFFLE_SOLVE_MAX_ATTEMPTS = 50;
  const SHUFFLE_SOLVE_MAX_MS = 500;
  const SHUFFLE_CACHE_LIMIT = 80;
  const SHUFFLE_CACHE_PREFIX = 'mahjongShuffleCache::';

  var shuffleCacheMemory = new Map();
  var storageAvailable = (function () {
    try {
      if (typeof localStorage === 'undefined') return false;
      var testKey = '__mahjong_shuffle_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function loadShuffleCache(layoutName) {
    if (shuffleCacheMemory.has(layoutName)) return shuffleCacheMemory.get(layoutName);
    var cache = { order: [], data: {} };
    if (storageAvailable) {
      try {
        var raw = localStorage.getItem(SHUFFLE_CACHE_PREFIX + layoutName);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.order) && parsed.data) cache = parsed;
        }
      } catch (e) {}
    }
    shuffleCacheMemory.set(layoutName, cache);
    return cache;
  }

  function persistShuffleCache(layoutName) {
    if (!storageAvailable) return;
    var cache = shuffleCacheMemory.get(layoutName);
    if (!cache) return;
    try {
      localStorage.setItem(SHUFFLE_CACHE_PREFIX + layoutName, JSON.stringify(cache));
    } catch (e) {}
  }

  function getRemainingKey(tiles, removed) {
    return tiles.filter(function (t) {
      return !removed.has(posKey(t.layer, t.row, t.col));
    }).map(function (t) { return t.id; }).sort().join(',');
  }

  function loadCachedShuffle(layoutName, key) {
    var cache = loadShuffleCache(layoutName);
    return cache.data[key];
  }

  function saveCachedShuffle(layoutName, key, mapping) {
    var cache = loadShuffleCache(layoutName);
    if (!cache.data[key]) {
      cache.order.push(key);
      if (cache.order.length > SHUFFLE_CACHE_LIMIT) {
        var oldest = cache.order.shift();
        delete cache.data[oldest];
      }
    }
    cache.data[key] = mapping;
    persistShuffleCache(layoutName);
  }

  function createGame(layoutName, seed) {
    layoutName = layoutName || 'turtle';
    const positions = getLayout(layoutName);
    let tiles = createTileSet(positions, seed);
    let attempt = 0;
    const solverStartedAt = Date.now();
    let solvable = isSolvable(positions, tiles, new Set(), SOLVER_MAX_MS);
    while (!solvable && attempt < SOLVABLE_MAX_ATTEMPTS && (Date.now() - solverStartedAt) < SOLVABLE_TOTAL_MAX_MS) {
      attempt++;
      const retrySeed = seed != null ? String(seed) + '_' + attempt : undefined;
      tiles = createTileSet(positions, retrySeed);
      solvable = isSolvable(positions, tiles, new Set(), SOLVER_MAX_MS);
    }
    const removed = new Set();
    const history = [];
    const startTime = Date.now();
    let hintsUsed = 0;
    let combo = 0;
    let lastMatchTime = 0;
    const COMBO_TIMEOUT_MS = 6000;

    function getTile(id) {
      return tiles.find(function (t) { return t.id === id; }) || null;
    }

    function getFreeTiles() {
      const free = [];
      tiles.forEach(function (t) {
        if (removed.has(posKey(t.layer, t.row, t.col))) return;
        if (isTileFree(positions, removed, t.layer, t.row, t.col)) free.push(t);
      });
      return free;
    }

    function getValidMatches() {
      const free = getFreeTiles();
      const matches = [];
      const seen = {};
      for (let i = 0; i < free.length; i++) {
        for (let j = i + 1; j < free.length; j++) {
          const a = free[i];
          const b = free[j];
          if (canMatch(a.kind, b.kind)) {
            const key = [a.id, b.id].sort().join('-');
            if (!seen[key]) {
              seen[key] = true;
              matches.push([a, b]);
            }
          }
        }
      }
      return matches;
    }

    function match(idA, idB) {
      if (idA == null || idB == null) return { ok: false, message: 'Invalid tile' };
      const a = getTile(idA);
      const b = getTile(idB);
      if (!a || !b) return { ok: false, message: 'Tile not found' };
      if (a.id === b.id) return { ok: false, message: 'Same tile' };
      if (!canMatch(a.kind, b.kind)) return { ok: false, message: 'Tiles do not match' };

      const kA = posKey(a.layer, a.row, a.col);
      const kB = posKey(b.layer, b.row, b.col);
      if (removed.has(kA) || removed.has(kB)) return { ok: false, message: 'Already removed' };
      if (!isTileFree(positions, removed, a.layer, a.row, a.col)) return { ok: false, message: 'Tile A blocked' };
      if (!isTileFree(positions, removed, b.layer, b.row, b.col)) return { ok: false, message: 'Tile B blocked' };

      removed.add(kA);
      removed.add(kB);
      
      const now = Date.now();
      let comboBroken = false;
      if (now - lastMatchTime > COMBO_TIMEOUT_MS && combo > 0) {
        combo = 0;
        comboBroken = true;
      }
      lastMatchTime = now;
      combo++;
      
      const score = BASE_SCORE * combo;
      history.push({ idA: a.id, idB: b.id, keyA: kA, keyB: kB, combo: combo, score: score, time: now });
      return { ok: true, score: score, combo: combo, comboBroken: comboBroken, comboTimeout: COMBO_TIMEOUT_MS };
    }

    function undo() {
      if (history.length === 0) return { ok: false, message: 'Nothing to undo' };
      const last = history.pop();
      removed.delete(last.keyA);
      removed.delete(last.keyB);
      // Restore combo state from previous move, or reset if history empty
      if (history.length > 0) {
        combo = history[history.length - 1].combo;
        lastMatchTime = history[history.length - 1].time;
      } else {
        combo = 0;
        lastMatchTime = 0;
      }
      return { ok: true };
    }

    function shuffle() {
      const remaining = tiles.filter(function (t) {
        return !removed.has(posKey(t.layer, t.row, t.col));
      });
      if (remaining.length === 0) return { ok: false, message: 'Game over' };

      const originalKinds = remaining.map(function (t) { return t.kind; });
      const cacheKey = layoutName + '::' + getRemainingKey(tiles, removed);

      function applyMapping(mapping) {
        for (var i = 0; i < remaining.length; i++) {
          var id = remaining[i].id;
          if (!mapping || !mapping.hasOwnProperty(id)) return false;
          remaining[i].kind = mapping[id];
        }
        return true;
      }

      const cached = loadCachedShuffle(layoutName, cacheKey);
      if (cached && applyMapping(cached)) {
        if (isSolvable(positions, tiles, removed, SOLVER_MAX_MS)) {
          combo = 0;
          return { ok: true, penaltySeconds: SHUFFLE_PENALTY, fromCache: true };
        } else {
          // drop corrupted cache entry
          var cache = loadShuffleCache(layoutName);
          delete cache.data[cacheKey];
          cache.order = cache.order.filter(function (k) { return k !== cacheKey; });
          persistShuffleCache(layoutName);
          remaining.forEach(function (t, i) { t.kind = originalKinds[i]; });
        }
      }

      let attempts = 0;
      const start = Date.now();
      let success = false;
      while (attempts < SHUFFLE_SOLVE_MAX_ATTEMPTS && (Date.now() - start) < SHUFFLE_SOLVE_MAX_MS) {
        attempts++;
        const kinds = remaining.map(function (t) { return t.kind; });
        kinds.sort(function () { return Math.random() - 0.5; });
        remaining.forEach(function (t, i) {
          t.kind = kinds[i];
        });
        if (isSolvable(positions, tiles, removed, SOLVER_MAX_MS)) {
          const mapping = {};
          remaining.forEach(function (t) { mapping[t.id] = t.kind; });
          saveCachedShuffle(layoutName, cacheKey, mapping);
          success = true;
          break;
        }
      }

      if (!success) {
        // Fallback: Just shuffle randomly if we can't find a guaranteed solvable state.
        // It's better to let the user play than to block them.
        remaining.forEach(function (t, i) { t.kind = originalKinds[i]; });
        
        // One last random shuffle
        const finalKinds = remaining.map(function (t) { return t.kind; });
        finalKinds.sort(function () { return Math.random() - 0.5; });
        remaining.forEach(function (t, i) { t.kind = finalKinds[i]; });
        
        combo = 0;
        return { ok: true, penaltySeconds: SHUFFLE_PENALTY, fromCache: false, message: 'Shuffled (Solvability uncertain)' };
      }

      combo = 0;
      return { ok: true, penaltySeconds: SHUFFLE_PENALTY, fromCache: false };
    }

    function hint() {
      if (hintsUsed >= HINT_LIMIT) return { ok: false, message: 'No hints left' };
      const matches = getValidMatches();
      if (matches.length === 0) return { ok: false, message: 'No moves' };
      
      // Sort matches by quality (highest layer first)
      matches.sort(function (a, b) {
        const maxLayerA = Math.max(a[0].layer, a[1].layer);
        const maxLayerB = Math.max(b[0].layer, b[1].layer);
        return maxLayerB - maxLayerA;
      });

      // Pick the best one
      const pair = matches[0];
      const a = pair[0];
      const b = pair[1];
      if (!a || !b || a.id === b.id) return { ok: false, message: 'No moves' };
      if (!canMatch(a.kind, b.kind)) return { ok: false, message: 'No moves' };
      if (removed.has(posKey(a.layer, a.row, a.col)) || removed.has(posKey(b.layer, b.row, b.col))) return { ok: false, message: 'No moves' };
      if (!isTileFree(positions, removed, a.layer, a.row, a.col) || !isTileFree(positions, removed, b.layer, b.row, b.col)) return { ok: false, message: 'No moves' };
      hintsUsed++;
      return { ok: true, tileA: a.id, tileB: b.id, hintsRemaining: HINT_LIMIT - hintsUsed };
    }

    function getState() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remainingTiles = tiles.filter(function (t) {
        return !removed.has(posKey(t.layer, t.row, t.col));
      });
      const score = history.reduce(function (sum, h) { return sum + (h ? h.score : 0); }, 0);
      const now = Date.now();
      const comboTimeLeft = Math.max(0, COMBO_TIMEOUT_MS - (now - lastMatchTime));
      
      return {
        tiles: remainingTiles.map(function (t) {
          return {
            id: t.id,
            kind: t.kind,
            layer: t.layer,
            row: t.row,
            col: t.col,
            free: isTileFree(positions, removed, t.layer, t.row, t.col),
          };
        }),
        score: score,
        elapsed: elapsed,
        remaining: remainingTiles.length,
        won: remainingTiles.length === 0,
        hintsRemaining: HINT_LIMIT - hintsUsed,
        validMoves: getValidMatches().length,
        canUndo: history.length > 0,
        combo: combo,
        comboTimeLeft: combo > 0 ? comboTimeLeft : 0,
        comboTotalTime: COMBO_TIMEOUT_MS
      };
    }

    return {
      match: match,
      undo: undo,
      shuffle: shuffle,
      hint: hint,
      getState: getState,
      getValidMatches: getValidMatches,
    };
  }

  global.MahjongSolitaire = {
    createGame: createGame,
    HINT_LIMIT: HINT_LIMIT,
    SHUFFLE_PENALTY: SHUFFLE_PENALTY,
    getLayout: getLayout,
  };
})(typeof window !== 'undefined' ? window : this);
