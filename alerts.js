// alerts.js：告警抑制（最后时刻查询与抑制计数）
export function alertOf(last, key) {
  const rows = Array.isArray(last) ? last : [];
  for (const row of rows) {
    if (Array.isArray(row) && row[0] === key) return row[1];
  }
  return -1;
}

export function bumpSuppressed(suppressed, key) {
  const rows = (Array.isArray(suppressed) ? suppressed : []).map(function (row) {
    return [row[0], row[1]];
  });
  let found = null;
  for (const row of rows) {
    if (row[0] === key) { found = row; break; }
  }
  if (found) found[1] += 1;
  else rows.push([key, 1]);
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  return rows;
}
