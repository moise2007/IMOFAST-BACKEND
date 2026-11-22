const DAY_MS = 86400000;
const DOUALA_OFFSET = 3600000;
function dayKey(now = new Date()) { return new Date(+now + DOUALA_OFFSET).toISOString().slice(0, 10); }
function dayStart(now = new Date()) { return new Date(`${dayKey(now)}T00:00:00+01:00`); }
function evolution(current, previous) { return previous === 0 ? (current === 0 ? 0 : 100) : Math.round((current - previous) / previous * 10000) / 100; }
module.exports = { DAY_MS, dayKey, dayStart, evolution };
