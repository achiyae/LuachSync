export type EventType = 'birthday' | 'anniversary' | 'yahrzeit' | string;

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
}

export interface ZmanimData {
  alotHaShachar: string;
  netzHaChama: string;
  sofZmanKriasShema: string;
  chatzos: string;
  shkiya: string;
}
