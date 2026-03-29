"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parse, parseISO, startOfToday } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar as CalendarIcon, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import type { EventType, SlotDto } from "@/services/types";

const bookingFormSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
});

type BookingForm = z.infer<typeof bookingFormSchema>;

function formatSlotLabel(startTime: string) {
  const t = parse(startTime.length === 5 ? `${startTime}:00` : startTime, "HH:mm:ss", new Date(0));
  return format(t, "h:mm a");
}

export function BookPublicClient({ slug }: { slug: string }) {
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    name: string;
    email: string;
  } | null>(null);

  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { name: "", email: "" },
  });

  const today = startOfToday();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const et = await api.eventTypes.getBySlug(slug);
        if (!cancelled) setEventType(et);
      } catch {
        if (!cancelled) setLoadError("This scheduling link could not be found.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!eventType || !date) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    const iso = format(date, "yyyy-MM-dd");
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const res = await api.slots.get(eventType.id, iso);
        if (cancelled) return;
        setSlots(res.slots);
        setSelectedSlot(null);
      } catch (e) {
        if (!cancelled) setSlotsError(e instanceof Error ? e.message : "Could not load times");
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventType, date]);

  const disabledDays = useMemo(
    () => ({
      before: today,
    }),
    [today]
  );

  async function onBook(values: BookingForm) {
    if (!eventType || !date || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await api.bookings.create({
        eventTypeId: eventType.id,
        date: format(date, "yyyy-MM-dd"),
        startTime: selectedSlot.startTime,
        name: values.name,
        email: values.email,
      });
      setConfirm({
        title: res.eventTitle,
        date: res.date,
        startTime: res.startTime,
        endTime: res.endTime,
        name: values.name,
        email: values.email,
      });
      form.reset();
      setSelectedSlot(null);
      // Refresh slots for the day
      const refreshed = await api.slots.get(eventType.id, format(date, "yyyy-MM-dd"));
      setSlots(refreshed.slots);
    } catch (e) {
      form.setError("root", { message: e instanceof Error ? e.message : "Booking failed" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Link unavailable</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!eventType) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (confirm) {
    const prettyDate = format(parseISO(confirm.date), "EEEE, MMMM d, yyyy");
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>You are booked</CardTitle>
            </div>
            <CardDescription>Confirmation details were recorded.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">{confirm.title}</span>
            </p>
            <p className="text-muted-foreground">{prettyDate}</p>
            <p>
              {formatSlotLabel(confirm.startTime)} – {formatSlotLabel(confirm.endTime)}
            </p>
            <p className="text-muted-foreground">
              {confirm.name} · {confirm.email}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setConfirm(null)}>
              Book another time
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:flex-row lg:gap-12">
      <div className="flex-1 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scheduling</p>
        <h1 className="text-3xl font-semibold tracking-tight">{eventType.title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{eventType.description}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{eventType.duration} min</span>
        </div>
      </div>

      <div className="flex-[1.1] space-y-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Select date &amp; time</CardTitle>
            <CardDescription>Times respect your host availability and exclude taken slots.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 md:grid-cols-[auto,1fr]">
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-[260px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={disabledDays}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              {date == null && <p className="text-sm text-muted-foreground">Choose a day to see open times.</p>}
              {date && slotsLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading slots…
                </div>
              )}
              {slotsError && <p className="text-sm text-red-600">{slotsError}</p>}
              {date && !slotsLoading && slots.length === 0 && (
                <p className="text-sm text-muted-foreground">No availability for this date.</p>
              )}
              <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
                {slots.map((s) => (
                  <Button
                    key={s.startTime}
                    type="button"
                    variant={selectedSlot?.startTime === s.startTime ? "default" : "outline"}
                    size="sm"
                    className="justify-center"
                    onClick={() => setSelectedSlot(s)}
                  >
                    {formatSlotLabel(s.startTime)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your details</CardTitle>
            <CardDescription>We only store this for the meeting invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={form.handleSubmit((v) => void onBook(v))}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="b-name">Name</Label>
                  <Input id="b-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="b-email">Email</Label>
                  <Input id="b-email" type="email" {...form.register("email")} />
                  {form.formState.errors.email && (
                    <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
                  )}
                </div>
              </div>
              {form.formState.errors.root && (
                <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
              )}
              <Button type="submit" disabled={!selectedSlot || !date || submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm booking
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
