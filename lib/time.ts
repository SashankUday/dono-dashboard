export const LONDON_TIMEZONE = "Europe/London";

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  weekday: number;
};

function londonOffsetMs(instant: Date): number {
  const utcDate = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(instant.toLocaleString("en-US", { timeZone: LONDON_TIMEZONE }));
  return tzDate.getTime() - utcDate.getTime();
}

function getLondonWallClock(instant: Date): WallClock {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: LONDON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(instant);
  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };

  const hourPart = lookup("hour");

  return {
    year: Number(lookup("year")),
    month: Number(lookup("month")),
    day: Number(lookup("day")),
    hour: hourPart === "24" ? 0 : Number(hourPart),
    minute: Number(lookup("minute")),
    second: Number(lookup("second")),
    millisecond: instant.getUTCMilliseconds(),
    weekday: weekdayMap[lookup("weekday")] ?? 1,
  };
}

function londonWallClockToUtc(wall: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}): Date {
  const naiveUtcGuess = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
    wall.millisecond,
  );

  const offset = londonOffsetMs(new Date(naiveUtcGuess));

  return new Date(naiveUtcGuess - offset);
}

export function getWeekRange(now: Date = new Date()): { startsAt: Date; endsAt: Date } {
  const wall = getLondonWallClock(now);

  const daysSinceMonday = wall.weekday - 1;

  const mondayUtcNoon = new Date(
    Date.UTC(wall.year, wall.month - 1, wall.day, 12, 0, 0, 0) -
      daysSinceMonday * 24 * 60 * 60 * 1000,
  );

  const mondayWall = getLondonWallClock(mondayUtcNoon);

  const startsAt = londonWallClockToUtc({
    year: mondayWall.year,
    month: mondayWall.month,
    day: mondayWall.day,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });

  const sundayUtcNoon = new Date(mondayUtcNoon.getTime() + 6 * 24 * 60 * 60 * 1000);
  const sundayWall = getLondonWallClock(sundayUtcNoon);

  const endsAt = londonWallClockToUtc({
    year: sundayWall.year,
    month: sundayWall.month,
    day: sundayWall.day,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  });

  return { startsAt, endsAt };
}

export function getWeekStartKey(now: Date = new Date()): string {
  const { startsAt } = getWeekRange(now);
  const wall = getLondonWallClock(startsAt);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;
}

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);

  if (diffSeconds < 5) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}
