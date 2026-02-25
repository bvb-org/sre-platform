'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, Info, Wrench, Shield } from 'lucide-react';

export type EventType = 'change_freeze' | 'planned_maintenance' | 'incident_window' | 'informational';

export type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  eventType: EventType;
  startTime: string;
  endTime: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: { id: string; name: string; email: string } | null;
};

type EventModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  event?: CalendarEvent | null;
  defaultDate?: Date | null;
};

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode; description: string }
> = {
  change_freeze: {
    label: 'Change Freeze',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: <Shield className="w-4 h-4" />,
    description: 'Blocks all Azure DevOps deployments during this period',
  },
  planned_maintenance: {
    label: 'Planned Maintenance',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-300 dark:border-orange-700',
    icon: <Wrench className="w-4 h-4" />,
    description: 'Scheduled maintenance window for systems or infrastructure',
  },
  incident_window: {
    label: 'Incident Window',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-300 dark:border-purple-700',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Known period of elevated incident risk or active incident',
  },
  informational: {
    label: 'Informational',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: <Info className="w-4 h-4" />,
    description: 'General informational event (DDoS awareness, DR exercise, etc.)',
  },
};

function toLocalDatetimeValue(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStartForDate(date: Date): string {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return toLocalDatetimeValue(d.toISOString());
}

function defaultEndForDate(date: Date): string {
  const d = new Date(date);
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalDatetimeValue(d.toISOString());
}

export function EventModal({ isOpen, onClose, onSave, onDelete, event, defaultDate }: EventModalProps) {
  const isEditing = !!event;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('informational');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.eventType);
      setStartTime(toLocalDatetimeValue(event.startTime));
      setEndTime(toLocalDatetimeValue(event.endTime));
    } else {
      const base = defaultDate || new Date();
      setTitle('');
      setDescription('');
      setEventType('informational');
      setStartTime(defaultStartForDate(base));
      setEndTime(defaultEndForDate(base));
    }
    setErrors({});
    setShowDeleteConfirm(false);
  }, [isOpen, event, defaultDate]);

  if (!isOpen) return null;

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!startTime) newErrors.startTime = 'Start time is required';
    if (!endTime) newErrors.endTime = 'End time is required';
    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      newErrors.endTime = 'End time must be after start time';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_CALENDAR_API_KEY || '';
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/calendar/events/${event!.id}` : '/api/calendar/events';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          eventType,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setErrors({ form: err.error || 'Failed to save event' });
        return;
      }

      const saved = await response.json();
      onSave(saved);
      onClose();
    } catch {
      setErrors({ form: 'Network error — please try again' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event) return;
    setDeleting(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_CALENDAR_API_KEY || '';
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey },
      });

      if (!response.ok) {
        const err = await response.json();
        setErrors({ form: err.error || 'Failed to delete event' });
        setShowDeleteConfirm(false);
        return;
      }

      onDelete?.(event.id);
      onClose();
    } catch {
      setErrors({ form: 'Network error — please try again' });
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  const selectedConfig = EVENT_TYPE_CONFIG[eventType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Event' : 'New Calendar Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Global error */}
          {errors.form && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {errors.form}
            </div>
          )}

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(EVENT_TYPE_CONFIG) as [EventType, typeof EVENT_TYPE_CONFIG[EventType]][]).map(
                ([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventType(type)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      eventType === type
                        ? `${config.bgColor} ${config.borderColor} ${config.color}`
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className={eventType === type ? config.color : ''}>{config.icon}</span>
                    {config.label}
                  </button>
                )
              )}
            </div>
            {/* Type description */}
            <p className={`mt-2 text-xs ${selectedConfig.color} flex items-center gap-1`}>
              {selectedConfig.icon}
              {selectedConfig.description}
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={
                eventType === 'change_freeze'
                  ? 'e.g. Q4 Release Freeze'
                  : eventType === 'planned_maintenance'
                  ? 'e.g. Database maintenance window'
                  : eventType === 'incident_window'
                  ? 'e.g. Black Friday elevated risk'
                  : 'e.g. DDoS awareness period'
              }
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.title
                  ? 'border-red-400 dark:border-red-600'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-gray-400 text-xs font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Add context, links, or instructions..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Date/Time row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Start <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.startTime
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.startTime && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.startTime}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  End <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.endTime
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.endTime && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.endTime}</p>
              )}
            </div>
          </div>

          {/* Change freeze warning */}
          {eventType === 'change_freeze' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <Shield className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-400">
                <strong>Deployment blocker active.</strong> All Azure DevOps pipelines with the
                Watchtower freeze-check step will fail during this event window.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
          {/* Delete button (edit mode only) */}
          <div>
            {isEditing && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Delete event
              </button>
            )}
            {isEditing && showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">Are you sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { EVENT_TYPE_CONFIG };
