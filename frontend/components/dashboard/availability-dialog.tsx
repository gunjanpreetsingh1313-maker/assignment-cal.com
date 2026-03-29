"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services/api";
import { cn } from "@/lib/utils";

const DAYS: { value: number; label: string }[] = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
];

interface AvailabilityDialogProps {
  eventTypeId: number | null;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AvailabilityDialog({
  eventTypeId,
  title,
  open,
  onOpenChange,
  onSaved,
}: AvailabilityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("America/New_York");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    if (!open || !eventTypeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await api.availability.get(eventTypeId);
        if (cancelled) return;
        if (rows.length === 0) {
          setTimezone("America/New_York");
          setStartTime("09:00");
          setEndTime("17:00");
          setSelectedDays([1, 2, 3, 4, 5]);
          return;
        }
        const days = [...new Set(rows.map((r) => r.day_of_week))].sort((a, b) => a - b);
        const first = rows[0];
        setSelectedDays(days);
        setTimezone(first.timezone);
        setStartTime(first.start_time.slice(0, 5));
        setEndTime(first.end_time.slice(0, 5));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load availability");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, eventTypeId]);

  function toggleDay(d: number) {
    setSelectedDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function handleSave() {
    if (!eventTypeId) return;
    if (selectedDays.length === 0) {
      setError("Select at least one weekday.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const slots = selectedDays.map((dayOfWeek) => ({
        dayOfWeek,
        startTime,
        endTime,
      }));
      await api.availability.save({ eventTypeId, timezone, slots });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Availability — {title}</DialogTitle>
          <DialogDescription>
            Choose weekdays and a single daily window (Mon–Sun). Times use your selected IANA timezone
            metadata; slot math uses this wall clock with the requested calendar date.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <Label className="mb-2 block">Weekdays</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const on = selectedDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                          : "border-border bg-background text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="avail-start">Start</Label>
                <Input
                  id="avail-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avail-end">End</Label>
                <Input
                  id="avail-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save availability
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
