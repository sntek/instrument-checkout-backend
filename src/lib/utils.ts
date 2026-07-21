import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Timezone-aware scheduling.
 *
 * The instruments are physical hardware in one place, so availability is a
 * single shared timeline: every engineer, wherever they are, books the same
 * absolute 30-minute instants. Those instants are anchored to the lab's
 * working hours (8:00 AM – 5:00 PM in LAB_TIME_ZONE) and are then rendered in
 * each viewer's own local timezone.
 *
 * Canonical, timezone-independent identifiers (identical for every viewer):
 *   - a "lab day"  -> "YYYY-MM-DD" in LAB_TIME_ZONE
 *   - a "slot key" -> ISO-8601 UTC start instant, e.g. "2026-07-21T15:00:00.000Z"
 *
 * Display strings are derived from the slot key at render time using the
 * browser's local timezone, so they differ per viewer while pointing at the
 * same moment.
 */

// The lab's physical timezone — the shared anchor for availability.
// Override per-deployment with NEXT_PUBLIC_LAB_TIME_ZONE (an IANA zone name).
export const LAB_TIME_ZONE =
  process.env.NEXT_PUBLIC_LAB_TIME_ZONE || 'America/Los_Angeles'

const WORK_START_HOUR = 8 // 8:00 AM lab time
const WORK_END_HOUR = 17 // 5:00 PM lab time
const SLOT_MINUTES = 30

// The viewer's own timezone, e.g. "Europe/Berlin". Safe on the server too.
export function getViewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

// Short label for a timezone at a given instant, e.g. "PDT" or "GMT+2".
export function timeZoneAbbreviation(timeZone: string, at: Date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(at)
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  } catch {
    return timeZone
  }
}

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

// Offset (ms) at `instant` for `timeZone` such that: utc + offset = wall clock.
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const map: Record<string, number> = {}
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') map[p.type] = Number(p.value)
  }
  const hour = map.hour === 24 ? 0 : map.hour
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second)
  return asUTC - instant.getTime()
}

// Convert a wall-clock time expressed in `timeZone` to the matching UTC instant.
// Two-pass so it stays correct across DST boundaries.
function zonedWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const offset1 = timeZoneOffsetMs(new Date(guess), timeZone)
  let instant = guess - offset1
  const offset2 = timeZoneOffsetMs(new Date(instant), timeZone)
  if (offset2 !== offset1) instant = guess - offset2
  return new Date(instant)
}

// The lab day (YYYY-MM-DD in LAB_TIME_ZONE) that `instant` falls on.
export function labDayFor(instant: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: LAB_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const map: Record<string, string> = {}
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return `${map.year}-${map.month}-${map.day}`
}

// Day of week (0 = Sunday … 6 = Saturday) for a lab day.
function labDayWeekday(labDay: string): number {
  const [y, m, d] = labDay.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
}

// Add `n` calendar days to a lab day string.
function addLabDays(labDay: string, n: number): string {
  const [y, m, d] = labDay.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d, 12))
  dt.setUTCDate(dt.getUTCDate() + n)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

// The lab's current working day and the next one (skipping the weekend).
export function currentLabDay(now: Date = new Date()): string {
  return labDayFor(now)
}

export function nextLabDay(labDay: string): string {
  const weekday = labDayWeekday(labDay)
  if (weekday === 5) return addLabDays(labDay, 3) // Fri -> Mon
  if (weekday === 6) return addLabDays(labDay, 2) // Sat -> Mon
  return addLabDays(labDay, 1)
}

export interface Slot {
  // Canonical, timezone-independent id: ISO-8601 UTC start instant.
  key: string
  start: Date
}

// The shared set of bookable 30-minute slots for a lab working day.
export function generateSlotsForLabDay(labDay: string): Slot[] {
  const [y, m, d] = labDay.split('-').map(Number)
  const slots: Slot[] = []
  for (
    let minutes = WORK_START_HOUR * 60;
    minutes < WORK_END_HOUR * 60;
    minutes += SLOT_MINUTES
  ) {
    const start = zonedWallTimeToUtc(
      y,
      m,
      d,
      Math.floor(minutes / 60),
      minutes % 60,
      LAB_TIME_ZONE
    )
    slots.push({ key: start.toISOString(), start })
  }
  return slots
}

// UTC instant for a wall-clock hour of a lab day (used for header markers).
export function labHourInstant(labDay: string, hour: number): Date {
  const [y, m, d] = labDay.split('-').map(Number)
  return zonedWallTimeToUtc(y, m, d, hour, 0, LAB_TIME_ZONE)
}

// Format an instant as a clock time in the viewer's timezone (or an override).
export function formatClock(instant: Date, timeZone?: string): string {
  return instant.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  })
}

// "8:00 AM – 8:30 AM", in the viewer's local timezone by default.
export function formatSlotRange(slotKey: string, timeZone?: string): string {
  const start = new Date(slotKey)
  const end = new Date(start.getTime() + SLOT_MINUTES * 60 * 1000)
  return `${formatClock(start, timeZone)} – ${formatClock(end, timeZone)}`
}

// Human-friendly heading for a lab working day, e.g. "Tuesday, Jul 21".
export function formatLabDay(labDay: string): string {
  const [y, m, d] = labDay.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}
