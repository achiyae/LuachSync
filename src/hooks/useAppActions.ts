import React from 'react';
import { AppTabId } from '../components/AppShellSidebar';
import { CalendarEvent } from '../types';
import { ExportSettingsState, ImportPayload } from '../views/types';

type UseAppActionsParams = {
  events: CalendarEvent[];
  editingEvent: CalendarEvent | null;
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  setExportSettings: React.Dispatch<React.SetStateAction<ExportSettingsState>>;
  setEditingEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>;
  setActiveTab: React.Dispatch<React.SetStateAction<AppTabId>>;
};

export const useAppActions = ({
  events,
  editingEvent,
  setEvents,
  setExportSettings,
  setEditingEvent,
  setActiveTab,
}: UseAppActionsParams) => {
  const handleSaveEvent = (newEvent: CalendarEvent) => {
    if (editingEvent) {
      setEvents((prevEvents) => prevEvents.map((e) => (e.id === newEvent.id ? newEvent : e)));
      setEditingEvent(null);
    } else {
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    }
    setActiveTab('dashboard');
  };

  const handleEdit = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setActiveTab('add-event');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק אירוע זה?')) {
      setEvents((prevEvents) => prevEvents.filter((e) => e.id !== id));
    }
  };

  const handleClearAll = () => {
    if (events.length === 0) {
      alert('הרשימה כבר ריקה.');
      return;
    }
    if (window.confirm('למחוק את כל האירועים מהרשימה?')) {
      setEvents([]);
      setEditingEvent(null);
      setActiveTab('dashboard');
    }
  };

  const handleImportEvents = (payload: ImportPayload) => {
    setEvents(payload.events);
    if (payload.exportSettings) {
      setExportSettings({
        selectedSchema: payload.exportSettings.selectedSchema,
        reminderMode: payload.exportSettings.reminderMode,
        selectedEventTypes: payload.exportSettings.selectedEventTypes,
        occurrences: payload.exportSettings.occurrences,
      });
    }
    alert(`יובאו בהצלחה ${payload.events.length} אירועים!`);
  };

  return {
    handleSaveEvent,
    handleEdit,
    handleDelete,
    handleClearAll,
    handleImportEvents,
  };
};
