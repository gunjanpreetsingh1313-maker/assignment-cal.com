import type { AvailabilityRow, Booking, EventType, SlotsResponse } from "./types";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) msg = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  eventTypes: {
    list: () => json<EventType[]>("/api/event-types"),
    getBySlug: (slug: string) =>
      json<EventType>(`/api/event-types?slug=${encodeURIComponent(slug)}`),
    create: ( body: { title: string; description?: string | null; duration: number; slug: string }) =>
      json<{ id: number }>("/api/event-types", { method: "POST", body: JSON.stringify(body) }),
    update: (
      id: number,
      body: Partial<{ title: string; description: string | null; duration: number; slug: string }>
    ) =>
      json<{ ok: boolean }>(`/api/event-types/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    remove: (id: number) => json<void>(`/api/event-types/${id}`, { method: "DELETE" }),
  },
  availability: {
    get: (eventTypeId: number) => json<AvailabilityRow[]>(`/api/availability/${eventTypeId}`),
    save: (body: {
      eventTypeId: number;
      timezone: string;
      slots: { dayOfWeek: number; startTime: string; endTime: string; timezone?: string }[];
    }) =>
      json<void>("/api/availability", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  bookings: {
    list: () => json<Booking[]>("/api/bookings"),
    create: (body: {
      eventTypeId: number;
      date: string;
      startTime: string;
      name: string;
      email: string;
    }) =>
      json<{
        id: number;
        eventTitle: string;
        date: string;
        startTime: string;
        endTime: string;
        status: string;
      }>("/api/bookings", { method: "POST", body: JSON.stringify(body) }),
    patchStatus: (id: number, status: "CONFIRMED" | "CANCELLED") =>
      json<{ ok: boolean }>(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
  },
  slots: {
    get: (eventTypeId: number, date: string) =>
      json<SlotsResponse>(
        `/api/slots?eventTypeId=${eventTypeId}&date=${encodeURIComponent(date)}`
      ),
  },
};
