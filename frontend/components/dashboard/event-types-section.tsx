"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Copy, Link as LinkIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { AvailabilityDialog } from "@/components/dashboard/availability-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/api";
import type { EventType } from "@/services/types";

const formSchema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  duration: z.coerce.number().min(15, "Min 15 min").max(24 * 60, "Too long"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers, hyphens"),
});

type FormValues = z.infer<typeof formSchema>;

export function EventTypesSection() {
  const [items, setItems] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EventType | null>(null);
  const [deleting, setDeleting] = useState<EventType | null>(null);
  const [availEvent, setAvailEvent] = useState<EventType | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", description: "", duration: 30, slug: "" },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.eventTypes.list();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (editing) {
      editForm.reset({
        title: editing.title,
        description: editing.description ?? "",
        duration: editing.duration,
        slug: editing.slug,
      });
    }
  }, [editing, editForm]);

  async function onCreate(values: FormValues) {
    await api.eventTypes.create({
      title: values.title,
      description: values.description || null,
      duration: values.duration,
      slug: values.slug,
    });
    setCreateOpen(false);
    createForm.reset({ title: "", description: "", duration: 30, slug: "" });
    await load();
  }

  async function onUpdate(values: FormValues) {
    if (!editing) return;
    await api.eventTypes.update(editing.id, {
      title: values.title,
      description: values.description ?? null,
      duration: values.duration,
      slug: values.slug,
    });
    setEditing(null);
    await load();
  }

  async function onDelete() {
    if (!deleting) return;
    await api.eventTypes.remove(deleting.id);
    setDeleting(null);
    await load();
  }

  function bookingUrl(slug: string) {
    if (typeof window === "undefined") return `/book/${slug}`;
    return `${window.location.origin}/book/${slug}`;
  }

  async function copyLink(slug: string) {
    const url = bookingUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Event types</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create scheduling links, tune availability, and share your public booking URL.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          New event type
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading event types…
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nothing here yet</CardTitle>
            <CardDescription>Add an event type to get a shareable /book/your-slug link.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((et) => (
            <Card key={et.id} className="border-zinc-200/80 shadow-sm dark:border-zinc-800">
              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{et.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {et.description || "No description"}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{et.duration} min</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <code className="rounded-md bg-muted px-2 py-1 text-xs">/book/{et.slug}</code>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => void copyLink(et.slug)}>
                    <Copy className="h-3.5 w-3.5" />
                    {copied === et.slug ? "Copied" : "Copy link"}
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={bookingUrl(et.slug)} target="_blank" rel="noreferrer" className="gap-1">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Open
                    </a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAvailEvent(et)}>
                  Availability
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setEditing(et)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleting(et)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New event type</DialogTitle>
            <DialogDescription>Defines duration and public slug for your booking page.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={createForm.handleSubmit((v) => void onCreate(v).catch((e) => setError(String(e))))}
          >
            <div className="space-y-2">
              <Label htmlFor="c-title">Title</Label>
              <Input id="c-title" {...createForm.register("title")} />
              {createForm.formState.errors.title && (
                <p className="text-xs text-red-600">{createForm.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">Description</Label>
              <Textarea id="c-desc" {...createForm.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-dur">Duration (minutes)</Label>
                <Input id="c-dur" type="number" {...createForm.register("duration")} />
                {createForm.formState.errors.duration && (
                  <p className="text-xs text-red-600">{createForm.formState.errors.duration.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-slug">Slug</Label>
                <Input id="c-slug" placeholder="coffee-chat" {...createForm.register("slug")} />
                {createForm.formState.errors.slug && (
                  <p className="text-xs text-red-600">{createForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit event type</DialogTitle>
            <DialogDescription>Updating slug changes your public URL.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={editForm.handleSubmit((v) => void onUpdate(v).catch((e) => setError(String(e))))}
          >
            <div className="space-y-2">
              <Label htmlFor="e-title">Title</Label>
              <Input id="e-title" {...editForm.register("title")} />
              {editForm.formState.errors.title && (
                <p className="text-xs text-red-600">{editForm.formState.errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-desc">Description</Label>
              <Textarea id="e-desc" {...editForm.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="e-dur">Duration</Label>
                <Input id="e-dur" type="number" {...editForm.register("duration")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-slug">Slug</Label>
                <Input id="e-slug" {...editForm.register("slug")} />
                {editForm.formState.errors.slug && (
                  <p className="text-xs text-red-600">{editForm.formState.errors.slug.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete event type?</DialogTitle>
            <DialogDescription>
              This removes availability and bookings tied to “{deleting?.title}”. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void onDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AvailabilityDialog
        eventTypeId={availEvent?.id ?? null}
        title={availEvent?.title ?? ""}
        open={!!availEvent}
        onOpenChange={(o) => !o && setAvailEvent(null)}
        onSaved={load}
      />
    </div>
  );
}
