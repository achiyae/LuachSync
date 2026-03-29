export type EventType = 'birthday' | 'anniversary' | 'yahrzeit' | string;
export type ReminderMode = 'use-export-default' | 'none' | 'day-before' | 'week-before' | 'both';

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  hebrewDate: {
    day: number;
    month: string; // Hebrew month name
    year: number;
    afterSunset?: boolean;
  };
  reminderOverride?: ReminderMode;
}

export interface ZmanimData {
  alotHaShachar: string;
  netzHaChama: string;
  sofZmanKriasShema: string;
  chatzos: string;
  shkiya: string;
}
