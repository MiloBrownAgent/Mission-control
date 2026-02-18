"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Trash2,
} from "lucide-react";
import { CreateEventDialog } from "./create-event-dialog";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { cn } from "@/lib/utils";

const typeConfig = {
  event: { label: "Event", color: "bg-blue-500" },
  task: { label: "Task", color: "bg-orange-500" },
  cron: { label: "Cron", color: "bg-purple-500" },
  reminder: { label: "Reminder", color: "bg-green-500" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Doc<"events"> | null>(
    null
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const events = useQuery(api.events.listByMonth, {
    startDate: format(monthStart, "yyyy-MM-dd"),
    endDate: format(monthEnd, "yyyy-MM-dd"),
  });

  const deleteEvent = useMutation(api.events.remove);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Events for a specific date
  const getEventsForDate = (date: Date) => {
    if (!events) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDateEvents = selectedDate
    ? getEventsForDate(selectedDate)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            {events?.length ?? 0} events this month
          </p>
        </div>
        <CreateEventDialog />
      </div>

      {/* Calendar Header */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-xs font-medium text-muted-foreground"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells for days before month starts */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[100px] border-b border-r border-border bg-muted/10 p-2"
            />
          ))}

          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[100px] cursor-pointer border-b border-r border-border p-2 transition-colors hover:bg-accent/30",
                  isSelected && "bg-accent/50",
                  isToday(day) && "bg-primary/5"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      isToday(day) &&
                        "bg-primary font-bold text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <button
                      key={event._id}
                      className={cn(
                        "flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[10px] font-medium transition-colors hover:opacity-80",
                        typeConfig[event.type].color + "/20",
                        "text-foreground"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      <div
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          typeConfig[event.type].color
                        )}
                      />
                      <span className="truncate">{event.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="px-1.5 text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events Panel */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold">
              {format(selectedDate, "EEEE, MMMM d")}
            </h4>
            <CreateEventDialog
              defaultDate={format(selectedDate, "yyyy-MM-dd")}
              trigger={
                <Button variant="outline" size="sm">
                  Add Event
                </Button>
              }
            />
          </div>
          <div className="space-y-2">
            {selectedDateEvents.map((event) => (
              <div
                key={event._id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/30"
                onClick={() => setSelectedEvent(event)}
              >
                <div
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    typeConfig[event.type].color
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{event.title}</p>
                  {event.time && (
                    <p className="text-xs text-muted-foreground">
                      {event.time}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {typeConfig[event.type].label}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent>
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      typeConfig[selectedEvent.type].color
                    )}
                  />
                  <Badge variant="outline">
                    {typeConfig[selectedEvent.type].label}
                  </Badge>
                </div>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedEvent.date + "T12:00:00"), "MMMM d, yyyy")}
                  </div>
                  {selectedEvent.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedEvent.time}
                    </div>
                  )}
                </div>
                {selectedEvent.description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {selectedEvent.description}
                  </p>
                )}
                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      deleteEvent({ id: selectedEvent._id });
                      setSelectedEvent(null);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Event
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
