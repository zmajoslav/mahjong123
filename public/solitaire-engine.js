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
    const allKinds = SUIT_KINDS.concat(FLOWERS, SEASONS);
    const rng = seed != null ? mulberry32(hashSeed(String(seed))) : Math.random;
    const shuffled = allKinds.slice().sort(function () { return rng() - 0.5; });
    const chosenKinds = shuffled.slice(0, pairsNeeded);

    const kinds = [];
    chosenKinds.forEach(function (k) {
      kinds.push(k, k);
    });
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

  const HINT_LIMIT = 20;
  const SHUFFLE_PENALTY = 5;
  const BASE_SCORE = 10;

  function createGame(layoutName, seed) {
    layoutName = layoutName || 'turtle';
    const positions = getLayout(layoutName);
    const tiles = createTileSet(positions, seed);
    const removed = new Set();
    const history = [];
    const startTime = Date.now();
    let hintsUsed = 0;
    let combo = 0;

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
      combo++;
      const score = BASE_SCORE * combo;
      history.push({ idA: a.id, idB: b.id, keyA: kA, keyB: kB, combo: combo, score: score });
      return { ok: true, score: score, combo: combo };
    }

    function undo() {
      if (history.length === 0) return { ok: false, message: 'Nothing to undo' };
      const last = history.pop();
      removed.delete(last.keyA);
      removed.delete(last.keyB);
      combo = history.length ? history[history.length - 1].combo : 0;
      return { ok: true };
    }

    function shuffle() {
      const remaining = tiles.filter(function (t) {
        return !removed.has(posKey(t.layer, t.row, t.col));
      });
      if (remaining.length === 0) return { ok: false, message: 'Game over' };
      
      // Get all kinds from remaining tiles and shuffle them
      const kinds = remaining.map(function (t) { return t.kind; });
      kinds.sort(function () { return Math.random() - 0.5; });
      
      // Reassign kinds to remaining tiles
      remaining.forEach(function (t, i) {
        t.kind = kinds[i];
      });
      
      // Reset combo on shuffle
      combo = 0;
      
      return { ok: true, penaltySeconds: SHUFFLE_PENALTY };
    }

    function hint() {
      if (hintsUsed >= HINT_LIMIT) return { ok: false, message: 'No hints left' };
      const matches = getValidMatches();
      if (matches.length === 0) return { ok: false, message: 'No moves' };
      hintsUsed++;
      const pair = matches[Math.floor(Math.random() * matches.length)];
      return { ok: true, tileA: pair[0].id, tileB: pair[1].id, hintsRemaining: HINT_LIMIT - hintsUsed };
    }

    function getState() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = tiles.filter(function (t) {
        return !removed.has(posKey(t.layer, t.row, t.col));
      });
      const score = history.reduce(function (sum, h) { return sum + h.score; }, 0);
      return {
        tiles: tiles.filter(function (t) { return !removed.has(posKey(t.layer, t.row, t.col)); }).map(function (t) {
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
        remaining: remaining.length,
        won: remaining.length === 0,
        hintsRemaining: HINT_LIMIT - hintsUsed,
        validMoves: getValidMatches().length,
        canUndo: history.length > 0,
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
