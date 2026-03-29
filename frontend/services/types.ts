export interface EventType {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  slug: string;
  created_at: string;
}

export interface AvailabilityRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone: string;
  event_type_id: number;
}

export type BookingStatus = "CONFIRMED" | "CANCELLED";

export interface Booking {
  id: number;
  name: string;
  email: string;
  date: string;
  start_time: string;
  end_time: string;
  event_type_id: number;
  status: BookingStatus;
  created_at: string;
  event_title: string;
  event_slug: string;
  duration: number;
}

export interface SlotDto {
  startTime: string;
  endTime: string;
}

export interface SlotsResponse {
  eventType: EventType;
  slots: SlotDto[];
}
