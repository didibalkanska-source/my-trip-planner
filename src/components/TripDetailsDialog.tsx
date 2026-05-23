import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";
import { MapPin, Plane, Car, Train, Bus, Sailboat, Compass, Pencil, Trash2, Wallet, CalendarDays, Clock, Check, BedDouble, Package, CalendarCheck, Bike } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Trip } from "./TripForm";
import { totalDays, workdaysBetween } from "@/lib/vacation";

const icons: Record<string, any> = {
  "Самолет": Plane, "Кола": Car, "Влак": Train, "Автобус": Bus, "Яхта": Sailboat, "Колело": Bike, "Друго": Compass,
};

export function TripDetailsDialog({
  trip, open, onOpenChange, onEdit, onDelete,
}: {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!trip) return null;
  const Icon = icons[trip.transport] ?? Compass;
  const days = totalDays(trip.start_date, trip.end_date);
  const wd = trip.uses_vacation ? workdaysBetween(trip.start_date, trip.end_date, { skipFirstDay: trip.departs_after_work }) : 0;
  const over = trip.actual_budget > trip.planned_budget && trip.planned_budget > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-hero flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span>{trip.destination}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            {format(parseISO(trip.start_date), "dd MMM yyyy", { locale: bg })} – {format(parseISO(trip.end_date), "dd MMM yyyy", { locale: bg })}
            <span className="text-xs">· {days} дни</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" /> {trip.transport}
            {trip.airline && trip.transport === "Самолет" && <span>· {trip.airline}</span>}
          </div>
          {trip.flight_time && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Излитане: {format(new Date(trip.flight_time), "dd MMM, HH:mm", { locale: bg })}
            </div>
          )}
          {trip.landing_time && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plane className="w-4 h-4 rotate-90" />
              Кацане в София: {format(new Date(trip.landing_time), "dd MMM, HH:mm", { locale: bg })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="gap-1">
              <Wallet className="w-3 h-3" />
              {trip.actual_budget.toFixed(0)} / {trip.planned_budget.toFixed(0)} лв
            </Badge>
            {trip.has_flight_booking && (
              <Badge variant="outline" className="gap-1"><Check className="w-3 h-3" />Полет{trip.flight_cost > 0 ? ` · ${trip.flight_cost.toFixed(0)} лв` : ""}</Badge>
            )}
            {trip.has_accommodation && (
              <Badge variant="outline" className="gap-1"><BedDouble className="w-3 h-3" />Спане{trip.accommodation_cost > 0 ? ` · ${trip.accommodation_cost.toFixed(0)} лв` : ""}</Badge>
            )}
            {trip.has_car_rental && (
              <Badge variant="outline" className="gap-1"><Car className="w-3 h-3" />Кола{trip.car_cost > 0 ? ` · ${trip.car_cost.toFixed(0)} лв` : ""}</Badge>
            )}
            {trip.has_other_booking && (
              <Badge variant="outline" className="gap-1"><Package className="w-3 h-3" />Друго{trip.other_cost > 0 ? ` · ${trip.other_cost.toFixed(0)} лв` : ""}</Badge>
            )}
            {trip.uses_vacation && wd > 0 && (
              <Badge className="bg-accent text-accent-foreground hover:bg-accent">{wd} раб. дни отпуска</Badge>
            )}
            {trip.uses_vacation && (
              <Badge variant={trip.vacation_requested ? "default" : "outline"} className="gap-1">
                <CalendarCheck className="w-3 h-3" />
                {trip.vacation_requested ? "Отпуска заявена" : "Отпуска незаявена"}
              </Badge>
            )}
            {over && <Badge variant="destructive">Над бюджет</Badge>}
          </div>

          {trip.notes && (
            <div className="pt-2 border-t">
              <p className="text-sm whitespace-pre-wrap">{trip.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onDelete} className="gap-2">
            <Trash2 className="w-4 h-4 text-destructive" /> Изтрий
          </Button>
          <Button onClick={onEdit} className="gap-2">
            <Pencil className="w-4 h-4" /> Редактирай
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
