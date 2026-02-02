/**
 * Mahjong Solitaire game engine (Shanghai-style).
 * Handles match, shuffle, undo, hint, win detection.
 */

const { getLayout, isTileFree, posKey } = require('./layout');
const { canMatch, createTileSet } = require('./tiles');

const SHUFFLE_PENALTY_SECONDS = 60;
const BASE_SCORE_PER_MATCH = 10;
const HINT_LIMIT = 5;

function createGame({ layoutName = 'turtle', seed } = {}) {
  const positions = getLayout(layoutName);
  const tiles = createTileSet(positions);
  const removed = new Set();
  const history = [];
  const startTime = Date.now();
  let hintsUsed = 0;
  let combo = 0;

  function getTileById(id) {
    return tiles.find((t) => t.id === id) || null;
  }

  function getTileAt(layer, row, col) {
    return tiles.find((t) => !removed.has(posKey(t.layer, t.row, t.col)) && t.layer === layer && t.row === row && t.col === col) || null;
  }

  function getFreeTiles() {
    const free = [];
    for (const t of tiles) {
      if (removed.has(posKey(t.layer, t.row, t.col))) continue;
      if (isTileFree(positions, removed, t.layer, t.row, t.col)) {
        free.push(t);
      }
    }
    return free;
  }

  function getValidMatches() {
    const free = getFreeTiles();
    const matches = [];
    const seen = new Set();
    for (let i = 0; i < free.length; i += 1) {
      for (let j = i + 1; j < free.length; j += 1) {
        const a = free[i];
        const b = free[j];
        if (canMatch(a.kind, b.kind)) {
          const key = [a.id, b.id].sort().join('-');
          if (!seen.has(key)) {
            seen.add(key);
            matches.push([a, b]);
          }
        }
      }
    }
    return matches;
  }

  function match(idA, idB) {
    const tileA = getTileById(idA);
    const tileB = getTileById(idB);
    if (!tileA || !tileB) return { ok: false, message: 'Tile not found' };
    if (tileA.id === tileB.id) return { ok: false, message: 'Same tile' };
    if (!canMatch(tileA.kind, tileB.kind)) return { ok: false, message: 'Tiles do not match' };

    const keyA = posKey(tileA.layer, tileA.row, tileA.col);
    const keyB = posKey(tileB.layer, tileB.row, tileB.col);
    if (removed.has(keyA) || removed.has(keyB)) return { ok: false, message: 'Tile already removed' };

    if (!isTileFree(positions, removed, tileA.layer, tileA.row, tileA.col)) {
      return { ok: false, message: 'Tile A is not free' };
    }
    if (!isTileFree(positions, removed, tileB.layer, tileB.row, tileB.col)) {
      return { ok: false, message: 'Tile B is not free' };
    }

    removed.add(keyA);
    removed.add(keyB);
    combo += 1;
    const score = BASE_SCORE_PER_MATCH * combo;
    history.push({ idA: tileA.id, idB: tileB.id, keyA, keyB, combo, score });
    return { ok: true, score, combo };
  }

  function undo() {
    if (history.length === 0) return { ok: false, message: 'Nothing to undo' };
    const last = history.pop();
    removed.delete(last.keyA);
    removed.delete(last.keyB);
    combo = history.length > 0 ? history[history.length - 1].combo : 0;
    return { ok: true };
  }

  function shuffle() {
    const remaining = tiles.filter((t) => !removed.has(posKey(t.layer, t.row, t.col)));
    if (remaining.length === 0) return { ok: false, message: 'Game over' };
    const kinds = remaining.map((t) => t.kind).sort(() => Math.random() - 0.5);
    for (let i = 0; i < remaining.length; i += 1) {
      remaining[i].kind = kinds[i];
    }
    return { ok: true, penaltySeconds: SHUFFLE_PENALTY_SECONDS };
  }

  function hint() {
    if (hintsUsed >= HINT_LIMIT) return { ok: false, message: 'No hints remaining' };
    const matches = getValidMatches();
    if (matches.length === 0) return { ok: false, message: 'No valid moves' };
    hintsUsed += 1;
    const [a, b] = matches[Math.floor(Math.random() * matches.length)];
    return { ok: true, tileA: a.id, tileB: b.id, hintsRemaining: HINT_LIMIT - hintsUsed };
  }

  function getState() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = tiles.filter((t) => !removed.has(posKey(t.layer, t.row, t.col)));
    const won = remaining.length === 0;
    const totalScore = history.reduce((sum, h) => sum + h.score, 0);
    return {
      tiles,
      removed: Array.from(removed),
      historyLength: history.length,
      combo,
      elapsed,
      score: totalScore,
      remaining: remaining.length,
      won,
      hintsUsed,
      hintsRemaining: HINT_LIMIT - hintsUsed,
      validMatchCount: getValidMatches().length,
    };
  }

  function getTilesForClient() {
    return tiles
      .filter((t) => !removed.has(posKey(t.layer, t.row, t.col)))
      .map((t) => ({
        id: t.id,
        kind: t.kind,
        layer: t.layer,
        row: t.row,
        col: t.col,
        free: isTileFree(positions, removed, t.layer, t.row, t.col),
      }));
  }

  return {
    getState,
    getTilesForClient,
    getValidMatches,
    hint,
    match,
    shuffle,
    undo,
  };
}

module.exports = {
  createGame,
  HINT_LIMIT,
  SHUFFLE_PENALTY_SECONDS,
};
