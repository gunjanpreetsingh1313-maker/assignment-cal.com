"use client";

import { useEffect, useMemo, useState } from "react";
import { format, isBefore, parse, parseISO, startOfToday } from "date-fns";
import { Loader2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import type { Booking } from "@/services/types";

function formatBookingDateTime(date: string, time: string) {
  const d = parseISO(date);
  const t = parse(time.length === 5 ? `${time}:00` : time, "HH:mm:ss", d);
  return format(t, "EEE, MMM d · h:mm a");
}

export function BookingsSection() {
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = startOfToday();

  const { upcoming, past } = useMemo(() => {
    const upcoming = items
      .filter((b) => !isBefore(parseISO(b.date), today))
      .sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
    const past = items
      .filter((b) => isBefore(parseISO(b.date), today))
      .sort((a, b) => `${b.date} ${b.start_time}`.localeCompare(`${a.date} ${a.start_time}`));
    return { upcoming, past };
  }, [items, today]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.bookings.list();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function cancel(id: number) {
    try {
      await api.bookings.patchStatus(id, "CANCELLED");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    }
  }

  function BookingCard({ b, allowCancel }: { b: Booking; allowCancel: boolean }) {
    return (
      <Card className="border-zinc-200/80 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">{b.event_title}</CardTitle>
            <CardDescription>
              {b.name} · {b.email}
            </CardDescription>
          </div>
          <Badge variant={b.status === "CONFIRMED" ? "success" : "secondary"}>{b.status}</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{formatBookingDateTime(b.date, b.start_time)}</p>
          {allowCancel && b.status === "CONFIRMED" && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => void cancel(b.id)}>
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Upcoming sessions and history. Cancel sets status to CANCELLED.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading bookings…
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {upcoming.map((b) => (
                  <BookingCard key={b.id} b={b} allowCancel />
                ))}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Past</h2>
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past bookings.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {past.map((b) => (
                  <BookingCard key={b.id} b={b} allowCancel={false} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
