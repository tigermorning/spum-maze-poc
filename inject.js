/* SPUM Studio 콘솔(또는 Playwright evaluate)에 붙여 넣는다.
   미로를 Studio 자신의 맵 저장소에 넣는다. 타일·레이어는 전부 SPUM 것을 쓴다:
     - 타일셋: 기존 맵의 map-theme 테마(SMO_BUILTIN_STONE_WALL)를 그대로 복사
     - 바닥 2050 (floor/passable) · 벽 2077 (obstacle_blocking/movement:blocked)
     - walkable 레이어 1 = 걸을 수 있음 · obstacle 레이어 1 = 막힘
   BITS 는 `node maze.mjs` 가 찍어 주는 475자(25×19) 벽 비트맵. */
const BITS = "1011111111111111111111111100000100010000000000000111111010101110111011111011000101010001000101000101101110101110101110101110110001000100010100010001011010111110111010111110101101000000010001000001000110111111111010111110101111000100000001000001010001111010111110101111101110110100010000010100000100011011111011111110111110111100000100010000010001010110101111101011111110101011010000010100000001010101101111101011111110101010110000010000000000010000011111111111111111111111101";
const W = 25, H = 19, FLOOR = 2050, WALL = 2077;
const g = [...BITS].map(Number);
const key = 'sv_studio_maps_v1';
const j = JSON.parse(localStorage.getItem(key));
const arr = Array.isArray(j) ? j : j.maps;
const src = arr.find(m => m.mapThemeId === 'SMO_BUILTIN_STONE_WALL');   // 앱이 이미 구워 둔 테마
const theme = src.tilesets.find(t => t.source === 'map-theme');
const L = (name, type, f) => ({ name, type, label: name, data: g.map(f) });
const map = {
  id: 'MAP_maze_poc', name: '미로 PoC', description: '통행 시험용 미로',
  version: 1, width: W, height: H, tileSize: 32,
  tileSetAssetId: src.tileSetAssetId, mapThemeId: src.mapThemeId,
  savedAt: new Date().toISOString(),
  layers: [
    L('back_1', 'back', c => (c ? WALL : FLOOR)),
    L('back_2', 'back', () => 0),
    L('front_1', 'front', () => 0),
    L('walkable', 'walkable', c => (c ? 0 : 1)),
    L('obstacle', 'obstacle', c => (c ? 1 : 0)),
  ],
  objects: [], ruleTiles: [],
  tilesets: [src.tilesets[0], JSON.parse(JSON.stringify(theme))],
  spawnPoints: [{ id: 'entrance', name: '입구', col: 1, row: 1 },
                { id: 'exit', name: '출구', col: W - 2, row: H - 2 }],
  meta: { source: 'spum-maze-poc' },
};
const i = arr.findIndex(m => m.id === map.id);
if (i >= 0) arr[i] = map; else arr.push(map);
localStorage.setItem(key, JSON.stringify(Array.isArray(j) ? arr : { ...j, maps: arr }));
