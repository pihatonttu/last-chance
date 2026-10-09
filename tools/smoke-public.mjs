// End-to-end smoke test against a running deployment: creates a trial game over HTTPS,
// joins as the host over WebSocket, starts, lets the bots play, ends the game and waits
// for the named debrief. Trial games are never stored, so this leaves nothing behind.
//
// Usage: node tools/smoke-public.mjs [base-url]   (default https://last-chance.novanet.fi)
// On novaservu (no hairpin NAT on the LAN):
//   docker run --rm --add-host last-chance.novanet.fi:host-gateway \
//     -v "$PWD/tools/smoke-public.mjs:/smoke.mjs:ro" node:24.13.0-bookworm-slim node /smoke.mjs

const base = process.argv[2] ?? 'https://last-chance.novanet.fi';
const PLAY_MS = 15_000;

const health = await (await fetch(`${base}/healthz`)).json();
console.log('healthz', JSON.stringify(health));

const created = await fetch(`${base}/api/games`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ length: 'short', trial: true }),
});
if (!created.ok) throw new Error(`create game: HTTP ${created.status}`);
const { code, hostToken } = await created.json();

const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/ws`);
const seen = {};
let lastGame = null;
let sawPhaseMs = false;

const debrief = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`timeout; messages ${JSON.stringify(seen)}`)), 60_000);
  ws.onerror = () => reject(new Error('websocket error'));
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello-host', protocol: 1, code, hostToken }));
  ws.onmessage = (event) => {
    const m = JSON.parse(event.data);
    seen[m.t] = (seen[m.t] ?? 0) + 1;
    if (m.t === 'welcome') {
      console.log(`welcome as ${m.role}, ${m.game.playerCount} bots in the lobby`);
      ws.send(JSON.stringify({ t: 'host', command: { type: 'start' } }));
      setTimeout(() => ws.send(JSON.stringify({ t: 'host', command: { type: 'end' } })), PLAY_MS);
    }
    if (m.t === 'game') {
      lastGame = m.game;
      if (m.game.timer.phaseMs > 0) sawPhaseMs = true;
    }
    if (m.t === 'error') console.log('server error code', m.code);
    if (m.t === 'debrief') {
      clearTimeout(timeout);
      resolve(m);
    }
  };
});
ws.close();

console.log(`ended: phase ${lastGame?.phase}, month ${lastGame?.month}, result ${JSON.stringify(lastGame?.result)}`);
console.log(`debrief: named ${debrief.debrief.named}, ${debrief.debrief.players.length} players, stored ${debrief.storedToken}`);
console.log(`timer phaseMs seen: ${sawPhaseMs}`);
console.log('messages', JSON.stringify(seen));
const ok = lastGame?.phase === 'ended' && debrief.debrief.named && debrief.storedToken === null && sawPhaseMs;
console.log(ok ? 'SMOKE OK' : 'SMOKE FAILED');
process.exit(ok ? 0 : 1);
