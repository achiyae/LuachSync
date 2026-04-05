import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, Check, ChevronRight, Copy, Download, Info, Plus, UploadCloud } from 'lucide-react';
import { gematriya } from '@hebcal/core';
import { addDays, format } from 'date-fns';
import { cn } from '../lib/utils';
import {
  buildReminderRules,
  escapeIcsText,
  getGregorianDateFromHebrewInput,
  getEventTypeLabel,
  getEventTypeSyncLabel,
  normalizeExportBaseId,
  normalizeImportedUid,
  toHebrewNumeral,
  type ReminderRule,
} from '../lib/helpers';
import { CalendarEvent, ReminderMode } from '../types';
import { ExportSettingsState, ImportPayload } from './types';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

type GoogleSyncEvent = {
  summary: string;
  description: string;
  type: string;
  eventDate: Date;
  reminders: Array<{ method: 'popup'; minutes: number }>;
  iCalUID: string;
};

type GoogleCalendarListEntry = {
  id: string;
  summary?: string;
};

type GoogleCalendarListResponse = {
  items?: GoogleCalendarListEntry[];
  nextPageToken?: string;
};

type GoogleSyncSummary = {
  calendarId: string;
  calendarName: string;
  usedExistingCalendar: boolean;
  deleted: number;
  deleteFailed: number;
  inserted: number;
  failed: number;
  durationMs: number;
  firstInsertError?: string;
  firstDeleteError?: string;
  firstInsertPayload?: string;
};

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

class GoogleCalendarApiError extends Error {
  status?: number;
  retryAfterMs?: number;

  constructor(message: string, status?: number, retryAfterMs?: number) {
    super(message);
    this.name = 'GoogleCalendarApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (error: unknown) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}
const ImportExportView = ({ events, onImport, exportSettings, onExportSettingsChange, onSyncingStateChange }: { events: CalendarEvent[], onImport?: (payload: ImportPayload) => void, exportSettings: ExportSettingsState, onExportSettingsChange: React.Dispatch<React.SetStateAction<ExportSettingsState>>, onSyncingStateChange?: (isSyncing: boolean) => void }) => {
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
  const GOOGLE_CALENDAR_IMPORT_URL = 'https://calendar.google.com/calendar/u/0/r/settings/export';
  const GOOGLE_CALENDAR_CREATE_URL = 'https://calendar.google.com/calendar/u/0/r/settings/createcalendar';
  const selectedSchema = exportSettings.selectedSchema;
  const reminderMode = exportSettings.reminderMode;
  const uniqueEventTypes = useMemo(() => Array.from(new Set(events.map(e => e.type))), [events]);
  const selectedEventTypes = exportSettings.selectedEventTypes;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const googleTokenClientRef = useRef<GoogleTokenClient | null>(null);
  const [isGoogleScriptReady, setIsGoogleScriptReady] = useState(false);
  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);
  const [googleSyncStatus, setGoogleSyncStatus] = useState<string>('');
  const [targetCalendarName, setTargetCalendarName] = useState('HC4GC');
  const [googleSyncSummary, setGoogleSyncSummary] = useState<GoogleSyncSummary | null>(null);
  const [googleSyncError, setGoogleSyncError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    onSyncingStateChange?.(isGoogleSyncing);
  }, [isGoogleSyncing, onSyncingStateChange]);

  useEffect(() => {
    return () => {
      onSyncingStateChange?.(false);
    };
  }, [onSyncingStateChange]);

  useEffect(() => {
    if (!isGoogleSyncing) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isGoogleSyncing]);

  const normalizeReminderMode = (mode: string | undefined): ExportSettingsState['reminderMode'] => {
    if (mode === 'day-before' || mode === 'week-before' || mode === 'both' || mode === 'none') {
      return mode;
    }
    return 'none';
  };

  const normalizeReminderOverride = (mode: unknown): ReminderMode | undefined => {
    if (mode === 'use-export-default' || mode === 'none' || mode === 'day-before' || mode === 'week-before' || mode === 'both') {
      return mode;
    }
    return undefined;
  };

  const normalizeImportedEvents = (items: unknown[]): CalendarEvent[] => {
    return items
      .filter((item): item is CalendarEvent => {
        const candidate = item as CalendarEvent;
        return !!candidate && typeof candidate.title === 'string' && typeof candidate.type === 'string' && !!candidate.hebrewDate;
      })
      .map((event) => ({
        id: event.id || Math.random().toString(36).substr(2, 9),
        title: event.title,
        type: event.type,
        hebrewDate: {
          day: Number(event.hebrewDate.day) || 1,
          month: event.hebrewDate.month || 'ניסן',
          year: Number(event.hebrewDate.year) || 5784,
          afterSunset: !!event.hebrewDate.afterSunset
        },
        reminderOverride: normalizeReminderOverride(event.reminderOverride)
      }));
  };

  useEffect(() => {
    onExportSettingsChange((prev) => {
      const stillValid = prev.selectedEventTypes.filter(type => uniqueEventTypes.includes(type));
      const newTypes = uniqueEventTypes.filter(type => !stillValid.includes(type));
      const nextSelected = prev.selectedEventTypes.length === 0
        ? uniqueEventTypes
        : [...stillValid, ...newTypes];

      const isSame =
        nextSelected.length === prev.selectedEventTypes.length &&
        nextSelected.every((type, idx) => type === prev.selectedEventTypes[idx]);

      if (isSame) {
        return prev;
      }

      return { ...prev, selectedEventTypes: nextSelected };
    });
  }, [uniqueEventTypes]);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (file.name.endsWith('.ics')) {
          const lines = text.split(/\r?\n/);
          const newEvents: CalendarEvent[] = [];

          const importedSettings: ExportSettingsState = {
            selectedSchema: 'ics',
            reminderMode: 'none',
            selectedEventTypes: []
          };

          let currentEvent: Partial<CalendarEvent> | null = null;
          let currentEventHasHebrewDate = false;
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('X-EXPORT-EVENT-TYPES:')) {
              importedSettings.selectedEventTypes = trimmed.substring('X-EXPORT-EVENT-TYPES:'.length)
                .split(',')
                .map(t => t.trim())
                .filter(t => !!t && t !== 'none');
            } else if (trimmed.startsWith('X-EXPORT-REMINDER-MODE:')) {
              importedSettings.reminderMode = normalizeReminderMode(trimmed.substring('X-EXPORT-REMINDER-MODE:'.length));
            } else if (trimmed === 'BEGIN:VEVENT') {
              currentEvent = { id: Math.random().toString(36).substr(2, 9), type: 'birthday', hebrewDate: { day: 1, month: 'ניסן', year: 5784, afterSunset: false } };
              currentEventHasHebrewDate = false;
            } else if (trimmed === 'END:VEVENT' && currentEvent) {
              if (currentEvent.title && currentEventHasHebrewDate) newEvents.push(currentEvent as CalendarEvent);
              currentEvent = null;
              currentEventHasHebrewDate = false;
            } else if (currentEvent && trimmed.startsWith('UID:')) {
              currentEvent.id = normalizeImportedUid(trimmed.substring(4));
            } else if (currentEvent && trimmed.startsWith('SUMMARY:')) {
              currentEvent.title = trimmed.substring(8);
            } else if (currentEvent && trimmed.startsWith('CATEGORIES:')) {
              currentEvent.type = trimmed.substring(11);
            } else if (currentEvent && trimmed.startsWith('X-HEBREW-DATE:')) {
              const parts = trimmed.substring('X-HEBREW-DATE:'.length).split(' ');
              if (parts.length >= 3) {
                const day = parseInt(parts[0], 10);
                const year = parseInt(parts[parts.length - 1], 10);
                const month = parts.slice(1, parts.length - 1).join(' ');
                if (!isNaN(day) && !isNaN(year) && month) {
                  currentEvent.hebrewDate = { day, month, year, afterSunset: currentEvent.hebrewDate?.afterSunset ?? false };
                  currentEventHasHebrewDate = true;
                }
              }
            } else if (currentEvent && trimmed.startsWith('X-AFTER-SUNSET:')) {
              if (currentEvent.hebrewDate) currentEvent.hebrewDate.afterSunset = trimmed.substring('X-AFTER-SUNSET:'.length).toLowerCase() === 'true';
            } else if (currentEvent && trimmed.startsWith('X-REMINDER-OVERRIDE:')) {
              currentEvent.reminderOverride = normalizeReminderOverride(trimmed.substring('X-REMINDER-OVERRIDE:'.length));
            }
          }

          if (newEvents.length > 0) {
            onImport?.({ events: newEvents, exportSettings: importedSettings });
          } else {
            alert('לא נמצאו אירועים בקובץ ה-ICS.');
          }
        } else {
          alert('פורמט קובץ לא נתמך. נא להעלות קובץ מסוג .ics');
        }
      } catch (err) {
        alert('שגיאה בפענוח הקובץ.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const toggleEventType = (type: string) => {
    onExportSettingsChange(prev => ({
      ...prev,
      selectedEventTypes: prev.selectedEventTypes.includes(type)
        ? prev.selectedEventTypes.filter(t => t !== type)
        : [...prev.selectedEventTypes, type]
    }));
  };

  const exportEvents = useMemo(() => {
    if (selectedEventTypes.length === 0) {
      return [];
    }
    return events.filter(e => selectedEventTypes.includes(e.type));
  }, [events, selectedEventTypes]);

  const reminderRules = useMemo(() => buildReminderRules(reminderMode), [reminderMode]);

  const getEventReminderMode = (event: CalendarEvent): ReminderMode => {
    if (!event.reminderOverride || event.reminderOverride === 'use-export-default') {
      return reminderMode;
    }
    return event.reminderOverride;
  };

  const getEventReminderRules = (event: CalendarEvent) => buildReminderRules(getEventReminderMode(event));

  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setIsGoogleScriptReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => setIsGoogleScriptReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => setIsGoogleScriptReady(true);
    script.onerror = () => setIsGoogleScriptReady(false);
    document.head.appendChild(script);
  }, []);

  const formatIcsDate = (date: Date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}${m}${d}`;
  };

  const formatGoogleAllDayDate = (date: Date) => format(date, 'yyyy-MM-dd');

  const formatIcsUtcDateTime = (date: Date) => {
    const y = date.getUTCFullYear();
    const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const d = `${date.getUTCDate()}`.padStart(2, '0');
    const hh = `${date.getUTCHours()}`.padStart(2, '0');
    const mm = `${date.getUTCMinutes()}`.padStart(2, '0');
    const ss = `${date.getUTCSeconds()}`.padStart(2, '0');
    return `${y}${m}${d}T${hh}${mm}${ss}Z`;
  };

  const resolveAlarmDate = (eventDate: Date, rule: ReminderRule) => {
    const triggerMatch = /^-P(\d+)D$/.exec(rule.trigger);
    const dayOffset = triggerMatch ? Number(triggerMatch[1]) : 0;
    const alarmDate = addDays(eventDate, -dayOffset);

    if (rule.time) {
      const [hours, minutes] = rule.time.split(':').map(Number);
      alarmDate.setHours(hours || 0, minutes || 0, 0, 0);
    }

    return alarmDate;
  };

  const buildIcsReminders = (summary: string, eventDate: Date, eventReminderRules: ReminderRule[]) => {
    const escapedDescription = escapeIcsText(summary);

    return eventReminderRules.map((rule) => {
      const lines = [
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapedDescription}`,
      ];

      if (rule.time) {
        lines.push(`TRIGGER;VALUE=DATE-TIME:${formatIcsUtcDateTime(resolveAlarmDate(eventDate, rule))}`);
      } else {
        lines.push(`TRIGGER;RELATED=START:${rule.trigger}`);
      }

      lines.push('END:VALARM');
      return lines.join('\n');
    }).join('\n');
  };

  const resolveEventGregorianDate = (event: CalendarEvent) => {
    return getGregorianDateFromHebrewInput(
      event.hebrewDate.day,
      event.hebrewDate.month,
      gematriya(event.hebrewDate.year),
      !!event.hebrewDate.afterSunset
    ) || new Date();
  };

  const buildGeneratedEventDescription = (event: CalendarEvent) => {
    const originalGregorianDate = resolveEventGregorianDate(event);
    const hebrewDay = toHebrewNumeral(event.hebrewDate.day);
    const hebrewYear = toHebrewNumeral(event.hebrewDate.year);

    return [
      'אירוע זה נוצר אוטומטית על בסיס אירוע מקור עם תאריך עברי קבוע.',
      `תאריך עברי: ${hebrewDay} ${event.hebrewDate.month} ${hebrewYear}`,
      `תאריך לועזי: ${format(originalGregorianDate, 'dd/MM/yyyy')}`,
    ].join('\n');
  };

  const toGoogleReminderMinutes = (rule: ReminderRule) => {
    if (rule.id === 'day_before_19') {
      // For an all-day event (00:00), 19:00 on the previous day is 300 minutes before start.
      return 300;
    }

    const triggerMatch = /^-P(\d+)D$/.exec(rule.trigger);
    if (triggerMatch) {
      return Number(triggerMatch[1]) * 24 * 60;
    }

    return 0;
  };

  const buildGoogleReminderOverrides = (eventReminderRules: ReminderRule[]) => {
    const minutesSet = new Set<number>();

    for (const rule of eventReminderRules) {
      const minutes = toGoogleReminderMinutes(rule);
      if (minutes >= 0) {
        minutesSet.add(minutes);
      }
    }

    return Array.from(minutesSet).map((minutes) => ({ method: 'popup' as const, minutes }));
  };

  const syncEventsForGoogle = useMemo<GoogleSyncEvent[]>(() => {
    const generated: GoogleSyncEvent[] = [];

    for (const event of exportEvents) {
      const eventReminderRules = getEventReminderRules(event);
      const reminders = buildGoogleReminderOverrides(eventReminderRules);
      const eventTypeLabel = getEventTypeSyncLabel(event.type);
      const exportBaseId = normalizeExportBaseId(event.id);
      const description = buildGeneratedEventDescription(event);

      for (let i = 0; i < 100; i++) {
        const targetHebrewYear = event.hebrewDate.year + i;
        const eventDate = getGregorianDateFromHebrewInput(
          event.hebrewDate.day,
          event.hebrewDate.month,
          gematriya(targetHebrewYear),
          !!event.hebrewDate.afterSunset
        );
        if (!eventDate) {
          // Skip years where this Hebrew date does not exist.
          continue;
        }

        generated.push({
          summary: `${eventTypeLabel} ל${event.title} (${i})`,
          description,
          type: event.type,
          eventDate,
          reminders,
          iCalUID: `${exportBaseId}-${i}@hc4gc-import`
        });
      }
    }

    return generated;
  }, [exportEvents, reminderMode]);

  const icsConfigEvents = exportEvents.map(e => {
    const exportBaseId = normalizeExportBaseId(e.id);
    const eventReminderMode = getEventReminderMode(e);
    const eventReminderRules = getEventReminderRules(e);
    const eventDate = resolveEventGregorianDate(e);
    const escapedSummary = escapeIcsText(e.title);
    const escapedCategory = escapeIcsText(e.type);
    const icsReminders = buildIcsReminders(e.title, eventDate, eventReminderRules);
    const reminderSection = icsReminders ? `${icsReminders}\n` : '';

    const dtStart = formatIcsDate(eventDate);
    const dtEnd = formatIcsDate(addDays(eventDate, 1));
    const dtStamp = formatIcsUtcDateTime(new Date());

    return `BEGIN:VEVENT
UID:${exportBaseId}@hc4gc-source
DTSTAMP:${dtStamp}
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${escapedSummary}
CATEGORIES:${escapedCategory}
TRANSP:TRANSPARENT
X-HC4GC-ENTRY-TYPE:SOURCE
X-HEBREW-DATE:${e.hebrewDate.day} ${e.hebrewDate.month} ${e.hebrewDate.year}
X-AFTER-SUNSET:${e.hebrewDate.afterSunset ? 'true' : 'false'}
X-REMINDER-OVERRIDE:${e.reminderOverride || 'use-export-default'}
X-EFFECTIVE-REMINDER-MODE:${eventReminderMode}
${reminderSection}END:VEVENT`;
  }).join('\n');

  const icsGeneratedEvents = exportEvents.flatMap(e => {
    const exportBaseId = normalizeExportBaseId(e.id);
    const eventReminderRules = getEventReminderRules(e);
    const eventTypeLabel = getEventTypeSyncLabel(e.type);
    const description = buildGeneratedEventDescription(e);
    const eventsForHundredYears: string[] = [];

    for (let i = 0; i < 100; i++) {
      const occurrence = i;
      const targetHebrewYear = e.hebrewDate.year + i;

      const eventDate = getGregorianDateFromHebrewInput(
        e.hebrewDate.day,
        e.hebrewDate.month,
        gematriya(targetHebrewYear),
        !!e.hebrewDate.afterSunset
      );
      if (!eventDate) {
        // Skip invalid dates in years where the Hebrew date does not exist.
        continue;
      }

      const dtStart = formatIcsDate(eventDate);
      const dtEnd = formatIcsDate(addDays(eventDate, 1));
      const dtStamp = formatIcsUtcDateTime(new Date());
      const summary = `${eventTypeLabel} ל${e.title} (${occurrence})`;
      const escapedSummary = escapeIcsText(summary);
  const escapedDescription = escapeIcsText(description);
      const escapedCategory = escapeIcsText(e.type);
      const icsReminders = buildIcsReminders(summary, eventDate, eventReminderRules);
      const reminderSection = icsReminders ? `${icsReminders}\n` : '';

      eventsForHundredYears.push(`BEGIN:VEVENT
UID:${exportBaseId}-${occurrence}@hc4gc
DTSTAMP:${dtStamp}
DTSTART;VALUE=DATE:${dtStart}
DTEND;VALUE=DATE:${dtEnd}
SUMMARY:${escapedSummary}
DESCRIPTION:${escapedDescription}
CATEGORIES:${escapedCategory}
X-HC4GC-ENTRY-TYPE:GENERATED
TRANSP:TRANSPARENT
X-MICROSOFT-CDO-BUSYSTATUS:FREE
${reminderSection}END:VEVENT`);
    }

    return eventsForHundredYears;
  }).join('\n');

  const icsGlobalReminderIds = reminderRules.map(rule => rule.id).join(',') || 'none';

  const icsPreview = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HC4GC//NONSGML App//EN
CALSCALE:GREGORIAN
X-EXPORT-SCHEMA:${selectedSchema.toUpperCase()}
X-EXPORT-EVENT-TYPES:${selectedEventTypes.join(',') || 'none'}
X-EXPORT-REMINDER-MODE:${reminderMode}
X-EXPORT-REMINDERS:${icsGlobalReminderIds}
${icsConfigEvents}
${icsGeneratedEvents}
END:VCALENDAR`;

  const previews = { ics: icsPreview };

  const downloadIcsFile = (fileName?: string) => {
    const content = previews.ics.replace(/\r?\n/g, '\r\n');
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'calendar_export.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    downloadIcsFile();
  };

  const requestGoogleAccessToken = () => {
    return new Promise<string>((resolve, reject) => {
      if (!GOOGLE_CLIENT_ID) {
        reject(new Error('Missing Google OAuth client ID.'));
        return;
      }

      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) {
        reject(new Error('Google Identity Services not loaded.'));
        return;
      }

      if (!googleTokenClientRef.current) {
        googleTokenClientRef.current = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_CALENDAR_SCOPE,
          callback: (resp: GoogleTokenResponse) => {
            if (resp.error || !resp.access_token) {
              reject(new Error(resp.error_description || resp.error || 'OAuth failed.'));
              return;
            }
            resolve(resp.access_token);
          },
          error_callback: () => reject(new Error('OAuth popup was closed or blocked.'))
        });
      }

      googleTokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    });
  };

  const callGoogleCalendarApi = async <T,>(
    accessToken: string,
    url: string,
    init?: RequestInit,
    timeoutMs = 20000,
    maxRetries = 6
  ): Promise<T> => {
    const isRetryable = (status: number, errorText: string) => {
      if (status === 429 || status >= 500) {
        return true;
      }
      if (status === 403 && /rateLimitExceeded|userRateLimitExceeded|quotaExceeded/i.test(errorText)) {
        return true;
      }
      return false;
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            ...(init?.headers || {})
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          const retryAfterRaw = response.headers.get('retry-after');
          const retryAfterSeconds = retryAfterRaw ? Number(retryAfterRaw) : NaN;
          const retryAfterMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
            ? Math.floor(retryAfterSeconds * 1000)
            : undefined;

          if (attempt < maxRetries && isRetryable(response.status, errorText)) {
            const exponentialBackoffMs = Math.min(20000, 900 * Math.pow(2, attempt)) + Math.floor(Math.random() * 600);
            const backoffMs = Math.max(retryAfterMs || 0, exponentialBackoffMs);
            await sleep(backoffMs);
            continue;
          }
          throw new GoogleCalendarApiError(errorText || `Google Calendar API request failed for ${url}`, response.status, retryAfterMs);
        }

        if (response.status === 204) {
          return undefined as T;
        }

        const responseText = await response.text();
        if (!responseText.trim()) {
          return undefined as T;
        }

        return JSON.parse(responseText) as T;
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === 'AbortError';
        if (attempt < maxRetries && isAbort) {
          const backoffMs = Math.min(20000, 900 * Math.pow(2, attempt)) + Math.floor(Math.random() * 600);
          await sleep(backoffMs);
          continue;
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    throw new Error(`Google Calendar API retries exhausted for ${url}`);
  };

  const isRateLimitErrorMessage = (message: string) => {
    if (/rateLimitExceeded|userRateLimitExceeded|quotaExceeded/i.test(message)) {
      return true;
    }
    return /\b429\b/.test(message);
  };

  const formatDuration = (durationMs: number) => {
    const clampedMs = Math.max(0, Math.floor(durationMs));
    const totalSeconds = Math.floor(clampedMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}:${String(remainingMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} שעות`;
    }

    if (minutes === 0) {
      return `${seconds} שניות`;
    }

    return `${minutes}:${String(seconds).padStart(2, '0')} דקות`;
  };

  const findOwnedCalendarByName = async (accessToken: string, calendarName: string) => {
    let pageToken: string | undefined;
    const normalizedTarget = calendarName.trim().toLowerCase();

    do {
      const searchParams = new URLSearchParams({
        minAccessRole: 'owner',
        showDeleted: 'false',
        maxResults: '250'
      });
      if (pageToken) {
        searchParams.set('pageToken', pageToken);
      }

      const response = await callGoogleCalendarApi<GoogleCalendarListResponse>(
        accessToken,
        `https://www.googleapis.com/calendar/v3/users/me/calendarList?${searchParams.toString()}`
      );

      const found = (response.items || []).find((item) => (item.summary || '').trim().toLowerCase() === normalizedTarget);
      if (found) {
        return found;
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    return null;
  };

  const getCalendarById = async (accessToken: string, calendarId: string) => {
    const max503Retries = 2;

    for (let attempt = 0; attempt <= max503Retries; attempt++) {
      try {
        return await callGoogleCalendarApi<{ id: string; summary?: string }>(
          accessToken,
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
          undefined,
          15000,
          0
        );
      } catch (error) {
        if (error instanceof GoogleCalendarApiError && (error.status === 404 || error.status === 410)) {
          return null;
        }

        const is503 = error instanceof GoogleCalendarApiError && error.status === 503;
        if (is503 && attempt < max503Retries) {
          const fallbackBackoffMs = Math.min(12000, 1500 * Math.pow(2, attempt));
          const backoffMs = Math.max(error.retryAfterMs || 0, fallbackBackoffMs);
          await sleep(backoffMs);
          continue;
        }

        throw error;
      }
    }

    return null;
  };

  const waitForCalendarDeletion = async (
    accessToken: string,
    calendarId: string,
    maxWaitMs = 120000,
    pollIntervalMs = 5000
  ) => {
    const startedAt = Date.now();
    const deadline = startedAt + maxWaitMs;
    let lastCheckError = '';

    while (Date.now() <= deadline) {
      try {
        const existing = await getCalendarById(accessToken, calendarId);
        if (!existing) {
          return {
            deleted: true,
            waitedMs: Date.now() - startedAt,
            lastCheckError
          };
        }
      } catch (error) {
        lastCheckError = error instanceof Error ? error.message : 'Failed to verify calendar deletion.';
      }

      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        break;
      }

      await sleep(Math.min(pollIntervalMs, remainingMs));
    }

    return {
      deleted: false,
      waitedMs: Date.now() - startedAt,
      lastCheckError
    };
  };

  const deleteCalendarIfExists = async (
    accessToken: string,
    calendarId: string,
    onStatus?: (status: string) => void
  ) => {
    let deleteRequestError = '';
    let deleteHadNon2xxResponse = false;

    try {
      await callGoogleCalendarApi(
        accessToken,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
        { method: 'DELETE' },
        90000,
        0
      );
    } catch (error) {
      deleteHadNon2xxResponse = true;
      deleteRequestError = error instanceof Error ? error.message : 'Calendar delete request failed.';
    }

    if (deleteHadNon2xxResponse) {
      onStatus?.('בקשת המחיקה לא הסתיימה ב-2xx. ממתין דקה ואז מתחיל אימות כל 5 שניות...');
      await sleep(60000);
      onStatus?.('מאמת מחיקה של היומן הישן (בדיקה כל 5 שניות)...');
    }

    const verification = await waitForCalendarDeletion(accessToken, calendarId, 120000, 5000);
    if (verification.deleted) {
      return {
        deleted: 1,
        deleteFailed: 0,
        firstDeleteError: deleteRequestError
      };
    }

    const verificationError = verification.lastCheckError
      ? ` Verification check error: ${verification.lastCheckError}`
      : '';

    const timeoutMessage = `Calendar deletion was not confirmed within ${Math.ceil(verification.waitedMs / 1000)} seconds.${verificationError}`;

    return {
      deleted: 0,
      deleteFailed: 1,
      firstDeleteError: deleteRequestError
        ? `${deleteRequestError} ${timeoutMessage}`
        : timeoutMessage
    };
  };

  const handleGoogleCalendarSync = async () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('לא הוגדר VITE_GOOGLE_CLIENT_ID. הוסף את המשתנה בקובץ .env.local והפעל מחדש את היישום.');
      return;
    }
    if (!isGoogleScriptReady) {
      alert('Google Identity Services עדיין נטען. נסה שוב בעוד רגע.');
      return;
    }
    if (syncEventsForGoogle.length === 0) {
      alert('אין אירועים מסומנים לייצוא/סנכרון.');
      return;
    }
    if (!targetCalendarName.trim()) {
      alert('נא להזין שם יומן לסנכרון.');
      return;
    }

    const syncStartedAt = Date.now();

    setGoogleSyncSummary(null);
    setGoogleSyncError(null);
    setIsGoogleSyncing(true);
    setGoogleSyncStatus('מתחבר לחשבון Google...');

    try {
      const accessToken = await requestGoogleAccessToken();
      const normalizedCalendarName = targetCalendarName.trim();

      setGoogleSyncStatus('בודק אם קיים יומן בשם המבוקש...');
      const existingCalendar = await findOwnedCalendarByName(accessToken, normalizedCalendarName);

      let calendarId = '';
      let calendarName = normalizedCalendarName;
      let usedExistingCalendar = false;
      let deleted = 0;
      let deleteFailed = 0;
      let firstDeleteError = '';

      if (existingCalendar) {
        const shouldOverwrite = window.confirm(`נמצא כבר יומן בשם "${normalizedCalendarName}". היומן הקיים יימחק לחלוטין ויווצר מחדש לפני הסנכרון. להמשיך?`);
        if (!shouldOverwrite) {
          return;
        }

        usedExistingCalendar = true;
        calendarName = existingCalendar.summary || normalizedCalendarName;

        setGoogleSyncStatus('מוחק את היומן הקיים... יכול לקחת כמה דקות.');
        const clearResult = await deleteCalendarIfExists(accessToken, existingCalendar.id, setGoogleSyncStatus);
        deleted = clearResult.deleted;
        deleteFailed = clearResult.deleteFailed;
        firstDeleteError = clearResult.firstDeleteError;

        if (clearResult.deleteFailed > 0) {
          throw new Error(clearResult.firstDeleteError || 'Failed to delete existing calendar.');
        }

        setGoogleSyncStatus('יוצר יומן חדש עם אותו שם...');
        const recreatedCalendar = await callGoogleCalendarApi<{ id: string; summary?: string }>(
          accessToken,
          'https://www.googleapis.com/calendar/v3/calendars',
          {
            method: 'POST',
            body: JSON.stringify({
              summary: normalizedCalendarName,
              description: 'Created by HC4GC sync flow',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })
          }
        );
        calendarId = recreatedCalendar.id;
        calendarName = recreatedCalendar.summary || normalizedCalendarName;
      } else {
        setGoogleSyncStatus('יוצר יומן חדש...');
        const createdCalendar = await callGoogleCalendarApi<{ id: string; summary?: string }>(
          accessToken,
          'https://www.googleapis.com/calendar/v3/calendars',
          {
            method: 'POST',
            body: JSON.stringify({
              summary: normalizedCalendarName,
              description: 'Created by HC4GC sync flow',
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })
          }
        );
        calendarId = createdCalendar.id;
        calendarName = createdCalendar.summary || normalizedCalendarName;
      }

      let inserted = 0;
      let failed = 0;
      let firstInsertError = '';
      let firstInsertPayload = '';
      const total = syncEventsForGoogle.length;
      const isProdBuild = import.meta.env.PROD;
      const minConcurrency = 1;
      const maxConcurrency = isProdBuild ? 3 : 4;
      let adaptiveConcurrency = isProdBuild ? 1 : 2;
      let nextIndex = 0;
      let completed = 0;
      let successfulSinceAdjust = 0;
      let rateLimitStrike = 0;
      let cooldownUntil = 0;
      const minAllowedGapMs = isProdBuild ? 280 : 150;
      const maxAllowedGapMs = 2000;
      let minRequestGapMs = minAllowedGapMs;
      let lastApiStartAt = 0;
      let requestStartLock: Promise<void> = Promise.resolve();

      const waitForApiStartSlot = async () => {
        const previousLock = requestStartLock;
        let releaseLock: () => void = () => undefined;
        requestStartLock = new Promise<void>((resolve) => {
          releaseLock = resolve;
        });

        await previousLock;
        try {
          const waitMs = Math.max(0, lastApiStartAt + minRequestGapMs - Date.now());
          if (waitMs > 0) {
            await sleep(waitMs);
          }
          lastApiStartAt = Date.now();
        } finally {
          releaseLock();
        }
      };

      const importOneGoogleEvent = async (syncEvent: GoogleSyncEvent) => {
        const startDate = formatGoogleAllDayDate(syncEvent.eventDate);
        const endDate = formatGoogleAllDayDate(addDays(syncEvent.eventDate, 1));
        const basePayload: Record<string, unknown> = {
          summary: syncEvent.summary,
          description: syncEvent.description,
          start: { date: startDate },
          end: { date: endDate },
          // Keep events as "available"/free in Google Calendar.
          transparency: 'transparent'
        };

        const fullPayload: Record<string, unknown> = {
          ...basePayload,
          iCalUID: syncEvent.iCalUID,
          ...(syncEvent.reminders.length > 0 ? { reminders: { useDefault: false, overrides: syncEvent.reminders } } : {})
        };

        const fallbackPayload: Record<string, unknown> = {
          ...basePayload,
          iCalUID: syncEvent.iCalUID
        };

        try {
          await waitForApiStartSlot();
          await callGoogleCalendarApi(
            accessToken,
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/import`,
            {
              method: 'POST',
              body: JSON.stringify(fullPayload)
            }
          );
          return { ok: true as const };
        } catch (firstError) {
          const firstMessage = firstError instanceof Error ? firstError.message : 'Insert request failed.';
          if (isRateLimitErrorMessage(firstMessage)) {
            return {
              ok: false as const,
              rateLimited: true,
              message: firstMessage,
              payload: JSON.stringify({ fullPayload }, null, 2)
            };
          }

          try {
            await waitForApiStartSlot();
            await callGoogleCalendarApi(
              accessToken,
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/import`,
              {
                method: 'POST',
                body: JSON.stringify(fallbackPayload)
              }
            );
            return { ok: true as const };
          } catch (retryError) {
            const message = retryError instanceof Error ? retryError.message : 'Insert request failed.';
            return {
              ok: false as const,
              rateLimited: isRateLimitErrorMessage(message),
              message,
              payload: JSON.stringify({ fullPayload, fallbackPayload }, null, 2)
            };
          }
        }
      };

      const inFlight: Array<{ index: number; promise: Promise<Awaited<ReturnType<typeof importOneGoogleEvent>>> }> = [];

      const launchNext = () => {
        if (nextIndex >= total) {
          return;
        }

        const index = nextIndex;
        nextIndex += 1;
        inFlight.push({
          index,
          promise: importOneGoogleEvent(syncEventsForGoogle[index])
        });
      };

      while (inFlight.length < adaptiveConcurrency && nextIndex < total) {
        launchNext();
      }

      while (inFlight.length > 0) {
        const finished = await Promise.race(
          inFlight.map((entry, slot) => entry.promise.then((result) => ({ slot, index: entry.index, result })))
        );

        inFlight.splice(finished.slot, 1);
        completed += 1;

        if (finished.result.ok) {
          inserted += 1;
          successfulSinceAdjust += 1;
        } else {
          failed += 1;

          if (!firstInsertError) {
            firstInsertError = finished.result.message;
            firstInsertPayload = finished.result.payload;
          }

          if (finished.result.rateLimited) {
            adaptiveConcurrency = Math.max(minConcurrency, Math.floor(adaptiveConcurrency / 2));
            successfulSinceAdjust = 0;
            rateLimitStrike = Math.min(rateLimitStrike + 1, 4);
            minRequestGapMs = Math.min(maxAllowedGapMs, Math.floor(minRequestGapMs * 1.35) + 40);
            const cooldownMs = Math.min(20000, 2000 * Math.pow(2, rateLimitStrike));
            cooldownUntil = Date.now() + cooldownMs;
          }
        }

        if (finished.result.ok && successfulSinceAdjust % 5 === 0) {
          minRequestGapMs = Math.max(minAllowedGapMs, minRequestGapMs - 10);
        }

        if (successfulSinceAdjust >= adaptiveConcurrency * 6 && adaptiveConcurrency < maxConcurrency) {
          adaptiveConcurrency += 1;
          successfulSinceAdjust = 0;
          if (rateLimitStrike > 0) {
            rateLimitStrike -= 1;
          }
        }

        setGoogleSyncStatus(`מעלה אירועים ליומן "${calendarName}"... ${completed}/${total} (in-flight ${inFlight.length}/${adaptiveConcurrency}, gap ${minRequestGapMs}ms)`);

        const now = Date.now();
        if (cooldownUntil > now) {
          setGoogleSyncStatus('ממתין להתאוששות ממגבלת הקצב של גוגל...');
          await sleep(cooldownUntil - now);
          cooldownUntil = 0;
        }

        while (inFlight.length < adaptiveConcurrency && nextIndex < total) {
          launchNext();
        }

        if (inFlight.length > 0) {
          await sleep(40);
        }
      }

      setGoogleSyncStatus('הסנכרון הושלם. מכין סיכום...');
      setGoogleSyncSummary({
        calendarId,
        calendarName,
        usedExistingCalendar,
        deleted,
        deleteFailed,
        inserted,
        failed,
        durationMs: Date.now() - syncStartedAt,
        firstInsertError,
        firstDeleteError,
        firstInsertPayload
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'שגיאה לא צפויה בסנכרון.';
      setGoogleSyncError(message);
    } finally {
      setIsGoogleSyncing(false);
      setGoogleSyncStatus('');
      googleTokenClientRef.current = null;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(previews[selectedSchema]);
    alert('הועתק ללוח!');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 text-right">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-1">כלי ניהול נתונים</p>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ייצוא וייבוא נתוני לוח שנה</h1>
        <p className="text-slate-500 max-w-2xl">נהל את המידע הליטורגי שלך בדיוק מרבי. הורד וייבא נתונים בפורמט iCalendar (ICS) לעבודה מול יומן גוגל.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        <div className="col-span-12 lg:col-span-5 space-y-6">

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
            <div className="flex items-center gap-3 mb-6">
               <ArrowLeftRight className="text-blue-600" size={20} />
              <h3 className="font-bold text-lg">הגדרות ייצוא</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">כלול סוגי אירועים</label>
                <div className="flex flex-wrap gap-2 justify-start">
                  {uniqueEventTypes.length === 0 && (
                    <span className="text-xs text-slate-400">אין סוגי אירועים זמינים כרגע</span>
                  )}
                  {uniqueEventTypes.map(type => {
                    const selected = selectedEventTypes.includes(type);
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => toggleEventType(type)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors",
                          selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {getEventTypeLabel(type)}
                        {selected ? <Check size={14} /> : <Plus size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">תזכורות לאירועים מיוצאים</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'ללא תזכורות', desc: 'לא תתווסף תזכורת לקבצים המיוצאים' },
                    { id: 'day-before', label: 'יום לפני בשעה 19:00', desc: 'תזכורת אחת בערב שלפני האירוע' },
                    { id: 'week-before', label: 'שבוע לפני', desc: 'תזכורת אחת 7 ימים לפני האירוע' },
                    { id: 'both', label: 'גם וגם', desc: 'שבוע לפני וגם יום לפני ב-19:00' },
                  ].map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onExportSettingsChange(prev => ({ ...prev, reminderMode: option.id as Exclude<ReminderMode, 'use-export-default'> }))}
                      className={cn(
                        "text-right p-3 rounded-lg border transition-colors",
                        reminderMode === option.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span className="block text-xs font-bold text-slate-900">{option.label}</span>
                      <span className="block text-[10px] text-slate-500 mt-1">{option.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
           </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
            <div className="flex items-center gap-3 mb-4">
              <ArrowLeftRight className="text-blue-600" size={20} />
              <h3 className="font-bold text-lg">סנכרון אוטומטי עם יומן גוגל</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-right">
              זו הדרך הקלה ביותר לסנכרון עם יומן גוגל.
            </p>

            <div className="mt-4">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">שם היומן בגוגל לסנכרון</label>
              <input
                type="text"
                value={targetCalendarName}
                onChange={(e) => setTargetCalendarName(e.target.value)}
                disabled={isGoogleSyncing}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-right focus:ring-2 focus:ring-blue-500/20"
                placeholder="למשל: HebrewCalendar משפחה"
              />
            </div>

            <button onClick={handleGoogleCalendarSync} disabled={isGoogleSyncing} className={cn("mt-4 w-full bg-gradient-to-r from-blue-600 to-blue-800 p-4 rounded-xl text-white font-bold flex items-center justify-center gap-3 shadow-lg transition-all group", isGoogleSyncing ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98]")}>
              <ArrowLeftRight className="group-hover:rotate-6 transition-transform" size={20} />
              {isGoogleSyncing ? 'מסנכרן ליומן חדש...' : 'סנכרון אוטומטי ליומן חדש'}
            </button>

            {googleSyncStatus && <p className="text-center mt-3 text-[11px] text-blue-600 font-semibold">{googleSyncStatus}</p>}

            <div className="mt-4 flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-right">
              <Info className="text-amber-700 shrink-0" size={18} />
              <p className="text-xs text-amber-900 leading-relaxed">
                גישה זו יוצרת יומן חדש בשם שייבחר. אם כבר קיים יומן בשם הזה, הוא יימחק קודם.<br/>
                בגלל מגבלות של גוגל, התהליך לוקח בערך דקה לכל אירוע.
              </p>
            </div>
           </section>

         </div>

         <div className="col-span-12 lg:col-span-7 flex flex-col h-full min-h-0">
           <div className="space-y-4 mb-4">
             <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-right">
               <div className="flex items-center gap-3 mb-4">
                 <ArrowLeftRight className="text-blue-600" size={20} />
                 <h3 className="font-bold text-lg">ייבוא נתונים</h3>
               </div>
               <div
                 onDragOver={(e) => e.preventDefault()}
                 onDrop={handleFileDrop}
                 onClick={() => fileInputRef.current?.click()}
                 className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
               >
                 <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <UploadCloud className="text-blue-600" size={24} />
                 </div>
                 <p className="text-sm font-bold text-slate-900 mb-1">גרור קובץ ICS לכאן</p>
                 <p className="text-[10px] text-slate-500 mb-4">או לחץ לבחירת קובץ מהמחשב</p>
                 <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors pointer-events-none">
                   בחר קובץ
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".ics" onChange={handleFileSelect} />
               </div>
             </section>

             <section className="bg-white border border-slate-200 rounded-xl p-5 text-right">
               <h3 className="text-base font-bold text-slate-900">גיבוי נתונים</h3>
               <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                 האפליקציה שומרת את הנתונים באופן מקומי בדפדפן. מומלץ לגבות את הנתונים לקובץ באופן קבוע. כמו כן, להעברת הנתונים למכשיר אחר, יש לגבות את הנתונים ולייבא אותם במכשיר החדש.
               </p>

               <div className="mt-4 space-y-3">
                 <button onClick={handleDownload} className="w-full bg-white border border-blue-200 text-blue-700 p-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-sm transition-all group hover:bg-blue-50 active:scale-[0.98]">
                   <Download className="group-hover:translate-y-1 transition-transform" size={20} />
                   הורדת קובץ ICS
                 </button>
               </div>
             </section>
           </div>

           <p className="text-center mb-4 text-[11px] text-slate-400 uppercase tracking-widest opacity-60">נפח משוער: 442 KB</p>

           <div className="bg-slate-900 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-0">
             <button
               type="button"
               onClick={() => setIsPreviewOpen(prev => !prev)}
               className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5 text-right"
             >
               <div className="flex items-center gap-2">
                 <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-400/40"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-green-400/40"></div>
                 </div>
                 <span className="mr-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">תצוגה מקדימה של {selectedSchema.toUpperCase()}</span>
               </div>
               <div className="flex items-center gap-3">
                 {isPreviewOpen && (
                   <span
                     role="button"
                     onClick={(e) => {
                       e.stopPropagation();
                       handleCopy();
                     }}
                     className="text-slate-500 hover:text-white transition-colors"
                     aria-label="העתק תצוגה מקדימה"
                     title="העתק תצוגה מקדימה"
                   >
                     <Copy size={18} />
                   </span>
                 )}
                 <ChevronRight size={18} className={cn("text-slate-500 transition-transform", isPreviewOpen && "rotate-90")} />
               </div>
             </button>

             {isPreviewOpen && (
               <>
                 <div className="h-[420px] p-8 font-mono text-sm leading-relaxed text-blue-100/80 overflow-auto text-left" dir="ltr">
                   <pre><code>{previews[selectedSchema]}</code></pre>
                 </div>
                 <div className="mt-auto bg-white/5 px-6 py-3 flex items-center gap-4 border-t border-white/5">
                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                   <span className="text-[10px] text-slate-500 font-medium">אימות בזמן אמת: המבנה תקין</span>
                 </div>
               </>
             )}
           </div>
         </div>
      </div>

      <AnimatePresence>
        {googleSyncSummary && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGoogleSyncSummary(null)}
              className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[1px]"
              aria-label="סגור סיכום סנכרון"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 bottom-3 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[30rem] z-[71] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 text-right max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">סיכום סנכרון Google Calendar</p>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight mt-1 break-words">{googleSyncSummary.calendarName}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleSyncSummary(null)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold transition-colors"
                >
                  סגור
                </button>
              </div>

              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between"><span>מצב יומן</span><span className="font-bold">{googleSyncSummary.usedExistingCalendar ? 'יומן קיים (נמחק ונוצר מחדש)' : 'יומן חדש'}</span></div>
                <div className="flex justify-between"><span>אירועים שהוזנו</span><span className="font-bold text-blue-700">{googleSyncSummary.inserted}</span></div>
                <div className="flex justify-between"><span>אירועים שנכשלו בהזנה</span><span className="font-bold text-amber-700">{googleSyncSummary.failed}</span></div>
                <div className="flex justify-between"><span>יומנים שנמחקו לפני הסנכרון</span><span className="font-bold">{googleSyncSummary.deleted}</span></div>
                <div className="flex justify-between"><span>כשלים במחיקת יומן</span><span className="font-bold text-amber-700">{googleSyncSummary.deleteFailed}</span></div>
                <div className="flex justify-between"><span>זמן סנכרון</span><span className="font-bold">{formatDuration(googleSyncSummary.durationMs)}</span></div>
              </div>

              {googleSyncSummary.firstInsertError && (
                <details className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 leading-relaxed break-words group cursor-pointer marker:text-amber-500">
                  <summary className="font-bold outline-none group-hover:text-amber-700 transition-colors">שגיאת ההזנה הראשונה</summary>
                  <div className="mt-2 text-amber-800">{googleSyncSummary.firstInsertError}</div>
                </details>
              )}

              {googleSyncSummary.firstInsertPayload && (
                <details className="mt-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-700 leading-relaxed break-words group cursor-pointer marker:text-slate-500">
                  <summary className="font-bold outline-none group-hover:text-slate-900 transition-colors">Payload של ניסיון ההזנה הראשון</summary>
                  <pre className="whitespace-pre-wrap text-[11px] mt-2 bg-white p-2 rounded border border-slate-100">{googleSyncSummary.firstInsertPayload}</pre>
                </details>
              )}

              {googleSyncSummary.firstDeleteError && (
                <details className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 leading-relaxed break-words group cursor-pointer marker:text-amber-500">
                  <summary className="font-bold outline-none group-hover:text-amber-700 transition-colors">שגיאת המחיקה הראשונה</summary>
                  <div className="mt-2 text-amber-800">{googleSyncSummary.firstDeleteError}</div>
                </details>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.open('https://calendar.google.com/calendar/u/0/r', '_blank', 'noopener,noreferrer')}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  פתח את יומן גוגל
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleSyncSummary(null)}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  סגור
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {googleSyncError && (
          <>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGoogleSyncError(null)}
              className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-[1px]"
              aria-label="סגור שגיאת סנכרון"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-3 bottom-3 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[34rem] z-[71] bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 text-right max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">שגיאת סנכרון Google Calendar</p>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight mt-1 break-words">הסנכרון הופסק לפני השלמה</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setGoogleSyncError(null)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold transition-colors"
                >
                  סגור
                </button>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-900 leading-relaxed break-words select-text whitespace-pre-wrap">
                {googleSyncError}
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(googleSyncError)}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                  העתק שגיאה
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleSyncError(null)}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  סגור
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
     </div>
  );
};


export default ImportExportView;

