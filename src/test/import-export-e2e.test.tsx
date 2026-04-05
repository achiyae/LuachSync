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

    window.localStorage.setItem('hc4gc.appState.v1', JSON.stringify({
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

    const beforeSourceMatch = previewText.match(/UID:event-before@hc4gc-source[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);
    const afterSourceMatch = previewText.match(/UID:event-after@hc4gc-source[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);
    const beforeGeneratedMatch = previewText.match(/UID:event-before-0@hc4gc[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);
    const afterGeneratedMatch = previewText.match(/UID:event-after-0@hc4gc[\s\S]*?DTSTART;VALUE=DATE:(\d{8})/);

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

    window.localStorage.setItem('hc4gc.appState.v1', JSON.stringify({
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
});
