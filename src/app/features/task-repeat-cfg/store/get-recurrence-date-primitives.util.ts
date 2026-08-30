import { TaskRepeatCfg } from '../task-repeat-cfg.model';
import { dateStrToUtcDate } from '../../../util/date-str-to-utc-date';
import { getEffectiveLastTaskCreationDay } from './get-effective-last-task-creation-day.util';
import { getEffectiveRepeatStartDate } from './get-effective-repeat-start-date.util';
import { Log } from '../../../core/log';

export interface TaskRepeatDateContext {
  checkDate: Date;
  startDateDate: Date;
  lastTaskCreation: Date;
}

/**
 * Builds the common date context used by forward and backward recurrence scans.
 * All dates are normalized to noon so DST transitions cannot affect calendar-day
 * calculations.
 */
export const getTaskRepeatDateContext = (
  cfg: TaskRepeatCfg,
  checkDate: Date,
): TaskRepeatDateContext | null => {
  if (!Number.isInteger(cfg.repeatEvery) || cfg.repeatEvery < 1) {
    Log.warn(
      `Invalid repeatEvery value "${cfg.repeatEvery}" for TaskRepeatCfg "${cfg.id}"`,
    );
    return null;
  }

  const effectiveStartDate = dateStrToUtcDate(getEffectiveRepeatStartDate(cfg));
  const effectiveLastTaskCreation = dateStrToUtcDate(
    getEffectiveLastTaskCreationDay(cfg) || '1970-01-01',
  );

  const normalizedCheckDate = new Date(checkDate);
  normalizedCheckDate.setHours(12, 0, 0, 0);
  effectiveStartDate.setHours(12, 0, 0, 0);
  effectiveLastTaskCreation.setHours(12, 0, 0, 0);

  return {
    checkDate: normalizedCheckDate,
    startDateDate: effectiveStartDate,
    lastTaskCreation: effectiveLastTaskCreation,
  };
};

/**
 * Safely anchors a date to the requested day of its current month. Setting the
 * day to 1 first prevents JavaScript Date from overflowing into the next month.
 */
export const setDateSafely = (date: Date, day: number): void => {
  date.setDate(1);
  const lastDayOfMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(day, lastDayOfMonth));
};

/**
 * Returns the day-of-month anchor for the supplied month, clamping month-end
 * values such as 31 to the actual last day of that month.
 */
export const getMonthlyAnchoredDate = (date: Date, day: number): Date => {
  const result = new Date(date);
  setDateSafely(result, day);
  return result;
};

/**
 * Sets a yearly recurrence anchor while handling Feb 29 explicitly. Leap-day
 * recurrences use Feb 28 in non-leap years, matching the existing behavior.
 */
export const setYearlyDate = (
  date: Date,
  month: number,
  day: number,
): void => {
  date.setDate(1);
  date.setMonth(month);

  if (month === 1 && day === 29) {
    const year = date.getFullYear();
    const isLeapYear =
      (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    date.setDate(isLeapYear ? 29 : 28);
  } else {
    date.setDate(day);
  }
};

export const getYearlyAnchoredDate = (
  date: Date,
  month: number,
  day: number,
): Date => {
  const result = new Date(date);
  setYearlyDate(result, month, day);
  return result;
};
