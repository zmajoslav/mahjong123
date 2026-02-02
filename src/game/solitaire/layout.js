/**
 * Mahjong Solitaire layouts (Shanghai-style tile-matching puzzle).
 * Each layout is a list of [layer, row, col] positions (72 unique = 144 tiles).
 * A tile is "free" if: no tile on top, AND (left OR right) is open.
 */

function posKey(layer, row, col) {
  return `${layer},${row},${col}`;
}

function hasTileAt(positions, removed, layer, row, col) {
  if (!positions.some((p) => p[0] === layer && p[1] === row && p[2] === col)) return false;
  return !removed.has(posKey(layer, row, col));
}

/**
 * Check if a tile at (layer, row, col) is free (can be matched).
 * Free = no tile on top, AND (no tile to left OR no tile to right).
 */
function isTileFree(positions, removed, layer, row, col) {
  if (!positions.some((p) => p[0] === layer && p[1] === row && p[2] === col)) return false;
  if (removed.has(posKey(layer, row, col))) return false;

  if (hasTileAt(positions, removed, layer + 1, row, col)) return false;

  const hasLeft = hasTileAt(positions, removed, layer, row, col - 1);
  const hasRight = hasTileAt(positions, removed, layer, row, col + 1);
  return !hasLeft || !hasRight;
}

// Classic "Turtle" style - 72 positions, 144 tiles (exactly 36 pairs per layout)
function getTurtleLayout() {
  const positions = [];
  const L0 = [
    '...1111...',
    '..111111..',
    '.11111111.',
    '1111111111',
    '1111111111',
    '.11111111.',
    '..111111..',
  ];
  for (let r = 0; r < L0.length; r += 1) {
    for (let c = 0; c < L0[r].length; c += 1) {
      if (L0[r][c] === '1') positions.push([0, r, c]);
    }
  }
  for (let r = 2; r <= 4; r += 1) {
    for (let c = 2; c <= 7; c += 1) {
      positions.push([1, r, c]);
    }
  }
  positions.push([2, 3, 4]);
  positions.push([2, 3, 5]);
  return positions;
}

// Simpler "Pyramid" layout
function getPyramidLayout() {
  const positions = [];
  for (let r = 0; r < 6; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      positions.push([0, r, c]);
    }
  }
  for (let r = 1; r < 5; r += 1) {
    for (let c = 1; c < 7; c += 1) {
      positions.push([1, r, c]);
    }
  }
  for (let r = 2; r < 4; r += 1) {
    for (let c = 2; c < 6; c += 1) {
      positions.push([2, r, c]);
    }
  }
  return positions;
}

function getLayout(name) {
  if (name === 'pyramid') return getPyramidLayout();
  return getTurtleLayout();
}

module.exports = {
  getLayout,
  getPyramidLayout,
  getTurtleLayout,
  isTileFree,
  posKey,
};
