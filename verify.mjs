/* 미로 자체의 성질을 확인한다 (런타임과 무관):
   입구에서 출구까지 길로만 이어지는가, 갈림길이 있는가. */
import { carve, W, H } from './maze.mjs';
const g = carve(Number(process.argv[2]) || undefined);
const S = [1, 0], E = [W - 2, H - 1];                 // 입구(위) · 출구(아래)
const seen = new Set([S.join()]), q = [[...S, 0]];
let dist = -1;
while (q.length) {
  const [x, y, d] = q.shift();
  if (x === E[0] && y === E[1]) { dist = d; break; }
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx<0||ny<0||nx>=W||ny>=H||g[ny][nx]||seen.has(nx+','+ny)) continue;
    seen.add(nx+','+ny); q.push([nx, ny, d + 1]);
  }
}
const open = g.flat().filter(c => !c).length;
const branches = g.flatMap((row, y) => row.map((c, x) => c ? 0 :
  [[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy]) => g[y+dy] && !g[y+dy][x+dx]).length)).filter(n => n >= 3).length;
console.log(`길 ${open}칸 · 벽 ${W*H-open}칸 · 갈림길 ${branches}곳`);
console.log(dist < 0 ? '입구→출구: 막혀 있다' : `입구→출구: ${dist}걸음 (벽을 넘지 않는 경로 존재)`);
console.log(`도달 가능한 칸 ${seen.size}/${open}`);
