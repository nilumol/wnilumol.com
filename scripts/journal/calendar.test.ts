import assert from "node:assert/strict";
import { test } from "node:test";
import { countEntriesByDay, filterEntriesByDay, localDayKey, monthGrid, shiftMonth } from "../../app/journal/calendar.ts";

// TZ is restored synchronously; these tests never touch storage or real entries.
function inTimezone(zone: string, check: () => void) {
  const previous = process.env.TZ;
  process.env.TZ = zone;
  try { check(); } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

test("local filtering and counts agree across UTC midnight and year boundaries", () => {
  const entries = [
    { body: "newest", createdAt: "2026-01-01T08:00:00.000Z" },
    { body: "middle", createdAt: "2026-01-01T07:59:59.999Z" },
    { body: "oldest", createdAt: "2025-12-31T23:30:00.000Z" },
  ];
  for (const zone of ["America/Los_Angeles", "Asia/Tokyo", "UTC"]) {
    inTimezone(zone, () => {
      const december = new Date(2025, 11, 31);
      const january = new Date(2026, 0, 1);
      const expectedDecember = zone === "America/Los_Angeles" ? ["middle", "oldest"]
        : zone === "UTC" ? ["oldest"] : [];
      assert.deepEqual(filterEntriesByDay(entries, december).map((e) => e.body), expectedDecember);
      const counts = countEntriesByDay(entries);
      assert.equal(counts.get(localDayKey(december)) ?? 0, expectedDecember.length);
      assert.equal(counts.get(localDayKey(january)), 3 - expectedDecember.length);
      assert.deepEqual(filterEntriesByDay(entries, new Date(2026, 0, 2)), []);
      assert.deepEqual(filterEntriesByDay(entries, null).map((e) => e.body), ["newest", "middle", "oldest"]);
      assert.equal(entries[1].createdAt, "2026-01-01T07:59:59.999Z");
    });
  }
});

test("DST short and repeated hours stay on the correct reader-local day", () => {
  inTimezone("America/Los_Angeles", () => {
    const entries = [
      { createdAt: "2026-03-09T07:00:00.000Z" },
      { createdAt: "2026-03-09T06:59:59.999Z" },
      { createdAt: "2026-03-08T10:00:00.000Z" },
      { createdAt: "2026-03-08T09:59:59.999Z" },
      { createdAt: "2026-03-08T08:00:00.000Z" },
      { createdAt: "2026-03-08T07:59:59.999Z" },
    ];
    assert.deepEqual(filterEntriesByDay(entries, new Date(2026, 2, 8)), entries.slice(1, 5));
    const repeated = [
      { createdAt: "2026-11-01T08:30:00.000Z" },
      { createdAt: "2026-11-01T09:30:00.000Z" },
    ];
    assert.equal(countEntriesByDay(repeated).get(localDayKey(new Date(2026, 10, 1))), 2);
  });
});

test("month navigation crosses years without end-of-month rollover", () => {
  const january = shiftMonth(new Date(2025, 11, 31), 1);
  assert.deepEqual([january.getFullYear(), january.getMonth(), january.getDate()], [2026, 0, 1]);
  const december = shiftMonth(january, -1);
  assert.deepEqual([december.getFullYear(), december.getMonth(), december.getDate()], [2025, 11, 1]);
  assert.equal(shiftMonth(new Date(2024, 0, 31), 1).getMonth(), 1);
});

test("month grids include leap days and complete weekday rows", () => {
  assert.deepEqual(monthGrid(new Date(2024, 1, 1)), { days: 29, offset: 4, cells: 35 });
  assert.deepEqual(monthGrid(new Date(2026, 1, 1)), { days: 28, offset: 0, cells: 28 });
  assert.deepEqual(monthGrid(new Date(2026, 7, 1)), { days: 31, offset: 6, cells: 42 });
  assert.equal(monthGrid(new Date(2100, 1, 1)).days, 28);
  assert.equal(monthGrid(new Date(2000, 1, 1)).days, 29);
  assert.deepEqual(countEntriesByDay([]), new Map());
});
