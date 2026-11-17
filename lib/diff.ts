export type DiffLine = { kind: "same" | "add" | "del"; text: string; n?: number };

/** Line diff via longest common subsequence. Fine for files of a few hundred lines. */
export function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.replace(/\s+$/, "").split("\n");
  const b = after.replace(/\s+$/, "").split("\n");
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ kind: "same", text: b[j], n: j + 1 });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ kind: "del", text: a[i++] });
    } else {
      out.push({ kind: "add", text: b[j], n: j + 1 });
      j++;
    }
  }
  while (i < m) out.push({ kind: "del", text: a[i++] });
  while (j < n) {
    out.push({ kind: "add", text: b[j], n: j + 1 });
    j++;
  }
  return out;
}

/** Collapse long unchanged runs, keeping `context` lines around each change. */
export function hunks(lines: DiffLine[], context = 2): (DiffLine | { kind: "gap"; count: number })[] {
  const keep = new Array(lines.length).fill(false);
  lines.forEach((l, idx) => {
    if (l.kind !== "same") for (let k = Math.max(0, idx - context); k <= Math.min(lines.length - 1, idx + context); k++) keep[k] = true;
  });
  const out: (DiffLine | { kind: "gap"; count: number })[] = [];
  let gap = 0;
  lines.forEach((l, idx) => {
    if (keep[idx]) {
      if (gap) out.push({ kind: "gap", count: gap });
      gap = 0;
      out.push(l);
    } else gap++;
  });
  if (gap) out.push({ kind: "gap", count: gap });
  return out;
}
