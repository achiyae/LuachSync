import { CalendarEvent, ReminderMode } from '../types';

export type ExportSettingsState = {
  selectedSchema: 'ics';
  reminderMode: Exclude<ReminderMode, 'use-export-default'>;
  selectedEventTypes: string[];
  occurrences: number;
};

export type PersistedAppState = {
  events: CalendarEvent[];
  exportSettings: ExportSettingsState;
};

export type ImportPayload = {
  events: CalendarEvent[];
  exportSettings?: ExportSettingsState;
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettingsState = {
  selectedSchema: 'ics',
  reminderMode: 'none',
  selectedEventTypes: [],
  occurrences: 100
};
