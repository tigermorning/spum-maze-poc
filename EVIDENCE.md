# 통행 차단 근거 (정적 추적)

SPUM 이 실제로 서비스하는 런타임 소스를 받아서 따라갔다. 모두 `spum.soonsoon.ai` 에서
2026-08-20 에 내려받은 파일이고, 우리 맵을 돌리는 바로 그 코드다.

## obstacle 데이터 → 격자

`packages/spum-world/core/WorldCastSync.js:196` `buildWalkableInfo(map)`

```js
const walkableLayers = layers.filter((layer) => layer.type === 'walkable');
const obstacleLayers = layers.filter((layer) => layer.type === 'obstacle');
...
isWalkable(col, row) {
  if (hasWalkableMarks && !walkableLayers.some((l) => cell(l, col, row, width) > 0)) return false;
  if (obstacleLayers.some((l) => cell(l, col, row, width) > 0)) return false;   // ← 우리 벽
  if (solidVisualLayers.some((l) => cell(l, col, row, width) > 0)) return false;
  if (objectRects.some(...)) return false;
  return true;
}
```

`WorldCastSync.js:350` `runtimeGridForMap(map)` → `Uint8Array`, **1=걷기 가능 / 0=벽**.

## 격자 → 길찾기

- `packages/spum-world/core/WorldRuntimeBridge.js:82` — `grid: runtimeGridForMap(map)` 로 런타임에 넘긴다.
- `packages/spum-world/runtime/StudioSpumWorldRuntime.js:690` `setGrid()` → `pathfinding.setGrid(grid, w, h, {tileWidth…})`
  (`:3838` `const gridChanged = grid ? setGrid(grid) : false;`)
- `packages/spum-engine/lib/domain/pathfinding/PathfindingManager.js:36` — `_grid` 주석 그대로 **"0=벽, 1+=walkable"**

## 길찾기 → 이동 거부

`packages/spum-engine/lib/domain/pathfinding/AStar.js`

```js
55:  if (grid[ey * width + ex] === 0) return { path: [], cost: 0, found: false };  // 목적지가 벽이면 경로 없음
98:  if (closed[nIdx] || grid[nIdx] === 0) continue;                              // 벽 칸은 확장하지 않는다
102: if (grid[cy*width+nx] === 0 || grid[ny*width+cx] === 0) continue;            // 모서리 자르기 금지
```

`packages/spum-world/runtime/systems/WorldLocomotionSystem.js:121`

```js
if (pathfinding.getCell(gx, gy) <= 0) return null;   // 벽 칸은 목적지로 아예 받지 않는다
```
(`:149` 남에게 다가갈 때 쓰는 인접 칸도 `getCell(gx,gy) > 0` 인 것만 고른다)

`StudioSpumWorldRuntime.js:681` `_rebuildWalkableCells()` — 배회 목표 후보는 `pathfinding.getCell(gx,gy) > 0` 인 칸뿐.
`:1597` 후보가 하나도 없으면 이동하지 않는다.

## 이동 경로는 하나뿐

런타임의 모든 이동은 `entry.navAgent.setDestination(...)` 을 거친다
(`StudioSpumWorldRuntime.js:1762`, `:2783`, `:2829`). 좌표를 직접 밀어 넣는 경로는 없다.
NavAgent 는 A* 가 준 웨이포인트만 따라간다 (`NavAgent.js`, 상태 `idle/moving/arrived/blocked`).

## 런타임 관찰 지점 (공식)

`StudioSpumWorldRuntime.js:812-852` 가 액터 상태를 내보낸다 — `navAgent.state`, `destination`, `path`
(남은 웨이포인트 목록). Event Log 의 `actor` 항목(`walking`/`resting`)이 이 통로로 나온다.
다만 **칸 좌표를 직접 읽는 공개 API 는 없다.**

## 관측된 것 (보조 증거)

Studio 시뮬레이션에서 캐릭터 위치를 세 번(각 1~2분) 표본했다. 45칸 넘게 다니는 동안
벽 칸 표본은 사실상 0 — 한 번 걸린 (22,0) 은 측정 기준점 오차(±0.2칸) 안의 맨 위 테두리다.
