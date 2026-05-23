import { format, parseISO } from "date-fns";
import { Plane, Car, Train, Bus, Sailboat, Compass, Bike } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { Trip } from "./TripForm";

const icons: Record<string, any> = {
  "Самолет": Plane, "Кола": Car, "Влак": Train, "Автобус": Bus, "Яхта": Sailboat, "Колело": Bike, "Друго": Compass,
};

const transportBg: Record<string, string> = {
  "Самолет": "bg-sky-500",
  "Кола": "bg-orange-500",
  "Влак": "bg-amber-700",
  "Автобус": "bg-rose-500",
  "Яхта": "bg-teal-500",
  "Колело": "bg-green-500",
  "Друго": "bg-violet-500",
};

export function TripCard({ trip, onClick }: { trip: Trip; onClick?: () => void }) {
  const Icon = icons[trip.transport] ?? Compass;
  const iconBg = trip.is_event
    ? "bg-green-500"
    : trip.kid
      ? "bg-muted-foreground/70"
      : transportBg[trip.transport] ?? "bg-gradient-hero";




  return (
    <Card
      onClick={onClick}
      className="p-4 shadow-soft hover:shadow-glow transition-shadow cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">
            {trip.kid ? `${trip.kid} · ${trip.destination}` : trip.destination}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {format(parseISO(trip.start_date), "dd MMM")} – {format(parseISO(trip.end_date), "dd MMM yyyy")}
          </p>
        </div>
      </div>
    </Card>
  );
}


