import { format } from "date-fns";

// Orthodox Easter (Meeus Julian algorithm) — returns Gregorian date of Easter Sunday
function orthodoxEaster(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // 3 or 4 (Julian)
  const day = ((d + e + 114) % 31) + 1;
  // Convert Julian -> Gregorian (add 13 days for 1900-2099)
  const julian = new Date(Date.UTC(year, month - 1, day));
  julian.setUTCDate(julian.getUTCDate() + 13);
  return new Date(julian.getUTCFullYear(), julian.getUTCMonth(), julian.getUTCDate());
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const holidayCache = new Map<number, Map<string, string>>();

export type Holiday = { date: Date; name: string };

export function bulgarianHolidays(year: number): Holiday[] {
  const easter = orthodoxEaster(year);
  const fixed: Holiday[] = [
    { date: new Date(year, 0, 1), name: "Нова година" },
    { date: new Date(year, 2, 3), name: "Освобождение на България" },
    { date: new Date(year, 4, 1), name: "Ден на труда" },
    { date: new Date(year, 4, 6), name: "Гергьовден" },
    { date: new Date(year, 4, 24), name: "Ден на българската просвета и култура" },
    { date: new Date(year, 8, 6), name: "Ден на Съединението" },
    { date: new Date(year, 8, 22), name: "Ден на Независимостта" },
    { date: new Date(year, 11, 24), name: "Бъдни вечер" },
    { date: new Date(year, 11, 25), name: "Рождество Христово" },
    { date: new Date(year, 11, 26), name: "Рождество Христово" },
  ];
  const movable: Holiday[] = [
    { date: addDays(easter, -2), name: "Разпети петък" },
    { date: addDays(easter, -1), name: "Велика събота" },
    { date: easter, name: "Великден" },
    { date: addDays(easter, 1), name: "Велики понеделник" },
  ];
  const all = [...fixed, ...movable];
  // Bulgarian rule: when a public holiday falls on Saturday or Sunday,
  // the following Monday is also a non-working day.
  const keys = new Set(all.map((h) => format(h.date, "yyyy-MM-dd")));
  const subs: Holiday[] = [];
  all.forEach((h) => {
    const dow = h.date.getDay(); // 0 = Sun, 6 = Sat
    if (dow === 0 || dow === 6) {
      const mon = addDays(h.date, dow === 0 ? 1 : 2);
      const k = format(mon, "yyyy-MM-dd");
      if (!keys.has(k)) {
        keys.add(k);
        subs.push({ date: mon, name: `Почивен ден (${h.name})` });
      }
    }
  });
  return [...all, ...subs];
}


function holidayMap(year: number): Map<string, string> {
  let m = holidayCache.get(year);
  if (!m) {
    m = new Map();
    bulgarianHolidays(year).forEach((h) => m!.set(format(h.date, "yyyy-MM-dd"), h.name));
    holidayCache.set(year, m);
  }
  return m;
}

export function isBulgarianHoliday(d: Date): boolean {
  return holidayMap(d.getFullYear()).has(format(d, "yyyy-MM-dd"));
}

export function holidayName(d: Date): string | undefined {
  return holidayMap(d.getFullYear()).get(format(d, "yyyy-MM-dd"));
}
