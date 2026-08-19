/* 게임층 서버. 셋을 이어 붙이기만 한다:
     /spum-cdn/*      → spum.soonsoon.ai (런타임 모듈·에셋). 두 게임이 쓰던 방식 그대로.
     /api/sam/*       → sam-npc-core 의 프록시(기본 8790). SAM 로직은 여기 없다.
     /profiles/*      → sam-npc-core 의 인물 프로필. 성격은 그쪽 것을 그대로 읽는다.
   node game/serve.mjs   (먼저 sam-npc-core 에서 `npm run proxy`) */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CORE = process.env.SAM_CORE || 'http://127.0.0.1:8790';
const PORT = Number(process.env.PORT || 8795);
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
               '.mjs':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' };
const read = req => new Promise(r => { let b=''; req.on('data',c=>b+=c); req.on('end',()=>r(b)); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname.startsWith('/spum-cdn/')) {                 // SPUM 원본을 그대로 통과시킨다
      const up = await fetch('https://spum.soonsoon.ai' + u.pathname.slice('/spum-cdn'.length) + u.search);
      const buf = Buffer.from(await up.arrayBuffer());
      res.writeHead(up.status, { 'Content-Type': up.headers.get('content-type') || 'application/octet-stream' });
      return res.end(buf);
    }
    if (u.pathname.startsWith('/api/sam/')) {                  // 대화는 코어가 한다
      const up = await fetch(CORE + '/api/sam/generate', { method:'POST',
        headers:{'content-type':'application/json'}, body: await read(req) });
      const t = await up.text();
      res.writeHead(up.status, { 'Content-Type':'application/json; charset=utf-8' }); return res.end(t);
    }
    if (u.pathname.startsWith('/core/')) {                     // 코어 모듈 (provenance 등)
      const f = path.join(HERE, '../../sam-npc-core/src', path.basename(u.pathname));
      res.writeHead(200, { 'Content-Type': MIME['.mjs'] }); return res.end(fs.readFileSync(f));
    }
    if (u.pathname.startsWith('/profiles/')) {                 // 인물은 코어 저장소의 프로필을 읽는다
      const f = path.join(HERE, '../../sam-npc-core/profiles/village', path.basename(u.pathname));
      res.writeHead(200, { 'Content-Type': MIME['.json'] }); return res.end(fs.readFileSync(f));
    }
    const rel = u.pathname === '/' ? 'index.html' : u.pathname.slice(1);
    const f = path.join(HERE, rel);
    if (!f.startsWith(HERE) || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  } catch (e) { res.writeHead(502); res.end(String(e.message || e)); }
}).listen(PORT, '0.0.0.0', () => console.log(`미로 게임 — http://127.0.0.1:${PORT}  (SAM 코어: ${CORE})`));
