/**
 * Quick load test: hammers /health (no AI cost). Run server first: npm run server
 * Usage: node scripts/stress-api.mjs [port]
 */
const port = process.argv[2] || process.env.PORT || 8787;
const base = `http://127.0.0.1:${port}`;
const n = 80;

async function one(i) {
  const t0 = performance.now();
  const res = await fetch(`${base}/health`);
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`health ${i} HTTP ${res.status}`);
  const j = await res.json();
  if (!j.ok) throw new Error(`health ${i} bad json`);
  return ms;
}

const times = [];
for (let i = 0; i < n; i++) {
  times.push(await one(i));
}
times.sort((a, b) => a - b);
const sum = times.reduce((a, b) => a + b, 0);
const p50 = times[Math.floor(n * 0.5)];
const p95 = times[Math.floor(n * 0.95)];
console.log(`health x${n}: avg ${(sum / n).toFixed(1)}ms  p50 ${p50.toFixed(1)}ms  p95 ${p95.toFixed(1)}ms  max ${times[times.length - 1].toFixed(1)}ms`);
