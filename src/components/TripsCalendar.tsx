import { useMemo, useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Car, Train, Bus, Sailboat, Compass, Bike, Plus, Pencil, Trash2, Wallet, CalendarDays, MapPin, Check, BedDouble, Package, CalendarCheck, Clock } from "lucide-react";
import type { Trip } from "./TripForm";
import { holidayName } from "@/lib/holidays";
import { cn } from "@/lib/utils";
import { totalDays, workdaysBetween } from "@/lib/vacation";

const icons: Record<string, any> = {
  "Самолет": Plane, "Кола": Car, "Влак": Train, "Автобус": Bus, "Яхта": Sailboat, "Колело": Bike, "Друго": Compass,
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
  onEditTrip,
  onDeleteTrip,
}: {
  trips: Trip[];
  onTripClick?: (trip: Trip, date?: Date) => void;
  onEmptyDayClick?: (date: Date) => void;
  onEditTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
}) {
  const [pickDialogTrips, setPickDialogTrips] = useState<Trip[]>([]);
  const [pickDialogOpen, setPickDialogOpen] = useState(false);
  const [pickDialogDate, setPickDialogDate] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date>(new Date());
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      setMonth((m) => {
        const next = new Date(m);
        next.setMonth(next.getMonth() + (dx < 0 ? 1 : -1));
        return next;
      });
    }
    touchStartX.current = null;
  };

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
    if (dayTrips.length === 0) {
      onEmptyDayClick?.(date);
    } else {
      setPickDialogTrips(dayTrips);
      setPickDialogDate(date);
      setPickDialogOpen(true);
    }
  };

  return (
    <Card className="p-3 sm:p-6 shadow-soft overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base sm:text-lg font-semibold">Календар на пътуванията</h2>
      </div>

      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Calendar
        mode="single"
        selected={undefined}
        onSelect={handleSelect}
        month={month}
        onMonthChange={setMonth}
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
                      {dayTrips.slice(0, 4).map((t, i) => {
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
                      {dayTrips.length > 4 && (
                        <span className="text-[9px] text-muted-foreground">+{dayTrips.length - 4}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          },
        }}
      />
      </div>


      {upcomingTrips.length > 0 && (
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-2">
          {upcomingTrips.map((t) => {
            const TransportIcon = icons[t.transport] ?? Compass;
            const label = t.kid ?? t.destination;
            return (
              <button
                key={t.id}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white cursor-pointer"
                style={{ backgroundColor: tripColor(t) }}
                onClick={() => onTripClick?.(t)}
              >
                <TransportIcon className="w-3 h-3" />
                {label}{t.kid ? ` · ${t.destination}` : ""}
              </button>
            );
          })}

        </div>
      )}

      <Dialog open={pickDialogOpen} onOpenChange={setPickDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <Button
                variant="outline"
                className="gap-2 w-full"
                onClick={() => { setPickDialogOpen(false); onEmptyDayClick?.(pickDialogDate!); }}
              >
                <Plus className="w-4 h-4" /> Добави ново
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {pickDialogTrips.map((t) => {
              const Icon = icons[t.transport] ?? Compass;
              const days = totalDays(t.start_date, t.end_date);
              const wd = t.uses_vacation ? workdaysBetween(t.start_date, t.end_date, { skipFirstDay: t.departs_after_work }) : 0;
              const over = t.actual_budget > t.planned_budget && t.planned_budget > 0;
              return (
                <div key={t.id} className="rounded-xl border overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: tripColor(t) + "22" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tripColor(t) }}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-sm">{t.destination}</span>
                  </div>
                  {/* Info */}
                  <div className="px-4 py-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="w-4 h-4 shrink-0" />
                      {format(parseISO(t.start_date), "d MMM yyyy", { locale: bg })} – {format(parseISO(t.end_date), "d MMM yyyy", { locale: bg })}
                      <span className="text-xs">· {days} дни</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" /> {t.transport}
                      {t.airline && t.transport === "Самолет" && <span>· {t.airline}</span>}
                    </div>
                    {t.flight_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4 shrink-0" />
                        Излитане: {format(new Date(t.flight_time), "dd MMM, HH:mm", { locale: bg })}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <Badge variant="secondary" className="gap-1">
                        <Wallet className="w-3 h-3" />
                        {t.actual_budget.toFixed(0)} / {t.planned_budget.toFixed(0)} €
                      </Badge>
                      {t.has_flight_booking && <Badge variant="outline" className="gap-1"><Check className="w-3 h-3" />Полет{t.flight_cost > 0 ? ` · ${t.flight_cost.toFixed(0)} €` : ""}</Badge>}
                      {t.has_accommodation && <Badge variant="outline" className="gap-1"><BedDouble className="w-3 h-3" />Спане{t.accommodation_cost > 0 ? ` · ${t.accommodation_cost.toFixed(0)} €` : ""}</Badge>}
                      {t.has_car_rental && <Badge variant="outline" className="gap-1"><Car className="w-3 h-3" />Кола{t.car_cost > 0 ? ` · ${t.car_cost.toFixed(0)} €` : ""}</Badge>}
                      {t.has_other_booking && <Badge variant="outline" className="gap-1"><Package className="w-3 h-3" />Друго{t.other_cost > 0 ? ` · ${t.other_cost.toFixed(0)} €` : ""}</Badge>}
                      {t.uses_vacation && wd > 0 && <Badge className="bg-accent text-accent-foreground hover:bg-accent">{wd} раб. дни отпуска</Badge>}
                      {t.uses_vacation && (
                        <Badge variant={t.vacation_requested ? "default" : "outline"} className="gap-1">
                          <CalendarCheck className="w-3 h-3" />
                          {t.vacation_requested ? "Отпуска заявена" : "Отпуска незаявена"}
                        </Badge>
                      )}
                      {over && <Badge variant="destructive">Над бюджет</Badge>}
                    </div>
                    {t.notes && <p className="text-xs text-muted-foreground pt-1 border-t whitespace-pre-wrap">{t.notes}</p>}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 px-4 pb-3">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setPickDialogOpen(false); onDeleteTrip?.(t); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" /> Изтрий
                    </Button>
                    <Button size="sm" className="gap-1.5 ml-auto" onClick={() => { setPickDialogOpen(false); onEditTrip?.(t); }}>
                      <Pencil className="w-3.5 h-3.5" /> Редактирай
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
