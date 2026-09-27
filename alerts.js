// alerts.js：告警抑制（最后时刻查询与抑制计数）
export function alertOf(last, key) {
  for (const row of last || []) {
    if (row[0] === key) return row[1];
  }
  return -1;
}

export function bumpSuppressed(suppressed, key) {
  const rows = (suppressed || []).map(function (row) { return [row[0], row[1]]; });
  for (const row of rows) {
    if (row[0] === key) { row[1] += 1; return rows; }
  }
  rows.push([key, 1]);
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
  return rows;
}
