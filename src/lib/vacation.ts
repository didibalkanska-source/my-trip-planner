import { eachDayOfInterval, isWeekend, parseISO } from "date-fns";
import { isBulgarianHoliday } from "./holidays";

export function workdaysBetween(
  startISO: string,
  endISO: string,
  opts?: { skipFirstDay?: boolean }
): number {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (end < start) return 0;
  let days = eachDayOfInterval({ start, end });
  if (opts?.skipFirstDay) days = days.slice(1);
  return days.filter((d) => !isWeekend(d) && !isBulgarianHoliday(d)).length;
}

export function totalDays(startISO: string, endISO: string): number {
  const start = parseISO(startISO);
  const end = parseISO(endISO);
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).length;
}
