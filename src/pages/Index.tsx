import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { parseISO, isWithinInterval, startOfYear, endOfYear, startOfToday, isBefore } from "date-fns";
import { Plane, Plus, LogOut, Wallet, CalendarCheck, TrendingUp, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { TripsCalendar } from "@/components/TripsCalendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TripForm, type Trip } from "@/components/TripForm";
import { TripCard } from "@/components/TripCard";
import { TripDetailsDialog } from "@/components/TripDetailsDialog";
import { workdaysBetween } from "@/lib/vacation";

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [totalDaysOff, setTotalDaysOff] = useState(20);
  const [year, setYear] = useState(new Date().getFullYear());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);
  const [prefillDate, setPrefillDate] = useState<Date | null>(null);
  const calRef = useRef<HTMLDivElement>(null);
  const [calHeight, setCalHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = calRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCalHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [viewingTrip, setViewingTrip] = useState<Trip | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [daysInput, setDaysInput] = useState("20");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    document.title = "Trip Calendar";
  }, []);

  const loadAll = async () => {
    if (!user) return;
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("trips").select("*").order("start_date", { ascending: true }),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);
    setTrips((t as Trip[]) ?? []);
    if (p) {
      setTotalDaysOff(p.total_vacation_days);
      setYear(p.year);
      setDaysInput(String(p.total_vacation_days));
    }
  };

  useEffect(() => { if (user) loadAll(); }, [user]);

  const { usedVacation, requestedVacation, pendingVacation } = useMemo(() => {
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));
    let requested = 0;
    let pending = 0;
    trips
      .filter((t) => t.uses_vacation && isWithinInterval(parseISO(t.start_date), { start, end }))
      .forEach((t) => {
        const wd = workdaysBetween(t.start_date, t.end_date, { skipFirstDay: t.departs_after_work });
        if (t.vacation_requested) requested += wd;
        else pending += wd;
      });
    return { usedVacation: requested + pending, requestedVacation: requested, pendingVacation: pending };
  }, [trips, year]);

  const plannedTotal = trips.reduce((s, t) => s + Number(t.planned_budget), 0);
  const spentTotal = trips.reduce((s, t) => s + Number(t.actual_budget), 0);

  const tripDates = useMemo(() => {
    const dates: Date[] = [];
    trips.forEach((t) => {
      let d = parseISO(t.start_date);
      const end = parseISO(t.end_date);
      while (d <= end) { dates.push(new Date(d)); d.setDate(d.getDate() + 1); }
    });
    return dates;
  }, [trips]);

  const remaining = Math.max(0, totalDaysOff - usedVacation);
  const vacationPct = totalDaysOff > 0 ? Math.min(100, (usedVacation / totalDaysOff) * 100) : 0;

  const saveSettings = async () => {
    const n = Number(daysInput);
    if (!Number.isFinite(n) || n < 0 || n > 365) { toast.error("Невалиден брой"); return; }
    const { error } = await supabase.from("profiles").update({ total_vacation_days: n }).eq("id", user!.id);
    if (error) { toast.error(error.message); return; }
    setTotalDaysOff(n);
    setSettingsOpen(false);
    toast.success("Запазено");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Изтрито");
    loadAll();
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-soft">Зареждане…</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="border-b bg-card/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow">
              <Plane className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Моите пътувания</h1>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)}><Settings className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()}><LogOut className="w-5 h-5" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {(() => {
          const today = startOfToday();
          const upcoming = trips.filter((t) => !isBefore(parseISO(t.end_date), today));
          const past = trips
            .filter((t) => isBefore(parseISO(t.end_date), today))
            .sort((a, b) => b.start_date.localeCompare(a.start_date));

          return (
            <>
              {/* Top: calendar 2/3 + upcoming trips 1/3 */}
              <section className="grid gap-6 lg:grid-cols-3 lg:items-start">
                <div className="lg:col-span-2 min-w-0" ref={calRef}>
                  <TripsCalendar
                    trips={trips}
                    onTripClick={(t, date) => { setViewingTrip(t); setPrefillDate(date ?? null); }}
                    onEmptyDayClick={(d) => { setEditing(null); setPrefillDate(d); setFormOpen(true); }}
                    onEditTrip={(t) => { setEditing(t); setPrefillDate(null); setFormOpen(true); }}
                    onDeleteTrip={async (t) => { await remove(t.id); }}
                  />
                </div>

                <aside className="space-y-4 min-w-0 flex flex-col" style={calHeight ? { height: calHeight } : undefined}>
                  <Button
                    onClick={() => { setEditing(null); setPrefillDate(null); setFormOpen(true); }}
                    className="w-full gap-2 h-12 text-base shadow-glow shrink-0"
                    size="lg"
                  >
                    <Plus className="w-5 h-5" /> Ново пътуване
                  </Button>

                  <Card className="p-4 shadow-soft flex flex-col flex-1 min-h-0">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide shrink-0">
                      Предстоящи ({upcoming.length})
                    </h3>
                    {upcoming.length === 0 ? (
                      <div className="text-center py-6">
                        <Plane className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Няма предстоящи пътувания.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-0">
                        {upcoming.map((t) => (
                          <TripCard key={t.id} trip={t} onClick={() => setViewingTrip(t)} />
                        ))}
                      </div>
                    )}
                  </Card>
                </aside>
              </section>

              {/* Stats */}
              <section className="grid gap-4 md:grid-cols-3">
                <Card className="p-5 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarCheck className="w-4 h-4" /> Отпуска {year}
                    </div>
                    <span className="text-xs font-medium">{usedVacation} / {totalDaysOff}</span>
                  </div>
                  <div className="text-3xl font-bold mb-2">{remaining} <span className="text-base font-normal text-muted-foreground">оставащи</span></div>
                  <Progress value={vacationPct} className="h-2" />
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Заявени</span>
                      <span className="font-semibold">{requestedVacation}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      <span className="text-muted-foreground">Незаявени</span>
                      <span className="font-semibold">{pendingVacation}</span>
                    </span>
                  </div>
                </Card>
                <Card className="p-5 shadow-soft">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Wallet className="w-4 h-4" /> Похарчен бюджет
                  </div>
                  <div className="text-3xl font-bold">{spentTotal.toFixed(0)} <span className="text-base font-normal text-muted-foreground">€</span></div>
                </Card>
                <Card className="p-5 shadow-soft">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <TrendingUp className="w-4 h-4" /> Предвиден бюджет
                  </div>
                  <div className="text-3xl font-bold">{plannedTotal.toFixed(0)} <span className="text-base font-normal text-muted-foreground">€</span></div>
                </Card>
              </section>

              {/* Past trips */}
              {past.length > 0 && (
                <section>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    Минали пътувания ({past.length})
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 opacity-80">
                    {past.map((t) => (
                      <TripCard key={t.id} trip={t} onClick={() => setViewingTrip(t)} />
                    ))}
                  </div>
                </section>
              )}
            </>
          );
        })()}
      </main>


      <TripForm
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setPrefillDate(null); }}
        userId={user.id}
        trip={editing}
        prefillDate={prefillDate}
        onSaved={loadAll}
        onDelete={editing ? async () => { await remove(editing.id); setFormOpen(false); setEditing(null); } : undefined}
      />

      <TripDetailsDialog
        trip={viewingTrip}
        open={!!viewingTrip}
        onOpenChange={(v) => { if (!v) setViewingTrip(null); }}
        onEdit={() => { if (viewingTrip) { setEditing(viewingTrip); setViewingTrip(null); setFormOpen(true); } }}
        onDelete={async () => { if (viewingTrip) { await remove(viewingTrip.id); setViewingTrip(null); } }}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Настройки на отпуската</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Дни отпуска за годината</Label>
              <Input type="number" min="0" max="365" value={daysInput} onChange={(e) => setDaysInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Отказ</Button>
            <Button onClick={saveSettings}>Запази</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
