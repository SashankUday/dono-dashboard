import { describe, expect, it } from "vitest";
import { getWeekRange, getWeekStartKey } from "@/lib/time";

describe("getWeekRange", () => {
  it("returns Monday 00:00 through Sunday 23:59:59.999 in GMT (winter)", () => {
    // Wednesday 14 January 2026, 12:00 UTC — GMT (UTC+0) in effect.
    const now = new Date("2026-01-14T12:00:00Z");
    const { startsAt, endsAt } = getWeekRange(now);

    expect(startsAt.toISOString()).toBe("2026-01-12T00:00:00.000Z");
    expect(endsAt.toISOString()).toBe("2026-01-18T23:59:59.999Z");
  });

  it("returns Monday 00:00 through Sunday 23:59:59.999 in BST (summer)", () => {
    // Wednesday 22 July 2026, 12:00 UTC — BST (UTC+1) in effect.
    const now = new Date("2026-07-22T12:00:00Z");
    const { startsAt, endsAt } = getWeekRange(now);

    // Monday 2026-07-20 00:00 local (BST, UTC+1) = 2026-07-19T23:00:00Z
    expect(startsAt.toISOString()).toBe("2026-07-19T23:00:00.000Z");
    // Sunday 2026-07-26 23:59:59.999 local (BST, UTC+1) = 2026-07-26T22:59:59.999Z
    expect(endsAt.toISOString()).toBe("2026-07-26T22:59:59.999Z");
  });

  it("handles the week the clocks spring forward (last Sunday of March)", () => {
    // BST begins 2026-03-29 at 01:00 UTC. This week starts Monday 2026-03-23.
    const now = new Date("2026-03-26T12:00:00Z");
    const { startsAt, endsAt } = getWeekRange(now);

    // Monday 2026-03-23 00:00 local is still GMT (UTC+0).
    expect(startsAt.toISOString()).toBe("2026-03-23T00:00:00.000Z");
    // Sunday 2026-03-29 23:59:59.999 local is BST (UTC+1) since clocks
    // spring forward earlier that day.
    expect(endsAt.toISOString()).toBe("2026-03-29T22:59:59.999Z");
  });

  it("handles the week the clocks fall back (last Sunday of October)", () => {
    // BST ends 2026-10-25 at 01:00 UTC. This week starts Monday 2026-10-19.
    const now = new Date("2026-10-21T12:00:00Z");
    const { startsAt, endsAt } = getWeekRange(now);

    // Monday 2026-10-19 00:00 local is still BST (UTC+1).
    expect(startsAt.toISOString()).toBe("2026-10-18T23:00:00.000Z");
    // Sunday 2026-10-25 23:59:59.999 local is GMT (UTC+0) since clocks
    // fell back earlier that day.
    expect(endsAt.toISOString()).toBe("2026-10-25T23:59:59.999Z");
  });

  it("treats Monday as the first day of the week", () => {
    // Monday 2026-07-20 00:00:01 UTC local time.
    const now = new Date("2026-07-20T06:00:00Z");
    const { startsAt } = getWeekRange(now);

    expect(startsAt.toISOString()).toBe("2026-07-19T23:00:00.000Z");
  });
});

describe("getWeekStartKey", () => {
  it("returns a stable YYYY-MM-DD key for the London week start", () => {
    expect(getWeekStartKey(new Date("2026-07-22T12:00:00Z"))).toBe("2026-07-20");
  });
});
