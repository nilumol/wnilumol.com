/** Reader-local date helpers. Call after hydration, never using UTC date slices. */
export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function filterEntriesByDay<T extends { createdAt: string }>(entries: T[], day: Date | null): T[] {
  if (day === null) return entries;
  const key = localDayKey(day);
  return entries.filter((entry) => localDayKey(new Date(entry.createdAt)) === key);
}

export function countEntriesByDay(entries: { createdAt: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const key = localDayKey(new Date(entry.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function shiftMonth(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1);
}

export function monthGrid(month: Date) {
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  return { days, offset, cells: Math.ceil((offset + days) / 7) * 7 };
}
