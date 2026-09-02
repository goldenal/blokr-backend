import { DayOfWeek } from '@prisma/client';
import {
  getDayOfWeekFromDate,
  minutesToTime,
  timeToMinutes,
} from './slot-math';

describe('slot-math', () => {
  it('converts HH:mm to minutes from midnight', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('converts minutes from midnight back to HH:mm', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(570)).toBe('09:30');
    expect(minutesToTime(1439)).toBe('23:59');
  });

  it('round-trips timeToMinutes/minutesToTime', () => {
    for (const time of ['00:00', '09:00', '13:45', '23:59']) {
      expect(minutesToTime(timeToMinutes(time))).toBe(time);
    }
  });

  it('maps a known Monday date to DayOfWeek.MONDAY', () => {
    // 2026-09-07 is a Monday.
    expect(getDayOfWeekFromDate(new Date('2026-09-07T00:00:00'))).toBe(
      DayOfWeek.MONDAY,
    );
  });

  it('maps a known Sunday date to DayOfWeek.SUNDAY', () => {
    expect(getDayOfWeekFromDate(new Date('2026-09-06T00:00:00'))).toBe(
      DayOfWeek.SUNDAY,
    );
  });
});
