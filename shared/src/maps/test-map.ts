import type { MapData } from "../map";

// Hand-made test map. Legend: "." grass, "," dirt, "~" water, "#" stone wall.
const LEGEND: Record<string, number> = {
  ".": 0,
  ",": 1,
  "~": 2,
  "#": 3,
};

const ROWS = [
  "####################",
  "#..................#",
  "#..~~~.......###...#",
  "#..~~~~......#.....#",
  "#...~~.......#.....#",
  "#............###...#",
  "#....,,,...........#",
  "#....,,,,..........#",
  "#.....,,...........#",
  "#..........~~~~....#",
  "#..###......~~~....#",
  "#..#...............#",
  "#..#.....,,........#",
  "#........,,........#",
  "####################",
];

function parseRows(rows: string[]): number[][] {
  return rows.map((row) =>
    [...row].map((ch) => {
      const id = LEGEND[ch];
      if (id === undefined) throw new Error(`Unknown map character: "${ch}"`);
      return id;
    }),
  );
}

const tiles = parseRows(ROWS);

export const TEST_MAP: MapData = {
  width: ROWS[0]?.length ?? 0,
  height: ROWS.length,
  tiles,
  spawn: { x: 9, y: 7 },
};
