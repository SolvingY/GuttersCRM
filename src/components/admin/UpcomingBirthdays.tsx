import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Cake } from "lucide-react";
import { format, addDays, getMonth, getDate } from "date-fns";

export function UpcomingBirthdays() {
  const { data: birthdays = [] } = useQuery({
    queryKey: ["upcoming-birthdays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, birthday")
        .not("birthday", "is", null)
        .eq("is_archived", false);
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date();
  const upcoming = birthdays
    .map((p: any) => {
      const bday = new Date(p.birthday);
      const thisYear = new Date(today.getFullYear(), getMonth(bday), getDate(bday));
      if (thisYear < today) thisYear.setFullYear(thisYear.getFullYear() + 1);
      const daysUntil = Math.floor((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...p, nextBirthday: thisYear, daysUntil };
    })
    .filter((p) => p.daysUntil >= 0 && p.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (upcoming.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 flex items-center gap-2">
        <Cake className="w-4 h-4 text-accent" />
        <h3 className="font-heading uppercase text-sm">🎂 Upcoming Team Member Birthdays</h3>
      </div>
      <div className="p-4 space-y-2">
        {upcoming.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <span className="text-sm font-medium">{p.full_name}</span>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">{format(p.nextBirthday, "MMM d")}</span>
              {p.daysUntil === 0 && <span className="ml-2 text-xs text-accent font-bold">Today! 🎉</span>}
              {p.daysUntil > 0 && p.daysUntil <= 7 && (
                <span className="ml-2 text-xs text-muted-foreground">in {p.daysUntil}d</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
