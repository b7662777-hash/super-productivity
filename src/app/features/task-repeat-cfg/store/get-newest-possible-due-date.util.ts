import { TASK_REPEAT_WEEKDAY_MAP, TaskRepeatCfg } from '../task-repeat-cfg.model';
import { getDiffInDays } from '../../../util/get-diff-in-days';
import { getDiffInMonth } from '../../../util/get-diff-in-month';
import { getDiffInYears } from '../../../util/get-diff-in-years';
import { getDiffInWeeks } from '../../../util/get-diff-in-weeks';
import {
  getMonthlyAnchoredDate,
  getTaskRepeatDateContext,
  getYearlyAnchoredDate,
} from './get-recurrence-date-primitives.util';
import {
  findMonthlyNthWeekdayOccurrence,
  hasNthWeekdayAnchor,
} from './get-nth-weekday-of-month.util';

export const getNewestPossibleDueDate = (
  taskRepeatCfg: TaskRepeatCfg,
  today: Date,
): Date | null => {
  const context = getTaskRepeatDateContext(taskRepeatCfg, today);
  if (!context) {
    return null;
  }

  const { checkDate, startDateDate, lastTaskCreation } = context;

  if (startDateDate > checkDate) {
    return null;
  }

  switch (taskRepeatCfg.repeatCycle) {
    case 'DAILY': {
      const nrOfDaysToCheck = taskRepeatCfg.repeatEvery + 1;

      // TODO add unit test for today
      for (let i = 0; i < nrOfDaysToCheck; i++) {
        const diffInDays = getDiffInDays(startDateDate, checkDate);
        if (checkDate <= lastTaskCreation || diffInDays < 0) {
          break;
        }
        if (diffInDays % taskRepeatCfg.repeatEvery === 0) {
          return checkDate;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return null;
    }

    case 'WEEKLY': {
      // eslint-disable-next-line no-mixed-operators
      const nrOfDaysToCheck = taskRepeatCfg.repeatEvery * 7 + 1;

      for (let i = 0; i < nrOfDaysToCheck; i++) {
        const diffInWeeks = getDiffInWeeks(startDateDate, checkDate);
        if (checkDate <= lastTaskCreation || diffInWeeks < 0) {
          break;
        }
        const todayDay = checkDate.getDay();
        const todayDayStr = TASK_REPEAT_WEEKDAY_MAP[
          todayDay
        ] as keyof typeof TASK_REPEAT_WEEKDAY_MAP;

        if (
          diffInWeeks % taskRepeatCfg.repeatEvery === 0 &&
          todayDayStr &&
          taskRepeatCfg[todayDayStr as keyof TaskRepeatCfg] === true
        ) {
          return checkDate;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      return null;
    }

    case 'MONTHLY': {
      const nrOfMonthsToCheck = taskRepeatCfg.repeatEvery;

      if (hasNthWeekdayAnchor(taskRepeatCfg)) {
        return findMonthlyNthWeekdayOccurrence(taskRepeatCfg, checkDate, {
          direction: -1,
          maxMonths: nrOfMonthsToCheck + 1,
          accept: (candidate, cursor) => {
            const diffInMonth = getDiffInMonth(startDateDate, cursor);
            return (
              candidate <= checkDate &&
              candidate > lastTaskCreation &&
              diffInMonth >= 0 &&
              diffInMonth % taskRepeatCfg.repeatEvery === 0
            );
          },
        });
      }

      // `monthlyLastDay` anchors to month-end: day 31 is clamped to the true
      // last day of each month by the shared monthly anchor helper.
      const dayOfMonthRepeat = taskRepeatCfg.monthlyLastDay
        ? 31
        : startDateDate.getDate();

      // Start by checking if the repeat day has passed this month
      const lastDayOfCurrentMonth = new Date(
        checkDate.getFullYear(),
        checkDate.getMonth() + 1,
        0,
      ).getDate();
      const adjustedDayForCurrentMonth = Math.min(
        dayOfMonthRepeat,
        lastDayOfCurrentMonth,
      );

      if (today.getDate() < adjustedDayForCurrentMonth) {
        // The repeat day hasn't occurred yet this month, so check previous month
        checkDate.setMonth(checkDate.getMonth() - 1);
      }
      checkDate.setTime(
        getMonthlyAnchoredDate(checkDate, dayOfMonthRepeat).getTime(),
      );

      for (let i = 0; i < nrOfMonthsToCheck; i++) {
        const diffInMonth = getDiffInMonth(startDateDate, checkDate);

        if (checkDate <= lastTaskCreation || diffInMonth < 0) {
          break;
        }
        if (diffInMonth % taskRepeatCfg.repeatEvery === 0) {
          return checkDate;
        }
        checkDate.setMonth(checkDate.getMonth() - 1);
        checkDate.setTime(
          getMonthlyAnchoredDate(checkDate, dayOfMonthRepeat).getTime(),
        );
      }
      return null;
    }

    case 'YEARLY': {
      const nrOfYearsToCheck = taskRepeatCfg.repeatEvery;
      const dayOfMonthRepeat = startDateDate.getDate();
      const monthOfMonthRepeat = startDateDate.getMonth();

      checkDate.setTime(
        getYearlyAnchoredDate(
          checkDate,
          monthOfMonthRepeat,
          dayOfMonthRepeat,
        ).getTime(),
      );

      if (today.getMonth() < monthOfMonthRepeat) {
        checkDate.setFullYear(checkDate.getFullYear() - 1);
        checkDate.setTime(
          getYearlyAnchoredDate(
            checkDate,
            monthOfMonthRepeat,
            dayOfMonthRepeat,
          ).getTime(),
        );
      }
      if (today.getMonth() === monthOfMonthRepeat && today.getDate() < dayOfMonthRepeat) {
        checkDate.setFullYear(checkDate.getFullYear() - 1);
        checkDate.setTime(
          getYearlyAnchoredDate(
            checkDate,
            monthOfMonthRepeat,
            dayOfMonthRepeat,
          ).getTime(),
        );
      }

      for (let i = 0; i < nrOfYearsToCheck; i++) {
        const diffInYears = getDiffInYears(startDateDate, checkDate);

        if (checkDate <= lastTaskCreation || diffInYears < 0) {
          break;
        }
        if (diffInYears % taskRepeatCfg.repeatEvery === 0) {
          return checkDate;
        }
        checkDate.setFullYear(checkDate.getFullYear() - 1);
        checkDate.setTime(
          getYearlyAnchoredDate(
            checkDate,
            monthOfMonthRepeat,
            dayOfMonthRepeat,
          ).getTime(),
        );
      }
      return null;
    }

    default:
      return null;
  }
};
