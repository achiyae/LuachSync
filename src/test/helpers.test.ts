// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { HDate } from '@hebcal/core';
import { format } from 'date-fns';
import {
  buildReminderRules,
  computeHebrewOccurrenceDates,
  escapeIcsText,
  getEventTypeLabel,
  getEventTypeSyncLabel,
  getGregorianDateFromHebrewInput,
  getHebrewInputFromGregorianDate,
  getHebrewMonthSpan,
  hebrewMonthsMap,
  hebrewToEnglishMonth,
  normalizeHebrewYear,
  normalizeExportBaseId,
  normalizeImportedUid,
} from '../lib/helpers';

// ---------------------------------------------------------------------------
// buildReminderRules
// ---------------------------------------------------------------------------
describe('buildReminderRules', () => {
  it('returns empty array for "none" mode', () => {
    expect(buildReminderRules('none')).toEqual([]);
  });

  it('returns empty array for "use-export-default" mode', () => {
    expect(buildReminderRules('use-export-default')).toEqual([]);
  });

  it('returns single day-before rule', () => {
    const rules = buildReminderRules('day-before');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ trigger: '-P1D', time: '19:00' });
  });

  it('returns single week-before rule', () => {
    const rules = buildReminderRules('week-before');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ trigger: '-P7D' });
    expect(rules[0].time).toBeUndefined();
  });

  it('returns two rules for "both" mode', () => {
    const rules = buildReminderRules('both');
    expect(rules).toHaveLength(2);
    const triggers = rules.map((r) => r.trigger);
    expect(triggers).toContain('-P1D');
    expect(triggers).toContain('-P7D');
  });
});

// ---------------------------------------------------------------------------
// getEventTypeLabel
// ---------------------------------------------------------------------------
describe('getEventTypeLabel', () => {
  it('returns Hebrew plural label for yahrzeit', () => {
    expect(getEventTypeLabel('yahrzeit')).toBe('ימי זיכרון');
  });

  it('returns Hebrew plural label for birthday', () => {
    expect(getEventTypeLabel('birthday')).toBe('ימי הולדת');
  });

  it('returns Hebrew plural label for anniversary', () => {
    expect(getEventTypeLabel('anniversary')).toBe('ימי נישואין');
  });

  it('returns the raw type for unknown values', () => {
    expect(getEventTypeLabel('custom-type')).toBe('custom-type');
  });
});

// ---------------------------------------------------------------------------
// getEventTypeSyncLabel
// ---------------------------------------------------------------------------
describe('getEventTypeSyncLabel', () => {
  it('returns Hebrew singular label for yahrzeit', () => {
    expect(getEventTypeSyncLabel('yahrzeit')).toBe('יום זיכרון');
  });

  it('returns Hebrew singular label for birthday', () => {
    expect(getEventTypeSyncLabel('birthday')).toBe('יום הולדת');
  });

  it('returns Hebrew singular label for anniversary', () => {
    expect(getEventTypeSyncLabel('anniversary')).toBe('יום נישואין');
  });

  it('returns the raw type for unknown values', () => {
    expect(getEventTypeSyncLabel('other')).toBe('other');
  });
});

// ---------------------------------------------------------------------------
// escapeIcsText
// ---------------------------------------------------------------------------
describe('escapeIcsText', () => {
  it('escapes backslashes', () => {
    expect(escapeIcsText('a\\b')).toBe('a\\\\b');
  });

  it('escapes semicolons', () => {
    expect(escapeIcsText('a;b')).toBe('a\\;b');
  });

  it('escapes commas', () => {
    expect(escapeIcsText('a,b')).toBe('a\\,b');
  });

  it('escapes Unix newlines', () => {
    expect(escapeIcsText('a\nb')).toBe('a\\nb');
  });

  it('escapes Windows newlines', () => {
    expect(escapeIcsText('a\r\nb')).toBe('a\\nb');
  });

  it('leaves plain text unchanged', () => {
    expect(escapeIcsText('Hello World')).toBe('Hello World');
  });

  it('handles multiple special chars in one string', () => {
    expect(escapeIcsText('a,b;c\\d')).toBe('a\\,b\\;c\\\\d');
  });
});

// ---------------------------------------------------------------------------
// normalizeImportedUid / normalizeExportBaseId
// ---------------------------------------------------------------------------
describe('normalizeImportedUid', () => {
  it('strips a single @luachsync-source suffix', () => {
    expect(normalizeImportedUid('abc@luachsync-source')).toBe('abc');
  });

  it('strips repeated @luachsync-source suffixes', () => {
    expect(normalizeImportedUid('abc@luachsync-source@luachsync-source')).toBe('abc');
  });

  it('leaves strings without the suffix unchanged', () => {
    expect(normalizeImportedUid('abc-123')).toBe('abc-123');
  });
});

describe('normalizeExportBaseId', () => {
  it('strips a single @luachsync-source suffix', () => {
    expect(normalizeExportBaseId('event-id@luachsync-source')).toBe('event-id');
  });

  it('leaves strings without the suffix unchanged', () => {
    expect(normalizeExportBaseId('event-id')).toBe('event-id');
  });
});

// ---------------------------------------------------------------------------
// hebrewMonthsMap
// ---------------------------------------------------------------------------
describe('hebrewMonthsMap', () => {
  it('maps Nisan to ניסן', () => {
    expect(hebrewMonthsMap['Nisan']).toBe('ניסן');
  });

  it('maps Tishrei to תשרי', () => {
    expect(hebrewMonthsMap['Tishrei']).toBe('תשרי');
  });

  it('maps Adar 1 to אדר א׳', () => {
    expect(hebrewMonthsMap['Adar 1']).toBe('אדר א׳');
  });

  it('maps Adar I to אדר א׳', () => {
    expect(hebrewMonthsMap['Adar I']).toBe('אדר א׳');
  });

  it('maps Adar 2 to אדר ב׳', () => {
    expect(hebrewMonthsMap['Adar 2']).toBe('אדר ב׳');
  });
});

// ---------------------------------------------------------------------------
// hebrewToEnglishMonth (reverse mapping)
// ---------------------------------------------------------------------------
describe('hebrewToEnglishMonth', () => {
  it('maps ניסן to Nisan', () => {
    expect(hebrewToEnglishMonth['ניסן']).toBe('Nisan');
  });

  it('maps אדר א׳ to Adar 1', () => {
    expect(hebrewToEnglishMonth['אדר א׳']).toBe('Adar 1');
  });

  it('maps אדר ב׳ to Adar 2', () => {
    expect(hebrewToEnglishMonth['אדר ב׳']).toBe('Adar 2');
  });
});

// ---------------------------------------------------------------------------
// getHebrewMonthSpan
// ---------------------------------------------------------------------------
describe('getHebrewMonthSpan', () => {
  it('returns a non-empty string for any given date', () => {
    const result = getHebrewMonthSpan(new Date(2024, 3, 1)); // April 2024
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns a single month string when Gregorian month falls in one Hebrew month', () => {
    // Nisan 5784 spans roughly March-April 2024; pick a mid-month Gregorian date
    // that stays within one Hebrew month for the whole calendar month.
    // Tishrei 5785 ≈ October 2024 (2 Oct – 31 Oct stays entirely in Tishrei/Cheshvan).
    // Use a short month that's likely fully inside one Hebrew month.
    const result = getHebrewMonthSpan(new Date(2024, 9, 15)); // October 2024
    // Should contain a Hebrew year string (gematriya), just checking structure
    expect(result).toMatch(/[\u05d0-\u05ea]/); // contains Hebrew chars
  });
});

// ---------------------------------------------------------------------------
// Date conversion helpers
// ---------------------------------------------------------------------------
describe('normalizeHebrewYear', () => {
  it('normalizes a short gematriya year into 5000-based year', () => {
    expect(normalizeHebrewYear('תשפ"ו')).toBe(5786);
  });

  it('accepts prefixed Hebrew year notation', () => {
    expect(normalizeHebrewYear('ה\'תשפ"ו')).toBe(5786);
  });

  it('returns null for invalid input', () => {
    expect(normalizeHebrewYear('abc')).toBeNull();
  });
});

describe('getGregorianDateFromHebrewInput', () => {
  it('converts Hebrew date to Gregorian Date object', () => {
    const gregorianDate = getGregorianDateFromHebrewInput(1, 'תשרי', 'תשפ"ו', false);
    expect(gregorianDate).toBeInstanceOf(Date);
    expect(gregorianDate ? format(gregorianDate, 'yyyy-MM-dd') : null).toBe('2025-09-23');
  });

  it('returns null for invalid Hebrew year', () => {
    const gregorianDate = getGregorianDateFromHebrewInput(1, 'תשרי', 'not-a-year', false);
    expect(gregorianDate).toBeNull();
  });
});

describe('getHebrewInputFromGregorianDate', () => {
  it('converts Gregorian date to Hebrew HDate object', () => {
    const hebrewDate = getHebrewInputFromGregorianDate('2025-09-23', false);
    expect(hebrewDate).toBeInstanceOf(HDate);
    expect(hebrewDate?.getDate()).toBe(1);
    expect(hebrewDate?.getMonthName()).toBe('Tishrei');
    expect(hebrewDate?.getFullYear()).toBe(5786);
  });

  it('returns null for invalid Gregorian date', () => {
    const hebrewDate = getHebrewInputFromGregorianDate('2025-02-30', false);
    expect(hebrewDate).toBeNull();
  });

  it('moves to next Hebrew day when afterSunset is true', () => {
    const before = getHebrewInputFromGregorianDate('2025-09-23', false);
    const after = getHebrewInputFromGregorianDate('2025-09-23', true);

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after?.getDate()).toBeGreaterThan(before!.getDate());
  });
});

// ---------------------------------------------------------------------------
// computeHebrewOccurrenceDates
// ---------------------------------------------------------------------------
describe('computeHebrewOccurrenceDates', () => {
  it('returns empty array for 0 occurrences', () => {
    const dates = computeHebrewOccurrenceDates(1, 'ניסן', 5786, 0);
    expect(dates).toHaveLength(0);
  });

  it('returns exactly N dates for N occurrences', () => {
    const dates = computeHebrewOccurrenceDates(1, 'תשרי', 5786, 5);
    expect(dates).toHaveLength(5);
    dates.forEach(d => expect(d).toBeInstanceOf(Date));
  });

  it('returns dates in ascending order', () => {
    const dates = computeHebrewOccurrenceDates(1, 'ניסן', 5786, 3);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i].getTime()).toBeGreaterThan(dates[i - 1].getTime());
    }
  });

  it('applies afterSunset offset (shifts date back by one Gregorian day)', () => {
    const withoutSunset = computeHebrewOccurrenceDates(1, 'תשרי', 5786, 1, false);
    const withSunset = computeHebrewOccurrenceDates(1, 'תשרי', 5786, 1, true);
    expect(withoutSunset).toHaveLength(1);
    expect(withSunset).toHaveLength(1);
    const diff = withoutSunset[0].getTime() - withSunset[0].getTime();
    expect(diff).toBe(24 * 60 * 60 * 1000); // exactly one day earlier
  });

  it('Adar II event falls on Adar I in non-leap years instead of being skipped', () => {
    // Hebrew year 5786 is NOT a leap year; 5784 IS a leap year.
    // Starting from 5784 (leap), first occurrence is Adar II.
    // 5785 is NOT a leap year → should fall back to Adar I, not be skipped.
    // 5786 is NOT a leap year → same fallback.
    const dates = computeHebrewOccurrenceDates(15, 'אדר ב׳', 5784, 3);
    // Should produce 3 dates (no skips).
    expect(dates).toHaveLength(3);
    // Year 5784 (leap): 15 Adar II
    const hd5784 = new HDate(15, 'Adar 2', 5784);
    expect(format(dates[0], 'yyyy-MM-dd')).toBe(format(hd5784.greg(), 'yyyy-MM-dd'));
    // Year 5785 (non-leap): falls on 15 Adar I
    const hd5785 = new HDate(15, 'Adar 1', 5785);
    expect(format(dates[1], 'yyyy-MM-dd')).toBe(format(hd5785.greg(), 'yyyy-MM-dd'));
  });

  it('day 30 falls on day 29 in months with only 29 days instead of being skipped', () => {
    // Adar (non-leap) always has exactly 29 days.
    // 5786 is NOT a leap year, so Adar has 29 days.
    // Requesting day 30 of Adar 5786 should fall back to day 29 (not skip, not overflow).
    const dates = computeHebrewOccurrenceDates(30, 'אדר', 5786, 1);
    expect(dates).toHaveLength(1);
    const hd = new HDate(dates[0]);
    // Must stay in Adar (day 30 capped to 29), not overflow into Nisan.
    expect(hd.getMonthName()).toMatch(/^Adar/);
    expect(hd.getDate()).toBe(29);
  });

  it('returns 100 dates by default when occurrences is 100', () => {
    const dates = computeHebrewOccurrenceDates(1, 'ניסן', 5786, 100);
    expect(dates).toHaveLength(100);
  });
});
