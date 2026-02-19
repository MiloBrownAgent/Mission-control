"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  ListTodo,
  Activity,
  Bell,
  CalendarDays,
} from "lucide-react";
import { CreateEventDialog } from "./create-event-dialog";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { cn } from "@/lib/utils";

const typeConfig = {
  event: { label: "Event", color: "bg-blue-500", text: "text-blue-400", bg: "bg-blue-500/10", icon: CalendarDays },
  task: { label: "Task", color: "bg-orange-500", text: "text-orange-400", bg: "bg-orange-500/10", icon: ListTodo },
  cron: { label: "Cron", color: "bg-purple-500", text: "text-purple-400", bg: "bg-purple-500/10", icon: Activity },
  reminder: { label: "Reminder", color: "bg-emerald-500", text: "text-emerald-400", bg: "bg-emerald-500/10", icon: Bell },
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

  const getEventsForDate = (date: Date) => {
    if (!events) return [];
    const dateStr = format(date, "yyyy-MM-dd");
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDateEvents = selectedDate
    ? getEventsForDate(selectedDate)
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="text-sm text-muted-foreground">
            <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
            {events?.length ?? 0} events this month
          </p>
        </div>
        <CreateEventDialog />
      </div>

      {/* Calendar Grid - Desktop */}
      <div className="hidden md:block rounded-xl border border-border bg-card animate-fade-in-up">
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

        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[100px] border-b border-r border-border bg-muted/5 p-2"
            />
          ))}

          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[100px] cursor-pointer border-b border-r border-border p-2 transition-all duration-150 hover:bg-accent/30",
                  isSelected && "bg-accent/40 ring-1 ring-primary/20 ring-inset",
                  isToday(day) && "bg-primary/5"
                )}
                onClick={() => setSelectedDate(day)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                      isToday(day) &&
                        "bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[9px] font-medium text-muted-foreground">
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
                        typeConfig[event.type].color + "/15",
                        typeConfig[event.type].text
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

      {/* Mobile Calendar - Month nav + List view */}
      <div className="md:hidden space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Mini day selector */}
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">
              {day.charAt(0)}
            </div>
          ))}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative flex flex-col items-center rounded-lg py-1.5 text-xs transition-all",
                  isSelected && "bg-primary text-primary-foreground",
                  isToday(day) && !isSelected && "bg-gradient-to-br from-blue-500/20 to-purple-500/20 font-bold",
                  !isSelected && !isToday(day) && "hover:bg-accent/50"
                )}
              >
                {format(day, "d")}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event._id}
                        className={cn("h-1 w-1 rounded-full", isSelected ? "bg-primary-foreground" : typeConfig[event.type].color)}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile events list */}
        {selectedDate && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                {format(selectedDate, "EEEE, MMM d")}
              </h4>
              <CreateEventDialog
                defaultDate={format(selectedDate, "yyyy-MM-dd")}
                trigger={
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    Add
                  </Button>
                }
              />
            </div>
            {selectedDateEvents.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No events</p>
            ) : (
              selectedDateEvents.map((event) => {
                const config = typeConfig[event.type];
                const TypeIcon = config.icon;
                return (
                  <Card
                    key={event._id}
                    className="border-border bg-card p-3 transition-all duration-150 hover:shadow-md"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bg, config.text)}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.time && (
                          <p className="text-xs text-muted-foreground">{event.time}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", config.text)}>
                        {config.label}
                      </Badge>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Selected Date Events Panel - Desktop */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="hidden md:block rounded-xl border border-border bg-card p-4 animate-fade-in-up">
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
            {selectedDateEvents.map((event) => {
              const config = typeConfig[event.type];
              const TypeIcon = config.icon;
              return (
                <div
                  key={event._id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-all duration-150 hover:bg-accent/30 hover:shadow-sm"
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.bg, config.text)}>
                    <TypeIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.time && (
                      <p className="text-xs text-muted-foreground">
                        {event.time}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("text-[10px]", config.text)}>
                    {config.label}
                  </Badge>
                </div>
              );
            })}
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
                  <div className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg",
                    typeConfig[selectedEvent.type].bg,
                    typeConfig[selectedEvent.type].text
                  )}>
                    {(() => {
                      const TypeIcon = typeConfig[selectedEvent.type].icon;
                      return <TypeIcon className="h-3.5 w-3.5" />;
                    })()}
                  </div>
                  <Badge variant="outline" className={typeConfig[selectedEvent.type].text}>
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
