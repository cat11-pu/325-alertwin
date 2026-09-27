// alerts.js：告警抑制（基线：一律原样返回）
export function alertOf(last, key) {
  return -1;
}

export function bumpSuppressed(suppressed, key) {
  return suppressed;
}
