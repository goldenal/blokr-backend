import { DayOfWeek } from '@prisma/client';

/** Framework-agnostic port of blokr frontend's lib/availabilityEngine.ts pure helpers. */

export type TimeRange = { start: string; end: string };

export type ComputedSlot = {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  status: 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BUSY_CALENDAR';
  heldUntil?: string;
};

const DAY_INDEX_TO_ENUM: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  return DAY_INDEX_TO_ENUM[date.getDay()];
}

export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
