import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Plane, Car, Train, Bus, Sailboat, Compass } from "lucide-react";
import type { Trip } from "./TripForm";
import { holidayName } from "@/lib/holidays";
import { cn } from "@/lib/utils";

const icons: Record<string, any> = {
  "Самолет": Plane, "Кола": Car, "Влак": Train, "Автобус": Bus, "Яхта": Sailboat, "Друго": Compass,
};

// Stable color per destination
const palette = [
  "hsl(var(--primary))",      // teal-blue
  "hsl(var(--accent))",       // orange
  "hsl(280 70% 55%)",         // purple
  "hsl(250 70% 60%)",         // indigo
  "hsl(15 35% 45%)",          // brown
  "hsl(340 75% 55%)",         // pink
  "hsl(320 70% 50%)",         // magenta
  "hsl(45 90% 50%)",          // yellow
];
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

const kidColors: Record<string, string> = {
  "Теди": "hsl(220 9% 46%)",   // darker gray
  "Мими": "hsl(220 9% 65%)",   // lighter gray
};

function tripColor(t: Trip) {
  if (t.is_event) return "hsl(142 70% 40%)";
  if (t.transport === "Яхта") return "hsl(175 70% 42%)";
  if (t.kid && kidColors[t.kid]) return kidColors[t.kid];
  return colorFor(t.destination);
}



export function TripsCalendar({
  trips,
  onTripClick,
  onEmptyDayClick,
}: {
  trips: Trip[];
  onTripClick?: (trip: Trip) => void;
  onEmptyDayClick?: (date: Date) => void;
}) {
  const tripPriority = (t: Trip) => (t.is_event ? 1 : t.kid ? 2 : 0);

  const byDate = useMemo(() => {
    const m = new Map<string, Trip[]>();
    trips.forEach((t) => {
      let d = parseISO(t.start_date);
      const end = parseISO(t.end_date);
      while (d <= end) {
        const k = format(d, "yyyy-MM-dd");
        const arr = m.get(k) ?? [];
        arr.push(t);
        m.set(k, arr);
        d = new Date(d);
        d.setDate(d.getDate() + 1);
      }
    });
    m.forEach((arr) => arr.sort((a, b) => tripPriority(a) - tripPriority(b)));
    return m;
  }, [trips]);


  const upcomingTrips = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seen = new Map<string, Trip>();
    trips.forEach((t) => {
      if (parseISO(t.end_date) < today) return;
      const key = t.is_event
        ? `event:${t.destination}`
        : t.kid
          ? `kid:${t.kid}`
          : `dest:${t.destination}`;
      if (!seen.has(key)) seen.set(key, t);
    });
    return Array.from(seen.values()).sort((a, b) => tripPriority(a) - tripPriority(b));
  }, [trips]);


  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const key = format(date, "yyyy-MM-dd");
    const dayTrips = byDate.get(key) ?? [];
    if (dayTrips.length > 0) {
      onTripClick?.(dayTrips[0]);
    } else {
      onEmptyDayClick?.(date);
    }
  };

  return (
    <Card className="p-3 sm:p-6 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold">Календар на пътуванията</h2>
      </div>

      <Calendar
        mode="single"
        selected={undefined}
        onSelect={handleSelect}
        weekStartsOn={1}
        locale={bg}
        showOutsideDays
        className="p-0 pointer-events-auto w-full"
        classNames={{
          months: "flex flex-col w-full",
          month: "space-y-2 w-full",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          table: "w-full border-collapse table-fixed",
          head_row: "flex w-full",
          head_cell:
            "text-muted-foreground rounded-md flex-1 min-w-0 font-medium text-[10px] sm:text-xs uppercase tracking-wide py-1 sm:py-2",
          row: "flex w-full mt-1.5 sm:mt-2",
          cell: "flex-1 min-w-0 aspect-square text-center text-sm p-0 relative",
          day: "h-full w-full min-w-0 p-0 font-normal rounded-md border border-border/40 hover:bg-muted/60 hover:border-border transition-colors flex items-start justify-start overflow-hidden",
          day_today: "bg-muted/60 border-primary/50 font-semibold",
          day_outside: "text-muted-foreground/40 border-transparent",
        }}
        components={{
          DayContent: ({ date }) => {
            const key = format(date, "yyyy-MM-dd");
            const dayTrips = byDate.get(key) ?? [];
            const hName = holidayName(date);
            return (
              <div
                className="w-full h-full min-w-0 flex flex-col items-stretch p-0.5 sm:p-1 overflow-hidden"
                title={hName}
              >
                <div className="flex items-center gap-1">
                  <span className={cn("text-[11px] sm:text-sm leading-none", hName && "text-red-600 font-semibold")}>
                    {date.getDate()}
                  </span>
                  {hName && (
                    <span className="hidden sm:inline w-1 h-1 rounded-full bg-red-500" />
                  )}
                </div>
                {hName && (
                  <span className="hidden sm:block text-[9px] leading-tight text-red-600/80 truncate">
                    {hName}
                  </span>
                )}
                {dayTrips.length > 0 && (
                  <>
                    {/* Mobile: colored dots */}
                    <div className="flex sm:hidden items-center justify-center gap-0.5 mt-0.5">
                      {dayTrips.slice(0, 3).map((t, i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: tripColor(t) }}
                        />
                      ))}
                    </div>
                    {/* Desktop: pills */}
                    <div className="hidden sm:flex flex-col gap-0.5 w-full min-w-0 mt-1">
                      {dayTrips.slice(0, 2).map((t, i) => {
                        const Icon = icons[t.transport] ?? Compass;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-white leading-tight w-full min-w-0 overflow-hidden"
                            style={{ backgroundColor: tripColor(t) }}
                            title={t.destination}
                          >
                            <Icon className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate min-w-0">{t.destination}</span>
                          </div>
                        );
                      })}
                      {dayTrips.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{dayTrips.length - 2}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          },
        }}
      />


      {upcomingTrips.length > 0 && (
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
          {upcomingTrips.map((t) => {
            const TransportIcon = icons[t.transport] ?? Compass;
            const label = t.kid ?? t.destination;
            return (
              <div
                key={t.id}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: tripColor(t) }}
              >
                <TransportIcon className="w-3 h-3" />
                {label}{t.kid ? ` · ${t.destination}` : ""}
              </div>
            );
          })}

        </div>
      )}
    </Card>
  );
}
