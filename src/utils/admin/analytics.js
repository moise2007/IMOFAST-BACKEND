const DAY = 86400000;
function dateOf(value) {
  if (value == null) return null;
  const date = value.toDate ? value.toDate() : new Date(value._seconds != null ? value._seconds * 1000 : value.seconds != null ? value.seconds * 1000 : value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function aggregateAnalytics(records, days, now = new Date()) {
  const end = new Date(now); end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (days - 1) * DAY);
  const series = Array.from({ length: days }, (_, i) => ({ date: new Date(+start + i * DAY).toISOString().slice(0, 10), inscriptions: 0, annonces: 0, alertes: 0, visites: 0 }));
  const byDay = new Map(series.map(row => [row.date, row]));
  const add = (value, metric) => { const d = dateOf(value); if (d && d <= now) { const row = byDay.get(d.toISOString().slice(0, 10)); if (row) row[metric]++; } };
  records.locataire.concat(records.bailleur).forEach(row => add(row.createdAt, 'inscriptions'));
  records.annonce.forEach(row => add(row.createdAt, 'annonces'));
  records.alerte.forEach(row => add(row.createdAt, 'alertes'));
  const visitors = records.analitic.filter(row => {
    const dates = (row.pages || []).map(page => page.enteredAt);
    dates.forEach(date => add(date, 'visites'));
    return dates.some(value => { const d = dateOf(value); return d && d >= start && d <= now; });
  });
  const distribution = getter => {
    const counts = new Map();
    visitors.forEach(row => { const name = getter(row) || 'Non renseigné'; counts.set(name, (counts.get(name) || 0) + 1); });
    return [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  return { series, visitors: visitors.length, totals: Object.fromEntries(['inscriptions', 'annonces', 'alertes', 'visites'].map(key => [key, series.reduce((sum, row) => sum + row[key], 0)])), os: distribution(row => row.operatingSystem?.name), devices: distribution(row => row.device?.type), countries: distribution(row => row.location?.country), cities: distribution(row => row.location?.city), updatedAt: now.toISOString() };
}
module.exports = { aggregateAnalytics, dateOf };
