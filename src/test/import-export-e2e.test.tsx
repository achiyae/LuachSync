import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Import/export e2e flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('applies afterSunset when calculating source and generated Gregorian dates in ICS preview', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('luachsync.appState.v1', JSON.stringify({
      events: [
        {
          id: 'event-before',
          title: 'BeforeSunset',
          type: 'birthday',
          hebrewDate: {
            day: 1,
            month: 'תשרי',
            year: 5786,
            afterSunset: false,
          },
        },
        {
          id: 'event-after',
          title: 'AfterSunset',
          type: 'birthday',
          hebrewDate: {
            day: 1,
            month: 'תשרי',
            year: 5786,
            afterSunset: true,
          },
        },
      ],
      exportSettings: {
        selectedSchema: 'ics',
        reminderMode: 'none',
        selectedEventTypes: [],
      },
    }));

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByRole('heading', { name: 'ייצוא וייבוא נתוני לוח שנה' });

    await user.click(screen.getByRole('button', { name: /תצוגה מקדימה של ICS/i }));

    const previewText = screen.getByText((content, element) => (
      element?.tagName.toLowerCase() === 'code' && content.includes('BEGIN:VCALENDAR')
    )).textContent || '';

    const beforeSourceMatch = previewText.match(/UID:event-before@luachsync-source[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);
    const afterSourceMatch = previewText.match(/UID:event-after@luachsync-source[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);
    const beforeGeneratedMatch = previewText.match(/UID:event-before-0@luachsync[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);
    const afterGeneratedMatch = previewText.match(/UID:event-after-0@luachsync[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);

    expect(beforeSourceMatch?.[1]).toBeTruthy();
    expect(afterSourceMatch?.[1]).toBeTruthy();
    expect(beforeGeneratedMatch?.[1]).toBeTruthy();
    expect(afterGeneratedMatch?.[1]).toBeTruthy();

    const toUtcDate = (icsDate: string) => {
      const y = Number(icsDate.slice(0, 4));
      const m = Number(icsDate.slice(4, 6));
      const d = Number(icsDate.slice(6, 8));
      return new Date(Date.UTC(y, m - 1, d));
    };

    const sourceBefore = toUtcDate(beforeSourceMatch![1]);
    const sourceAfter = toUtcDate(afterSourceMatch![1]);
    const generatedBefore = toUtcDate(beforeGeneratedMatch![1]);
    const generatedAfter = toUtcDate(afterGeneratedMatch![1]);

    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(sourceBefore.getTime() - sourceAfter.getTime()).toBe(oneDayMs);
    expect(generatedBefore.getTime() - generatedAfter.getTime()).toBe(oneDayMs);
  });

  it('uses export default reminder for one event and keeps override for another in ICS preview', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('luachsync.appState.v1', JSON.stringify({
      events: [
        {
          id: 'event-1',
          title: 'ישראל ישראלי',
          type: 'birthday',
          hebrewDate: {
            day: 1,
            month: 'תשרי',
            year: 5780,
            afterSunset: false,
          },
        },
        {
          id: 'event-2',
          title: 'משה לוי',
          type: 'birthday',
          hebrewDate: {
            day: 1,
            month: 'חשוון',
            year: 5780,
            afterSunset: false,
          },
          reminderOverride: 'both',
        },
      ],
      exportSettings: {
        selectedSchema: 'ics',
        reminderMode: 'none',
        selectedEventTypes: [],
      },
    }));

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByRole('heading', { name: 'ייצוא וייבוא נתוני לוח שנה' });

    await user.click(screen.getByRole('button', { name: /^שבוע לפני/ }));
    await user.click(screen.getByRole('button', { name: /תצוגה מקדימה של ICS/i }));

    const previewText = screen.getByText((content, element) => (
      element?.tagName.toLowerCase() === 'code' && content.includes('BEGIN:VCALENDAR')
    )).textContent;

    expect(previewText).toContain('SUMMARY:ישראל ישראלי');
    expect(previewText).toContain('SUMMARY:משה לוי');
    expect(previewText).toMatch(/SUMMARY:ישראל ישראלי[\s\S]*?X-EFFECTIVE-REMINDER-MODE:week-before/);
    expect(previewText).toMatch(/SUMMARY:משה לוי[\s\S]*?X-EFFECTIVE-REMINDER-MODE:both/);
  });

  it('generates exactly the configured number of occurrences in ICS preview', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('luachsync.appState.v1', JSON.stringify({
      events: [
        {
          id: 'event-occ',
          title: 'Test Occurrences',
          type: 'birthday',
          hebrewDate: {
            day: 1,
            month: 'תשרי',
            year: 5786,
            afterSunset: false,
          },
        },
      ],
      exportSettings: {
        selectedSchema: 'ics',
        reminderMode: 'none',
        selectedEventTypes: ['birthday'],
        occurrences: 3,
      },
    }));

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByRole('heading', { name: 'ייצוא וייבוא נתוני לוח שנה' });

    await user.click(screen.getByRole('button', { name: /תצוגה מקדימה של ICS/i }));

    const previewText = screen.getByText((content, element) => (
      element?.tagName.toLowerCase() === 'code' && content.includes('BEGIN:VCALENDAR')
    )).textContent || '';

    // Should contain exactly 3 GENERATED entries
    const generatedMatches = previewText.match(/X-LuachSync-ENTRY-TYPE:GENERATED/g);
    expect(generatedMatches).toHaveLength(3);

    // Should write the occurrences count to the ICS header
    expect(previewText).toContain('X-EXPORT-OCCURRENCES:3');
  });

  it('restores occurrences from X-EXPORT-OCCURRENCES header when importing an ICS file', async () => {
    const user = userEvent.setup();

    window.localStorage.setItem('luachsync.appState.v1', JSON.stringify({
      events: [],
      exportSettings: {
        selectedSchema: 'ics',
        reminderMode: 'none',
        selectedEventTypes: [],
        occurrences: 100,
      },
    }));

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'X-EXPORT-OCCURRENCES:7',
      'X-EXPORT-REMINDER-MODE:none',
      'X-EXPORT-EVENT-TYPES:birthday',
      'BEGIN:VEVENT',
      'UID:event-1@luachsync-source',
      'SUMMARY:Test Event',
      'CATEGORIES:birthday',
      'DTSTART;VALUE=DATE:20240101',
      'X-HEBREW-DATE:1 תשרי 5784',
      'X-AFTER-SUNSET:false',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const file = new File([icsContent], 'test.ics', { type: 'text/calendar' });

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByRole('heading', { name: 'ייצוא וייבוא נתוני לוח שנה' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    // occurrences-input should now reflect the imported value
    const occurrencesInput = await screen.findByTestId('occurrences-input') as HTMLInputElement;
    expect(occurrencesInput.value).toBe('7');
  });

  it('Adar II occurrences in non-leap years are not skipped but fall on Adar I', async () => {
    const user = userEvent.setup();

    // Hebrew year 5784 is a leap year (has Adar II).
    // 5785 is NOT a leap year → Adar II events should fall on Adar I instead of being skipped.
    // We request 2 occurrences so we get both: 5784 (Adar II) and 5785 (Adar I fallback).
    window.localStorage.setItem('luachsync.appState.v1', JSON.stringify({
      events: [
        {
          id: 'event-adar2',
          title: 'Adar Test',
          type: 'birthday',
          hebrewDate: {
            day: 15,
            month: 'אדר ב׳',
            year: 5784,
            afterSunset: false,
          },
        },
      ],
      exportSettings: {
        selectedSchema: 'ics',
        reminderMode: 'none',
        selectedEventTypes: ['birthday'],
        occurrences: 2,
      },
    }));

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'ייצוא וייבוא' }));
    await screen.findByRole('heading', { name: 'ייצוא וייבוא נתוני לוח שנה' });

    await user.click(screen.getByRole('button', { name: /תצוגה מקדימה של ICS/i }));

    const previewText = screen.getByText((content, element) => (
      element?.tagName.toLowerCase() === 'code' && content.includes('BEGIN:VCALENDAR')
    )).textContent || '';

    // 2 occurrences requested → 2 GENERATED entries (no skips)
    const generatedMatches = previewText.match(/X-LuachSync-ENTRY-TYPE:GENERATED/g);
    expect(generatedMatches).toHaveLength(2);
  });
});
