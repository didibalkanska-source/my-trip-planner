import { useState, useEffect } from "react";
import { z } from "zod";
import { format, isSameDay } from "date-fns";
import { CalendarIcon, Clock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { bg } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Trip = {
  id: string;
  destination: string;
  transport: string;
  airline: string | null;
  flight_time: string | null;
  landing_time: string | null;
  start_date: string;
  end_date: string;
  planned_budget: number;
  actual_budget: number;
  has_flight_booking: boolean;
  flight_cost: number;
  has_accommodation: boolean;
  accommodation_cost: number;
  has_car_rental: boolean;
  car_cost: number;
  has_other_booking: boolean;
  other_cost: number;
  uses_vacation: boolean;
  vacation_requested: boolean;
  departs_after_work: boolean;
  kid: string | null;
  is_event: boolean;
  notes: string | null;
};

const transports = ["Самолет", "Кола", "Автобус", "Яхта", "Колело", "Друго"];
const airlines = ["WizzAir", "Ryanair", "Other"];
const kids = ["Теди", "Мими"];

const schema = z.object({
  destination: z.string().trim().min(1, "Задължително").max(120),
  transport: z.string().min(1),
  planned_budget: z.number().min(0).max(1_000_000),
  actual_budget: z.number().min(0).max(1_000_000),
  notes: z.string().max(1000).optional(),
});

// Helper: split ISO-local into date + "HH:mm"
function splitDateTime(iso: string | null): { date: Date | undefined; time: string } {
  if (!iso) return { date: undefined, time: "" };
  const d = new Date(iso);
  return { date: d, time: format(d, "HH:mm") };
}

function combineDateTime(date: Date | undefined, time: string): string | null {
  if (!date) return null;
  const [hh, mm] = (time || "00:00").split(":").map(Number);
  const d = new Date(date);
  d.setHours(hh || 0, mm || 0, 0, 0);
  return d.toISOString();
}

function DateTimePicker({
  label, date, time, onDateChange, onTimeChange, disabledBefore, disabledAfter, defaultMonth,
}: {
  label: string;
  date: Date | undefined;
  time: string;
  onDateChange: (d: Date | undefined) => void;
  onTimeChange: (t: string) => void;
  disabledBefore?: Date;
  disabledAfter?: Date;
  defaultMonth?: Date;
}) {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("flex-1 justify-start font-normal", !date && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd MMM yyyy", { locale: bg }) : "Избери дата"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              defaultMonth={date ?? defaultMonth ?? disabledBefore}
              disabled={(d) => {
                if (disabledBefore && d < startOfDay(disabledBefore)) return true;
                if (disabledAfter && d > startOfDay(disabledAfter)) return true;
                return false;
              }}
              weekStartsOn={1}
              locale={bg}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <div className="relative">
          <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="time"
            value={time}
            onChange={(e) => onTimeChange(e.target.value)}
            className="pl-8 w-[110px]"
          />
        </div>
      </div>
    </div>
  );
}

export function TripForm({
  open, onOpenChange, userId, trip, prefillDate, onSaved, onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  trip?: Trip | null;
  prefillDate?: Date | null;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const [destination, setDestination] = useState("");
  const [inputReady, setInputReady] = useState(false);
  const [transport, setTransport] = useState("Кола");
  const [airline, setAirline] = useState("WizzAir");
  const [range, setRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [flightDate, setFlightDate] = useState<Date | undefined>(undefined);
  const [flightTimeStr, setFlightTimeStr] = useState("");
  const [landingDate, setLandingDate] = useState<Date | undefined>(undefined);
  const [landingTimeStr, setLandingTimeStr] = useState("");
  const [plannedBudget, setPlannedBudget] = useState("0");
  const [actualBudget, setActualBudget] = useState("0");
  const [hasFlightBooking, setHasFlightBooking] = useState(false);
  const [flightCost, setFlightCost] = useState("0");
  const [hasAccommodation, setHasAccommodation] = useState(false);
  const [accommodationCost, setAccommodationCost] = useState("0");
  const [hasCarRental, setHasCarRental] = useState(false);
  const [carCost, setCarCost] = useState("0");
  const [hasOtherBooking, setHasOtherBooking] = useState(false);
  const [otherCost, setOtherCost] = useState("0");
  const [usesVacation, setUsesVacation] = useState(false);
  const [vacationRequested, setVacationRequested] = useState(false);
  const [departsAfterWork, setDepartsAfterWork] = useState(false);
  const [category, setCategory] = useState<string | null>(null); // "Теди" | "Мими" | "Друго" | null
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  useEffect(() => {
    if (trip) {
      setDestination(trip.destination);
      setTransport(trip.transport);
      setAirline(trip.airline ?? "WizzAir");
      setRange({ from: new Date(trip.start_date), to: new Date(trip.end_date) });
      const ft = splitDateTime(trip.flight_time);
      setFlightDate(ft.date); setFlightTimeStr(ft.time);
      const lt = splitDateTime(trip.landing_time);
      setLandingDate(lt.date); setLandingTimeStr(lt.time);
      setPlannedBudget(String(trip.planned_budget));
      setActualBudget(String(trip.actual_budget));
      setHasFlightBooking(trip.has_flight_booking);
      setFlightCost(String(trip.flight_cost));
      setHasAccommodation(trip.has_accommodation);
      setAccommodationCost(String(trip.accommodation_cost));
      setHasCarRental(trip.has_car_rental);
      setCarCost(String(trip.car_cost));
      setHasOtherBooking(trip.has_other_booking ?? false);
      setOtherCost(String(trip.other_cost ?? 0));
      setUsesVacation(trip.uses_vacation);
      setVacationRequested(trip.vacation_requested ?? false);
      setDepartsAfterWork(trip.departs_after_work ?? false);
      setCategory(trip.is_event ? "Друго" : (trip.kid ?? null));
      setNotes(trip.notes ?? "");
    } else {
      setDestination(""); setTransport("Кола"); setAirline("WizzAir");
      const initial = prefillDate ?? new Date();
      setRange({ from: initial, to: initial });
      setFlightDate(undefined); setFlightTimeStr("");
      setLandingDate(undefined); setLandingTimeStr("");
      setPlannedBudget("0"); setActualBudget("0");
      setHasFlightBooking(false); setFlightCost("0");
      setHasAccommodation(false); setAccommodationCost("0");
      setHasCarRental(false); setCarCost("0");
      setHasOtherBooking(false); setOtherCost("0");
      setUsesVacation(false); setVacationRequested(false); setDepartsAfterWork(false);
      setCategory(null);
      setNotes("");
    }
  }, [trip, open, prefillDate]);

  useEffect(() => {
    if (open) {
      setInputReady(false);
      const t = setTimeout(() => setInputReady(true), 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  // If landing is before flight, clear it
  useEffect(() => {
    if (flightDate && landingDate && landingDate < flightDate && !isSameDay(landingDate, flightDate)) {
      setLandingDate(undefined);
    }
  }, [flightDate, landingDate]);

  // Sync flight/landing with trip range: prefill when empty, clear when outside the range
  useEffect(() => {
    if (transport !== "Самолет") return;
    const from = range?.from;
    const to = range?.to ?? range?.from;
    if (!from || !to) return;
    setFlightDate((prev) => {
      if (!prev) return from;
      if (prev < from || prev > to) return from;
      return prev;
    });
    setLandingDate((prev) => {
      if (!prev) return to;
      if (prev < from || prev > to) return to;
      return prev;
    });
  }, [range?.from, range?.to, transport]);

  const save = async () => {
    const startDate = range?.from;
    const endDate = range?.to ?? range?.from;
    if (!startDate || !endDate) { toast.error("Избери дати"); return; }
    if (endDate < startDate) { toast.error("Крайната дата трябва да е след началната"); return; }
    const parsed = schema.safeParse({
      destination, transport,
      planned_budget: Number(plannedBudget),
      actual_budget: Number(actualBudget),
      notes,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    setSaving(true);
    const isFlight = transport === "Самолет";
    const payload = {
      user_id: userId,
      destination: parsed.data.destination,
      transport: parsed.data.transport,
      airline: isFlight ? airline : null,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      flight_time: isFlight ? combineDateTime(flightDate, flightTimeStr) : null,
      landing_time: isFlight ? combineDateTime(landingDate, landingTimeStr) : null,
      planned_budget: parsed.data.planned_budget,
      actual_budget: parsed.data.actual_budget,
      has_flight_booking: hasFlightBooking,
      flight_cost: hasFlightBooking ? Number(flightCost) || 0 : 0,
      has_accommodation: hasAccommodation,
      accommodation_cost: hasAccommodation ? Number(accommodationCost) || 0 : 0,
      has_car_rental: hasCarRental,
      car_cost: hasCarRental ? Number(carCost) || 0 : 0,
      has_other_booking: hasOtherBooking,
      other_cost: hasOtherBooking ? Number(otherCost) || 0 : 0,
      uses_vacation: category ? false : usesVacation,
      vacation_requested: !category && usesVacation ? vacationRequested : false,
      departs_after_work: !category && usesVacation ? departsAfterWork : false,
      kid: category === "Теди" || category === "Мими" ? category : null,
      is_event: category === "Друго",
      notes: parsed.data.notes || null,
    };
    const { error } = trip
      ? await supabase.from("trips").update(payload).eq("id", trip.id)
      : await supabase.from("trips").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(trip ? "Обновено" : "Добавено");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {category === "Друго"
              ? (trip ? "Редактирай събитие" : "Ново събитие")
              : (trip ? "Редактирай пътуване" : "Ново пътуване")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{category === "Друго" ? "Заглавие" : "Дестинация"}</Label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={category === "Друго" ? "напр. Концерт" : "напр. Барселона"}
              readOnly={!inputReady}
            />
          </div>


          <div className="space-y-2">
            <Label className="text-sm">Тип (по избор)</Label>
            <div className="flex gap-2">
              {[
                { value: "Мими", label: "Мими" },
                { value: "Теди", label: "Теди" },
                { value: "Друго", label: "Събитие" },
              ].map((c) => (
                <Button
                  key={c.value}
                  type="button"
                  variant={category === c.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategory(category === c.value ? null : c.value)}
                  className="flex-1"
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Вид транспорт</Label>
            <Select value={transport} onValueChange={setTransport}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {transports.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{category === "Друго" ? "Период" : "Период на пътуването"}</Label>
            <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start font-normal", !range?.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from ? (
                    range.to && range.to.getTime() !== range.from.getTime()
                      ? `${format(range.from, "dd MMM yyyy", { locale: bg })} – ${format(range.to, "dd MMM yyyy", { locale: bg })}`
                      : format(range.from, "dd MMM yyyy", { locale: bg })
                  ) : "Избери дати"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  defaultMonth={range?.from}
                  onSelect={(r) => {
                    setRange(r);
                    if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) {
                      setRangeOpen(false);
                    }
                  }}
                  numberOfMonths={2}
                  weekStartsOn={1}
                  locale={bg}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {transport === "Самолет" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="space-y-2">
                <Label>Авиокомпания</Label>
                <Select value={airline} onValueChange={setAirline}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {airlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DateTimePicker
                label="Излитане"
                date={flightDate}
                time={flightTimeStr}
                onDateChange={setFlightDate}
                onTimeChange={setFlightTimeStr}
                disabledBefore={range?.from}
                disabledAfter={range?.to ?? range?.from}
                defaultMonth={range?.from}
              />
              <DateTimePicker
                label="Кацане в София"
                date={landingDate}
                time={landingTimeStr}
                onDateChange={setLandingDate}
                onTimeChange={setLandingTimeStr}
                disabledBefore={flightDate ?? range?.from}
                disabledAfter={range?.to ?? range?.from}
                defaultMonth={range?.to ?? range?.from}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Предвиден бюджет</Label>
              <Input type="number" min="0" step="0.01" value={plannedBudget} onChange={(e) => setPlannedBudget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Похарчен</Label>
              <Input type="number" min="0" step="0.01" value={actualBudget} onChange={(e) => setActualBudget(e.target.value)} />
            </div>
          </div>

          {category !== "Друго" && (
            <div className="space-y-3 rounded-lg border p-3">
              <Label className="text-sm">Резервации</Label>
              {[
                ...(transport === "Самолет" ? [{ checked: hasFlightBooking, setChecked: setHasFlightBooking, cost: flightCost, setCost: setFlightCost, label: "Запазен полет" }] : []),
                { checked: hasAccommodation, setChecked: setHasAccommodation, cost: accommodationCost, setCost: setAccommodationCost, label: "Спане" },
                { checked: hasCarRental, setChecked: setHasCarRental, cost: carCost, setCost: setCarCost, label: "Кола под наем" },
                { checked: hasOtherBooking, setChecked: setHasOtherBooking, cost: otherCost, setCost: setOtherCost, label: "Друго" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                  <Checkbox checked={r.checked} onCheckedChange={(v) => r.setChecked(!!v)} id={r.label} />
                  <Label htmlFor={r.label} className="flex-1 font-normal cursor-pointer">{r.label}</Label>
                  <Input
                    type="number" min="0" step="0.01"
                    value={r.cost}
                    onChange={(e) => r.setCost(e.target.value)}
                    disabled={!r.checked}
                    className="w-28"
                    placeholder="€"
                  />
                </div>
              ))}
            </div>
          )}


          {!category && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Ползва отпуска</Label>
                  <p className="text-xs text-muted-foreground">Работните дни се изваждат от баланса</p>
                </div>
                <Switch checked={usesVacation} onCheckedChange={setUsesVacation} />
              </div>
              {usesVacation && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="vacation-requested"
                      checked={vacationRequested}
                      onCheckedChange={(v) => setVacationRequested(!!v)}
                    />
                    <Label htmlFor="vacation-requested" className="font-normal cursor-pointer">
                      Отпуската е заявена
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="departs-after-work"
                      checked={departsAfterWork}
                      onCheckedChange={(v) => setDepartsAfterWork(!!v)}
                    />
                    <Label htmlFor="departs-after-work" className="font-normal cursor-pointer">
                      Заминаване след 16:00 (първият ден не се брои)
                    </Label>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Бележки</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {trip && onDelete && (
                <Button variant="destructive" onClick={onDelete} disabled={saving} size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Отказ</Button>
              <Button onClick={save} disabled={saving}>Запази</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
