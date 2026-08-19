/* 미로 하나를 SPUM Studio 맵 모양으로 굽는다. SAM 도, 게임 코드도 쓰지 않는다.
   SPUM 의 표현 방식(실측):
     back_1   : 눈에 보이는 타일 id
     walkable : 걸을 수 있는 칸에 1
     obstacle : 막힌 칸에 1
   두 마스크는 서로 겹치지 않는다. */
export const W = 25, H = 19;                 // 홀수라야 벽/길이 맞아떨어진다
export const FLOOR = 2050, WALL = 2077;      // 기본 테마: floor/passable, obstacle_blocking/blocked

export function carve(seed = 7) {
  let s = seed; const rnd = () => (s = s * 1103515245 % 2147483647) / 2147483647;
  const g = Array.from({ length: H }, () => Array(W).fill(1));   // 1 = 벽
  const stack = [[1, 1]]; g[1][1] = 0;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]].sort(() => rnd() - .5)
      .filter(([dx, dy]) => { const nx = x + dx, ny = y + dy;
        return nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && g[ny][nx] === 1; });
    if (!dirs.length) { stack.pop(); continue; }
    const [dx, dy] = dirs[0];
    g[y + dy / 2][x + dx / 2] = 0; g[y + dy][x + dx] = 0;
    stack.push([x + dx, y + dy]);
  }
  /* 갈림길을 늘린다 — 외길 하나면 미로라 하기 민망하다 */
  for (let i = 0; i < 18; i++) {
    const x = 2 + Math.floor(rnd() * (W - 4)) | 0, y = 2 + Math.floor(rnd() * (H - 4)) | 0;
    if (g[y][x] === 1 && ((g[y][x - 1] === 0 && g[y][x + 1] === 0) || (g[y - 1][x] === 0 && g[y + 1][x] === 0))) g[y][x] = 0;
  }
  g[0][1] = 0; g[H - 1][W - 2] = 0;          // 입구(위) · 출구(아래)
  return g;
}

export function toMap(g, id = 'MAP_maze_poc') {
  const flat = f => g.flatMap(row => row.map(f));
  const layer = (name, type, data) => ({ name, type, label: name, data });
  return {
    id, name: '미로 PoC', description: 'Playwright 로 만든 통행 시험용 미로',
    version: 1, width: W, height: H, tileSize: 32,
    tileSetAssetId: 'theme_SMO_BUILTIN_STONE_WALL', mapThemeId: 'SMO_BUILTIN_STONE_WALL',
    savedAt: new Date().toISOString(),
    layers: [
      layer('back_1', 'back', flat(c => (c ? WALL : FLOOR))),
      layer('back_2', 'back', flat(() => 0)),
      layer('front_1', 'front', flat(() => 0)),
      layer('walkable', 'walkable', flat(c => (c ? 0 : 1))),
      layer('obstacle', 'obstacle', flat(c => (c ? 1 : 0))),
    ],
    objects: [], ruleTiles: [], tilesets: [],          // tilesets 는 주입할 때 기존 테마에서 복사한다
    spawnPoints: [{ id: 'entrance', name: '입구', col: 1, row: 1 },
                  { id: 'exit', name: '출구', col: W - 2, row: H - 2 }],
    meta: { source: 'spum-maze-poc' },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const g = carve(Number(process.argv[2] || 7));
  const m = toMap(g);
  const open = g.flat().filter(c => !c).length;
  console.error(`${W}x${H} · 길 ${open}칸 · 벽 ${W * H - open}칸`);
  console.error(g.map(r => r.map(c => (c ? '█' : ' ')).join('')).join('\n'));
  process.stdout.write(JSON.stringify(m));
}
