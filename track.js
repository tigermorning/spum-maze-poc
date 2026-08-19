/* 런타임에서 캐릭터가 실제로 어느 칸에 있는지 재는 코드.
   SPUM 은 캐릭터 좌표를 DOM 이나 전역에 내놓지 않는다. 그래서 두 캔버스를 읽는다:
     data-world-map-canvas  → 지도 그림. 우리 벽 비트맵과 맞춰 화면↔칸 변환을 구한다(일치율 1.0 확인).
     data-world-unit-canvas → 캐릭터만 그려지는 층. 스프라이트 아래끝이 발 위치.
   충돌 판정을 우리가 하는 게 아니다 — 우리가 authoring 한 obstacle 맵과
   런타임이 그린 위치를 대조할 뿐이다. */
const BITS = "…maze.mjs 가 찍어 준 475자…";
const W = 25, S = 32;            // 100% 줌에서 한 칸 32px
const wall = (c, r) => (c < 0 || r < 0 || c > 24 || r > 18) ? 1 : +(BITS[r * W + c] === '1');
const mc = document.querySelector('canvas[data-world-map-canvas]');
const uc = document.querySelector('canvas[data-world-unit-canvas]');
const isW = (r, g, b) => Math.abs(r - g) < 26 && Math.abs(g - b) < 26;   // 돌벽은 무채색, 바닥은 주황
let OX = -100, OY = -8;
function calibrate() {                       // 카메라가 움직이므로 표본마다 다시 맞춘다
  const im = mc.getContext('2d').getImageData(0, 0, mc.width, mc.height).data;
  const get = (x, y) => { const i = ((y | 0) * mc.width + (x | 0)) * 4; return [im[i], im[i+1], im[i+2], im[i+3]]; };
  let best = null;
  for (let ox = OX - 48; ox <= OX + 48; ox += 2) for (let oy = OY - 48; oy <= OY + 48; oy += 2) {
    let ok = 0, tot = 0;
    for (let c = 0; c < 25; c += 2) for (let r = 0; r < 19; r += 2) {
      const x = Math.round(ox + (c + .5) * S), y = Math.round(oy + (r + .5) * S);
      if (x < 2 || y < 2 || x >= mc.width - 2 || y >= mc.height - 2) continue;
      const [R, G, B, A] = get(x, y); if (A < 40) continue;
      tot++; if (isW(R, G, B) === (BITS[r * W + c] === '1')) ok++;
    }
    if (tot >= 50 && (!best || ok / tot > best.s)) best = { s: ok / tot, ox, oy };
  }
  if (best && best.s > .9) { OX = best.ox; OY = best.oy; }
  return best;
}
function feet() {
  const d = uc.getContext('2d').getImageData(0, 0, uc.width, uc.height).data;
  let x0 = 1e9, x1 = -1, y1 = -1;
  for (let q = 3; q < d.length; q += 4) if (d[q] > 40) {
    const i = (q - 3) / 4, px = i % uc.width, py = (i / uc.width) | 0;
    if (px < x0) x0 = px; if (px > x1) x1 = px; if (py > y1) y1 = py;
  }
  return x1 < 0 ? null : [(x0 + x1) / 2, y1];
}
/* 표본 → 칸. DY 는 스프라이트 아래끝과 칸 바닥의 차(≈24px, ±0.2칸 흔들린다). */
export function cellNow(DY = 24) {
  calibrate(); const f = feet(); if (!f) return null;
  return [Math.floor((f[0] - OX) / S), Math.floor((f[1] - DY - OY) / S)];
}
