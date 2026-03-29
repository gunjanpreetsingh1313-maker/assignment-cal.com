export type BookingStatus = "CONFIRMED" | "CANCELLED";

export interface EventTypeRow {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  slug: string;
  created_at: Date;
}

export interface AvailabilityRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  event_type_id: number;
}

export interface BookingRow {
  id: number;
  name: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  event_type_id: number;
  status: BookingStatus;
  created_at: Date;
}

export interface BookingWithEvent extends BookingRow {
  event_title: string;
  event_slug: string;
  duration: number;
}
