'use client';

import { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, Shield, Calendar as CalendarIcon } from 'lucide-react';
import { Navigation } from '@/app/components/Navigation';
import { EventModal, CalendarEvent, EVENT_TYPE_CONFIG, EventType } from './components/EventModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  // 0 = Sunday … 6 = Saturday; we want Monday-first grid
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // convert to Mon=0 … Sun=6
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function eventSpansDay(event: CalendarEvent, date: Date): boolean {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Event chip colours ───────────────────────────────────────────────────────

const EVENT_CHIP_CLASSES: Record<EventType, string> = {
  change_freeze: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
  planned_maintenance: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800',
  incident_window: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
  informational: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFreezes, setActiveFreezes] = useState<CalendarEvent[]>([]);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // ── Fetch events for the visible month (+ a buffer) ──────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(currentYear, currentMonth, 1).toISOString();
      const to = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (res.ok) {
        const data: CalendarEvent[] = await res.json();
        setEvents(data);

        // Determine currently active freezes
        const now = new Date();
        setActiveFreezes(
          data.filter(
            e =>
              e.eventType === 'change_freeze' &&
              new Date(e.startTime) <= now &&
              new Date(e.endTime) >= now
          )
        );
      }
    } catch (err) {
      console.error('Failed to fetch calendar events', err);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── Navigation ────────────────────────────────────────────────────────────
  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  }

  function goToToday() {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }

  // ── Modal handlers ────────────────────────────────────────────────────────
  function openCreateModal(date: Date) {
    setSelectedEvent(null);
    setSelectedDate(date);
    setModalOpen(true);
  }

  function openEditModal(event: CalendarEvent, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(null);
    setModalOpen(true);
  }

  function handleSave(saved: CalendarEvent) {
    setEvents(prev => {
      const idx = prev.findIndex(e => e.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [...prev, saved];
    });
    // Refresh to get accurate active-freeze banner
    fetchEvents();
  }

  function handleDelete(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
    fetchEvents();
  }

  // ── Build calendar grid ───────────────────────────────────────────────────
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth); // 0=Mon

  // Pad with nulls for days before the 1st
  const gridCells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (gridCells.length % 7 !== 0) gridCells.push(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation activePage="calendar" />

      <div className="max-w-content mx-auto px-8 py-8">
        {/* ── Active Freeze Banner ── */}
        {activeFreezes.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
            <Shield className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300 text-sm">
                🚫 Change Freeze Active — Deployments are currently blocked
              </p>
              {activeFreezes.map(f => (
                <p key={f.id} className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                  <strong>{f.title}</strong> — until{' '}
                  {new Date(f.endTime).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white w-52 text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h1>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Today
            </button>
          </div>

          <button
            onClick={() => openCreateModal(today)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(
            ([type, config]) => (
              <span key={type} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${EVENT_CHIP_CLASSES[type]}`}>
                {config.icon}
                {config.label}
              </span>
            )
          )}
        </div>

        {/* ── Calendar Grid ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {DAY_NAMES.map(day => (
              <div
                key={day}
                className="py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 animate-pulse" />
                <span className="text-sm">Loading events…</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {gridCells.map((day, idx) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[110px] border-b border-r border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20"
                    />
                  );
                }

                const cellDate = new Date(currentYear, currentMonth, day);
                const isToday = isSameDay(cellDate, today);
                const isWeekend = cellDate.getDay() === 0 || cellDate.getDay() === 6;
                const dayEvents = events.filter(e => eventSpansDay(e, cellDate));
                const hasFreezeToday = dayEvents.some(e => e.eventType === 'change_freeze');

                return (
                  <div
                    key={day}
                    onClick={() => openCreateModal(cellDate)}
                    className={`min-h-[110px] border-b border-r border-gray-100 dark:border-gray-700/50 p-2 cursor-pointer transition-colors group
                      ${isWeekend ? 'bg-gray-50/70 dark:bg-gray-900/30' : 'bg-white dark:bg-gray-800'}
                      ${hasFreezeToday ? 'ring-1 ring-inset ring-red-200 dark:ring-red-800' : ''}
                      hover:bg-blue-50/50 dark:hover:bg-blue-900/10`}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium transition-colors
                          ${isToday
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-gray-700'
                          }`}
                      >
                        {day}
                      </span>
                      {hasFreezeToday && (
                        <span title="Change freeze active">
                          <Shield className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
                        </span>
                      )}
                    </div>

                    {/* Event chips */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <button
                          key={event.id}
                          onClick={e => openEditModal(event, e)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-xs font-medium truncate transition-opacity hover:opacity-80 ${EVENT_CHIP_CLASSES[event.eventType]}`}
                          title={event.title}
                        >
                          {event.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">
                          +{dayEvents.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Upcoming events list ── */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Events this month
          </h2>
          {events.length === 0 && !loading ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No events scheduled for {MONTH_NAMES[currentMonth]} {currentYear}</p>
              <button
                onClick={() => openCreateModal(today)}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create the first event
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {events
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map(event => {
                  const config = EVENT_TYPE_CONFIG[event.eventType];
                  const start = new Date(event.startTime);
                  const end = new Date(event.endTime);
                  const isActive =
                    start <= new Date() && end >= new Date();

                  return (
                    <div
                      key={event.id}
                      onClick={e => openEditModal(event, e as unknown as React.MouseEvent)}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-sm
                        ${config.bgColor} ${config.borderColor}`}
                    >
                      <span className={`mt-0.5 ${config.color}`}>{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${config.color}`}>{event.title}</span>
                          {isActive && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                              Active now
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">{event.description}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          {' → '}
                          {end.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_CHIP_CLASSES[event.eventType]}`}>
                        {config.label}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* ── Event Modal ── */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        event={selectedEvent}
        defaultDate={selectedDate}
      />
    </div>
  );
}
