import React, { useEffect, useState } from 'react';
import { CalendarEvent } from '../types';
import {
  DEFAULT_EXPORT_SETTINGS,
  ExportSettingsState,
  PersistedAppState,
} from '../views/types';

const APP_STORAGE_KEY = 'hc4gc.appState.v1';
const LEGACY_EVENTS_STORAGE_KEY = 'hc4gc.events.v1';

export const usePersistedAppState = () => {
  const [appState, setAppState] = useState<PersistedAppState>(() => {
    try {
      const raw = window.localStorage.getItem(APP_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
        return {
          events: Array.isArray(parsed.events) ? parsed.events : [],
          exportSettings: {
            ...DEFAULT_EXPORT_SETTINGS,
            ...(parsed.exportSettings || {}),
            selectedEventTypes: Array.isArray(parsed.exportSettings?.selectedEventTypes)
              ? parsed.exportSettings.selectedEventTypes
              : [],
          },
        };
      }

      const legacyRaw = window.localStorage.getItem(LEGACY_EVENTS_STORAGE_KEY);
      if (legacyRaw) {
        const parsedLegacy = JSON.parse(legacyRaw);
        return {
          events: Array.isArray(parsedLegacy) ? parsedLegacy : [],
          exportSettings: DEFAULT_EXPORT_SETTINGS,
        };
      }
    } catch {
      // Ignore storage parse errors and continue with defaults.
    }

    return {
      events: [],
      exportSettings: DEFAULT_EXPORT_SETTINGS,
    };
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(appState));
    } catch {
      // Ignore storage errors (private mode/quota issues) and keep app functional.
    }
  }, [appState]);

  const setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>> = (updater) => {
    setAppState((prev) => ({
      ...prev,
      events:
        typeof updater === 'function'
          ? (updater as (prevEvents: CalendarEvent[]) => CalendarEvent[])(prev.events)
          : updater,
    }));
  };

  const setExportSettings: React.Dispatch<React.SetStateAction<ExportSettingsState>> = (updater) => {
    setAppState((prev) => ({
      ...prev,
      exportSettings:
        typeof updater === 'function'
          ? (updater as (prevExportSettings: ExportSettingsState) => ExportSettingsState)(prev.exportSettings)
          : updater,
    }));
  };

  return {
    events: appState.events,
    exportSettings: appState.exportSettings,
    setEvents,
    setExportSettings,
  };
};
