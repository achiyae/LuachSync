export type EventType = 'birthday' | 'anniversary' | 'yahrzeit' | 'holiday' | 'other';

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  hebrewDate: {
    day: number;
    month: string; // Hebrew month name
    year: number;
  };
  description?: string;
}

export interface ZmanimData {
  alotHaShachar: string;
  netzHaChama: string;
  sofZmanKriasShema: string;
  chatzos: string;
  shkiya: string;
}
