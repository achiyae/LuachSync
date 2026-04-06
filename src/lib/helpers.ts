import { HDate, gematriya, gematriyaStrToNum } from '@hebcal/core';
import { startOfMonth, endOfMonth } from 'date-fns';
import { ReminderMode } from '../types';

export type ReminderRule = { id: string; label: string; trigger: string; time?: string };

export const hebrewMonthsMap: Record<string, string> = {
  'Nisan': 'ניסן', 'Iyyar': 'אייר', 'Sivan': 'סיוון', 'Tamuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול',
  'Tishrei': 'תשרי', 'Cheshvan': 'חשוון', 'Heshvan': 'חשוון', 'Kislev': 'כסלו', 'Tevet': 'טבת',
  'Shvat': 'שבט', "Sh'vat": 'שבט', 'Adar 1': 'אדר א׳', 'Adar I': 'אדר א׳', 'Adar 2': 'אדר ב׳', 'Adar II': 'אדר ב׳', 'Adar': 'אדר'
};

export const hebrewToEnglishMonth: Record<string, string> = {
  'ניסן': 'Nisan', 'אייר': 'Iyyar', 'סיוון': 'Sivan', 'תמוז': 'Tamuz', 'אב': 'Av', 'אלול': 'Elul',
  'תשרי': 'Tishrei', 'חשוון': 'Cheshvan', 'כסלו': 'Kislev', 'טבת': 'Tevet', 'שבט': 'Shvat',
  'אדר': 'Adar 1', 'אדר א׳': 'Adar 1', 'אדר ב׳': 'Adar 2'
};

const hebrewOnes = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
const hebrewTens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];
const hebrewHundreds = ['', 'ק', 'ר', 'ש', 'ת'];

export const toHebrewNumeral = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return `${value}`;
  }

  let remaining = Math.floor(value);
  let numeral = '';

  // Hebrew years are usually written without the thousands digit.
  if (remaining >= 5000) {
    remaining -= 5000;
  }

  while (remaining >= 400) {
    numeral += 'ת';
    remaining -= 400;
  }

  if (remaining >= 100) {
    const hundreds = Math.floor(remaining / 100);
    numeral += hebrewHundreds[hundreds];
    remaining %= 100;
  }

  // Avoid יה/יו for 15/16 and use טו/טז per Hebrew convention.
  if (remaining === 15) {
    numeral += 'טו';
    remaining = 0;
  } else if (remaining === 16) {
    numeral += 'טז';
    remaining = 0;
  } else if (remaining >= 10) {
    const tens = Math.floor(remaining / 10);
    numeral += hebrewTens[tens];
    remaining %= 10;
  }

  if (remaining > 0) {
    numeral += hebrewOnes[remaining];
  }

  if (!numeral) {
    return `${value}`;
  }

  if (numeral.length === 1) {
    return `${numeral}'`;
  }

  return `${numeral.slice(0, -1)}"${numeral.slice(-1)}`;
};

export const buildReminderRules = (mode: ReminderMode): ReminderRule[] => {
  switch (mode) {
    case 'day-before':
      return [{ id: 'day_before_19', label: 'יום לפני בשעה 19:00', trigger: '-P1D', time: '19:00' }];
    case 'week-before':
      return [{ id: 'week_before', label: 'שבוע לפני', trigger: '-P7D' }];
    case 'both':
      return [
        { id: 'day_before_19', label: 'יום לפני בשעה 19:00', trigger: '-P1D', time: '19:00' },
        { id: 'week_before', label: 'שבוע לפני', trigger: '-P7D' }
      ];
    default:
      return [];
  }
};

export const getEventTypeLabel = (type: string): string => {
  if (type === 'yahrzeit') return 'ימי זיכרון';
  if (type === 'birthday') return 'ימי הולדת';
  if (type === 'anniversary') return 'ימי נישואין';
  return type;
};

export const getEventTypeSyncLabel = (type: string): string => {
  if (type === 'yahrzeit') return 'יום זיכרון';
  if (type === 'birthday') return 'יום הולדת';
  if (type === 'anniversary') return 'יום נישואין';
  return type;
};

export const escapeIcsText = (value: string): string => value
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

export const normalizeImportedUid = (uid: string): string =>
  uid.replace(/(?:@luachsync-source)+$/, '');

export const normalizeExportBaseId = (id: string): string =>
  id.replace(/(?:@luachsync-source)+$/, '');

export const getHebrewMonthSpan = (date: Date): string => {
  const startH = new HDate(startOfMonth(date));
  const endH = new HDate(endOfMonth(date));
  const startHStr = hebrewMonthsMap[startH.getMonthName()] || startH.getMonthName();
  const endHStr = hebrewMonthsMap[endH.getMonthName()] || endH.getMonthName();
  const startYStr = gematriya(startH.getFullYear());
  const endYStr = gematriya(endH.getFullYear());

  if (startHStr === endHStr) {
    return `${startHStr} ${startYStr}`;
  }
  if (startYStr === endYStr) {
    return `${startHStr}-${endHStr} ${startYStr}`;
  }
  return `${startHStr} ${startYStr} - ${endHStr} ${endYStr}`;
};

// Date conversion helpers used by Add Event flows.

export const normalizeHebrewYear = (yearStr: string): number | null => {
  const cleanYearStr = yearStr.replace(/^ה['״"]?(?=[א-ת])/g, '');
  let y = gematriyaStrToNum(cleanYearStr);
  if (!Number.isFinite(y) || y <= 0) {
    return null;
  }
  if (y < 3000) y += 5000;
  return y;
};

export const getGregorianDateFromHebrewInput = (
  day: number,
  month: string,
  yearStr: string,
  afterSunset: boolean
): Date | null => {
  try {
    const year = normalizeHebrewYear(yearStr);
    if (!year) return null;
    const hd = new HDate(day, hebrewToEnglishMonth[month] || 'Nisan', year);
    const targetHd = afterSunset ? hd.prev() : hd;
    return targetHd.greg();
  } catch {
    return null;
  }
};

export const getHebrewInputFromGregorianDate = (
  gregorianDate: string,
  afterSunset: boolean
): HDate | null => {
  try {
    const [y, m, d] = gregorianDate.split('-').map(Number);
    if (!y || !m || !d) return null;
    const baseDate = new Date(y, m - 1, d);
    if (baseDate.getFullYear() !== y || baseDate.getMonth() !== m - 1 || baseDate.getDate() !== d) {
      return null;
    }

    let hd = new HDate(baseDate);
    if (afterSunset) hd = hd.next();

    return hd;
  } catch {
    return null;
  }
};
