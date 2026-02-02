/**
 * Mahjong Solitaire tile set.
 * 144 tiles = 72 pairs. Standard set: suits (Dots, Bams, Craks), Winds, Dragons, Flowers, Seasons.
 * Matching: only identical tile kinds match (same flower with same flower, etc.).
 */

const SUIT_KINDS = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', // Dots
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9', // Bamboos
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', // Characters
  'E', 'S', 'W', 'N', // Winds
  'RD', 'GD', 'WD', // Dragons
];
const FLOWERS = ['F1', 'F2', 'F3', 'F4'];
const SEASONS = ['S1', 'S2', 'S3', 'S4'];

function canMatch(kindA, kindB) {
  return kindA === kindB;
}

function createTileSet(positions) {
  const count = positions.length;
  if (count % 2 !== 0) throw new Error('Layout must have even number of positions');
  const pairsNeeded = count / 2;

  const allKinds = [...SUIT_KINDS, ...FLOWERS, ...SEASONS];
  const shuffled = [...allKinds].sort(() => Math.random() - 0.5);
  const chosenKinds = shuffled.slice(0, pairsNeeded);
  const kinds = [];
  for (const k of chosenKinds) {
    kinds.push(k, k);
  }
  const kindsShuffled = kinds.sort(() => Math.random() - 0.5);

  const tiles = [];
  for (let i = 0; i < positions.length; i += 1) {
    const [layer, row, col] = positions[i];
    tiles.push({
      id: `t${i}`,
      kind: kindsShuffled[i],
      layer,
      row,
      col,
    });
  }
  return tiles;
}

module.exports = {
  canMatch,
  createTileSet,
  FLOWERS,
  SEASONS,
  SUIT_KINDS,
};
