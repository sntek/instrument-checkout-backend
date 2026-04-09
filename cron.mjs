// Standalone cron process — no dependencies
const port = process.env.PORT || '3000';

async function runRollover() {
  console.log('[cron] Running daily reservation rollover...');
  try {
    const res = await fetch(`http://localhost:${port}/api/cron/daily-rollover`, { method: 'POST' });
    const data = await res.json();
    console.log('[cron] Result:', data);
  } catch (err) {
    console.error('[cron] Failed:', err.message);
  }
}

function msUntilMidnightUTC() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.getTime() - now.getTime();
}

// Wait for app to be ready, then schedule
setTimeout(() => {
  const ms = msUntilMidnightUTC();
  console.log(`[cron] Next rollover in ${Math.round(ms / 60000)} minutes`);
  setTimeout(() => {
    runRollover();
    setInterval(runRollover, 24 * 60 * 60 * 1000);
  }, ms);
}, 10000); // 10s startup delay to let the app boot

// Keep process alive
setInterval(() => {}, 1 << 30);
